const billingService = require("../modules/billing/billing.service");
const { readDB, writeDB } = require("../utils/db");

// Fixed storage per deployment
const STORAGE_PER_PROJECT_MB = 40;
const FREE_LIMIT_MB = 200;

/**
 * Enforce billing rules after build
 */
exports.enforceBilling = ({
  userId,
  siteId,
  distDir,
}) => {
  // 1️⃣ Fixed project size: 40MB per deployment
  const projectSizeMB = STORAGE_PER_PROJECT_MB;

  // 2️⃣ Get current user usage (all Live sites except this one)
  // COUNT them: each Live project = 40MB (regardless of actual folder size)
  const db = readDB();
  const userSites = db.sites.filter(
    s => s.userId === userId && s.status === "Live" && s.id !== siteId
  );

  // Calculate based on COUNT: each project = 40MB
  const currentUsageMB = userSites.length * STORAGE_PER_PROJECT_MB;

  console.log("🔍 DEBUG enforceBilling - Found user sites:", {
    userId,
    siteId,
    liveCount: userSites.length,
    calculatedAsEachProject: STORAGE_PER_PROJECT_MB,
    totalCurrentUsageMB: currentUsageMB,
  });

  console.log("🔍 DEBUG: Current usage calculation:", {
    liveProjects: userSites.length,
    eachProjectMB: STORAGE_PER_PROJECT_MB,
    currentUsageMB,
    projectSizeMB,
    totalAfterDeploy: currentUsageMB + projectSizeMB,
    freeLimitMB: FREE_LIMIT_MB,
  });

  // 3️⃣ Check billing rule
  const requiresPayment = billingService.requiresPayment({
    currentUsageMB,
    projectSizeMB,
  });

  // 4️⃣ Log billing calculation
  console.log("📊 BILLING CHECK:", {
    userId,
    siteId,
    projectSizeMB,
    currentUsageMB,
    totalAfterDeployMB: currentUsageMB + projectSizeMB,
    freeLimitMB: FREE_LIMIT_MB,
    requiresPayment,
  });

  // 5️⃣ Persist fixed 40MB size
  const site = db.sites.find(s => s.id === siteId);
  if (site) {
    site.storageMB = projectSizeMB;
    writeDB(db);
  }

  return {
    requiresPayment,
    projectSizeMB,
    currentUsageMB,
  };
};
