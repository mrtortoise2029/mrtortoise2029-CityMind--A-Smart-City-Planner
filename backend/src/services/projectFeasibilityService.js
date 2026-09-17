import * as planningProjectRepository from '../repositories/planningProjectRepository.js';
import * as planningFeatureRepository from '../repositories/planningFeatureRepository.js';
import * as projectGapAnalysisService from './projectGapAnalysisService.js';
import * as projectRiskService from './projectRiskService.js';
import { calculateDevelopmentFeasibility } from '../utils/developmentFeasibility.js';
import { httpError } from '../utils/httpError.js';

export async function getDevelopmentFeasibility(projectId, ownerUserId) {
  const project = await planningProjectRepository.findPlanningProjectById(projectId, ownerUserId);
  if (!project) throw httpError(404, 'Planning project not found', 'PLANNING_PROJECT_NOT_FOUND');
  const [featuresResult, gapResult, riskResult] = await Promise.allSettled([
    planningFeatureRepository.findPlanningFeatures(projectId),
    projectGapAnalysisService.getProjectGapAnalysis(projectId, ownerUserId),
    projectRiskService.getRiskDetection(projectId, ownerUserId),
  ]);
  return calculateDevelopmentFeasibility({
    project,
    features: featuresResult.status === 'fulfilled' ? featuresResult.value : [],
    gapAnalysis: gapResult.status === 'fulfilled' ? gapResult.value : null,
    riskDetection: riskResult.status === 'fulfilled' ? riskResult.value : null,
  });
}

