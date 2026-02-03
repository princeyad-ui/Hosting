const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../db.json");

exports.readDB = () =>
  JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

exports.writeDB = (data) =>
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
