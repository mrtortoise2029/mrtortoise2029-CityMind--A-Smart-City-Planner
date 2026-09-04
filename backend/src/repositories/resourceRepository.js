import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import * as demoRepository from './demoCityRepository.js';

const parseJsonField = (row, field) => ({
  ...row,
  [field]: typeof row[field] === 'string' ? JSON.parse(row[field]) : row[field],
});

export async function findWardsByCity(cityId) {
  if (env.demoMode) return demoRepository.findWardsByCity(cityId);
  const [rows] = await pool.execute(`
    SELECT id, city_id, name, ward_code, latitude, longitude, area_sq_km, boundary_geojson
    FROM wards
    WHERE city_id = ?
    ORDER BY name
  `, [cityId]);
  return rows.map((row) => parseJsonField(row, 'boundary_geojson'));
}

export async function findWardById(wardId) {
  if (env.demoMode) return demoRepository.findWardById(wardId);
  const [rows] = await pool.execute(`
    SELECT id, city_id, name, ward_code, latitude, longitude, area_sq_km, boundary_geojson
    FROM wards
    WHERE id = ?
  `, [wardId]);
  return rows[0] ? parseJsonField(rows[0], 'boundary_geojson') : null;
}

export async function findPopulationByWard(wardId) {
  if (env.demoMode) return demoRepository.findPopulationByWard(wardId);
  const [rows] = await pool.execute(`
    SELECT id, ward_id, year, population, population_density, growth_rate
    FROM population_data
    WHERE ward_id = ?
    ORDER BY year DESC
  `, [wardId]);
  return rows;
}

export async function findFacilitiesByWard(wardId) {
  if (env.demoMode) return demoRepository.findFacilitiesByWard(wardId);
  const [rows] = await pool.execute(`
    SELECT id, ward_id, name, type, latitude, longitude, capacity, status, source
    FROM facilities
    WHERE ward_id = ?
    ORDER BY type, name
  `, [wardId]);
  return rows;
}

export async function findFacilitiesByCity(cityId) {
  if (env.demoMode) return demoRepository.findFacilities(cityId);
  const [rows] = await pool.execute(`
    SELECT f.id, f.ward_id, f.name, f.type, f.latitude, f.longitude, f.capacity, f.status, f.source
    FROM facilities f JOIN wards w ON w.id = f.ward_id
    WHERE w.city_id = ? AND f.status = 'active'
    ORDER BY f.type, f.name
  `, [cityId]);
  return rows;
}

export async function findRoadsByWard(wardId) {
  if (env.demoMode) return demoRepository.findRoadsByWard(wardId);
  const [rows] = await pool.execute(`
    SELECT id, ward_id, name, road_type, length_km, condition_rating, congestion_level, geometry
    FROM roads
    WHERE ward_id = ?
    ORDER BY name
  `, [wardId]);
  return rows.map((row) => parseJsonField(row, 'geometry'));
}

export async function findRoadsByCity(cityId) {
  if (env.demoMode) return demoRepository.findRoads(cityId);
  const [rows] = await pool.execute(`
    SELECT r.id, r.ward_id, r.name, r.road_type, r.length_km,
           r.condition_rating, r.congestion_level, r.geometry
    FROM roads r JOIN wards w ON w.id = r.ward_id
    WHERE w.city_id = ? ORDER BY r.name
  `, [cityId]);
  return rows.map((row) => parseJsonField(row, 'geometry'));
}

export async function findEnvironmentByWard(wardId) {
  if (env.demoMode) return demoRepository.findEnvironmentByWard(wardId);
  const [rows] = await pool.execute(`
    SELECT id, ward_id, air_quality_index, green_cover_percent, water_quality_index,
           noise_level_db, recorded_at
    FROM environment_data
    WHERE ward_id = ?
    ORDER BY recorded_at DESC
  `, [wardId]);
  return rows;
}

export async function findAnalysisByWard(wardId) {
  if (env.demoMode) return demoRepository.findAnalysisByWard(wardId);
  const [rows] = await pool.execute(`
    SELECT id, ward_id, analysis_type, score, findings, analyzed_at
    FROM area_analysis
    WHERE ward_id = ?
    ORDER BY analyzed_at DESC
  `, [wardId]);
  return rows.map((row) => parseJsonField(row, 'findings'));
}

export async function findRecommendations(cityId, wardId) {
  if (env.demoMode) return demoRepository.findRecommendations(cityId, wardId);

  if (wardId !== undefined) {
    const [rows] = await pool.execute(`
      SELECT id, city_id, ward_id, title, description, category, project_type,
             recommendation_score, population_need_score, infrastructure_gap_score,
             accessibility_score, future_demand_score, existing_coverage_score,
             planning_horizon, priority, status, estimated_cost, estimated_impact,
             expected_population_served, created_at
      FROM recommendations
      WHERE city_id = ? AND ward_id = ?
      ORDER BY FIELD(priority, 'critical', 'high', 'medium', 'low'), created_at DESC
    `, [cityId, wardId]);
    return rows;
  }

  const [rows] = await pool.execute(`
    SELECT id, city_id, ward_id, title, description, category, project_type,
           recommendation_score, population_need_score, infrastructure_gap_score,
           accessibility_score, future_demand_score, existing_coverage_score,
           planning_horizon, priority, status, estimated_cost, estimated_impact,
           expected_population_served, created_at
    FROM recommendations
    WHERE city_id = ?
    ORDER BY FIELD(priority, 'critical', 'high', 'medium', 'low'), created_at DESC
  `, [cityId]);
  return rows;
}
