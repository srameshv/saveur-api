import json
from datetime import datetime, timedelta, timezone
from uuid import UUID

import anthropic
from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from deps import get_current_user
from models.group import GroupMember
from rate_limiter import AI_RECS_PER_DAY, user_limiter
from models.recommendation import AiRecommendation
from models.session import DinnerSession, SessionRestaurant
from models.user import User, UserPreferences
from schemas.recommendation import RecommendationOut, RecommendationRequest

router = APIRouter(prefix="/recommendations", tags=["recommendations"])
limiter = Limiter(key_func=get_remote_address)

CACHE_TTL_HOURS = 24


def _build_prompt(city: str, users: list[User]) -> str:
    profiles = []
    for user in users:
        prefs = user.preferences
        profile_parts = [f"- {user.name or 'Anonymous'}"]
        if user.budget:
            profile_parts.append(f"  Budget: {user.budget}")
        if prefs:
            if prefs.cuisines:
                profile_parts.append(f"  Preferred cuisines: {', '.join(prefs.cuisines)}")
            if prefs.diets:
                profile_parts.append(f"  Dietary restrictions: {', '.join(prefs.diets)}")
            if prefs.vibes:
                profile_parts.append(f"  Preferred vibes: {', '.join(prefs.vibes)}")
        profiles.append("\n".join(profile_parts))

    group_profile = "\n".join(profiles) if profiles else "No specific preferences provided."

    return f"""You are a restaurant recommendation assistant. Suggest 20 restaurants in {city} for a group dinner.

Group member profiles:
{group_profile}

Return a JSON object with this exact structure:
{{
  "recommendations": [
    {{
      "name": "Restaurant Name",
      "cuisine": "Cuisine type",
      "price_range": "$" | "$$" | "$$$" | "$$$$",
      "vibe": "Description of atmosphere",
      "why": "Why this suits the group",
      "address": "Address if known, otherwise omit"
    }}
  ],
  "summary": "Brief explanation of your selection strategy for this group"
}}

Return only valid JSON, no markdown fences."""


def _get_cached(session_id: UUID | None, city: str, db: Session) -> AiRecommendation | None:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=CACHE_TTL_HOURS)
    query = db.query(AiRecommendation).filter(
        AiRecommendation.city == city,
        AiRecommendation.created_at >= cutoff,
    )
    if session_id:
        query = query.filter(AiRecommendation.session_id == session_id)
    return query.order_by(AiRecommendation.created_at.desc()).first()


def _fetch_group_users(session_id: UUID, db: Session) -> list[User]:
    session = db.query(DinnerSession).filter(DinnerSession.id == session_id).first()
    if not session:
        return []
    memberships = db.query(GroupMember).filter(GroupMember.group_id == session.group_id).all()
    user_ids = [m.user_id for m in memberships]
    return db.query(User).filter(User.id.in_(user_ids)).all()


@router.post("", response_model=RecommendationOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def get_recommendation(
    request: Request,
    payload: RecommendationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not user_limiter.is_allowed(f"recs:{current_user.id}", AI_RECS_PER_DAY, 86400):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail=f"Daily AI recommendation limit ({AI_RECS_PER_DAY}) reached. Try again tomorrow.")

    cached = _get_cached(payload.session_id, payload.city, db)
    if cached:
        return cached

    if payload.session_id:
        session = db.query(DinnerSession).filter(DinnerSession.id == payload.session_id).first()
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        membership = (
            db.query(GroupMember)
            .filter(GroupMember.group_id == session.group_id, GroupMember.user_id == current_user.id)
            .first()
        )
        if not membership:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this group")
        users = _fetch_group_users(payload.session_id, db)
    else:
        users = [current_user]

    prompt = _build_prompt(payload.city, users)

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text
        result = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Claude returned invalid JSON: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Claude API error: {str(e)}",
        )

    recommendation = AiRecommendation(
        user_id=current_user.id,
        session_id=payload.session_id,
        city=payload.city,
        result=result,
    )
    db.add(recommendation)
    db.commit()
    db.refresh(recommendation)

    # Auto-populate session_restaurants from AI recommendations
    if payload.session_id:
        existing_names = {
            r.name.lower()
            for r in db.query(SessionRestaurant)
            .filter(SessionRestaurant.session_id == payload.session_id)
            .all()
        }
        for rec in result.get("recommendations", []):
            if rec.get("name", "").lower() not in existing_names:
                db.add(SessionRestaurant(
                    session_id=payload.session_id,
                    name=rec.get("name"),
                    cuisine=rec.get("cuisine"),
                    price_range=rec.get("price_range"),
                    address=rec.get("address"),
                    vibe=rec.get("vibe"),
                    source="ai",
                    added_by=current_user.id,
                ))
        db.commit()

    return recommendation


@router.get("/{recommendation_id}", response_model=RecommendationOut)
def get_recommendation_by_id(
    recommendation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rec = db.query(AiRecommendation).filter(AiRecommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")
    if rec.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return rec
