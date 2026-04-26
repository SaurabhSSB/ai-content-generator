from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv
from openai import OpenAI
from pytrends.request import TrendReq
from sqlmodel import Session, select
import os
import time
import json

from database import create_tables, get_session, Project
from auth import (
    UserCreate, UserLogin, UserOut, Token,
    register_user, login_user, get_current_user
)

load_dotenv()

app = FastAPI(title="AI Content Generator API", version="6.0.0")

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create DB tables on startup
@app.on_event("startup")
def on_startup():
    create_tables()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ─────────────────────────────────────────
# Models
# ─────────────────────────────────────────

class ContentRequest(BaseModel):
    content_type: str
    prompt: str
    tone: str
    industry: str
    keywords: Optional[str] = ""
    use_trends: Optional[bool] = True

class ContentResponse(BaseModel):
    content: str
    content_type: str
    tone: str
    keywords_used: list[str]
    trend_keywords_injected: list[str]
    generated_at: str
    word_count: int
    trend_score: Optional[int] = None

class SaveProjectRequest(BaseModel):
    title: str
    content_type: str
    tone: str
    industry: str
    prompt: str
    content: str
    keywords_used: list[str] = []
    trend_keywords: list[str] = []
    trend_score: Optional[int] = None
    word_count: int = 0

class ProjectOut(BaseModel):
    id: int
    title: str
    content_type: str
    tone: str
    industry: str
    prompt: str
    content: str
    keywords_used: list[str]
    trend_keywords: list[str]
    trend_score: Optional[int]
    word_count: int
    created_at: str

class TrendResult(BaseModel):
    keyword: str
    score: int

class TrendsResponse(BaseModel):
    industry: str
    trending: list[TrendResult]
    rising: list[str]
    fetched_at: str

# ─────────────────────────────────────────
# Industry Keywords
# ─────────────────────────────────────────

INDUSTRY_KEYWORDS = {
    "technology":      ["AI tools", "machine learning", "cloud computing", "cybersecurity", "software development"],
    "fashion":         ["fashion trends", "sustainable fashion", "streetwear", "luxury fashion", "outfit ideas"],
    "fitness":         ["workout routine", "weight loss", "home fitness", "nutrition tips", "muscle building"],
    "food & beverage": ["healthy recipes", "meal prep", "vegan food", "coffee trends", "restaurant marketing"],
    "finance":         ["personal finance", "investing tips", "crypto", "budgeting", "stock market"],
    "healthcare":      ["mental health", "wellness tips", "telemedicine", "nutrition", "preventive care"],
    "education":       ["online learning", "edtech", "study tips", "e-learning", "skill development"],
    "travel":          ["travel tips", "budget travel", "luxury travel", "travel destinations", "digital nomad"],
    "real estate":     ["real estate investing", "home buying tips", "property market", "rental income", "mortgage"],
    "e-commerce":      ["dropshipping", "ecommerce trends", "online shopping", "product marketing", "conversion rate"],
}

# ─────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────

def parse_keywords(keywords_str: str) -> list[str]:
    if not keywords_str:
        return []
    return [kw.strip() for kw in keywords_str.split(",") if kw.strip()]

def fetch_trends_data(industry: str) -> dict:
    keywords = INDUSTRY_KEYWORDS.get(industry, ["marketing", "content", "brand", "digital", "social media"])[:5]
    try:
        pytrends = TrendReq(hl="en-US", tz=360, timeout=(10, 25))
        pytrends.build_payload(keywords, timeframe="now 7-d", geo="")
        time.sleep(1)
        interest_df = pytrends.interest_over_time()
        trending = []
        if not interest_df.empty:
            for kw in keywords:
                if kw in interest_df.columns:
                    trending.append({"keyword": kw, "score": int(interest_df[kw].mean())})
            trending.sort(key=lambda x: x["score"], reverse=True)
        time.sleep(1)
        rising = []
        try:
            related = pytrends.related_queries()
            top_kw = keywords[0]
            if related.get(top_kw) and related[top_kw].get("rising") is not None:
                rising_df = related[top_kw]["rising"]
                if not rising_df.empty:
                    rising = rising_df["query"].head(5).tolist()
        except Exception:
            rising = []
        return {"trending": trending, "rising": rising}
    except Exception:
        return {"trending": [], "rising": []}

