import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("helpdesk.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    login TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('colaborador', 'tecnico', 'admin')) NOT NULL,
    sector TEXT NOT NULL,
    extension TEXT NOT NULL,
    is_first_login BOOLEAN DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER,
    requester_name TEXT,
    sector TEXT,
    technician_id INTEGER,
    category_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    urgency TEXT CHECK(urgency IN ('baixa', 'media', 'alta')) DEFAULT 'baixa',
    extension TEXT,
    status TEXT CHECK(status IN ('pending', 'in_progress', 'on_hold', 'finished')) DEFAULT 'pending',
    hold_justification TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    FOREIGN KEY (requester_id) REFERENCES users(id),
    FOREIGN KEY (technician_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS sectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ticket_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    changed_by INTEGER NOT NULL,
    comment TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
  );
`);

// Migration: Ensure 'login' and 'is_first_login' columns exist
const tableInfo = db.pragma("table_info(users)") as any[];
const hasLogin = tableInfo.some(col => col.name === 'login');
const hasEmail = tableInfo.some(col => col.name === 'email');
const hasIsFirstLogin = tableInfo.some(col => col.name === 'is_first_login');

if (!hasLogin) {
  try {
    if (hasEmail) {
      db.exec("ALTER TABLE users RENAME COLUMN email TO login");
      console.log("Migration: Renamed 'email' column to 'login' in users table.");
    } else {
      db.exec("ALTER TABLE users ADD COLUMN login TEXT UNIQUE NOT NULL DEFAULT ''");
      console.log("Migration: Added 'login' column to users table.");
    }
  } catch (err) {
    console.error("Migration failed (login):", err);
  }
}

if (!hasIsFirstLogin) {
  try {
    db.exec("ALTER TABLE users ADD COLUMN is_first_login BOOLEAN DEFAULT 1");
    console.log("Migration: Added 'is_first_login' column to users table.");
  } catch (err) {
    console.error("Migration failed (is_first_login):", err);
  }
}

// Migration: Ensure tickets has urgency and extension
const ticketInfo = db.pragma("table_info(tickets)") as any[];
const hasUrgency = ticketInfo.some(col => col.name === 'urgency');
const hasTicketExtension = ticketInfo.some(col => col.name === 'extension');

if (!hasUrgency) {
  try {
    db.exec("ALTER TABLE tickets ADD COLUMN urgency TEXT CHECK(urgency IN ('baixa', 'media', 'alta')) DEFAULT 'baixa'");
    console.log("Migration: Added 'urgency' column to tickets table.");
  } catch (err) {
    console.error("Migration failed (urgency):", err);
  }
}

if (!hasTicketExtension) {
  try {
    db.exec("ALTER TABLE tickets ADD COLUMN extension TEXT");
    console.log("Migration: Added 'extension' column to tickets table.");
  } catch (err) {
    console.error("Migration failed (ticket extension):", err);
  }
}

// Migration: Add requester_name and sector to tickets if they don't exist
const ticketCols = db.pragma("table_info(tickets)") as any[];
if (!ticketCols.some(col => col.name === 'requester_name')) {
  db.exec("ALTER TABLE tickets ADD COLUMN requester_name TEXT");
}
if (!ticketCols.some(col => col.name === 'sector')) {
  db.exec("ALTER TABLE tickets ADD COLUMN sector TEXT");
}

// Migration: Reset all passwords to 123456 (requested by user)
db.exec("UPDATE users SET password = '123456'");
console.log("Migration: Reset all user passwords to 123456.");

// Helper to sanitize login: ONLY letters (A-Z), remove accents, forced to uppercase
const sanitizeLogin = (str: string) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-zA-Z]/g, "")      // Keep ONLY letters (removes numbers and specials)
    .toUpperCase();
};

// Helper to sanitize password: Alphanumeric, remove accents, forced to lowercase
const sanitizePassword = (pw: string) => {
  if (!pw) return "";
  return pw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-zA-Z0-9]/g, "")    // Keep letters and numbers
    .toLowerCase();
};

// Seed initial data if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare("INSERT INTO users (name, login, password, role, sector, extension, is_first_login) VALUES (?, ?, ?, ?, ?, ?, ?)");
  // Standardizing seeds using the new strict sanitization rules (NO NUMBERS)
  insertUser.run("Admin Hospital", sanitizeLogin("ADMIN"), sanitizePassword("admin"), "admin", "TI", "1000", 0);
  insertUser.run("Tecnico Joao", sanitizeLogin("JOAO"), sanitizePassword("tech"), "tecnico", "TI", "1001", 1);
  insertUser.run("Enf. Maria", sanitizeLogin("MARIA"), sanitizePassword("user"), "colaborador", "UTI", "2005", 1);
  
  const insertCat = db.prepare("INSERT INTO categories (name) VALUES (?)");
  ["Hardware", "Software", "Rede", "Impressora", "Sistemas"].forEach(cat => insertCat.run(cat));

  const insertSec = db.prepare("INSERT INTO sectors (name) VALUES (?)");
  ["UTI", "Recepção", "TI", "Administração", "Emergência"].forEach(sec => insertSec.run(sec));
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.post("/api/login", (req, res) => {
    let { login, password } = req.body;
    
    // Backend Validation & Sanitization
    const sanitizedLogin = sanitizeLogin(login);
    const sanitizedPassword = sanitizePassword(password);

    const user = db.prepare("SELECT id, name, login, role, sector, extension, is_first_login FROM users WHERE login = ? AND password = ?").get(sanitizedLogin, sanitizedPassword);
    
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  app.post("/api/reset-password", (req, res) => {
    const { userId, newPassword } = req.body;
    const sanitizedPassword = sanitizePassword(newPassword);

    db.prepare("UPDATE users SET password = ?, is_first_login = 0 WHERE id = ?").run(sanitizedPassword, userId);
    res.json({ success: true });
  });

  app.get("/api/categories", (req, res) => {
    const categories = db.prepare("SELECT * FROM categories").all();
    res.json(categories);
  });

  app.post("/api/categories", (req, res) => {
    const { name } = req.body;
    try {
      const result = db.prepare("INSERT INTO categories (name) VALUES (?)").run(name);
      res.json({ id: result.lastInsertRowid });
    } catch (err) {
      res.status(400).json({ error: "Categoria já existe" });
    }
  });

  app.patch("/api/categories/:id", (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    db.prepare("UPDATE categories SET name = ? WHERE id = ?").run(name, id);
    res.json({ success: true });
  });

  app.delete("/api/categories/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM categories WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/sectors", (req, res) => {
    const sectors = db.prepare("SELECT * FROM sectors").all();
    res.json(sectors);
  });

  app.post("/api/sectors", (req, res) => {
    const { name } = req.body;
    try {
      const result = db.prepare("INSERT INTO sectors (name) VALUES (?)").run(name);
      res.json({ id: result.lastInsertRowid });
    } catch (err) {
      res.status(400).json({ error: "Setor já existe" });
    }
  });

  app.patch("/api/sectors/:id", (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    db.prepare("UPDATE sectors SET name = ? WHERE id = ?").run(name, id);
    res.json({ success: true });
  });

  app.delete("/api/sectors/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM sectors WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, name, login, role, sector, extension FROM users").all();
    res.json(users);
  });

  app.post("/api/users", (req, res) => {
    const { name, login, password, role, sector } = req.body;
    const sanitizedLogin = sanitizeLogin(login);
    const sanitizedPassword = sanitizePassword(password);
    try {
      const result = db.prepare("INSERT INTO users (name, login, password, role, sector, extension) VALUES (?, ?, ?, ?, ?, ?)").run(
        name, sanitizedLogin, sanitizedPassword, role, sector, ""
      );
      res.json({ id: result.lastInsertRowid });
    } catch (err) {
      res.status(400).json({ error: "Login já existe" });
    }
  });

  app.patch("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const { name, login, password, role, sector } = req.body;
    
    const updates: string[] = [];
    const params: any[] = [];

    if (name) { updates.push("name = ?"); params.push(name); }
    if (login) { updates.push("login = ?"); params.push(sanitizeLogin(login)); }
    if (password) { updates.push("password = ?"); params.push(sanitizePassword(password)); }
    if (role) { updates.push("role = ?"); params.push(role); }
    if (sector) { updates.push("sector = ?"); params.push(sector); }

    if (updates.length === 0) return res.json({ success: true });

    params.push(id);
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...params);
    res.json({ success: true });
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/tickets", (req, res) => {
    const { userId, role } = req.query;
    let query = `
      SELECT t.*, 
             COALESCE(t.requester_name, u.name) as requester_name, 
             tech.name as technician_name, 
             c.name as category_name, 
             COALESCE(t.sector, u.sector) as sector
      FROM tickets t
      LEFT JOIN users u ON t.requester_id = u.id
      LEFT JOIN users tech ON t.technician_id = tech.id
      JOIN categories c ON t.category_id = c.id
    `;
    
    const params: any[] = [];
    if (role === 'colaborador') {
      query += " WHERE t.requester_id = ?";
      params.push(userId);
    }
    
    query += " ORDER BY t.created_at DESC";
    const tickets = db.prepare(query).all(...params);
    res.json(tickets);
  });

  app.post("/api/tickets", (req, res) => {
    const { requester_id, requester_name, sector, category_id, description, urgency, extension } = req.body;
    const result = db.prepare("INSERT INTO tickets (requester_id, requester_name, sector, category_id, description, urgency, extension) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      requester_id || null, requester_name || null, sector || null, category_id, description, urgency || 'baixa', extension || ''
    );
    res.json({ id: result.lastInsertRowid });
  });

  app.patch("/api/tickets/:id", (req, res) => {
    const { id } = req.params;
    const { status, technician_id, hold_justification, category_id, urgency, extension } = req.body;
    
    const updates: string[] = ["updated_at = CURRENT_TIMESTAMP"];
    const params: any[] = [];

    if (status) {
      updates.push("status = ?");
      params.push(status);
      if (status === 'finished') {
        updates.push("finished_at = CURRENT_TIMESTAMP");
      }
    }
    if (technician_id !== undefined) {
      updates.push("technician_id = ?");
      params.push(technician_id);
    }
    if (hold_justification !== undefined) {
      updates.push("hold_justification = ?");
      params.push(hold_justification);
    }
    if (category_id !== undefined) {
      updates.push("category_id = ?");
      params.push(category_id);
    }
    if (urgency !== undefined) {
      updates.push("urgency = ?");
      params.push(urgency);
    }
    if (extension !== undefined) {
      updates.push("extension = ?");
      params.push(extension);
    }

    params.push(id);
    db.prepare(`UPDATE tickets SET ${updates.join(", ")} WHERE id = ?`).run(...params);
    res.json({ success: true });
  });

  app.get("/api/stats", (req, res) => {
    const bySector = db.prepare(`
      SELECT u.sector, COUNT(*) as count 
      FROM tickets t 
      JOIN users u ON t.requester_id = u.id 
      GROUP BY u.sector
    `).all();
    
    const byCategory = db.prepare(`
      SELECT c.name as category, COUNT(*) as count 
      FROM tickets t 
      JOIN categories c ON t.category_id = c.id 
      GROUP BY c.name
    `).all();

    const byStatus = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM tickets GROUP BY status
    `).all();

    res.json({ bySector, byCategory, byStatus });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor Helpdesk rodando em http://localhost:${PORT}`);
  });
}

startServer();
