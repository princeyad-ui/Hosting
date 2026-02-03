const router = require("express").Router();
const googleAuth = require("../controllers/googleAuthController");

router.post("/google", googleAuth.googleLogin);

module.exports = router;
