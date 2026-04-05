from functools import lru_cache

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from supabase import Client, create_client

from config import settings
from database import get_db
from models.user import User

security = HTTPBearer()


@lru_cache(maxsize=1)
def _supabase_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_key)


# Convenience alias used by routers that import supabase directly
def get_supabase() -> Client:
    return _supabase_client()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        response = _supabase_client().auth.get_user(token)
        supabase_user = response.user
        if not supabase_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == supabase_user.id).first()
    if not user:
        # Auto-provision users who signed up via OAuth (e.g. Google)
        email = supabase_user.email or ""
        name = (supabase_user.user_metadata or {}).get("full_name") or (supabase_user.user_metadata or {}).get("name")
        try:
            user = User(id=supabase_user.id, email=email, name=name)
            db.add(user)
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()
            user = db.query(User).filter(User.id == supabase_user.id).first()
    return user
