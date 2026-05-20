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

if __name__ == "__main__":
    print("=== AMBER-India DB Migration Helper ===")
    print("1. Backup local SQLite database to JSON")
    print("2. Restore backup JSON to cloud Postgres (Render / Neon)")
    choice = input("Enter choice (1/2): ").strip()
    
    if choice == '1':
        backup_sqlite_to_json()
    elif choice == '2':
        db_url = input("Enter your target database URL (DATABASE_URL): ").strip()
        if not db_url:
            print("[-] Database URL cannot be empty!")
            sys.exit(1)
        restore_backup_to_db(db_url)
    else:
        print("[-] Invalid choice.")
