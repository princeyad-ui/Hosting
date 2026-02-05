import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./NavBar.css";

const NavBar = () => {
  const location = useLocation();

  return (
    <nav className="navbar">
      {/* Logo */}
      <Link to="/" className="logo">
        AI-Proctor
      </Link>

      {/* Menu */}
      <ul className="nav-links">
        <li>
          <Link
            to="/features"
            className={location.pathname === "/features" ? "active" : ""}
          >
            Features
          </Link>
        </li>
        <li>
          <Link
            to="/contact"
            className={location.pathname === "/contact" ? "active" : ""}
          >
            Contact
          </Link>
        </li>
        <li>
          <Link to="/login" className="login-btn">
            Login
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default NavBar;
