import React, { useState, useRef } from "react";
import emailjs from "emailjs-com";
import "./Contact.css";
import bg from "../assets/bg.png";

const Contact = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const formRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setErrorMsg("Please fill required fields.");
      setStatus("error");
      setTimeout(() => setStatus(""), 3000);
      return;
    }

    setStatus("sending");

    const templateParams = {
      name: form.name,
      email: form.email,
      subject: form.subject || "",
      message: form.message,
      to_email: "6602426@gmail.com",
    };

    const SERVICE_ID = "service_3hq7cc6";
    const TEMPLATE_ID = "template_s3jka6j";
    const PUBLIC_KEY = "GPFs2nDjsWbx6yBMJ";

    emailjs
      .send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY)
      .then(() => {
        setStatus("sent");
        setForm({ name: "", email: "", subject: "", message: "" });
        setTimeout(() => setStatus(""), 3000);
      })
      .catch((err) => {
        setErrorMsg(err.text || "Failed to send message.");
        setStatus("error");
        setTimeout(() => setStatus(""), 5000);
      });
  };

  return (
    /* FULL PAGE BACKGROUND (same as Home & Features) */
    <div
      className="contact-bg"
       style={{
               minHeight: "100vh",
               backgroundImage: `url(${bg})`,
               backgroundSize: "cover",
               backgroundPosition: "center",
               backgroundRepeat: "no-repeat",
             }}
    >
      <div className="contact-page container">
        <div className="contact-grid">
          {/* LEFT INFO */}
          <div className="contact-info">
            <h1>Contact Us</h1>
            <p className="muted">
              Have questions or want a demo? Fill the form and our team will get
              back to you.
            </p>

            <div className="info-block">
              <h4>Support</h4>
              <p>
                <a href="mailto:6602426@gmail.com">6602426@gmail.com</a>
              </p>
            </div>

            <div className="info-block">
              <h4>Office</h4>
              <p>CNN-322, Chandranagar, Tech Park, Bhilai, India</p>
            </div>

            <div className="info-block">
              <h4>Phone</h4>
              <p>+91 9128578075</p>
            </div>
          </div>

          {/* RIGHT FORM */}
          <form
            ref={formRef}
            className="contact-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <label>
              <span>Name</span>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your full name"
                required
              />
            </label>

            <label>
              <span>Email</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              <span>Subject</span>
              <input
                name="subject"
                value={form.subject}
                onChange={handleChange}
                placeholder="Subject"
              />
            </label>

            <label>
              <span>Message</span>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                rows="5"
                placeholder="Write your message here..."
                required
              />
            </label>

            <div className="form-row">
              <button
                type="submit"
                className="btn1 btn-primary"
                disabled={status === "sending"}
              >
                {status === "sending" ? "Sending..." : "Send Message"}
              </button>

              <div className="form-status">
                {status === "error" && (
                  <span className="status error">{errorMsg}</span>
                )}
                {status === "sent" && (
                  <span className="status success">
                    Thanks — message sent!
                  </span>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
