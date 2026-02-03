const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const simpleGit = require("simple-git");
const { v4: uuidv4 } = require("uuid");
const { readDB, writeDB } = require("../utils/db");
const { enforceBilling } = require("../services/billing-check.service"); // ✅ ADD BILLING
const emailService = require("../services/email.service"); // ✅ ADD EMAIL

const DEPLOY_DIR = path.join(__dirname, "../deployments");

/* ===============================
   FIND REACT PROJECT ROOT
================================ */
function findProjectRoot(dir) {
  // ✅ First check if /client folder exists (monorepo pattern)
  const clientPath = path.join(dir, "client");
  if (fs.existsSync(clientPath) && fs.existsSync(path.join(clientPath, "package.json"))) {
    console.log("✅ Found client folder with package.json");
    return clientPath;
  }

  // ✅ Check if current dir has package.json (standalone React app)
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  if (entries.some(e => e.name === "package.json")) {
    console.log("✅ Found package.json in root");
    return dir;
  }

  // ✅ Recursively search subdirectories
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== ".git" && entry.name !== "node_modules") {
      const found = findProjectRoot(path.join(dir, entry.name));
      if (found) return found;
    }
  }

  return null;
}

/* ===============================
   LOG HELPERS
================================ */
function addLog(siteId, step, status) {
  const db = readDB();
  const site = db.sites.find(s => s.id === siteId);
  if (!site) return;

  site.logs = site.logs || [];
  site.logs.push({
    step,
    status,
    time: new Date().toISOString(),
  });

  writeDB(db);
}

function updateStatus(siteId, status, url = "") {
  const db = readDB();
  const site = db.sites.find(s => s.id === siteId);
  if (!site) return;

  site.status = status;
  if (url) site.url = url;

  writeDB(db);
}

/* ===============================
   DEPLOY REACT APP ONLY
================================ */
exports.deployReactApp = async (req, res) => {
  let siteId, name;
  try {
    const { repoUrl, projectName } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ error: "Repo URL required" });
    }

    // ✅ ENSURE USER IS AUTHENTICATED
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    siteId = uuidv4();
    const sitePath = path.join(DEPLOY_DIR, siteId);
    name = projectName || repoUrl.split("/").pop();

    /* DB ENTRY */
    const db = readDB();
    db.sites.push({
      id: siteId,
      userId: req.user.id, // ✅ ATTACH USER ID
      name,
      repoUrl,
      type: "react",
      status: "Cloning",
      url: "",
      logs: [],
      createdAt: new Date().toISOString(),
    });
    writeDB(db);

    addLog(siteId, "Initializing", "Complete");

    /* CLONE */
    addLog(siteId, "Cloning repository", "Running");
    await simpleGit().clone(repoUrl, sitePath);
    addLog(siteId, "Cloning repository", "Complete");

    /* FIND PROJECT ROOT */
    const projectRoot = findProjectRoot(sitePath);
    if (!projectRoot) {
      updateStatus(siteId, "Failed");
      addLog(siteId, "package.json not found", "Failed");
      return res.status(400).json({ error: "package.json not found" });
    }

    /* BUILD */
    updateStatus(siteId, "Building");
    addLog(siteId, "Building project", "Running");

    exec("npm install && npm run build", { cwd: projectRoot, timeout: 120000 }, async (err, stdout, stderr) => {
      console.log("🔨 Build output:", stdout);
      
      if (err) {
        console.error("❌ Build error:", stderr || err.message);
        updateStatus(siteId, "Failed");
        addLog(siteId, "Build failed", "Failed");
        return res.status(500).json({ error: "Build failed", details: stderr || err.message });
      }

      console.log("✅ Build successful");
      
      /* ✅ FIXED PART (IMPORTANT) */
      const sourceDist = path.join(projectRoot, "dist");
      const finalDist = path.join(sitePath, "dist");

      console.log("📁 Checking dist:", { sourceDist, exists: fs.existsSync(sourceDist) });

      if (!fs.existsSync(sourceDist)) {
        console.error("❌ dist folder not found at:", sourceDist);
        // List what's actually in projectRoot
        try {
          const contents = fs.readdirSync(projectRoot);
          console.log("Contents of projectRoot:", contents);
        } catch (e) {
          console.error("Failed to read projectRoot:", e.message);
        }
        updateStatus(siteId, "Failed");
        addLog(siteId, "dist folder not found", "Failed");
        return res.status(500).json({ error: "dist not found after build" });
      }

      // clean old dist
      fs.rmSync(finalDist, { recursive: true, force: true });

      // copy correct dist
      console.log("📋 Copying dist from", sourceDist, "to", finalDist);
      fs.cpSync(sourceDist, finalDist, { recursive: true });
      console.log("✅ Dist copied successfully");

      /* ===============================
         STEP 3: BILLING ENFORCEMENT
      ================================ */
      const billingResult = enforceBilling({
        userId: req.user.id,
        siteId,
        distDir: finalDist,
      });

      if (billingResult.requiresPayment) {
        updateStatus(siteId, "Payment Required");
        addLog(siteId, "Payment required", "Blocked");

        return res.status(402).json({
          requiresPayment: true,
          siteId,
          amount: 10,
          currency: "INR",
          projectSizeMB: billingResult.projectSizeMB,
          currentUsageMB: billingResult.currentUsageMB,
          totalStorageMB: billingResult.currentUsageMB + billingResult.projectSizeMB,
          freeLimitMB: 200,
          message: "Free 200MB limit reached. Pay ₹10 to deploy this project.",
        });
      }

      const url = `http://localhost:5000/sites/${siteId}`;

      updateStatus(siteId, "Live", url);
      addLog(siteId, "Deploying", "Complete");
      addLog(siteId, "Cleanup", "Complete");

      // ✅ Send deployment success email
      try {
        await emailService.sendDeploymentNotification(siteId, name || "Your React App", "success");
      } catch (e) {
        console.error("Email send error:", e?.message || e);
      }

      return res.json({
        success: true,
        siteId,
        url,
      });
    });

  } catch (err) {
    console.error("REACT DEPLOY ERROR:", err);
    
    // ✅ Send deployment failure email
    try {
      await emailService.sendDeploymentNotification(siteId || "unknown", name || "Your React App", "failed");
    } catch (e) {
      console.error("Email send error:", e?.message || e);
    }
    
    return res.status(500).json({ error: "Deployment failed" });
  }
};
