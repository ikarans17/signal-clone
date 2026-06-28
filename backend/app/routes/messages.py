from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.message import Conversation, ConversationMember, Message
from app.models.user import User
from typing import List
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ConversationCreate(BaseModel):
    member_ids: List[int]
    is_group: bool = False
    group_name: str = None

class MessageCreate(BaseModel):
    conversation_id: int
    sender_id: int
    content: str

class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

@router.post("/conversations")
def create_conversation(data: ConversationCreate, db: Session = Depends(get_db)):
    conv = Conversation(is_group=data.is_group, group_name=data.group_name)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    for uid in data.member_ids:
        member = ConversationMember(conversation_id=conv.id, user_id=uid)
        db.add(member)
    db.commit()
    return {"id": conv.id, "is_group": conv.is_group, "group_name": conv.group_name}

@router.get("/conversations/{user_id}")
def get_conversations(user_id: int, db: Session = Depends(get_db)):
    memberships = db.query(ConversationMember).filter(
        ConversationMember.user_id == user_id
    ).all()
    result = []
    for m in memberships:
        conv = m.conversation
        last_msg = db.query(Message).filter(
            Message.conversation_id == conv.id
        ).order_by(Message.created_at.desc()).first()
        members = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conv.id
        ).all()
        member_users = [db.query(User).filter(User.id == mem.user_id).first() for mem in members]
        result.append({
            "id": conv.id,
            "is_group": conv.is_group,
            "group_name": conv.group_name,
            "members": [{"id": u.id, "display_name": u.display_name, "avatar": u.avatar, "is_online": u.is_online} for u in member_users if u],
            "last_message": {"content": last_msg.content, "created_at": str(last_msg.created_at)} if last_msg else None
        })
    return result

@router.delete("/conversations/{conv_id}")
def delete_conversation(conv_id: int, db: Session = Depends(get_db)):
    db.query(Message).filter(Message.conversation_id == conv_id).delete()
    db.query(ConversationMember).filter(ConversationMember.conversation_id == conv_id).delete()
    db.query(Conversation).filter(Conversation.id == conv_id).delete()
    db.commit()
    return {"message": "Conversation deleted"}

@router.post("/messages", response_model=MessageOut)
def send_message(data: MessageCreate, db: Session = Depends(get_db)):
    msg = Message(
        conversation_id=data.conversation_id,
        sender_id=data.sender_id,
        content=data.content
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg

@router.get("/messages/{conversation_id}", response_model=List[MessageOut])
def get_messages(conversation_id: int, db: Session = Depends(get_db)):
    return db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at.asc()).all()

@router.get("/users")
def get_all_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.post("/conversations/{conv_id}/members/{user_id}")
def add_member(conv_id: int, user_id: int, db: Session = Depends(get_db)):
    existing = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conv_id,
        ConversationMember.user_id == user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already a member")
    member = ConversationMember(conversation_id=conv_id, user_id=user_id)
    db.add(member)
    db.commit()
    return {"message": "Member added"}

@router.delete("/conversations/{conv_id}/members/{user_id}")
def remove_member(conv_id: int, user_id: int, db: Session = Depends(get_db)):
    member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conv_id,
        ConversationMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return {"message": "Member removed"}