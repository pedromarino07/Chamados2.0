import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'helpdesk',
  port: parseInt(process.env.DB_PORT || '5432'),
});

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
    const userCount = await client.query("SELECT COUNT(*) as count FROM users");
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log("Semeando dados iniciais...");
      
      const sanitizeLogin = (str: string) => {
        if (!str) return "";
        return str
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z]/g, "")
          .toUpperCase();
      };

      const sanitizePassword = (pw: string) => {
        if (!pw) return "";
        return pw
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9]/g, "")
          .toLowerCase();
      };

      await client.query(
        "INSERT INTO users (name, login, password, role, sector, extension, is_first_login) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        ["Admin Hospital", sanitizeLogin("ADMIN"), sanitizePassword("admin"), "admin", "TI", "1000", false]
      );
      await client.query(
        "INSERT INTO users (name, login, password, role, sector, extension, is_first_login) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        ["Tecnico Joao", sanitizeLogin("JOAO"), sanitizePassword("tech"), "tecnico", "TI", "1001", true]
      );
      await client.query(
        "INSERT INTO users (name, login, password, role, sector, extension, is_first_login) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        ["Enf. Maria", sanitizeLogin("MARIA"), sanitizePassword("user"), "colaborador", "UTI", "2005", true]
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
  } catch (err) {
    console.error("Erro ao inicializar banco de dados:", err);
    process.exit(1);
  }
}

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

async function startServer() {
  await initDb();
  
  const app = express();
  app.use(express.json());

  // API Routes
  app.post("/api/login", async (req, res) => {
    try {
      let { login, password } = req.body;
      const sanitizedLogin = sanitizeLogin(login);
      const sanitizedPassword = sanitizePassword(password);

      const result = await pool.query(
        "SELECT id, name, login, role, sector, extension, is_first_login FROM users WHERE login = $1 AND password = $2",
        [sanitizedLogin, sanitizedPassword]
      );
      
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(401).json({ error: "Credenciais inválidas" });
      }
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
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
      const result = await pool.query("SELECT * FROM categories ORDER BY name");
      res.json(result.rows);
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
      const result = await pool.query("SELECT * FROM sectors ORDER BY name");
      res.json(result.rows);
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
      const result = await pool.query("SELECT id, name, login, role, sector, extension FROM users ORDER BY name");
      res.json(result.rows);
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
      const { userId, role, page, limit = 10, search } = req.query;
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
        if (status === 'in_progress' && oldTicket.status === 'resolved') {
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

      res.json({ 
        bySector, 
        byCategory, 
        byStatus: byStatusResult.rows.map(r => ({ ...r, count: parseInt(r.count) })), 
        counts,
        byTechnician, 
        total: parseInt(totalResult.rows[0].count)
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

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor Helpdesk rodando em http://localhost:${PORT}`);
  });
}

startServer();
