USE citymind;

ALTER TABLE planning_features MODIFY COLUMN feature_type ENUM(
  'PLANNING_POINT','FACILITY_PROPOSAL','ROAD_PROPOSAL','RESIDENTIAL_ZONE',
  'COMMERCIAL_ZONE','EDUCATION_ZONE','HEALTHCARE_ZONE','GREEN_ZONE','FUTURE_DEVELOPMENT_AREA',
  'BLOCK','PRIMARY_ROAD','SECONDARY_ROAD','LOCAL_ROAD','MAIN_GATE','SECONDARY_GATE',
  'RECREATION_ZONE','UTILITY_ZONE','DRAINAGE_CORRIDOR','WATER_BODY','COMMUNITY_FACILITY'
) NOT NULL;

CREATE TABLE IF NOT EXISTS development_phases (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  planning_project_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  phase_order TINYINT UNSIGNED NOT NULL,
  start_year SMALLINT UNSIGNED NOT NULL,
  end_year SMALLINT UNSIGNED NOT NULL,
  status ENUM('planned','active','completed') NOT NULL DEFAULT 'planned',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (planning_project_id) REFERENCES planning_projects(id) ON DELETE CASCADE,
  UNIQUE KEY uq_project_phase_order (planning_project_id, phase_order)
);

CREATE TABLE IF NOT EXISTS project_analyses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  planning_project_id BIGINT UNSIGNED NOT NULL,
  analysis_type VARCHAR(60) NOT NULL,
  score DECIMAL(5,2),
  inputs JSON NOT NULL,
  results JSON NOT NULL,
  model_version VARCHAR(40) NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (planning_project_id) REFERENCES planning_projects(id) ON DELETE CASCADE,
  INDEX idx_project_analysis_latest (planning_project_id, analysis_type, generated_at)
);

CREATE TABLE IF NOT EXISTS project_scenarios (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  planning_project_id BIGINT UNSIGNED NOT NULL,
  horizon_years TINYINT UNSIGNED NOT NULL,
  scenario_type ENUM('MINIMUM_COST','BALANCED','MAXIMUM_IMPACT','BASELINE') NOT NULL DEFAULT 'BASELINE',
  assumptions JSON NOT NULL,
  results JSON NOT NULL,
  confidence_type ENUM('MEASURED','ESTIMATED','SIMULATED','PLANNING_ASSUMPTION') NOT NULL DEFAULT 'SIMULATED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (planning_project_id) REFERENCES planning_projects(id) ON DELETE CASCADE,
  INDEX idx_project_scenario (planning_project_id, horizon_years)
);

CREATE TABLE IF NOT EXISTS project_budgets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  planning_project_id BIGINT UNSIGNED NOT NULL,
  scenario_name VARCHAR(120) NOT NULL,
  available_budget DECIMAL(15,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'BDT',
  cost_source VARCHAR(255) NOT NULL,
  cost_year SMALLINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (planning_project_id) REFERENCES planning_projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_budget_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_budget_id BIGINT UNSIGNED NOT NULL,
  category VARCHAR(80) NOT NULL,
  estimated_cost DECIMAL(15,2) NOT NULL,
  priority ENUM('low','medium','high','critical') NOT NULL,
  development_phase_id BIGINT UNSIGNED,
  assumptions JSON,
  FOREIGN KEY (project_budget_id) REFERENCES project_budgets(id) ON DELETE CASCADE,
  FOREIGN KEY (development_phase_id) REFERENCES development_phases(id) ON DELETE SET NULL
);

-- Assign legacy projects to a real user before enforcing NOT NULL in production:
-- UPDATE planning_projects SET owner_user_id = <planner_user_id> WHERE owner_user_id IS NULL;
