// ==========================
// IMPORTS
// ==========================
const express = require("express");
const http = require("http"); // Or https if you want SSL
const { Server } = require("socket.io");
const mysql = require("mysql2");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// ==========================
// APP + SERVER
// ==========================
const app = express();
const PORT = 65002; // Use the port you mentioned

// ==========================
// MIDDLEWARE
// ==========================
app.use(cors({
  origin: "http://localhost:5173", // Frontend origin
  credentials: true,
}));
app.use(express.json());

// ==========================
// DATABASE CONNECTION
// ==========================
const db = mysql.createPool({
  host: "76.13.178.211",
  port: 65002,
  user: "u984996977",
  password: "1oyy+gdpBEm=",
  database: "u984996977_betatest",
  waitForConnections: true,
  connectionLimit: 10,
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
      console.error("Database error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    res.json({ success: true, data: results });
  });
});

// ==========================
// SOCKET.IO
// ==========================
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://betatest.actioncenteres.org",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("fetch_users", () => {
    const query = `
      SELECT dt_google_name, dt_google_email, dt_external_id, dt_date_added
      FROM tbl_user_account_main
    `;
    db.query(query, (err, results) => {
      if (err) {
        console.error("Database error:", err);
        socket.emit("users_data", []);
      } else {
        socket.emit("users_data", results);
      }
    });
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// ==========================
// START SERVER
// ==========================
server.listen(PORT, () => {
  console.log(`Server running on https://betatest.actioncenteres.org:${PORT}`);
});
