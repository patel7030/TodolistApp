// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

let pool;

async function connectDB() {
  try {
    const rawDbUrl = process.env.DATABASE_URL?.trim();

    // If DATABASE_URL looks like Railway template (not expanded), ignore it.
    const isTemplateLiteral = rawDbUrl && rawDbUrl.startsWith("${{");

    if (rawDbUrl && !isTemplateLiteral) {
      // Use DATABASE_URL directly (expanded full URL)
      console.log("Using DATABASE_URL (expanded).");
      // mysql2 accepts a connection string argument
      pool = mysql.createPool(rawDbUrl);
    } else {
      // Fallback to explicit env vars
      console.log("DATABASE_URL missing or template literal — falling back to individual env vars.");
      const host = process.env.MYSQLHOST;
      const user = process.env.MYSQLUSER;
      const password = process.env.MYSQLPASSWORD;
      const database = process.env.MYSQL_DATABASE;
      const port = process.env.MYSQLPORT ? Number(process.env.MYSQLPORT) : undefined;

      if (!host || !user || !password || !database) {
        console.error("Missing DB configuration. Set DATABASE_URL (expanded) OR MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQL_DATABASE.");
        process.exit(1);
      }

      pool = mysql.createPool({
        host,
        user,
        password,
        database,
        port,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
    }

    // quick test connection
    const conn = await pool.getConnection();
    conn.release();
    console.log("✅ MySQL pool initialized");
  } catch (err) {
    console.error("❌ Failed to connect to MySQL:", err);
    process.exit(1);
  }
}

await connectDB();

// Routes
app.get("/", (req, res) => res.send("Backend running"));

app.get("/todos", async (req, res) => {
  try {
    const user_id = req.query.user_id;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const filter = req.query.status;
    let sql = "SELECT * FROM todos WHERE user_id = ? AND status != 'deleted'";
    const params = [user_id];
    if (filter) {
      sql += " AND status = ?";
      params.push(filter);
    }
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /todos error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// other routes omitted for brevity — re-add your POST/PUT/DELETE as needed

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on ${PORT}`);
});
