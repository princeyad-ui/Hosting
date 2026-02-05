// src/pages/AdminSessionResult.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./AdminSessionResult.css";

const SERVER = "https://ai-proctor-2.onrender.com";

export default function AdminSessionResult() {
  const { sessionId } = useParams(); // /admin/result/:sessionId
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);

  useEffect(() => {
    async function loadSession() {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        if (!token) {
          setError("Not logged in as admin");
          navigate("/login");
          return;
        }

        const res = await fetch(`${SERVER}/api/exam-sessions/${sessionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Session not found");
        }

        setSession(data.session);
      } catch (err) {
        console.error("loadSession error", err);
        setError(err.message || "Failed to load session");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [sessionId, navigate]);

  function handleDownload() {
    if (!session) return;

    const exam = session.examId || {};
    const totalQuestions =
      exam.totalQuestions ||
      (session.responses ? Object.keys(session.responses).length : 0);

    const passed =
      typeof exam.passingMarks === "number"
        ? session.score >= exam.passingMarks
        : null;

    const lines = [
      `Exam Result`,
      `---------------------------`,
      `Student: ${session.studentName} <${session.studentEmail}>`,
      `Exam: ${exam.title || "Unknown exam"}`,
      ``,
      `Score: ${session.score} / ${totalQuestions || "-"}`,
      typeof exam.passingMarks === "number"
        ? `Passing Marks: ${exam.passingMarks}`
        : `Passing Marks: -`,
      passed === null ? "" : `Status: ${passed ? "PASS" : "FAIL"}`,
      ``,
      `Started At: ${
        session.startedAt ? new Date(session.startedAt).toLocaleString() : "-"
      }`,
      `Completed At: ${
        session.completedAt
          ? new Date(session.completedAt).toLocaleString()
          : "-"
      }`,
      `Auto Submitted: ${session.autoSubmitted ? "Yes" : "No"}`,
    ].join("\n");

    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = session.studentName?.replace(/\s+/g, "_") || "student";
    const safeExam = exam.title?.replace(/\s+/g, "_") || "exam";
    a.href = url;
    a.download = `${safeName}_${safeExam}_result.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="asr-page">
        <div className="asr-card">Loading result…</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="asr-page">
        <div className="asr-card">
          <h2>Exam Result</h2>
          <p style={{ color: "#b91c1c", marginBottom: 16 }}>
            {error || "Result not found"}
          </p>
          <button className="asr-btn" onClick={() => navigate("/profile")}>
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  const exam = session.examId || {};
  const totalQuestions =
    exam.totalQuestions ||
    (session.responses ? Object.keys(session.responses).length : 0);

  const passed =
    typeof exam.passingMarks === "number"
      ? session.score >= exam.passingMarks
      : null;

  return (
    <div className="asr-page">
      <div className="asr-card">
        <div className="asr-card-header">
          <div>
            <h1 className="asr-title">Exam Result</h1>
            <div className="asr-subtitle">
              Detailed result for this student attempt.
            </div>
          </div>
          <button className="asr-btn ghost" onClick={() => navigate("/profile")}>
            Back to Profile
          </button>
        </div>

        <div className="asr-grid">
          <div className="asr-block">
            <div className="asr-label">Student</div>
            <div className="asr-main-text">{session.studentName}</div>
            <div className="asr-muted">{session.studentEmail}</div>
          </div>

          <div className="asr-block">
            <div className="asr-label">Exam</div>
            <div className="asr-main-text">{exam.title || "Unknown exam"}</div>
            {exam.description && (
              <div className="asr-muted">{exam.description}</div>
            )}
          </div>

          <div className="asr-block center">
            <div className="asr-label">Score</div>
            <div className="asr-score">
              {session.score} / {totalQuestions || "-"}
            </div>
            {typeof exam.passingMarks === "number" && (
              <div className="asr-muted">
                Passing Marks: {exam.passingMarks}
              </div>
            )}
          </div>

          <div className="asr-block center">
            <div className="asr-label">Status</div>
            {passed === null ? (
              <span className="asr-pill neutral">N/A</span>
            ) : passed ? (
              <span className="asr-pill pass">PASS</span>
            ) : (
              <span className="asr-pill fail">FAIL</span>
            )}
          </div>
        </div>

        <div className="asr-times">
          <div>
            <span className="asr-label-inline">Started:</span>{" "}
            {session.startedAt
              ? new Date(session.startedAt).toLocaleString()
              : "-"}
          </div>
          <div>
            <span className="asr-label-inline">Submitted:</span>{" "}
            {session.completedAt
              ? new Date(session.completedAt).toLocaleString()
              : "-"}
            {session.autoSubmitted && (
              <span className="asr-chip">Auto-submitted (time over)</span>
            )}
          </div>
        </div>

        <div className="asr-actions">
          <button className="asr-btn primary" onClick={handleDownload}>
            Download Result
          </button>
        </div>
      </div>
    </div>
  );
}
