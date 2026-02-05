import Layout from "../components/Layout";
import { Github, Rocket } from "lucide-react";
import { useEffect, useState } from "react";
import { API, BACKEND } from "../utils/api";

import "../styles/deploy.css";
import { payForDeployment, verifyPaymentWithBackend } from "../services/payment.service";

  

export default function Deploy() {
  const [projectName, setProjectName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const [siteId, setSiteId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [successUrl, setSuccessUrl] = useState("");

  /* ===============================
     Trigger Deployment
  ================================ */
async function deploySite() {
  if (!repoUrl) return alert("Repository URL is required");

  setLoading(true);
  setLogs([]);
  setSuccessUrl("");
  setSiteId(null);

  try {
    // 🔴 STEP 1: START DEPLOYMENT
    const res = await fetch(`${API}/deploy/github`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ repoUrl, projectName }),
    });

    const data = await res.json();

    // 🔴 STEP 2: CHECK IF PAYMENT REQUIRED
    if (res.status === 402) {
      // Payment required - show payment dialog
      console.log("Payment required for deployment:", data);
      
      try {
        // Open payment modal for this siteId
        const paymentResponse = await payForDeployment(data.siteId);
        console.log("Payment successful:", paymentResponse);
        
        // Verify payment with backend
        await verifyPaymentWithBackend(data.siteId);
        console.log("Payment verified with backend");
        
        // After payment success, deployment continues
        setSiteId(data.siteId);
        setSuccessUrl(data.url || `${BACKEND}/sites/${data.siteId}`);
        alert("Payment successful! Your site is being deployed...");
      } catch (paymentError) {
        alert("Payment failed: " + paymentError.message);
        setLoading(false);
        return;
      }
    } else if (!res.ok) {
      throw new Error(data.error || "Deployment failed");
    } else {
      // 🔴 STEP 3: DEPLOYMENT SUCCESS (no payment needed)
      setSiteId(data.siteId);
      setSuccessUrl(data.url);
    }
  } catch (err) {
    alert(err.message || "Deployment failed");
    setLoading(false);
  }
}



  /* ===============================
     Poll Deploy Logs
  ================================ */
  useEffect(() => {
    if (!siteId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/deploy/${siteId}/logs`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!res.ok) return;

        const data = await res.json();
        setLogs(data);

        const lastLog = data[data.length - 1];
        if (
          lastLog?.status === "Complete" ||
          lastLog?.status === "Failed"
        ) {
          clearInterval(interval);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [siteId]);

  return (
    <Layout>
      <div className="deploy-page">
        <h2>Deploy a New Site</h2>
        <p>Deploy your frontend project directly from GitHub.</p>

        <div className="deploy-card">
          <label>Project Name</label>
          <input
            className="deploy-text-input"
            placeholder="my-awesome-project"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />

          <label>GitHub Repository URL</label>
          <div className="deploy-input">
            <Github size={18} />
            <input
              placeholder="https://github.com/username/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
          </div>

          <button
            className="deploy-btn"
            onClick={deploySite}
            disabled={loading}
          >
            <Rocket size={18} />
            {loading ? "Deploying..." : "Deploy Site"}
          </button>

          {successUrl && (
            <div className="deploy-success">
              ✅ Deployment complete
              <br />
              <a href={successUrl} target="_blank" rel="noreferrer">
                Visit Live Site
              </a>
            </div>
          )}
        </div>

        {logs.length > 0 && (
          <div className="deploy-logs">
            <h3>Deploy log</h3>
            {logs.map((log, idx) => (
              <div key={idx} className="log-row">
                <span>{log.step}</span>
                <span className={`log-status ${log.status.toLowerCase()}`}>
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
