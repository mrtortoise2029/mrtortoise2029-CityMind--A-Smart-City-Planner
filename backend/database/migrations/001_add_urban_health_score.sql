USE citymind;

ALTER TABLE area_analysis
  ADD COLUMN urban_health_score DECIMAL(5,2) NULL AFTER score;

UPDATE area_analysis
SET urban_health_score = score
WHERE urban_health_score IS NULL;

ALTER TABLE area_analysis
  MODIFY COLUMN urban_health_score DECIMAL(5,2) NOT NULL,
  ADD INDEX idx_analysis_ward_type_date (ward_id, analysis_type, analyzed_at);
