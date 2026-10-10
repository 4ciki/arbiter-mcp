# Arbiter MCP — Monorepo Structure

This repository contains two independently deployable services:

| Service | Directory | Runtime | Description |
|---------|-----------|---------|-------------|
| **Backend** | `backend/` | Python / Docker | FastAPI + MCP server (API, webhooks, agent) |
| **Frontend** | `frontend/` | Node / Docker + nginx | React SPA (admin dashboard) |

---

## Architecture

```
                   ┌─────────────────────────────────────┐
  Browser  ──────▶ │  arbiter-frontend (nginx + React)   │
                   │  https://arbiter-frontend.onrender.com│
                   └──────────────┬──────────────────────┘
                                  │  HTTP fetch() to VITE_API_URL
                                  ▼
                   ┌─────────────────────────────────────┐
                   │  arbiter-backend (FastAPI + uvicorn) │
                   │  https://arbiter-backend.onrender.com│
                   │                                     │
                   │  /api/*          → REST endpoints   │
                   │  /webhooks/*     → Jira / Slack     │
                   │  /mcp            → MCP tools        │
                   │  /health         → health check     │
                   └─────────────────────────────────────┘
```

The backend is a **pure API service** — it serves no HTML or static files.  
The frontend is a **pure static SPA** — it communicates with the backend via HTTP only.

---

## Local Development

### Run the backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your credentials
uvicorn api.main:app --reload --port 8000
```

### Run the frontend
```bash
cd frontend
npm install
# No .env.local needed — vite.config.js proxies /api to localhost:8000 automatically
npm run dev
```

Open http://localhost:5173

---

## Deploying to Render

### Step 1 — Deploy the Backend first

1. Go to [Render Dashboard](https://dashboard.render.com/new/web-service)
2. Connect your GitHub repo (`4ciki/arbiter-mcp`)
3. Render auto-detects `render.yaml` and shows both services
4. Deploy **arbiter-backend** first
5. Copy its URL (e.g. `https://arbiter-backend.onrender.com`)

### Step 2 — Deploy the Frontend

1. In the Render dashboard, open **arbiter-frontend**
2. Set the environment variable:
   ```
   VITE_API_URL = https://arbiter-mcp-backend.onrender.com
   ```
3. Deploy — Render builds the Vite SPA with `VITE_API_URL` baked into the JS bundle

### Updating independently

| Change | Action |
|--------|--------|
| Backend only | Push changes to `backend/` → only `arbiter-backend` rebuilds |
| Frontend only | Push changes to `frontend/` → only `arbiter-frontend` rebuilds |
| Both | Both services rebuild in parallel |

> **Tip**: Configure [Render's auto-deploy filters](https://render.com/docs/monorepo-support)
> to only trigger a service rebuild when its directory changes.

---

## Environment Variables

### Backend (`backend/.env.example`)
| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Port to listen on (default: 8000) |
| `DATABASE_URL` | No | SQLite or Postgres URL |
| `JIRA_SITE_URL` | Optional | Your Atlassian Jira URL |
| `JIRA_EMAIL` | Optional | Jira account email |
| `JIRA_API_TOKEN` | Optional | Jira API token |
| `SLACK_BOT_TOKEN` | Optional | Slack bot OAuth token |
| `SLACK_SIGNING_SECRET` | Optional | Slack signing secret |
| `GROQ_API_KEY` | Optional | Groq LLM API key |
| `ANTHROPIC_API_KEY` | Optional | Anthropic Claude API key |
| `SUPABASE_URL` | Optional | Supabase project URL |
| `SUPABASE_KEY` | Optional | Supabase anon key |

### Frontend (`frontend/.env.example`)
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | **Yes** (production) | Backend URL (baked in at build time) |
| `VITE_FIREBASE_*` | Optional | Override Firebase project config |

---

## Docker

### Build & run backend locally
```bash
docker build -t arbiter-backend ./backend
docker run -p 8000:8000 --env-file backend/.env arbiter-backend
```

### Build & run frontend locally
```bash
docker build \
  --build-arg VITE_API_URL=http://localhost:8000 \
  -t arbiter-frontend ./frontend
docker run -p 80:80 arbiter-frontend
```
