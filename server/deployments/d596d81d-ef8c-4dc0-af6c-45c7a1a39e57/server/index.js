// server/index.js - FULL BACKEND FOR AI-PROCTOR + EXAMS

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs-extra");
const path = require("path");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ─────────────────────────────────────
// MongoDB Connection
// ─────────────────────────────────────

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai_proctor";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error", err);
    process.exit(1); // stop the app if DB fails
  });

// ─────────────────────────────────────
// Admin User Schema + Model
// ─────────────────────────────────────
const adminUserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, required: true, unique: true },
    phone: String,
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

const AdminUser = mongoose.model("AdminUser", adminUserSchema);

// ─────────────────────────────────────
// Exam + ExamSession Schemas + Models
// ─────────────────────────────────────
const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctIndex: { type: Number, required: true }, // 0-based
});

const ExamSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    linkCode: { type: String, unique: true }, // used in /exam/:code
    durationMinutes: Number,
    totalQuestions: Number,
    passingMarks: Number,
    questions: [QuestionSchema],
  },
  { timestamps: true }
);

const Exam = mongoose.model("Exam", ExamSchema);

const ExamSessionSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    studentName: { type: String, required: true },
    studentEmail: { type: String, required: true },
    proctorSessionId: { type: String }, // optional: link to AI proctor session
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    autoSubmitted: { type: Boolean, default: false },
    responses: { type: Object, default: {} }, // { [questionIndex]: answer }
    score: { type: Number, default: 0 },
    status: { type: String, default: "in-progress" }, // in-progress/completed
  },
  { timestamps: true }
);

const ExamSession = mongoose.model("ExamSession", ExamSessionSchema);

// ─────────────────────────────────────
// Email (Nodemailer) Setup
// ─────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail", // or custom SMTP
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─────────────────────────────────────
// App + Middleware
// ─────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// simple request logger
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// evidence storage dir
const STORAGE_DIR = path.join(__dirname, "evidence");
fs.ensureDirSync(STORAGE_DIR);
app.use("/evidence", express.static(STORAGE_DIR));

// multer memory storage
const upload = multer({ storage: multer.memoryStorage() });

// JWT
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

// ─────────────────────────────────────
// In-memory Proctoring Store
// ─────────────────────────────────────
const SESSIONS = {};
const EVENTS = [];
const sseClients = new Set();

function broadcastEvent(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch (e) {
      console.warn("SSE client write failed, removing client");
      sseClients.delete(res);
    }
  }
}

// ─────────────────────────────────────
// Auth Middleware
// ─────────────────────────────────────
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

// ─────────────────────────────────────
// Root
// ─────────────────────────────────────
app.get("/", (req, res) => {
  res.send("AI Proctoring API + Exams Running...");
});

// ─────────────────────────────────────
// Admin Auth Routes
// ─────────────────────────────────────

