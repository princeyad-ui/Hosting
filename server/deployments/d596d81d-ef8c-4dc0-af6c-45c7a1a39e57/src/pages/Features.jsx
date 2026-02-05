import React from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.png";
import "./Features.css";

const Features = () => {
  const navigate = useNavigate();

  return (
    /* FULL-WIDTH BACKGROUND WRAPPER */
    <div
      className="features-bg"
         style={{
         minHeight: "100vh",
         backgroundImage: `url(${bg})`,
         backgroundSize: "cover",
         backgroundPosition: "center",
         backgroundRepeat: "no-repeat",
       }}
    >
      {/* CONTENT CONTAINER */}
      <div className="features-page container">
        <h1 className="feature-title">AI-Proctor Features</h1>
        <p className="feature-subtitle">
          Explore the intelligent tools that make online exams secure,
          reliable, and cheating-free.
        </p>

        <div className="feature-grid">
          <div className="feature-card">
            <h3>Real-Time Face Monitoring</h3>
            <p>
              Continuously tracks the candidate’s face to ensure identity
              verification and prevent impersonation.
            </p>
          </div>

          <div className="feature-card">
            <h3>Multiple Face Detection</h3>
            <p>
              Automatically detects if another person appears in the frame and
              flags the event instantly.
            </p>
          </div>

          <div className="feature-card">
            <h3>Eye & Head Tracking</h3>
            <p>
              Analyzes gaze direction and head movement to detect suspicious
              looking-away patterns.
            </p>
          </div>

          <div className="feature-card">
            <h3>Object & Phone Detection</h3>
            <p>
              AI identifies external objects such as books, mobile phones, or
              additional screens.
            </p>
          </div>

          <div className="feature-card">
            <h3>Audio Activity Detection</h3>
            <p>
              Detects background voices, talking, and unusual noise to identify
              unauthorized help.
            </p>
          </div>

          <div className="feature-card">
            <h3>Browser Activity Monitoring</h3>
            <p>
              Prevents tab switching, screen navigation, or restricted actions
              during exams.
            </p>
          </div>

          <div className="feature-card">
            <h3>Live Alerts System</h3>
            <p>
              Raises real-time alerts for any suspicious activity, improving
              exam integrity.
            </p>
          </div>

          <div className="feature-card">
            <h3>Detailed Proctoring Report</h3>
            <p>
              Generates a complete session report with timestamps,
              screenshots, and risk score.
            </p>
          </div>
        </div>

        <div className="feature-btn-wrap">
          <button className="btn1" onClick={() => navigate("/proctor")}>
            Start Demo
          </button>
        </div>
      </div>
    </div>
  );
};

export default Features;
