import * as planningFeatureRepository from '../repositories/planningFeatureRepository.js';
import * as planningProjectRepository from '../repositories/planningProjectRepository.js';
import { distanceKm } from '../utils/projectRecommendationContext.js';
import { httpError } from '../utils/httpError.js';

const polygonBox = (feature) => feature.geometry.coordinates[0].reduce((box, [longitude, latitude]) => ({
  minX: Math.min(box.minX, longitude), maxX: Math.max(box.maxX, longitude),
  minY: Math.min(box.minY, latitude), maxY: Math.max(box.maxY, latitude),
}), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
const overlaps = (first, second) => first.minX < second.maxX && first.maxX > second.minX
  && first.minY < second.maxY && first.maxY > second.minY;

export async function validateProjectPlan(projectId, ownerUserId) {
  const project = await planningProjectRepository.findPlanningProjectById(projectId, ownerUserId);
  if (!project) throw httpError(404, 'Planning project not found', 'PLANNING_PROJECT_NOT_FOUND');
  const features = await planningFeatureRepository.findPlanningFeatures(projectId);
  const blocks = features.filter(({ feature_type: type }) => type === 'BLOCK');
  const roads = features.filter(({ feature_type: type }) => ['PRIMARY_ROAD', 'SECONDARY_ROAD', 'LOCAL_ROAD', 'ROAD_PROPOSAL'].includes(type));
  const issues = [];
  for (let first = 0; first < blocks.length; first += 1) {
    for (let second = first + 1; second < blocks.length; second += 1) {
      if (overlaps(polygonBox(blocks[first]), polygonBox(blocks[second]))) issues.push({
        code: 'BLOCK_OVERLAP', severity: 'HIGH', features: [blocks[first].name, blocks[second].name],
        message: `${blocks[first].name} overlaps ${blocks[second].name}; verify the shared planning boundary.`,
      });
    }
  }
  for (const road of roads) {
    const coordinates = road.geometry.coordinates;
    const connected = roads.some((other) => other.id !== road.id && coordinates.some(([longitude, latitude]) => (
      other.geometry.coordinates.some(([otherLongitude, otherLatitude]) => distanceKm(
        { longitude, latitude }, { longitude: otherLongitude, latitude: otherLatitude },
      ) <= 0.08)
    )));
    if (roads.length > 1 && !connected) issues.push({
      code: 'DISCONNECTED_ROAD', severity: 'MEDIUM', features: [road.name],
      message: `${road.name} is not connected to another planned road within 80 metres.`,
    });
  }
  const duplicateNames = features.filter((feature, index) => features.findIndex(({ name }) => name.toLowerCase() === feature.name.toLowerCase()) !== index);
  duplicateNames.forEach((feature) => issues.push({ code: 'DUPLICATE_NAME', severity: 'LOW', features: [feature.name], message: `Duplicate planning feature name: ${feature.name}.` }));
  if (!blocks.length) issues.push({ code: 'NO_BLOCKS', severity: 'HIGH', features: [], message: 'No development blocks are defined.' });
  return {
    valid: !issues.some(({ severity }) => severity === 'HIGH' || severity === 'CRITICAL'),
    checked_features: features.length, issues,
    summary: {
      critical: issues.filter(({ severity }) => severity === 'CRITICAL').length,
      high: issues.filter(({ severity }) => severity === 'HIGH').length,
      medium: issues.filter(({ severity }) => severity === 'MEDIUM').length,
      low: issues.filter(({ severity }) => severity === 'LOW').length,
    },
  };
}
