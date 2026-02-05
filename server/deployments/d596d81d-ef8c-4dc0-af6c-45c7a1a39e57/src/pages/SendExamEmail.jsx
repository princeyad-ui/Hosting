// src/pages/SendExamEmail.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import emailjs from "emailjs-com";
import "./AdminExams.css";
import "./SendExamEmail.css";
import bg from "../assets/bg.png"; // ✅ added

const SERVICE_ID = "service_3hq7cc6";
const TEMPLATE_ID = "template_uwkztub";
const PUBLIC_KEY = "GPFs2nDjsWbx6yBMJ";

export default function SendExamEmail() {
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [examTitle, setExamTitle] = useState("");
  const [examLink, setExamLink] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  async function handleSend(e) {
    e.preventDefault();
    setError("");

    if (!studentEmail.trim()) {
      setError("Student email is required");
      return;
    }
    if (!examLink.trim()) {
      setError("Exam link is required");
      return;
    }

    try {
      setSending(true);

      const params = {
        student_name: studentName || "Student",
        student_email: studentEmail,
        exam_title: examTitle || "Your exam",
        exam_link: examLink,
        extra_message: message,
      };

      await emailjs.send(SERVICE_ID, TEMPLATE_ID, params, PUBLIC_KEY);

      alert("Email sent successfully!");

      setStudentName("");
      setStudentEmail("");
      setExamTitle("");
      setExamLink("");
      setMessage("");
    } catch (err) {
      console.error("EmailJS error", err);
      setError("Failed to send email. Check EmailJS credentials.");
    } finally {
      setSending(false);
    }
  }

  return (
    /* ✅ FULL PAGE BACKGROUND */
    <div
      className="send-email-page"
    style={{
                        minHeight: "100vh",
                        backgroundImage: `url(${bg})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }}
    >
      <button className="secondary-btn back-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <h1 className="admin-exams-title">Send Exam Email</h1>

      {error && <div className="admin-error center-error">{error}</div>}

      <div className="panel send-email-panel">
        <h2 className="panel-title">Email Details</h2>

        <form className="form-vertical" onSubmit={handleSend}>
          <label className="field-label">Student Name (optional)</label>
          <input
            className="input-field"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
          />

          <label className="field-label">Student Email *</label>
          <input
            className="input-field"
            type="email"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
          />

          <label className="field-label">Exam Title (optional)</label>
          <input
            className="input-field"
            value={examTitle}
            onChange={(e) => setExamTitle(e.target.value)}
          />

          <label className="field-label">Exam Link *</label>
          <input
            className="input-field"
            value={examLink}
            onChange={(e) => setExamLink(e.target.value)}
          />

          <label className="field-label">Extra Message (optional)</label>
          <textarea
            className="textarea-field"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <button className="primary-btn full" disabled={sending}>
            {sending ? "Sending..." : "Send Email"}
          </button>
        </form>
      </div>
    </div>
  );
}