// Signup admin
app.post("/api/admin/signup", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password required" });
    }

    const existing = await AdminUser.findOne({ email });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await AdminUser.create({
      name,
      email,
      phone,
      passwordHash: hash,
    });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error("admin signup error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Login admin
app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password required" });
    }

    const user = await AdminUser.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error("admin login error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get current admin profile
app.get("/api/admin/me", authMiddleware, async (req, res) => {
  try {
    const user = await AdminUser.findById(req.userId).select("-passwordHash");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user });
  } catch (err) {
    console.error("admin me error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─────────────────────────────────────
// Proctoring API
// ─────────────────────────────────────

// start proctor session
// start proctor session
app.post("/api/start-session", (req, res) => {
  const sessionId = uuidv4();

  // NEW: optional student info (for showing name with session)
  const { studentName, studentEmail } = req.body || {};

  SESSIONS[sessionId] = {
    sessionId,
    startedAt: new Date().toISOString(),
    // store student identity for easier reporting
    studentName: studentName || "Unknown Student",
    studentEmail: studentEmail || "",
    events: [],
    evidence: [],
    endedAt: null,
    riskScore: 0,
  };

  console.log(
    "Session started:",
    sessionId,
    "for",
    studentName || "Unknown Student"
  );

  res.json({ success: true, sessionId });
});


// receive frame
app.post("/api/frame", upload.single("frame"), async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId || !SESSIONS[sessionId]) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid sessionId" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No frame uploaded" });
    }

    const sessDir = path.join(STORAGE_DIR, sessionId);
    await fs.ensureDir(sessDir);

    const filename = `${Date.now()}_${uuidv4()}.jpg`;
    const filepath = path.join(sessDir, filename);
    await fs.writeFile(filepath, req.file.buffer);

    const servedPath = `/evidence/${sessionId}/${filename}`;
    const ev = {
      type: "frame",
      path: filepath,
      servedPath,
      timestamp: new Date().toISOString(),
    };
    SESSIONS[sessionId].evidence.push(ev);

    res.json({ success: true, message: "Frame saved", evidence: ev });
  } catch (err) {
    console.error("frame error", err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// receive audio
app.post("/api/audio", upload.single("audio"), async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId || !SESSIONS[sessionId]) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid sessionId" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No audio uploaded" });
    }

    const sessDir = path.join(STORAGE_DIR, sessionId);
    await fs.ensureDir(sessDir);

    const filename = `${Date.now()}_${uuidv4()}.webm`;
    const filepath = path.join(sessDir, filename);
    await fs.writeFile(filepath, req.file.buffer);

    const servedPath = `/evidence/${sessionId}/${filename}`;
    const ev = {
      type: "audio",
      path: filepath,
      servedPath,
      timestamp: new Date().toISOString(),
    };
    SESSIONS[sessionId].evidence.push(ev);

    res.json({ success: true, message: "Audio saved", evidence: ev });
  } catch (err) {
    console.error("audio error", err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// alerts
app.post("/api/alerts", (req, res) => {
  const { sessionId, type, severity = "medium", details = "" } = req.body;
  if (!sessionId || !SESSIONS[sessionId]) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid sessionId" });
  }

  const event = {
    id: uuidv4(),
    sessionId,
    type,
    severity,
    details,
    timestamp: new Date().toISOString(),
  };
  SESSIONS[sessionId].events.push(event);
  EVENTS.push(event);

  console.log("Alert:", event);
  broadcastEvent(event);
  res.json({ success: true, event });
});

// end session
app.post("/api/end-session", (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId || !SESSIONS[sessionId]) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid sessionId" });
  }

  const session = SESSIONS[sessionId];
  session.endedAt = new Date().toISOString();
  session.riskScore = session.events.length;
  res.json({ success: true, session });
});

// get report
app.get("/api/report/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId || !SESSIONS[sessionId]) {
    return res
      .status(404)
      .json({ success: false, message: "Session not found" });
  }
  res.json({ success: true, session: SESSIONS[sessionId] });
});

// list sessions
app.get("/api/sessions", (req, res) => {
  res.json({ success: true, sessions: Object.values(SESSIONS) });
});

// get session events (for AdminDashboard modal)
app.get("/api/sessions/:sessionId/events", (req, res) => {
  const { sessionId } = req.params;
  const sess = SESSIONS[sessionId];
  if (!sess) {
    return res
      .status(404)
      .json({ success: false, message: "Session not found" });
  }
  res.json({ success: true, events: sess.events || [] });
});

// SSE live event stream
app.get("/api/events/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  sseClients.add(res);
  console.log("SSE client connected, total:", sseClients.size);

  res.write(
    `data: ${JSON.stringify({ type: "hello", ts: Date.now() })}\n\n`
  );

  req.on("close", () => {
    sseClients.delete(res);
    console.log("SSE client disconnected, total:", sseClients.size);
  });
});

// ─────────────────────────────────────
// Exam Management API
// ─────────────────────────────────────

