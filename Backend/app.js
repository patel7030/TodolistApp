// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --------------------------
//  CHECK DATABASE_URL
// --------------------------
if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL is missing in Railway Variables");
  process.exit(1);
}

// --------------------------
//  CONNECT MYSQL USING Railway URL
// --------------------------
let pool;

async function connectDB() {
  try {
    pool = mysql.createPool(process.env.DATABASE_URL + "?sslmode=disable&connectionLimit=10");
    const conn = await pool.getConnection();
    conn.release();
    console.log("✅ Connected to MySQL using DATABASE_URL");
  } catch (err) {
    console.error("❌ Failed to connect to MySQL:", err);
    process.exit(1);
  }
}

await connectDB();

// --------------------------
//  ROUTES
// --------------------------

app.get("/", (req, res) => {
  res.send("Backend is running and DB connected!");
});

// Get todos
app.get("/todos", async (req, res) => {
  try {
    const user_id = req.query.user_id;
    const filter = req.query.status;

    if (!user_id) return res.status(400).json({ error: "user_id is required" });

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

// Add todo
app.post("/todos", async (req, res) => {
  try {
    const { task, user_id } = req.body;

    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    await pool.query(
      "INSERT INTO todos (task, status, user_id) VALUES (?, 'active', ?)",
      [task, user_id]
    );

    res.json({ message: "Todo added!" });
  } catch (err) {
    console.error("POST /todos error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update todo
app.put("/todos/:id", async (req, res) => {
  try {
    const { status, task } = req.body;
    const { id } = req.params;

    if (status)
      await pool.query("UPDATE todos SET status = ? WHERE id = ?", [status, id]);

    if (task)
      await pool.query("UPDATE todos SET task = ? WHERE id = ?", [task, id]);

    res.json({ message: "Todo updated!" });
  } catch (err) {
    console.error("PUT /todos error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Soft delete
app.delete("/todos/:id", async (req, res) => {
  try {
    await pool.query("UPDATE todos SET status = 'deleted' WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ message: "Todo deleted!" });
  } catch (err) {
    console.error("DELETE /todos error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --------------------------
//  START SERVER
// --------------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on PORT ${PORT}`);
});
