import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models.group import Group, GroupMember, RoleEnum
from models.user import User
from rate_limiter import MAX_GROUPS_PER_USER
from schemas.group import GroupCreate, GroupMemberOut, GroupOut, JoinGroupRequest

router = APIRouter(prefix="/groups", tags=["groups"])


def _generate_invite_code() -> str:
    return secrets.token_urlsafe(24)  # 18 bytes = 144 bits of entropy


def _assert_member(group_id: UUID, user_id: UUID, db: Session) -> GroupMember:
    membership = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this group")
    return membership


@router.post("", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
def create_group(
    payload: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_group_count = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.role == RoleEnum.admin,
    ).count()
    if user_group_count >= MAX_GROUPS_PER_USER:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail=f"Maximum group limit ({MAX_GROUPS_PER_USER}) reached.")

    invite_code = _generate_invite_code()
    while db.query(Group).filter(Group.invite_code == invite_code).first():
        invite_code = _generate_invite_code()

    group = Group(
        name=payload.name,
        description=payload.description,
        created_by=current_user.id,
        invite_code=invite_code,
    )
    db.add(group)
    db.flush()

    membership = GroupMember(group_id=group.id, user_id=current_user.id, role=RoleEnum.admin)
    db.add(membership)
    db.commit()
    db.refresh(group)
    return group


@router.get("", response_model=list[GroupOut])
def list_my_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    memberships = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()
    group_ids = [m.group_id for m in memberships]
    return db.query(Group).filter(Group.id.in_(group_ids)).all()


@router.get("/{group_id}", response_model=GroupOut)
def get_group(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_member(group_id, current_user.id, db)
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return group


@router.get("/{group_id}/members", response_model=list[GroupMemberOut])
def list_members(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_member(group_id, current_user.id, db)
    return db.query(GroupMember).filter(GroupMember.group_id == group_id).all()


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    if group.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the group creator can delete this group")
    db.delete(group)
    db.commit()


@router.post("/join", response_model=GroupMemberOut, status_code=status.HTTP_201_CREATED)
def join_group(
    payload: JoinGroupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.query(Group).filter(Group.invite_code == payload.invite_code).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invite code")

    existing = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group.id, GroupMember.user_id == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already a member")

    membership = GroupMember(group_id=group.id, user_id=current_user.id, role=RoleEnum.member)
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership
