USE citymind;

ALTER TABLE planning_projects
  ADD COLUMN description TEXT NULL AFTER name,
  ADD COLUMN country VARCHAR(100) NOT NULL DEFAULT 'Bangladesh' AFTER project_type,
  ADD COLUMN region VARCHAR(160) NOT NULL DEFAULT 'Dhaka' AFTER country,
  ADD COLUMN location_search VARCHAR(255) NULL AFTER region,
  ADD COLUMN current_households INT UNSIGNED NULL AFTER expected_population,
  ADD COLUMN expected_households INT UNSIGNED NULL AFTER current_households,
  ADD COLUMN current_density DECIMAL(12,2) NULL AFTER expected_households,
  ADD COLUMN target_density DECIMAL(12,2) NULL AFTER current_density;

ALTER TABLE planning_areas
  ADD COLUMN area_sq_km DECIMAL(12,4) NULL AFTER area_acres;
