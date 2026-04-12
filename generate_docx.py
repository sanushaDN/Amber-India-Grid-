from docx import Document
from docx.shared import Pt
from docx.enum.text import WD_LINE_SPACING

def set_font(run, size, bold=False):
    run.font.name = 'Times New Roman'
    run.font.size = Pt(size)
    run.bold = bold

def add_paragraph(doc, text, size=12, bold=False, heading=False):
    if heading:
        p = doc.add_paragraph()
    else:
        p = doc.add_paragraph()
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    
    run = p.add_run(text)
    set_font(run, size, bold)
    return p

doc = Document()

# FRONT SHEETS
add_paragraph(doc, "BCA FINAL YEAR INTERNSHIP REPORT", 16, True)
add_paragraph(doc, "Project Title: AMBER-India (Automated Missing Persons Biometric Extraction & Recovery)", 14, True)
doc.add_page_break()

add_paragraph(doc, "INTERNSHIP REPORT", 14, True)
add_paragraph(doc, "On", 12)
add_paragraph(doc, "AMBER-India (National Missing Person Recovery Grid)", 14, True)
add_paragraph(doc, "Submitted In Partial fulfillment of the requirements for the degree of", 12)
add_paragraph(doc, "Bachelor of Computer Applications\n", 12, True)

add_paragraph(doc, "Submitted by", 12)
add_paragraph(doc, "[YOUR NAME]", 12, True)
add_paragraph(doc, "[YOUR USN]\n", 12, True)

add_paragraph(doc, "Under the Guidance", 12)
add_paragraph(doc, "[GUIDE NAME]", 12, True)
add_paragraph(doc, "[DESIGNATION]\n", 12, True)

add_paragraph(doc, "NMKRV College", 14, True)
add_paragraph(doc, "45/1, 22nd cross, Jayanagar, 3rd Block,", 12)
add_paragraph(doc, "Bengaluru - 560011, Karnataka, India", 12)
add_paragraph(doc, "Autonomous Intuition | NAAC Accredited", 12)
add_paragraph(doc, "2025 - 2026", 12, True)
doc.add_page_break()

# ABSTRACT
add_paragraph(doc, "ABSTRACT", 14, True)
abst = "This internship report details my experience and technical contributions at Vivarttana Technologies. The primary objective of this internship was to architect, develop, and integrate a high-fidelity, real-time tactical web application known as AMBER-India (Automated Missing Persons Biometric Extraction & Recovery).\n\nThe project involved building a robust full-stack ecosystem consisting of a FastAPI (Python) backend, a highly responsive React/Vite frontend, and a relational MySQL database. Key features developed include real-time WebSocket communication for instant crisis broadcasting, biometric neural-net matching simulation, and interactive geographical mapping (Grid Map) using Leaflet. The platform creates a unified \"Tactical Intelligence Loop,\" connecting a Citizen Upload portal with a government-grade Police Command Dashboard.\n\nThrough this project, I gained extensive practical experience in API design, state management in React, real-time networking protocols, database ORM integration using SQLAlchemy, and modern UI/UX design philosophies including glassmorphism and tailwind utility classes. This platform serves as a modern blueprint for how crowdsourced public intelligence can be harnessed using AI and real-time networking to assist law enforcement agencies."
add_paragraph(doc, abst, 12, False)
doc.add_page_break()

# CHAPTER 1
add_paragraph(doc, "CHAPTER 1: INTRODUCTION", 14, True)
add_paragraph(doc, "1.1 Company Profile", 12, True)
c1p1 = "Vivarttana Technologies, headquartered in 4th T Block Jayanagar, Bengaluru, is a dynamic and fast-growing IT services company specializing in delivering innovative and scalable digital solutions. The company operates across multiple domains including Web Development, Robot's Sales & Services, Software Consulting, Enterprise Solutions, Technical Training, and Digital Transformation Services. With a client-centric approach, Vivarttana strives to build custom software solutions that align with modern business goals and technological trends."
add_paragraph(doc, c1p1, 12)

add_paragraph(doc, "1.2 Organizational Study", 12, True)
c1p2 = "During my tenure at Vivarttana Technologies, I operated under the guidance of senior technical mentors who instilled a rigorous software development lifecycle. I learned to translate complex government or enterprise requirements into actionable software modules, managing my progress through iterative sprints. The organizational structure encouraged taking ownership of both frontend architectural decisions and backend database schema design."
add_paragraph(doc, c1p2, 12)

add_paragraph(doc, "1.3 Project Specifications", 12, True)
c1p3 = "Project Name: AMBER-India Recovery Grid\nObjective: To build an asynchronous, real-time tactical dashboard designed for law enforcement to register missing persons, combined with a citizen-facing portal to upload live sightings that are scanned for biometric matches.\n\nCore Modules:\n- Authentication Engine: Secure JWT Bearer token authentication for government administrators.\n- Police Dashboard (Command Center): A high-contrast, tactical UI allowing officers to register new priority cases, view a live geographical grid map, and handle WebSocket alerts.\n- Citizen Sighting Portal: A public-facing module allowing civilians to upload photos and coordinates, incentivized by a gamified 'Honor Badge' system.\n- Biometric Matching Pipeline: A backend algorithm that calculates similarity confidence between the original case photo and the incoming citizen sighting."
add_paragraph(doc, c1p3, 12)

