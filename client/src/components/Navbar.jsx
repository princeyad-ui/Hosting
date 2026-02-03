import { Link } from "react-router-dom";
import { Rocket, LayoutDashboard, Globe } from "lucide-react";

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Left */}
        <div className="nav-left">
          <Rocket size={22} color="#2563eb" />
          <span className="logo-text">Hostify</span>
          <span className="badge-beta">BETA</span>
        </div>

        {/* Center */}
        <nav className="nav-center">
          <Link to="/dashboard">
            <LayoutDashboard size={16} /> Dashboard
          </Link>
          <Link to="/deploy">
            <Globe size={16} /> Deploy
          </Link>
        </nav>

        {/* Right */}
        <div className="nav-right">
          <div className="user-avatar">P</div>
        </div>
      </div>
    </header>
  );
}
