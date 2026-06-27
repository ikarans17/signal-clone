from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models.user import User
from app.models.message import Conversation, ConversationMember, Message
from app.routes.auth import router as auth_router
from app.routes.messages import router as messages_router
from app.websocket.manager import manager

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(messages_router, prefix="/api", tags=["Messages"])

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)

@app.get("/")
def home():
    return {"message": "Signal Clone API Running"}

app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(messages_router, prefix="/api", tags=["Messages"])

@app.get("/")
def home():
    return {"message": "Signal Clone API Running"}