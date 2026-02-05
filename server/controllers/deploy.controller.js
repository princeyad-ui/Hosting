const path = require("path");
const fs = require("fs");
const simpleGit = require("simple-git");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const { readDB, writeDB } = require("../utils/db");
const { enforceBilling } = require("../services/billing-check.service");
const emailService = require("../services/email.service");


const DEPLOY_DIR = path.join(__dirname, "../deployments");

/* ===============================
   PUBLISH TARGET DETECTION
================================ */
function detectPublishTarget(sitePath) {
  // React / Vite / CRA
  if (fs.existsSync(path.join(sitePath, "dist", "index.html"))) {
    return { type: "dir", path: "dist" };
  }

  if (fs.existsSync(path.join(sitePath, "build", "index.html"))) {
    return { type: "dir", path: "build" };
  }

  // Root index.html
  if (fs.existsSync(path.join(sitePath, "index.html"))) {
    return { type: "file", path: "index.html" };
  }

  // Subfolders with index.html
  const subDirs = fs.readdirSync(sitePath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const dir of subDirs) {
    if (fs.existsSync(path.join(sitePath, dir, "index.html"))) {
      return { type: "dir", path: dir };
    }
  }

  // Any HTML file (IMPORTANT)
  for (const dir of subDirs) {
    const files = fs.readdirSync(path.join(sitePath, dir));
    const html = files.find(f => f.endsWith(".html"));
    if (html) {
      return { type: "file", path: `${dir}/${html}` };
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
  site.logs.push({ step, status, time: new Date().toISOString() });
  writeDB(db);
}

function updateLastLog(siteId, status) {
  const db = readDB();
  const site = db.sites.find(s => s.id === siteId);
  if (!site || !site.logs?.length) return;

  site.logs[site.logs.length - 1].status = status;
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
   DEPLOY FROM GITHUB
================================ */
exports.deployFromGithub = async (req, res) => {
  try {
    const { repoUrl, projectName } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ error: "Repo URL required" });
    }

    // ✅ ENSURE USER IS AUTHENTICATED
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const siteId = uuidv4();
    const sitePath = path.join(DEPLOY_DIR, siteId);
    const name = projectName || repoUrl.split("/").pop();

    const db = readDB();
    db.sites.push({
      id: siteId,
      userId: req.user.id, // ✅ ATTACH USER ID
      name,
      repoUrl,
      url: "",
      status: "Cloning",
      logs: [],
      createdAt: new Date().toISOString(),
    });
    writeDB(db);

    addLog(siteId, "Initializing", "Complete");

    /* CLONE */
    addLog(siteId, "Cloning repository", "Running");
    await simpleGit().clone(repoUrl, sitePath);
    updateLastLog(siteId, "Complete");

    const hasPackageJson = fs.existsSync(
      path.join(sitePath, "package.json")
    );

    /* ===============================
       BUILD PROJECT
    ================================ */
   /* ===============================
   BUILD (REACT)
================================ */
if (hasPackageJson) {
  updateStatus(siteId, "Building");
  addLog(siteId, "Building project", "Running");

  exec("npm install && npm run build", { cwd: sitePath }, (err) => {
    if (err) {
      updateStatus(siteId, "Failed");
      addLog(siteId, "Build failed", "Failed");
      return res.status(500).json({ error: "Build failed" });
    }

    const distPath = path.join(sitePath, "dist");

    // ✅ THIS CHECK IS CRITICAL
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      updateStatus(siteId, "Failed");
      addLog(siteId, "dist/index.html not found", "Failed");
      return res.status(500).json({ error: "Build output missing" });
    }
    /* ===============================
   STEP 3: BILLING ENFORCEMENT
================================ */
console.log("🔍 DEBUG: Starting billing check for siteId:", siteId);
const billingResult = enforceBilling({
  userId: req.user?.id,        // safe optional chaining
  siteId,
  distDir: distPath,
});

console.log("🔍 DEBUG: Billing result:", {
  requiresPayment: billingResult.requiresPayment,
  currentUsageMB: billingResult.currentUsageMB,
  projectSizeMB: billingResult.projectSizeMB,
  total: billingResult.currentUsageMB + billingResult.projectSizeMB,
});

if (billingResult.requiresPayment) {
  console.log("💰 PAYMENT REQUIRED - Blocking deployment");
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


    const url = `${process.env.BACKEND_URL || 'http://localhost:5000'}/sites/${siteId}`;

    updateStatus(siteId, "Live", url);

    addLog(siteId, "Deploying", "Complete");
    addLog(siteId, "Cleanup", "Complete");
    addLog(siteId, "Post-processing", "Complete");

    return res.json({ success: true, siteId, url });
  });

  return;
}


    /* ===============================
       STATIC SITE (NO BUILD)
    ================================ */
const target = detectPublishTarget(sitePath);
if (!target) {
  updateStatus(siteId, "Failed");
  return res.status(500).json({ error: "No HTML file found" });
}

const finalDir = path.join(sitePath, "dist");
fs.mkdirSync(finalDir, { recursive: true });

// 🔥 FIX: copy everything EXCEPT dist into dist
for (const item of fs.readdirSync(sitePath)) {
  if (item === "dist") continue;

  fs.cpSync(
    path.join(sitePath, item),
    path.join(finalDir, item),
    { recursive: true }
  );
}



    /* ===============================
       STEP 3: BILLING ENFORCEMENT (STATIC SITES)
    ================================ */
    const billingResultStatic = enforceBilling({
      userId: req.user.id,
      siteId,
      distDir: finalDir,
    });

    if (billingResultStatic.requiresPayment) {
      updateStatus(siteId, "Payment Required");
      addLog(siteId, "Payment required", "Blocked");

      return res.status(402).json({
        requiresPayment: true,
        siteId,
        amount: 10,
        currency: "INR",
        projectSizeMB: billingResultStatic.projectSizeMB,
        currentUsageMB: billingResultStatic.currentUsageMB,
        totalStorageMB: billingResultStatic.currentUsageMB + billingResultStatic.projectSizeMB,
        freeLimitMB: 200,
        message: "Free 200MB limit reached. Pay ₹10 to deploy this project.",
      });
    }

    const url = `${process.env.BACKEND_URL || 'http://localhost:5000'}/sites/${siteId}`;
    updateStatus(siteId, "Live", url);

    addLog(siteId, "Deploying", "Complete");
    addLog(siteId, "Cleanup", "Complete");
    addLog(siteId, "Post-processing", "Complete");

    // ✅ Send deployment success email
    try {
      await emailService.sendDeploymentNotification(siteId, name || "Your Site", "success");
    } catch (e) {
      console.error("Email send error:", e?.message || e);
    }

    res.json({ success: true, siteId, url });

  } catch (err) {
    console.error("DEPLOY ERROR:", err);
    
    // ✅ Send deployment failure email
    try {
      await emailService.sendDeploymentNotification(siteId || "unknown", name || "Your Site", "failed");
    } catch (e) {
      console.error("Email send error:", e?.message || e);
    }
    
    res.status(500).json({ error: "Deployment failed" });
  }
};

