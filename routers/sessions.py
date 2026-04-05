from collections import defaultdict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models.group import GroupMember
from models.session import DinnerSession, SessionRestaurant, SessionVote
from models.user import User
from rate_limiter import MAX_RESTAURANTS_PER_SESSION
from schemas.session import (
    AddRestaurantRequest,
    RestaurantResult,
    SessionCreate,
    SessionOut,
    SessionRestaurantOut,
    SessionResults,
    VoteCreate,
    VoteOut,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _assert_group_member(group_id: UUID, user_id: UUID, db: Session) -> GroupMember:
    membership = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this group")
    return membership


@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_group_member(payload.group_id, current_user.id, db)
    session = DinnerSession(
        group_id=payload.group_id,
        title=payload.title,
        city=payload.city,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/group/{group_id}", response_model=list[SessionOut])
def list_group_sessions(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_group_member(group_id, current_user.id, db)
    return db.query(DinnerSession).filter(DinnerSession.group_id == group_id).all()


@router.get("/{session_id}", response_model=SessionOut)
def get_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(DinnerSession).filter(DinnerSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    _assert_group_member(session.group_id, current_user.id, db)
    return session


@router.post("/{session_id}/votes", response_model=VoteOut, status_code=status.HTTP_201_CREATED)
def submit_vote(
    session_id: UUID,
    payload: VoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(DinnerSession).filter(DinnerSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.status != "open":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is not open for voting")

    _assert_group_member(session.group_id, current_user.id, db)

    existing = (
        db.query(SessionVote)
        .filter(
            SessionVote.session_id == session_id,
            SessionVote.user_id == current_user.id,
            SessionVote.restaurant_name == payload.restaurant_name,
        )
        .first()
    )
    if existing:
        existing.score = payload.score
        db.commit()
        db.refresh(existing)
        return existing

    vote = SessionVote(
        session_id=session_id,
        user_id=current_user.id,
        restaurant_name=payload.restaurant_name,
        score=payload.score,
    )
    db.add(vote)
    db.commit()
    db.refresh(vote)
    return vote


@router.get("/{session_id}/votes", response_model=list[VoteOut])
def list_votes(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(DinnerSession).filter(DinnerSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    _assert_group_member(session.group_id, current_user.id, db)
    return db.query(SessionVote).filter(SessionVote.session_id == session_id).all()


@router.get("/{session_id}/results", response_model=SessionResults)
def get_results(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(DinnerSession).filter(DinnerSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    _assert_group_member(session.group_id, current_user.id, db)

    votes = db.query(SessionVote).filter(SessionVote.session_id == session_id).all()

    totals: dict[str, list[int]] = defaultdict(list)
    for v in votes:
        totals[v.restaurant_name].append(v.score)

    results = [
        RestaurantResult(
            restaurant_name=name,
            average_score=round(sum(scores) / len(scores), 2),
            vote_count=len(scores),
        )
        for name, scores in totals.items()
    ]
    results.sort(key=lambda r: r.average_score, reverse=True)

    return SessionResults(session_id=session_id, results=results)


@router.get("/{session_id}/restaurants", response_model=list[SessionRestaurantOut])
def list_restaurants(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(DinnerSession).filter(DinnerSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    _assert_group_member(session.group_id, current_user.id, db)
    return (
        db.query(SessionRestaurant)
        .filter(SessionRestaurant.session_id == session_id)
        .order_by(SessionRestaurant.created_at)
        .all()
    )


@router.post("/{session_id}/restaurants", response_model=SessionRestaurantOut, status_code=status.HTTP_201_CREATED)
def add_restaurant(
    session_id: UUID,
    payload: AddRestaurantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(DinnerSession).filter(DinnerSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    _assert_group_member(session.group_id, current_user.id, db)

    restaurant_count = db.query(SessionRestaurant).filter(
        SessionRestaurant.session_id == session_id
    ).count()
    if restaurant_count >= MAX_RESTAURANTS_PER_SESSION:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail=f"Session restaurant limit ({MAX_RESTAURANTS_PER_SESSION}) reached.")

    duplicate = (
        db.query(SessionRestaurant)
        .filter(
            SessionRestaurant.session_id == session_id,
            SessionRestaurant.name.ilike(payload.name),
        )
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Restaurant already in this session")

    restaurant = SessionRestaurant(
        session_id=session_id,
        name=payload.name,
        cuisine=payload.cuisine,
        price_range=payload.price_range,
        address=payload.address,
        vibe=payload.vibe,
        source="manual",
        added_by=current_user.id,
    )
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)
    return restaurant
