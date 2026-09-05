USE citymind;

ALTER TABLE recommendations
  ADD COLUMN candidate_label VARCHAR(120) NULL AFTER expected_population_served,
  ADD COLUMN candidate_latitude DECIMAL(10,7) NULL AFTER candidate_label,
  ADD COLUMN candidate_longitude DECIMAL(10,7) NULL AFTER candidate_latitude,
  ADD COLUMN candidate_details JSON NULL AFTER candidate_longitude;