// Create exam (admin)
app.post("/api/exams", authMiddleware, async (req, res) => {
  try {
    const { title, description, durationMinutes, passingMarks } = req.body;
    if (!title) {
      return res
        .status(400)
        .json({ success: false, message: "Title required" });
    }

    const linkCode = uuidv4().split("-")[0];
    const exam = await Exam.create({
      title,
      description,
      durationMinutes: durationMinutes || 30,
      passingMarks: passingMarks || 0,
      totalQuestions: 0,
      linkCode,
      questions: [],
    });

    res.json({ success: true, exam });
  } catch (err) {
    console.error("POST /api/exams error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// Delete an exam session (admin)
app.delete("/api/exam-sessions/:id", authMiddleware, async (req, res) => {
  try {
    await ExamSession.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/exam-sessions/:id error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// List exams (admin)
app.get("/api/exams", authMiddleware, async (req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    res.json({ success: true, exams });
  } catch (err) {
    console.error("GET /api/exams error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get single exam by id (admin)
app.get("/api/exams/:id", authMiddleware, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Exam not found" });
    }
    res.json({ success: true, exam });
  } catch (err) {
    console.error("GET /api/exams/:id error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔴 Delete exam (admin)
app.delete("/api/exams/:id", authMiddleware, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);

    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Exam not found" });
    }

    // Optional: also delete related ExamSession documents if you want.
    // await ExamSession.deleteMany({ examId: exam._id });

    return res.json({
      success: true,
      message: "Exam deleted",
    });
  } catch (err) {
    console.error("DELETE /api/exams/:id error", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error deleting exam" });
  }
});

// Update questions for an exam (admin)
app.put("/api/exams/:id/questions", authMiddleware, async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        message: "questions must be an array",
      });
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Exam not found" });
    }

    exam.questions = questions;
    exam.totalQuestions = questions.length;
    await exam.save();

    res.json({ success: true, exam });
  } catch (err) {
    console.error("PUT /api/exams/:id/questions error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get exam by linkCode (student)
app.get("/api/exams/link/:code", async (req, res) => {
  try {
    const exam = await Exam.findOne({ linkCode: req.params.code });
    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Exam not found" });
    }
    res.json({ success: true, exam });
  } catch (err) {
    console.error("GET /api/exams/link/:code error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Start exam session (student clicks "Start Test")
app.post("/api/exams/:id/sessions", async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Exam not found" });
    }

    const { studentName, studentEmail, proctorSessionId } = req.body;
    if (!studentName || !studentEmail) {
      return res.status(400).json({
        success: false,
        message: "studentName and studentEmail are required",
      });
    }

    const session = await ExamSession.create({
      examId: exam._id,
      studentName,
      studentEmail,
      proctorSessionId: proctorSessionId || null,
      status: "in-progress",
    });

    res.json({ success: true, session });
  } catch (err) {
    console.error("POST /api/exams/:id/sessions error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Complete exam session (student finishes or timer ends)
app.post("/api/exam-sessions/:id/complete", async (req, res) => {
  try {
    const session = await ExamSession.findById(req.params.id);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    const { responses, score, autoSubmitted, completedAt } = req.body;

    if (responses) session.responses = responses;
    if (typeof score === "number") session.score = score;

    session.completedAt = completedAt ? new Date(completedAt) : new Date();
    session.autoSubmitted = !!autoSubmitted;
    session.status = "completed";

    await session.save();

    res.json({ success: true, session });
  } catch (err) {
    console.error("POST /api/exam-sessions/:id/complete error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// List exam sessions for admin (optional)
app.get("/api/exam-sessions", authMiddleware, async (req, res) => {
  try {
    const sessions = await ExamSession.find()
      .sort({ createdAt: -1 })
      .populate("examId");
    res.json({ success: true, sessions });
  } catch (err) {
    console.error("GET /api/exam-sessions error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// Get a single exam session (admin view result)
app.get("/api/exam-sessions/:id", authMiddleware, async (req, res) => {
  try {
    const session = await ExamSession.findById(req.params.id).populate("examId");
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }
    res.json({ success: true, session });
  } catch (err) {
    console.error("GET /api/exam-sessions/:id error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ─────────────────────────────────────
// Send exam invite to student (email)
// ─────────────────────────────────────
app.post("/api/exams/:id/send-invite", authMiddleware, async (req, res) => {
  try {
    const { studentEmail, studentName } = req.body;
    if (!studentEmail) {
      return res.status(400).json({
        success: false,
        message: "studentEmail required",
      });
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Exam not found" });
    }
    if (!exam.linkCode) {
      return res
        .status(400)
        .json({ success: false, message: "Exam has no linkCode" });
    }

   const frontendBase = process.env.FRONTEND_URL || "https://ai-proctor.netlify.app";
const examUrl = `${frontendBase}/exam/${exam.linkCode}`;

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: studentEmail,
      subject: `Exam link for ${exam.title}`,
      text: `Hi ${studentName || "Student"},\n\nYou have been invited to take the exam "${exam.title}".\n\nExam link: ${examUrl}\n\nPlease open this link in Chrome with camera and microphone enabled.\n\nBest of luck!`,
    });

    res.json({ success: true, message: "Invite email sent" });
  } catch (err) {
    console.error("send-invite error", err);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

// ─────────────────────────────────────
// Start server
// ─────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
