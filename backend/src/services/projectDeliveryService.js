import * as planningProjectRepository from '../repositories/planningProjectRepository.js';
import * as projectPlanningRepository from '../repositories/projectPlanningRepository.js';
import * as projectGapAnalysisService from './projectGapAnalysisService.js';
import { PROJECT_CONFIG } from '../utils/recommendationScoring.js';
import { httpError } from '../utils/httpError.js';

const COST_ASSUMPTIONS = Object.freeze({
  HOSPITAL: PROJECT_CONFIG.HOSPITAL.baseCost,
  SCHOOL: PROJECT_CONFIG.SCHOOL.baseCost,
  PARK: PROJECT_CONFIG.PARK.baseCost,
  ROAD: PROJECT_CONFIG.ROAD.baseCost,
  COMMERCIAL: PROJECT_CONFIG.COMMERCIAL_CENTER.baseCost,
  DRAINAGE: PROJECT_CONFIG.DRAINAGE.baseCost,
  EMERGENCY: 65_000_000,
  UTILITY: 55_000_000,
});

async function ensureProject(projectId, ownerUserId) {
  const project = await planningProjectRepository.findPlanningProjectById(projectId, ownerUserId);
  if (!project) throw httpError(404, 'Planning project not found', 'PLANNING_PROJECT_NOT_FOUND');
  return project;
}

export async function listPhases(projectId, ownerUserId) {
  const project = await ensureProject(projectId, ownerUserId);
  return { project: { id: project.id, name: project.name, planning_horizon: project.planning_horizon }, phases: await projectPlanningRepository.findPhases(projectId) };
}

function validatePhase(project, input) {
  if (input.endYear > Number(project.planning_horizon)) throw httpError(400, 'Phase end year cannot exceed the project planning horizon', 'PHASE_OUTSIDE_HORIZON');
  if (input.startYear > input.endYear) throw httpError(400, 'Phase start year must be before its end year', 'INVALID_PHASE_RANGE');
}

const phaseRecord = (input) => ({ name: input.name, phase_order: input.phaseOrder, start_year: input.startYear, end_year: input.endYear, status: input.status, description: input.description ?? null });

export async function createPhase(projectId, ownerUserId, input) {
  const project = await ensureProject(projectId, ownerUserId); validatePhase(project, input);
  return projectPlanningRepository.createPhase(projectId, phaseRecord(input));
}

export async function updatePhase(projectId, phaseId, ownerUserId, input) {
  const project = await ensureProject(projectId, ownerUserId); validatePhase(project, input);
  const saved = await projectPlanningRepository.updatePhase(projectId, phaseId, phaseRecord(input));
  if (!saved) throw httpError(404, 'Development phase not found', 'DEVELOPMENT_PHASE_NOT_FOUND'); return saved;
}

export async function deletePhase(projectId, phaseId, ownerUserId) {
  await ensureProject(projectId, ownerUserId);
  if (!await projectPlanningRepository.deletePhase(projectId, phaseId)) throw httpError(404, 'Development phase not found', 'DEVELOPMENT_PHASE_NOT_FOUND');
  return { id: phaseId, deleted: true };
}

export async function getFuturePlan(projectId, ownerUserId) {
  const [project, gaps, phasesResult] = await Promise.all([
    ensureProject(projectId, ownerUserId),
    projectGapAnalysisService.getProjectGapAnalysis(projectId, ownerUserId),
    listPhases(projectId, ownerUserId),
  ]);
  return {
    project: { id: project.id, name: project.name, planning_horizon: project.planning_horizon },
    phases: phasesResult.phases,
    scenarios: gaps.horizon_scenarios.map((scenario) => ({
      ...scenario,
      phase: phasesResult.phases.find(({ start_year, end_year }) => scenario.years >= start_year && scenario.years <= end_year)?.name ?? null,
    })),
    priority_sequence: gaps.priority_areas.map(({ key, category, gap_percent }, index) => ({ order: index + 1, key, category, gap_percent, suggested_phase_order: Math.min(index + 1, Math.max(phasesResult.phases.length, 1)) })),
    confidence: 'SIMULATED',
  };
}

function budgetPriority(gap) { return gap >= 75 ? 'CRITICAL' : gap >= 50 ? 'HIGH' : gap >= 25 ? 'MEDIUM' : 'LOW'; }

export async function simulateBudget(projectId, ownerUserId, input) {
  const project = await ensureProject(projectId, ownerUserId);
  const gaps = await projectGapAnalysisService.getProjectGapAnalysis(projectId, ownerUserId);
  const phaseList = await projectPlanningRepository.findPhases(projectId);
  const candidates = gaps.categories.map((category) => {
    const units = Math.max(0, Math.ceil(category.missing));
    const unitCost = COST_ASSUMPTIONS[category.key] ?? 50_000_000;
    return {
      category: category.key, label: category.category, units,
      estimated_cost: units * unitCost,
      impact_score: Math.round(category.gap_percent * (0.65 + Math.min(units, 5) * 0.07)),
      priority: budgetPriority(category.gap_percent),
      assumptions: { unit_cost: unitCost, missing_units: category.missing, confidence: 'PLANNING_ASSUMPTION' },
    };
  }).filter(({ units }) => units > 0);
  const ordered = [...candidates].sort(input.scenarioType === 'MINIMUM_COST'
    ? (a, b) => a.estimated_cost - b.estimated_cost || b.impact_score - a.impact_score
    : input.scenarioType === 'MAXIMUM_IMPACT'
      ? (a, b) => b.impact_score - a.impact_score || a.estimated_cost - b.estimated_cost
      : (a, b) => (b.impact_score / Math.max(b.estimated_cost, 1)) - (a.impact_score / Math.max(a.estimated_cost, 1)));
  let remaining = Number(input.availableBudget);
  const selected = []; const deferred = [];
  ordered.forEach((item, index) => {
    const enriched = { ...item, development_phase_id: phaseList[Math.min(index, Math.max(phaseList.length - 1, 0))]?.id ?? null };
    if (item.estimated_cost <= remaining) { selected.push(enriched); remaining -= item.estimated_cost; }
    else deferred.push({ ...enriched, reason: 'Estimated package exceeds the remaining scenario budget.' });
  });
  const scenario = {
    scenario_name: input.scenarioName || input.scenarioType.replaceAll('_', ' '),
    available_budget: Number(input.availableBudget), currency: input.currency,
    cost_source: 'CityMind configurable planning cost assumptions — replace with verified local rates',
    cost_year: new Date().getFullYear(),
  };
  const saved = input.saveScenario ? await projectPlanningRepository.saveBudgetScenario(projectId, scenario, selected) : null;
  return {
    project: { id: project.id, name: project.name }, scenario_type: input.scenarioType,
    ...scenario, selected, deferred,
    summary: { allocated: scenario.available_budget - remaining, remaining, funded_packages: selected.length, deferred_packages: deferred.length },
    saved_scenario_id: saved?.id ?? null,
    confidence: 'PLANNING_ASSUMPTION',
    warning: 'Costs are editable planning assumptions, not tenders or authoritative market quotations.',
  };
}

export async function listBudgets(projectId, ownerUserId) {
  const project = await ensureProject(projectId, ownerUserId);
  return { project: { id: project.id, name: project.name }, scenarios: await projectPlanningRepository.findBudgetScenarios(projectId) };
}
