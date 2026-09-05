USE citymind;

CREATE TABLE IF NOT EXISTS planning_rules (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  planning_project_id BIGINT UNSIGNED NULL,
  rule_code VARCHAR(80) NOT NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  facility_type VARCHAR(60) NULL,
  jurisdiction VARCHAR(160) NOT NULL,
  rule_type ENUM('SYSTEM_VALIDATION','PLANNER_ASSUMPTION','AUTHORITATIVE_POLICY') NOT NULL,
  condition_json JSON NOT NULL,
  severity ENUM('INFO','WARNING','BLOCKING') NOT NULL DEFAULT 'WARNING',
  source_name VARCHAR(255) NOT NULL,
  source_url VARCHAR(500) NULL,
  policy_version VARCHAR(80) NULL,
  effective_year SMALLINT UNSIGNED NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (planning_project_id) REFERENCES planning_projects(id) ON DELETE CASCADE,
  UNIQUE KEY uq_project_rule_code (planning_project_id, rule_code),
  INDEX idx_planning_rules_context (planning_project_id, facility_type, is_active)
);

CREATE TABLE IF NOT EXISTS dataset_sources (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  planning_project_id BIGINT UNSIGNED NULL,
  dataset_key VARCHAR(80) NOT NULL,
  display_name VARCHAR(180) NOT NULL,
  provider VARCHAR(180) NOT NULL,
  source_url VARCHAR(500) NULL,
  classification ENUM('MEASURED','ESTIMATED','SIMULATED','PLANNING_ASSUMPTION') NOT NULL,
  actual_connection BOOLEAN NOT NULL DEFAULT FALSE,
  last_updated_at DATETIME NULL,
  notes TEXT,
  FOREIGN KEY (planning_project_id) REFERENCES planning_projects(id) ON DELETE CASCADE,
  INDEX idx_dataset_sources_project (planning_project_id, dataset_key)
);
