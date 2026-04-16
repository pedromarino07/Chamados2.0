import dotenv from "dotenv";
dotenv.config();
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

/**
 * GUIA DE MIGRAÇÃO (Render -> Local):
 * 
 * 1. Exportar do Render:
 *    pg_dump -h <host_render> -U <user_render> -d <db_name_render> > backup.sql
 * 
 * 2. Importar no Local:
 *    psql -h localhost -U postgres -d helpdesk < backup.sql
 * 
 * 3. Configurar .env local:
 *    DATABASE_URL=postgresql://postgres:sua_senha@localhost:5432/helpdesk
 */

const { Pool } = pg;
console.log("Banco de dados configurado:", process.env.DATABASE_URL ? "Sim" : "Não");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// PostgreSQL Connection Pool
// Prioriza DATABASE_URL, mas permite SSL opcional para ambiente local
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') || process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false
});

let isDbInitialized = false;
let dbInitError: string | null = null;

// Test Connection and Initialize Database
async function initDb() {
  try {
    const client = await pool.connect();
    console.log("Conectado ao PostgreSQL com sucesso!");
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        login TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        sector TEXT NOT NULL,
        extension TEXT NOT NULL,
        is_first_login BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sectors (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER REFERENCES users(id),
        requester_name TEXT,
        sector TEXT,
        technician_id INTEGER REFERENCES users(id),
        category_id INTEGER NOT NULL REFERENCES categories(id),
        description TEXT NOT NULL,
        urgency TEXT DEFAULT 'baixa',
        extension TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'on_hold', 'resolved', 'finished')),
        hold_justification TEXT,
        reopening_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP WITH TIME ZONE
      );

      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
      CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);

      CREATE TABLE IF NOT EXISTS ticket_history (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES tickets(id),
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_by INTEGER NOT NULL REFERENCES users(id),
        comment TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed initial data if empty
    // Ensure all existing logins are uppercase (Migration)
    await client.query("UPDATE users SET login = UPPER(login)");

    const userCount = await client.query("SELECT COUNT(*) as count FROM users");
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log("Semeando dados iniciais...");
      
      // ADMIN: Name: "Admin Hospital", Login: "ADMIN", Password: "admin", Role: "admin", Sector: "TI"
      // (Corrected Role from "123456" to "admin" to maintain app functionality)
      await client.query(
        "INSERT INTO users (name, login, password, role, sector, extension, is_first_login) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        ["Admin Hospital", "ADMIN", "admin", "admin", "TI", "1000", false]
      );

      // TÉCNICO: Name: "Tecnico Joao", Login: "JOAO", Password: "123456", Role: "tecnico", Sector: "TI"
      await client.query(
        "INSERT INTO users (name, login, password, role, sector, extension, is_first_login) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        ["Tecnico Joao", "JOAO", "123456", "tecnico", "TI", "1001", true]
      );

      // COLABORADOR: Name: "Enf. Maria", Login: "MARIA", Password: "123456", Role: "colaborador", Sector: "UTI"
      await client.query(
        "INSERT INTO users (name, login, password, role, sector, extension, is_first_login) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        ["Enf. Maria", "MARIA", "123456", "colaborador", "UTI", "2005", true]
      );
      
      const categories = ["Hardware", "Software", "Rede", "Impressora", "Sistemas"];
      for (const cat of categories) {
        await client.query("INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING", [cat]);
      }

      const sectors = ["UTI", "Recepção", "TI", "Administração", "Emergência"];
      for (const sec of sectors) {
        await client.query("INSERT INTO sectors (name) VALUES ($1) ON CONFLICT DO NOTHING", [sec]);
      }
    }

    client.release();
    isDbInitialized = true;
    dbInitError = null;
  } catch (err: any) {
    let message = err.message || String(err);
    
    // Specific check for 1.1.1.1 which is a common configuration error
    if (message.includes('1.1.1.1')) {
      message = "Erro de Configuração: O host do banco de dados está definido como '1.1.1.1' (DNS da Cloudflare). Por favor, altere a variável DB_HOST para o endereço IP real do seu servidor PostgreSQL nas configurações do AI Studio.";
    }
    
    dbInitError = message;
    console.error("Erro ao inicializar banco de dados:", err);
    console.warn("O servidor continuará rodando, mas as APIs de banco de dados falharão até que a conexão seja corrigida.");
  }
}

// Helper to sanitize login: Keep letters, numbers, @ and .
const sanitizeLogin = (str: string) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-zA-Z0-9@.]/g, "") // Keep letters, numbers, @ and .
    .toUpperCase();
};

