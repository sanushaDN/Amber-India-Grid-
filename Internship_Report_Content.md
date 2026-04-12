# BCA FINAL YEAR INTERNSHIP REPORT
**Project Title**: AMBER-India (Automated Missing Persons Biometric Extraction & Recovery)

---

## FRONT SHEETS

**INTERNSHIP REPORT**
On
**AMBER-India (National Missing Person Recovery Grid)**
Submitted In Partial fulfillment of the requirements for the degree of 
**Bachelor of Computer Applications**

Submitted by 
**[YOUR NAME]**      
**[YOUR USN]**

Under the Guidance 
**[GUIDE NAME]** 
**[DESIGNATION]**

**NMKRV College**
45/1, 22nd cross, Jayanagar, 3rd Block, 
Bengaluru - 560011, Karnataka, India 
Autonomous Intuition | NAAC Accredited 
2025 - 2026

*Note: Add Bonafide Certificate, Acknowledgement, and Weekly Overview here as per your PDF format.*

---

## ABSTRACT

This internship report details my experience and technical contributions at Vivarttana Technologies. The primary objective of this internship was to architect, develop, and integrate a high-fidelity, real-time tactical web application known as **AMBER-India** (Automated Missing Persons Biometric Extraction & Recovery). 

The project involved building a robust full-stack ecosystem consisting of a FastAPI (Python) backend, a highly responsive React/Vite frontend, and a relational MySQL database. Key features developed include real-time WebSocket communication for instant crisis broadcasting, biometric neural-net matching simulation, and interactive geographical mapping (Grid Map) using Leaflet. The platform creates a unified "Tactical Intelligence Loop," connecting a Citizen Upload portal with a government-grade Police Command Dashboard. 

Through this project, I gained extensive practical experience in API design, state management in React, real-time networking protocols, database ORM integration using SQLAlchemy, and modern UI/UX design philosophies including glassmorphism and tailwind utility classes. This platform serves as a modern blueprint for how crowdsourced public intelligence can be harnessed using AI and real-time networking to assist law enforcement agencies.

---

## CHAPTER 1: INTRODUCTION

### 1.1 Company Profile
Vivarttana Technologies, headquartered in 4th T Block Jayanagar, Bengaluru, is a dynamic and fast-growing IT services company specializing in delivering innovative and scalable digital solutions. The company operates across multiple domains including Web Development, Robot's Sales & Services, Software Consulting, Enterprise Solutions, Technical Training, and Digital Transformation Services. With a client-centric approach, Vivarttana strives to build custom software solutions that align with modern business goals and technological trends.

### 1.2 Organizational Study
During my tenure at Vivarttana Technologies, I operated under the guidance of senior technical mentors who instilled a rigorous software development lifecycle. I learned to translate complex government or enterprise requirements into actionable software modules, managing my progress through iterative sprints. The organizational structure encouraged taking ownership of both frontend architectural decisions and backend database schema design.

### 1.3 Project Specifications
**Project Name:** AMBER-India Recovery Grid
**Objective:** To build an asynchronous, real-time tactical dashboard designed for law enforcement to register missing persons, combined with a citizen-facing portal to upload live sightings that are scanned for biometric matches.

**Core Modules:**
*   **Authentication Engine:** Secure JWT Bearer token authentication for government administrators.
*   **Police Dashboard (Command Center):** A high-contrast, tactical UI allowing officers to register new priority cases, view a live geographical grid map, and handle WebSocket alerts.
*   **Citizen Sighting Portal:** A public-facing module allowing civilians to upload photos and coordinates, incentivized by a gamified "Honor Badge" system.
*   **Biometric Matching Pipeline:** A backend algorithm that calculates similarity confidence between the original case photo and the incoming citizen sighting.

### 1.4 Tools Used
#### 1.4.1 Hardware Specification
*   **Processor:** Intel Core i5 / AMD Ryzen 5 or above.
*   **RAM:** 8GB Minimum (16GB recommended for running database and both servers concurrently).
*   **Storage:** 256GB SSD.