/* ===============================
   GET SITES
================================ */
exports.getSites = (req, res) => {
  const db = readDB();
  // ✅ FILTER SITES BY USER ID
  const userSites = db.sites.filter(s => s.userId === req.user.id);
  res.json(userSites);
};

/* ===============================
   DELETE SITE
================================ */
exports.deleteSite = (req, res) => {
  const { id } = req.params;
  const db = readDB();

  // ✅ VERIFY OWNERSHIP
  const siteIndex = db.sites.findIndex(
    s => s.id === id && s.userId === req.user.id
  );
  if (siteIndex === -1) {
    return res.status(403).json({ error: "Site not found or unauthorized" });
  }

  const sitePath = path.join(DEPLOY_DIR, id);
  if (fs.existsSync(sitePath)) {
    fs.rmSync(sitePath, { recursive: true, force: true });
  }

  db.sites.splice(siteIndex, 1);
  writeDB(db);

  res.json({ success: true });
};

/* ===============================
   GET DEPLOY LOGS
================================ */
exports.getDeployLogs = (req, res) => {
  const site = readDB().sites.find(
    s => s.id === req.params.id && s.userId === req.user.id
  );
  if (!site) {
    return res.status(403).json({ error: "Site not found or unauthorized" });
  }
  res.json(site.logs || []);
};

/* ===============================
   REDEPLOY
================================ */
exports.redeploySite = async (req, res) => {
  const { id } = req.params;
  const db = readDB();

  // ✅ VERIFY OWNERSHIP
  const site = db.sites.find(s => s.id === id && s.userId === req.user.id);
  if (!site) {
    return res.status(403).json({ error: "Site not found or unauthorized" });
  }

  const sitePath = path.join(DEPLOY_DIR, id);
  fs.rmSync(sitePath, { recursive: true, force: true });

  site.logs = [];
  site.status = "Redeploying";
  writeDB(db);

  addLog(id, "Cloning repository", "Running");
  await simpleGit().clone(site.repoUrl, sitePath);
  updateLastLog(id, "Complete");

  site.status = "Live";
  writeDB(db);

  addLog(id, "Deploying", "Complete");
  res.json({ success: true });
};
