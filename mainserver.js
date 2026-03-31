// ==========================
// IMPORTS
// ==========================
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mysql = require("mysql2");
const cors = require("cors");

// ==========================
// APP + SERVER
// ==========================
const app = express();
const server = http.createServer(app);

// Important for working behind Hostinger reverse proxy / HTTPS
app.set("trust proxy", 1);

// ==========================
// SOCKET.IO
// ==========================
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all domains for testing; later restrict to frontend domain
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ==========================
// MIDDLEWARE
// ==========================
app.use(cors({
  origin: "*", // Allow all domains; later replace with frontend URL
  credentials: true,
}));
app.use(express.json());

// ==========================
// DATABASE CONNECTION
// ==========================
// On Hostinger Cloud, use 'localhost' instead of public IP
const db = mysql.createPool({
  host: "localhost", // Internal connection
  user: "u984996977_betatest",
  password: "1oyy+gdpBEm=",
  database: "u984996977_betatest",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Optional: Test the DB connection
db.getConnection((err, connection) => {
  if (err) {
    console.error("MySQL connection error:", err);
  } else {
    console.log("MySQL connected!");
    connection.release();
  }
});

// ==========================
// REST API
// ==========================
app.get("/api/users", (req, res) => {
  const query = `
    SELECT dt_google_name, dt_google_email, dt_external_id, dt_date_added
    FROM tbl_user_account_main
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error("DB query error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    res.json({ success: true, data: results });
  });
});

// ==========================
// SOCKET.IO EVENTS
// ==========================
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("fetch_users", () => {
    const query = `
      SELECT dt_google_name, dt_google_email, dt_external_id, dt_date_added
      FROM tbl_user_account_main
    `;
    db.query(query, (err, results) => {
      if (err) {
        console.error("DB query error (socket):", err);
        socket.emit("users_data", []);
      } else {
        socket.emit("users_data", results);
      }
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 3000; // Use env PORT set by Hostinger
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});