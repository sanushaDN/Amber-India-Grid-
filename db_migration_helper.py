import os
import json
import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

import models

def backup_sqlite_to_json(sqlite_db_path="backend/amber_grid.db", output_json="database_backup.json"):
    """Backs up existing SQLite database cases and sightings to a JSON file."""
    if not os.path.exists(sqlite_db_path):
        print(f"[-] SQLite database not found at {sqlite_db_path}")
        return False
        
    print(f"[+] Connecting to local SQLite database at {sqlite_db_path}...")
    conn = sqlite3.connect(sqlite_db_path)
    cursor = conn.cursor()
    
    backup_data = {
        "missing_persons": [],
        "citizen_sightings": [],
        "users": []
    }
    
    # Backup Missing Persons
    try:
        cursor.execute("SELECT id, full_name, age, description, last_known_lat, last_known_lng, photo_path, status, reported_at FROM missing_persons")
        for row in cursor.fetchall():
            backup_data["missing_persons"].append({
                "id": row[0],
                "full_name": row[1],
                "age": row[2],
                "description": row[3],
                "last_known_lat": row[4],
                "last_known_lng": row[5],
                "photo_path": row[6],
                "status": row[7],
                "reported_at": row[8]
            })
        print(f"[+] Backed up {len(backup_data['missing_persons'])} missing person cases.")
    except Exception as e:
        print(f"[-] Missing persons table empty or missing: {e}")
        
    # Backup Sightings
    try:
        cursor.execute("SELECT id, missing_person_id, sighting_lat, sighting_lng, photo_path, match_score, reported_at FROM citizen_sightings")
        for row in cursor.fetchall():
            backup_data["citizen_sightings"].append({
                "id": row[0],
                "missing_person_id": row[1],
                "sighting_lat": row[2],
                "sighting_lng": row[3],
                "photo_path": row[4],
                "match_score": row[5],
                "reported_at": row[6]
            })
        print(f"[+] Backed up {len(backup_data['citizen_sightings'])} citizen sightings.")
    except Exception as e:
        print(f"[-] Sightings table empty or missing: {e}")

    # Backup Users (Officers)
    try:
        cursor.execute("SELECT id, username, hashed_password FROM users")
        for row in cursor.fetchall():
            backup_data["users"].append({
                "id": row[0],
                "username": row[1],
                "hashed_password": row[2]
            })
        print(f"[+] Backed up {len(backup_data['users'])} system users.")
    except Exception as e:
        print(f"[-] Users table empty or missing: {e}")

    with open(output_json, 'w') as f:
        json.dump(backup_data, f, indent=4)
        
    print(f"[+] Complete backup saved successfully to {output_json}!")
    return True

def restore_backup_to_db(database_url, backup_json="database_backup.json"):
    """Restores cases, sightings and users from backup JSON to a new PostgreSQL / Neon / Render database."""
    if not os.path.exists(backup_json):
        print(f"[-] Backup file not found at {backup_json}")
        return False
        
    print(f"[+] Connecting to target database...")
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
        
    engine = create_engine(database_url)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Ensure tables are created
    models.Base.metadata.create_all(bind=engine)
    print("[+] Database tables initialized successfully.")
    
    with open(backup_json, 'r') as f:
        data = json.load(f)
        
    # Restore Users
    restored_users = 0
    for u in data.get("users", []):
        # Check if user already exists
        exists = session.query(models.User).filter_by(username=u["username"]).first()
        if not exists:
            user = models.User(
                username=u["username"],
                hashed_password=u["hashed_password"]
            )
            session.add(user)
            restored_users += 1
    session.commit()
    print(f"[+] Restored {restored_users} users.")

    # Restore Missing Persons
    restored_persons = 0
    for mp in data.get("missing_persons", []):
        exists = session.query(models.MissingPerson).filter_by(full_name=mp["full_name"]).first()
        if not exists:
            person = models.MissingPerson(
                full_name=mp["full_name"],
                age=mp["age"],
                description=mp["description"],
                last_known_lat=mp["last_known_lat"],
                last_known_lng=mp["last_known_lng"],
                photo_path=mp["photo_path"],
                status=mp["status"]
            )
            session.add(person)
            restored_persons += 1
    session.commit()
    print(f"[+] Restored {restored_persons} missing person cases.")

    # Restore Sightings
    restored_sightings = 0
    for cs in data.get("citizen_sightings", []):
        sighting = models.CitizenSighting(
            missing_person_id=cs["missing_person_id"],
            sighting_lat=cs["sighting_lat"],
            sighting_lng=cs["sighting_lng"],
            photo_path=cs["photo_path"],
            match_score=cs["match_score"]
        )
        session.add(sighting)
        restored_sightings += 1
    session.commit()
    print(f"[+] Restored {restored_sightings} citizen sightings.")
    
    print("[+] Restore operation completed successfully!")
    return True