def get_top_trend_keywords(industry: str, limit: int = 3) -> list[str]:
    data = fetch_trends_data(industry)
    top = [item["keyword"] for item in data["trending"][:limit]]
    if data["rising"]:
        top.append(data["rising"][0])
    return top

def calculate_trend_score(user_keywords, trend_keywords, prompt) -> int:
    if not trend_keywords:
        return 0
    combined = (prompt + " " + " ".join(user_keywords)).lower()
    matches = sum(1 for kw in trend_keywords if kw.lower() in combined)
    return min(matches * 20 + 40, 100)

def build_trend_aware_prompt(request: ContentRequest, trend_keywords: list[str]) -> tuple:
    user_keywords = parse_keywords(request.keywords)
    all_keywords = list(dict.fromkeys(user_keywords + trend_keywords))
    kw_instruction = (
        f"Naturally incorporate these keywords: {', '.join(all_keywords)}."
        if all_keywords else ""
    )
    trend_instruction = (
        f"These topics are currently trending in {request.industry}: "
        f"{', '.join(trend_keywords)}. Reference them naturally."
        if trend_keywords else ""
    )
    type_instructions = {
        "blog":    "Write a complete blog post with headline, intro, 3-4 sections with subheadings, and conclusion. Aim for 350-500 words.",
        "ad":      "Write punchy ad copy with a strong headline, 2-3 benefit-driven lines, and a CTA. Under 100 words.",
        "caption": "Write an engaging social media caption with a hook, message, and 5-8 hashtags. Under 150 words.",
        "email":   "Write a marketing email with 'Subject:' line, greeting, body with value proposition, and CTA. Under 300 words.",
    }
    tone_descriptions = {
        "professional":  "authoritative, polished, and trustworthy",
        "casual":        "friendly, conversational, and approachable",
        "witty":         "clever, humorous, and entertaining",
        "inspirational": "motivating, uplifting, and emotionally resonant",
        "urgent":        "time-sensitive, action-driving, and compelling",
    }
    system_prompt = (
        f"You are an expert marketing copywriter for the {request.industry} industry. "
        f"Style: {tone_descriptions.get(request.tone, request.tone)}. "
        "Write trend-aware content. Output only the content — no explanations."
    )
    user_prompt = (
        f"Create a {request.content_type} about: {request.prompt}\n\n"
        f"{type_instructions.get(request.content_type, '')}\n\n"
        f"{trend_instruction}\n\n"
        f"{kw_instruction}\n\n"
        f"Industry: {request.industry} | Tone: {request.tone}"
    )
    return system_prompt, user_prompt

def call_openai(system_prompt: str, user_prompt: str) -> str:
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        temperature=0.8,
        max_tokens=800,
    )
    return response.choices[0].message.content.strip()

def project_to_out(p: Project) -> ProjectOut:
    return ProjectOut(
        id=p.id,
        title=p.title,
        content_type=p.content_type,
        tone=p.tone,
        industry=p.industry,
        prompt=p.prompt,
        content=p.content,
        keywords_used=json.loads(p.keywords_used),
        trend_keywords=json.loads(p.trend_keywords),
        trend_score=p.trend_score,
        word_count=p.word_count,
        created_at=p.created_at,
    )

# ─────────────────────────────────────────
# Auth Routes
# ─────────────────────────────────────────

@app.post("/signup", response_model=Token)
def signup(user_data: UserCreate, session: Session = Depends(get_session)):
    return register_user(user_data, session)

@app.post("/login", response_model=Token)
def login(credentials: UserLogin, session: Session = Depends(get_session)):
    return login_user(credentials, session)

@app.get("/me", response_model=UserOut)
def get_me(current_user: UserOut = Depends(get_current_user)):
    return current_user

