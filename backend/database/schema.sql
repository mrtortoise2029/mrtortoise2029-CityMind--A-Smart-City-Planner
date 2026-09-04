CREATE DATABASE IF NOT EXISTS citymind CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE citymind;

CREATE TABLE IF NOT EXISTS roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id INT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS cities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  country VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  area_sq_km DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- A planning project is the private-sector workspace. It is intentionally
-- separate from `projects`, which tracks delivery work created from a recommendation.
CREATE TABLE IF NOT EXISTS planning_projects (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  city_id INT UNSIGNED,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  project_type ENUM('NEW_DEVELOPMENT','EXISTING_AREA','REDEVELOPMENT','URBAN_EXPANSION') NOT NULL,
  country VARCHAR(100) NOT NULL,
  region VARCHAR(160) NOT NULL,
  location_search VARCHAR(255),
  planning_stage VARCHAR(80) NOT NULL DEFAULT 'Discovery',
  status ENUM('draft','active','archived') NOT NULL DEFAULT 'draft',
  area_acres DECIMAL(12,2),
  current_population INT UNSIGNED,
  expected_population INT UNSIGNED,
  current_households INT UNSIGNED,
  expected_households INT UNSIGNED,
  current_density DECIMAL(12,2),
  target_density DECIMAL(12,2),
  planning_horizon TINYINT UNSIGNED NOT NULL,
  progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  health_score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL,
  INDEX idx_planning_project_owner_status (owner_user_id, status)
);

CREATE TABLE IF NOT EXISTS planning_areas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  planning_project_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  boundary_geojson JSON,
  centroid_latitude DECIMAL(10,7),
  centroid_longitude DECIMAL(10,7),
  area_acres DECIMAL(12,2),
  area_sq_km DECIMAL(12,4),
  boundary_source ENUM('drawn','uploaded','imported') NOT NULL DEFAULT 'drawn',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (planning_project_id) REFERENCES planning_projects(id) ON DELETE CASCADE,
  UNIQUE KEY uq_planning_area_project (planning_project_id)
);

CREATE TABLE IF NOT EXISTS planning_features (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  planning_project_id BIGINT UNSIGNED NOT NULL,
  feature_type ENUM(
    'PLANNING_POINT','FACILITY_PROPOSAL','ROAD_PROPOSAL','RESIDENTIAL_ZONE',
    'COMMERCIAL_ZONE','EDUCATION_ZONE','HEALTHCARE_ZONE','GREEN_ZONE','FUTURE_DEVELOPMENT_AREA',
    'BLOCK','PRIMARY_ROAD','SECONDARY_ROAD','LOCAL_ROAD','MAIN_GATE','SECONDARY_GATE',
    'RECREATION_ZONE','UTILITY_ZONE','DRAINAGE_CORRIDOR','WATER_BODY','COMMUNITY_FACILITY'
  ) NOT NULL,
  category VARCHAR(60),
  name VARCHAR(180) NOT NULL,
  geometry JSON NOT NULL,
  status ENUM('proposed','recommended','approved','rejected') NOT NULL DEFAULT 'proposed',
  source ENUM('planner','citymind') NOT NULL DEFAULT 'planner',
  properties JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (planning_project_id) REFERENCES planning_projects(id) ON DELETE CASCADE,
  INDEX idx_planning_feature_project_type (planning_project_id, feature_type)
);

