// src/pages/AdminResultsList.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AdminResultList.css";

const SERVER = "https://ai-proctor-2.onrender.com";

export default function AdminResultsList() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function loadSessions() {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const res = await fetch(`${SERVER}/api/exam-sessions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load results");
        }

        setSessions(data.sessions || []);
      } catch (err) {
        console.error("loadSessions error", err);
        setError(err.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, [navigate]);

  function getStatus(session) {
    const exam = session.examId || {};
    const score = session.score ?? 0;
    const passingMarks =
      typeof exam.passingMarks === "number" ? exam.passingMarks : null;

    if (passingMarks == null) {
      return { text: "N/A", className: "status-pill neutral" };
    }
    if (score >= passingMarks) {
      return { text: "PASS", className: "status-pill pass" };
    }
    return { text: "FAIL", className: "status-pill fail" };
  }

  // delete one student's exam result
  async function handleDeleteResult(id) {
    const ok = window.confirm(
      "Are you sure you want to delete this student's result?"
    );
    if (!ok) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${SERVER}/api/exam-sessions/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete result");
      }

      // remove from list
      setSessions((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      console.error("delete result error", err);
      alert(err.message || "Could not delete result");
    }
  }

  if (loading) {
    return (
      <div className="results-page">
        <div className="results-card">Loading exam results…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-page">
        <div className="results-card">
          <h2>Exam Results</h2>
          <p className="results-error">{error}</p>
          <button
            className="btn-secondary"
            onClick={() => navigate("/profile")}
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="results-page">
      <div className="results-card">
        <div className="results-header">
          <h1>Exam Results</h1>
          <button
            className="btn-secondary"
            onClick={() => navigate("/profile")}
          >
            Back to Profile
          </button>
        </div>

        {sessions.length === 0 ? (
          <p className="muted">No exam attempts found yet.</p>
        ) : (
          <div className="results-table">
            <div className="results-row head">
              <div>Student</div>
              <div>Exam</div>
              <div>Score</div>
              <div>Status</div>
              <div>Submitted At</div>
              <div></div>
            </div>

            {sessions.map((s) => {
              const exam = s.examId || {};
              const score = s.score ?? 0;
              const total = exam.totalQuestions ?? "-";
              const status = getStatus(s);

              return (
                <div key={s._id} className="results-row">
                  <div className="cell-main">
                    <div className="cell-title">{s.studentName}</div>
                    <div className="cell-sub">{s.studentEmail}</div>
                  </div>

                  <div className="cell-main">
                    <div className="cell-title">{exam.title || "—"}</div>
                  </div>

                  <div>
                    {score}
                    {total !== "-" ? ` / ${total}` : ""}
                  </div>

                  <div>
                    <span className={status.className}>{status.text}</span>
                  </div>

                  <div className="cell-sub">
                    {s.completedAt
                      ? new Date(s.completedAt).toLocaleString()
                      : "—"}
                  </div>

                  <div>
                    {/* actions on right side */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      {/* existing exam result page */}
                      <Link to={`/admin/result/${s._id}`} className="btn-link">
                        View Result
                      </Link>

                  {/* NEW: Proctor Report Button */}
<button
  type="button"
  className="btn-link"
  onClick={() => navigate(`/admindashboard?sessionId=${s.proctorSessionId || s._id}`)}
>
  Proctor Report
</button>

                      {/* NEW: delete result */}
                      <button
                        type="button"
                        className="btn-link"
                        style={{ color: "#dc2626" }}
                        onClick={() => handleDeleteResult(s._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="results-footer-note">
          Only logged-in admins can view these results. Students do not have
          access to this page.
        </div>
      </div>
    </div>
  );
}
