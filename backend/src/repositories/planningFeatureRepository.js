import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import * as demoRepository from './demoCityRepository.js';

const parseJson = (value) => typeof value === 'string' ? JSON.parse(value) : value;
const mapFeature = (row) => ({
  ...row,
  geometry: parseJson(row.geometry),
  properties: parseJson(row.properties),
});

export async function findPlanningFeatures(projectId) {
  if (env.demoMode) return demoRepository.findPlanningFeatures(projectId);
  const [rows] = await pool.execute(`
    SELECT id, planning_project_id, feature_type, category, name, geometry,
           status, source, properties, created_at, updated_at
    FROM planning_features
    WHERE planning_project_id = ?
    ORDER BY created_at, id
  `, [projectId]);
  return rows.map(mapFeature);
}

export async function createPlanningFeature(projectId, feature) {
  if (env.demoMode) return demoRepository.createPlanningFeature(projectId, feature);
  const [result] = await pool.execute(`
    INSERT INTO planning_features (
      planning_project_id, feature_type, category, name, geometry, status, source, properties
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    projectId, feature.feature_type, feature.category, feature.name,
    JSON.stringify(feature.geometry), feature.status, feature.source,
    feature.properties ? JSON.stringify(feature.properties) : null,
  ]);
  const [rows] = await pool.execute(`
    SELECT id, planning_project_id, feature_type, category, name, geometry,
           status, source, properties, created_at, updated_at
    FROM planning_features WHERE id = ?
  `, [result.insertId]);
  return mapFeature(rows[0]);
}

export async function updatePlanningFeature(projectId, featureId, feature) {
  if (env.demoMode) return demoRepository.updatePlanningFeature(projectId, featureId, feature);
  const [result] = await pool.execute(`
    UPDATE planning_features SET
      feature_type = ?, category = ?, name = ?, geometry = ?, status = ?,
      source = ?, properties = ?
    WHERE id = ? AND planning_project_id = ?
  `, [
    feature.feature_type, feature.category, feature.name, JSON.stringify(feature.geometry),
    feature.status, feature.source, feature.properties ? JSON.stringify(feature.properties) : null,
    featureId, projectId,
  ]);
  if (!result.affectedRows) return null;
  const [rows] = await pool.execute(`
    SELECT id, planning_project_id, feature_type, category, name, geometry,
           status, source, properties, created_at, updated_at
    FROM planning_features WHERE id = ? AND planning_project_id = ?
  `, [featureId, projectId]);
  return mapFeature(rows[0]);
}

export async function deletePlanningFeature(projectId, featureId) {
  if (env.demoMode) return demoRepository.deletePlanningFeature(projectId, featureId);
  const [result] = await pool.execute(
    'DELETE FROM planning_features WHERE id = ? AND planning_project_id = ?',
    [featureId, projectId],
  );
  return result.affectedRows > 0;
}
