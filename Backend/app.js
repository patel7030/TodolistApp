// server.js
import mysql from "mysql2/promise";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MySQL connection
const db = await mysql.createConnection({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQL_DATABASE,
    // uri: process.env.MYSQL_URL
    port: Number(process.env.MYSQLPORT)
});

console.log("MySQL connected successfully");


// Get todos for a specific user
app.get("/todos", async(req, res) => {
    const user_id = req.query.user_id; // required
    const filter = req.query.status;

    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    let query = "SELECT * FROM todos WHERE user_id = ? AND status != 'deleted'";
    let params = [user_id];

    if (filter) {
        query += " AND status = ?";
        params.push(filter);
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
});


// Add todo for a user
app.post("/todos", async(req, res) => {
    const { task, user_id } = req.body;

    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    await db.query(
        "INSERT INTO todos (task, status, user_id) VALUES (?, 'active', ?)", [task, user_id]
    );

    res.json({ message: "Todo added!" });
});


// Update todo
app.put("/todos/:id", async(req, res) => {
    const { id } = req.params;
    const { status, task } = req.body;

    try {
        if (status) {
            await db.query("UPDATE todos SET status = ? WHERE id = ?", [status, id]);
        }
        if (task) {
            await db.query("UPDATE todos SET task = ? WHERE id = ?", [task, id]);
        }
        res.json({ message: "Todo updated!" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Update failed" });
    }
});


// Soft delete
app.delete("/todos/:id", async(req, res) => {
    const { id } = req.params;

    await db.query("UPDATE todos SET status = 'deleted' WHERE id = ?", [id]);

    res.json({ message: "Todo deleted!" });
});

app.listen(5000, () => console.log(process.env.MYSQLHOST));
app.get("/", (req, res) => res.send("MYSQLHOST!"));
