import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { API } from "../utils/api";

import "../styles/login.css";



export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    // 🔐 JWT STORAGE (ONLY CHANGE)
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    navigate("/dashboard");
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleLogin}>
        {/* BRAND */}
        <div className="login-brand">
          <h1>Hosting</h1>
          <p>Deploy and manage your sites effortlessly</p>
        </div>

        {error && <div className="error">{error}</div>}

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {/* PASSWORD WITH EYE BUTTON */}
        <div className="password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="button"
            className="eye-btn"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button type="submit" className="login-btn">
          Sign in
        </button>

        {/* GOOGLE LOGIN */}
        <div className="google-login">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                const res = await fetch(`${API}/auth/google`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    credential: credentialResponse.credential,
                  }),
                });

                const data = await res.json();

                if (!res.ok) {
                  setError(data.error || "Google login failed");
                  return;
                }

                // 🔐 JWT STORAGE (ONLY CHANGE)
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));

                navigate("/dashboard");
              } catch (err) {
                setError("Google login failed");
              }
            }}
            onError={() => {
              setError("Google Login Failed");
            }}
          />
        </div>
      </form>
    </div>
  );
}
