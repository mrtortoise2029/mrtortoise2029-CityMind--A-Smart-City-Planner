USE citymind;

INSERT IGNORE INTO roles (id, name) VALUES (1, 'administrator'), (2, 'planner'), (3, 'viewer');

INSERT INTO users (id, role_id, name, email, password_hash, is_active)
VALUES (1, 2, 'Demo Planner', 'planner@citymind.local', '$2b$10$eS3hw4luwyossoP5eghEYuk2i/2Qw/iD5WPzmKe3Udv6DmGlfpCJW', TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name), role_id = VALUES(role_id),
  password_hash = VALUES(password_hash), is_active = TRUE;

INSERT INTO cities (id, name, country, latitude, longitude, area_sq_km)
VALUES (1, 'Dhaka Central', 'Bangladesh', 23.7806000, 90.4070000, 78.40)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO planning_projects (
  id, owner_user_id, city_id, name, description, project_type, country, region, planning_stage, status, area_acres,
  current_population, expected_population, current_households, expected_households,
  current_density, target_density, planning_horizon, progress_percent, health_score
) VALUES
  (1, 1, 1, 'Bashundhara Residential Area', 'A long-horizon residential master-planning workspace.', 'NEW_DEVELOPMENT', 'Bangladesh', 'Dhaka', 'Master Planning', 'active', 500, NULL, 85000, NULL, 18000, NULL, 170, 20, 32, NULL),
  (2, 1, 1, 'United City', 'An existing community improvement and infrastructure planning workspace.', 'EXISTING_AREA', 'Bangladesh', 'Dhaka', 'Improvement Planning', 'active', 310, 42600, 58000, 9800, NULL, 137.42, NULL, 10, 58, 56)
ON DUPLICATE KEY UPDATE
  owner_user_id = VALUES(owner_user_id), name = VALUES(name),
  project_type = VALUES(project_type), planning_stage = VALUES(planning_stage);

UPDATE planning_projects SET owner_user_id = 1 WHERE id IN (1, 2) AND owner_user_id IS NULL;

