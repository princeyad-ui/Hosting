const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const { deployReactApp } = require("../controllers/reactDeploy.controller");


const {
  deployFromGithub,
  getDeployLogs,
  redeploySite,
} = require("../controllers/deploy.controller");

// 🔐 PROTECTED DEPLOY ROUTES

router.post("/api/deploy/github", auth, deployFromGithub);
router.get("/api/deploy/:id/logs", auth, getDeployLogs);
router.post("/api/deploy/:id/redeploy", auth, redeploySite);
router.post("/api/deploy/react", deployReactApp);
module.exports = router;
