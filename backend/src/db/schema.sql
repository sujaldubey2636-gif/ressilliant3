-- ============================================================
-- DigiQuest Studio — Client Pre-Production Brief Collection System
-- Database Schema
-- ============================================================

-- Clients / Companies
CREATE TABLE IF NOT EXISTS clients (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name  TEXT    NOT NULL,
  contact_person TEXT   NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  phone         TEXT,
  industry      TEXT,
  address       TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Production Briefs (core table)
CREATE TABLE IF NOT EXISTS briefs (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id                 INTEGER,
  -- Brief metadata
  project_title             TEXT    NOT NULL,
  project_type              TEXT    NOT NULL CHECK(project_type IN (
                              'film','web_series','advertisement','corporate',
                              'animation','vfx','dubbing','post_production','other'
                            )),
  -- Script
  script_text               TEXT,
  script_file_path          TEXT,
  -- References
  references_text           TEXT,
  references_file_paths     TEXT,          -- JSON array of file paths
  -- Brand Guidelines
  brand_guidelines_text     TEXT,
  brand_guidelines_file_path TEXT,
  -- Delivery
  delivery_format           TEXT    NOT NULL CHECK(delivery_format IN (
                              'mp4_1080p','mp4_4k','prores','mov','avi',
                              'wav_audio','custom'
                            )),
  delivery_specifications   TEXT,          -- JSON string for extra specs
  -- Approval workflow
  approval_contacts         TEXT    NOT NULL DEFAULT '[]',  -- JSON array
  -- Project details
  deadline                  DATE,
  budget_range              TEXT    CHECK(budget_range IN (
                              'under_1l','1l_5l','5l_15l','15l_50l','above_50l',NULL
                            )),
  special_requirements      TEXT,
  -- Status tracking
  status                    TEXT    DEFAULT 'draft' CHECK(status IN (
                              'draft','submitted','under_review','approved',
                              'revision_requested','in_production','completed','archived'
                            )),
  priority                  TEXT    DEFAULT 'normal' CHECK(priority IN (
                              'low','normal','high','urgent'
                            )),
  completeness_score        INTEGER DEFAULT 0 CHECK(completeness_score BETWEEN 0 AND 100),
  -- Timestamps
  created_at                DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at                DATETIME DEFAULT CURRENT_TIMESTAMP,
  submitted_at              DATETIME,
  approved_at               DATETIME,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Audit logs — every change is tracked
CREATE TABLE IF NOT EXISTS audit_logs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  brief_id       INTEGER,
  action         TEXT NOT NULL,  -- 'created','updated','status_changed','file_uploaded','approved','rejected'
  field_changed  TEXT,
  old_value      TEXT,
  new_value      TEXT,
  performed_by   TEXT DEFAULT 'system',
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brief_id) REFERENCES briefs(id)
);

-- Alerts / Notifications
CREATE TABLE IF NOT EXISTS alerts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  brief_id    INTEGER,
  type        TEXT NOT NULL,   -- 'deadline_approaching','incomplete_brief','pending_approval','overdue','stale_review'
  message     TEXT NOT NULL,
  is_read     INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brief_id) REFERENCES briefs(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_briefs_status      ON briefs(status);
CREATE INDEX IF NOT EXISTS idx_briefs_client       ON briefs(client_id);
CREATE INDEX IF NOT EXISTS idx_briefs_project_type ON briefs(project_type);
CREATE INDEX IF NOT EXISTS idx_briefs_priority     ON briefs(priority);
CREATE INDEX IF NOT EXISTS idx_briefs_deadline     ON briefs(deadline);
CREATE INDEX IF NOT EXISTS idx_briefs_created      ON briefs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_brief         ON audit_logs(brief_id);
CREATE INDEX IF NOT EXISTS idx_alerts_brief        ON alerts(brief_id);
CREATE INDEX IF NOT EXISTS idx_alerts_read         ON alerts(is_read);
