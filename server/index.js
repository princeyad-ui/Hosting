const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const deployRoutes = require("./routes/deploy.routes");
const siteRoutes = require("./routes/siteRoutes");
const BuildManager = require("./utils/buildManager");
const emailService = require("./services/email.service");

const app = express();

// ✅ Enhanced CORS Configuration
const corsOptions = {
  origin: [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "https://hosting-01.netlify.app", // ✅ production frontend
],

  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
};

app.use(cors(corsOptions));

// ✅ Security Headers (Fix COOP issue)
// ✅ Security Headers (skip Google Auth routes)
app.use((req, res, next) => {
  // Allow Google OAuth popup communication
  if (req.path.startsWith("/api/auth")) {
    return next();
  }

  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});


app.use(express.json());
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const DEPLOY_DIR = path.join(__dirname, "deployments");
// ✅ Ensure deployments directory exists (REQUIRED for Render)
if (!fs.existsSync(DEPLOY_DIR)) {
  fs.mkdirSync(DEPLOY_DIR, { recursive: true });
  console.log("📁 deployments directory created at runtime");
}


/* ===============================
   API ROUTES
================================ */
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/auth", require("./routes/googleAuthRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use(deployRoutes);
app.use("/api/sites", siteRoutes);
app.use("/api", require("./routes/payment.routes"));

/* ===============================
   BUILD MANAGEMENT ENDPOINTS
================================ */