INSERT INTO planning_areas (
  planning_project_id, name, boundary_geojson, centroid_latitude,
  centroid_longitude, area_acres, area_sq_km, boundary_source
) VALUES
  (1, 'Bashundhara Residential Area Boundary', JSON_OBJECT(
    'type', 'Polygon', 'coordinates', JSON_ARRAY(JSON_ARRAY(
      JSON_ARRAY(90.4200, 23.7850), JSON_ARRAY(90.4350, 23.7850),
      JSON_ARRAY(90.4350, 23.7970), JSON_ARRAY(90.4200, 23.7970),
      JSON_ARRAY(90.4200, 23.7850)
    ))
  ), 23.7910, 90.4275, 500, 2.0234, 'drawn'),
  (2, 'United City Boundary', JSON_OBJECT(
    'type', 'Polygon', 'coordinates', JSON_ARRAY(JSON_ARRAY(
      JSON_ARRAY(90.4040, 23.7880), JSON_ARRAY(90.4160, 23.7880),
      JSON_ARRAY(90.4160, 23.7970), JSON_ARRAY(90.4040, 23.7970),
      JSON_ARRAY(90.4040, 23.7880)
    ))
  ), 23.7925, 90.4100, 310, 1.2150, 'drawn')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO planning_features (
  id, planning_project_id, feature_type, category, name, geometry, status, source, properties
) VALUES (
  1, 1, 'FACILITY_PROPOSAL', 'hospital', 'Proposed Community Hospital',
  JSON_OBJECT('type', 'Point', 'coordinates', JSON_ARRAY(90.4280, 23.7910)),
  'recommended', 'citymind', JSON_OBJECT('note', 'Demonstration planning proposal')
), (
  2, 1, 'BLOCK', 'residential', 'Block A',
  JSON_OBJECT('type', 'Polygon', 'coordinates', JSON_ARRAY(JSON_ARRAY(
    JSON_ARRAY(90.421,23.786),JSON_ARRAY(90.425,23.786),JSON_ARRAY(90.425,23.796),
    JSON_ARRAY(90.421,23.796),JSON_ARRAY(90.421,23.786)
  ))), 'proposed', 'planner', JSON_OBJECT('blockId','A','landUse','residential','phase',1,'population',26000,'households',5530,'greenSpacePercent',8,'utilityCoverage',68)
), (
  3, 1, 'BLOCK', 'residential', 'Block B',
  JSON_OBJECT('type', 'Polygon', 'coordinates', JSON_ARRAY(JSON_ARRAY(
    JSON_ARRAY(90.426,23.786),JSON_ARRAY(90.430,23.786),JSON_ARRAY(90.430,23.796),
    JSON_ARRAY(90.426,23.796),JSON_ARRAY(90.426,23.786)
  ))), 'proposed', 'planner', JSON_OBJECT('blockId','B','landUse','residential','phase',1,'population',30000,'households',6380,'greenSpacePercent',14,'utilityCoverage',76)
), (
  4, 1, 'BLOCK', 'mixed-use', 'Block C',
  JSON_OBJECT('type', 'Polygon', 'coordinates', JSON_ARRAY(JSON_ARRAY(
    JSON_ARRAY(90.431,23.786),JSON_ARRAY(90.434,23.786),JSON_ARRAY(90.434,23.796),
    JSON_ARRAY(90.431,23.796),JSON_ARRAY(90.431,23.786)
  ))), 'proposed', 'planner', JSON_OBJECT('blockId','C','landUse','mixed-use','phase',2,'population',29000,'households',6090,'greenSpacePercent',6,'utilityCoverage',62)
), (
  5, 1, 'PRIMARY_ROAD', 'primary', 'Central Primary Avenue',
  JSON_OBJECT('type','LineString','coordinates',JSON_ARRAY(JSON_ARRAY(90.4205,23.791),JSON_ARRAY(90.4345,23.791))),
  'proposed','planner',JSON_OBJECT('widthMeters',24)
), (
  6, 1, 'SECONDARY_ROAD', 'secondary', 'North-South Connector',
  JSON_OBJECT('type','LineString','coordinates',JSON_ARRAY(JSON_ARRAY(90.428,23.7855),JSON_ARRAY(90.428,23.7965))),
  'proposed','planner',JSON_OBJECT('widthMeters',16)
), (
  7, 1, 'LOCAL_ROAD', 'local', 'Block C Local Street',
  JSON_OBJECT('type','LineString','coordinates',JSON_ARRAY(JSON_ARRAY(90.4315,23.788),JSON_ARRAY(90.4335,23.794))),
  'proposed','planner',JSON_OBJECT('widthMeters',9)
), (
  8, 1, 'MAIN_GATE', 'entry', 'Main Western Gate',
  JSON_OBJECT('type','Point','coordinates',JSON_ARRAY(90.4201,23.791)),
  'proposed','planner',JSON_OBJECT('connectedRoad','Central Primary Avenue')
), (
  9, 1, 'FACILITY_PROPOSAL', 'school', 'Block A Community School',
  JSON_OBJECT('type','Point','coordinates',JSON_ARRAY(90.423,23.793)),
  'proposed','planner',JSON_OBJECT('capacity',1800)
), (
  10, 1, 'FACILITY_PROPOSAL', 'park', 'Block B Neighborhood Park',
  JSON_OBJECT('type','Point','coordinates',JSON_ARRAY(90.428,23.794)),
  'proposed','planner',JSON_OBJECT('areaAcres',9)
), (
  11, 2, 'BLOCK', 'residential', 'Block A',
  JSON_OBJECT('type','Polygon','coordinates',JSON_ARRAY(JSON_ARRAY(JSON_ARRAY(90.4045,23.7885),JSON_ARRAY(90.4081,23.7885),JSON_ARRAY(90.4081,23.7965),JSON_ARRAY(90.4045,23.7965),JSON_ARRAY(90.4045,23.7885)))),
  'approved','planner',JSON_OBJECT('blockId','A','landUse','residential','phase',1,'population',14000,'households',3200,'populationConfidence','ESTIMATED','greenSpacePercent',4,'utilityCoverage',58,'landSuitability',68,'constraintLevel','HIGH','constraintNote','Drainage capacity requires field verification.')
), (
  12, 2, 'BLOCK', 'mixed-use', 'Block B',
  JSON_OBJECT('type','Polygon','coordinates',JSON_ARRAY(JSON_ARRAY(JSON_ARRAY(90.4083,23.7885),JSON_ARRAY(90.4121,23.7885),JSON_ARRAY(90.4121,23.7965),JSON_ARRAY(90.4083,23.7965),JSON_ARRAY(90.4083,23.7885)))),
  'approved','planner',JSON_OBJECT('blockId','B','landUse','mixed-use','phase',1,'population',15600,'households',3600,'populationConfidence','ESTIMATED','greenSpacePercent',11,'utilityCoverage',71,'landSuitability',82,'constraintLevel','LOW','constraintNote','Existing utility easement must be retained.')
), (
  13, 2, 'BLOCK', 'residential', 'Block C',
  JSON_OBJECT('type','Polygon','coordinates',JSON_ARRAY(JSON_ARRAY(JSON_ARRAY(90.4123,23.7885),JSON_ARRAY(90.4155,23.7885),JSON_ARRAY(90.4155,23.7965),JSON_ARRAY(90.4123,23.7965),JSON_ARRAY(90.4123,23.7885)))),
  'approved','planner',JSON_OBJECT('blockId','C','landUse','residential','phase',2,'population',13000,'households',3000,'populationConfidence','ESTIMATED','greenSpacePercent',7,'utilityCoverage',64,'landSuitability',61,'constraintLevel','MEDIUM','constraintNote','Eastern access and storm-water capacity need detailed survey.')
), (
  14, 2, 'PRIMARY_ROAD', 'primary', 'United City Central Avenue',
  JSON_OBJECT('type','LineString','coordinates',JSON_ARRAY(JSON_ARRAY(90.4043,23.7925),JSON_ARRAY(90.4157,23.7925))),
  'approved','planner',JSON_OBJECT('widthMeters',20)
), (
  15, 2, 'SECONDARY_ROAD', 'secondary', 'United City Cross Connector',
  JSON_OBJECT('type','LineString','coordinates',JSON_ARRAY(JSON_ARRAY(90.4102,23.7882),JSON_ARRAY(90.4102,23.7968))),
  'approved','planner',JSON_OBJECT('widthMeters',14)
), (
  16, 2, 'LOCAL_ROAD', 'local', 'Block C Access Street',
  JSON_OBJECT('type','LineString','coordinates',JSON_ARRAY(JSON_ARRAY(90.4130,23.7892),JSON_ARRAY(90.4148,23.7955))),
  'approved','planner',JSON_OBJECT('widthMeters',8)
), (
  17, 2, 'MAIN_GATE', 'entry', 'United City Main Gate',
  JSON_OBJECT('type','Point','coordinates',JSON_ARRAY(90.4041,23.7925)),
  'approved','planner',JSON_OBJECT('connectedRoad','United City Central Avenue')
), (
  18, 2, 'COMMUNITY_FACILITY', 'hospital', 'United City Clinic',
  JSON_OBJECT('type','Point','coordinates',JSON_ARRAY(90.4064,23.7935)),
  'approved','planner',JSON_OBJECT('capacity',120,'dataConfidence','ESTIMATED')
), (
  19, 2, 'COMMUNITY_FACILITY', 'school', 'United City School',
  JSON_OBJECT('type','Point','coordinates',JSON_ARRAY(90.4104,23.7942)),
  'approved','planner',JSON_OBJECT('capacity',950,'dataConfidence','ESTIMATED')
), (
  20, 2, 'COMMUNITY_FACILITY', 'park', 'United City Neighborhood Park',
  JSON_OBJECT('type','Point','coordinates',JSON_ARRAY(90.4138,23.7943)),
  'approved','planner',JSON_OBJECT('areaAcres',5,'dataConfidence','ESTIMATED')
)
ON DUPLICATE KEY UPDATE name = VALUES(name), geometry = VALUES(geometry),
  category = VALUES(category), status = VALUES(status), source = VALUES(source),
  properties = VALUES(properties);

