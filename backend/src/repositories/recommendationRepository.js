import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import * as demoRepository from './demoCityRepository.js';

const titles = {
  HOSPITAL: 'Develop healthcare capacity', SCHOOL: 'Expand education capacity',
  ROAD: 'Improve road accessibility', DRAINAGE: 'Upgrade drainage resilience',
  PARK: 'Create accessible green space', OTHER: 'Develop priority infrastructure',
};

function persistenceFields(cityId, candidate, planningHorizon, planningProjectId) {
  return {
    ...candidate,
    city_id: cityId,
    planning_project_id: planningProjectId,
    ward_id: candidate.ward.id,
    planning_horizon: planningHorizon,
    title: `${titles[candidate.project_type] ?? 'Evaluate development option'} at ${candidate.candidate_location.label}`,
    description: candidate.explanation.join(' '),
    category: candidate.project_type.toLowerCase(),
    estimated_impact: `Approximately ${candidate.expected_population_served.toLocaleString()} residents served`,
    candidate_label: candidate.candidate_location.label,
    candidate_latitude: candidate.candidate_location.latitude,
    candidate_longitude: candidate.candidate_location.longitude,
    candidate_details: {
      geometry: candidate.candidate_location.geometry,
      project_evidence: candidate.project_evidence,
      constraints: candidate.constraints,
      explanation: candidate.explanation,
    },
  };
}

export async function saveRecommendations(cityId, candidates, planningHorizon, planningProjectId = null) {
  const rows = candidates.map((candidate) => persistenceFields(
    cityId,
    candidate,
    planningHorizon,
    planningProjectId,
  ));
  if (env.demoMode) return demoRepository.saveSmartRecommendations(rows);
  if (!rows.length) return [];

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const saved = [];
    for (const row of rows) {
      const [result] = await connection.execute(`
        INSERT INTO recommendations (
          planning_project_id, city_id, ward_id, title, description, category, project_type,
          recommendation_score, population_need_score, infrastructure_gap_score,
          accessibility_score, future_demand_score, existing_coverage_score,
          planning_horizon, priority, status, estimated_cost,
          expected_population_served, estimated_impact, candidate_label,
          candidate_latitude, candidate_longitude, candidate_details
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        row.planning_project_id, row.city_id, row.ward_id, row.title, row.description, row.category, row.project_type,
        row.recommendation_score, row.population_need_score, row.infrastructure_gap_score,
        row.accessibility_score, row.future_demand_score, row.existing_coverage_score,
        row.planning_horizon, row.priority, row.status, row.estimated_cost,
        row.expected_population_served, row.estimated_impact, row.candidate_label,
        row.candidate_latitude, row.candidate_longitude, JSON.stringify(row.candidate_details),
      ]);
      saved.push({ ...row, recommendation_id: result.insertId });
    }
    await connection.commit();
    return saved;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function supersedeProjectRecommendations(projectId, projectType) {
  if (env.demoMode) return demoRepository.supersedeProjectRecommendations(projectId, projectType);
  await pool.execute(`
    UPDATE recommendations SET status = 'dismissed'
    WHERE planning_project_id = ? AND project_type = ? AND status = 'proposed'
  `, [projectId, projectType]);
}

export async function findRecommendationsByPlanningProject(projectId) {
  if (env.demoMode) return demoRepository.findRecommendationsByPlanningProject(projectId);
  const [rows] = await pool.execute(`
    SELECT r.id AS recommendation_id, r.planning_project_id, r.city_id, r.ward_id,
           r.title, r.description, r.category, r.project_type, r.recommendation_score,
           r.population_need_score, r.infrastructure_gap_score, r.accessibility_score,
           r.future_demand_score, r.existing_coverage_score, r.planning_horizon,
           r.priority, r.status, r.estimated_cost, r.estimated_impact,
           r.expected_population_served, r.created_at,
           r.candidate_label, r.candidate_latitude, r.candidate_longitude, r.candidate_details,
           w.name AS ward_name, w.ward_code
    FROM recommendations r
    LEFT JOIN wards w ON w.id = r.ward_id
    WHERE r.planning_project_id = ? AND r.status <> 'dismissed'
    ORDER BY r.recommendation_score DESC, r.created_at DESC
  `, [projectId]);
  return rows.map((row, index) => {
    const details = typeof row.candidate_details === 'string'
      ? JSON.parse(row.candidate_details) : row.candidate_details;
    return {
    ...row,
    rank: index + 1,
    ward: row.ward_id ? { id: row.ward_id, name: row.ward_name, ward_code: row.ward_code } : null,
    candidate_location: {
      label: row.candidate_label,
      latitude: Number(row.candidate_latitude),
      longitude: Number(row.candidate_longitude),
      geometry: details?.geometry,
    },
    project_evidence: details?.project_evidence ?? null,
    constraints: details?.constraints ?? [],
    explanation: details?.explanation ?? [row.description],
  };
  });
}

export async function updateRecommendationStatus(projectId, recommendationId, status) {
  if (env.demoMode) return demoRepository.updateRecommendationStatus(projectId, recommendationId, status);
  const [result] = await pool.execute(
    'UPDATE recommendations SET status = ? WHERE id = ? AND planning_project_id = ?',
    [status, recommendationId, projectId],
  );
  if (!result.affectedRows) return null;
  const [rows] = await pool.execute(
    'SELECT id AS recommendation_id, planning_project_id, status FROM recommendations WHERE id = ?',
    [recommendationId],
  );
  return rows[0];
}
