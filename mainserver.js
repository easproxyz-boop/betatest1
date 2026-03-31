require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// ✅ ENV VALIDATION
if (!process.env.DB_HOST) {
  throw new Error("❌ Missing DB ENV variables");
}

// ==========================
// CORS
// ==========================
const allowedOrigins = [
  "http://localhost:5173",
  "https://betatest.actioncenteres.org"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// ==========================
// SOCKET.IO
// ==========================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// ==========================
// DATABASE
// ==========================
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// ✅ REUSABLE QUERY
const getUsers = (callback) => {
  const query = `
    SELECT 
      dt_num, dt_google_id, dt_resident_id, dt_household_id, 
      dt_household_head, dt_present_firstname, 
      dt_present_middlename, dt_present_lastname, dt_present_suffix
    FROM tbl_1_residency_profile_info WHERE 1 LIMIT 2000
  `;

  db.query(query, callback);
};

// ==========================
// REST API
// ==========================
app.get("/api/users", (req, res) => {
  getUsers((err, results) => {
    if (err) {
      return res.status(500).json({ success: false });
    }
    res.json({ success: true, data: results });
  });
});

// ==========================
// SOCKET
// ==========================
io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  socket.on("fetch_users", () => {
    getUsers((err, results) => {
      if (err) {
        socket.emit("users_data", []);
      } else {
        socket.emit("users_data", results);
      }
    });
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
  });
});

// ==========================
// START
// ==========================
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Running on port ${PORT}`);
});