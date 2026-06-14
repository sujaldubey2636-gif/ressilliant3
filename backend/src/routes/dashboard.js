// ============================================================
// DigiQuest Studio — Dashboard API Routes
// ============================================================
// Summary widgets, alerts, and quick-glance data for the
// home dashboard screen.
// ============================================================
const express = require('express');
const router = express.Router();
function db() { return global.__db; }
const alertService = require('../services/alertService');

// ─── GET /api/dashboard/summary — Key metrics for dashboard widgets ─
router.get('/summary', (_req, res, next) => {
  try {
    // Generate any new alerts based on current state
    alertService.generateAlerts();

    const totalBriefs = db().prepare('SELECT COUNT(*) as count FROM briefs WHERE status != ?').get('archived');

    const pendingReview = db().prepare(`
      SELECT COUNT(*) as count FROM briefs WHERE status IN ('submitted', 'under_review')
    `).get();

    const approachingDeadline = db().prepare(`
      SELECT COUNT(*) as count FROM briefs
      WHERE deadline BETWEEN date('now') AND date('now', '+3 days')
      AND status NOT IN ('completed', 'archived')
    `).get();

    const avgCompleteness = db().prepare(`
      SELECT ROUND(AVG(completeness_score), 0) as avg
      FROM briefs WHERE status != 'archived'
    `).get();

    const inProduction = db().prepare(`
      SELECT COUNT(*) as count FROM briefs WHERE status = 'in_production'
    `).get();

    const completedThisMonth = db().prepare(`
      SELECT COUNT(*) as count FROM briefs
      WHERE status = 'completed'
      AND approved_at >= date('now', 'start of month')
    `).get();

    // Recent 5 briefs
    const recentBriefs = db().prepare(`
      SELECT b.id, b.project_title, b.project_type, b.status, b.priority,
             b.completeness_score, b.created_at, b.deadline,
             c.company_name as client_name
      FROM briefs b
      LEFT JOIN clients c ON b.client_id = c.id
      WHERE b.status != 'archived'
      ORDER BY b.created_at DESC
      LIMIT 5
    `).all();

    // Status breakdown for mini chart
    const statusBreakdown = db().prepare(`
      SELECT status, COUNT(*) as count
      FROM briefs
      WHERE status != 'archived'
      GROUP BY status
    `).all();

    // Unread alert count
    const unreadAlerts = alertService.getUnreadCount();

    res.json({
      success: true,
      data: {
        metrics: {
          total_briefs: totalBriefs.count,
          pending_review: pendingReview.count,
          approaching_deadline: approachingDeadline.count,
          avg_completeness: avgCompleteness.avg || 0,
          in_production: inProduction.count,
          completed_this_month: completedThisMonth.count
        },
        recent_briefs: recentBriefs,
        status_breakdown: statusBreakdown,
        unread_alerts: unreadAlerts
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/dashboard/alerts — Get unread alerts ────────────
router.get('/alerts', (req, res, next) => {
  try {
    const { brief_id, limit = 50 } = req.query;
    const alerts = alertService.getUnreadAlerts({
      briefId: brief_id ? parseInt(brief_id) : undefined,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: alerts,
      unread_count: alertService.getUnreadCount()
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/dashboard/alerts/:id/read — Mark alert as read ─
router.patch('/alerts/:id/read', (req, res, next) => {
  try {
    const success = alertService.markAlertRead(parseInt(req.params.id));

    if (!success) {
      return res.status(404).json({
        success: false,
        message: `Alert with ID ${req.params.id} not found.`,
        code: 404
      });
    }

    res.json({
      success: true,
      message: 'Alert marked as read.'
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/dashboard/alerts/read-all — Mark all alerts as read ─
router.patch('/alerts/read-all', (_req, res, next) => {
  try {
    const count = alertService.markAllAlertsRead();
    res.json({
      success: true,
      message: `${count} alert(s) marked as read.`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
