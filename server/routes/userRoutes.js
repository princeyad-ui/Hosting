const router = require("express").Router();
const user = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/me", user.getMe);
router.put("/profile", user.updateProfile);
router.put("/preferences", user.updatePreferences);
router.put("/password", user.updatePassword);
router.delete("/", user.deleteAccount);
router.get("/storage-info", authMiddleware, user.getStorageInfo);

module.exports = router;
