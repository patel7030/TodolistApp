"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [todos, setTodos] = useState([]);
  const [task, setTask] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | completed

  // Generate unique user ID on first visit
  useEffect(() => {
    if (!localStorage.getItem("uid")) {
      localStorage.setItem("uid", "user-" + Date.now());
    }
  }, []);

  const user_id =
    typeof window !== "undefined" ? localStorage.getItem("uid") : null;

  // Load todos
  const loadTodos = async (status) => {
    if (!user_id) return;

    let url = `http://localhost:5000/todos?user_id=${user_id}`;
    if (status && status !== "all") url += `&status=${status}`;

    const res = await fetch(url);
    const data = await res.json();
    setTodos(data);
  };

  useEffect(() => {
    if (user_id) loadTodos();
  }, [user_id]);

  const addTodo = async () => {
    if (!task.trim()) return;

    await fetch("http://localhost:5000/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, user_id }),
    });

    setTask("");
    loadTodos(filter);
  };

  const deleteTodo = async (id) => {
    await fetch(`http://localhost:5000/todos/${id}`, { method: "DELETE" });
    loadTodos(filter);
  };

  const completeTodo = async (id) => {
    await fetch(`http://localhost:5000/todos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });

    loadTodos(filter);
  };

  const editTodo = async (id, oldTask) => {
    const newTask = prompt("Edit your task:", oldTask);
    if (!newTask) return;

    await fetch(`http://localhost:5000/todos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: newTask }),
    });

    loadTodos(filter);
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") return todo.status === "active";
    if (filter === "completed") return todo.status === "completed";
    return true;
  });

  return (
    <main
      style={{
        padding: "20px",
        maxWidth: "500px",
        margin: "auto",
        fontFamily: "sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Heading */}
      <h1
        style={{
          textAlign: "center",
          marginBottom: "20px",
          fontSize: "32px",
        }}
      >
        📋 My To Do List
      </h1>

      {/* Input */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <input
          type="text"
          placeholder="Enter todo"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />
        <button
          onClick={addTodo}
          style={{
            background: "#2563eb",
            color: "white",
            padding: "10px 18px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          justifyContent: "center",
          marginBottom: "20px",
          fontSize: "18px",
        }}
      >
        {["all", "active", "completed"].map((tab) => (
          <span
            key={tab}
            onClick={() => {
              setFilter(tab);
              loadTodos(tab);
            }}
            style={{
              cursor: "pointer",
              textDecoration: filter === tab ? "underline" : "none",
              color: filter === tab ? "white" : "red",
              fontWeight: filter === tab ? "600" : "400",
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </span>
        ))}
      </div>

      {/* Todo Cards */}
      {filteredTodos.map((todo) => (
        <div
          key={todo.id}
          style={{
            background: "white",
            color: "black",
            padding: "15px",
            borderRadius: "10px",
            marginBottom: "15px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
          }}
        >
          <b style={{ fontSize: "18px" }}>{todo.task}</b>

          <p style={{ margin: "5px 0", color: "#666" }}>{todo.date}</p>
          <p style={{ margin: "0 0 10px 0", color: "#444" }}>
            Status : {todo.status}
          </p>

          {/* --- BUTTONS IN ONE ROW --- */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            {/* Edit + Complete only for ACTIVE */}
            {todo.status === "active" && (
              <>
                <button
                  onClick={() => editTodo(todo.id, todo.task)}
                  style={{
                    flex: 1,
                    background: "#2563eb",
                    color: "white",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Edit
                </button>

                <button
                  onClick={() => completeTodo(todo.id)}
                  style={{
                    flex: 1,
                    background: "green",
                    color: "white",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Completed
                </button>
              </>
            )}

            {/* DELETE always visible */}
            <button
              onClick={() => deleteTodo(todo.id)}
              style={{
                flex: 1,
                background: "red",
                color: "white",
                padding: "8px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </main>
  );
}
