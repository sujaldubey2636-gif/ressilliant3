// ============================================================
// DigiQuest Studio — Core Business Logic Processing Engine
// ============================================================
// Calculates completeness scores, enforces status transitions,
// and applies all business rules for production briefs.
// ============================================================

/**
 * COMPLETENESS SCORE WEIGHTS (total = 100)
 * Each field group contributes a weighted portion to the overall score.
 */
const COMPLETENESS_WEIGHTS = {
  script: 20,            // Script text or file uploaded
  references: 15,        // Reference text or files uploaded
  brandGuidelines: 15,   // Brand guidelines text or file uploaded
  deliveryFormat: 15,    // Delivery format specified (always required, so usually filled)
  approvalContacts: 15,  // At least 1 approval contact with email
  deadline: 10,          // Deadline date set
  budgetRange: 5,        // Budget range selected
  specialRequirements: 5 // Special requirements noted
};

/**
 * VALID STATUS TRANSITIONS
 * Maps each status to the list of statuses it can move to.
 */
const VALID_TRANSITIONS = {
  draft:              ['submitted', 'archived'],
  submitted:          ['under_review', 'revision_requested', 'archived'],
  under_review:       ['approved', 'revision_requested', 'archived'],
  revision_requested: ['submitted', 'archived'],
  approved:           ['in_production', 'revision_requested', 'archived'],
  in_production:      ['completed', 'revision_requested', 'archived'],
  completed:          ['archived'],
  archived:           ['draft']   // Allow un-archiving back to draft
};

/**
 * Calculate the completeness score (0-100) for a brief.
 * @param {Object} brief - The brief record from the database
 * @returns {number} Score between 0 and 100
 */
function calculateCompletenessScore(brief) {
  let score = 0;

  // Script: text or file present
  if (brief.script_text && brief.script_text.trim().length > 0) {
    score += COMPLETENESS_WEIGHTS.script;
  } else if (brief.script_file_path && brief.script_file_path.trim().length > 0) {
    score += COMPLETENESS_WEIGHTS.script;
  }

  // References: text or files present
  if (brief.references_text && brief.references_text.trim().length > 0) {
    score += COMPLETENESS_WEIGHTS.references;
  } else if (brief.references_file_paths) {
    try {
      const files = JSON.parse(brief.references_file_paths);
      if (Array.isArray(files) && files.length > 0) {
        score += COMPLETENESS_WEIGHTS.references;
      }
    } catch { /* invalid JSON, no score */ }
  }

  // Brand Guidelines: text or file present
  if (brief.brand_guidelines_text && brief.brand_guidelines_text.trim().length > 0) {
    score += COMPLETENESS_WEIGHTS.brandGuidelines;
  } else if (brief.brand_guidelines_file_path && brief.brand_guidelines_file_path.trim().length > 0) {
    score += COMPLETENESS_WEIGHTS.brandGuidelines;
  }

  // Delivery Format: always required at creation, but double-check
  if (brief.delivery_format && brief.delivery_format.trim().length > 0) {
    score += COMPLETENESS_WEIGHTS.deliveryFormat;
  }

  // Approval Contacts: at least 1 contact with a valid email
  if (brief.approval_contacts) {
    try {
      const contacts = JSON.parse(brief.approval_contacts);
      if (Array.isArray(contacts) && contacts.length > 0) {
        const hasValidContact = contacts.some(
          c => c.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)
        );
        if (hasValidContact) {
          score += COMPLETENESS_WEIGHTS.approvalContacts;
        }
      }
    } catch { /* invalid JSON, no score */ }
  }

  // Deadline set
  if (brief.deadline) {
    score += COMPLETENESS_WEIGHTS.deadline;
  }

  // Budget range selected
  if (brief.budget_range) {
    score += COMPLETENESS_WEIGHTS.budgetRange;
  }

  // Special requirements noted
  if (brief.special_requirements && brief.special_requirements.trim().length > 0) {
    score += COMPLETENESS_WEIGHTS.specialRequirements;
  }

  return score;
}

