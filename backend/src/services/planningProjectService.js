import * as planningProjectRepository from '../repositories/planningProjectRepository.js';
import * as cityRepository from '../repositories/cityRepository.js';
import { httpError } from '../utils/httpError.js';
import { polygonMetrics } from '../utils/projectGeometry.js';

export async function listPlanningProjects(ownerUserId) {
  return planningProjectRepository.findPlanningProjects(ownerUserId);
}

export async function getPlanningProject(projectId, ownerUserId) {
  const project = await planningProjectRepository.findPlanningProjectById(projectId, ownerUserId);
  if (!project) throw httpError(404, 'Planning project not found', 'PLANNING_PROJECT_NOT_FOUND');
  return project;
}

function projectRecord(input, current = {}) {
  const metrics = polygonMetrics(input.boundary);
  const existingArea = input.projectType === 'EXISTING_AREA';
  return {
    owner_user_id: current.owner_user_id ?? null,
    city_id: input.cityId,
    name: input.name,
    description: input.description,
    project_type: input.projectType,
    country: input.country,
    region: input.region,
    location_search: input.locationSearch ?? '',
    planning_stage: current.planning_stage ?? 'Project Setup',
    status: current.status ?? 'active',
    area_acres: metrics.areaAcres,
    current_population: existingArea ? input.currentPopulation : null,
    expected_population: existingArea ? null : input.expectedPopulation,
    current_households: existingArea ? input.currentHouseholds : null,
    expected_households: existingArea ? null : input.expectedHouseholds,
    current_density: existingArea ? input.currentDensity : null,
    target_density: existingArea ? null : input.targetDensity,
    planning_horizon: input.planningHorizon,
    progress_percent: current.progress_percent ?? 10,
    health_score: current.health_score ?? null,
    area: {
      name: `${input.name} Planning Area`,
      boundary_geojson: input.boundary,
      centroid_latitude: metrics.centroid.latitude,
      centroid_longitude: metrics.centroid.longitude,
      area_acres: metrics.areaAcres,
      area_sq_km: metrics.areaSqKm,
      boundary_source: 'drawn',
    },
  };
}

async function ensureCity(cityId) {
  if (!await cityRepository.findCityById(cityId)) {
    throw httpError(404, 'City or region reference not found', 'CITY_NOT_FOUND');
  }
}

export async function createPlanningProject(input, ownerUserId) {
  await ensureCity(input.cityId);
  return planningProjectRepository.createPlanningProject(projectRecord(input, { owner_user_id: ownerUserId }));
}

export async function updatePlanningProject(projectId, input, ownerUserId) {
  const current = await getPlanningProject(projectId, ownerUserId);
  await ensureCity(input.cityId);
  const updated = await planningProjectRepository.updatePlanningProject(
    projectId,
    projectRecord(input, current), ownerUserId,
  );
  if (!updated) throw httpError(404, 'Planning project not found', 'PLANNING_PROJECT_NOT_FOUND');
  return updated;
}

export async function deletePlanningProject(projectId, ownerUserId) {
  const deleted = await planningProjectRepository.deletePlanningProject(projectId, ownerUserId);
  if (!deleted) throw httpError(404, 'Planning project not found', 'PLANNING_PROJECT_NOT_FOUND');
  return { id: projectId, deleted: true };
}
