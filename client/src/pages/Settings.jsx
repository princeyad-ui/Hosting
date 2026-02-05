import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { API } from "../utils/api";

import { User, Bell, Shield, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import "../styles/settings.css";



export default function Settings() {
  const [savedUser, setSavedUser] = useState({
    name: "",
    email: "",
    emailNotifications: false,
    deploymentAlerts: false,
  });

  const [formUser, setFormUser] = useState({ name: "", email: "" });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ================= FETCH USER ================= */
  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/user/me`);
      const data = await res.json();
      setSavedUser(data || {
        name: "",
        email: "",
        emailNotifications: false,
        deploymentAlerts: false,
      });
      setError("");
    } catch (err) {
      setError("Failed to load user data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= SAVE PROFILE ================= */
  const saveProfile = async () => {
    // Validate at least one field is filled
    if (!formUser.name && !formUser.email) {
      setError("Please enter a name or email");
      return;
    }

    // Validate email format if provided
    if (formUser.email && !isValidEmail(formUser.email)) {
      setError("Invalid email format");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API}/user/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formUser.name || savedUser.name,
          email: formUser.email || savedUser.email,
        }),
      });

      if (!res.ok) throw new Error("Failed to update profile");

      // Fetch updated user
      const updated = await fetch(`${API}/user/me`);
      const userData = await updated.json();
      setSavedUser(userData);

      // Clear inputs and show success
      setFormUser({ name: "", email: "" });
      setSuccess("✓ Profile updated successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  /* ================= TOGGLE PREFERENCES ================= */
  const togglePreference = async (key) => {
    setError("");
    const updated = { ...savedUser, [key]: !savedUser[key] };

    try {
      const res = await fetch(`${API}/user/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailNotifications: updated.emailNotifications,
          deploymentAlerts: updated.deploymentAlerts,
        }),
      });

      if (!res.ok) throw new Error("Failed to update preferences");

      setSavedUser(updated);
      setSuccess("✓ Preferences updated");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err.message || "Failed to update preferences");
    }
  };

  /* ================= UPDATE PASSWORD ================= */
  const updatePassword = async () => {
    setError("");
    setSuccess("");

    // Validation
    if (!password) {
      setError("Password is required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch(`${API}/user/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) throw new Error("Failed to update password");

      setPassword("");
      setConfirmPassword("");
      setSuccess("✓ Password updated successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  /* ================= DELETE ACCOUNT ================= */
  const deleteAccount = async () => {
    if (!window.confirm("⚠️ This action is permanent and cannot be undone. All your deployments and data will be deleted. Type 'DELETE' in the next prompt to confirm.")) {
      return;
    }

    const confirmation = window.prompt("Type DELETE to confirm account deletion:");
    if (confirmation !== "DELETE") {
      setError("Account deletion cancelled");
      return;
    }

    try {
      const res = await fetch(`${API}/user`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete account");

      setSuccess("Account deleted. Redirecting to login...");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to delete account");
    }
  };

  /* ================= HELPER FUNCTIONS ================= */
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  if (loading) {
    return (
      <Layout>
        <div className="settings-page">
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="settings-page">
        <h2>Settings</h2>
        <p className="settings-subtitle">
          Manage your account preferences and security.
        </p>

        {/* Alert Messages */}
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            <CheckCircle size={16} />
            {success}
          </div>
        )}

        {/* ================= PROFILE ================= */}
        <SettingsCard
          icon={<User size={18} />}
          title="Profile"
          description="Update your personal information"
        >
          <div className="form-group">
            <label>Current Name</label>
            <input
              type="text"
              disabled
              value={savedUser.name || "Not set"}
              placeholder="Not set"
            />
          </div>

          <div className="form-group">
            <label>New Name</label>
            <input
              placeholder="Enter new name"
              value={formUser.name}
              onChange={e =>
                setFormUser({ ...formUser, name: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Current Email</label>
            <input
              type="email"
              disabled
              value={savedUser.email || "Not set"}
              placeholder="Not set"
            />
          </div>

          <div className="form-group">
            <label>New Email</label>
            <input
              type="email"
              placeholder="Enter new email"
              value={formUser.email}
              onChange={e =>
                setFormUser({ ...formUser, email: e.target.value })
              }
            />
          </div>

          <button
            className="primary-btn"
            onClick={saveProfile}
            disabled={saving || (!formUser.name && !formUser.email)}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </SettingsCard>

        {/* ================= PREFERENCES ================= */}
        <SettingsCard
          icon={<Bell size={18} />}
          title="Preferences"
          description="Control how you receive updates"
        >
          <Toggle
            label="Email notifications"
            checked={savedUser.emailNotifications}
            onChange={() => togglePreference("emailNotifications")}
          />
          <Toggle
            label="Deployment alerts"
            checked={savedUser.deploymentAlerts}
            onChange={() => togglePreference("deploymentAlerts")}
          />
        </SettingsCard>

        {/* ================= SECURITY ================= */}
        <SettingsCard
          icon={<Shield size={18} />}
          title="Security"
          description="Manage your password"
        >
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              placeholder="Enter new password (min 6 chars)"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>

          {password && confirmPassword && password !== confirmPassword && (
            <p style={{ color: "#ef4444", fontSize: "12px" }}>
              ✗ Passwords do not match
            </p>
          )}

          <button
            className="primary-btn"
            onClick={updatePassword}
            disabled={savingPassword || !password || !confirmPassword}
          >
            {savingPassword ? "Updating..." : "Update Password"}
          </button>
        </SettingsCard>

        {/* ================= DANGER ZONE ================= */}
        <SettingsCard
          icon={<Trash2 size={18} />}
          title="Danger Zone"
          description="Permanent actions"
          danger
        >
          <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px" }}>
            Deleting your account will permanently remove all your data, deployments, and settings.
          </p>
          <button className="danger-btn" onClick={deleteAccount}>
            Delete Account
          </button>
        </SettingsCard>
      </div>
    </Layout>
  );
}

/* ================= REUSABLE COMPONENTS ================= */

function SettingsCard({ icon, title, description, children, danger }) {
  return (
    <div className={`settings-card ${danger ? "danger" : ""}`}>
      <div className="settings-card-header">
        <div className="icon">{icon}</div>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="settings-card-body">{children}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <div className="toggle-row">
      <span>{label}</span>
      <label className="toggle-switch">
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className="toggle-slider"></span>
      </label>
    </div>
  );
}
