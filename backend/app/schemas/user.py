from pydantic import BaseModel
from typing import Optional

class UserRegister(BaseModel):
    username: str
    display_name: str
    phone_number: str
    password: str
    avatar: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    display_name: str
    phone_number: str
    avatar: Optional[str] = None
    is_online: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut