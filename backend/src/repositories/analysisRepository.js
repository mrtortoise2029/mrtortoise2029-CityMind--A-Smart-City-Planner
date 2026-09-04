import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import * as demoRepository from './demoCityRepository.js';

const demoAnalyses = new Map();
let demoAnalysisId = 1;

const congestionValues = { low: 100, medium: 70, high: 40, severe: 15 };

function formatStoredAnalysis(row) {
  const findings = typeof row.findings === 'string' ? JSON.parse(row.findings) : row.findings;
  return {
    analysis_id: row.id,
    ward_id: row.ward_id,
    analysis_type: row.analysis_type,
    analyzed_at: row.analyzed_at,
    ...findings,
  };
}

async function getDemoInput(wardId) {
  const [ward, populationRows, facilities, roads, environmentRows] = await Promise.all([
    demoRepository.findWardById(wardId),
    demoRepository.findPopulationByWard(wardId),
    demoRepository.findFacilitiesByWard(wardId),
    demoRepository.findRoadsByWard(wardId),
    demoRepository.findEnvironmentByWard(wardId),
  ]);
  if (!ward) return null;
  const population = populationRows[0] ?? {};
  const environment = environmentRows[0] ?? {};
  const hospitalFacilities = facilities.filter((facility) => facility.type === 'hospital');
  const schoolFacilities = facilities.filter((facility) => facility.type === 'school');
  const parkFacilities = facilities.filter((facility) => facility.type === 'park');
  return {
    ...ward,
    ...population,
    hospitals: hospitalFacilities.length,
    hospital_capacity: hospitalFacilities.reduce((sum, facility) => sum + Number(facility.capacity || 0), 0),
    schools: schoolFacilities.length,
    school_capacity: schoolFacilities.reduce((sum, facility) => sum + Number(facility.capacity || 0), 0),
    parks: parkFacilities.length,
    road_length_km: roads.reduce((sum, road) => sum + Number(road.length_km || 0), 0),
    average_road_condition: roads.length
      ? roads.reduce((sum, road) => sum + Number(road.condition_rating || 0), 0) / roads.length
      : null,
    congestion_score: roads.length
      ? roads.reduce((sum, road) => sum + (congestionValues[road.congestion_level] ?? 0), 0) / roads.length
      : null,
    ...environment,
  };
}

export async function findWardAnalysisInput(wardId) {
  if (env.demoMode) return getDemoInput(wardId);
  const [[wardRows], [facilityRows], [roadRows], [environmentRows]] = await Promise.all([
    pool.execute(`
      SELECT w.id, w.city_id, w.name, w.ward_code, w.area_sq_km,
             COALESCE(pd.population, 0) AS population,
             pd.population_density AS population_density,
             COALESCE(pd.growth_rate, 0) AS growth_rate
      FROM wards w
      LEFT JOIN population_data pd ON pd.ward_id = w.id AND pd.year = (
        SELECT MAX(p2.year) FROM population_data p2 WHERE p2.ward_id = w.id
      )
      WHERE w.id = ?
    `, [wardId]),
    pool.execute(`
      SELECT SUM(type = 'hospital') AS hospitals,
             COALESCE(SUM(CASE WHEN type = 'hospital' THEN capacity ELSE 0 END), 0) AS hospital_capacity,
             SUM(type = 'school') AS schools,
             COALESCE(SUM(CASE WHEN type = 'school' THEN capacity ELSE 0 END), 0) AS school_capacity,
             SUM(type = 'park') AS parks
      FROM facilities WHERE ward_id = ? AND status = 'active'
    `, [wardId]),
    pool.execute(`
      SELECT COALESCE(SUM(length_km), 0) AS road_length_km,
             AVG(condition_rating) AS average_road_condition,
             AVG(CASE congestion_level
               WHEN 'low' THEN 100 WHEN 'medium' THEN 70
               WHEN 'high' THEN 40 WHEN 'severe' THEN 15 ELSE 0 END) AS congestion_score
      FROM roads WHERE ward_id = ?
    `, [wardId]),
    pool.execute(`
      SELECT air_quality_index, green_cover_percent, water_quality_index, noise_level_db
      FROM environment_data
      WHERE ward_id = ?
      ORDER BY recorded_at DESC LIMIT 1
    `, [wardId]),
  ]);
  if (!wardRows[0]) return null;
  return { ...wardRows[0], ...facilityRows[0], ...roadRows[0], ...(environmentRows[0] ?? {}) };
}

export async function saveWardAnalysis(wardId, findings) {
  if (env.demoMode) {
    const row = {
      id: demoAnalysisId++,
      ward_id: Number(wardId),
      analysis_type: 'urban_gap',
      score: findings.urban_health_score,
      urban_health_score: findings.urban_health_score,
      findings: structuredClone(findings),
      analyzed_at: new Date().toISOString(),
    };
    const history = demoAnalyses.get(Number(wardId)) ?? [];
    history.push(row);
    demoAnalyses.set(Number(wardId), history);
    return formatStoredAnalysis(row);
  }

  const [result] = await pool.execute(`
    INSERT INTO area_analysis (ward_id, analysis_type, score, urban_health_score, findings)
    VALUES (?, 'urban_gap', ?, ?, ?)
  `, [wardId, findings.urban_health_score, findings.urban_health_score, JSON.stringify(findings)]);
  const [rows] = await pool.execute(`
    SELECT id, ward_id, analysis_type, score, urban_health_score, findings, analyzed_at
    FROM area_analysis WHERE id = ?
  `, [result.insertId]);
  return formatStoredAnalysis(rows[0]);
}

export async function findLatestWardAnalysis(wardId) {
  if (env.demoMode) {
    const rows = demoAnalyses.get(Number(wardId)) ?? [];
    return rows.length ? formatStoredAnalysis(rows[rows.length - 1]) : null;
  }
  const [rows] = await pool.execute(`
    SELECT id, ward_id, analysis_type, score, urban_health_score, findings, analyzed_at
    FROM area_analysis
    WHERE ward_id = ? AND analysis_type = 'urban_gap'
    ORDER BY analyzed_at DESC, id DESC LIMIT 1
  `, [wardId]);
  return rows[0] ? formatStoredAnalysis(rows[0]) : null;
}

export async function findLatestCityAnalyses(cityId) {
  if (env.demoMode) {
    const wards = await demoRepository.findWardsByCity(cityId);
    return wards.flatMap((ward) => {
      const rows = demoAnalyses.get(Number(ward.id)) ?? [];
      return rows.length ? [formatStoredAnalysis(rows[rows.length - 1])] : [];
    });
  }
  const [rows] = await pool.execute(`
    SELECT aa.id, aa.ward_id, aa.analysis_type, aa.score, aa.urban_health_score, aa.findings, aa.analyzed_at
    FROM area_analysis aa
    JOIN wards w ON w.id = aa.ward_id
    WHERE w.city_id = ? AND aa.analysis_type = 'urban_gap'
      AND aa.id = (
        SELECT MAX(latest.id) FROM area_analysis latest
        WHERE latest.ward_id = aa.ward_id AND latest.analysis_type = 'urban_gap'
      )
    ORDER BY aa.score ASC, w.name
  `, [cityId]);
  return rows.map(formatStoredAnalysis);
}
