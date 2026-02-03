import { NavLink } from "react-router-dom";
import { LayoutDashboard, Rocket, Globe, Settings } from "lucide-react";

export default function Sidebar() {
  const logout = () => {
  localStorage.clear();
  window.location.href = "/login";
};

  return (
    <aside className="sidebar">
      <h2 className="sidebar-logo">Hostify</h2>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className="nav-item">
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/deploy" className="nav-item">
          <Rocket size={18} />
          <span>Deploy</span>
        </NavLink>

        <NavLink to="/sites" className="nav-item">
          <Globe size={18} />
          <span>Sites</span>
        </NavLink>

        <NavLink to="/settings" className="nav-item">
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>
      </nav>
    </aside>
  );
}
