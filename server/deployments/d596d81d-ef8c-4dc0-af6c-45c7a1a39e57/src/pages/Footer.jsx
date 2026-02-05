import React from "react";
import "./Footer.css";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">

        {/* Logo + About */}
        <div className="footer-col">
          <h2 className="footer-logo">AI-Proctor</h2>
          <p className="footer-text">
            AI-powered online exam monitoring that ensures fairness,
            security, and integrity across all digital assessments.
          </p>
        </div>

        {/* Quick Links */}
        <div className="footer-col">
          <h3>Quick Links</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/features">Features</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/login">Login</Link></li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="footer-col">
          <h3>Contact</h3>
          <ul>
            <li>Email: 6602426@gmail.com</li>
            <li>Phone: +91 9128578075</li>
            <li>Address: Tech Park, India</li>
          </ul>
        </div>

        {/* Social Icons */}
        <div className="footer-col">
          <h3>Services</h3>
          <ul>
            <li>AI Proctoring</li>
            <li>Exam Monitoring</li>
            <li>Authentication System</li>
            <li>Reporting & Analytics</li>
          </ul>
        </div>

      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} AI-Proctor • All Rights Reserved</p>
      </div>
    </footer>
  );
};

export default Footer;
