import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import "./StudentProctor.css";

const SERVER = "https://ai-proctor-2.onrender.com";

// ====== Tuning (same as your Proctor.jsx) ======
const DETECT_INTERVAL_MS = 700;
const NO_FACE_THRESHOLD_MS = 4000;
const MULTI_FACE_CONFIRM_MS = 1200;
const OBJECT_CONFIRM_MS = 1000;
const OBJECT_SCORE_THRESHOLD = 0.4;

const SUSPICIOUS_OBJECT_TEXTS = [
  "cell phone",
  "cellphone",
  "mobile phone",
  "phone",
  "book",
  "laptop",
  "tv",
  "monitor",
  "tablet",
];

const AUDIO_CHECK_MS = 200;
const AUDIO_THRESHOLD = 0.06;
const AUDIO_REQUIRED_CONSECUTIVE = 3;
const AUDIO_COOLDOWN_MS = 10000;
const TAB_COOLDOWN_MS = 5000;

export default function StudentProctor() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  const streamRef = useRef(null);        // ✅ store camera stream
  const sessionIdRef = useRef(null);     // ✅ always-latest sessionId

  const [sessionId, setSessionId] = useState(null);
  const [running, setRunning] = useState(false);

  const lastFaceSeenAt = useRef(Date.now());
  const multiFaceSince = useRef(null);

  const objectModelRef = useRef(null);
  const objectSince = useRef(null);
  const lastObjectType = useRef(null);
  const objectAlertCooldown = useRef(0);

  const [localEvents, setLocalEvents] = useState([]); // alerts for UI
  const [status, setStatus] = useState("Starting AI proctoring…");

  // audio state
  const audioRef = useRef({
    stream: null,
    audioContext: null,
    analyser: null,
    dataArray: null,
    intervalId: null,
    consecutiveAbove: 0,
    cooldown: false,
  });
  const [micAllowed, setMicAllowed] = useState(null);
  const [audioRms, setAudioRms] = useState(0);

  const tabCooldownRef = useRef(false);

  // --- simple logger to console only (no debug UI) ---
  const appendLog = (t) => {
    const str = `${new Date().toLocaleTimeString()} — ${t}`;
    console.log(str);
  };

  // ========= helper: map backend path -> URL =========
  function framePathToUrl(path) {
    if (!path) return null;
    if (path.startsWith("/")) {
      return `${SERVER}${path}`;
    }
    const idx = path.indexOf("evidence");
    if (idx >= 0) {
      const sub = path.substring(idx);
      return `${SERVER}/${sub.replace(/\\/g, "/")}`;
    }
    return null;
  }

  // ========= Load models (face-api + coco-ssd) once =========
  useEffect(() => {
    async function loadModels() {
      const MODEL_URL = "/models";

      try {
        appendLog("Loading face-api ssdMobilenetv1 (preferred)...");
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        appendLog("ssdMobilenetv1 loaded");
      } catch (e) {
        appendLog(
          "ssdMobilenetv1 load failed (will use tiny): " + (e?.message || e)
        );
      }

      try {
        appendLog("Loading tinyFaceDetector (fallback)...");
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        appendLog("tinyFaceDetector loaded");
      } catch (e) {
        appendLog("tinyFaceDetector load failed: " + (e?.message || e));
      }

      try {
        if (window.cocoSsd) {
          appendLog("Using CDN coco-ssd");
          objectModelRef.current = await window.cocoSsd.load();
        } else {
          appendLog("Dynamically importing coco-ssd...");
          const mod = await import("@tensorflow-models/coco-ssd");
          objectModelRef.current = await mod.load();
        }
        appendLog("coco-ssd loaded");
      } catch (err) {
        appendLog("coco-ssd load failed: " + (err?.message || err));
        objectModelRef.current = null;
      }
    }

    loadModels();
  }, []);

  // ========= Camera + backend session =========
  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });

    streamRef.current = stream; // ✅ keep reference to stop later

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    appendLog("Camera started");
  }

 async function startSession() {
  const studentName = localStorage.getItem("studentName") || "Unknown";
  const studentEmail = localStorage.getItem("studentEmail") || "";

  const res = await fetch("https://ai-proctor-2.onrender.com/api/start-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentName, studentEmail }),
  });

  const data = await res.json();
  if (data && data.success) {
    setSessionId(data.sessionId);
    return data.sessionId;
  }
  throw new Error("Failed to start session");
}


  function captureFrameBlob() {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return resolve(null);

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
    });
  }

  async function sendAlert(
    type,
    severity = "high",
    details = "",
    uploadFrame = true
  ) {
    if (!sessionId) {
      appendLog("No sessionId - cannot send alert");
      return null;
    }

    let thumbnailUrl = null;
    try {
      if (uploadFrame) {
        const blob = await captureFrameBlob();
        if (blob) {
          const fd = new FormData();
          fd.append("sessionId", sessionId);
          fd.append("frame", blob, `alert_${type}_${Date.now()}.jpg`);

          const r = await fetch(`${SERVER}/api/frame`, {
            method: "POST",
            body: fd,
          });
          const fr = await r.json().catch(() => null);
          if (fr && fr.evidence && fr.evidence.path) {
            thumbnailUrl = framePathToUrl(fr.evidence.path);
          }
        }
      }

      const res = await fetch(`${SERVER}/api/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, type, severity, details }),
      });
      const jr = await res.json().catch(() => null);
      appendLog("alert posted: " + JSON.stringify(jr || {}));

      const ev = {
        id: (jr && jr.event && jr.event.id) || `local-${Date.now()}`,
        type,
        severity,
        details,
        timestamp: new Date().toISOString(),
        thumbnailUrl,
      };
      setLocalEvents((s) => [ev, ...s].slice(0, 50));
      return ev;
    } catch (err) {
      appendLog("sendAlert error: " + (err?.message || err));
      return null;
    }
  }

  // ========= AUDIO monitoring =========
  async function startAudioMonitoring() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicAllowed(true);

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      const dataArray = new Float32Array(analyser.fftSize);
      source.connect(analyser);

      audioRef.current = {
        ...audioRef.current,
        stream,
        audioContext,
        analyser,
        dataArray,
        consecutiveAbove: 0,
        cooldown: false,
      };

      const intervalId = setInterval(() => {
        try {
          analyser.getFloatTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          setAudioRms(rms);

          if (rms > AUDIO_THRESHOLD) {
            audioRef.current.consecutiveAbove++;
          } else {
            audioRef.current.consecutiveAbove = 0;
          }

          if (
            audioRef.current.consecutiveAbove >=
              AUDIO_REQUIRED_CONSECUTIVE &&
            !audioRef.current.cooldown
          ) {
            audioRef.current.cooldown = true;
            appendLog(`Audio activity flagged (rms=${rms.toFixed(4)})`);
            sendAlert(
              "audio_activity",
              "medium",
              `rms=${rms.toFixed(4)}`,
              false
            );
            setTimeout(
              () => (audioRef.current.cooldown = false),
              AUDIO_COOLDOWN_MS
            );
            audioRef.current.consecutiveAbove = 0;
          }
        } catch (err) {
          console.error("audio interval error", err);
        }
      }, AUDIO_CHECK_MS);

      audioRef.current.intervalId = intervalId;
      appendLog("Audio monitoring started");
    } catch (err) {
      setMicAllowed(false);
      appendLog("Mic error: " + (err?.message || err));
      if (sessionId) {
        sendAlert("audio_error", "low", "microphone_denied_or_error", false);
      }
    }
  }

  function stopAudioMonitoring() {
    try {
      const cur = audioRef.current;
      if (cur.intervalId) clearInterval(cur.intervalId);
      if (cur.audioContext && cur.audioContext.state !== "closed") {
        cur.audioContext.close().catch(() => {});
      }
      if (cur.stream) cur.stream.getTracks().forEach((t) => t.stop());
      audioRef.current = {
        stream: null,
        audioContext: null,
        analyser: null,
        dataArray: null,
        intervalId: null,
        consecutiveAbove: 0,
        cooldown: false,
      };
      setAudioRms(0);
      appendLog("Audio monitoring stopped");
    } catch (e) {
      console.error("stopAudioMonitoring error", e);
    }
  }

  // ✅ Central cleanup for camera + intervals
  function cleanupMedia() {
    // stop detection interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // stop audio
    stopAudioMonitoring();

    // stop camera tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  // ========= TAB / VISIBILITY events =========
  function sendTabEvent(reason) {
    if (!sessionId) return;
    if (tabCooldownRef.current) return;
    tabCooldownRef.current = true;

    sendAlert("tab_switch", "low", reason, false);
    setTimeout(() => {
      tabCooldownRef.current = false;
    }, TAB_COOLDOWN_MS);
  }

  // ========= Detection loop (face + object) =========
  useEffect(() => {
    async function runDetections() {
      const video = videoRef.current;
      if (!video || video.readyState !== 4) {
        appendLog("Video not ready");
        return;
      }

      // --- FACE detection ---
      try {
        const useSSD = !!faceapi.nets.ssdMobilenetv1.params;
        let detections = [];
        if (useSSD) {
          const options = new faceapi.SsdMobilenetv1Options({
            minConfidence: 0.45,
          });
          detections = await faceapi.detectAllFaces(video, options);
        } else {
          const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 512,
            scoreThreshold: 0.3,
          });
          detections = await faceapi.detectAllFaces(video, options);
        }

        // draw boxes (just for debugging; video is hidden anyway)
        try {
          const canvas = canvasRef.current;
          const displaySize = {
            width: video.videoWidth,
            height: video.videoHeight,
          };
          faceapi.matchDimensions(canvas, displaySize);
          const resized = faceapi.resizeResults(detections, displaySize);
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          resized.forEach((det) => {
            const { x, y, width, height } = det.box;
            ctx.strokeStyle = "rgba(37,99,235,0.9)";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
          });
        } catch (_) {}

        const now = Date.now();
        if (!detections || detections.length === 0) {
          if (!lastFaceSeenAt.current) lastFaceSeenAt.current = now;
          if (now - lastFaceSeenAt.current > NO_FACE_THRESHOLD_MS) {
            await sendAlert(
              "no-face",
              "high",
              `No face for > ${NO_FACE_THRESHOLD_MS / 1000}s`,
              true
            );
            lastFaceSeenAt.current = now + 2000;
          }
        } else {
          lastFaceSeenAt.current = now;
          if (detections.length > 1) {
            if (!multiFaceSince.current) multiFaceSince.current = now;
            if (now - multiFaceSince.current > MULTI_FACE_CONFIRM_MS) {
              await sendAlert(
                "multiple-faces",
                "high",
                `Detected ${detections.length} faces`,
                true
              );
              multiFaceSince.current = null;
            }
          } else {
            multiFaceSince.current = null;
          }
        }
      } catch (err) {
        appendLog("Face detection error: " + (err?.message || err));
      }

      // --- OBJECT detection ---
      if (objectModelRef.current) {
        try {
          const predictions = await objectModelRef.current.detect(video);
          const suspicious = (predictions || []).filter((p) => {
            const cls = String(p.class).toLowerCase();
            const scoreOk = p.score >= OBJECT_SCORE_THRESHOLD;
            return (
              scoreOk &&
              SUSPICIOUS_OBJECT_TEXTS.some((s) => cls.includes(s))
            );
          });

          if (suspicious.length > 0) {
            const now = Date.now();
            const top = suspicious[0];
            const objClass = top.class.toLowerCase();
            if (lastObjectType.current === objClass) {
              if (!objectSince.current) objectSince.current = now;
              if (
                now - objectSince.current > OBJECT_CONFIRM_MS &&
                now - objectAlertCooldown.current > 4000
              ) {
                await sendAlert(
                  "object-detected",
                  "high",
                  `Detected ${objClass} (${top.score.toFixed(2)})`,
                  true
                );
                objectAlertCooldown.current = Date.now();
                objectSince.current = null;
                lastObjectType.current = null;
              }
            } else {
              lastObjectType.current = objClass;
              objectSince.current = Date.now();
            }
          } else {
            lastObjectType.current = null;
            objectSince.current = null;
          }
        } catch (err) {
          appendLog("Object detection error: " + (err?.message || err));
        }
      }
    }

    if (running && sessionId) {
      runDetections();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(runDetections, DETECT_INTERVAL_MS);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, sessionId]);

  // ========= Auto-start on mount, stop on unmount =========
  useEffect(() => {
    let cancelled = false;

    async function startEverything() {
      try {
        setStatus("Starting camera & AI proctoring…");
        await startCamera();
        const sid = await startSession();
        if (cancelled) return;
        setSessionId(sid);
        sessionIdRef.current = sid;
        setRunning(true);
        setStatus("AI proctoring is running in the background.");
      } catch (err) {
        setStatus(
          "Could not start proctoring. Please allow camera & mic and refresh."
        );
      }
    }

    startEverything();

    return () => {
      cancelled = true;
      setRunning(false);
      cleanupMedia();             // ✅ stop camera + audio + intervals

      const sid = sessionIdRef.current;
      if (sid) {
        fetch(`${SERVER}/api/end-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid }),
        }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========= audio + tab listeners toggle by "running" =========
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden")
        sendTabEvent("visibility_hidden");
      else sendTabEvent("visibility_visible");
    }
    function handleBlur() {
      sendTabEvent("window_blur");
    }
    function handleFocus() {
      sendTabEvent("window_focus");
    }

    if (running) {
      startAudioMonitoring();
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("blur", handleBlur);
      window.addEventListener("focus", handleFocus);
    } else {
      stopAudioMonitoring();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    }

    return () => {
      stopAudioMonitoring();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, sessionId]);

  // ========= UI (compact card, for right side of exam) =========
  return (
    <div className="sp-shell">
    <div className="sp-header-row">
      <div className="sp-badge">
        <span className="sp-dot" />
        AI Proctoring Active
      </div>
      <div className="sp-status">
        AI proctoring is running in the background.
      </div>
    </div>

    {/* Hidden video + canvas – used only for detection */}
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="sp-hidden-video"
    />
    <canvas ref={canvasRef} className="sp-hidden-canvas" />
  </div>
  );
}
