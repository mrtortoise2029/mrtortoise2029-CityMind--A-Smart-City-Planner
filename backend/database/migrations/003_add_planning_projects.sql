USE citymind;

CREATE TABLE IF NOT EXISTS planning_projects (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_user_id BIGINT UNSIGNED,
  city_id INT UNSIGNED,
  name VARCHAR(180) NOT NULL,
  project_type ENUM('NEW_DEVELOPMENT','EXISTING_AREA','REDEVELOPMENT','URBAN_EXPANSION') NOT NULL,
  planning_stage VARCHAR(80) NOT NULL DEFAULT 'Discovery',
  status ENUM('draft','active','archived') NOT NULL DEFAULT 'draft',
  area_acres DECIMAL(12,2),
  current_population INT UNSIGNED,
  expected_population INT UNSIGNED,
  planning_horizon TINYINT UNSIGNED NOT NULL,
  progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  health_score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_planning_project_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_planning_project_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL,
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
  boundary_source ENUM('drawn','uploaded','imported') NOT NULL DEFAULT 'drawn',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_planning_area_project FOREIGN KEY (planning_project_id) REFERENCES planning_projects(id) ON DELETE CASCADE,
  UNIQUE KEY uq_planning_area_project (planning_project_id)
);

ALTER TABLE recommendations
  ADD COLUMN planning_project_id BIGINT UNSIGNED NULL AFTER id,
  ADD CONSTRAINT fk_recommendation_planning_project
    FOREIGN KEY (planning_project_id) REFERENCES planning_projects(id) ON DELETE SET NULL,
  ADD INDEX idx_recommendation_planning_project (planning_project_id);
