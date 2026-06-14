// ============================================================
// DigiQuest Studio — Alert Service
// ============================================================
// Scans all active briefs and generates alerts for deadlines,
// incomplete submissions, and stale reviews.
// ============================================================
function db() { return global.__db; }
const { checkDeadlineAlerts, checkStaleReview, calculateCompletenessScore } = require('./briefEngine');

/**
 * Scan all active briefs and generate alerts.
 * Avoids creating duplicate alerts for the same brief + type within 24 hours.
 * @returns {{ created: number, alerts: Array }}
 */
function generateAlerts() {
  const activeBriefs = db().prepare(`
    SELECT * FROM briefs
    WHERE status NOT IN ('completed', 'archived')
  `).all();

  const insertAlert = db().prepare(`
    INSERT INTO alerts (brief_id, type, message)
    VALUES (?, ?, ?)
  `);

  // Check for recent alerts to avoid duplicates (within 24 hours)
  const recentAlertCheck = db().prepare(`
    SELECT id FROM alerts
    WHERE brief_id = ? AND type = ? AND created_at > datetime('now', '-1 day')
    LIMIT 1
  `);

  let createdCount = 0;
  const newAlerts = [];

  for (const brief of activeBriefs) {
    // --- Deadline Alerts ---
    const deadlineAlerts = checkDeadlineAlerts(brief);
    for (const alert of deadlineAlerts) {
      const existing = recentAlertCheck.get(brief.id, alert.type);
      if (!existing) {
        insertAlert.run(brief.id, alert.type, alert.message);
        newAlerts.push({ brief_id: brief.id, ...alert });
        createdCount++;
      }
    }

    // --- Stale Review Alert ---
    const staleCheck = checkStaleReview(brief);
    if (staleCheck && staleCheck.isStale) {
      const existing = recentAlertCheck.get(brief.id, 'stale_review');
      if (!existing) {
        const message = `Brief "${brief.project_title}" has been under review for ${staleCheck.daysSinceUpdate} days with no updates.`;
        insertAlert.run(brief.id, 'stale_review', message);
        newAlerts.push({ brief_id: brief.id, type: 'stale_review', message });
        createdCount++;
      }
    }

    // --- Incomplete Brief Alert (draft with score < 30 and older than 3 days) ---
    if (brief.status === 'draft') {
      const score = calculateCompletenessScore(brief);
      const createdAt = new Date(brief.created_at);
      const daysSinceCreation = Math.ceil((new Date() - createdAt) / (1000 * 60 * 60 * 24));

      if (score < 30 && daysSinceCreation > 3) {
        const existing = recentAlertCheck.get(brief.id, 'incomplete_brief');
        if (!existing) {
          const message = `Brief "${brief.project_title}" is only ${score}% complete and was created ${daysSinceCreation} days ago.`;
          insertAlert.run(brief.id, 'incomplete_brief', message);
          newAlerts.push({ brief_id: brief.id, type: 'incomplete_brief', message });
          createdCount++;
        }
      }
    }
  }

  return { created: createdCount, alerts: newAlerts };
}

/**
 * Get all unread alerts, optionally filtered by brief_id.
 * @param {{ briefId?: number, limit?: number }} options
 * @returns {Array}
 */
function getUnreadAlerts({ briefId, limit = 50 } = {}) {
  if (briefId) {
    return db().prepare(`
      SELECT a.*, b.project_title
      FROM alerts a
      LEFT JOIN briefs b ON a.brief_id = b.id
      WHERE a.is_read = 0 AND a.brief_id = ?
      ORDER BY a.created_at DESC
      LIMIT ?
    `).all(briefId, limit);
  }

  return db().prepare(`
    SELECT a.*, b.project_title
    FROM alerts a
    LEFT JOIN briefs b ON a.brief_id = b.id
    WHERE a.is_read = 0
    ORDER BY a.created_at DESC
    LIMIT ?
  `).all(limit);
}

/**
 * Mark an alert as read.
 * @param {number} alertId
 * @returns {boolean}
 */
function markAlertRead(alertId) {
  const result = db().prepare('UPDATE alerts SET is_read = 1 WHERE id = ?').run(alertId);
  return result.changes > 0;
}

/**
 * Mark all alerts as read.
 * @returns {number} Number of alerts marked
 */
function markAllAlertsRead() {
  const result = db().prepare('UPDATE alerts SET is_read = 1 WHERE is_read = 0').run();
  return result.changes;
}

/**
 * Get count of unread alerts.
 * @returns {number}
 */
function getUnreadCount() {
  const row = db().prepare('SELECT COUNT(*) as count FROM alerts WHERE is_read = 0').get();
  return row.count;
}

module.exports = {
  generateAlerts,
  getUnreadAlerts,
  markAlertRead,
  markAllAlertsRead,
  getUnreadCount
};
