// ============================================================
// DigiQuest Studio — Input Validation Middleware
// ============================================================
// Validates and sanitises all incoming request data for briefs,
// clients, and status transitions.
// ============================================================

/**
 * Strip HTML tags and dangerous characters from a string.
 */
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<[^>]*>/g, '')          // strip HTML tags
    .replace(/[<>]/g, '')             // remove stray angle brackets
    .trim();
}

/**
 * Validate email format.
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Valid enum values
const VALID_PROJECT_TYPES = [
  'film', 'web_series', 'advertisement', 'corporate',
  'animation', 'vfx', 'dubbing', 'post_production', 'other'
];

const VALID_DELIVERY_FORMATS = [
  'mp4_1080p', 'mp4_4k', 'prores', 'mov', 'avi', 'wav_audio', 'custom'
];

const VALID_STATUSES = [
  'draft', 'submitted', 'under_review', 'approved',
  'revision_requested', 'in_production', 'completed', 'archived'
];

const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const VALID_BUDGET_RANGES = ['under_1l', '1l_5l', '5l_15l', '15l_50l', 'above_50l'];

/**
 * Middleware: Validate brief creation / update payload.
 */
function validateBrief(req, res, next) {
  const errors = [];
  const body = req.body;

  // Required: project_title
  if (!body.project_title || sanitize(body.project_title).length < 2) {
    errors.push('Project title is required and must be at least 2 characters.');
  }

  // Required: project_type
  if (!body.project_type || !VALID_PROJECT_TYPES.includes(body.project_type)) {
    errors.push(`Project type is required. Valid values: ${VALID_PROJECT_TYPES.join(', ')}`);
  }

  // Required: delivery_format
  if (!body.delivery_format || !VALID_DELIVERY_FORMATS.includes(body.delivery_format)) {
    errors.push(`Delivery format is required. Valid values: ${VALID_DELIVERY_FORMATS.join(', ')}`);
  }

  // Optional but validated: priority
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    errors.push(`Invalid priority. Valid values: ${VALID_PRIORITIES.join(', ')}`);
  }

  // Optional but validated: budget_range
  if (body.budget_range && !VALID_BUDGET_RANGES.includes(body.budget_range)) {
    errors.push(`Invalid budget range. Valid values: ${VALID_BUDGET_RANGES.join(', ')}`);
  }

  // Optional but validated: approval_contacts (must be valid JSON array)
  if (body.approval_contacts) {
    try {
      let contacts;
      if (typeof body.approval_contacts === 'string') {
        contacts = JSON.parse(body.approval_contacts);
      } else {
        contacts = body.approval_contacts;
      }

      if (!Array.isArray(contacts)) {
        errors.push('Approval contacts must be an array.');
      } else {
        contacts.forEach((contact, i) => {
          if (!contact.name || sanitize(contact.name).length < 1) {
            errors.push(`Approval contact ${i + 1}: name is required.`);
          }
          if (!contact.email || !isValidEmail(contact.email)) {
            errors.push(`Approval contact ${i + 1}: valid email is required.`);
          }
        });
        // Store as sanitised JSON string
        body.approval_contacts = JSON.stringify(contacts);
      }
    } catch {
      errors.push('Approval contacts must be valid JSON.');
    }
  }

  // Optional but validated: deadline (must be a valid date)
  if (body.deadline) {
    const d = new Date(body.deadline);
    if (isNaN(d.getTime())) {
      errors.push('Deadline must be a valid date (YYYY-MM-DD).');
    }
  }

  // Sanitise text fields
  if (body.project_title) body.project_title = sanitize(body.project_title);
  if (body.script_text) body.script_text = sanitize(body.script_text);
  if (body.references_text) body.references_text = sanitize(body.references_text);
  if (body.brand_guidelines_text) body.brand_guidelines_text = sanitize(body.brand_guidelines_text);
  if (body.special_requirements) body.special_requirements = sanitize(body.special_requirements);
  if (body.delivery_specifications) body.delivery_specifications = sanitize(body.delivery_specifications);

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors
    });
  }

  next();
}

/**
 * Middleware: Validate status change payload.
 */
function validateStatusChange(req, res, next) {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Status is required.',
      errors: ['The "status" field must be provided in the request body.']
    });
  }

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status value.',
      errors: [`Valid statuses: ${VALID_STATUSES.join(', ')}`]
    });
  }

  next();
}

/**
 * Middleware: Validate client creation payload.
 */
function validateClient(req, res, next) {
  const errors = [];
  const body = req.body;

  if (!body.company_name || sanitize(body.company_name).length < 2) {
    errors.push('Company name is required and must be at least 2 characters.');
  }
  if (!body.contact_person || sanitize(body.contact_person).length < 2) {
    errors.push('Contact person name is required.');
  }
  if (!body.email || !isValidEmail(body.email)) {
    errors.push('A valid email address is required.');
  }

  // Sanitise
  if (body.company_name) body.company_name = sanitize(body.company_name);
  if (body.contact_person) body.contact_person = sanitize(body.contact_person);
  if (body.address) body.address = sanitize(body.address);
  if (body.industry) body.industry = sanitize(body.industry);

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed.', errors });
  }

  next();
}

module.exports = {
  validateBrief,
  validateStatusChange,
  validateClient,
  sanitize,
  isValidEmail,
  VALID_PROJECT_TYPES,
  VALID_DELIVERY_FORMATS,
  VALID_STATUSES,
  VALID_PRIORITIES,
  VALID_BUDGET_RANGES
};