def seed_demo_data(database_url):
    """Initializes the database and seeds it with demo data including base64 images."""
    print(f"[+] Connecting to database...")
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
        
    engine = create_engine(database_url)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Ensure tables are created
    models.Base.metadata.create_all(bind=engine)
    print("[+] Database tables initialized successfully.")
    
    # Seed default admin user
    import auth_utils
    admin_user = session.query(models.User).filter_by(username="admin").first()
    if not admin_user:
        hashed_pw = auth_utils.get_password_hash("password123")
        admin_user = models.User(username="admin", hashed_password=hashed_pw)
        session.add(admin_user)
        print("[+] Admin user 'admin' created with password 'password123'")
    else:
        print("[+] Admin user 'admin' already exists.")
        
    # Helper to convert local image to base64 data URL
    import base64
    def get_local_image_base64(filepath, default_name):
        if os.path.exists(filepath):
            try:
                with open(filepath, "rb") as f:
                    data = f.read()
                ext = filepath.rsplit('.', 1)[-1].lower() if '.' in filepath else 'jpg'
                mime = 'image/png' if ext == 'png' else 'image/gif' if ext == 'gif' else 'image/jpeg'
                encoded = base64.b64encode(data).decode('utf-8')
                return f"data:{mime};base64,{encoded}"
            except Exception as e:
                print(f"[-] Error reading {filepath}: {e}")
        # Return a simple mock SVG base64 if not found
        return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23cccccc'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%23666666'>" + default_name + "</text></svg>"

    # Define mock cases
    print("[+] Seeding cases...")
    cases_data = [
        {
            "full_name": "Aarav Sharma",
            "age": 8,
            "description": "Wearing a red t-shirt and blue jeans. Last seen near Sector 62 Park. Speaks Hindi and English.",
            "last_known_lat": 28.6284,
            "last_known_lng": 77.3769,
            "photo_path": get_local_image_base64("backend/uploads/missing_persons/missing_girl.jpg", "Aarav"),
            "status": models.StatusEnum.ACTIVE
        },
        {
            "full_name": "Sanusha Iyer",
            "age": 14,
            "description": "Last seen near Connaught Place Metro Station Gate 3. Wearing a white floral dress. Height 5'2\".",
            "last_known_lat": 28.6304,
            "last_known_lng": 77.2177,
            "photo_path": get_local_image_base64("backend/uploads/missing_persons/sanusha.png", "Sanusha"),
            "status": models.StatusEnum.ACTIVE
        },
        {
            "full_name": "Rohan Verma",
            "age": 11,
            "description": "Last seen near Noida City Center. Wearing black school uniform. Left home with a green backpack.",
            "last_known_lat": 28.5747,
            "last_known_lng": 77.3560,
            "photo_path": get_local_image_base64("backend/uploads/missing_persons/WIN_20231216_18_37_17_Pro (2).jpg", "Rohan"),
            "status": models.StatusEnum.RECOVERED
        }
    ]
    
    seeded_cases = []
    for c in cases_data:
        person = session.query(models.MissingPerson).filter_by(full_name=c["full_name"]).first()
        if not person:
            person = models.MissingPerson(
                full_name=c["full_name"],
                age=c["age"],
                description=c["description"],
                last_known_lat=c["last_known_lat"],
                last_known_lng=c["last_known_lng"],
                photo_path=c["photo_path"],
                status=c["status"]
            )
            session.add(person)
            session.commit()
            session.refresh(person)
            print(f"[+] Seeded missing person: {c['full_name']}")
        else:
            print(f"[+] Missing person {c['full_name']} already exists.")
        seeded_cases.append(person)
        
    # Define mock sightings
    print("[+] Seeding citizen sightings...")
    aarav = next((p for p in seeded_cases if p.full_name == "Aarav Sharma"), None)
    sanusha = next((p for p in seeded_cases if p.full_name == "Sanusha Iyer"), None)
    
    if aarav:
        sighting = session.query(models.CitizenSighting).filter_by(missing_person_id=aarav.id).first()
        if not sighting:
            sighting = models.CitizenSighting(
                missing_person_id=aarav.id,
                sighting_lat=28.6295,
                sighting_lng=77.3780,
                photo_path=get_local_image_base64("backend/uploads/sightings/WIN_20260313_15_33_34_Pro.jpg", "Aarav Sighting"),
                match_score=84.5
            )
            session.add(sighting)
            print("[+] Seeded sighting for Aarav Sharma (84.5% match).")
            
    if sanusha:
        sighting = session.query(models.CitizenSighting).filter_by(missing_person_id=sanusha.id).first()
        if not sighting:
            sighting1 = models.CitizenSighting(
                missing_person_id=sanusha.id,
                sighting_lat=28.6312,
                sighting_lng=77.2185,
                photo_path=get_local_image_base64("backend/uploads/sightings/sanusha_DN.jpeg", "Sanusha Sighting 1"),
                match_score=92.1
            )
            session.add(sighting1)
            
            sighting2 = models.CitizenSighting(
                missing_person_id=sanusha.id,
                sighting_lat=28.6289,
                sighting_lng=77.2201,
                photo_path=get_local_image_base64("backend/uploads/sightings/sanusha.png", "Sanusha Sighting 2"),
                match_score=68.2
            )
            session.add(sighting2)
            print("[+] Seeded 2 sightings for Sanusha Iyer.")
            
    # Seed SMS Logs
    print("[+] Seeding Twilio/SMS Alert Logs...")
    volunteers = [
        "+91 98765 43210", 
        "+91 99887 76655", 
        "+91 88776 65544"
    ]
    for phone in volunteers:
        for c in seeded_cases:
            sms_message = (
                f"🚨 AMBER ALERT 🚨\n"
                f"Missing: {c.full_name} ({c.age}y)\n"
                f"Last seen: {c.last_known_lat:.4f}, {c.last_known_lng:.4f}\n"
                f"If spotted, report instantly: https://amber-india-frontend.onrender.com/report?personId={c.id}"
            )
            exists = session.query(models.SmsAlert).filter_by(phone_number=phone, message=sms_message).first()
            if not exists:
                alert = models.SmsAlert(
                    phone_number=phone,
                    message=sms_message,
                    status="SENT",
                    provider="MOCK_TWILIO_GATEWAY"
                )
                session.add(alert)
    session.commit()
    print("[+] Seeding completed successfully!")
    return True

if __name__ == "__main__":
    print("=== AMBER-India DB Migration Helper ===")
    print("1. Backup local SQLite database to JSON")
    print("2. Restore backup JSON to cloud Postgres (Render / Neon)")
    print("3. Initialize and seed database with clean demo data")
    choice = input("Enter choice (1/2/3): ").strip()
    
    if choice == '1':
        backup_sqlite_to_json()
    elif choice == '2':
        db_url = input("Enter your target database URL (DATABASE_URL): ").strip()
        if not db_url:
            print("[-] Database URL cannot be empty!")
            sys.exit(1)
        restore_backup_to_db(db_url)
    elif choice == '3':
        db_url = input("Enter your target database URL (DATABASE_URL): ").strip()
        if not db_url:
            print("[-] Database URL cannot be empty!")
            sys.exit(1)
        seed_demo_data(db_url)
    else:
        print("[-] Invalid choice.")