INSERT INTO wards (id, city_id, name, ward_code, latitude, longitude, area_sq_km) VALUES
  (1, 1, 'Banani', 'W19', 23.7937000, 90.4066000, 6.20),
  (2, 1, 'Mohakhali', 'W20', 23.7776000, 90.3994000, 7.10),
  (3, 1, 'Tejgaon', 'W24', 23.7639000, 90.3910000, 8.70),
  (4, 1, 'Badda', 'W21', 23.7802000, 90.4255000, 9.40),
  (5, 1, 'Gulshan', 'W18', 23.7925000, 90.4160000, 7.80),
  (6, 1, 'Rampura', 'W22', 23.7612000, 90.4207000, 8.90)
ON DUPLICATE KEY UPDATE name = VALUES(name), latitude = VALUES(latitude), longitude = VALUES(longitude);

INSERT INTO population_data (ward_id, year, population, population_density, growth_rate) VALUES
  (1, 2026, 42100, 6790.32, 2.1), (2, 2026, 68300, 9619.72, 3.3),
  (3, 2026, 81900, 9413.79, 2.8), (4, 2026, 93500, 9946.81, 4.2),
  (5, 2026, 38600, 4948.72, 1.8), (6, 2026, 104200, 11707.87, 4.6)
ON DUPLICATE KEY UPDATE population = VALUES(population), growth_rate = VALUES(growth_rate);