CREATE TABLE IF NOT EXISTS wards (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  city_id INT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  ward_code VARCHAR(30) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  area_sq_km DECIMAL(10,2),
  boundary_geojson JSON,
  UNIQUE KEY uq_city_ward (city_id, ward_code),
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS population_data (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ward_id INT UNSIGNED NOT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  population INT UNSIGNED NOT NULL,
  population_density DECIMAL(12,2),
  growth_rate DECIMAL(6,2),
  UNIQUE KEY uq_ward_population_year (ward_id, year),
  FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS facilities (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ward_id INT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  type ENUM('hospital','school','park','fire_station','police_station','market','other') NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  capacity INT UNSIGNED,
  status ENUM('active','planned','inactive') NOT NULL DEFAULT 'active',
  source VARCHAR(80),
  UNIQUE KEY uq_facility_ward_name (ward_id, name),
  FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE CASCADE,
  INDEX idx_facility_type (type)
);

CREATE TABLE IF NOT EXISTS roads (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ward_id INT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  road_type ENUM('primary','secondary','residential','service') NOT NULL,
  length_km DECIMAL(8,2) NOT NULL,
  condition_rating TINYINT UNSIGNED NOT NULL,
  congestion_level ENUM('low','medium','high','severe') NOT NULL,
  geometry JSON,
  UNIQUE KEY uq_road_ward_name (ward_id, name),
  FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS environment_data (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ward_id INT UNSIGNED NOT NULL,
  air_quality_index DECIMAL(6,2),
  green_cover_percent DECIMAL(5,2),
  water_quality_index DECIMAL(5,2),
  noise_level_db DECIMAL(5,2),
  recorded_at DATETIME NOT NULL,
  UNIQUE KEY uq_environment_ward_date (ward_id, recorded_at),
  FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE CASCADE,
  INDEX idx_environment_ward_date (ward_id, recorded_at)
);

CREATE TABLE IF NOT EXISTS area_analysis (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ward_id INT UNSIGNED NOT NULL,
  analysis_type VARCHAR(60) NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  urban_health_score DECIMAL(5,2) NOT NULL,
  findings JSON,
  analyzed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE CASCADE,
  INDEX idx_analysis_ward_type_date (ward_id, analysis_type, analyzed_at)
);

CREATE TABLE IF NOT EXISTS risk_assessments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ward_id INT UNSIGNED NOT NULL,
  risk_type VARCHAR(80) NOT NULL,
  risk_level ENUM('low','moderate','high','critical') NOT NULL,
  probability DECIMAL(5,2),
  impact_score DECIMAL(5,2),
  assessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS growth_predictions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ward_id INT UNSIGNED NOT NULL,
  target_year SMALLINT UNSIGNED NOT NULL,
  predicted_population INT UNSIGNED,
  predicted_growth_rate DECIMAL(6,2),
  model_version VARCHAR(60),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recommendations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  planning_project_id BIGINT UNSIGNED,
  city_id INT UNSIGNED NOT NULL,
  ward_id INT UNSIGNED,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(60) NOT NULL,
  project_type VARCHAR(30),
  recommendation_score DECIMAL(5,2),
  population_need_score DECIMAL(5,2),
  infrastructure_gap_score DECIMAL(5,2),
  accessibility_score DECIMAL(5,2),
  future_demand_score DECIMAL(5,2),
  existing_coverage_score DECIMAL(5,2),
  planning_horizon TINYINT UNSIGNED,
  priority ENUM('low','medium','high','critical') NOT NULL,
  status ENUM('proposed','approved','in_progress','completed','dismissed') NOT NULL DEFAULT 'proposed',
  estimated_cost DECIMAL(15,2),
  estimated_impact VARCHAR(255),
  expected_population_served INT UNSIGNED,
  candidate_label VARCHAR(120),
  candidate_latitude DECIMAL(10,7),
  candidate_longitude DECIMAL(10,7),
  candidate_details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
  FOREIGN KEY (planning_project_id) REFERENCES planning_projects(id) ON DELETE SET NULL,
  FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE SET NULL,
  INDEX idx_recommendation_planning_project (planning_project_id),
  INDEX idx_recommendation_city_type_score (city_id, project_type, recommendation_score)
);

CREATE TABLE IF NOT EXISTS impact_simulations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  recommendation_id BIGINT UNSIGNED NOT NULL,
  scenario_name VARCHAR(120) NOT NULL,
  inputs JSON NOT NULL,
  outputs JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS budgets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  city_id INT UNSIGNED NOT NULL,
  fiscal_year VARCHAR(15) NOT NULL,
  category VARCHAR(80) NOT NULL,
  allocated_amount DECIMAL(15,2) NOT NULL,
  spent_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  city_id INT UNSIGNED NOT NULL,
  recommendation_id BIGINT UNSIGNED,
  name VARCHAR(180) NOT NULL,
  status ENUM('planned','active','paused','completed','cancelled') NOT NULL,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15,2),
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
  FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  city_id INT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED,
  title VARCHAR(180) NOT NULL,
  report_type VARCHAR(60) NOT NULL,
  file_url VARCHAR(500),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
