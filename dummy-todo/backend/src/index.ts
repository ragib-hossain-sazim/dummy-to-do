import express, { Request, Response } from "express";
import cors from "cors";
import { Pool } from "pg";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.POSTGRES_HOST || "db",
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "postgres",
  database: process.env.POSTGRES_DB || "todos",
  port: 5432
});

async function initialize() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL
    );
  `);
}

app.get("/todos", async (_req: Request, res: Response) => {
  const result = await pool.query("SELECT * FROM todos ORDER BY id DESC");
  res.json(result.rows);
});

app.post("/todos", async (req: Request, res: Response) => {
  const { title } = req.body;
  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "Title is required" });
  }
  await pool.query("INSERT INTO todos (title) VALUES ($1)", [title]);
  res.status(201).send("Todo created");
});

app.listen(PORT, async () => {
  await initialize();
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
