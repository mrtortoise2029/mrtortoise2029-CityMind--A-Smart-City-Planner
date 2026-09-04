import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import * as demoRepository from './demoCityRepository.js';

function mapProject(row) {
  return {
    ...row,
    area: row.planning_area_id ? {
      id: row.planning_area_id,
      name: row.planning_area_name,
      boundary_geojson: typeof row.boundary_geojson === 'string'
        ? JSON.parse(row.boundary_geojson)
        : row.boundary_geojson,
      centroid_latitude: row.centroid_latitude,
      centroid_longitude: row.centroid_longitude,
      area_acres: row.planning_area_acres,
      area_sq_km: row.planning_area_sq_km,
      boundary_source: row.boundary_source,
    } : null,
  };
}

const projectSelect = `
  SELECT p.id, p.owner_user_id, p.city_id, p.name, p.description, p.project_type,
         p.country, p.region, p.location_search,
         p.planning_stage, p.status, p.area_acres, p.current_population,
         p.expected_population, p.current_households, p.expected_households,
         p.current_density, p.target_density, p.planning_horizon, p.progress_percent,
         p.health_score, p.created_at, p.updated_at,
         a.id AS planning_area_id, a.name AS planning_area_name,
         a.boundary_geojson, a.centroid_latitude, a.centroid_longitude,
         a.area_acres AS planning_area_acres, a.area_sq_km AS planning_area_sq_km,
         a.boundary_source
  FROM planning_projects p
  LEFT JOIN planning_areas a ON a.planning_project_id = p.id
`;

export async function findPlanningProjects(ownerUserId) {
  if (env.demoMode) return demoRepository.findPlanningProjects(ownerUserId);
  const [rows] = await pool.query(`${projectSelect}
    WHERE p.owner_user_id = ? AND p.status <> 'archived'
    ORDER BY p.updated_at DESC, p.name
  `, [ownerUserId]);
  return rows.map(mapProject);
}

export async function findPlanningProjectById(projectId, ownerUserId) {
  if (env.demoMode) return demoRepository.findPlanningProjectById(projectId, ownerUserId);
  const [rows] = await pool.execute(`${projectSelect}
    WHERE p.id = ? AND p.owner_user_id = ?
    ORDER BY a.id
    LIMIT 1
  `, [projectId, ownerUserId]);
  return rows[0] ? mapProject(rows[0]) : null;
}

export async function createPlanningProject(record) {
  if (env.demoMode) return demoRepository.createPlanningProject(record);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(`
      INSERT INTO planning_projects (
        owner_user_id, city_id, name, description, project_type, country, region,
        location_search, planning_stage, status, area_acres, current_population,
        expected_population, current_households, expected_households, current_density,
        target_density, planning_horizon, progress_percent, health_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      record.owner_user_id, record.city_id, record.name, record.description,
      record.project_type, record.country, record.region, record.location_search,
      record.planning_stage, record.status, record.area_acres, record.current_population,
      record.expected_population, record.current_households, record.expected_households,
      record.current_density, record.target_density, record.planning_horizon,
      record.progress_percent, record.health_score,
    ]);
    await connection.execute(`
      INSERT INTO planning_areas (
        planning_project_id, name, boundary_geojson, centroid_latitude,
        centroid_longitude, area_acres, area_sq_km, boundary_source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      result.insertId, record.area.name, JSON.stringify(record.area.boundary_geojson),
      record.area.centroid_latitude, record.area.centroid_longitude,
      record.area.area_acres, record.area.area_sq_km, record.area.boundary_source,
    ]);
    await connection.commit();
    return findPlanningProjectById(result.insertId, record.owner_user_id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updatePlanningProject(projectId, record, ownerUserId) {
  if (env.demoMode) return demoRepository.updatePlanningProject(projectId, record, ownerUserId);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(`
      UPDATE planning_projects SET
        city_id = ?, name = ?, description = ?, project_type = ?, country = ?,
        region = ?, location_search = ?, planning_stage = ?, status = ?, area_acres = ?,
        current_population = ?, expected_population = ?, current_households = ?,
        expected_households = ?, current_density = ?, target_density = ?,
        planning_horizon = ?, progress_percent = ?
      WHERE id = ? AND owner_user_id = ?
    `, [
      record.city_id, record.name, record.description, record.project_type, record.country,
      record.region, record.location_search, record.planning_stage, record.status,
      record.area_acres, record.current_population, record.expected_population,
      record.current_households, record.expected_households, record.current_density,
      record.target_density, record.planning_horizon, record.progress_percent, projectId, ownerUserId,
    ]);
    if (!result.affectedRows) {
      await connection.rollback();
      return null;
    }
    await connection.execute(`
      INSERT INTO planning_areas (
        planning_project_id, name, boundary_geojson, centroid_latitude,
        centroid_longitude, area_acres, area_sq_km, boundary_source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name), boundary_geojson = VALUES(boundary_geojson),
        centroid_latitude = VALUES(centroid_latitude), centroid_longitude = VALUES(centroid_longitude),
        area_acres = VALUES(area_acres), area_sq_km = VALUES(area_sq_km),
        boundary_source = VALUES(boundary_source)
    `, [
      projectId, record.area.name, JSON.stringify(record.area.boundary_geojson),
      record.area.centroid_latitude, record.area.centroid_longitude,
      record.area.area_acres, record.area.area_sq_km, record.area.boundary_source,
    ]);
    await connection.commit();
    return findPlanningProjectById(projectId, ownerUserId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deletePlanningProject(projectId, ownerUserId) {
  if (env.demoMode) return demoRepository.deletePlanningProject(projectId, ownerUserId);
  const [result] = await pool.execute(
    'DELETE FROM planning_projects WHERE id = ? AND owner_user_id = ?',
    [projectId, ownerUserId],
  );
  return result.affectedRows > 0;
}
