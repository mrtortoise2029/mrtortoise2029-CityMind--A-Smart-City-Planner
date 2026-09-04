import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import * as demoRepository from './demoCityRepository.js';

export async function findCities() {
  if (env.demoMode) return demoRepository.findCities();
  const [rows] = await pool.query(`
    SELECT c.id, c.name, c.country, c.latitude, c.longitude,
           COUNT(DISTINCT w.id) AS ward_count,
           COALESCE(SUM(pd.population), 0) AS population
    FROM cities c
    LEFT JOIN wards w ON w.city_id = c.id
    LEFT JOIN population_data pd ON pd.ward_id = w.id AND pd.year = (
      SELECT MAX(pd2.year) FROM population_data pd2 WHERE pd2.ward_id = w.id
    )
    GROUP BY c.id
    ORDER BY c.name
  `);
  return rows;
}

export async function findCityById(cityId) {
  if (env.demoMode) return demoRepository.findCityById(cityId);
  const [rows] = await pool.execute(
    'SELECT id, name, country, latitude, longitude, area_sq_km FROM cities WHERE id = ?',
    [cityId],
  );
  return rows[0] ?? null;
}

export async function findWardMetrics(cityId) {
  if (env.demoMode) return demoRepository.findWardMetrics(cityId);
  const [rows] = await pool.execute(`
    SELECT w.id, w.name, w.ward_code, w.latitude, w.longitude, w.area_sq_km,
           w.boundary_geojson,
           COALESCE(pd.population, 0) AS population,
           COALESCE(pd.population_density, 0) AS population_density,
           COALESCE(pd.growth_rate, 0) AS growth_rate,
           COALESCE(f.hospitals, 0) AS hospitals,
           COALESCE(f.hospital_capacity, 0) AS hospital_capacity,
           COALESCE(f.schools, 0) AS schools,
           COALESCE(f.school_capacity, 0) AS school_capacity,
           COALESCE(f.parks, 0) AS parks,
           COALESCE(f.total_facilities, 0) AS total_facilities,
           COALESCE(r.road_length_km, 0) AS road_length_km,
           COALESCE(r.good_road_percent, 0) AS good_road_percent,
           COALESCE(r.average_road_condition, 0) AS average_road_condition,
           COALESCE(r.congestion_score, 0) AS congestion_score,
           COALESCE(e.air_quality_index, 0) AS air_quality_index,
           COALESCE(e.green_cover_percent, 0) AS green_cover_percent,
           COALESCE(e.water_quality_index, 0) AS water_quality_index,
           COALESCE(e.noise_level_db, 0) AS noise_level_db
    FROM wards w
    LEFT JOIN population_data pd ON pd.ward_id = w.id AND pd.year = (
      SELECT MAX(pd2.year) FROM population_data pd2 WHERE pd2.ward_id = w.id
    )
    LEFT JOIN (
      SELECT ward_id,
             SUM(type = 'hospital') AS hospitals,
             SUM(CASE WHEN type = 'hospital' THEN capacity ELSE 0 END) AS hospital_capacity,
             SUM(type = 'school') AS schools,
             SUM(CASE WHEN type = 'school' THEN capacity ELSE 0 END) AS school_capacity,
             SUM(type = 'park') AS parks,
             COUNT(*) AS total_facilities
      FROM facilities GROUP BY ward_id
    ) f ON f.ward_id = w.id
    LEFT JOIN (
      SELECT ward_id, SUM(length_km) AS road_length_km,
             SUM(CASE WHEN condition_rating >= 3 THEN length_km ELSE 0 END)
               / NULLIF(SUM(length_km), 0) * 100 AS good_road_percent,
             AVG(condition_rating) AS average_road_condition,
             AVG(CASE congestion_level
               WHEN 'low' THEN 100 WHEN 'medium' THEN 70
               WHEN 'high' THEN 40 WHEN 'severe' THEN 15 ELSE 0 END) AS congestion_score
      FROM roads GROUP BY ward_id
    ) r ON r.ward_id = w.id
    LEFT JOIN environment_data e ON e.ward_id = w.id AND e.recorded_at = (
      SELECT MAX(e2.recorded_at) FROM environment_data e2 WHERE e2.ward_id = w.id
    )
    WHERE w.city_id = ?
    ORDER BY w.name
  `, [cityId]);
  return rows.map((row) => ({
    ...row,
    boundary_geojson: typeof row.boundary_geojson === 'string'
      ? JSON.parse(row.boundary_geojson)
      : row.boundary_geojson,
  }));
}

export async function findFacilities(cityId) {
  if (env.demoMode) return demoRepository.findFacilities(cityId);
  const [rows] = await pool.execute(`
    SELECT f.id, f.name, f.type, f.latitude, f.longitude, f.capacity, f.status,
           w.id AS ward_id, w.name AS ward_name
    FROM facilities f
    JOIN wards w ON w.id = f.ward_id
    WHERE w.city_id = ?
    ORDER BY f.type, f.name
  `, [cityId]);
  return rows;
}

export async function findRoads(cityId) {
  if (env.demoMode) return demoRepository.findRoads(cityId);
  const [rows] = await pool.execute(`
    SELECT r.id, r.name, r.road_type, r.length_km, r.condition_rating,
           r.congestion_level, r.geometry, w.id AS ward_id
    FROM roads r JOIN wards w ON w.id = r.ward_id
    WHERE w.city_id = ?
  `, [cityId]);
  return rows.map((row) => ({
    ...row,
    geometry: typeof row.geometry === 'string' ? JSON.parse(row.geometry) : row.geometry,
  }));
}

export async function findSavedRecommendations(cityId) {
  if (env.demoMode) return demoRepository.findSavedRecommendations(cityId);
  const [rows] = await pool.execute(`
    SELECT r.id, r.title, r.description, r.category, r.priority, r.status,
           r.estimated_cost, r.estimated_impact, r.created_at, w.name AS ward_name
    FROM recommendations r
    LEFT JOIN wards w ON w.id = r.ward_id
    WHERE r.city_id = ? AND r.status <> 'dismissed'
    ORDER BY FIELD(r.priority, 'critical', 'high', 'medium', 'low'), r.created_at DESC
  `, [cityId]);
  return rows;
}

