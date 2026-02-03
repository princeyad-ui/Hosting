const jwt = require("jsonwebtoken");
const { readDB } = require("../utils/db");

exports.login = (req, res) => {
  const { email, password } = req.body;
  const db = readDB();

  const user = db.users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // 🔐 CREATE JWT
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
};
