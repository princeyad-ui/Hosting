// debug-fetch.js
const http = require("http");

const options = {
  hostname: "localhost",
  port: 5000,
  path: "/api/sessions",
  method: "GET",
  headers: { "Accept": "application/json" }
};

const req = http.request(options, (res) => {
  console.log("STATUS:", res.statusCode);
  console.log("HEADERS:", res.headers);
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => {
    console.log("BODY:");
    console.log(data);
  });
});

req.on("error", (e) => {
  console.error("ERROR:", e.message);
});
req.end();
