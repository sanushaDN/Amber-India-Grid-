# AMBER-India: Live Demo & Presentation Guide 

To truly "wow" your project guide, follow this guide to showing the project in action.

## 1. The "Magic" Mobile Demo (Ngrok)
You can show the **Citizen Portal** working on your actual smartphone while your laptop shows the **Police Dashboard** live-updating.

### Option A: Same WiFi (Easiest)
If your phone and laptop are on the same WiFi network:
1.  Find your laptop's IP address (type `ipconfig` in your terminal). Example: `192.168.1.15`
2.  Start your servers with the `--host` flag:
    -   **Backend**: `uvicorn main:app --host 0.0.0.0 --reload`
    -   **Frontend**: `npm run dev -- --host`
3.  Open the browser on your phone and go to: `http://192.168.1.15:5173/report`

### Option B: Remote / Mobile Data (Ngrok)
If you are at college and the WiFi is restricted:
1.  Download **Ngrok** and authenticate it.
2.  Run: `ngrok http 5173`
3.  Open the generated **Forwarding URL** on your phone followed by `/report`.

---

## 2. The Presentation Flow (The "Story")

### Part 1: The Lockdown (Security)
-   Show your guide the `http://localhost:5173/dashboard` URL.
-   It will automatically redirect to the **Login Screen**.
-   Explain: *"All law enforcement data is protected by JWT (JSON Web Tokens). Only authorized officers can access the grid."*
-   Login with: **Username:** `admin` | **Password:** `password123`

### Part 2: The Sighting (The Citizen)
-   Open the **Citizen Portal** on your phone.
-   Select a missing person from the list.
-   Explain: *"Watch my laptop screen. As soon as I hit 'Broadcast Alert' on my phone, the AI server validates my GPS and face landmarks instantly."*
-   Submit the photo.

### Part 3: The Alert (The Dashboard)
-   The Police Dashboard on your laptop will flash with a **Critical Match** alert.
-   Click the alert to see the map pin and the AI Match Score (e.g., 94%).
-   Explain: *"The system has just mathematically verified that this child was spotted within the probable search geofence using MySQL Spatial Queries."*

---

## 3. Key Credentials
-   **Admin User:** `admin`
-   **Admin Pass:** `password123`
-   **Backend URL:** `http://localhost:8000`
-   **Frontend URL:** `http://localhost:5173`
