// ==========================
// IMPORTS
// ==========================
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mysql = require("mysql2");
const cors = require("cors");

// ==========================
// APP + SERVER
// ==========================
const app = express();
const PORT = 3000;
const server = http.createServer(app);

// Allowed Origins
const allowedOrigins = [
  "http://localhost:5173",
  "https://betatest.actioncenteres.org"
];

// ==========================
// SOCKET.IO
// ==========================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ==========================
// MIDDLEWARE
// ==========================

// Better CORS handling
app.use(cors({
  origin: (origin, callback) => {
    // allow non-browser tools (like Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.error("Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(express.json());

// if using reverse proxy (nginx/cloudflare)
app.set("trust proxy", 1);

// ==========================
// DATABASE CONNECTION
// ==========================
const db = mysql.createPool({
  host:"148.222.53.46",
  user:"u984996977_betatest",
  password:"#Zyqsxftt030199",
  database:"u984996977_betatest",
  waitForConnections: true,
  connectionLimit: 10,
});

// Optional: test DB connection
db.getConnection((err, conn) => {
  if (err) {
    console.error("❌ DB Connection failed:", err.message);
  } else {
    console.log("DB Connected");
    conn.release();
  }
});

// ==========================
// REST API
// ==========================
app.get("/api/users", (req, res) => {
  const query = `
    SELECT dt_num, dt_google_id, dt_resident_id, dt_household_id, dt_household_head, dt_present_firstname, dt_present_middlename, dt_present_lastname, dt_present_suffix
    FROM tbl_1_residency_profile_info WHERE 1 LIMIT 10
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error"
      });
    }

    res.json({
      success: true,
      data: results
    });
  });
});

// ==========================
// SOCKET.IO
// ==========================
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("fetch_users", () => {
    const query = `
    SELECT dt_num, dt_google_id, dt_resident_id, dt_household_id, dt_household_head, dt_present_firstname, dt_present_middlename, dt_present_lastname, dt_present_suffix
    FROM tbl_1_residency_profile_info WHERE 1 LIMIT 10
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
    console.log("❌ Client disconnected:", socket.id);
  });
});

// ==========================
// START SERVER
// ==========================

// IMPORTANT: allow external access
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});