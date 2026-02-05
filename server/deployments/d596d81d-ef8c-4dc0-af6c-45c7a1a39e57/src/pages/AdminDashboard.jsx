import React, { useEffect, useState, useRef ,  } from "react";
import "./AdminDashboard.css";
import { useNavigate } from "react-router-dom";

const SERVER = "https://ai-proctor-2.onrender.com";

/**
 * AdminDashboard
 * - Lists sessions
 * - Start / Stop session
 * - Live alerts via SSE
 * - View session details (frames, events, audio)
 * - Download report link (uses /api/report/:sessionId)
 */

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all / active / ended
  const [liveAlerts, setLiveAlerts] = useState([]); // realtime feed
  const evtSourceRef = useRef(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const params = new URLSearchParams(window.location.search);
const forcedSessionId = params.get("sessionId");


  // fetch sessions
  async function loadSessions() {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/api/sessions`);
      const data = await res.json();
      if (data && data.success) setSessions(data.sessions || []);
      else if (Array.isArray(data)) setSessions(data);
      else setSessions([]);
    } catch (err) {
      console.error("loadSessions error", err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

useEffect(() => {
  if (forcedSessionId) {
    fetch(`${SERVER}/api/report/${forcedSessionId}`)
      .then(res => res.json())
      .then(data => {
        setSelectedSession(data.session || null);
        setSelectedEvents(data.events || []);
      })
      .catch(err => console.error("Error loading forced session:", err));
  }
}, [forcedSessionId]);

  useEffect(() => {
    loadSessions();

    // SSE for live events (if server supports /api/events/stream)
    try {
      const es = new EventSource(`${SERVER}/api/events/stream`);
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          setLiveAlerts(prev => [payload, ...prev].slice(0, 80));
          loadSessions(); // refresh sessions
        } catch (err) {
          console.error("SSE parse", err);
        }
      };
      es.onerror = (err) => {
        console.warn("SSE error", err);
        es.close();
      };
      evtSourceRef.current = es;
    } catch (err) {
      console.warn("SSE not supported", err);
    }

    return () => {
      if (evtSourceRef.current) evtSourceRef.current.close();
    };
  }, []);

  // start new session
  async function handleStartSession(studentId = null) {
    try {
      const res = await fetch(`${SERVER}/api/start-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentId ? { studentId } : {})
      });
      const j = await res.json();
      if (j && j.success) {
        await loadSessions();
      } else {
        console.warn("start session failed", j);
      }
    } catch (err) {
      console.error("startSession error", err);
    }
  }

  // stop session
  async function handleStopSession(sessionId) {
    try {
      const res = await fetch(`${SERVER}/api/end-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      const j = await res.json();
      if (j && j.success) {
        await loadSessions();
      } else {
        console.warn("stop session failed", j);
      }
    } catch (err) {
      console.error("stopSession error", err);
    }
  }

  // open session details modal
  async function openSession(session) {
    setSelectedSession(session);
    try {
      const res = await fetch(`${SERVER}/api/sessions/${session.sessionId}/events`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.events)) setSelectedEvents(data.events);
        else if (Array.isArray(data)) setSelectedEvents(data);
        else setSelectedEvents(session.events || []);
      } else {
        setSelectedEvents(session.events || []);
      }
    } catch (err) {
      console.error("fetch session events", err);
      setSelectedEvents(session.events || []);
    }
  }

  function closeModal() {
    setSelectedSession(null);
    setSelectedEvents([]);
  }

  // helper: build image URL from evidence object
  function servedUrl(ev) {
    if (!ev) return null;

    // 1) preferred: evidenceUrl from backend (e.g. "/evidence/<session>/<file>")
    if (ev.evidenceUrl) {
      return `${SERVER}${ev.evidenceUrl}`;
    }

    // 2) servedPath if server sends one
    if (ev.servedPath) {
      if (ev.servedPath.startsWith("http")) return ev.servedPath;
      return `${SERVER}${ev.servedPath}`;
    }

    // 3) fallback: derive from filesystem path (handles Windows backslashes)
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

  // filtered & paginated sessions
  const filtered = sessions.filter(s => {
    if (filterStatus === "active" && s.endedAt) return false;
    if (filterStatus === "ended" && !s.endedAt) return false;
    if (filterText) {
      const t = filterText.toLowerCase();
      return (s.sessionId && s.sessionId.toLowerCase().includes(t)) ||
             (s.events && s.events.some(e => (e.type || "").toLowerCase().includes(t))) ||
             (s.riskScore && String(s.riskScore).includes(t));
    }
    return true;
  });

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSessions = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="admin-dashboard container">
      <div className="admin-header">
        <h1>Admin Dashboard — Proctor</h1>
        <div className="admin-controls">
          <button className="btn" onClick={loadSessions} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button className="btn primary" onClick={() => navigate("/profile")}>
            Profile
          </button>
        </div>
      </div>

      <div className="admin-filters">
        <input
          className="search"
          placeholder="Search session id / event / risk..."
          value={filterText}
          onChange={e => { setFilterText(e.target.value); setPage(1); }}
        />
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="ended">Ended</option>
        </select>
      </div>

      <div className="layout">
        {/* LEFT - sessions list */}
        <div className="left">
          <div className="sessions-grid">
            {pageSessions.length === 0 ? (
              <div className="muted">No sessions</div>
            ) : (
              pageSessions.map(sess => {
                const frames = (sess.evidence || []).filter(ev => ev.type === "frame");
                const latestFrame = frames[frames.length - 1];
                const thumbnail = latestFrame ? servedUrl(latestFrame) : null;

                return (
                  <div className="session-card" key={sess.sessionId}>
                    <div className="card-top">
                    <div className="session-id">
  {sess.studentName
    ? `${sess.studentName} (${sess.sessionId})`
    : sess.sessionId}
</div>
<div className="risk">
  Risk: <strong>{sess.riskScore ?? 0}</strong>
</div>

                    </div>

                    <div className="meta">
                      <div>Started: {sess.startedAt ? new Date(sess.startedAt).toLocaleString() : "-"}</div>
                      <div>Alerts: {(sess.events || []).length}</div>
                      <div>Status: {sess.endedAt ? "Ended" : "Running"}</div>
                    </div>

                    <div className="thumb-row">
                      {thumbnail ? (
                        <img src={thumbnail} alt="thumb" className="thumb" />
                      ) : (
                        <div className="no-thumb">No image</div>
                      )}

                      <div className="card-actions">
                        <button className="link-btn" onClick={() => openSession(sess)}>View</button>
                        {!sess.endedAt ? (
                          <button className="btn warn" onClick={() => handleStopSession(sess.sessionId)}>
                            Stop
                          </button>
                        ) : (
                          <button className="btn1" onClick={() => handleStartSession(null)}>
                            Restart
                          </button>
                        )}
                        <a
                          className="link-btn"
                          href={`${SERVER}/api/report/${sess.sessionId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Report
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pagination">
            <button
              className="btn1"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <div>Page {page} / {pages}</div>
            <button
              className="btn1"
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page >= pages}
            >
              Next
            </button>
          </div>
        </div>

        {/* RIGHT - live alerts */}
        <div className="right">
          <h3>Live Alerts</h3>
          <div className="live-list">
            {liveAlerts.length === 0 ? (
              <div className="muted">No live alerts</div>
            ) : (
              liveAlerts.map((ev, idx) => (
                <div key={idx} className="live-item">
                  <div className="ev-left">
                    <div className="ev-type">{ev.type}</div>
                    <div className="ev-details">{ev.details}</div>
                  </div>
                  <div className="ev-right">
                    <div className="ev-session">{ev.sessionId}</div>
                    <div className="ev-time">
                      {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ""}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Session details modal */}
      {selectedSession && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-left">
              {selectedSession.evidence && selectedSession.evidence.length > 0 ? (
                <img
                  src={servedUrl(selectedSession.evidence[selectedSession.evidence.length - 1])}
                  alt="frame"
                  className="modal-img"
                />
              ) : (
                <div className="no-image-big">No frames</div>
              )}
            </div>

            <div className="modal-right">
             <h3>
  Session:{" "}
  {selectedSession.studentName
    ? `${selectedSession.studentName} (${selectedSession.sessionId})`
    : selectedSession.sessionId}
</h3>

{selectedSession.studentEmail && (
  <div>Student Email: {selectedSession.studentEmail}</div>
)}

<div>
  Started:{" "}
  {selectedSession.startedAt
    ? new Date(selectedSession.startedAt).toLocaleString()
    : "-"}
</div>

{selectedSession.endedAt && (
  <div>
    Ended: {new Date(selectedSession.endedAt).toLocaleString()}
  </div>
)}

              

              <div style={{ marginTop: 8 }}>
                <a
                  className="link-btn"
                  href={`${SERVER}/api/report/${selectedSession.sessionId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Raw Report
                </a>
                <button
                  className="btn1"
                  onClick={() => downloadSessionZip(selectedSession.sessionId)}
                  style={{ marginLeft: 8 }}
                >
                  Download ZIP
                </button>
              </div>

              <h4 style={{ marginTop: 12 }}>Events</h4>
              <div className="events-scroll">
                {selectedEvents.length === 0 ? (
                  <div className="muted">No events</div>
                ) : (
                  <ul className="events-list">
                    {selectedEvents.map(ev => (
                      <li key={ev.id ?? ev.timestamp}>
                        <div className="ev-type">
                          {ev.type} <span className="ev-severity">({ev.severity})</span>
                        </div>
                        <div className="ev-details">{ev.details}</div>
                        <div className="ev-time">
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ""}
                        </div>
                        {ev.audioPath && (
                          <audio controls src={ev.audioPath} style={{ marginTop: 6 }} />
                        )}
                        {ev.thumbnailUrl && (
                          <img
                            src={ev.thumbnailUrl}
                            alt="thumb"
                            style={{ width: 120, marginTop: 6 }}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end"
                }}
              >
                <button className="btn1" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Download evidence zip helper (if server implements /api/sessions/:id/zip)
  async function downloadSessionZip(sessionId) {
    try {
      const res = await fetch(`${SERVER}/api/sessions/${sessionId}/zip`);
      if (!res.ok) {
        alert("Zip download not available on server.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `session_${sessionId}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("downloadSessionZip error", err);
      alert("Failed to download ZIP");
    }
  }
}
