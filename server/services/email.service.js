const axios = require("axios");
const { readDB } = require("../utils/db");

// EmailJS REST endpoint
const EMAILJS_URL = "https://api.emailjs.com/api/v1.0/email/send";

function isConfigured() {
  return !!(process.env.EMAILJS_USER_ID && process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_TEMPLATE_ID);
}

async function sendViaEmailJS(templateParams) {
  if (!isConfigured()) {
    console.log("❌ EmailJS not configured. Set EMAILJS_USER_ID, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID in .env");
    return { success: false, error: "EmailJS not configured" };
  }

  const payload = {
    service_id: process.env.EMAILJS_SERVICE_ID,
    template_id: process.env.EMAILJS_TEMPLATE_ID,
    user_id: process.env.EMAILJS_USER_ID,
    template_params: templateParams,
  };

  try {
    const resp = await axios.post(EMAILJS_URL, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000,
    });
    if (resp.status === 200) {
      return { success: true, data: resp.data };
    }
    return { success: false, status: resp.status, data: resp.data };
  } catch (err) {
    console.error("❌ EmailJS send error:", err.message || err.toString());
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Send deployment notification email via EmailJS
 */
exports.sendDeploymentNotification = async (siteId, siteName, status) => {
  try {
    const db = readDB();
    const user = db.users?.[0];
    if (!user?.email || !user?.emailNotifications) {
      return { success: false, reason: "Email notifications disabled or no email" };
    }

    const subject = `Deployment ${status}: ${siteName}`;
    const html = `Your site ${siteName} (ID: ${siteId}) deployment status: ${status} at ${new Date().toLocaleString()}`;

    const params = {
      to_email: user.email,
      to_name: user.name || "User",
      subject,
      message_html: html,
      site_id: siteId,
      site_name: siteName,
      status,
    };

    const result = await sendViaEmailJS(params);
    if (result.success) console.log(`✉️  Deployment notification queued for ${user.email}`);
    return result;
  } catch (error) {
    console.error("❌ Failed to send deployment notification:", error.message);
    return { success: false, error: error.message };
  }
};

exports.sendDeploymentAlert = async (siteId, siteName, message) => {
  try {
    const db = readDB();
    const user = db.users?.[0];
    if (!user?.email || !user?.deploymentAlerts) {
      return { success: false, reason: "Deployment alerts disabled or no email" };
    }

    const subject = `Alert: ${siteName}`;
    const html = `Alert for ${siteName}: ${message}`;

    const params = {
      to_email: user.email,
      to_name: user.name || "User",
      subject,
      message_html: html,
      site_id: siteId,
      site_name: siteName,
      alert_message: message,
    };

    const result = await sendViaEmailJS(params);
    if (result.success) console.log(`✉️  Alert sent to ${user.email}`);
    return result;
  } catch (error) {
    console.error("❌ Failed to send alert email:", error.message);
    return { success: false, error: error.message };
  }
};

exports.sendWelcomeEmail = async (name, email) => {
  try {
    const subject = "Welcome to Our Hosting Platform!";
    const html = `Welcome ${name || "User"}! Thanks for joining.`;

    const params = {
      to_email: email,
      to_name: name || "User",
      subject,
      message_html: html,
    };

    const result = await sendViaEmailJS(params);
    if (result.success) console.log(`✉️  Welcome email queued for ${email}`);
    return result;
  } catch (error) {
    console.error("❌ Failed to send welcome email:", error.message);
    return { success: false, error: error.message };
  }
};

exports.sendEmail = async (to, subject, htmlContent) => {
  try {
    const params = {
      to_email: to,
      to_name: to,
      subject,
      message_html: htmlContent,
    };
    const result = await sendViaEmailJS(params);
    if (result.success) console.log(`✉️  Email queued to ${to}`);
    return result;
  } catch (error) {
    console.error("❌ Failed to send email:", error.message);
    return { success: false, error: error.message };
  }
};

exports.sendStorageWarning = async (siteId, siteName, usedStorage, limit) => {
  try {
    const db = readDB();
    const user = db.users?.[0];
    if (!user?.email || !user?.emailNotifications) {
      return { success: false, reason: "Email notifications disabled or no email" };
    }

    const subject = `Storage Limit Warning`;
    const html = `You're using ${usedStorage}MB of ${limit}MB for ${siteName}.`;

    const params = {
      to_email: user.email,
      to_name: user.name || "User",
      subject,
      message_html: html,
      site_id: siteId,
      site_name: siteName,
      used_storage: usedStorage,
      storage_limit: limit,
    };

    const result = await sendViaEmailJS(params);
    if (result.success) console.log(`✉️  Storage warning queued for ${user.email}`);
    return result;
  } catch (error) {
    console.error("❌ Failed to send storage warning:", error.message);
    return { success: false, error: error.message };
  }
};
