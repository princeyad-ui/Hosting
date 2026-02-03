const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const { readDB, writeDB } = require("../utils/db");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleLogin = async (req, res) => {
  const { credential } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    const db = readDB();
    if (!db.users) db.users = [];

    let user = db.users.find(u => u.email === email);

    if (!user) {
      user = {
        id: `user-${Date.now()}`,
        name,
        email,
        password: null,
        emailNotifications: true,
        deploymentAlerts: true,
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);
      writeDB(db);
    }

    // 🔐 CREATE JWT (ONLY ADDITION)
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Google authentication failed" });
  }
};