add_paragraph(doc, "1.4 Tools Used", 12, True)
c1p4 = "1.4.1 Hardware Specification\n- Processor: Intel Core i5 / AMD Ryzen 5 or above.\n- RAM: 8GB Minimum (16GB recommended for running database and both servers concurrently).\n- Storage: 256GB SSD.\n\n1.4.2 Software Specification\n- Frontend Framework: React.js (via Vite)\n- Styling & UI: Tailwind CSS v4, Lucide-React Icons\n- Backend Framework: FastAPI (Python)\n- Database: MySQL (hosted via XAMPP)\n- Package Managers: NPM (Node Package Manager), Pip (Python)\n- Environment & Servers: Node.js, Uvicorn, XAMPP Control Panel\n- IDE: Visual Studio Code"
add_paragraph(doc, c1p4, 12)
doc.add_page_break()

# CHAPTER 2
add_paragraph(doc, "CHAPTER 2: INTERNSHIP ACTIVITIES", 14, True)
c2p0 = "During the internship, my activities were divided into designing the backend data pipeline, building the frontend visual interface, and establishing the real-time networking bridge between them."
add_paragraph(doc, c2p0, 12)

add_paragraph(doc, "2.1 Backend Development (FastAPI & Python)", 12, True)
add_paragraph(doc, "I developed an asynchronous REST API using Pythons FastAPI. This involved creating database models using SQLAlchemy to represent Users, MissingPersons, and CitizenSightings. Crucially, I implemented a custom auth_utils module to generate secure JSON Web Tokens (JWT) for the police dashboard using PBKDF2 hashing.", 12)

add_paragraph(doc, "2.2 Relational Database Management (MySQL)", 12, True)
add_paragraph(doc, "Configured a MySQL database using XAMPP on port 3307. I constructed a schema to ensure data integrity, linking citizen uploads to specific missing person cases via foreign keys, and utilizing status enums (ACTIVE, RECOVERED).", 12)

add_paragraph(doc, "2.3 Real-Time WebSocket Implementation", 12, True)
add_paragraph(doc, "To ensure law enforcement officers are notified instantly when a citizen spies a missing person, I implemented long-lived WebSocket connections. The backend ConnectionManager manages active browsers and broadcasts JSON payloads (labeled CRITICAL_MATCH) the millisecond a biometric match score exceeds a 70% threshold.", 12)

add_paragraph(doc, "2.4 Frontend Development (React & Vite)", 12, True)
add_paragraph(doc, "The front-end was built using modern React hooks (useState, useEffect, useCallback). I partitioned the application into functional components including Login, PoliceDashboard, and CitizenUpload.", 12)

add_paragraph(doc, "2.5 Advanced UI Styling (Tailwind CSS)", 12, True)
add_paragraph(doc, "Instead of relying on boilerplate frameworks like Bootstrap, I utilized vanilla CSS combined with Tailwind CSS v4 to create a bespoke 'tactical' aesthetic. This involved keyframe animations for biometric scanning lasers, custom scrollbars, and deep glassmorphism blending to look like a high-end government application.", 12)
doc.add_page_break()

# CHAPTER 3
add_paragraph(doc, "CHAPTER 3: INTERNSHIP PROJECT DISCUSSION", 14, True)
c3p1 = "The core challenge of the AMBER-India project was achieving seamless, bidirectional cross-communication between a public citizen and a proprietary police view without requiring the police officer to refresh the page.\n\nThe Automated Tactical Intelligence Loop:\n1. Ingestion: A civilian uploads an image through the Citizen Portal. The frontend uses a FormData object to transmit the file payload.\n2. AI Analysis Simulation: The Python backend intercepts the upload, securely stores it on the server filesystem, and processes a deep-feature extraction (deterministic MD5-hash matching mock) simulating DeepFace.\n3. Real-Time Broadcast: If the returned confidence score is over 70%, the backend invokes the WebSocket manager.\n4. Tactical UI Overlay: The React dashboard receives the broadcast and immediately interrupts the officer's screen with a high-fidelity 'Biometric Verification Overlay'. It displays the original case photo and the sighting photo side-by-side with animated scanning lasers.\n5. Resolution: The officer authorizes dispatch, locking the geographical grid, and updates the missing person's status to RECOVERED, closing the loop securely.\n\nThis architecture fundamentally proved my ability to maintain complex client-server lifecycles, handle asynchronous event loops, and architect database schemas capable of handling geographical data."
add_paragraph(doc, c3p1, 12)
doc.add_page_break()

# CHAPTER 4
add_paragraph(doc, "CHAPTER 4: CONCLUSION", 14, True)
c4p1 = "The internship at Vivarttana Technologies has been a transformative experience, bridging the gap between theoretical computer science concepts and robust, production-ready software engineering.\n\nBy single-handedly developing the AMBER-India platform, I achieved a comprehensive mastery of full-stack engineering. I successfully navigated the intricacies of asynchronous Python programming with FastAPI, relational state management with MySQL and SQLAlchemy, and reactive user interfaces using React.\n\nBeyond technical syntax, I learned invaluable lessons in error-handling, API security (JWT configuration, route protection), and user-centric design principles. The ability to integrate real-time WebSockets to simulate biometric alert broadcasting has prepared me for the demands of modern web development in a professional capacity. I am confident that the skills honed during this internship will serve as a powerful foundation for my future career as a software engineer."
add_paragraph(doc, c4p1, 12)

doc.save("C:\\Users\\USER\\Documents\\AMBER-Project\\AMBER-India_Internship_Report.docx")
print("Done")
