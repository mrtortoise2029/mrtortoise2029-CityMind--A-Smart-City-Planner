import { pool } from '../config/database.js';
import { env } from '../config/env.js';

const parseJson = (value) => typeof value === 'string' ? JSON.parse(value) : value;

export async function findActiveRules(projectId, facilityType) {
  if (env.demoMode) return [];
  const [rows] = await pool.execute(`
    SELECT id, planning_project_id, rule_code, name, description, facility_type,
           jurisdiction, rule_type, condition_json, severity, source_name,
           source_url, policy_version, effective_year
    FROM planning_rules
    WHERE is_active = TRUE
      AND (planning_project_id IS NULL OR planning_project_id = ?)
      AND (facility_type IS NULL OR facility_type = ?)
    ORDER BY planning_project_id IS NULL, id
  `, [projectId, facilityType]);
  return rows.map((row) => ({ ...row, condition: parseJson(row.condition_json) }));
}
