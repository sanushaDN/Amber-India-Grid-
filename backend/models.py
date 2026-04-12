from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Enum
from database import Base
import datetime
import enum

class StatusEnum(enum.Enum):
    ACTIVE = "ACTIVE"
    RECOVERED = "RECOVERED"

class MissingPerson(Base):
    __tablename__ = "missing_persons"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), index=True)
    age = Column(Integer)
    description = Column(Text)
    last_known_lat = Column(Float)
    last_known_lng = Column(Float)
    photo_path = Column(String(255))
    status = Column(Enum(StatusEnum), default=StatusEnum.ACTIVE)
    reported_at = Column(DateTime, default=datetime.datetime.utcnow)

class CitizenSighting(Base):
    __tablename__ = "citizen_sightings"

    id = Column(Integer, primary_key=True, index=True)
    missing_person_id = Column(Integer)
    sighting_lat = Column(Float)
    sighting_lng = Column(Float)
    photo_path = Column(String(255))
    match_score = Column(Float) # From DeepFace
    reported_at = Column(DateTime, default=datetime.datetime.utcnow)

class RegisteredVolunteer(Base):
    __tablename__ = "registered_volunteers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(100), unique=True, index=True)
    home_lat = Column(Float)
    home_lng = Column(Float)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(255))
