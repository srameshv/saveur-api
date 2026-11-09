# Saveur

Group dinner planning with AI-powered restaurant recommendations. A group picks a city, Claude suggests restaurants tailored to everyone's tastes, and members vote on where to go.

This repo holds the **FastAPI backend** (root) and the **Next.js frontend** (`saveur-app/`).

## How it works

1. Users sign up, set preferences (budget, cuisines, dietary restrictions, vibes) and join a **group**.
2. A group starts a **dinner session** for a city.
3. `POST /recommendations` builds one prompt from every group member's preferences and asks Claude for 20 restaurants as structured JSON, each with a "why this suits the group" line. Results are written back into the session's restaurant list.
4. `GET /places/search` adds real venues from the Google Places API (filtered to a 4.3+ rating).
5. Members vote (`/sessions/{id}/votes`) and `/sessions/{id}/results` returns the outcome.

## Design notes

- **Group-aware prompting.** The prompt is assembled from all members' profiles, so the model has to reconcile conflicting constraints (for example a vegetarian and a steakhouse fan), not just rank by popularity.
- **Cost control.** AI recommendations are cached for 24 hours per session and city, and each user has a daily cap (20 AI recs, 50 place searches). Google Places results are cached the same way.
- **Failure handling.** Invalid JSON or API errors from the model return a 502 with the reason instead of failing silently.
- **Auth and hardening.** Supabase auth with bearer tokens, per-route rate limits (slowapi), CORS restricted to the configured frontend, and security headers on every response.
- **Known limit.** The per-user daily limiter is in-memory, so it assumes a single instance. A shared store such as Redis would be the next step for horizontal scaling.

## Stack

FastAPI, SQLAlchemy and Alembic on PostgreSQL (Supabase), the Anthropic API, Google Places API, and a Next.js frontend.

## Run locally

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in your own keys
alembic upgrade head
uvicorn main:app --reload
```

Frontend:

```bash
cd saveur-app && npm install && npm run dev
```

Required environment variables are listed in `.env.example`.