// Build a specific deployment
app.post("/api/build/:siteId", (req, res) => {
  const siteId = req.params.siteId;
  const deploymentPath = path.join(DEPLOY_DIR, siteId);

  if (!fs.existsSync(deploymentPath)) {
    return res.status(404).json({ error: `Deployment ${siteId} not found` });
  }

  try {
    console.log(`\n🚀 Build request for ${siteId}`);
    const success = BuildManager.buildProject(siteId, deploymentPath);

    if (success) {
      res.json({
        success: true,
        message: `Deployment ${siteId} built successfully`,
      });
    } else {
      res.status(500).json({
        error: `Failed to build ${siteId}. Check logs for details.`,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Build all unbuilt deployments
app.post("/api/build-all", (req, res) => {
  try {
    console.log(`\n🚀 Build-all request`);
    const builtCount = BuildManager.buildAllUnbuilt(DEPLOY_DIR);
    res.json({
      success: true,
      message: `Built ${builtCount} project(s)`,
      builtCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get build status for a deployment
app.get("/api/build-status/:siteId", (req, res) => {
  const siteId = req.params.siteId;
  const deploymentPath = path.join(DEPLOY_DIR, siteId);

  if (!fs.existsSync(deploymentPath)) {
    return res.status(404).json({ error: `Deployment ${siteId} not found` });
  }

  const hasPackageJson = BuildManager.findPackageJson(deploymentPath) !== null;
  const isReact = hasPackageJson
    ? BuildManager.isReactProject(BuildManager.findPackageJson(deploymentPath))
    : false;
  const isBuilt = BuildManager.isBuilt(deploymentPath);

  res.json({
    siteId,
    hasPackageJson,
    isReactProject: isReact,
    isBuilt,
    status: isBuilt ? "ready" : isReact ? "needs-build" : "not-a-react-app",
  });
});

/* ===============================
   INITIALIZATION: Auto-build unbuilt deployments on startup
   (Runs in background without blocking server)
================================ */
console.log(`\n⏳ Initializing deployment builds (running in background)...`);
// Run builds asynchronously without blocking server startup
setImmediate(() => {
  BuildManager.buildAllUnbuilt(DEPLOY_DIR);
});

/* ===============================
   HELPER FUNCTION: Get Latest Deployment with Valid Built Assets
================================ */
function getLatestDeployment() {
  try {
    const dirs = fs
      .readdirSync(DEPLOY_DIR, { withFileTypes: true })
      .filter((dir) => {
        // Check for a built React app
        const assetsPath = path.join(DEPLOY_DIR, dir.name, "dist", "assets");
        return dir.isDirectory() && fs.existsSync(assetsPath);
      })
      .map((dir) => ({
        name: dir.name,
        time: fs.statSync(path.join(DEPLOY_DIR, dir.name)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    const latest = dirs.length > 0 ? dirs[0].name : null;
    if (latest) {
      console.log(`✅ Latest deployment with built assets: ${latest}`);
    } else {
      console.error("❌ No deployment with built assets found!");
    }
    return latest;
  } catch (err) {
    console.error("❌ Error reading deployments:", err);
    return null;
  }
}

// Helper: resolve a request path to a real file inside a dist folder
function resolveStaticAsset(distPath, requestPath) {
  try {
    const cleaned = (requestPath || "").split("?")[0].replace(/^\/+/, "");

    // If empty or directory, prefer index.html
    if (!cleaned || cleaned.endsWith("/")) {
      const idx = path.join(distPath, "index.html");
      return fs.existsSync(idx) ? idx : null;
    }

    const candidates = [
      path.join(distPath, cleaned),
      path.join(distPath, "assets", cleaned),
      path.join(distPath, cleaned, "index.html"),
    ];

    console.log(`[resolveStaticAsset] cleaned=${cleaned}`, candidates);
    for (const c of candidates) {
      const exists = fs.existsSync(c);
      const isFile = exists ? fs.statSync(c).isFile() : false;
      console.log(`[resolveStaticAsset] ${c} exists=${exists} isFile=${isFile}`);
      if (exists && isFile) return c;
    }

    return null;
  } catch (err) {
    console.error("resolveStaticAsset error:", err && err.message);
    return null;
  }
}

// Helper: find the first HTML file inside a dist folder (recurses)
function findFirstHtml(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const name = entry.name;
      if (name === 'node_modules' || name === '.git') continue;
      const full = path.join(dir, name);
      if (entry.isFile() && path.extname(name).toLowerCase() === '.html') {
        return full;
      }
      if (entry.isDirectory()) {
        const found = findFirstHtml(full);
        if (found) return found;
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

// Find a file by name anywhere under dir (recursively). Returns absolute path or null.
function findFileRecursively(dir, targetName) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isFile() && entry.name === targetName) return full;
      if (entry.isDirectory()) {
        const found = findFileRecursively(full, targetName);
        if (found) return found;
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

/* ===============================
   SETUP: Serve Latest Deployment's Dist Folder at Root
   ✅ FIXED: Custom middleware for proper asset & HTML serving
================================ */
const latestDeploymentId = getLatestDeployment();

if (latestDeploymentId) {
  const distPath = path.join(DEPLOY_DIR, latestDeploymentId, "dist");
  console.log(`📁 Using deployment: ${latestDeploymentId}`);
  console.log(`📂 Serving from: ${distPath}`);

  // ✅ Custom middleware to serve dist files with proper MIME types
 app.use((req, res, next) => {
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/sites") ||
    req.path === "/health" ||
    req.path === "/favicon.ico"
  ) {
    return next();
  }

  const requestPath = req.path === "/" ? "/index.html" : req.path;

  // 🔥 SMART STATIC ASSET RESOLUTION
  const resolvedFile = resolveStaticAsset(distPath, requestPath);

  if (resolvedFile) {
    // MIME + cache logic stays untouched
    const ext = path.extname(resolvedFile).toLowerCase();
    const mimeTypes = {
      ".js": "application/javascript; charset=utf-8",
      ".mjs": "application/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".ttf": "font/ttf",
      ".json": "application/json",
      ".html": "text/html; charset=utf-8",
    };

    res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
    return res.sendFile(resolvedFile);
  }

  next();
});
}

/* ===============================
   SERVE SPECIFIC DEPLOYMENTS BY ID
   Route: /sites/:siteId/* 
   Handles ANY static site structure:
   - dist/index.html (built React)
   - dist/Food Website/Breakfast.html (nested structure)
   - Food Website/Breakfast.html (source structure)
   With automatic asset path rewriting for nested structures
================================ */
app.use("/sites/:siteId/", (req, res, next) => {
  const siteId = req.params.siteId;
  const sitePath = path.join(DEPLOY_DIR, siteId);

  // Helper: find the actual serving directory and return the real serving root
  function findServingRoot(basePath) {
    // 1. Check if basePath/dist/index.html exists (built React project)
    const distIndexPath = path.join(basePath, "dist", "index.html");
    if (fs.existsSync(distIndexPath)) {
      return {
        servingDir: path.join(basePath, "dist"),
        nestedPrefix: null, // No nesting
      };
    }

    // 2. Check if basePath/dist/ exists
    const distPath = path.join(basePath, "dist");
    if (fs.existsSync(distPath)) {
      const files = fs.readdirSync(distPath);
      
      // Check for HTML files directly in dist/
      if (files.some(f => f.endsWith(".html"))) {
        return {
          servingDir: distPath,
          nestedPrefix: null,
        };
      }
      
      // Check for subdirectories with HTML (nested structure like dist/Food Website/)
      for (const file of files) {
        const filePath = path.join(distPath, file);
        try {
          if (fs.statSync(filePath).isDirectory()) {
            const dirFiles = fs.readdirSync(filePath);
            if (dirFiles.some(f => f.endsWith(".html"))) {
              // Found nested structure - serve from dist but rewrite paths
              return {
                servingDir: distPath,
                nestedPrefix: file, // e.g., "Food Website"
              };
            }
          }
        } catch (e) {
          // Skip directories we can't read
        }
      }
    }

    // 3. Check if basePath itself contains HTML files (source structure)
    const baseFiles = fs.readdirSync(basePath);
    if (baseFiles.some(f => f.endsWith(".html"))) {
      return {
        servingDir: basePath,
        nestedPrefix: null,
      };
    }

    // 4. Check if basePath contains a subdirectory with HTML (like Food Website/)
    for (const file of baseFiles) {
      const filePath = path.join(basePath, file);
      try {
        if (fs.statSync(filePath).isDirectory()) {
          const dirFiles = fs.readdirSync(filePath);
          if (dirFiles.some(f => f.endsWith(".html"))) {
            // Found nested structure
            return {
              servingDir: basePath,
              nestedPrefix: file, // e.g., "Food Website"
            };
          }
        }
      } catch (e) {
        // Skip directories we can't read
      }
    }

    return null;
  }

  const servingRoot = findServingRoot(sitePath);
  if (!servingRoot) {
    return res.status(404).send(`
      <h1>❌ Deployment Not Found: ${siteId}</h1>
      <p>No HTML files found in this deployment.</p>
    `);
  }

  const { servingDir, nestedPrefix } = servingRoot;
  console.log(`[${siteId}] Serving from: ${servingDir}${nestedPrefix ? ` (nested: ${nestedPrefix})` : ""}`);

  // Use express.static to serve all files from the serving directory
  const staticMiddleware = express.static(servingDir, {
    index: false, // We handle index.html manually
    extensions: ["html", "htm"],
  });

  return staticMiddleware(req, res, () => {
    // express.static 404'd - check if this is a request for index.html or SPA routing
    const isIndexRequest = 
      req.path === "/" || 
      req.path === "" || 
      req.path === "/index.html" ||
      (!req.path.includes("."));

    if (isIndexRequest) {
      let htmlPath = null;
      
      // Try to find index.html
      if (!htmlPath) {
        const indexPath = path.join(servingDir, "index.html");
        if (fs.existsSync(indexPath)) {
          htmlPath = indexPath;
        }
      }

      // Try to find nested HTML if we have a nested prefix
      if (!htmlPath && nestedPrefix) {
        const nestedDir = path.join(servingDir, nestedPrefix);
        const nestedIndexPath = path.join(nestedDir, "index.html");
        if (fs.existsSync(nestedIndexPath)) {
          htmlPath = nestedIndexPath;
        } else {
          // Find first HTML in nested directory
          const htmlFiles = fs.readdirSync(nestedDir).filter(f => f.endsWith(".html"));
          if (htmlFiles.length > 0) {
            htmlPath = path.join(nestedDir, htmlFiles[0]);
          }
        }
      }

      // Try to find any HTML file recursively
      if (!htmlPath) {
        htmlPath = findFirstHtml(servingDir);
      }

      if (htmlPath) {
        try {
          let html = fs.readFileSync(htmlPath, "utf8");

          // If serving from a nested directory, rewrite relative asset paths
          if (nestedPrefix) {
            // Rewrite relative href/src to include nested prefix
            // Convert href="Breakfast.css" to href="Food Website/Breakfast.css"
            // But don't touch absolute paths or external URLs
            html = html.replace(
              /(href|src)=(["'])(?!https?:\/\/|\/\/|\/|data:)([^"']+)\2/g,
              (match, attr, quote, value) => {
                // Skip if already has the prefix or has leading /
                if (value.startsWith(nestedPrefix) || value.startsWith("/")) {
                  return match;
                }
                // Skip relative imports like ../something
                if (value.startsWith("..")) {
                  return match;
                }
                return `${attr}=${quote}${nestedPrefix}/${value}${quote}`;
              }
            );
          }

          // Also convert absolute paths to relative
          html = html.replace(/(href|src)=(["'])\/((?!http|\/\/)[^"']+)\2/g, "$1=$2$3$2");

          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache, must-revalidate");
          return res.send(html);
        } catch (e) {
          console.error(`Error serving HTML:`, e.message);
        }
      }
    }

    // File not found
    return res.status(404).send(`
      <h1>❌ File Not Found: ${req.path}</h1>
      <p>Deployment: ${siteId}</p>
    `);
  });
});

/* ===============================
   SPA FALLBACK ROUTES
   1. /sites/:siteId/* → serve that deployment's index.html
   2. /* → serve latest deployment's index.html
================================ */

// Fallback for specific deployment SPA routing
app.get("/sites/:siteId/*", (req, res) => {
  const siteId = req.params.siteId;
  const sitePath = path.join(DEPLOY_DIR, siteId);

  // Try different possible index.html locations
  const possibleIndexPaths = [
    path.join(sitePath, "dist", "index.html"),
    path.join(sitePath, "dist", "client", "dist", "index.html"),
    path.join(sitePath, "client", "dist", "index.html"),
    path.join(sitePath, "index.html"),
    // Check subdirectories for old-style deployments
    ...fs
      .readdirSync(sitePath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(sitePath, entry.name, "index.html")),
  ];

  for (const indexPath of possibleIndexPaths) {
    if (fs.existsSync(indexPath)) {
      console.log(`✅ Serving SPA fallback for /sites/${siteId}`);
      return res.sendFile(indexPath);
    }
  }

  res.status(404).send(`Deployment ${siteId} not found`);
});

// Fallback for root SPA routing
app.get("*", (req, res) => {
  const latestDeploymentId = getLatestDeployment();

  if (!latestDeploymentId) {
    return res.status(404).send("No deployment found");
  }

  // Try different possible index.html locations
  const sitePath = path.join(DEPLOY_DIR, latestDeploymentId);
  const possibleIndexPaths = [
    path.join(sitePath, "dist", "index.html"),
    path.join(sitePath, "dist", "client", "dist", "index.html"),
    path.join(sitePath, "client", "dist", "index.html"),
    path.join(sitePath, "index.html"),
  ];

  for (const indexPath of possibleIndexPaths) {
    if (fs.existsSync(indexPath)) {
      console.log(`✅ Serving SPA fallback for latest deployment`);
      try {
        let html = fs.readFileSync(indexPath, "utf8");
        // ✅ Fix asset paths for proper loading
        html = html.replace(
          /(href|src)=(["'])\/((?!http|\/\/)[^"']+)\2/g,
          "$1=$2$3$2",
        );
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
        return res.send(html);
      } catch (err) {
        return res.status(500).send("Error reading index.html");
      }
    }
  }

  res.status(404).send("Application not found");
});

/* ===============================
   FAVICON HANDLER (prevent 404 spam)
================================ */
app.get("/favicon.ico", (req, res) => {
  res.status(204).end(); // No content
});

/* ===============================
   HEALTH CHECK
================================ */
app.get("/health", (_, res) => {
  res.json({ status: "Backend running" });
});

// Quick test endpoint to verify email sending (POST body: { to, subject, html })
app.post("/api/test-email", async (req, res) => {
  try {
    const { to, subject, html } = req.body || {};
    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Provide to, subject, and html in request body" });
    }

    const result = await emailService.sendEmail(to, subject, html);
    if (result && result.success) return res.json({ success: true });
    return res.status(500).json({ success: false, error: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ===============================
   START SERVER
================================ */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
