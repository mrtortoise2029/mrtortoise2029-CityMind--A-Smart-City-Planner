import * as analysisRepository from '../repositories/analysisRepository.js';
import * as planningProjectRepository from '../repositories/planningProjectRepository.js';
import * as resourceRepository from '../repositories/resourceRepository.js';
import { calculateGrowthPrediction } from '../utils/growthPrediction.js';
import { distanceToBoundaryKm } from '../utils/projectRecommendationContext.js';
import { httpError } from '../utils/httpError.js';

export async function getGrowthPrediction(projectId, ownerUserId) {
  const project = await planningProjectRepository.findPlanningProjectById(projectId, ownerUserId);
  if (!project) throw httpError(404, 'Planning project not found', 'PLANNING_PROJECT_NOT_FOUND');
  let growthInputs = [];
  if (project.project_type !== 'NEW_DEVELOPMENT' && project.city_id && project.area?.boundary_geojson) {
    const wards = await resourceRepository.findWardsByCity(project.city_id);
    const contextual = wards.filter((ward) => distanceToBoundaryKm({
      latitude: Number(ward.latitude), longitude: Number(ward.longitude),
    }, project.area.boundary_geojson) <= 3);
    growthInputs = (await Promise.all(contextual.map((ward) => analysisRepository.findWardAnalysisInput(ward.id))))
      .filter((input) => input && Number.isFinite(Number(input.growth_rate)));
  }
  const referenceGrowthRate = growthInputs.length
    ? growthInputs.reduce((sum, input) => sum + Number(input.growth_rate), 0) / growthInputs.length
    : null;
  return calculateGrowthPrediction({ project, referenceGrowthRate, referenceCount: growthInputs.length });
}

