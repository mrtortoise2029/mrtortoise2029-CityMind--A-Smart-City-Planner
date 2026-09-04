import * as planningFeatureRepository from '../repositories/planningFeatureRepository.js';
import * as planningProjectRepository from '../repositories/planningProjectRepository.js';
import { calculateBlockAnalyses, summarizeProjectBlockHealth } from '../utils/projectBlockScoring.js';
import { httpError } from '../utils/httpError.js';
import { createHash } from 'node:crypto';
import * as projectAnalysisRepository from '../repositories/projectAnalysisRepository.js';

export async function getProjectBlockAnalysis(projectId, ownerUserId) {
  const project = await planningProjectRepository.findPlanningProjectById(projectId, ownerUserId);
  if (!project) throw httpError(404, 'Planning project not found', 'PLANNING_PROJECT_NOT_FOUND');
  const features = await planningFeatureRepository.findPlanningFeatures(projectId);
  const blocks = calculateBlockAnalyses({ project, features });
  const summary = summarizeProjectBlockHealth(blocks);
  const plannedFeatures = features.map((feature) => feature.status === 'rejected'
    ? feature : { ...feature, status: 'approved' });
  const plannedBlocks = calculateBlockAnalyses({ project, features: plannedFeatures });
  const plannedSummary = summarizeProjectBlockHealth(plannedBlocks);
  const signature = createHash('sha1').update(JSON.stringify(features.map((feature) => ({
    id: feature.id, type: feature.feature_type, geometry: feature.geometry, properties: feature.properties,
  })))).digest('hex');
  await projectAnalysisRepository.recordHealthSnapshot(projectId, signature, summary, blocks);
  const history = await projectAnalysisRepository.listHealthSnapshots(projectId);
  return {
    project: { id: project.id, name: project.name, project_type: project.project_type },
    summary,
    blocks,
    planned_summary: plannedSummary,
    planned_blocks: plannedBlocks,
    implementation_impact: plannedSummary.score - summary.score,
    history,
    confidence_note: 'Current scores count approved assets only. Planned scores simulate all non-rejected proposals. These are deterministic planning indicators, not engineering certification.',
  };
}

export async function simulateProjectBlockHealth(projectId, ownerUserId, { blockId, intervention }) {
  const project = await planningProjectRepository.findPlanningProjectById(projectId, ownerUserId);
  if (!project) throw httpError(404, 'Planning project not found', 'PLANNING_PROJECT_NOT_FOUND');
  const features = await planningFeatureRepository.findPlanningFeatures(projectId);
  const before = calculateBlockAnalyses({ project, features });
  const selected = features.find((feature) => feature.feature_type === 'BLOCK' && Number(feature.id) === Number(blockId));
  if (!selected) throw httpError(404, 'Planning block not found', 'PLANNING_BLOCK_NOT_FOUND');
  const ring = selected.geometry.coordinates[0];
  const longitude = ring.reduce((sum, point) => sum + point[0], 0) / ring.length;
  const latitude = ring.reduce((sum, point) => sum + point[1], 0) / ring.length;
  const synthetic = ['HOSPITAL', 'SCHOOL', 'PARK'].includes(intervention)
    ? { id: `simulation-${intervention}`, feature_type: 'FACILITY_PROPOSAL', category: intervention.toLowerCase(), status: 'approved', geometry: { type: 'Point', coordinates: [longitude, latitude] } }
    : { id: `simulation-${intervention}`, feature_type: intervention === 'DRAINAGE' ? 'DRAINAGE_CORRIDOR' : 'LOCAL_ROAD', category: intervention.toLowerCase(), status: 'approved', geometry: { type: 'LineString', coordinates: [ring[0], ring[2]] } };
  const after = calculateBlockAnalyses({ project, features: [...features, synthetic] });
  const beforeBlock = before.find(({ block }) => Number(block.id) === Number(blockId));
  const afterBlock = after.find(({ block }) => Number(block.id) === Number(blockId));
  return {
    intervention, confidence: 'SIMULATED', before: beforeBlock, after: afterBlock,
    score_change: afterBlock.score - beforeBlock.score,
    component_changes: Object.fromEntries(Object.keys(beforeBlock.components).map((key) => [key, afterBlock.components[key] - beforeBlock.components[key]])),
  };
}
