const { readDB, writeDB } = require("../utils/db");

/* GET current user */
exports.getMe = (req, res) => {
  const db = readDB();

  if (!db.users || !db.users[0]) {
    return res.json({
      name: "",
      email: "",
      emailNotifications: false,
      deploymentAlerts: false,
    });
  }

  res.json(db.users[0]);
};



/* UPDATE profile */
exports.updateProfile = (req, res) => {
  const { name, email } = req.body;
  const db = readDB();

  // ✅ Ensure users array exists
  if (!db.users) {
    db.users = [];
  }

  // ✅ If no user exists, CREATE one
  if (!db.users[0]) {
    db.users[0] = {
      id: "user-1",
      name: name || "",
      email: email || "",
      password: "",
      emailNotifications: true,
      deploymentAlerts: true,
      createdAt: new Date().toISOString(),
    };
  } else {
    // ✅ Update existing user
    if (name !== undefined) db.users[0].name = name;
    if (email !== undefined) db.users[0].email = email;
  }

  writeDB(db);
  res.json({ success: true });
};

/* UPDATE preferences */
exports.updatePreferences = (req, res) => {
  const { emailNotifications, deploymentAlerts } = req.body;
  const db = readDB();

  db.users[0].emailNotifications = emailNotifications;
  db.users[0].deploymentAlerts = deploymentAlerts;

  writeDB(db);
  res.json({ success: true });
};

/* UPDATE password */
exports.updatePassword = (req, res) => {
  const { password } = req.body;
  const db = readDB();

  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  // ensure user exists
  if (!db.users || !db.users[0]) {
    return res.status(400).json({ error: "User not found" });
  }

  db.users[0].password = password;
  writeDB(db);

  res.json({ success: true });
};


/* DELETE account */
exports.deleteAccount = (req, res) => {
  const db = readDB();
  db.users = [];
  writeDB(db);

  res.json({ success: true });
};

/* GET storage info */
exports.getStorageInfo = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const db = readDB();
  const STORAGE_PER_PROJECT_MB = 40;
  const FREE_LIMIT_MB = 200;

  // Get all live sites for this user
  const userSites = db.sites.filter(
    s => s.userId === req.user.id && s.status === "Live"
  );

  const usedStorageMB = userSites.length * STORAGE_PER_PROJECT_MB;
  const remainingStorageMB = Math.max(0, FREE_LIMIT_MB - usedStorageMB);
  const requiresPayment = usedStorageMB >= FREE_LIMIT_MB;

  res.json({
    usedStorageMB,
    totalFreeLimitMB: FREE_LIMIT_MB,
    remainingStorageMB,
    requiresPayment,
    projectCount: userSites.length,
    storagePerProjectMB: STORAGE_PER_PROJECT_MB,
  });
};
