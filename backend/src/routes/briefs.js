// ============================================================
// DigiQuest Studio — Briefs API Routes
// ============================================================
// Full CRUD for production briefs with filtering, pagination,
// search, file uploads, status transitions, and audit logging.
// ============================================================
const express = require('express');
const router = express.Router();
function db() { return global.__db; }
const { validateBrief, validateStatusChange } = require('../middleware/validation');
const { upload, moveFilesToBrief } = require('../middleware/upload');
const {
  calculateCompletenessScore,
  validateStatusTransition,
  enforceStatusGates,
  checkAutoSubmitEligibility
} = require('../services/briefEngine');

// ─── Helper: log an audit entry ──────────────────────────────
function logAudit(briefId, action, fieldChanged, oldValue, newValue, performedBy = 'system') {
  db().prepare(`
    INSERT INTO audit_logs (brief_id, action, field_changed, old_value, new_value, performed_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(briefId, action, fieldChanged, oldValue, newValue, performedBy);
}

// ─── POST /api/briefs — Create a new brief ───────────────────
router.post('/',
  upload.fields([
    { name: 'script_file', maxCount: 1 },
    { name: 'references_files', maxCount: 5 },
    { name: 'brand_guidelines_file', maxCount: 1 }
  ]),
  validateBrief,
  (req, res, next) => {
    try {
      const b = req.body;

      // Handle uploaded files
      let scriptFilePath = null;
      let referencesFilePaths = '[]';
      let brandGuidelinesFilePath = null;

      if (req.files) {
        if (req.files.script_file && req.files.script_file[0]) {
          scriptFilePath = req.files.script_file[0].path;
        }
        if (req.files.references_files) {
          referencesFilePaths = JSON.stringify(
            req.files.references_files.map(f => f.path)
          );
        }
        if (req.files.brand_guidelines_file && req.files.brand_guidelines_file[0]) {
          brandGuidelinesFilePath = req.files.brand_guidelines_file[0].path;
        }
      }

      const stmt = db().prepare(`
        INSERT INTO briefs (
          client_id, project_title, project_type,
          script_text, script_file_path,
          references_text, references_file_paths,
          brand_guidelines_text, brand_guidelines_file_path,
          delivery_format, delivery_specifications,
          approval_contacts, deadline, budget_range,
          special_requirements, status, priority, completeness_score
        ) VALUES (
          ?, ?, ?,
          ?, ?,
          ?, ?,
          ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?
        )
      `);

      // Build a temporary object to calculate completeness
      const tempBrief = {
        script_text: b.script_text || null,
        script_file_path: scriptFilePath,
        references_text: b.references_text || null,
        references_file_paths: referencesFilePaths,
        brand_guidelines_text: b.brand_guidelines_text || null,
        brand_guidelines_file_path: brandGuidelinesFilePath,
        delivery_format: b.delivery_format,
        approval_contacts: b.approval_contacts || '[]',
        deadline: b.deadline || null,
        budget_range: b.budget_range || null,
        special_requirements: b.special_requirements || null
      };

      const completenessScore = calculateCompletenessScore(tempBrief);

      const result = stmt.run(
        b.client_id || null,
        b.project_title,
        b.project_type,
        b.script_text || null,
        scriptFilePath,
        b.references_text || null,
        referencesFilePaths,
        b.brand_guidelines_text || null,
        brandGuidelinesFilePath,
        b.delivery_format,
        b.delivery_specifications || null,
        b.approval_contacts || '[]',
        b.deadline || null,
        b.budget_range || null,
        b.special_requirements || null,
        b.status || 'draft',
        b.priority || 'normal',
        completenessScore
      );

      const briefId = result.lastInsertRowid;

      // Move any temp-uploaded files to the brief's directory
      if (req.files) {
        const allFiles = [
          ...(req.files.script_file || []),
          ...(req.files.references_files || []),
          ...(req.files.brand_guidelines_file || [])
        ];
        if (allFiles.length > 0) {
          const paths = allFiles.map(f => f.path);
          moveFilesToBrief(paths, briefId);
        }
      }

      // Log audit
      logAudit(briefId, 'created', null, null, JSON.stringify({ project_title: b.project_title }));

      // Fetch and return the created record
      const created = db().prepare('SELECT * FROM briefs WHERE id = ?').get(briefId);

      res.status(201).json({
        success: true,
        message: 'Brief created successfully.',
        data: created,
        completeness_score: completenessScore
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/briefs — List all briefs (with filters, search, pagination, sort) ───
router.get('/', (req, res, next) => {
  try {
    const {
      status, project_type, priority, search,
      page = 1, limit = 20,
      sort = 'created_at', order = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Whitelist sortable columns
    const allowedSorts = ['created_at', 'updated_at', 'project_title', 'status', 'priority', 'completeness_score', 'deadline'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Build WHERE clauses dynamically
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('b.status = ?');
      params.push(status);
    }
    if (project_type) {
      conditions.push('b.project_type = ?');
      params.push(project_type);
    }
    if (priority) {
      conditions.push('b.priority = ?');
      params.push(priority);
    }
    if (search) {
      conditions.push('(b.project_title LIKE ? OR c.company_name LIKE ? OR b.script_text LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    // Count total matching records
    const countRow = db().prepare(`
      SELECT COUNT(*) as total
      FROM briefs b
      LEFT JOIN clients c ON b.client_id = c.id
      ${whereClause}
    `).get(...params);

    // Fetch paginated results
    const briefs = db().prepare(`
      SELECT b.*, c.company_name as client_name, c.contact_person, c.email as client_email
      FROM briefs b
      LEFT JOIN clients c ON b.client_id = c.id
      ${whereClause}
      ORDER BY b.${sortCol} ${sortOrder}
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    res.json({
      success: true,
      data: briefs,
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

// ─── GET /api/briefs/:id — Get a single brief ────────────────
router.get('/:id', (req, res, next) => {
  try {
    const brief = db().prepare(`
      SELECT b.*, c.company_name as client_name, c.contact_person, c.email as client_email, c.phone as client_phone
      FROM briefs b
      LEFT JOIN clients c ON b.client_id = c.id
      WHERE b.id = ?
    `).get(req.params.id);

    if (!brief) {
      return res.status(404).json({
        success: false,
        message: `Brief with ID ${req.params.id} not found.`,
        code: 404
      });
    }

    res.json({ success: true, data: brief });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/briefs/:id/detail — Full detail with audit history ─
router.get('/:id/detail', (req, res, next) => {
  try {
    const brief = db().prepare(`
      SELECT b.*, c.company_name as client_name, c.contact_person,
             c.email as client_email, c.phone as client_phone,
             c.industry as client_industry, c.address as client_address
      FROM briefs b
      LEFT JOIN clients c ON b.client_id = c.id
      WHERE b.id = ?
    `).get(req.params.id);

    if (!brief) {
      return res.status(404).json({
        success: false,
        message: `Brief with ID ${req.params.id} not found.`,
        code: 404
      });
    }

    // Get audit history
    const auditHistory = db().prepare(`
      SELECT * FROM audit_logs
      WHERE brief_id = ?
      ORDER BY created_at DESC
    `).all(req.params.id);

    // Get alerts for this brief
    const alerts = db().prepare(`
      SELECT * FROM alerts
      WHERE brief_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(req.params.id);

    // Recalculate live completeness score
    const completenessScore = calculateCompletenessScore(brief);

    res.json({
      success: true,
      data: {
        ...brief,
        completeness_score: completenessScore,
        audit_history: auditHistory,
        alerts
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/briefs/:id — Update an existing brief ──────────
router.put('/:id',
  upload.fields([
    { name: 'script_file', maxCount: 1 },
    { name: 'references_files', maxCount: 5 },
    { name: 'brand_guidelines_file', maxCount: 1 }
  ]),
  validateBrief,
  (req, res, next) => {
    try {
      const existing = db().prepare('SELECT * FROM briefs WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: `Brief with ID ${req.params.id} not found.`,
          code: 404
        });
      }

      const b = req.body;

      // Track changed fields for audit log
      const fieldsToTrack = [
        'project_title', 'project_type', 'script_text', 'references_text',
        'brand_guidelines_text', 'delivery_format', 'delivery_specifications',
        'approval_contacts', 'deadline', 'budget_range', 'special_requirements', 'priority'
      ];

      const auditEntries = [];
      for (const field of fieldsToTrack) {
        if (b[field] !== undefined && b[field] !== existing[field]) {
          auditEntries.push({
            field,
            oldValue: existing[field],
            newValue: b[field]
          });
        }
      }

      // Handle file uploads
      let scriptFilePath = existing.script_file_path;
      let referencesFilePaths = existing.references_file_paths;
      let brandGuidelinesFilePath = existing.brand_guidelines_file_path;

      if (req.files) {
        if (req.files.script_file && req.files.script_file[0]) {
          scriptFilePath = req.files.script_file[0].path;
          auditEntries.push({ field: 'script_file', oldValue: existing.script_file_path, newValue: scriptFilePath });
        }
        if (req.files.references_files) {
          referencesFilePaths = JSON.stringify(req.files.references_files.map(f => f.path));
          auditEntries.push({ field: 'references_files', oldValue: existing.references_file_paths, newValue: referencesFilePaths });
        }
        if (req.files.brand_guidelines_file && req.files.brand_guidelines_file[0]) {
          brandGuidelinesFilePath = req.files.brand_guidelines_file[0].path;
          auditEntries.push({ field: 'brand_guidelines_file', oldValue: existing.brand_guidelines_file_path, newValue: brandGuidelinesFilePath });
        }
      }

      // Build update object
      const updated = {
        client_id: b.client_id !== undefined ? b.client_id : existing.client_id,
        project_title: b.project_title || existing.project_title,
        project_type: b.project_type || existing.project_type,
        script_text: b.script_text !== undefined ? b.script_text : existing.script_text,
        script_file_path: scriptFilePath,
        references_text: b.references_text !== undefined ? b.references_text : existing.references_text,
        references_file_paths: referencesFilePaths,
        brand_guidelines_text: b.brand_guidelines_text !== undefined ? b.brand_guidelines_text : existing.brand_guidelines_text,
        brand_guidelines_file_path: brandGuidelinesFilePath,
        delivery_format: b.delivery_format || existing.delivery_format,
        delivery_specifications: b.delivery_specifications !== undefined ? b.delivery_specifications : existing.delivery_specifications,
        approval_contacts: b.approval_contacts || existing.approval_contacts,
        deadline: b.deadline !== undefined ? b.deadline : existing.deadline,
        budget_range: b.budget_range !== undefined ? b.budget_range : existing.budget_range,
        special_requirements: b.special_requirements !== undefined ? b.special_requirements : existing.special_requirements,
        priority: b.priority || existing.priority
      };

      // Calculate new completeness score
      const completenessScore = calculateCompletenessScore({ ...existing, ...updated });

      db().prepare(`
        UPDATE briefs SET
          client_id = ?, project_title = ?, project_type = ?,
          script_text = ?, script_file_path = ?,
          references_text = ?, references_file_paths = ?,
          brand_guidelines_text = ?, brand_guidelines_file_path = ?,
          delivery_format = ?, delivery_specifications = ?,
          approval_contacts = ?, deadline = ?, budget_range = ?,
          special_requirements = ?, priority = ?, completeness_score = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        updated.client_id, updated.project_title, updated.project_type,
        updated.script_text, updated.script_file_path,
        updated.references_text, updated.references_file_paths,
        updated.brand_guidelines_text, updated.brand_guidelines_file_path,
        updated.delivery_format, updated.delivery_specifications,
        updated.approval_contacts, updated.deadline, updated.budget_range,
        updated.special_requirements, updated.priority, completenessScore,
        req.params.id
      );

      // Log all field changes
      for (const entry of auditEntries) {
        logAudit(req.params.id, 'updated', entry.field, String(entry.oldValue), String(entry.newValue));
      }

      // Check auto-submit eligibility
      const updatedBrief = db().prepare('SELECT * FROM briefs WHERE id = ?').get(req.params.id);
      const autoSubmit = checkAutoSubmitEligibility(updatedBrief);

      res.json({
        success: true,
        message: 'Brief updated successfully.',
        data: updatedBrief,
        completeness_score: completenessScore,
        auto_submit_eligible: autoSubmit.shouldAutoSubmit
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /api/briefs/:id/status — Change brief status ──────
router.patch('/:id/status', validateStatusChange, (req, res, next) => {
  try {
    const brief = db().prepare('SELECT * FROM briefs WHERE id = ?').get(req.params.id);
    if (!brief) {
      return res.status(404).json({
        success: false,
        message: `Brief with ID ${req.params.id} not found.`,
        code: 404
      });
    }

    const { status: newStatus } = req.body;
    const oldStatus = brief.status;

    // Validate the transition is allowed
    const transitionCheck = validateStatusTransition(oldStatus, newStatus);
    if (!transitionCheck.valid) {
      return res.status(400).json({
        success: false,
        message: transitionCheck.reason,
        code: 400
      });
    }

    // Enforce business rule gates
    const gateCheck = enforceStatusGates(brief, newStatus);
    if (!gateCheck.allowed) {
      return res.status(400).json({
        success: false,
        message: gateCheck.reason,
        code: 400
      });
    }

    // Update status + timestamps
    const updateFields = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    if (newStatus === 'submitted' && !brief.submitted_at) {
      updateFields.submitted_at = new Date().toISOString();
    }
    if (newStatus === 'approved') {
      updateFields.approved_at = new Date().toISOString();
    }

    db().prepare(`
      UPDATE briefs SET
        status = ?,
        updated_at = ?,
        submitted_at = COALESCE(?, submitted_at),
        approved_at = COALESCE(?, approved_at)
      WHERE id = ?
    `).run(
      updateFields.status,
      updateFields.updated_at,
      updateFields.submitted_at || null,
      updateFields.approved_at || null,
      req.params.id
    );

    // Audit log
    logAudit(req.params.id, 'status_changed', 'status', oldStatus, newStatus);

    const updatedBrief = db().prepare('SELECT * FROM briefs WHERE id = ?').get(req.params.id);

    res.json({
      success: true,
      message: `Status changed from "${oldStatus}" to "${newStatus}".`,
      data: updatedBrief
    });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/briefs/:id — Soft-delete (archive) ──────────
router.delete('/:id', (req, res, next) => {
  try {
    const brief = db().prepare('SELECT * FROM briefs WHERE id = ?').get(req.params.id);
    if (!brief) {
      return res.status(404).json({
        success: false,
        message: `Brief with ID ${req.params.id} not found.`,
        code: 404
      });
    }

    db().prepare(`
      UPDATE briefs SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(req.params.id);

    logAudit(req.params.id, 'status_changed', 'status', brief.status, 'archived');

    res.json({
      success: true,
      message: 'Brief archived successfully.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
