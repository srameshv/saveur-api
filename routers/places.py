from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from deps import get_current_user
from models.places_cache import PlacesCache
from models.user import User

router = APIRouter(prefix="/places", tags=["places"])
limiter = Limiter(key_func=get_remote_address)

CACHE_TTL_HOURS = 24
PLACES_API_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = ",".join([
    "places.displayName",
    "places.formattedAddress",
    "places.rating",
    "places.priceLevel",
    "places.primaryTypeDisplayName",
    "places.websiteUri",
    "places.googleMapsUri",
])
MIN_RATING = 4.3
MAX_RESULTS = 20

PRICE_MAP = {
    "PRICE_LEVEL_FREE": "$",
    "PRICE_LEVEL_INEXPENSIVE": "$",
    "PRICE_LEVEL_MODERATE": "$$",
    "PRICE_LEVEL_EXPENSIVE": "$$$",
    "PRICE_LEVEL_VERY_EXPENSIVE": "$$$$",
}


def _cache_key(location: str, cuisines: list[str], diets: list[str]) -> str:
    parts = [location.strip().lower()]
    if cuisines:
        parts.append(",".join(sorted(c.lower() for c in cuisines)))
    if diets:
        parts.append(",".join(sorted(d.lower() for d in diets)))
    return "|".join(parts)


def _build_query(location: str, cuisines: list[str], diets: list[str]) -> str:
    parts = []
    if diets:
        parts.append(" ".join(diets))
    if cuisines:
        parts.append(" or ".join(cuisines))
    parts.append(f"restaurants in {location}")
    return " ".join(parts)


def _geocode(location: str) -> tuple[float, float] | None:
    """Get lat/lng for a city using Nominatim (free, no key needed)."""
    try:
        resp = httpx.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": location, "format": "json", "limit": 1},
            headers={"User-Agent": "saveur-app/1.0"},
            timeout=5,
        )
        resp.raise_for_status()
        results = resp.json()
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception:
        pass
    return None


def _get_cached(key: str, db: Session) -> list | None:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=CACHE_TTL_HOURS)
    entry = (
        db.query(PlacesCache)
        .filter(PlacesCache.location_key == key, PlacesCache.created_at >= cutoff)
        .first()
    )
    return entry.results if entry else None


def _save_cache(key: str, results: list, db: Session) -> None:
    existing = db.query(PlacesCache).filter(PlacesCache.location_key == key).first()
    if existing:
        existing.results = results
        existing.created_at = datetime.now(timezone.utc)
    else:
        db.add(PlacesCache(location_key=key, results=results))
    db.commit()


@router.get("/search")
@limiter.limit("30/minute")
def search_restaurants(
    request: Request,
    location: str = Query(..., min_length=2),
    cuisines: Optional[str] = Query(None),   # comma-separated
    diets: Optional[str] = Query(None),       # comma-separated
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Parse preferences — use query params if provided, else fall back to user profile
    prefs = current_user.preferences
    cuisine_list = [c.strip()[:50] for c in cuisines.split(",")][:10] if cuisines else (prefs.cuisines if prefs else [])
    diet_list = [d.strip()[:50] for d in diets.split(",")][:10] if diets else (prefs.diets if prefs else [])

    key = _cache_key(location, cuisine_list, diet_list)
    cached = _get_cached(key, db)
    if cached is not None:
        return {"results": cached, "cached": True}

    text_query = _build_query(location, cuisine_list, diet_list)
    coords = _geocode(location)

    body: dict = {
        "textQuery": text_query,
        "includedType": "restaurant",
        "minRating": MIN_RATING,
        "pageSize": MAX_RESULTS,
        "languageCode": "en",
        "rankPreference": "DISTANCE",
    }

    if coords:
        lat, lng = coords
        body["locationBias"] = {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": 10000.0,  # 10km radius
            }
        }

    try:
        response = httpx.post(
            PLACES_API_URL,
            headers={
                "X-Goog-Api-Key": settings.google_places_api,
                "X-Goog-FieldMask": FIELD_MASK,
            },
            json=body,
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Restaurant search unavailable. Please try again later.",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Restaurant search unavailable. Please try again later.",
        )

    places = data.get("places", [])
    results = [
        {
            "name": p.get("displayName", {}).get("text", "Unknown"),
            "address": p.get("formattedAddress"),
            "rating": p.get("rating"),
            "price_range": PRICE_MAP.get(p.get("priceLevel", ""), None),
            "cuisine": p.get("primaryTypeDisplayName", {}).get("text"),
            "maps_url": p.get("googleMapsUri"),
            "website": p.get("websiteUri"),
        }
        for p in places
        if p.get("rating", 0) >= MIN_RATING
    ]

    _save_cache(key, results, db)
    return {"results": results, "cached": False}
