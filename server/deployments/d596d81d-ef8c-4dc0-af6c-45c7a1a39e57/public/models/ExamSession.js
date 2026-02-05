// models/ExamSession.js
const mongoose = require("mongoose");

const ExamSessionSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    studentName: { type: String, required: true },
    studentEmail: { type: String, required: true },
    proctorSessionId: { type: String }, // optional: link to proctor session
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    autoSubmitted: { type: Boolean, default: false },
    responses: { type: Object, default: {} }, // { [questionIndex]: answer }
    score: { type: Number, default: 0 },
    status: { type: String, default: "in-progress" }, // in-progress/completed
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExamSession", ExamSessionSchema);
