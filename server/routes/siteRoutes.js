const router = require("express").Router();
const auth = require("../middleware/authMiddleware");

// ⬇️ IMPORT YOUR EXISTING CONTROLLER FILE (FIXED NAME)
const {
  getSites,
  deleteSite,
  redeploySite,
  getDeployLogs,
} = require("../controllers/deploy.controller");

/*
  🔐 All routes below are protected by JWT middleware
*/

// Get all sites (user-specific)
router.get("/", auth, getSites);

// Delete a site (owner only)
router.delete("/:id", auth, deleteSite);

// Redeploy a site (owner only)
router.post("/:id/redeploy", auth, redeploySite);

// Get deploy logs (owner only)
router.get("/:id/logs", auth, getDeployLogs);

module.exports = router;
