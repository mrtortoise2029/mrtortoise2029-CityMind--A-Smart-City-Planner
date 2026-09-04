import { distanceKm, pointInsideBoundary } from './projectRecommendationContext.js';

export const LOCATION_SUITABILITY_WEIGHTS = Object.freeze({
  policy_compliance: 0.15,
  land_use_compatibility: 0.10,
  population_need: 0.15,
  infrastructure_gap: 0.15,
  accessibility: 0.12,
  existing_coverage_gap: 0.10,
  future_demand: 0.10,
  road_connectivity: 0.06,
  urban_health_impact: 0.05,
  spatial_constraints: 0.02,
});

export const ROAD_ACCESS_TARGET_KM = Object.freeze({
  HOSPITAL: 0.5, SCHOOL: 0.7, PARK: 1, COMMERCIAL_CENTER: 0.6,
  ROAD: 0.3, DRAINAGE: 1, COMMUNITY_FACILITY: 0.8, OTHER: 1,
});

const compatibleLandUses = Object.freeze({
  HOSPITAL: ['residential', 'mixed-use', 'institutional', 'healthcare'],
  SCHOOL: ['residential', 'mixed-use', 'institutional', 'education'],
  PARK: ['residential', 'mixed-use', 'green', 'recreation'],
  COMMERCIAL_CENTER: ['commercial', 'mixed-use', 'residential'],
  ROAD: ['residential', 'commercial', 'mixed-use', 'institutional'],
  DRAINAGE: ['residential', 'commercial', 'mixed-use', 'utility'],
  COMMUNITY_FACILITY: ['residential', 'mixed-use', 'institutional'],
  OTHER: ['residential', 'commercial', 'mixed-use', 'institutional'],
});

export const clampScore = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

export function weightedSuitabilityScore(factors, weights = LOCATION_SUITABILITY_WEIGHTS) {
  return clampScore(Object.entries(weights).reduce((sum, [key, weight]) => (
    sum + clampScore(factors[key]) * weight
  ), 0));
}

export function suitabilityStatus(score, hasBlockingRule = false) {
  if (hasBlockingRule || score < 45) return 'NOT_RECOMMENDED';
  if (score < 70) return 'WARNING';
  return 'SUITABLE';
}

export function containingBlock(point, blocks) {
  return blocks.find(({ block }) => pointInsideBoundary(point, block.geometry)) ?? null;
}

export function landUseCompatibility(facilityType, landUse) {
  if (!landUse) return { score: 50, status: 'UNVERIFIED' };
  const compatible = compatibleLandUses[facilityType]?.includes(String(landUse).toLowerCase()) ?? false;
  return { score: compatible ? 100 : 25, status: compatible ? 'PASS' : 'WARNING' };
}

function sampledLinePoints(coordinates) {
  return coordinates.flatMap((point, index) => {
    if (!index) return [{ longitude: point[0], latitude: point[1] }];
    const previous = coordinates[index - 1];
    return Array.from({ length: 10 }, (_, step) => {
      const ratio = (step + 1) / 10;
      return {
        longitude: previous[0] + (point[0] - previous[0]) * ratio,
        latitude: previous[1] + (point[1] - previous[1]) * ratio,
      };
    });
  });
}

export function nearestRoadDistanceKm(point, projectRoads, existingRoads) {
  const projectPoints = projectRoads.flatMap(({ geometry }) => sampledLinePoints(geometry.coordinates ?? []));
  const existingPoints = existingRoads.flatMap(({ geometry }) => (
    geometry ?? []
  ).map(([latitude, longitude]) => ({ latitude, longitude })));
  const points = [...projectPoints, ...existingPoints].filter(({ latitude, longitude }) => (
    Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
  ));
  if (!points.length) return null;
  return Math.min(...points.map((candidate) => distanceKm(point, candidate)));
}

export function builtInPlanningRules({ boundaryPass, compatibility, constraintLevel, facilityType, roadDistanceKm }) {
  const roadTarget = ROAD_ACCESS_TARGET_KM[facilityType] ?? 1;
  return [{
    rule_code: 'PROJECT_BOUNDARY_CONTAINMENT', name: 'Inside saved project boundary',
    status: boundaryPass ? 'PASS' : 'FAIL', severity: 'BLOCKING',
    message: boundaryPass ? 'The selected point is inside the saved project boundary.' : 'The selected point is outside the saved project boundary.',
    source: { name: 'CityMind project geometry validation', url: null, rule_type: 'SYSTEM_VALIDATION', policy_version: '1.0', effective_year: null },
  }, {
    rule_code: 'LAND_USE_COMPATIBILITY', name: 'Compatible block land use',
    status: compatibility.status, severity: 'WARNING',
    message: compatibility.status === 'PASS' ? 'The selected facility type is compatible with the block land-use assumption.' : 'Land-use compatibility needs planner review.',
    source: { name: 'Project planning assumption', url: null, rule_type: 'PLANNER_ASSUMPTION', policy_version: '1.0', effective_year: null },
  }, {
    rule_code: 'ROAD_ACCESS_TARGET', name: 'Road access proximity target',
    status: roadDistanceKm === null ? 'UNVERIFIED' : roadDistanceKm <= roadTarget ? 'PASS' : 'WARNING', severity: 'WARNING',
    message: roadDistanceKm === null ? 'No mapped road is available to verify access.' : `Nearest mapped road is ${roadDistanceKm.toFixed(2)} km away; project target is ${roadTarget.toFixed(1)} km.`,
    source: { name: 'Project planning assumption', url: null, rule_type: 'PLANNER_ASSUMPTION', policy_version: '1.0', effective_year: null },
  }, {
    rule_code: 'BLOCK_CONSTRAINT_REVIEW', name: 'Block constraint review',
    status: ['HIGH', 'CRITICAL'].includes(constraintLevel) ? 'WARNING' : constraintLevel === 'UNASSESSED' ? 'UNVERIFIED' : 'PASS', severity: 'WARNING',
    message: constraintLevel === 'UNASSESSED' ? 'Block constraints have not been assessed.' : `Block constraint level is ${constraintLevel}.`,
    source: { name: 'Planner-entered block evidence', url: null, rule_type: 'PLANNER_ASSUMPTION', policy_version: '1.0', effective_year: null },
  }];
}
