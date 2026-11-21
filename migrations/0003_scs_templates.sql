-- Stage 2: versioned, validated Centauri SCS templates.
-- Apply to existing D1 before deploying worker routes that depend on this table.
CREATE TABLE IF NOT EXISTS scs_templates (
 id TEXT PRIMARY KEY,
 faction TEXT NOT NULL,
 name TEXT NOT NULL,
 model TEXT NOT NULL,
 sheet_revision TEXT NOT NULL,
 source_publication TEXT NOT NULL,
 source_page TEXT NOT NULL,
 definition_json TEXT NOT NULL,
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(faction,name,model,sheet_revision,source_publication)
);
CREATE INDEX IF NOT EXISTS idx_scs_faction ON scs_templates(faction,name);
