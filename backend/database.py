from sqlmodel import SQLModel, Field, create_engine, Session
from typing import Optional
from datetime import datetime
import json

# ─────────────────────────────────────────
# Database setup
# ─────────────────────────────────────────

DATABASE_URL = "sqlite:///./content_generator.db"
engine = create_engine(DATABASE_URL, echo=False)

def get_session():
    """FastAPI dependency — provides a DB session per request."""
    with Session(engine) as session:
        yield session

def create_tables():
    """Call once on startup to create all tables."""
    SQLModel.metadata.create_all(engine)

# ─────────────────────────────────────────
# User Table
# ─────────────────────────────────────────

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(unique=True, index=True)
    hashed_password: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# ─────────────────────────────────────────
# Project Table
# ─────────────────────────────────────────

class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_email: str = Field(index=True)
    title: str
    content_type: str
    tone: str
    industry: str
    prompt: str
    content: str
    keywords_used: str = Field(default="[]")       # stored as JSON string
    trend_keywords: str = Field(default="[]")       # stored as JSON string
    trend_score: Optional[int] = None
    word_count: int = Field(default=0)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    def keywords_list(self) -> list:
        return json.loads(self.keywords_used)

    def trend_keywords_list(self) -> list:
        return json.loads(self.trend_keywords)