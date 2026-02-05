import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./SignUp.css";
import bg from "../assets/bg.png"; // ✅ added

export default function Signup() {
  const [org, setOrg] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("+91");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name || !email || !phone || !password) {
      setError("Please fill all required fields");
      return;
    }

    try {
      const response = await fetch(
        "https://ai-proctor-2.onrender.com/api/admin/signup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, phone, password }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "Signup failed");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("adminName", data.user.name);
      navigate("/profile");
    } catch (err) {
      console.error("Signup error:", err);
      setError("Signup error");
    }
  }

  return (
    /* ✅ SAME BACKGROUND AS SIGN IN */
    <div
      className="signup-page"
       style={{
                    minHeight: "100vh",
                    backgroundImage: `url(${bg})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
    >
      <form className="signup-card" onSubmit={handleSubmit}>
        <h1 className="signup-heading">Sign Up</h1>

        {error && <div className="login-error">{error}</div>}

        <label className="label">Organization Name</label>
        <div className="input-wrap light">
          <span className="input-icon">🏢</span>
          <input
            className="input-field"
            placeholder="Company Name"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
          />
        </div>

        <label className="label">Name *</label>
        <div className="input-wrap">
          <span className="input-icon">👤</span>
          <input
            className="input-field"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <label className="label">Email *</label>
        <div className="input-wrap">
          <span className="input-icon">📧</span>
          <input
            type="email"
            className="input-field"
            placeholder="Mail@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <label className="label">Mobile *</label>
        <div className="phone-wrap">
          <select
            className="country-select"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="+91">🇮🇳 +91</option>
          </select>

          <input
            className="input-field phone-input"
            placeholder="81234 56789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <label className="label">Password *</label>
        <div className="input-wrap">
          <span className="input-icon">🔒</span>
          <input
            type={showPwd ? "text" : "password"}
            className="input-field"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="pwd-toggle"
            onClick={() => setShowPwd(!showPwd)}
          >
            {showPwd ? "🙈" : "👁️"}
          </button>
        </div>

        <button type="submit" className="signup-btn">
          SIGN UP
        </button>

        <div className="signin-row">
          <span>Have an account?</span>
          <Link to="/login" className="signin-link">
            Sign In
          </Link>
        </div>
      </form>
    </div>
  );
}
