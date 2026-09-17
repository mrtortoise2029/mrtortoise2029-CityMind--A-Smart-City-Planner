import * as planningProjectRepository from '../repositories/planningProjectRepository.js';
import * as projectGapAnalysisService from './projectGapAnalysisService.js';
import { detectRisksFromGapAnalysis } from '../utils/riskDetection.js';
import { httpError } from '../utils/httpError.js';

export async function getRiskDetection(projectId, ownerUserId) {
  const project = await planningProjectRepository.findPlanningProjectById(projectId, ownerUserId);
  if (!project) throw httpError(404, 'Planning project not found', 'PLANNING_PROJECT_NOT_FOUND');
  const gapAnalysis = await projectGapAnalysisService.getProjectGapAnalysis(projectId, ownerUserId);
  return {
    project_id: project.id,
    project_name: project.name,
    boundary: project.area?.boundary_geojson ?? null,
    ...detectRisksFromGapAnalysis(gapAnalysis),
    generated_at: new Date().toISOString(),
    decision_notice: 'Risks are screening evidence and recommendations are options for further investigation, not mandatory decisions.',
  };
}

