import React from "react";
import "./HomePage.css";
import bg from "../assets/bg.png";



const HomePage = () => {
  return (
     <div className="login-page"
      style={{
    minHeight: "100vh",
    backgroundImage: `url(${bg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  }}>
    <main className="home">
      {/* HERO */}
      <section className="hero">
        <div className="hero-inner container">
          <div className="hero-text">
            <h1>AI-Proctor: Smart Online Exam Monitoring</h1>
            <p>
              Ensure fair, secure, and transparent online exams with real-time
              AI-powered proctoring. Detect cheating, authenticate students,
              and generate instant exam reports.
            </p>
            <div className="hero-ctas">
              <a href="#features" className="btn1 btn-primary">Get Started</a>
              <a href="#how" className="btn1 btn-ghost">Learn More</a>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-card">
              <h3>Live Monitoring</h3>
              <p>Face tracking, object detection, audio analysis in real-time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="features container">
        <h2>Why Choose AI-Proctor?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h4>Real-Time Face Monitoring</h4>
            <p>Continuous verification to ensure identity and single-person presence.</p>
          </div>
          <div className="feature-card">
            <h4>Eye & Head Tracking</h4>
            <p>Detects abnormal gaze and frequent looking away patterns.</p>
          </div>
          <div className="feature-card">
            <h4>Object & Phone Detection</h4>
            <p>Automatically flags phones, books, or other suspicious objects.</p>
          </div>
          <div className="feature-card">
            <h4>Audio Analysis</h4>
            <p>Detects talking, multiple voices, and sudden noises.</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="how container">
        <h2>How It Works</h2>
        <ol className="how-list">
          <li><strong>Login & Authenticate:</strong> Face verification and liveness check.</li>
          <li><strong>AI Monitors:</strong> Webcam, mic and activity are analyzed.</li>
          <li><strong>Alerts:</strong> Suspicious events are flagged in real-time.</li>
          <li><strong>Report:</strong> Examiner receives a timestamped session summary.</li>
        </ol>
      </section>

      {/* CTA */}
      <section className="cta container">
        <div className="cta-inner">
          <h3>Ready to make exams cheating-free?</h3>
          <a href="/login" className="btn1 btn-primary">Start Monitoring</a>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="contact container">
        <h2>Contact</h2>
        <p>Have questions or want a demo? Reach out at <a href="mailto:hello@aiproctor.example">hello@aiproctor.example</a>.</p>
      </section>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="container">
          <p>© {new Date().getFullYear()} AI-Proctor • <a href="#privacy">Privacy</a> • <a href="#terms">Terms</a></p>
        </div>
      </footer>
    </main>
        </div>
  );
};

export default HomePage;
