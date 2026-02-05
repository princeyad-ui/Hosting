// src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Profile.css"; 
import bg from "../assets/bg.png"; 

const SERVER = "https://ai-proctor-2.onrender.com";

export default function Profile() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        if (!token) {
          setError("Not logged in");
          navigate("/login");
          return;
        }

        const res = await fetch(`${SERVER}/api/admin/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load profile");
        }

        setAdmin(data.user);
      } catch (err) {
        console.error("Profile load error:", err);
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("adminName");
    navigate("/login");
  }

  if (loading) {
    return (
      <div
        className="profile-page"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: "100vh",
        }}
      >
        <div className="profile-card">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="profile-page"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: "100vh",
        }}
      >
        <div className="profile-card">
          <h2>Profile</h2>
          <p style={{ color: "#b91c1c" }}>{error}</p>
          <button className="primary-btn" onClick={() => navigate("/login")}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div
        className="profile-page"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: "100vh",
        }}
      >
        <div className="profile-card">
          <h2>No profile data</h2>
        </div>
      </div>
    );
  }

  return (
    <div
      className="profile-page"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
      }}
    >
      <div className="profile-card">
        <h1 className="profile-title">Admin Profile</h1>

        <div className="profile-row">
          <span className="label">Name:</span>
          <span className="value">{admin.name}</span>
        </div>
        <div className="profile-row">
          <span className="label">Email:</span>
          <span className="value">{admin.email}</span>
        </div>
        <div className="profile-row">
          <span className="label">Phone:</span>
          <span className="value">{admin.phone || "—"}</span>
        </div>

        <hr style={{ margin: "16px 0", borderColor: "#e5e7eb" }} />

        <div className="profile-actions">
          <Link to="/adminexams" className="primary-btn">
            Conduct / Schedule Exams
          </Link>

          <Link to="/adminresultlist" className="secondary-btn">
            View Exam Results
          </Link>

          <Link to="/admindashboard" className="secondary-btn">
            View Proctoring Dashboard
          </Link>

          <button className="danger-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
