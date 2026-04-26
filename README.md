# AI Content Generator for Marketing Teams

A full-stack, trend-aware AI content generation platform built for marketing teams.
Generate blogs, ads, social captions, and emails — powered by OpenAI and real-time Google Trends data.

🔗 **Live Demo:** [your-app.vercel.app](https://your-app.vercel.app)
🔧 **Backend API:** [your-app.onrender.com/docs](https://your-app.onrender.com/docs)

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
| AI | OpenAI GPT-3.5-turbo |
| Trends | Pytrends (Google Trends) |
| Database | SQLite + SQLModel |
| Auth | JWT + bcrypt (python-jose, passlib) |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

---

## Project Structure
ai-content-generator/
├── backend/
│   ├── main.py              # FastAPI app — all routes
│   ├── auth.py              # JWT auth logic
│   ├── database.py          # SQLite models (User, Project)
│   ├── requirements.txt
│   ├── Procfile             # Render start command
│   ├── runtime.txt          # Python version for Render
│   └── .env                 # Local secrets (not committed)
├── frontend/
│   └── src/
│       └── App.jsx          # Full React app (auth + generator + dashboard)
├── .gitignore
└── README.md

---

## Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- An [OpenAI API key](https://platform.openai.com)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
OPENAI_API_KEY=sk-your-key-here
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=10080

Start the backend:
```bash
uvicorn main:app --reload --port 8000
```

API docs available at: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at: `http://localhost:5173`

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Health check |
| POST | `/signup` | No | Create account |
| POST | `/login` | No | Login + get token |
| GET | `/me` | Yes | Get current user |
| POST | `/generate` | Yes | Generate AI content |
| GET | `/trends/{industry}` | No | Get trending keywords |
| POST | `/content/action` | Yes | Rewrite / Expand / Shorten |
| POST | `/content/variations` | Yes | Generate 3 variations |
| POST | `/content/seo` | Yes | SEO analysis |
| GET | `/projects` | Yes | List saved projects |
| POST | `/projects` | Yes | Save a project |
| DELETE | `/projects/{id}` | Yes | Delete a project |
| GET | `/options` | No | Get dropdown options |

---

## Environment Variables

### Backend (Render)

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI secret key |
| `SECRET_KEY` | JWT signing secret (any long random string) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime (10080 = 7 days) |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend URLs |

### Frontend (Vercel)

| Variable | Description |
|---|---|
| `VITE_API_BASE` | Your Render backend URL |

---

## How It Works

1. User logs in → receives a JWT token
2. User fills the content form (type, prompt, tone, industry, keywords)
3. Backend fetches live Google Trends for the selected industry
4. Top trending keywords are injected into the OpenAI prompt
5. GPT-3.5-turbo generates trend-aware content
6. A trend score (0–100) is calculated based on keyword alignment
7. User can rewrite, expand, shorten, copy, or run SEO analysis
8. Content can be saved to a personal dashboard and reloaded anytime

---

## Known Limitations

- **Pytrends rate limiting** — Google occasionally rate-limits trend requests.
  If trends fail, content still generates without trend injection.
- **Render free tier sleep** — Backend sleeps after 15 minutes of inactivity.
  First request after sleep takes ~30 seconds.
- **SQLite on Render** — Free tier has ephemeral storage, so the database
  resets on redeploy. Upgrade to PostgreSQL for production persistence.

---

## Roadmap / Future Improvements

- [ ] PostgreSQL for persistent production database
- [ ] Bulk content generation
- [ ] Content scheduling and calendar view
- [ ] Export to PDF / Google Docs
- [ ] Team collaboration features
- [ ] Usage analytics dashboard
- [ ] Multi-model support (OpenAI, Claude, Gemini)

---

## Author

Built by Saurabh Singh Bhandari  
AI Engineer | Generative AI | LLM Applications