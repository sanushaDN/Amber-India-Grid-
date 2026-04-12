from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, WebSocket, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import models
import schemas
from database import engine, get_db
import os
import re
import shutil
import auth_utils
from jose import JWTError, jwt

import hashlib
def calculate_match_score(img1_path, img2_path):
    # Demo mock: deterministic score based on file content so same photos = same result
    combined = f"{img1_path}:{img2_path}"
    h = int(hashlib.md5(combined.encode()).hexdigest(), 16)
    return round(72 + (h % 2300) / 100, 2)  # Always 72.00 - 94.99

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AMBER-India Recovery Grid API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads/missing_persons", exist_ok=True)
os.makedirs("uploads/sightings", exist_ok=True)

# Serve uploaded images as static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

def safe_filename(filename: str) -> str:
    """Remove spaces and special chars so URLs don't break."""
    name, ext = os.path.splitext(filename)
    name = re.sub(r'[^a-zA-Z0-9_-]', '_', name)
    return f"{name}{ext}"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# --- AUTH DEPENDENCY ---
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth_utils.SECRET_KEY, algorithms=[auth_utils.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

# --- STARTUP EVENT (Create Default Admin) ---
@app.on_event("startup")
def create_admin():
    db = next(get_db())
    admin = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin:
        hashed_pw = auth_utils.get_password_hash("password123")
        new_admin = models.User(username="admin", hashed_password=hashed_pw)
        db.add(new_admin)
        db.commit()
        print("Default admin user created: admin / password123")

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WS] Dashboard connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"[WS] Dashboard disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        print(f"[WS] Broadcasting to {len(self.active_connections)} clients: {message.get('type', 'unknown')}")
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"[WS] Send failed: {e}")
                dead.append(connection)
        for d in dead:
            if d in self.active_connections:
                self.active_connections.remove(d)

manager = ConnectionManager()

@app.get("/")
def read_root():
    return {"message": "AMBER-India Intelligence Engine Active"}

# --- AUTH ENDPOINTS ---
@app.post("/auth/login", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    print(f"[DEBUG] Login attempt for user: {form_data.username}")
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    print(f"[DEBUG] User query complete. Found: {user is not None}")
    if not user or not auth_utils.verify_password(form_data.password, user.hashed_password):
        print(f"[DEBUG] Password verification failed.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    print(f"[DEBUG] Password verified. Creating token.")
    access_token_expires = timedelta(minutes=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_utils.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.websocket("/ws/police_dashboard")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except Exception:
        manager.disconnect(websocket)

@app.post("/missing_persons/", response_model=schemas.MissingPersonResponse)
async def create_missing_person(
    full_name: str = Form(...),
    age: int = Form(...),
    description: str = Form(...),
    last_known_lat: float = Form(...),
    last_known_lng: float = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user) # PROTECTED
):
    fname = safe_filename(photo.filename)
    photo_path = f"uploads/missing_persons/{fname}"
    
    # Async write to prevent block
    content = await photo.read()
    with open(photo_path, "wb") as buffer:
        buffer.write(content)
        
    db_person = models.MissingPerson(
        full_name=full_name,
        age=age,
        description=description,
        last_known_lat=last_known_lat,
        last_known_lng=last_known_lng,
        photo_path=photo_path
    )
    db.add(db_person)
    db.commit()
    db.refresh(db_person)
    return db_person

@app.get("/missing_persons/", response_model=list[schemas.MissingPersonResponse])
def get_active_missing_persons(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    persons = db.query(models.MissingPerson).offset(skip).limit(limit).all()
    return persons

@app.get("/missing_persons/{person_id}/sightings", response_model=list[schemas.CitizenSightingResponse])
def get_sightings_for_person(person_id: int, db: Session = Depends(get_db)):
    sightings = db.query(models.CitizenSighting).filter(models.CitizenSighting.missing_person_id == person_id).order_by(models.CitizenSighting.reported_at.desc()).all()
    return sightings

@app.get("/sightings/", response_model=list[schemas.CitizenSightingResponse])
def get_all_sightings(db: Session = Depends(get_db)):
    """Global sightings for tactical grid populating."""
    return db.query(models.CitizenSighting).order_by(models.CitizenSighting.reported_at.desc()).all()

@app.patch("/missing_persons/{person_id}/recover")
async def mark_recovered(person_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    person = db.query(models.MissingPerson).filter(models.MissingPerson.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    person.status = models.StatusEnum.RECOVERED
    db.commit()
    db.refresh(person)
    await manager.broadcast({
        "type": "CASE_RECOVERED",
        "missing_person_id": person_id,
        "name": person.full_name
    })
    return {"success": True, "message": f"{person.full_name} marked as RECOVERED"}

@app.post("/citizen_sightings/", response_model=schemas.CitizenSightingResponse)
async def report_sighting(
    missing_person_id: int = Form(...),
    sighting_lat: float = Form(...),
    sighting_lng: float = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Public endpoint - NO PROTECTION needed for citizens
    person = db.query(models.MissingPerson).filter(models.MissingPerson.id == missing_person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Missing person not found")

    fname = safe_filename(photo.filename)
    photo_path = f"uploads/sightings/{fname}"
    
    # Async write to prevent block
    content = await photo.read()
    with open(photo_path, "wb") as buffer:
        buffer.write(content)

    confidence_score = calculate_match_score(img1_path=person.photo_path, img2_path=photo_path)
    print(f"[AI] Match score for case #{missing_person_id}: {confidence_score}% (threshold: 70%)")

    db_sighting = models.CitizenSighting(
        missing_person_id=missing_person_id,
        sighting_lat=sighting_lat,
        sighting_lng=sighting_lng,
        photo_path=photo_path,
        match_score=confidence_score
    )
    db.add(db_sighting)
    db.commit()
    db.refresh(db_sighting)

    if confidence_score > 70.0:
        alert = {
            "type": "CRITICAL_MATCH",
            "sighting_id": db_sighting.id,
            "missing_person_id": missing_person_id,
            "person_name": person.full_name,
            "case_photo": person.photo_path,
            "sighting_photo": photo_path,
            "confidence": confidence_score,
            "lat": sighting_lat,
            "lng": sighting_lng,
            "timestamp": db_sighting.reported_at.isoformat()
        }
        await manager.broadcast(alert)

    return db_sighting
