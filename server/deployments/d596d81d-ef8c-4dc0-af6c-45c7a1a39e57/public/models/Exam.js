// models/Exam.js
const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctIndex: { type: Number, required: true }, // 0-based index
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

module.exports = mongoose.model("Exam", ExamSchema);
