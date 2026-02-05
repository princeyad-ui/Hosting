📘 AI Proctoring & Online Examination System

A full-stack, secure, AI-powered exam platform with real-time proctoring, automated monitoring, result analytics, and session evidence tracking.

🚀 Overview

This project is a complete AI-proctored examination system that allows institutes or teachers to conduct online exams with strict monitoring.
The system includes:

Admin panel to create/manage exams

AI-based proctoring (camera + mic + tab switching detection)

Student exam interface with live monitoring

Exam results with analytics

Proctoring evidence report per student

Admins can see only their own exams and results, ensuring privacy and security.

✨ Key Features
🔐 Admin Features

Secure JWT-based admin login & signup

Create, edit, and delete exams

Add questions (MCQ + text)

Send exam invite email to students

View exam results (pass/fail, score, answers)

View AI proctoring report of each student:

Suspicious activity alerts

Frames captured

Audio logs

Risk score

Delete individual student exam results

Only see exams created by themselves (multi-admin isolation)

🎓 Student Features

Secure exam access via unique link

System check (camera, mic, internet)

Full-screen exam interface

Auto-submit on timer completion

AI proctoring in background (no UI disturbance)

Thank-you page after submission

🤖 AI Proctoring

Live face monitoring

Audio monitoring

Tab switch detection

Event logging (alerts, screenshots, timestamps)

Evidence ZIP download

Admin can view real-time dashboard of sessions

🛠️ Tech Stack
Frontend (React)

React.js

React Router

CSS Modules

WebRTC (camera/mic)

MediaRecorder API

Fullscreen & Visibility API

Vite

Backend (Node.js + Express)

Express.js

MongoDB + Mongoose

Multer (image/audio uploads)

JWT Authentication

Nodemailer

Server-Sent Events (SSE) for real-time alerts

Database

MongoDB

Models:

AdminUser

Exam

ExamSession


📂 Folder Structure
<img width="803" height="560" alt="image" src="https://github.com/user-attachments/assets/bfcd7b7c-0254-4173-851c-7fe028789a24" />


🔧 Installation & Setup
1️⃣ Clone the repository
git clone https://github.com/your-username/ai-proctor-exam.git
cd ai-proctor-exam

🖥️ Backend Setup (Node.js)
Install dependencies:
cd server
npm install


Run backend:
node index.js


Server runs at:

http://localhost:5000

🌐 Frontend Setup (React)
Install dependencies:
cd client
npm install

Run frontend:
npm run dev


Frontend runs at:

http://localhost:5173

📡 API Endpoints (Quick Overview)
Admin Auth

POST /api/admin/signup

POST /api/admin/login

GET /api/admin/me

Exams

POST /api/exams (owner createdBy)

GET /api/exams (filtered by admin)

PUT /api/exams/:id/questions

DELETE /api/exams/:id

POST /api/exams/:id/send-invite

Students

GET /api/exams/link/:code

POST /api/exams/:id/sessions

POST /api/exam-sessions/:id/complete

Results

GET /api/exam-sessions (admin-only filtered)

GET /api/exam-sessions/:id

DELETE /api/exam-sessions/:id

AI Proctoring

POST /api/start-session

POST /api/frame

POST /api/audio

POST /api/alerts

POST /api/end-session

GET /api/report/:sessionId

GET /api/sessions

GET /api/sessions/:id/events

GET /api/events/stream (live alerts)


🧪 Features Under the Hood
✔ Full-Screen Enforcement

Warns if user exits fullscreen

Logs events to proctoring system

✔ Tab Switching Detection

Detects visibility change

Sends alert to backend

✔ AI Proctor Dashboard

Live alerts

Risk scoring

Real-time session grid

📝 Screenshots (Add Later)
📸 Admin Login
<img width="1892" height="899" alt="image" src="https://github.com/user-attachments/assets/19fcf422-1342-4635-a804-23dc9d2e7723" />

📸 Create Exam
<img width="1881" height="910" alt="image" src="https://github.com/user-attachments/assets/6ed738b4-96e2-40dc-bd6b-1327daef64f8" />

📸 Student System Check
<img width="1534" height="801" alt="image" src="https://github.com/user-attachments/assets/99e57789-99a6-4d44-86de-a02abeefe45b" />

📸 Exam Interface
<img width="1894" height="908" alt="image" src="https://github.com/user-attachments/assets/3ad1afb6-a965-4aa7-bdc4-b33ffd6ee208" />

📸 AI Proctor Dashboard
<img width="1873" height="884" alt="image" src="https://github.com/user-attachments/assets/1da16265-ed2b-4f54-9b0c-33e0f5f9af49" />

📸 Result Page
<img width="1878" height="886" alt="image" src="https://github.com/user-attachments/assets/3dbf69cc-366d-407a-8ccf-f6ab19b4e95c" />

📸 Evidence Report
<img width="1123" height="907" alt="image" src="https://github.com/user-attachments/assets/23c815ba-e277-4401-b9cb-2c9c85049dc5" />


👨‍💻 Author

Prince Kumar
AI Proctored Exam Full-Stack Developer
Contributor - Abhinash Kumar

🤝 Contributing

Pull requests are welcome.
For major changes, please open an issue first to discuss what you would like to change.

📄 License

MIT License (free to use and modify)