# ─────────────────────────────────────────
# Project Routes
# ─────────────────────────────────────────

@app.post("/projects", response_model=ProjectOut)
def save_project(
    data: SaveProjectRequest,
    current_user: UserOut = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    project = Project(
        user_email=current_user.email,
        title=data.title,
        content_type=data.content_type,
        tone=data.tone,
        industry=data.industry,
        prompt=data.prompt,
        content=data.content,
        keywords_used=json.dumps(data.keywords_used),
        trend_keywords=json.dumps(data.trend_keywords),
        trend_score=data.trend_score,
        word_count=data.word_count,
    )
    session.add(project)
    session.commit()
    session.refresh(project)
    return project_to_out(project)

@app.get("/projects", response_model=list[ProjectOut])
def get_projects(
    current_user: UserOut = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    projects = session.exec(
        select(Project)
        .where(Project.user_email == current_user.email)
        .order_by(Project.id.desc())
    ).all()
    return [project_to_out(p) for p in projects]

@app.delete("/projects/{project_id}")
def delete_project(
    project_id: int,
    current_user: UserOut = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    if project.user_email != current_user.email:
        raise HTTPException(status_code=403, detail="Not your project.")
    session.delete(project)
    session.commit()
    return {"deleted": True}

# ─────────────────────────────────────────
# Core Routes
# ─────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "AI Content Generator API v6"}

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "openai_key_configured": bool(os.getenv("OPENAI_API_KEY")),
        "timestamp": datetime.utcnow().isoformat(),
    }

@app.get("/trends/{industry}", response_model=TrendsResponse)
def get_trends(industry: str):
    valid = list(INDUSTRY_KEYWORDS.keys())
    if industry not in valid:
        raise HTTPException(status_code=400, detail=f"Industry must be one of: {valid}")
    data = fetch_trends_data(industry)
    return TrendsResponse(
        industry=industry,
        trending=[TrendResult(**t) for t in data["trending"]],
        rising=data["rising"],
        fetched_at=datetime.utcnow().isoformat(),
    )

@app.post("/generate", response_model=ContentResponse)
def generate_content(
    request: ContentRequest,
    current_user: UserOut = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    valid_types = ["blog", "ad", "caption", "email"]
    if request.content_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"content_type must be one of {valid_types}")

    valid_tones = ["professional", "casual", "witty", "inspirational", "urgent"]
    if request.tone not in valid_tones:
        raise HTTPException(status_code=400, detail=f"tone must be one of {valid_tones}")

    if len(request.prompt.strip()) < 5:
        raise HTTPException(status_code=400, detail="Prompt must be at least 5 characters.")

    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")

    trend_keywords = get_top_trend_keywords(request.industry) if request.use_trends else []

    try:
        system_prompt, user_prompt = build_trend_aware_prompt(request, trend_keywords)
        generated = call_openai(system_prompt, user_prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    user_keywords = parse_keywords(request.keywords)

    return ContentResponse(
        content=generated,
        content_type=request.content_type,
        tone=request.tone,
        keywords_used=user_keywords,
        trend_keywords_injected=trend_keywords,
        generated_at=datetime.utcnow().isoformat(),
        word_count=len(generated.split()),
        trend_score=calculate_trend_score(user_keywords, trend_keywords, request.prompt),
    )

@app.get("/options")
def get_options():
    return {
        "content_types": ["blog", "ad", "caption", "email"],
        "tones": ["professional", "casual", "witty", "inspirational", "urgent"],
        "industries": list(INDUSTRY_KEYWORDS.keys()),
    }

# ─────────────────────────────────────────
# Content Action Routes (Rewrite/Expand/Shorten/Variations/SEO)
# ─────────────────────────────────────────

class ContentActionRequest(BaseModel):
    content: str
    action: str          # "rewrite" | "expand" | "shorten"
    tone: Optional[str] = "professional"

class VariationsRequest(BaseModel):
    content_type: str
    prompt: str
    tone: str
    industry: str
    keywords: Optional[str] = ""
    count: Optional[int] = 3   # number of variations

class SEORequest(BaseModel):
    content: str
    industry: str
    keywords: Optional[str] = ""

@app.post("/content/action")
def content_action(
    request: ContentActionRequest,
    current_user: UserOut = Depends(get_current_user),
):
    action_prompts = {
        "rewrite": (
            f"Rewrite the following content in a {request.tone} tone. "
            "Keep the same core message but use completely different wording and structure. "
            "Output only the rewritten content."
        ),
        "expand": (
            "Expand the following content by adding more detail, examples, and depth. "
            "Make it approximately 50% longer while keeping the same tone and style. "
            "Output only the expanded content."
        ),
        "shorten": (
            "Shorten the following content to about half its length. "
            "Keep only the most important points and maintain the same tone. "
            "Output only the shortened content."
        ),
    }

    if request.action not in action_prompts:
        raise HTTPException(status_code=400, detail="action must be rewrite, expand, or shorten")

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": action_prompts[request.action]},
                {"role": "user",   "content": request.content},
            ],
            temperature=0.7,
            max_tokens=1000,
        )
        result = response.choices[0].message.content.strip()
        return {
            "content": result,
            "action": request.action,
            "word_count": len(result.split()),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Action failed: {str(e)}")


@app.post("/content/variations")
def generate_variations(
    request: VariationsRequest,
    current_user: UserOut = Depends(get_current_user),
):
    count = min(request.count, 3)  # cap at 3 to control cost
    keywords = parse_keywords(request.keywords)
    kw_text = f"Keywords to include: {', '.join(keywords)}." if keywords else ""

    type_instructions = {
        "blog":    "Write a blog post headline and first paragraph only.",
        "ad":      "Write complete ad copy under 80 words.",
        "caption": "Write a social media caption with hashtags under 100 words.",
        "email":   "Write a subject line and email opening paragraph only.",
    }

    system_prompt = (
        f"You are an expert marketing copywriter for the {request.industry} industry. "
        f"Generate exactly {count} distinct variations. "
        "Number each variation clearly: 'Variation 1:', 'Variation 2:', etc. "
        "Each variation must have a noticeably different angle, hook, or approach. "
        "Output only the variations — no extra commentary."
    )

    user_prompt = (
        f"Create {count} variations of a {request.content_type} about: {request.prompt}\n\n"
        f"{type_instructions.get(request.content_type, '')}\n"
        f"Tone: {request.tone}\n"
        f"{kw_text}"
    )

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.9,
            max_tokens=1200,
        )
        raw = response.choices[0].message.content.strip()

        # Parse variations by splitting on "Variation N:"
        import re
        parts = re.split(r"Variation\s+\d+:", raw, flags=re.IGNORECASE)
        variations = [p.strip() for p in parts if p.strip()]

        # Fallback: if parsing fails, return as single item
        if not variations:
            variations = [raw]

        return {"variations": variations, "count": len(variations)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Variations failed: {str(e)}")


@app.post("/content/seo")
def seo_tips(
    request: SEORequest,
    current_user: UserOut = Depends(get_current_user),
):
    keywords = parse_keywords(request.keywords)
    kw_text = f"Target keywords: {', '.join(keywords)}." if keywords else ""

    system_prompt = (
        "You are an SEO expert. Analyze the provided content and return a JSON object with exactly these fields:\n"
        '{"score": <0-100 integer>, "title_suggestion": "<string>", "meta_description": "<string under 160 chars>", '
        '"tips": ["<tip1>", "<tip2>", "<tip3>"], "missing_keywords": ["<kw1>", "<kw2>"]}\n'
        "Return ONLY valid JSON. No explanation, no markdown."
    )

    user_prompt = (
        f"Analyze this content for SEO in the {request.industry} industry.\n"
        f"{kw_text}\n\n"
        f"Content:\n{request.content[:2000]}"
    )

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=400,
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown fences if present
        raw = raw.replace("```json", "").replace("```", "").strip()
        seo_data = json.loads(raw)
        return seo_data
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="SEO analysis returned invalid format. Try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SEO analysis failed: {str(e)}")