// Helper to sanitize password: Alphanumeric, remove accents
const sanitizePassword = (pw: string) => {
  if (!pw) return "";
  return pw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-zA-Z0-9]/g, "")    // Keep letters and numbers
    .toLowerCase();
};

async function startServer() {
  // Try to initialize DB in background
  initDb();
  
  const app = express();

  // 1. Segurança: Helmet para headers HTTP seguros
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
    crossOriginEmbedderPolicy: false
  }));

  // 2. Segurança: CORS Restritivo
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'];
  app.use(cors({
    origin: process.env.NODE_ENV === "production" ? allowedOrigins : true,
    credentials: true
  }));

  // 3. Segurança: Rate Limiting para o Login
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: "Muitas tentativas de login. Tente novamente em 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(express.json());

  // Health check and DB status
  app.get("/api/health", (req, res) => {
    // Log seguro: Não expõe senhas ou dados sensíveis
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      database: process.env.DB_NAME || 'helpdesk',
      user: process.env.DB_USER || 'postgres'
    };

    res.json({
      status: isDbInitialized ? "ok" : "error",
      db: isDbInitialized ? "connected" : "disconnected",
      error: dbInitError,
      config: dbConfig
    });
  });

  // Middleware to check DB connection
  app.use("/api", (req, res, next) => {
    if (req.path === "/health") return next();
    
    if (!isDbInitialized) {
      return res.status(503).json({ 
        error: "Banco de dados não inicializado ou inacessível",
        details: dbInitError,
        help: "Verifique as variáveis de ambiente DB_HOST, DB_USER, DB_PASSWORD, DB_NAME e DB_PORT nas configurações do AI Studio."
      });
    }
    next();
  });

  // API Routes
  app.post("/api/login", loginLimiter, async (req, res) => {
    try {
      let { login, password } = req.body;
      const sanitizedLogin = sanitizeLogin(login);
      const sanitizedPassword = sanitizePassword(password);

      // 1. Check if login exists
      const loginCheck = await pool.query(
        "SELECT id, password FROM users WHERE login = $1",
        [sanitizedLogin]
      );

      if (loginCheck.rows.length === 0) {
        return res.status(401).json({ error: "O login informado não existe." });
      }

      // 2. Check if password matches
      const user = loginCheck.rows[0];
      if (user.password !== sanitizedPassword) {
        return res.status(401).json({ error: "A senha informada está incorreta." });
      }

      // 3. Login successful, get full user info
      const result = await pool.query(
        "SELECT id, name, login, role, sector, extension, is_first_login FROM users WHERE id = $1",
        [user.id]
      );
      
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Erro no login:", err);
      res.status(500).json({ error: "Erro interno no servidor" });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { userId, newPassword } = req.body;
      const sanitizedPassword = sanitizePassword(newPassword);

      await pool.query(
        "UPDATE users SET password = $1, is_first_login = FALSE WHERE id = $2",
        [sanitizedPassword, userId]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.get("/api/categories", async (req, res) => {
    try {
      const { page, limit = 10 } = req.query;
      const p = parseInt(page as string) || 1;
      const l = parseInt(limit as string) || 10;
      const offset = (p - 1) * l;

      const countResult = await pool.query("SELECT COUNT(*) as total FROM categories");
      const totalCount = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalCount / l);

      let query = "SELECT * FROM categories ORDER BY name";
      if (page) {
        query += " LIMIT $1 OFFSET $2";
        const result = await pool.query(query, [l, offset]);
        res.json({
          categories: result.rows,
          totalPages,
          currentPage: p,
          totalCount
        });
      } else {
        const result = await pool.query(query);
        res.json(result.rows);
      }
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const { name } = req.body;
      const result = await pool.query(
        "INSERT INTO categories (name) VALUES ($1) RETURNING id",
        [name]
      );
      res.json({ id: result.rows[0].id });
    } catch (err) {
      res.status(400).json({ error: "Categoria já existe" });
    }
  });

  app.patch("/api/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      await pool.query("UPDATE categories SET name = $1 WHERE id = $2", [name, id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query("DELETE FROM categories WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.get("/api/sectors", async (req, res) => {
    try {
      const { page, limit = 10 } = req.query;
      const p = parseInt(page as string) || 1;
      const l = parseInt(limit as string) || 10;
      const offset = (p - 1) * l;

      const countResult = await pool.query("SELECT COUNT(*) as total FROM sectors");
      const totalCount = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalCount / l);

      let query = "SELECT * FROM sectors ORDER BY name";
      if (page) {
        query += " LIMIT $1 OFFSET $2";
        const result = await pool.query(query, [l, offset]);
        res.json({
          sectors: result.rows,
          totalPages,
          currentPage: p,
          totalCount
        });
      } else {
        const result = await pool.query(query);
        res.json(result.rows);
      }
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.post("/api/sectors", async (req, res) => {
    try {
      const { name } = req.body;
      const result = await pool.query(
        "INSERT INTO sectors (name) VALUES ($1) RETURNING id",
        [name]
      );
      res.json({ id: result.rows[0].id });
    } catch (err) {
      res.status(400).json({ error: "Setor já existe" });
    }
  });

  app.patch("/api/sectors/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      await pool.query("UPDATE sectors SET name = $1 WHERE id = $2", [name, id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.delete("/api/sectors/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query("DELETE FROM sectors WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const { page, limit = 10, search } = req.query;
      const p = parseInt(page as string) || 1;
      const l = parseInt(limit as string) || 10;
      const offset = (p - 1) * l;

      let whereClause = "";
      const params: any[] = [];
      if (search) {
        whereClause = " WHERE name ILIKE $1 OR login ILIKE $1";
        params.push(`%${search}%`);
      }

      const countResult = await pool.query(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
      const totalCount = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalCount / l);

      let query = `SELECT id, name, login, role, sector, extension FROM users ${whereClause} ORDER BY name`;
      if (page) {
        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(l, offset);
        const result = await pool.query(query, params);
        res.json({
          users: result.rows,
          totalPages,
          currentPage: p,
          totalCount
        });
      } else {
        const result = await pool.query(query, params);
        res.json(result.rows);
      }
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const { name, login, password, role, sector } = req.body;
      const sanitizedLogin = sanitizeLogin(login);
      const sanitizedPassword = sanitizePassword(password);
      const result = await pool.query(
        "INSERT INTO users (name, login, password, role, sector, extension) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [name, sanitizedLogin, sanitizedPassword, role, sector, ""]
      );
      res.json({ id: result.rows[0].id });
    } catch (err) {
      res.status(400).json({ error: "Login já existe" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, login, password, role, sector } = req.body;
      
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (name) { updates.push(`name = $${paramIndex++}`); params.push(name); }
      if (login) { updates.push(`login = $${paramIndex++}`); params.push(sanitizeLogin(login)); }
      if (password) { updates.push(`password = $${paramIndex++}`); params.push(sanitizePassword(password)); }
      if (role) { updates.push(`role = $${paramIndex++}`); params.push(role); }
      if (sector) { updates.push(`sector = $${paramIndex++}`); params.push(sector); }

      if (updates.length === 0) return res.json({ success: true });

      params.push(id);
      await pool.query(`UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex}`, params);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query("DELETE FROM users WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.get("/api/tickets", async (req, res) => {
    try {
      const { userId, role, page, limit = 10, search, statusFilter } = req.query;
      const p = parseInt(page as string) || 1;
      const l = parseInt(limit as string) || 10;
      const offset = (p - 1) * l;

      let baseQuery = `
        FROM tickets t
        LEFT JOIN users u ON t.requester_id = u.id
        LEFT JOIN users tech ON t.technician_id = tech.id
        JOIN categories c ON t.category_id = c.id
      `;
      
      let whereClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (role === 'colaborador') {
        whereClauses.push(`t.requester_id = $${paramIndex++}`);
        params.push(userId);
      } else if (role === 'tecnico') {
        if (statusFilter === 'finished') {
          // Technicians only see tickets they handled in history once they are finished
          whereClauses.push(`t.technician_id = $${paramIndex++}`);
          params.push(userId);
          whereClauses.push(`t.status = 'finished'`);
        } else if (statusFilter === 'active') {
          // Technicians see all active tickets (shared queue)
          whereClauses.push(`t.status IN ('pending', 'in_progress', 'on_hold', 'resolved')`);
        } else {
          // General fetch (for stats): See all pending + their own (active or finished)
          whereClauses.push(`(t.status = 'pending' OR t.technician_id = $${paramIndex++})`);
          params.push(userId);
        }
      }

      if (statusFilter === 'active' && role !== 'tecnico') {
        // For non-technicians, active queue includes pending, in_progress, on_hold, and resolved
        whereClauses.push(`t.status IN ('pending', 'in_progress', 'on_hold', 'resolved')`);
      } else if (statusFilter === 'finished' && role !== 'tecnico') {
        whereClauses.push(`t.status = 'finished'`);
      }

      if (search) {
        whereClauses.push(`t.description ILIKE $${paramIndex++}`);
        params.push(`%${search}%`);
      }
      
      const whereClause = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

      const countResult = await pool.query(`SELECT COUNT(*) as total ${baseQuery} ${whereClause}`, params);
      const totalCount = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalCount / l);

      let dataQuery = `
        SELECT t.*, 
               COALESCE(t.requester_name, u.name) as requester_name, 
               tech.name as technician_name, 
               c.name as category_name, 
               COALESCE(t.sector, u.sector) as sector
        ${baseQuery}
        ${whereClause}
        ORDER BY CASE urgency WHEN 'alta' THEN 1 WHEN 'media' THEN 2 WHEN 'baixa' THEN 3 ELSE 4 END, t.created_at DESC
      `;

      if (page) {
        dataQuery += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(l, offset);
        const result = await pool.query(dataQuery, params);
        res.json({
          tickets: result.rows,
          totalPages,
          currentPage: p,
          totalCount
        });
      } else {
        const result = await pool.query(dataQuery, params);
        res.json(result.rows);
      }
    } catch (err) {
      console.error("Erro ao buscar chamados:", err);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.post("/api/tickets", async (req, res) => {
    try {
      const { requester_id, requester_name, sector, category_id, description, urgency, extension } = req.body;
      const result = await pool.query(
        "INSERT INTO tickets (requester_id, requester_name, sector, category_id, description, urgency, extension) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
        [requester_id || null, requester_name || null, sector || null, category_id, description, urgency || 'baixa', extension || '']
      );
      res.json({ id: result.rows[0].id });
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.patch("/api/tickets/:id", async (req, res) => {
    const { id } = req.params;
    const { status, technician_id, hold_justification, category_id, urgency, extension, changed_by, comment, reopening_reason } = req.body;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const oldTicketResult = await client.query("SELECT * FROM tickets WHERE id = $1", [id]);
      const oldTicket = oldTicketResult.rows[0];
      if (!oldTicket) throw new Error("Chamado não encontrado");

      const updates: string[] = ["updated_at = CURRENT_TIMESTAMP"];
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        updates.push(`status = $${paramIndex++}`);
        params.push(status);
        if (status === 'finished') {
          updates.push("finished_at = CURRENT_TIMESTAMP");
        }
        if ((status === 'in_progress' || status === 'pending') && oldTicket.status === 'resolved') {
          updates.push(`reopening_reason = $${paramIndex++}`);
          params.push(reopening_reason || comment || "");
        }
      }
      if (technician_id !== undefined) {
        updates.push(`technician_id = $${paramIndex++}`);
        params.push(technician_id);
      }
      if (hold_justification !== undefined) {
        updates.push(`hold_justification = $${paramIndex++}`);
        params.push(hold_justification);
      }
      if (category_id !== undefined) {
        updates.push(`category_id = $${paramIndex++}`);
        params.push(category_id);
      }
      if (urgency !== undefined) {
        updates.push(`urgency = $${paramIndex++}`);
        params.push(urgency);
      }
      if (extension !== undefined) {
        updates.push(`extension = $${paramIndex++}`);
        params.push(extension);
      }

      params.push(id);
      await client.query(`UPDATE tickets SET ${updates.join(", ")} WHERE id = $${paramIndex}`, params);

      if (status || comment) {
        await client.query(`
          INSERT INTO ticket_history (ticket_id, old_status, new_status, changed_by, comment)
          VALUES ($1, $2, $3, $4, $5)
        `, [id, oldTicket.status, status || oldTicket.status, changed_by || 1, comment || null]);
      }

      const updatedTicketResult = await client.query(`
        SELECT t.*, 
               COALESCE(t.requester_name, u.name) as requester_name, 
               tech.name as technician_name, 
               c.name as category_name, 
               COALESCE(t.sector, u.sector) as sector
        FROM tickets t
        LEFT JOIN users u ON t.requester_id = u.id
        LEFT JOIN users tech ON t.technician_id = tech.id
        JOIN categories c ON t.category_id = c.id
        WHERE t.id = $1
      `, [id]);

      await client.query('COMMIT');
      res.json(updatedTicketResult.rows[0]);
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error("Erro ao atualizar chamado:", err);
      res.status(err.message === "Chamado não encontrado" ? 404 : 500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.get("/api/tickets/:id/history", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(`
        SELECT h.*, u.name as changed_by_name
        FROM ticket_history h
        JOIN users u ON h.changed_by = u.id
        WHERE h.ticket_id = $1
        ORDER BY h.timestamp DESC
      `, [id]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      let whereClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (startDate && endDate) {
        whereClauses.push(`t.created_at BETWEEN $${paramIndex++} AND $${paramIndex++}`);
        params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
      }

      const whereClause = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

      const bySectorResult = await pool.query(`
        SELECT COALESCE(t.sector, u.sector) as sector_name, COUNT(*) as count 
        FROM tickets t 
        LEFT JOIN users u ON t.requester_id = u.id 
        ${whereClause}
        GROUP BY sector_name
        ORDER BY count DESC
      `, params);
      
      const bySector = bySectorResult.rows.map((row: any) => ({
        sector: row.sector_name,
        count: parseInt(row.count)
      }));
      
      const byCategoryResult = await pool.query(`
        SELECT c.name as category, COUNT(*) as count 
        FROM tickets t 
        JOIN categories c ON t.category_id = c.id 
        ${whereClause}
        GROUP BY c.name
        ORDER BY count DESC
      `, params);
      const byCategory = byCategoryResult.rows.map((row: any) => ({
        category: row.category,
        count: parseInt(row.count)
      }));

      const byStatusResult = await pool.query(`
        SELECT status, COUNT(*) as count 
        FROM tickets t
        ${whereClause}
        GROUP BY status
      `, params);

      const counts = {
        pending: 0,
        in_progress: 0,
        on_hold: 0,
        resolved: 0,
        finished: 0
      };

      byStatusResult.rows.forEach((s: any) => {
        if (s.status in counts) {
          (counts as any)[s.status] = parseInt(s.count);
        }
      });

      const techWhereClause = whereClause ? `${whereClause} AND t.status = 'finished'` : " WHERE t.status = 'finished'";
      const byTechnicianResult = await pool.query(`
        SELECT u.name as technician, COUNT(*) as count 
        FROM tickets t 
        JOIN users u ON t.technician_id = u.id 
        ${techWhereClause}
        GROUP BY u.name
        ORDER BY count DESC
      `, params);
      const byTechnician = byTechnicianResult.rows.map((row: any) => ({
        technician: row.technician,
        count: parseInt(row.count)
      }));

      const totalResult = await pool.query(`
        SELECT COUNT(*) as count FROM tickets t ${whereClause}
      `, params);

      const avgTimeResult = await pool.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (finished_at - created_at))) as avg_seconds 
        FROM tickets t 
        ${whereClause ? whereClause + " AND status = 'finished'" : " WHERE status = 'finished'"}
        AND finished_at IS NOT NULL
      `, params);

      res.json({ 
        bySector, 
        byCategory, 
        byStatus: byStatusResult.rows.map(r => ({ ...r, count: parseInt(r.count) })), 
        counts,
        byTechnician, 
        total: parseInt(totalResult.rows[0].count),
        avgServiceTime: avgTimeResult.rows[0].avg_seconds ? parseFloat(avgTimeResult.rows[0].avg_seconds) : null
      });
    } catch (err) {
      console.error("Erro ao buscar estatísticas:", err);
      res.status(500).json({ 
        bySector: [], 
        byCategory: [], 
        byStatus: [], 
        counts: { pending: 0, in_progress: 0, on_hold: 0, resolved: 0, finished: 0 },
        byTechnician: [], 
        total: 0,
        error: "Erro interno ao processar estatísticas"
      });
    }
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
  
  // Porta 5000 conforme solicitado para o ambiente local (Requirement 3)
  const PORT = parseInt(process.env.PORT || "5000");
  
  /**
   * NOTA SOBRE HTTPS:
   * Para habilitar HTTPS localmente, você pode usar o pacote 'https' do Node.js:
   * 
   * const https = await import('https');
   * const fs = await import('fs');
   * const options = {
   *   key: fs.readFileSync('caminho/para/chave.pem'),
   *   cert: fs.readFileSync('caminho/para/certificado.pem')
   * };
   * https.createServer(options, app).listen(PORT, "0.0.0.0", () => { ... });
   */
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[${process.env.NODE_ENV || 'development'}] Servidor Helpdesk rodando na porta ${PORT}`);
    if (process.env.NODE_ENV === "production") {
      console.log("Segurança: Helmet, CORS e Rate Limiting ATIVOS.");
    }
  });
}

startServer();
