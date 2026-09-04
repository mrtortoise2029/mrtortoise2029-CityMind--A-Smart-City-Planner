import * as planningProjectRepository from '../repositories/planningProjectRepository.js';
import * as planningFeatureRepository from '../repositories/planningFeatureRepository.js';
import * as planningRuleRepository from '../repositories/planningRuleRepository.js';
import * as resourceRepository from '../repositories/resourceRepository.js';
import { calculateBlockAnalyses } from '../utils/projectBlockScoring.js';
import { pointInsideBoundary } from '../utils/projectRecommendationContext.js';
import {
  LOCATION_SUITABILITY_WEIGHTS, ROAD_ACCESS_TARGET_KM, builtInPlanningRules, clampScore,
  containingBlock, landUseCompatibility, nearestRoadDistanceKm, suitabilityStatus,
  weightedSuitabilityScore,
} from '../utils/locationSuitability.js';
import { httpError } from '../utils/httpError.js';

const componentByFacility = Object.freeze({
  HOSPITAL: 'healthcare', SCHOOL: 'education', PARK: 'green_space',
  COMMERCIAL_CENTER: 'infrastructure', ROAD: 'mobility', DRAINAGE: 'environment',
  COMMUNITY_FACILITY: 'infrastructure', OTHER: 'infrastructure',
});

const categoryByFacility = Object.freeze({
  HOSPITAL: 'hospital', SCHOOL: 'school', PARK: 'park', COMMERCIAL_CENTER: 'commercial',
  ROAD: 'road', DRAINAGE: 'drainage', COMMUNITY_FACILITY: 'community facility', OTHER: 'other',
});

const featureTypeByFacility = Object.freeze({
  ROAD: 'PLANNING_POINT', DRAINAGE: 'PLANNING_POINT', COMMUNITY_FACILITY: 'COMMUNITY_FACILITY',
});

const facilityLabel = (type) => type.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

async function loadContext(projectId, ownerUserId) {
  const project = await planningProjectRepository.findPlanningProjectById(projectId, ownerUserId);
  if (!project) throw httpError(404, 'Planning project not found', 'PLANNING_PROJECT_NOT_FOUND');
  const [features, roads] = await Promise.all([
    planningFeatureRepository.findPlanningFeatures(projectId),
    project.city_id ? resourceRepository.findRoadsByCity(project.city_id) : [],
  ]);
  return { project, features, roads };
}

function factorExplanation(factors) {
  return Object.entries(factors).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key, value]) => (
    `${key.replaceAll('_', ' ')} contributes ${value}/100 based on current project evidence.`
  ));
}

