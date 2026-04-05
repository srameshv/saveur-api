from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from deps import get_current_user
from models.feedback import Feedback
from models.user import User
from rate_limiter import FEEDBACK_PER_DAY, user_limiter
from schemas.feedback import FeedbackCreate, FeedbackOut

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not user_limiter.is_allowed(f"feedback:{current_user.id}", FEEDBACK_PER_DAY, 86400):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Feedback limit reached for today.")

    feedback = Feedback(
        user_id=current_user.id,
        type=payload.type,
        message=payload.message,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


@router.get("", response_model=list[FeedbackOut])
def list_feedback(
    token: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not settings.admin_token or token != settings.admin_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return db.query(Feedback).order_by(Feedback.created_at.desc()).all()
