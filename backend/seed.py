from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.message import Conversation, ConversationMember, Message
from passlib.context import CryptContext
from datetime import datetime

Base.metadata.create_all(bind=engine)
db = SessionLocal()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

def hash_pw(p): return pwd_context.hash(p[:72])

# Users
users = [
    User(username="karan", display_name="Karan Singh", phone_number="+911234567890", hashed_password=hash_pw("password123"), avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=karan", is_online=True),
    User(username="alice", display_name="Alice Johnson", phone_number="+911234567891", hashed_password=hash_pw("password123"), avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=alice", is_online=True),
    User(username="bob", display_name="Bob Smith", phone_number="+911234567892", hashed_password=hash_pw("password123"), avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=bob", is_online=False),
    User(username="sara", display_name="Sara Khan", phone_number="+911234567893", hashed_password=hash_pw("password123"), avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=sara", is_online=True),
    User(username="raj", display_name="Raj Patel", phone_number="+911234567894", hashed_password=hash_pw("password123"), avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=raj", is_online=False),
]
for u in users:
    db.add(u)
db.commit()
for u in users:
    db.refresh(u)

# DM: karan <-> alice
conv1 = Conversation(is_group=False)
db.add(conv1)
db.commit()
db.refresh(conv1)
db.add(ConversationMember(conversation_id=conv1.id, user_id=users[0].id))
db.add(ConversationMember(conversation_id=conv1.id, user_id=users[1].id))
db.commit()

msgs1 = [
    Message(conversation_id=conv1.id, sender_id=users[1].id, content="Hey Karan! How are you?", status="read", created_at=datetime(2026,6,28,9,0)),
    Message(conversation_id=conv1.id, sender_id=users[0].id, content="I'm good Alice! Working on a project 🚀", status="read", created_at=datetime(2026,6,28,9,1)),
    Message(conversation_id=conv1.id, sender_id=users[1].id, content="That sounds exciting! What kind of project?", status="read", created_at=datetime(2026,6,28,9,2)),
    Message(conversation_id=conv1.id, sender_id=users[0].id, content="A Signal clone! Full stack with FastAPI and Next.js", status="delivered", created_at=datetime(2026,6,28,9,3)),
]
for m in msgs1: db.add(m)

# DM: karan <-> bob
conv2 = Conversation(is_group=False)
db.add(conv2)
db.commit()
db.refresh(conv2)
db.add(ConversationMember(conversation_id=conv2.id, user_id=users[0].id))
db.add(ConversationMember(conversation_id=conv2.id, user_id=users[2].id))
db.commit()

msgs2 = [
    Message(conversation_id=conv2.id, sender_id=users[0].id, content="Bob, are you free this weekend?", status="read", created_at=datetime(2026,6,28,10,0)),
    Message(conversation_id=conv2.id, sender_id=users[2].id, content="Yeah sure! What's up?", status="read", created_at=datetime(2026,6,28,10,1)),
    Message(conversation_id=conv2.id, sender_id=users[0].id, content="Let's catch up over coffee ☕", status="sent", created_at=datetime(2026,6,28,10,2)),
]
for m in msgs2: db.add(m)

# Group chat
conv3 = Conversation(is_group=True, group_name="Dev Squad 🔥", group_avatar="https://api.dicebear.com/7.x/identicon/svg?seed=devsquad")
db.add(conv3)
db.commit()
db.refresh(conv3)
for i, u in enumerate(users):
    db.add(ConversationMember(conversation_id=conv3.id, user_id=u.id, is_admin=(i==0)))
db.commit()

msgs3 = [
    Message(conversation_id=conv3.id, sender_id=users[0].id, content="Welcome to Dev Squad everyone! 👋", status="read", created_at=datetime(2026,6,28,8,0)),
    Message(conversation_id=conv3.id, sender_id=users[1].id, content="Hey team! Excited to be here 🎉", status="read", created_at=datetime(2026,6,28,8,5)),
    Message(conversation_id=conv3.id, sender_id=users[2].id, content="Let's build something awesome!", status="read", created_at=datetime(2026,6,28,8,10)),
    Message(conversation_id=conv3.id, sender_id=users[3].id, content="Count me in! 💪", status="delivered", created_at=datetime(2026,6,28,8,15)),
    Message(conversation_id=conv3.id, sender_id=users[4].id, content="Same here! When do we start?", status="sent", created_at=datetime(2026,6,28,8,20)),
]
for m in msgs3: db.add(m)

db.commit()
db.close()
print("✅ Seed data added successfully!")