INSERT IGNORE INTO facilities (ward_id, name, type, latitude, longitude, capacity, status, source) VALUES
  (1, 'Banani Community Clinic', 'hospital', 23.7948, 90.4054, 80, 'active', 'demo'),
  (1, 'Banani Model School', 'school', 23.7921, 90.4083, 900, 'active', 'demo'),
  (1, 'Banani Lake Park', 'park', 23.7961, 90.4091, 1200, 'active', 'demo'),
  (2, 'Mohakhali General Hospital', 'hospital', 23.7790, 90.3980, 220, 'active', 'demo'),
  (2, 'Mohakhali High School', 'school', 23.7758, 90.4010, 1100, 'active', 'demo'),
  (3, 'Tejgaon Government School', 'school', 23.7648, 90.3895, 1300, 'active', 'demo'),
  (3, 'Shahid Anwar Park', 'park', 23.7619, 90.3932, 800, 'active', 'demo'),
  (4, 'Badda Health Centre', 'hospital', 23.7820, 90.4267, 120, 'active', 'demo'),
  (4, 'Badda Primary School', 'school', 23.7785, 90.4238, 1000, 'active', 'demo'),
  (5, 'Gulshan Medical Centre', 'hospital', 23.7917, 90.4146, 160, 'active', 'demo'),
  (5, 'Gulshan Model School', 'school', 23.7940, 90.4184, 950, 'active', 'demo'),
  (5, 'Gulshan Lake Park', 'park', 23.7895, 90.4172, 1700, 'active', 'demo'),
  (6, 'Rampura Primary School', 'school', 23.7625, 90.4220, 1200, 'active', 'demo');

INSERT IGNORE INTO roads (ward_id, name, road_type, length_km, condition_rating, congestion_level, geometry) VALUES
  (1, 'Banani Road 11', 'secondary', 3.2, 4, 'medium', JSON_ARRAY(JSON_ARRAY(23.7908,90.4040),JSON_ARRAY(23.7970,90.4090))),
  (2, 'Mohakhali Link Road', 'primary', 4.8, 3, 'severe', JSON_ARRAY(JSON_ARRAY(23.7730,90.3970),JSON_ARRAY(23.7820,90.4010))),
  (3, 'Tejgaon Industrial Road', 'primary', 6.3, 2, 'high', JSON_ARRAY(JSON_ARRAY(23.7575,90.3870),JSON_ARRAY(23.7700,90.3950))),
  (4, 'Badda Main Road', 'primary', 7.1, 2, 'severe', JSON_ARRAY(JSON_ARRAY(23.7730,90.4230),JSON_ARRAY(23.7880,90.4280))),
  (5, 'Gulshan Avenue', 'primary', 4.1, 5, 'medium', JSON_ARRAY(JSON_ARRAY(23.7865,90.4140),JSON_ARRAY(23.7980,90.4180))),
  (6, 'Rampura DIT Road', 'primary', 7.8, 1, 'severe', JSON_ARRAY(JSON_ARRAY(23.7520,90.4160),JSON_ARRAY(23.7700,90.4250)));

INSERT IGNORE INTO environment_data (ward_id, air_quality_index, green_cover_percent, water_quality_index, noise_level_db, recorded_at) VALUES
  (1, 118, 21, 72, 64, '2026-08-01 09:00:00'),
  (2, 157, 9, 58, 75, '2026-08-01 09:00:00'),
  (3, 171, 7, 51, 79, '2026-08-01 09:00:00'),
  (4, 149, 8, 55, 73, '2026-08-01 09:00:00'),
  (5, 102, 28, 79, 61, '2026-08-01 09:00:00'),
  (6, 184, 5, 47, 81, '2026-08-01 09:00:00');
