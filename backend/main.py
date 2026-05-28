from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, WebSocket, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime, timedelta
import models
import schemas
from database import engine, get_db, SessionLocal
import os
import re
import shutil
import auth_utils
from jose import JWTError, jwt
import base64
import hashlib
import random
import urllib.parse
import json

CONFIG_FILE = "telegram_config.json"

def load_telegram_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                cfg = json.load(f)
                # Allow environment variable to override stored token
                env_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
                if env_token:
                    cfg["token"] = env_token
                return cfg
        except Exception as e:
            print(f"Error loading Telegram config: {e}")
    # Read token from environment variable only - never hardcode
    return {
        "token": os.getenv("TELEGRAM_BOT_TOKEN", ""),
        "chat_id": os.getenv("TELEGRAM_CHAT_ID", ""),
        "chat_name": ""
    }

def save_telegram_config(config):
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        print(f"Error saving Telegram config: {e}")


def calculate_match_score(img1_path, img2_path):
    # Demo mock: deterministic score based on file content so same photos = same result
    combined = f"{img1_path}:{img2_path}"
    h = int(hashlib.md5(combined.encode()).hexdigest(), 16)
    return round(72 + (h % 2300) / 100, 2)  # Always 72.00 - 94.99

def to_base64_url(content: bytes, filename: str) -> str:
    """Convert image bytes to a base64 data URL stored permanently in PostgreSQL."""
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'jpg'
    mime = 'image/png' if ext == 'png' else 'image/gif' if ext == 'gif' else 'image/jpeg'
    encoded = base64.b64encode(content).decode('utf-8')
    return f"data:{mime};base64,{encoded}"

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AMBER-India Recovery Grid API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
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

# --- STARTUP EVENT (Create Default Admin & DB Migrations) ---
@app.on_event("startup")
def create_admin():
    db = SessionLocal()
    try:
        # Auto-migrate string length for base64 images
        try:
            db.execute(text("ALTER TABLE missing_persons ALTER COLUMN photo_path TYPE TEXT;"))
            db.execute(text("ALTER TABLE citizen_sightings ALTER COLUMN photo_path TYPE TEXT;"))
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Migration skipped/failed: {e}")
            pass

        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            hashed_pw = auth_utils.get_password_hash("password123")
            new_admin = models.User(username="admin", hashed_password=hashed_pw)
            db.add(new_admin)
            db.commit()
            print("Default admin user created: admin / password123")
    finally:
        db.close()

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
            # Relay messages (like LIVE_COORDINATE_UPDATE) to all connected clients
            data = await websocket.receive_json()
            if data.get("type") == "LIVE_COORDINATE_UPDATE":
                await manager.broadcast(data)
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
    # Store image as base64 in PostgreSQL (persistent, no external service needed)
    content = await photo.read()
    photo_url = to_base64_url(content, photo.filename)
        
    db_person = models.MissingPerson(
        full_name=full_name,
        age=age,
        description=description,
        last_known_lat=last_known_lat,
        last_known_lng=last_known_lng,
        photo_path=photo_url  # store the permanent Cloudinary URL
    )
    db.add(db_person)
    db.commit()
    db.refresh(db_person)

    # Broadcast to WebSocket network
    try:
        await manager.broadcast({
            "type": "NEW_CASE",
            "id": db_person.id,
            "full_name": db_person.full_name,
            "age": db_person.age,
            "description": db_person.description,
            "photo_path": db_person.photo_path
        })
    except Exception as e:
        print(f"WS Broadcast error: {e}")

    # Simulate Mass Public Broadcast Alert to random nearby cellular devices
    recipients = [
        f"+91 {random.randint(6,9)}{''.join([str(random.randint(0,9)) for _ in range(9)])}"
        for _ in range(random.randint(8, 15))  # Simulate 8 to 15 random public devices
    ]
    sms_message = (
        f"🚨 AMBER ALERT 🚨\n"
        f"Missing: {db_person.full_name} ({db_person.age}y)\n"
        f"Last seen: {db_person.last_known_lat:.4f}, {db_person.last_known_lng:.4f}\n"
        f"If spotted, report instantly: https://amber-india-frontend.onrender.com/report?personId={db_person.id}"
    )

    for phone in recipients:
        alert_log = models.SmsAlert(
            phone_number=phone,
            message=sms_message,
            status="SENT",
            provider="MOCK_TWILIO_GATEWAY"
        )
        db.add(alert_log)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Failed to commit SMS alerts: {e}")

    # --- TELEGRAM NEW CASE REAL NOTIFICATION ---
    tg_config = load_telegram_config()
    tg_token = tg_config.get("token")
    tg_chat = tg_config.get("chat_id")
    if tg_token and tg_chat:
        try:
            import urllib.request
            tg_message = (
                f"🚨 *NEW ACTIVE AMBER ALERT* 🚨\n\n"
                f"👤 *Name:* {db_person.full_name}\n"
                f"🎂 *Age:* {db_person.age} years old\n"
                f"📝 *Description:* {db_person.description}\n"
                f"📍 *Last Seen Location:* {db_person.last_known_lat:.4f}, {db_person.last_known_lng:.4f}\n\n"
                f"🚨 If spotted, please report immediately via the AMBER-India platform.\n"
                f"🔗 *Quick Report Link:* https://amber-india-frontend.onrender.com/report?personId={db_person.id}"
            )
            url = f"https://api.telegram.org/bot{tg_token}/sendMessage"
            payload = urllib.parse.urlencode({
                "chat_id": tg_chat,
                "text": tg_message,
                "parse_mode": "Markdown"
            }).encode()
            req = urllib.request.Request(url, data=payload, method="POST")
            urllib.request.urlopen(req, timeout=5)
            print(f"[TELEGRAM] Case alert sent to chat {tg_chat}")
        except Exception as e:
            print(f"[TELEGRAM] Case alert failed to send: {e}")

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
@app.put("/missing_persons/{person_id}/recover")
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

    # Store image as base64 in PostgreSQL (persistent, no external service needed)
    content = await photo.read()
    photo_url = to_base64_url(content, photo.filename)
    photo_path = photo_url  # use data url everywhere for consistency

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

