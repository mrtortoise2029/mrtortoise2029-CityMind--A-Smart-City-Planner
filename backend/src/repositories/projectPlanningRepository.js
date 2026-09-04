import { pool } from '../config/database.js';
import { env } from '../config/env.js';

const demoPhases = [{ id: 1, planning_project_id: 1, name: 'Phase 1 — Essential access', phase_order: 1, start_year: 1, end_year: 5, status: 'active', description: 'Primary access and essential services.' }, { id: 2, planning_project_id: 1, name: 'Phase 2 — Community services', phase_order: 2, start_year: 6, end_year: 12, status: 'planned', description: 'Education, health and public-space delivery.' }, { id: 3, planning_project_id: 1, name: 'Phase 3 — Long-term build-out', phase_order: 3, start_year: 13, end_year: 20, status: 'planned', description: 'Final capacity and resilience works.' }];
const demoBudgets = [];
let demoPhaseId = 4;
let demoBudgetId = 1;

const clone = (value) => structuredClone(value);
const parseJson = (value) => typeof value === 'string' ? JSON.parse(value) : value;

export async function findPhases(projectId) {
  if (env.demoMode) return clone(demoPhases.filter(({ planning_project_id: id }) => id === Number(projectId)).sort((a, b) => a.phase_order - b.phase_order));
  const [rows] = await pool.execute('SELECT * FROM development_phases WHERE planning_project_id = ? ORDER BY phase_order', [projectId]);
  return rows;
}

export async function createPhase(projectId, input) {
  if (env.demoMode) {
    const saved = { id: demoPhaseId++, planning_project_id: Number(projectId), ...clone(input) };
    demoPhases.push(saved); return clone(saved);
  }
  const [result] = await pool.execute(`
    INSERT INTO development_phases (planning_project_id, name, phase_order, start_year, end_year, status, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [projectId, input.name, input.phase_order, input.start_year, input.end_year, input.status, input.description]);
  const [rows] = await pool.execute('SELECT * FROM development_phases WHERE id = ?', [result.insertId]);
  return rows[0];
}

export async function updatePhase(projectId, phaseId, input) {
  if (env.demoMode) {
    const index = demoPhases.findIndex(({ id, planning_project_id: owner }) => id === Number(phaseId) && owner === Number(projectId));
    if (index < 0) return null;
    demoPhases[index] = { ...demoPhases[index], ...clone(input) }; return clone(demoPhases[index]);
  }
  const [result] = await pool.execute(`UPDATE development_phases SET name = ?, phase_order = ?, start_year = ?, end_year = ?, status = ?, description = ? WHERE id = ? AND planning_project_id = ?`, [input.name, input.phase_order, input.start_year, input.end_year, input.status, input.description, phaseId, projectId]);
  if (!result.affectedRows) return null;
  const [rows] = await pool.execute('SELECT * FROM development_phases WHERE id = ?', [phaseId]); return rows[0];
}

export async function deletePhase(projectId, phaseId) {
  if (env.demoMode) {
    const index = demoPhases.findIndex(({ id, planning_project_id: owner }) => id === Number(phaseId) && owner === Number(projectId));
    if (index < 0) return false; demoPhases.splice(index, 1); return true;
  }
  const [result] = await pool.execute('DELETE FROM development_phases WHERE id = ? AND planning_project_id = ?', [phaseId, projectId]);
  return result.affectedRows > 0;
}

export async function saveBudgetScenario(projectId, scenario, items) {
  if (env.demoMode) {
    const saved = { id: demoBudgetId++, planning_project_id: Number(projectId), ...clone(scenario), items: clone(items), created_at: new Date().toISOString() };
    demoBudgets.push(saved); return clone(saved);
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(`INSERT INTO project_budgets (planning_project_id, scenario_name, available_budget, currency, cost_source, cost_year) VALUES (?, ?, ?, ?, ?, ?)`, [projectId, scenario.scenario_name, scenario.available_budget, scenario.currency, scenario.cost_source, scenario.cost_year]);
    for (const item of items) {
      await connection.execute(`INSERT INTO project_budget_items (project_budget_id, category, estimated_cost, priority, development_phase_id, assumptions) VALUES (?, ?, ?, ?, ?, ?)`, [result.insertId, item.category, item.estimated_cost, item.priority.toLowerCase(), item.development_phase_id ?? null, JSON.stringify(item.assumptions)]);
    }
    await connection.commit();
    return { id: result.insertId, planning_project_id: Number(projectId), ...scenario, items };
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

export async function findBudgetScenarios(projectId) {
  if (env.demoMode) return clone(demoBudgets.filter(({ planning_project_id: id }) => id === Number(projectId)).reverse());
  const [budgets] = await pool.execute('SELECT * FROM project_budgets WHERE planning_project_id = ? ORDER BY created_at DESC, id DESC', [projectId]);
  if (!budgets.length) return [];
  const [items] = await pool.query(`SELECT * FROM project_budget_items WHERE project_budget_id IN (${budgets.map(() => '?').join(',')}) ORDER BY id`, budgets.map(({ id }) => id));
  return budgets.map((budget) => ({ ...budget, items: items.filter(({ project_budget_id: id }) => id === budget.id).map((item) => ({ ...item, assumptions: parseJson(item.assumptions) })) }));
}