export async function evaluateLocation(projectId, ownerUserId, input) {
  const { project, features, roads } = await loadContext(projectId, ownerUserId);
  const point = { latitude: input.latitude, longitude: input.longitude };
  const boundary = project.area?.boundary_geojson;
  const boundaryPass = pointInsideBoundary(point, boundary);
  const blocks = calculateBlockAnalyses({ project, features });
  const block = containingBlock(point, blocks);
  const projectRoads = features.filter(({ feature_type: type, geometry, status }) => (
    ['PRIMARY_ROAD', 'SECONDARY_ROAD', 'LOCAL_ROAD', 'ROAD_PROPOSAL'].includes(type) && geometry.type === 'LineString' && status === 'approved'
  ));
  const roadDistance = nearestRoadDistanceKm(point, projectRoads, roads);
  const compatibility = landUseCompatibility(input.facilityType, block?.block.land_use);
  const maximumPopulation = Math.max(1, ...blocks.map(({ population }) => population));
  const populationNeed = block ? clampScore(block.population / maximumPopulation * 100) : 35;
  const component = componentByFacility[input.facilityType];
  const infrastructureGap = block ? clampScore(100 - block.components.infrastructure) : 50;
  const existingCoverageGap = block ? clampScore(100 - block.components[component]) : 50;
  const roadTarget = ROAD_ACCESS_TARGET_KM[input.facilityType] ?? 1;
  const accessibility = roadDistance === null ? 25 : clampScore(100 - roadDistance / Math.max(roadTarget * 2, 0.1) * 100);
  const horizonPressure = clampScore(Number(project.planning_horizon || 0) / 30 * 100);
  const constraintLevel = block?.planning_evidence.constraint_level ?? 'UNASSESSED';
  const constraintPenalty = ({ MEDIUM: 20, HIGH: 45, CRITICAL: 75, UNASSESSED: 25 })[constraintLevel] ?? 0;
  const landSuitability = block?.planning_evidence.land_suitability ?? 50;
  const factors = {
    policy_compliance: boundaryPass ? 100 : 0,
    land_use_compatibility: compatibility.score,
    population_need: populationNeed,
    infrastructure_gap: infrastructureGap,
    accessibility,
    existing_coverage_gap: existingCoverageGap,
    future_demand: clampScore(populationNeed * 0.65 + horizonPressure * 0.35),
    road_connectivity: accessibility,
    urban_health_impact: clampScore(existingCoverageGap * 0.65 + populationNeed * 0.35),
    spatial_constraints: clampScore(landSuitability - constraintPenalty),
  };
  const builtInRules = builtInPlanningRules({ boundaryPass, compatibility, constraintLevel, facilityType: input.facilityType, roadDistanceKm: roadDistance });
  const configuredRules = await planningRuleRepository.findActiveRules(projectId, input.facilityType);
  const score = weightedSuitabilityScore(factors);
  const status = suitabilityStatus(score, builtInRules.some((rule) => rule.status === 'FAIL' && rule.severity === 'BLOCKING'));
  const warnings = builtInRules.filter(({ status: value }) => ['FAIL', 'WARNING', 'UNVERIFIED'].includes(value)).map(({ message }) => message);

  return {
    project: { id: project.id, name: project.name, project_type: project.project_type },
    selection: { facility_type: input.facilityType, latitude: input.latitude, longitude: input.longitude, geometry: { type: 'Point', coordinates: [input.longitude, input.latitude] } },
    block: block ? { id: block.block.id, name: block.block.name, land_use: block.block.land_use, population: block.population, population_confidence: block.population_confidence } : null,
    suitability_score: score,
    status,
    factors,
    weights: LOCATION_SUITABILITY_WEIGHTS,
    rules: [...builtInRules, ...configuredRules.map((rule) => ({ ...rule, status: 'REQUIRES_REVIEW', source: { name: rule.source_name, url: rule.source_url, rule_type: rule.rule_type, policy_version: rule.policy_version, effective_year: rule.effective_year } }))],
    reasons: factorExplanation(factors),
    warnings,
    evidence: {
      nearest_road_km: roadDistance === null ? null : Number(roadDistance.toFixed(3)),
      road_access_target_km: roadTarget,
      land_suitability_score: landSuitability,
      block_constraint_level: constraintLevel,
      confidence: 'ESTIMATED',
      note: 'Suitability is a deterministic planning indicator. Planner assumptions require professional and authority verification.',
    },
    alternatives: blocks.filter((candidate) => candidate.block.id !== block?.block.id).sort((a, b) => b.score - a.score).slice(0, 3).map((candidate) => ({ block_id: candidate.block.id, block_name: candidate.block.name, urban_health_score: candidate.score, population: candidate.population })),
  };
}

export async function acceptEvaluatedLocation(projectId, ownerUserId, input) {
  const evaluation = await evaluateLocation(projectId, ownerUserId, input);
  if (evaluation.status === 'NOT_RECOMMENDED' && !input.overrideReason) {
    throw httpError(409, 'This location is not recommended. Provide an override reason to add it to the plan.', 'LOCATION_OVERRIDE_REQUIRED');
  }
  const featureType = featureTypeByFacility[input.facilityType] ?? 'FACILITY_PROPOSAL';
  const saved = await planningFeatureRepository.createPlanningFeature(projectId, {
    feature_type: featureType,
    category: categoryByFacility[input.facilityType],
    name: input.name || `Proposed ${facilityLabel(input.facilityType)}`,
    geometry: evaluation.selection.geometry,
    status: 'approved',
    source: 'planner',
    properties: {
      suitabilityScore: evaluation.suitability_score,
      suitabilityStatus: evaluation.status,
      evaluatedFacilityType: input.facilityType,
      evidenceConfidence: evaluation.evidence.confidence,
      evaluationModel: 'location-suitability-1.0',
      overrideReason: input.overrideReason || null,
      blockId: evaluation.block?.id ?? null,
    },
  });
  return { feature: saved, evaluation, recalculation_required: ['GAP_ANALYSIS', 'URBAN_HEALTH', 'RECOMMENDATIONS'] };
}

export async function listPlanningRules(projectId, ownerUserId, facilityType = null) {
  const { project } = await loadContext(projectId, ownerUserId);
  const configured = await planningRuleRepository.findActiveRules(projectId, facilityType);
  return {
    project: { id: project.id, name: project.name },
    configured_rules: configured,
    methodology: { weights: LOCATION_SUITABILITY_WEIGHTS, road_access_targets_km: ROAD_ACCESS_TARGET_KM },
    notice: configured.length ? null : 'No authoritative policy dataset is connected. CityMind will use transparent system validation and planner assumptions only.',
  };
}