@app.post("/broadcast/")
async def send_broadcast(message: str = Form(...), current_user: models.User = Depends(get_current_user)):
    """Broadcast an emergency message to all connected clients AND send to Telegram."""
    alert = {
        "type": "EMERGENCY_BROADCAST",
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "sender": "NATIONAL_COMMAND_CENTER"
    }
    await manager.broadcast(alert)

    # --- TELEGRAM REAL MOBILE NOTIFICATION ---
    tg_config = load_telegram_config()
    tg_token = tg_config.get("token")
    tg_chat = tg_config.get("chat_id")
    if tg_token and tg_chat:
        try:
            import urllib.request
            tg_message = (
                f"🚨 *AMBER-INDIA EMERGENCY BROADCAST*\n\n"
                f"📢 {message}\n\n"
                f"🕐 {datetime.now().strftime('%d %b %Y, %I:%M %p')}\n"
                f"📡 _Sent from: NATIONAL COMMAND CENTER_"
            )
            url = f"https://api.telegram.org/bot{tg_token}/sendMessage"
            payload = urllib.parse.urlencode({
                "chat_id": tg_chat,
                "text": tg_message,
                "parse_mode": "Markdown"
            }).encode()
            req = urllib.request.Request(url, data=payload, method="POST")
            urllib.request.urlopen(req, timeout=5)
            print(f"[TELEGRAM] Alert sent to chat {tg_chat}")
        except Exception as e:
            print(f"[TELEGRAM] Failed to send: {e}")
    else:
        print("[TELEGRAM] Bot token or chat ID not configured.")

    return {"success": True, "recipients": len(manager.active_connections)}

# --- TELEGRAM MANAGEMENT ENDPOINTS ---

