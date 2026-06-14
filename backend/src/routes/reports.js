// ============================================================
// DigiQuest Studio — Reports API Routes
// ============================================================
// Aggregation endpoints for analytics dashboards:
// summary stats, by-type, by-client, time-series, and CSV export.
// ============================================================
const express = require('express');
const router = express.Router();
function db() { return global.__db; }

// ─── GET /api/reports/summary — Overall summary stats ─────────
router.get('/summary', (_req, res, next) => {
  try {
    const total = db().prepare('SELECT COUNT(*) as count FROM briefs').get();
    const byStatus = db().prepare(`
      SELECT status, COUNT(*) as count
      FROM briefs
      GROUP BY status
      ORDER BY count DESC
    `).all();

    const avgCompleteness = db().prepare(`
      SELECT ROUND(AVG(completeness_score), 1) as avg_score
      FROM briefs
      WHERE status != 'archived'
    `).get();

    const urgentCount = db().prepare(`
      SELECT COUNT(*) as count FROM briefs WHERE priority = 'urgent' AND status NOT IN ('completed', 'archived')
    `).get();

    const overdueCount = db().prepare(`
      SELECT COUNT(*) as count FROM briefs
      WHERE deadline < date('now') AND status NOT IN ('completed', 'archived')
    `).get();

    // 30-day time series: briefs created per day
    const timeSeries = db().prepare(`
      SELECT date(created_at) as date, COUNT(*) as count
      FROM briefs
      WHERE created_at >= date('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all();

    res.json({
      success: true,
      data: {
        total_briefs: total.count,
        by_status: byStatus,
        avg_completeness: avgCompleteness.avg_score || 0,
        urgent_briefs: urgentCount.count,
        overdue_briefs: overdueCount.count,
        daily_submissions_30d: timeSeries
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/reports/by-type — Briefs grouped by project type ─
router.get('/by-type', (_req, res, next) => {
  try {
    const data = db().prepare(`
      SELECT
        project_type,
        COUNT(*) as count,
        ROUND(AVG(completeness_score), 1) as avg_completeness,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'in_production' THEN 1 ELSE 0 END) as in_production
      FROM briefs
      WHERE status != 'archived'
      GROUP BY project_type
      ORDER BY count DESC
    `).all();

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/reports/by-client — Briefs per client ───────────
router.get('/by-client', (_req, res, next) => {
  try {
    const data = db().prepare(`
      SELECT
        c.id as client_id,
        c.company_name,
        COUNT(b.id) as brief_count,
        ROUND(AVG(b.completeness_score), 1) as avg_completeness,
        SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_briefs,
        MAX(b.created_at) as latest_brief_date
      FROM clients c
      LEFT JOIN briefs b ON c.id = b.client_id
      GROUP BY c.id
      ORDER BY brief_count DESC
      LIMIT 20
    `).all();

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/reports/completeness — Completeness trends ──────
router.get('/completeness', (_req, res, next) => {
  try {
    // Distribution buckets
    const distribution = db().prepare(`
      SELECT
        CASE
          WHEN completeness_score >= 90 THEN '90-100'
          WHEN completeness_score >= 70 THEN '70-89'
          WHEN completeness_score >= 50 THEN '50-69'
          WHEN completeness_score >= 30 THEN '30-49'
          ELSE '0-29'
        END as range,
        COUNT(*) as count
      FROM briefs
      WHERE status != 'archived'
      GROUP BY range
      ORDER BY range ASC
    `).all();

    // Weekly average trend
    const weeklyTrend = db().prepare(`
      SELECT
        strftime('%Y-W%W', created_at) as week,
        ROUND(AVG(completeness_score), 1) as avg_score,
        COUNT(*) as brief_count
      FROM briefs
      WHERE created_at >= date('now', '-90 days')
      GROUP BY week
      ORDER BY week ASC
    `).all();

    res.json({
      success: true,
      data: {
        distribution,
        weekly_trend: weeklyTrend
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/reports/export — CSV export of all briefs ───────
router.get('/export', (req, res, next) => {
  try {
    const { status, project_type } = req.query;
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

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const briefs = db().prepare(`
      SELECT
        b.id, b.project_title, b.project_type, b.delivery_format,
        b.status, b.priority, b.completeness_score, b.deadline,
        b.budget_range, b.special_requirements,
        b.created_at, b.updated_at, b.submitted_at, b.approved_at,
        c.company_name as client_name, c.contact_person, c.email as client_email
      FROM briefs b
      LEFT JOIN clients c ON b.client_id = c.id
      ${whereClause}
      ORDER BY b.created_at DESC
    `).all(...params);

    // Generate CSV
    if (briefs.length === 0) {
      return res.status(200).send('No data to export.');
    }

    const headers = Object.keys(briefs[0]);
    const csvRows = [
      headers.join(','),
      ...briefs.map(row =>
        headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val).replace(/"/g, '""');
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str}"` : str;
        }).join(',')
      )
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="briefs_export.csv"');
    res.send(csvRows.join('\n'));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