/**
 * Validate whether a status transition is allowed.
 * @param {string} currentStatus
 * @param {string} newStatus
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateStatusTransition(currentStatus, newStatus) {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed) {
    return { valid: false, reason: `Unknown current status: "${currentStatus}"` };
  }
  if (!allowed.includes(newStatus)) {
    return {
      valid: false,
      reason: `Cannot transition from "${currentStatus}" to "${newStatus}". Allowed: ${allowed.join(', ')}`
    };
  }
  return { valid: true };
}

/**
 * Enforce business rule gates before a status transition.
 * @param {Object} brief - The brief record
 * @param {string} newStatus - The target status
 * @returns {{ allowed: boolean, reason?: string }}
 */
function enforceStatusGates(brief, newStatus) {
  const score = calculateCompletenessScore(brief);

  // Rule: Cannot submit unless completeness >= 50%
  if (newStatus === 'submitted' && score < 50) {
    return {
      allowed: false,
      reason: `Brief completeness is ${score}%. Must be at least 50% to submit. Fill in more fields.`
    };
  }

  // Rule: Cannot approve unless completeness >= 80%
  if (newStatus === 'approved' && score < 80) {
    return {
      allowed: false,
      reason: `Brief completeness is ${score}%. Must be at least 80% to approve.`
    };
  }

  // Rule: Must have at least 1 approval contact before submitting
  if (newStatus === 'submitted') {
    try {
      const contacts = JSON.parse(brief.approval_contacts || '[]');
      if (!Array.isArray(contacts) || contacts.length === 0) {
        return {
          allowed: false,
          reason: 'At least one approval contact is required before submission.'
        };
      }
    } catch {
      return { allowed: false, reason: 'Invalid approval contacts data.' };
    }
  }

  // Rule: Cannot move to in_production unless status is approved
  if (newStatus === 'in_production' && brief.status !== 'approved') {
    return {
      allowed: false,
      reason: 'Brief must be approved before moving to production.'
    };
  }

  return { allowed: true };
}

/**
 * Determine if auto-submit should trigger.
 * If the brief is in draft and completeness >= 80%, suggest auto-submit.
 * @param {Object} brief
 * @returns {{ shouldAutoSubmit: boolean, score: number }}
 */
function checkAutoSubmitEligibility(brief) {
  const score = calculateCompletenessScore(brief);
  return {
    shouldAutoSubmit: brief.status === 'draft' && score >= 80,
    score
  };
}

/**
 * Check deadline-related alerts for a brief.
 * @param {Object} brief
 * @returns {Array<{ type: string, message: string }>}
 */
function checkDeadlineAlerts(brief) {
  const alerts = [];
  if (!brief.deadline) return alerts;

  const now = new Date();
  const deadline = new Date(brief.deadline);
  const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

  if (brief.status !== 'completed' && brief.status !== 'archived') {
    if (daysUntilDeadline < 0) {
      alerts.push({
        type: 'overdue',
        message: `Brief "${brief.project_title}" is ${Math.abs(daysUntilDeadline)} day(s) past deadline.`
      });
    } else if (daysUntilDeadline === 0) {
      alerts.push({
        type: 'deadline_approaching',
        message: `Brief "${brief.project_title}" deadline is TODAY.`
      });
    } else if (daysUntilDeadline <= 3) {
      alerts.push({
        type: 'deadline_approaching',
        message: `Brief "${brief.project_title}" deadline is in ${daysUntilDeadline} day(s).`
      });
    }
  }

  return alerts;
}

/**
 * Check for stale reviews (under_review for > 7 days with no updates).
 * @param {Object} brief
 * @returns {{ isStale: boolean, daysSinceUpdate: number } | null}
 */
function checkStaleReview(brief) {
  if (brief.status !== 'under_review') return null;

  const updatedAt = new Date(brief.updated_at);
  const now = new Date();
  const daysSinceUpdate = Math.ceil((now - updatedAt) / (1000 * 60 * 60 * 24));

  return {
    isStale: daysSinceUpdate > 7,
    daysSinceUpdate
  };
}

module.exports = {
  COMPLETENESS_WEIGHTS,
  VALID_TRANSITIONS,
  calculateCompletenessScore,
  validateStatusTransition,
  enforceStatusGates,
  checkAutoSubmitEligibility,
  checkDeadlineAlerts,
  checkStaleReview
};
