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

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite frontend
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ==========================
// MIDDLEWARE
// ==========================
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// ==========================
// DATABASE CONNECTION
// ==========================
const db = mysql.createPool({
  host: "localhost",
  user: "u984996977_betatest",
  password: "1oyy+gdpBEm=", // MySQL password
  database: "u984996977_betatest",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
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
      console.error(err);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    res.json({ success: true, data: results });
  });
});

// ==========================
// SOCKET.IO
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
        console.error(err);
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
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});