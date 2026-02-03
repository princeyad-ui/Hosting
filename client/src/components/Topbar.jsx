import { useState } from "react";
import { Bell, Search, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Topbar({ onSearch }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const firstLetter = user?.name ? user.name.charAt(0).toUpperCase() : "?";

  const logout = () => {
    localStorage.clear(); // removes token + user
    navigate("/login");
  };

  return (
    <header className="topbar">
      {/* SEARCH */}
      <div className="search-box">
        <Search size={16} />
        <input
          placeholder="Search sites..."
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>

      {/* RIGHT */}
      <div className="topbar-right">
        <Bell size={18} />

        {/* AVATAR */}
        <div className="avatar-wrapper">
          <div className="avatar" onClick={() => setOpen(!open)}>
            {firstLetter}
          </div>

          {/* DROPDOWN */}
          {open && (
            <div className="avatar-dropdown">
              <p className="user-email">{user.email}</p>
              <button className="logout-btn" onClick={logout}>
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
