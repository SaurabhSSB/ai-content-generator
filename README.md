# AI Content Generator for Marketing Teams

> 🚀 Production-ready MVP demonstrating full-stack AI engineering with LLM integration, real-time trend analysis, and scalable API design.

A full-stack, trend-aware AI content generation platform built for marketing teams.
Generate blogs, ads, social captions, and emails — powered by OpenAI and real-time Google Trends data.

🔗 **Live Demo:** [ai-content-generator](https://ai-content-generator-eight-alpha.vercel.app/)  
🔧 **Backend API:** [ai-content-generator.onrender.com/docs](https://ai-content-generator-7efa.onrender.com/docs)

---

## Features

- **4 Content Types** — Blog posts, Ad copy, Social captions, Marketing emails
- **5 Tone Modes** — Professional, Casual, Witty, Inspirational, Urgent
- **10 Industries** — Technology, Fashion, Fitness, Finance, Healthcare, and more
- **Live Google Trends** — Real-time trending keywords injected into every generation
- **Trend Score** — 0–100 relevance score based on how trend-aligned your content is
- **Rewrite / Expand / Shorten** — One-click content transformations
- **3 Variations** — Generate multiple angles on the same prompt
- **SEO Analysis** — AI-powered score, title suggestion, meta description, and tips
- **Copy to Clipboard** — One click to copy generated content
- **Save Projects** — Persistent dashboard to store and reload your work
- **User Authentication** — Secure signup/login with JWT tokens and bcrypt passwords

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | FastAPI (Python) |
| AI | OpenAI (LLM API) |
| Trends | Pytrends (Google Trends) |
| Database | SQLite + SQLModel |
| Auth | JWT + bcrypt (python-jose, passlib) |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

---

## Project Structure

## Project Structure

```text
ai-content-generator/
├── backend/
│   ├── main.py
│   ├── auth/
│   ├── content_generator/
│   ├── requirements.txt
│   ├── Procfile
│   ├── runtime.txt
│   └── .env
├── frontend/
│   └── src/
│       └── App.jsx
├── .gitignore
└── README.md

---

## Deployment

- Frontend deployed on Vercel
- Backend deployed on Render
- Environment variables configured for secure API access and CORS handling

---

## Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- OpenAI API key

### Backend

cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

Create backend/.env:

OPENAI_API_KEY=your_key_here  
SECRET_KEY=your_secret_here  
ACCESS_TOKEN_EXPIRE_MINUTES=10080  

Run backend:

uvicorn main:app --reload --port 8000

---

### Frontend

cd frontend  
npm install  
npm run dev  

---

## How It Works

1. User logs in → receives a JWT token
2. User fills the content form
3. Backend fetches Google Trends data
4. Trends are injected into prompt
5. OpenAI LLM generates content
6. Trend score is calculated
7. User can edit, optimize, or save content

---

## Known Limitations

- Pytrends rate limiting
- Render free tier sleep delay
- SQLite resets on redeploy

---

## Roadmap / Future Improvements

- PostgreSQL integration
- Bulk content generation
- Content scheduling
- Export features
- Team collaboration
- Analytics dashboard
- Multi-model support (OpenAI, Claude, Gemini)

---

## Author

Built by Saurabh Singh Bhandari  
AI Engineer | Generative AI | LLM Applications  
Focused on building scalable AI-powered products and real-world systems