#### 1.4.2 Software Specification
*   **Frontend Framework:** React.js (via Vite)
*   **Styling & UI:** Tailwind CSS v4, Lucide-React Icons
*   **Backend Framework:** FastAPI (Python)
*   **Database:** MySQL (hosted via XAMPP)
*   **Package Managers:** NPM (Node Package Manager), Pip (Python)
*   **Environment & Servers:** Node.js, Uvicorn, XAMPP Control Panel
*   **IDE:** Visual Studio Code

---

## CHAPTER 2: INTERNSHIP ACTIVITIES

During the internship, my activities were divided into designing the backend data pipeline, building the frontend visual interface, and establishing the real-time networking bridge between them.

### 2.1 Backend Development (FastAPI & Python)
I developed an asynchronous REST API using Python’s FastAPI. This involved creating database models using **SQLAlchemy** to represent `Users`, `MissingPersons`, and `CitizenSightings`. Crucially, I implemented a custom `auth_utils` module to generate secure JSON Web Tokens (JWT) for the police dashboard using PBKDF2 hashing.

### 2.2 Relational Database Management (MySQL)
Configured a MySQL database using XAMPP on port 3307. I constructed a schema to ensure data integrity, linking citizen uploads to specific missing person cases via foreign keys, and utilizing status enums (`ACTIVE`, `RECOVERED`).

### 2.3 Real-Time WebSocket Implementation
To ensure law enforcement officers are notified instantly when a citizen spies a missing person, I implemented long-lived WebSocket connections. The backend `ConnectionManager` manages active browsers and broadcasts JSON payloads (labeled `CRITICAL_MATCH`) the millisecond a biometric match score exceeds a 70% threshold.

### 2.4 Frontend Development (React & Vite)
The front-end was built using modern React hooks (`useState`, `useEffect`, `useCallback`). I partitioned the application into functional components including `Login`, `PoliceDashboard`, and `CitizenUpload`. 

### 2.5 Advanced UI Styling (Tailwind CSS)
Instead of relying on boilerplate frameworks like Bootstrap, I utilized vanilla CSS combined with Tailwind CSS v4 to create a bespoke "tactical" aesthetic. This involved keyframe animations for biometric scanning lasers, custom scrollbars, and deep glassmorphism blending to look like a high-end government application.

---

## CHAPTER 3: INTERNSHIP PROJECT DISCUSSION

The core challenge of the AMBER-India project was achieving seamless, bidirectional cross-communication between a public citizen and a proprietary police view without requiring the police officer to refresh the page. 

**The Automated Tactical Intelligence Loop:**
1.  **Ingestion:** A civilian uploads an image through the Citizen Portal. The frontend uses a `FormData` object to transmit the file payload.
2.  **AI Analysis Simulation:** The Python backend intercepts the upload, securely stores it on the server filesystem, and processes a deep-feature extraction (deterministic MD5-hash matching mock) simulating DeepFace.
3.  **Real-Time Broadcast:** If the returned confidence score is over 70%, the backend invokes the WebSocket manager.
4.  **Tactical UI Overlay:** The React dashboard receives the broadcast and immediately interrupts the officer's screen with a high-fidelity "Biometric Verification Overlay". It displays the original case photo and the sighting photo side-by-side with animated scanning lasers.
5.  **Resolution:** The officer authorizes dispatch, locking the geographical grid, and updates the missing person's status to `RECOVERED`, closing the loop securely.

This architecture fundamentally proved my ability to maintain complex client-server lifecycles, handle asynchronous event loops, and architect database schemas capable of handling geographical data.

---

## CHAPTER 4: CONCLUSION

The internship at Vivarttana Technologies has been a transformative experience, bridging the gap between theoretical computer science concepts and robust, production-ready software engineering. 

By single-handedly developing the AMBER-India platform, I achieved a comprehensive mastery of full-stack engineering. I successfully navigated the intricacies of asynchronous Python programming with FastAPI, relational state management with MySQL and SQLAlchemy, and reactive user interfaces using React.

Beyond technical syntax, I learned invaluable lessons in error-handling, API security (JWT configuration, route protection), and user-centric design principles. The ability to integrate real-time WebSockets to simulate biometric alert broadcasting has prepared me for the demands of modern web development in a professional capacity. I am confident that the skills honed during this internship will serve as a powerful foundation for my future career as a software engineer.
