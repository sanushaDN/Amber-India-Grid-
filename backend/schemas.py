from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from models import StatusEnum

class MissingPersonBase(BaseModel):
    full_name: str
    age: int
    description: str
    last_known_lat: float
    last_known_lng: float

class MissingPersonCreate(MissingPersonBase):
    pass

class MissingPersonResponse(MissingPersonBase):
    id: int
    photo_path: Optional[str] = None
    status: StatusEnum
    reported_at: datetime
    
    class Config:
        from_attributes = True

class CitizenSightingBase(BaseModel):
    missing_person_id: int
    sighting_lat: float
    sighting_lng: float

class CitizenSightingResponse(CitizenSightingBase):
    id: int
    photo_path: Optional[str] = None
    match_score: Optional[float] = None
    reported_at: datetime

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
