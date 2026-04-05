from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from database import get_db
from deps import get_supabase
from models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def signup(request: Request, payload: SignupRequest, db: Session = Depends(get_db)):
    sb = get_supabase()
    try:
        response = sb.auth.sign_up({"email": payload.email, "password": payload.password})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Signup failed")

    if not response.user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Signup failed")

    existing = db.query(User).filter(User.id == response.user.id).first()
    if not existing:
        user = User(
            id=response.user.id,
            email=payload.email,
            name=payload.name,
        )
        db.add(user)
        db.commit()

    session = response.session
    if not session:
        return AuthResponse(access_token="", user_id=str(response.user.id))

    return AuthResponse(access_token=session.access_token, user_id=str(response.user.id))


@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/minute")
def login(request: Request, payload: LoginRequest):
    sb = get_supabase()
    try:
        response = sb.auth.sign_in_with_password({"email": payload.email, "password": payload.password})
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not response.session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login failed")

    return AuthResponse(
        access_token=response.session.access_token,
        user_id=str(response.user.id),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout():
    try:
        get_supabase().auth.sign_out()
    except Exception:
        pass
