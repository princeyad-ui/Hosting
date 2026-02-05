import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./StudentEvidence.css";

const SERVER = "https://ai-proctor-2.onrender.com";

export default function StudentEvidence() {
  const { sessionId } = useParams(); // /student-evidence/:sessionId
  console.log("StudentEvidence sessionId =", sessionId);
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // convert backend path / servedPath to full URL
  function evidenceUrl(ev) {
    if (!ev) return null;

    if (ev.servedPath) {
      // server already gave a web path like /evidence/...
      return ev.servedPath.startsWith("http")
        ? ev.servedPath
        : `${SERVER}${ev.servedPath}`;
    }

    if (ev.path) {
      const norm = ev.path.replace(/\\/g, "/");
      const idx = norm.indexOf("/evidence/");
      if (idx >= 0) {
        const rel = norm.substring(idx); // "/evidence/..."
        return `${SERVER}${rel}`;
      }
    }

    return null;
  }

  useEffect(() => {
    async function loadSession() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${SERVER}/api/report/${sessionId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load session");
        }

        setSession(data.session);
      } catch (err) {
        console.error("loadSession error", err);
        setError(err.message || "Error loading session");
      } finally {
        setLoading(false);
      }
    }

    if (sessionId) {
      loadSession();
    } else {
      setError("No sessionId in URL");
      setLoading(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="se-page">
        <div className="se-card">Loading evidence…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="se-page">
        <div className="se-card">
          <div className="se-header-row">
            <h2 className="se-title">Session Evidence</h2>
            <button className="se-btn-secondary" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
          <div className="se-error">{error}</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="se-page">
        <div className="se-card">
          <div className="se-header-row">
            <h2 className="se-title">Session Evidence</h2>
            <button className="se-btn-secondary" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
          <div className="se-error">Session not found.</div>
        </div>
      </div>
    );
  }

  const frames = (session.evidence || []).filter((e) => e.type === "frame");
  const audios = (session.evidence || []).filter((e) => e.type === "audio");
  const events = session.events || [];

  return (
    <div className="se-page">
      <div className="se-card">
        {/* top header */}
        <div className="se-header-row">
          <div>
            <h2 className="se-title">Session Evidence</h2>
            <div className="se-subtitle">
              Session ID:{" "}
              <span className="se-mono">
                {session.sessionId || sessionId}
              </span>
            </div>
          </div>
          <button className="se-btn-secondary" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>

        {/* summary row */}
        <div className="se-summary">
          <div>
            <div className="se-summary-label">Started</div>
            <div className="se-summary-value">
              {session.startedAt
                ? new Date(session.startedAt).toLocaleString()
                : "-"}
            </div>
          </div>
          <div>
            <div className="se-summary-label">Ended</div>
            <div className="se-summary-value">
              {session.endedAt
                ? new Date(session.endedAt).toLocaleString()
                : "Running"}
            </div>
          </div>
          <div>
            <div className="se-summary-label">Total Frames</div>
            <div className="se-summary-value">{frames.length}</div>
          </div>
          <div>
            <div className="se-summary-label">Audio Clips</div>
            <div className="se-summary-value">{audios.length}</div>
          </div>
          <div>
            <div className="se-summary-label">Alerts</div>
            <div className="se-summary-value">
              {events.length} (risk: {session.riskScore ?? 0})
            </div>
          </div>
        </div>

        {/* layout: left=galleries, right=events */}
        <div className="se-layout">
          {/* left side: frames + audio */}
          <div className="se-left">
            <h3 className="se-section-title">Captured Snapshots</h3>
            {frames.length === 0 ? (
              <div className="se-muted">No frames captured for this session.</div>
            ) : (
              <div className="se-grid">
                {frames.map((f, idx) => {
                  const url = evidenceUrl(f);
                  if (!url) return null;
                  return (
                    <div key={idx} className="se-frame-card">
                      <img
                        src={url}
                        alt={`Frame ${idx + 1}`}
                        className="se-frame-img"
                        onClick={() => window.open(url, "_blank")}
                      />
                      <div className="se-frame-meta">
                        <div>Frame {idx + 1}</div>
                        <div className="se-frame-time">
                          {f.timestamp
                            ? new Date(f.timestamp).toLocaleTimeString()
                            : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <h3 className="se-section-title" style={{ marginTop: 16 }}>
              Audio Evidence
            </h3>
            {audios.length === 0 ? (
              <div className="se-muted">
                No audio clips were saved for this session.
              </div>
            ) : (
              <div className="se-audio-list">
                {audios.map((a, idx) => {
                  const url = evidenceUrl(a);
                  if (!url) return null;
                  return (
                    <div key={idx} className="se-audio-item">
                      <div className="se-audio-label">
                        Audio {idx + 1} –{" "}
                        {a.timestamp
                          ? new Date(a.timestamp).toLocaleTimeString()
                          : ""}
                      </div>
                      <audio controls src={url} className="se-audio-player" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* right side: events */}
          <div className="se-right">
            <h3 className="se-section-title">AI Alerts Timeline</h3>
            <div className="se-events-scroll">
              {events.length === 0 ? (
                <div className="se-muted">No alerts recorded.</div>
              ) : (
                <ul className="se-events-list">
                  {events.map((ev) => (
                    <li key={ev.id || ev.timestamp} className="se-event-row">
                      <div className="se-event-top">
                        <span className={`se-pill sev-${ev.severity || "low"}`}>
                          {ev.type}
                        </span>
                        <span className="se-event-time">
                          {ev.timestamp
                            ? new Date(ev.timestamp).toLocaleString()
                            : ""}
                        </span>
                      </div>
                      <div className="se-event-details">
                        {ev.details || "(no details)"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
