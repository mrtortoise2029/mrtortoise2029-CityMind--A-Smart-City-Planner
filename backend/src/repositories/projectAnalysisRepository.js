import { pool } from '../config/database.js';
import { env } from '../config/env.js';

const demoSnapshots = [];

export async function recordHealthSnapshot(projectId, signature, summary, blocks) {
  const results = { signature, summary, blocks: blocks.map(({ block, score, category }) => ({ block, score, category })) };
  if (env.demoMode) {
    const latest = demoSnapshots.findLast?.((item) => item.planning_project_id === Number(projectId));
    if (latest?.signature === signature) return latest;
    const saved = { id: demoSnapshots.length + 1, planning_project_id: Number(projectId), signature, score: summary.score, results, generated_at: new Date().toISOString() };
    demoSnapshots.push(saved);
    return saved;
  }
  const [latestRows] = await pool.execute(`
    SELECT id, results FROM project_analyses
    WHERE planning_project_id = ? AND analysis_type = 'URBAN_HEALTH'
    ORDER BY generated_at DESC, id DESC LIMIT 1
  `, [projectId]);
  const latestResults = typeof latestRows[0]?.results === 'string' ? JSON.parse(latestRows[0].results) : latestRows[0]?.results;
  if (latestResults?.signature === signature) return latestRows[0];
  const [insert] = await pool.execute(`
    INSERT INTO project_analyses (planning_project_id, analysis_type, score, inputs, results, model_version)
    VALUES (?, 'URBAN_HEALTH', ?, ?, ?, 'block-health-2.0')
  `, [projectId, summary.score, JSON.stringify({ signature }), JSON.stringify(results)]);
  return { id: insert.insertId, planning_project_id: Number(projectId), score: summary.score, results, generated_at: new Date().toISOString() };
}

export async function listHealthSnapshots(projectId) {
  if (env.demoMode) return demoSnapshots.filter((item) => item.planning_project_id === Number(projectId)).slice(-12).reverse();
  const [rows] = await pool.execute(`
    SELECT id, score, results, generated_at FROM project_analyses
    WHERE planning_project_id = ? AND analysis_type = 'URBAN_HEALTH'
    ORDER BY generated_at DESC, id DESC LIMIT 12
  `, [projectId]);
  return rows.map((row) => ({ ...row, results: typeof row.results === 'string' ? JSON.parse(row.results) : row.results }));
}
