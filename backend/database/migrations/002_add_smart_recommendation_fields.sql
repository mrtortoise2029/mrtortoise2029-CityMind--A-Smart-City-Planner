USE citymind;

ALTER TABLE recommendations
  ADD COLUMN project_type VARCHAR(30) NULL AFTER category,
  ADD COLUMN recommendation_score DECIMAL(5,2) NULL AFTER project_type,
  ADD COLUMN population_need_score DECIMAL(5,2) NULL AFTER recommendation_score,
  ADD COLUMN infrastructure_gap_score DECIMAL(5,2) NULL AFTER population_need_score,
  ADD COLUMN accessibility_score DECIMAL(5,2) NULL AFTER infrastructure_gap_score,
  ADD COLUMN future_demand_score DECIMAL(5,2) NULL AFTER accessibility_score,
  ADD COLUMN existing_coverage_score DECIMAL(5,2) NULL AFTER future_demand_score,
  ADD COLUMN planning_horizon TINYINT UNSIGNED NULL AFTER existing_coverage_score,
  ADD COLUMN expected_population_served INT UNSIGNED NULL AFTER estimated_impact,
  ADD INDEX idx_recommendation_city_type_score (city_id, project_type, recommendation_score);
