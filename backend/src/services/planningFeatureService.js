import * as planningFeatureRepository from '../repositories/planningFeatureRepository.js';
import * as planningProjectRepository from '../repositories/planningProjectRepository.js';
import { httpError } from '../utils/httpError.js';
import { distanceToBoundaryKm, pointInsideBoundary } from '../utils/projectRecommendationContext.js';

async function ensureProject(projectId, ownerUserId) {
  const project = await planningProjectRepository.findPlanningProjectById(projectId, ownerUserId);
  if (!project) throw httpError(404, 'Planning project not found', 'PLANNING_PROJECT_NOT_FOUND');
  return project;
}

export async function listPlanningFeatures(projectId, ownerUserId) {
  await ensureProject(projectId, ownerUserId);
  return planningFeatureRepository.findPlanningFeatures(projectId);
}

export async function createPlanningFeature(projectId, input, ownerUserId) {
  const project = await ensureProject(projectId, ownerUserId);
  ensureGeometryInsideProject(project, input.geometry);
  return planningFeatureRepository.createPlanningFeature(projectId, {
    feature_type: input.featureType,
    category: input.category ?? null,
    name: input.name,
    geometry: input.geometry,
    status: input.status ?? 'proposed',
    source: 'planner',
    properties: input.properties ?? null,
  });
}

function geometryPoints(geometry) {
  if (geometry.type === 'Point') return [geometry.coordinates];
  if (geometry.type === 'LineString') return geometry.coordinates;
  return geometry.coordinates[0];
}

function ensureGeometryInsideProject(project, geometry) {
  const boundary = project.area?.boundary_geojson;
  const outside = geometryPoints(geometry).some(([longitude, latitude]) => {
    const point = { longitude, latitude };
    return !pointInsideBoundary(point, boundary) && distanceToBoundaryKm(point, boundary) > 0.02;
  });
  if (outside) {
    throw httpError(400, 'Planning features must remain inside the project boundary', 'FEATURE_OUTSIDE_PROJECT');
  }
}

export async function updatePlanningFeature(projectId, featureId, input, ownerUserId) {
  const project = await ensureProject(projectId, ownerUserId);
  ensureGeometryInsideProject(project, input.geometry);
  const updated = await planningFeatureRepository.updatePlanningFeature(projectId, featureId, {
    feature_type: input.featureType,
    category: input.category ?? null,
    name: input.name,
    geometry: input.geometry,
    status: input.status ?? 'proposed',
    source: 'planner',
    properties: input.properties ?? null,
  });
  if (!updated) throw httpError(404, 'Planning feature not found', 'PLANNING_FEATURE_NOT_FOUND');
  return updated;
}

export async function deletePlanningFeature(projectId, featureId, ownerUserId) {
  await ensureProject(projectId, ownerUserId);
  if (!await planningFeatureRepository.deletePlanningFeature(projectId, featureId)) {
    throw httpError(404, 'Planning feature not found', 'PLANNING_FEATURE_NOT_FOUND');
  }
  return { id: featureId, deleted: true };
}