@app.get("/telegram/status")
def get_telegram_status():
    """Retrieve current Telegram bot and linkage configuration status."""
    return load_telegram_config()

@app.post("/telegram/config")
def update_telegram_config(token: str = Form(...), chat_id: str = Form("")):
    """Save/update the Telegram Bot Token."""
    config = load_telegram_config()
    config["token"] = token
    if chat_id:
        config["chat_id"] = chat_id
    save_telegram_config(config)
    return {"success": True, "config": config}

@app.post("/telegram/sync")
def sync_telegram_chat():
    """Pull the latest chat update from Telegram to link the user's phone automatically."""
    config = load_telegram_config()
    token = config.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Telegram bot token not configured.")
    
    try:
        import urllib.request
        url = f"https://api.telegram.org/bot{token}/getUpdates"
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            
        if not data.get("ok"):
            raise HTTPException(status_code=400, detail=f"Telegram API error: {data.get('description', 'Unknown error')}")
            
        results = data.get("result", [])
        if not results:
            raise HTTPException(status_code=404, detail="No recent messages found. Please search for your bot in Telegram and press 'Start' or send a message first, then try again!")
            
        # Find the latest private message
        latest_chat = None
        for update in reversed(results):
            msg = update.get("message") or update.get("edited_message")
            if msg and msg.get("chat") and msg["chat"].get("type") == "private":
                chat = msg["chat"]
                latest_chat = {
                    "id": str(chat["id"]),
                    "name": chat.get("first_name", "") + (" " + chat.get("last_name", "") if chat.get("last_name") else "")
                }
                break
                
        if not latest_chat:
            raise HTTPException(status_code=404, detail="No private chat updates found. Please send a message directly to the bot first!")
            
        config["chat_id"] = latest_chat["id"]
        config["chat_name"] = latest_chat["name"]
        save_telegram_config(config)
        
        # Send confirmation message
        welcome_message = (
            f"🔔 *AMBER-INDIA LINK SUCCESSFUL*\n\n"
            f"👤 Hello *{latest_chat['name']}*,\n"
            f"Your mobile device has been successfully linked to the AMBER-India Recovery Grid.\n\n"
            f"🚨 You will now receive high-priority regional emergency broadcasts and active cases directly here."
        )
        send_url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = urllib.parse.urlencode({
            "chat_id": config["chat_id"],
            "text": welcome_message,
            "parse_mode": "Markdown"
        }).encode()
        send_req = urllib.request.Request(send_url, data=payload, method="POST")
        urllib.request.urlopen(send_req, timeout=5)
        
        return {"success": True, "chat_name": latest_chat["name"], "chat_id": latest_chat["id"]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync with Telegram: {str(e)}")

@app.post("/telegram/test")
def test_telegram_alert():
    """Send a demo test broadcast to the linked device."""
    config = load_telegram_config()
    token = config.get("token")
    chat_id = config.get("chat_id")
    if not token or not chat_id:
        raise HTTPException(status_code=400, detail="Telegram not linked yet. Please sync your device first!")
        
    try:
        import urllib.request
        test_message = (
            f"🚨 *AMBER-INDIA DEMO ALERT* 🚨\n\n"
            f"📢 This is a system test message to verify connection integrity.\n"
            f"📱 Status: ONLINE\n"
            f"📶 Latency: optimal\n"
            f"🤖 Bot Service: connected"
        )
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = urllib.parse.urlencode({
            "chat_id": chat_id,
            "text": test_message,
            "parse_mode": "Markdown"
        }).encode()
        req = urllib.request.Request(url, data=payload, method="POST")
        urllib.request.urlopen(req, timeout=5)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send test alert: {str(e)}")

@app.get("/sms_logs/", response_model=list[schemas.SmsAlertResponse])
def get_sms_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Retrieve all dispatched SMS alert logs."""
    logs = db.query(models.SmsAlert).order_by(models.SmsAlert.sent_at.desc()).offset(skip).limit(limit).all()
    return logs
