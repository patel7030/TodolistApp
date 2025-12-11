// app.js
import mysql from "mysql2/promise";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Prefer connection string if provided.
const MYSQL_URL = process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL;

// Helper to build config when URL not present
function buildConfigFromParts() {
  return {
    host: process.env.MYSQL_HOST || process.env.MYSQLHOST,
    user: process.env.MYSQL_USER || process.env.MYSQLUSER,
    password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD,
    database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE,
    port: (() => {
      const p = process.env.MYSQL_PORT || process.env.MYSQLPORT;
      return p ? Number(p) : undefined;
    })(),
    // Optional: add connectTimeout, etc.
  };
}

let db;
async function initDb() {
  try {
    if (MYSQL_URL) {
      // mysql2 supports passing connection string directly
      db = await mysql.createConnection(MYSQL_URL);
    } else {
      const cfg = buildConfigFromParts();
      db = await mysql.createConnection(cfg);
    }
    console.log("MySQL connected successfully");
  } catch (err) {
    console.error("MySQL connection error:", err?.message || err);
    // Exit so Railway can restart the container and you can see the failure in logs
    process.exit(1);
  }
}

/* Health check */
app.get("/", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

/* API: Get todos */
app.get("/todos", async (req, res) => {
  const user_id = req.query.user_id;
  const filter = req.query.status;

  if (!user_id) return res.status(400).json({ error: "user_id is required" });

  try {
    let query = "SELECT * FROM todos WHERE user_id = ? AND status != 'deleted'";
    const params = [user_id];
    if (filter) {
      query += " AND status = ?";
      params.push(filter);
    }
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /todos error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch todos" });
  }
});

/* API: Add todo */
app.post("/todos", async (req, res) => {
  const { task, user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: "user_id is required" });
  if (!task) return res.status(400).json({ error: "task is required" });

  try {
    await db.query("INSERT INTO todos (task, status, user_id) VALUES (?, 'active', ?)", [task, user_id]);
    res.json({ message: "Todo added!" });
  } catch (err) {
    console.error("POST /todos error:", err?.message || err);
    res.status(500).json({ error: "Insert failed" });
  }
});

/* API: Update todo */
app.put("/todos/:id", async (req, res) => {
  const { id } = req.params;
  const { status, task } = req.body;

  if (!id) return res.status(400).json({ error: "id is required" });

  try {
    if (status) await db.query("UPDATE todos SET status = ? WHERE id = ?", [status, id]);
    if (task) await db.query("UPDATE todos SET task = ? WHERE id = ?", [task, id]);
    res.json({ message: "Todo updated!" });
  } catch (err) {
    console.error("PUT /todos/:id error:", err?.message || err);
    res.status(500).json({ error: "Update failed" });
  }
});

/* API: Soft delete */
app.delete("/todos/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "id is required" });

  try {
    await db.query("UPDATE todos SET status = 'deleted' WHERE id = ?", [id]);
    res.json({ message: "Todo deleted!" });
  } catch (err) {
    console.error("DELETE /todos/:id error:", err?.message || err);
    res.status(500).json({ error: "Delete failed" });
  }
});

/* Start server after DB init */
const PORT = process.env.PORT || 5000;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
