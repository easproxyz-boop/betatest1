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

const allowedOrigins = [
  "http://localhost:5173",
  "https://betatest.actioncenteres.org"
];

// ==========================
// MIDDLEWARE
// ==========================
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());
app.set("trust proxy", 1);

// ==========================
// DATABASE CONNECTION
// ==========================
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20, // increase for bigger load
});

// Test connection
db.getConnection((err, conn) => {
  if (err) console.error("❌ DB Connection failed:", err.message);
  else {
    console.log("✅ DB Connected");
    conn.release();
  }
});

// ==========================
// REST API WITH PAGINATION + FILTER
// ==========================
app.get("/api/users", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 50;
  const search = req.query.search || "";

  const offset = (page - 1) * pageSize;

  const params = [];
  let whereClause = "";

  if (search) {
    whereClause = `WHERE dt_google_name LIKE ? OR dt_google_email LIKE ? OR dt_external_id LIKE ?`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const query = `
    SELECT dt_google_name, dt_google_email, dt_external_id, dt_date_added
    FROM tbl_user_account_main
    ${whereClause}
    ORDER BY dt_date_added DESC
    LIMIT ? OFFSET ?
  `;

  params.push(pageSize, offset);

  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM tbl_user_account_main
      ${whereClause}
    `;
    db.query(countQuery, params.slice(0, params.length - 2), (err2, countResult) => {
      if (err2) {
        console.error("Count query error:", err2);
        return res.status(500).json({ success: false, message: "Database error" });
      }

      res.json({
        success: true,
        data: results,
        page,
        pageSize,
        total: countResult[0].total
      });
    });
  });
});

// ==========================
// SOCKET.IO WITH PAGINATION
// ==========================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("fetch_users", (payload) => {
    const page = payload.page || 1;
    const pageSize = payload.pageSize || 50;
    const search = payload.search || "";

    const offset = (page - 1) * pageSize;
    const params = [];
    let whereClause = "";

    if (search) {
      whereClause = `WHERE dt_google_name LIKE ? OR dt_google_email LIKE ? OR dt_external_id LIKE ?`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const query = `
      SELECT dt_google_name, dt_google_email, dt_external_id, dt_date_added
      FROM tbl_user_account_main
      ${whereClause}
      ORDER BY dt_date_added DESC
      LIMIT ? OFFSET ?
    `;
    params.push(pageSize, offset);

    db.query(query, params, (err, results) => {
      if (err) {
        console.error("Database error:", err);
        socket.emit("users_data", { success: false, data: [], page, pageSize, total: 0 });
        return;
      }

      const countQuery = `
        SELECT COUNT(*) AS total
        FROM tbl_user_account_main
        ${whereClause}
      `;
      db.query(countQuery, params.slice(0, params.length - 2), (err2, countResult) => {
        if (err2) {
          console.error("Count query error:", err2);
          socket.emit("users_data", { success: false, data: [], page, pageSize, total: 0 });
          return;
        }

        socket.emit("users_data", {
          success: true,
          data: results,
          page,
          pageSize,
          total: countResult[0].total,
        });
      });
    });
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// ==========================
// START SERVER
// ==========================
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});