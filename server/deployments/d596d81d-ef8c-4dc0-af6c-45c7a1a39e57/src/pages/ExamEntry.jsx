// src/pages/ExamEntry.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import "./ExamEntry.css";
import StudentProctor from "./StudentProctor";
import bg from "../assets/bg.png";


const API_BASE = "https://ai-proctor-2.onrender.com";
// 🔽 new: use a reliable 1MB test file for internet speed
const SPEED_TEST_URL = "https://speed.hetzner.de/1MB.bin";

export default function ExamEntry() {
  const navigate = useNavigate();
  const { code } = useParams(); // /exam/:code
  

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(1); // 1 details, 2 system, 3 instructions, 4 test
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");

  // system check
  const [cameraOk, setCameraOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [internetOk, setInternetOk] = useState(false);
  const [micChecking, setMicChecking] = useState(false);
  const [micStatusText, setMicStatusText] = useState(
    "Please speak normally for a few seconds…"
  );
  const [internetChecking, setInternetChecking] = useState(false);
  const [internetSpeedMbps, setInternetSpeedMbps] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micCheckAnimRef = useRef(null);
  const micCheckStartTimeRef = useRef(0);

  // ⬇ screen share
  const screenStreamRef = useRef(null);
  const [screenShared, setScreenShared] = useState(false);
  const [screenShareError, setScreenShareError] = useState("");

  // exam session
  const [examSession, setExamSession] = useState(null);

  // questions + answers + timer
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeftSec, setTimeLeftSec] = useState(null);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef(null);

  // ───────────── 1. Load exam ─────────────
  useEffect(() => {
    async function loadExam() {
      try {
        const res = await fetch(`${API_BASE}/api/exams/link/${code}`);
        const data = await res.json();
        if (data.success) {
          setExam(data.exam);
        } else {
          alert(data.message || "Exam not found");
        }
      } catch (err) {
        console.error("loadExam error", err);
        alert("Failed to load exam");
      } finally {
        setLoading(false);
      }
    }
    loadExam();
  }, [code]);

  // ───────────── 2. System checks ─────────────
  useEffect(() => {
    if (step === 2) {
      runSystemChecks();
    } else {
      cleanupMedia();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // make sure camera/mic are stopped when component unmounts
  useEffect(() => {
    return () => {
      cleanupMedia();
    };
  }, []);

  function cleanupMedia() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (micCheckAnimRef.current) {
      cancelAnimationFrame(micCheckAnimRef.current);
      micCheckAnimRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    // ⬇ stop screen share as well
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setScreenShared(false);
    }
  }

  async function runSystemChecks() {
    setCameraOk(false);
    setMicOk(false);
    setInternetOk(false);
    setInternetSpeedMbps(null);
    setMicStatusText("Please speak normally for a few seconds…");

    // camera + mic
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraOk(true);
      startMicMonitor(stream);
    } catch (err) {
      console.error("camera/mic error", err);
      alert(
        "Could not access camera or microphone. Please allow permissions and refresh."
      );
    }

    // internet
    testInternetSpeed();
  }

  function startMicMonitor(stream) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        setMicStatusText(
          "Browser does not support audio analysis. Assuming mic is OK."
        );
        setMicOk(true);
        return;
      }

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      micCheckStartTimeRef.current = performance.now();
      setMicChecking(true);
      setMicStatusText("Speak normally for 3–5 seconds…");

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        analyser.getByteTimeDomainData(dataArray);
        let maxDeviation = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const deviation = Math.abs(dataArray[i] - 128);
          if (deviation > maxDeviation) maxDeviation = deviation;
        }
        const elapsed = performance.now() - micCheckStartTimeRef.current;

        if (maxDeviation > 20) {
          setMicOk(true);
          setMicChecking(false);
          setMicStatusText("We detected your voice. Microphone looks good.");
          return;
        }

        if (elapsed > 7000) {
          setMicChecking(false);
          if (!micOk) {
            setMicStatusText(
              "We could not clearly detect audio. Please check your microphone."
            );
          }
          return;
        }

        micCheckAnimRef.current = requestAnimationFrame(loop);
      };

      micCheckAnimRef.current = requestAnimationFrame(loop);
    } catch (err) {
      console.error("mic monitor error", err);
      setMicChecking(false);
      setMicStatusText(
        "Could not analyse microphone. Please ensure it is enabled."
      );
    }
  }

  // 🔽 UPDATED INTERNET SPEED TEST (only change)
  async function testInternetSpeed() {
    setInternetChecking(true);
    setInternetSpeedMbps(null);
    try {
      const start = performance.now();
      const res = await fetch(`${SPEED_TEST_URL}?cb=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Speed test download failed");
      const blob = await res.blob();
      const durationSec = (performance.now() - start) / 1000;
      const sizeBytes = blob.size || 0;

      if (sizeBytes > 0 && durationSec > 0) {
        const bits = sizeBytes * 8;
        const mbps = bits / (durationSec * 1024 * 1024);
        setInternetSpeedMbps(mbps);
        // slightly relaxed threshold so normal connections pass
        setInternetOk(mbps >= 0.1);
      } else {
        // if something weird happens, don't block the user
        setInternetOk(true);
      }
    } catch (err) {
      console.error("internet check error", err);
      // network/CDN error – treat as warning but let user continue
      setInternetOk(true);
    } finally {
      setInternetChecking(false);
    }
  }

  // ⬇ screen share: ask for full-screen share before exam
  async function handleStartScreenShare() {
    try {
      setScreenShareError("");
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false,
      });
      screenStreamRef.current = stream;
      setScreenShared(true);

      // if user stops sharing manually, update state
      const [track] = stream.getVideoTracks();
      if (track) {
        track.addEventListener("ended", () => {
          screenStreamRef.current = null;
          setScreenShared(false);
        });
      }
    } catch (err) {
      console.error("screen share error", err);
      setScreenShared(false);
      setScreenShareError(
        "Screen sharing was cancelled or blocked. Please allow it to continue."
      );
    }
  }

  // ───────────── 3. Step navigation ─────────────
  function handleDetailsNext() {
    if (!studentName || !studentEmail) {
      alert("Please enter your name and email");
      return;
    }
    localStorage.setItem("studentName", studentName);
    localStorage.setItem("studentEmail", studentEmail);
    setStep(2);
  }

  // ───────────── 4. Start exam session ─────────────
  async function handleStartTest() {
    try {
      const res = await fetch(`${API_BASE}/api/exams/${exam._id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          studentEmail,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Failed to start exam session");
        return;
      }

      setExamSession(data.session);
      setStep(4);
      setCurrentIndex(0);
      setAnswers({});
      setFinished(false);

      const durationMin =
        exam.durationMinutes && exam.durationMinutes > 0
          ? exam.durationMinutes
          : 30;
      setTimeLeftSec(durationMin * 60);
    } catch (err) {
      console.error("start exam session error", err);
      alert("Error starting exam");
    }
  }

  // ───────────── 5. Timer ─────────────
  useEffect(() => {
    if (!examSession || step !== 4 || finished) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (timeLeftSec == null) return;

    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setTimeLeftSec((prev) => {
          if (prev == null) return prev;
          if (prev <= 1) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            handleFinishTest(true); // auto submit
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examSession, step, finished, timeLeftSec]);

  // ───────────── 6. Questions / answers ─────────────
  const questions =
    exam && Array.isArray(exam.questions) && exam.questions.length > 0
      ? exam.questions
      : [
          {
            text: "Sample question 1 (add real questions in admin panel).",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctIndex: 1,
          },
          {
            text: "Sample question 2.",
            options: ["True", "False"],
            correctIndex: 0,
          },
        ];

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex] || questions[0];

  function handleAnswerChange(value) {
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: value,
    }));
  }

  function goPrev() {
    setCurrentIndex((idx) => Math.max(0, idx - 1));
  }

  function goNext() {
    setCurrentIndex((idx) => Math.min(totalQuestions - 1, idx + 1));
  }

  // answered count for progress bar
  const answeredCount = questions.reduce((count, q, idx) => {
    const val = answers[idx];
    if (Array.isArray(q.options) && q.options.length > 0) {
      if (typeof val === "number") return count + 1;
    } else if (val && String(val).trim() !== "") {
      return count + 1;
    }
    return count;
  }, 0);

  // is current question answered?
  let currentAnswered = false;
  const currentVal = answers[currentIndex];
  if (
    Array.isArray(currentQuestion.options) &&
    currentQuestion.options.length > 0
  ) {
    currentAnswered = typeof currentVal === "number";
  } else {
    currentAnswered = !!(currentVal && String(currentVal).trim() !== "");
  }

  // ───────────── 7. Finish exam ─────────────
  async function handleFinishTest(autoByTimer = false) {
    if (!examSession || finished) return;

    // For manual submit, ask confirmation
    if (!autoByTimer) {
      const ok = window.confirm("Are you sure you want to submit the test?");
      if (!ok) return;
    }

    setFinished(true);
    cleanupMedia(); // ✅ stop system-check camera/mic & screen share

    // simple score using correctIndex
    let score = 0;
    questions.forEach((q, idx) => {
      if (typeof q.correctIndex === "number") {
        if (answers[idx] === q.correctIndex) score++;
      }
    });

    const payload = {
      responses: answers,
      score,
      completedAt: new Date().toISOString(),
      autoSubmitted: autoByTimer,
    };

    try {
      const res = await fetch(
        `${API_BASE}/api/exam-sessions/${examSession._id}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        if (autoByTimer) {
          alert("Time is over. Your test has been auto-submitted.");
        } else {
          alert("Test submitted successfully.");
        }

        const studentNameSafe =
          examSession.studentName || studentName || "Student";
        const examTitleSafe = exam?.title || "Exam";

        navigate(
          `/thankyou?name=${encodeURIComponent(
            studentNameSafe
          )}&exam=${encodeURIComponent(examTitleSafe)}`
        );
      } else {
        alert(
          "Test finished (demo). Backend did not confirm submission (check /api/exam-sessions/:id/complete)."
        );
      }
    } catch (err) {
      console.error("finish test error", err);
      alert("Test finished (demo). Error sending data to server.");
    }
  }

  function formatTime(sec) {
    if (sec == null) return "--:--";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const mm = m < 10 ? `0${m}` : String(m);
    const ss = s < 10 ? `0${s}` : String(s);
    return `${mm}:${ss}`;
  }

  const progressPercent =
    totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  // ───────────── Render ─────────────
 if (loading) return <div className="exam-loading">Loading exam…</div>;
if (!exam) return <div className="exam-loading">Exam not found</div>;


  return (
  <>
  <div
    className="exam-bg"
    style={{
    backgroundImage: `
      linear-gradient(
        rgba(255, 255, 255, 0.6),
        rgba(255, 255, 255, 0.6)
      ),
      url(${bg})
    `,
  }}
  />
  
    <div className="exam-page"
      >
      {/* Top header */}
      <div className="exam-topbar">
        <div>
          <div className="exam-title">{exam.title}</div>
          <div className="exam-candidate">
            {studentName || examSession?.studentName || "Candidate"}
          </div>
        </div>

        {examSession && (
          <div className="exam-topbar-right">
            <div className="exam-question-count">
              Question {currentIndex + 1} of {totalQuestions}
            </div>
            <div className="exam-timer">
              ⏱ Time Left:{" "}
              <strong>{finished ? "00:00" : formatTime(timeLeftSec)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {examSession && (
        <div className="exam-progress">
          <div className="exam-progress-bar">
            <div
              className="exam-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="exam-progress-meta">
            {Math.round(progressPercent)}% Complete
          </div>
        </div>
      )}

      <div className="exam-step-indicator">Step {step} of 4</div>

      {/* STEP 1: Details */}
      {step === 1 && (
        <div className="exam-step-wrapper">
          <div className="exam-step-card exam-step-narrow">
            <h3 className="exam-step-title">Your Details</h3>
            <p className="exam-step-text">
              Please enter your name and email. These will appear in the exam
              report.
            </p>

            <label className="exam-label">Full Name</label>
            <input
              className="exam-input"
              value={studentName}
              onChange={(e) => setStudentName(e.targetValue || e.target.value)}
              placeholder="Enter your full name"
            />

            <label className="exam-label">Email Address</label>
            <input
              className="exam-input"
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="Enter your email"
            />

            <button
              className="exam-btn-primary exam-step-btn"
              onClick={handleDetailsNext}
            >
              Next: System Check
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: System checklist */}
      {step === 2 && (
        <div className="exam-step-wrapper">
          <div className="exam-step-card">
            <h3 className="exam-step-title">System Checklist</h3>
            <p className="exam-step-text">
              We are automatically checking your camera, microphone and
              internet.
            </p>

            <div className="exam-video-wrapper">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="exam-video-preview"
              />
              <div className="exam-video-note">
                Camera preview during check.
              </div>
            </div>

            <ul className="exam-status-list">
              <li>
                <StatusItem
                  label="Camera is enabled and clearly shows my face."
                  ok={cameraOk}
                  checking={!cameraOk}
                />
              </li>
              <li>
                <StatusItem
                  label="Microphone is enabled and working."
                  ok={micOk}
                  checking={micChecking}
                />
                <div className="exam-status-note">{micStatusText}</div>
              </li>
              <li>
                <StatusItem
                  label="Internet connection is stable for the exam duration."
                  ok={internetOk}
                  checking={internetChecking}
                />
                {internetSpeedMbps != null && (
                  <div className="exam-status-note">
                    Measured speed: {internetSpeedMbps.toFixed(2)} Mbps
                  </div>
                )}
              </li>
            </ul>

            <div className="exam-actions-row">
              <button className="exam-btn-ghost" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="exam-btn-secondary" onClick={runSystemChecks}>
                Re-run checks
              </button>
              <button
                className="exam-btn-primary exam-actions-right"
                onClick={() => setStep(3)}
                disabled={!(cameraOk && micOk && internetOk)}
              >
                Continue to Instructions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Instructions + Screen Share */}
      {step === 3 && (
        <div className="exam-step-wrapper">
          <div className="exam-step-card">
            <h3 className="exam-step-title">Exam Instructions</h3>

            <div className="exam-info-block">
              <p>
                <strong>Total Questions:</strong>{" "}
                {exam.totalQuestions != null ? exam.totalQuestions : "-"}
              </p>
              <p>
                <strong>Passing Marks:</strong>{" "}
                {exam.passingMarks != null ? exam.passingMarks : "-"}
              </p>
              <p>
                <strong>Duration:</strong>{" "}
                {exam.durationMinutes != null
                  ? `${exam.durationMinutes} minutes`
                  : "-"}
              </p>
            </div>

            <ul className="exam-instruction-list">
              <li>Do not move out of the camera frame during the exam.</li>
              <li>Do not use mobile phones or extra devices.</li>
              <li>
                Your camera and behavior are monitored using AI proctoring.
              </li>
            </ul>

            {/* ⬇ Screen share section */}
            <div
              className="exam-info-block"
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <p>
                <strong>Screen Sharing:</strong> Please share your{" "}
                <u>entire screen</u> so that your exam activity can be
                monitored. You can still change tabs, but this will be recorded
                by the proctoring system.
              </p>
              <button
                type="button"
                className="exam-btn-secondary"
                onClick={handleStartScreenShare}
              >
                {screenShared ? "Screen Sharing On" : "Share Full Screen"}
              </button>
              <div className="exam-status-note">
                {screenShared
                  ? "✅ Screen sharing is active."
                  : "Screen not shared yet."}
                {screenShareError && (
                  <>
                    <br />
                    <span style={{ color: "#dc2626" }}>{screenShareError}</span>
                  </>
                )}
              </div>
            </div>

            <div className="exam-actions-row">
              <button className="exam-btn-ghost" onClick={() => setStep(2)}>
                Back
              </button>
              <button
                className="exam-btn-primary exam-step-btn"
                onClick={handleStartTest}
                disabled={!screenShared} // ⬅ require screen share before starting
              >
                Start Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Test + background proctoring */}
      {step === 4 && examSession && (
        <div className="exam-test-wrapper">
          <div className="exam-test-inner">
            {/* Small AI Proctor pill (snapshots + audio in background) */}
            {!finished && <StudentProctor />}

            <div className="exam-question-card">
              <div className="exam-question-header">
                <div className="exam-question-title">
                  Question {currentIndex + 1}
                </div>
                <div className="exam-question-timer">
                  {finished ? (
                    <span className="exam-submitted-text">Submitted</span>
                  ) : (
                    <>
                      Time Left: <strong>{formatTime(timeLeftSec)}</strong>
                    </>
                  )}
                </div>
              </div>

              <div className="exam-question-text">
                {currentQuestion.text || currentQuestion.questionText}
              </div>

              {Array.isArray(currentQuestion.options) &&
              currentQuestion.options.length > 0 ? (
                <div className="exam-options">
                  {currentQuestion.options.map((opt, idx) => (
                    <label
                      key={idx}
                      className={
                        answers[currentIndex] === idx
                          ? "exam-option exam-option-selected"
                          : "exam-option"
                      }
                    >
                      <input
                        type="radio"
                        name={`q_${currentIndex}`}
                        value={idx}
                        disabled={finished}
                        checked={answers[currentIndex] === idx}
                        onChange={() => handleAnswerChange(idx)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  className="exam-textarea"
                  disabled={finished}
                  value={answers[currentIndex] || ""}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="Type your answer here"
                />
              )}

              <div className="exam-test-actions">
                <div className="exam-test-actions-left">
                  <button
                    className="exam-btn-ghost"
                    onClick={goPrev}
                    disabled={currentIndex === 0 || finished}
                  >
                    Previous
                  </button>
                  <button
                    className="exam-btn-ghost"
                    onClick={goNext}
                    disabled={
                      currentIndex === totalQuestions - 1 ||
                      finished ||
                      !currentAnswered
                    }
                  >
                    Next
                  </button>
                </div>

                <button
                  className="exam-btn-primary exam-test-finish"
                  onClick={() => {
                    handleFinishTest(false);
                    navigate("/thankyou", {
                      state: {
                        studentName,
                        examTitle: exam?.title,
                      },
                    });
                  }}
                  disabled={finished || !currentAnswered}
                >
                  Finish Test
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
      
</>
    
    
  );
}

// status row (step 2)
function StatusItem({ label, ok, checking }) {
  let icon = "⏳";
  let color = "#6b7280";

  if (ok) {
    icon = "✅";
    color = "#16a34a";
  } else if (!checking) {
    icon = "⚠️";
    color = "#dc2626";
  }

  return (
    <div className="exam-status-item">
      <span className="exam-status-icon" style={{ color }}>
        {icon}
      </span>
      <span className="exam-status-label" style={{ color }}>
        {label}
      </span>
    </div>
    
  );
}
