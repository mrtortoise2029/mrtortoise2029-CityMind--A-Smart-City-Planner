USE citymind;

CREATE TABLE IF NOT EXISTS planning_features (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  planning_project_id BIGINT UNSIGNED NOT NULL,
  feature_type ENUM(
    'PLANNING_POINT','FACILITY_PROPOSAL','ROAD_PROPOSAL','RESIDENTIAL_ZONE',
    'COMMERCIAL_ZONE','EDUCATION_ZONE','HEALTHCARE_ZONE','GREEN_ZONE','FUTURE_DEVELOPMENT_AREA'
  ) NOT NULL,
  category VARCHAR(60),
  name VARCHAR(180) NOT NULL,
  geometry JSON NOT NULL,
  status ENUM('proposed','recommended','approved','rejected') NOT NULL DEFAULT 'proposed',
  source ENUM('planner','citymind') NOT NULL DEFAULT 'planner',
  properties JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_planning_feature_project
    FOREIGN KEY (planning_project_id) REFERENCES planning_projects(id) ON DELETE CASCADE,
  INDEX idx_planning_feature_project_type (planning_project_id, feature_type)
);
