from sqlalchemy import Column, Integer, String, Boolean
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    display_name = Column(String)
    phone_number = Column(String, unique=True)
    avatar = Column(String, nullable=True)
    is_online = Column(Boolean, default=False)
    hashed_password = Column(String)