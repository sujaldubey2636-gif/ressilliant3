// ============================================================
// DigiQuest Studio — Clients API Routes
// ============================================================
const express = require('express');
const router = express.Router();
function db() { return global.__db; }
const { validateClient } = require('../middleware/validation');

// ─── POST /api/clients — Create a new client ─────────────────
router.post('/', validateClient, (req, res, next) => {
  try {
    const { company_name, contact_person, email, phone, industry, address } = req.body;

    const result = db().prepare(`
      INSERT INTO clients (company_name, contact_person, email, phone, industry, address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(company_name, contact_person, email, phone || null, industry || null, address || null);

    const client = db().prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'Client created successfully.',
      data: client
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/clients — List all clients ──────────────────────
router.get('/', (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '';
    const params = [];

    if (search) {
      whereClause = 'WHERE company_name LIKE ? OR contact_person LIKE ? OR email LIKE ?';
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    const countRow = db().prepare(`
      SELECT COUNT(*) as total FROM clients ${whereClause}
    `).get(...params);

    const clients = db().prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM briefs WHERE client_id = c.id) as brief_count
      FROM clients c
      ${whereClause}
      ORDER BY c.company_name ASC
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    res.json({
      success: true,
      data: clients,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countRow.total,
        totalPages: Math.ceil(countRow.total / limitNum)
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/clients/:id — Get single client with their briefs ─
router.get('/:id', (req, res, next) => {
  try {
    const client = db().prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: `Client with ID ${req.params.id} not found.`,
        code: 404
      });
    }

    const briefs = db().prepare(`
      SELECT id, project_title, project_type, status, priority, completeness_score, deadline, created_at
      FROM briefs
      WHERE client_id = ?
      ORDER BY created_at DESC
    `).all(req.params.id);

    res.json({
      success: true,
      data: {
        ...client,
        briefs
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/clients/:id — Update client ────────────────────
router.put('/:id', validateClient, (req, res, next) => {
  try {
    const existing = db().prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Client with ID ${req.params.id} not found.`,
        code: 404
      });
    }

    const { company_name, contact_person, email, phone, industry, address } = req.body;

    db().prepare(`
      UPDATE clients SET
        company_name = ?, contact_person = ?, email = ?,
        phone = ?, industry = ?, address = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      company_name, contact_person, email,
      phone || null, industry || null, address || null,
      req.params.id
    );

    const updated = db().prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);

    res.json({
      success: true,
      message: 'Client updated successfully.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
