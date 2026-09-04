import * as analysisRepository from '../repositories/analysisRepository.js';
import * as cityRepository from '../repositories/cityRepository.js';
import * as recommendationRepository from '../repositories/recommendationRepository.js';
import * as planningProjectRepository from '../repositories/planningProjectRepository.js';
import * as resourceRepository from '../repositories/resourceRepository.js';
import * as planningFeatureRepository from '../repositories/planningFeatureRepository.js';
import { polygonMetrics } from '../utils/projectGeometry.js';
import { calculateUrbanGapScores } from '../utils/urbanScoring.js';
import {
  buildRecommendationCandidate, calculateRecommendationScore, rankRecommendationCandidates,
} from '../utils/recommendationScoring.js';
import {
  generateCandidateSites, nearestWard, normalizeFacilityType, pointInsideBoundary,
  PROPOSED_ASSET_COVERAGE_WEIGHT, projectFactorOverrides,
} from '../utils/projectRecommendationContext.js';
import { httpError } from '../utils/httpError.js';

async function createForContext({ projectType, budget, planningHorizon, cityId, planningProject = null }) {
  const city = await cityRepository.findCityById(cityId);
  if (!city) throw httpError(404, 'City not found', 'CITY_NOT_FOUND');
  const wards = await resourceRepository.findWardsByCity(cityId);
  if (!wards.length) {
    return {
      city,
      planning_project: planningProject,
      request: { projectType, budget, planningHorizon },
      recommendations: [],
      candidate_count: 0,
    };
  }

  const candidates = (await Promise.all(wards.map(async (ward) => {
    const input = await analysisRepository.findWardAnalysisInput(ward.id);
    if (!input) return null;
    return buildRecommendationCandidate({
      ward,
      analysis: calculateUrbanGapScores(input),
      projectType,
      planningHorizon,
    });
  }))).filter(Boolean);
  const ranked = rankRecommendationCandidates(candidates, budget);
  if (planningProject?.id) await recommendationRepository.supersedeProjectRecommendations(planningProject.id, projectType);
  const saved = await recommendationRepository.saveRecommendations(
    cityId,
    ranked,
    planningHorizon,
    planningProject?.id ?? null,
  );
  return {
    city,
    planning_project: planningProject,
    request: { projectType, budget, planningHorizon },
    recommendations: saved,
    candidate_count: saved.length,
    evaluated_wards: candidates.length,
    message: saved.length ? null : 'No candidate wards fit the available budget.',
  };
}

export async function createRecommendations(input) {
  return createForContext(input);
}

export async function createProjectRecommendations({ projectId, ownerUserId, projectType, budget, planningHorizon }) {
  const planningProject = await planningProjectRepository.findPlanningProjectById(projectId, ownerUserId);
  if (!planningProject) throw httpError(404, 'Planning project not found', 'PLANNING_PROJECT_NOT_FOUND');
  if (!planningProject.city_id) {
    throw httpError(
      409,
      'This project needs a linked city or imported spatial dataset before locations can be analyzed',
      'PROJECT_SPATIAL_CONTEXT_REQUIRED',
    );
  }
  const boundary = planningProject.area?.boundary_geojson;
  if (!boundary?.coordinates?.[0]?.length) {
    throw httpError(
      409,
      'This project needs a valid boundary before candidate locations can be analyzed',
      'PROJECT_SPATIAL_CONTEXT_REQUIRED',
    );
  }

  const effectiveHorizon = planningHorizon ?? Number(planningProject.planning_horizon);
  const [city, wards, facilities, roads, planningFeatures] = await Promise.all([
    cityRepository.findCityById(planningProject.city_id),
    resourceRepository.findWardsByCity(planningProject.city_id),
    resourceRepository.findFacilitiesByCity(planningProject.city_id),
    resourceRepository.findRoadsByCity(planningProject.city_id),
    planningFeatureRepository.findPlanningFeatures(projectId),
  ]);
  const blocks = planningFeatures.filter(({ feature_type: type }) => type === 'BLOCK');
  const projectFacilities = planningFeatures
    .filter(({ feature_type: type, geometry, status }) => ['FACILITY_PROPOSAL', 'COMMUNITY_FACILITY'].includes(type) && geometry.type === 'Point' && status !== 'rejected')
    .map((feature) => ({
      type: normalizeFacilityType(feature.category),
      latitude: feature.geometry.coordinates[1], longitude: feature.geometry.coordinates[0],
      source: 'project_plan', planning_status: feature.status,
      block_id: blocks.find((block) => pointInsideBoundary({
        latitude: feature.geometry.coordinates[1], longitude: feature.geometry.coordinates[0],
      }, block.geometry))?.id ?? null,
    }));
  const projectRoads = planningFeatures
    .filter(({ feature_type: type, geometry, status }) => ['PRIMARY_ROAD', 'SECONDARY_ROAD', 'LOCAL_ROAD', 'ROAD_PROPOSAL'].includes(type) && geometry.type === 'LineString' && status !== 'rejected')
    .map((feature) => ({ geometry: feature.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]), source: 'project_plan', planning_status: feature.status }));
  const spatialFacilities = [...facilities, ...projectFacilities];
  const spatialRoads = [...roads, ...projectRoads];
  const blockSites = blocks.flatMap((block, blockIndex) => {
    const generated = generateCandidateSites(block.geometry, 3);
    const { centroid } = polygonMetrics(block.geometry);
    const points = generated.length ? generated : [{ ...centroid, geometry: { type: 'Point', coordinates: [centroid.longitude, centroid.latitude] } }];
    return points.map((point, siteIndex) => ({
      ...point,
      label: `Candidate Site ${String.fromCharCode(65 + blockIndex)}${siteIndex + 1} — ${block.name}`,
      block_id: block.id,
      block_name: block.name,
      block_population: Number(block.properties?.population || 0),
      block_properties: block.properties ?? {},
      geometry: point.geometry ?? { type: 'Point', coordinates: [point.longitude, point.latitude] },
    }));
  });
  const sites = blockSites.length ? blockSites : generateCandidateSites(boundary);
  const projectPopulation = planningProject.project_type === 'EXISTING_AREA'
    ? Number(planningProject.current_population || 0)
    : Number(planningProject.expected_population || 0);
  const projectWithRequest = { ...planningProject, requested_project_type: projectType };

  const candidates = (await Promise.all(sites.map(async (site) => {
    const ward = nearestWard(site, wards);
    if (!ward) return null;
    const input = await analysisRepository.findWardAnalysisInput(ward.id);
    if (!input) return null;
    const analysis = calculateUrbanGapScores(input);
    const sitePopulation = site.block_population || (blockSites.length
      ? Math.round(projectPopulation / Math.max(sites.length, 1))
      : projectPopulation);
    const projectForSite = planningProject.project_type === 'EXISTING_AREA'
      ? { ...projectWithRequest, current_population: sitePopulation }
      : { ...projectWithRequest, expected_population: sitePopulation };
    const projectFactors = projectFactorOverrides({
      analysis, facilities: spatialFacilities, planningHorizon: effectiveHorizon,
      project: projectForSite, roads: spatialRoads, site, sites,
    });
    return buildRecommendationCandidate({
      ward,
      analysis,
      projectType,
      planningHorizon: effectiveHorizon,
      factorOverrides: projectFactors.factors,
      candidateLocation: site,
      projectEvidence: {
        ...projectFactors.evidence,
        project_population: projectPopulation,
        block_id: site.block_id ?? null,
        block_name: site.block_name ?? null,
        block_population: sitePopulation,
        population_confidence: site.block_population ? 'PLANNING_ASSUMPTION' : 'ESTIMATED',
        block_land_suitability: site.block_properties?.landSuitability ?? null,
        block_constraint_level: site.block_properties?.constraintLevel ?? 'UNASSESSED',
      },
      constraints: projectFactors.constraints,
      population: sitePopulation,
    });
  }))).filter(Boolean);
  const ranked = rankRecommendationCandidates(candidates, budget);
  const rejectedCandidates = candidates
    .filter((candidate) => candidate.estimated_cost > budget)
    .map((candidate) => ({
      candidate_location: candidate.candidate_location,
      estimated_cost: candidate.estimated_cost,
      reason: `Estimated cost exceeds the available budget by ${candidate.estimated_cost - budget} BDT.`,
      constraints: candidate.constraints,
    }));
  const budgetScenarios = [
    ['MINIMUM_COST', 0.75], ['BALANCED', 1], ['MAXIMUM_IMPACT', 1.5],
  ].map(([name, multiplier]) => {
    const scenarioBudget = Math.round(budget * multiplier);
    const scenarioRanked = rankRecommendationCandidates(candidates, scenarioBudget);
    return {
      name, budget: scenarioBudget, feasible_candidates: scenarioRanked.length,
      top_candidate: scenarioRanked[0] ? {
        label: scenarioRanked[0].candidate_location.label,
        score: scenarioRanked[0].recommendation_score,
        estimated_cost: scenarioRanked[0].estimated_cost,
      } : null,
    };
  });
  const sensitivity = ranked[0] ? Object.entries(ranked[0].weights).map(([factor, weight]) => {
    const adjusted = { ...ranked[0].weights, [factor]: weight + 0.1 };
    return {
      factor,
      baseline_weight: weight,
      increased_weight: Number((weight + 0.1).toFixed(2)),
      resulting_score: calculateRecommendationScore(ranked[0].factors, adjusted),
    };
  }) : [];
  await recommendationRepository.supersedeProjectRecommendations(planningProject.id, projectType);
  const saved = await recommendationRepository.saveRecommendations(
    planningProject.city_id,
    ranked,
    effectiveHorizon,
    planningProject.id,
  );
  return {
    city,
    planning_project: planningProject,
    spatial_context: {
      boundary,
      generated_candidate_sites: sites.length,
      approved_assets_considered: planningFeatures.filter(({ status }) => status === 'approved').length,
      proposed_assets_considered: planningFeatures.filter(({ status }) => ['proposed', 'recommended'].includes(status)).length,
      proposal_coverage_weight: PROPOSED_ASSET_COVERAGE_WEIGHT,
      methodology: blockSites.length
        ? 'One deterministic candidate centroid per saved project block, evaluated with block population and spatial evidence.'
        : 'Deterministic points generated inside the saved project boundary and evaluated with nearby mapped evidence.',
    },
    request: { projectType, budget, planningHorizon: effectiveHorizon },
    recommendations: saved,
    rejected_candidates: rejectedCandidates,
    budget_scenarios: budgetScenarios,
    sensitivity,
    candidate_count: saved.length,
    evaluated_candidates: candidates.length,
    message: saved.length ? null : candidates.length
      ? 'No candidate sites fit the available budget.'
      : 'No candidate sites could be evaluated from the available project spatial data.',
  };
}

export async function listProjectRecommendations(projectId, ownerUserId) {
  const planningProject = await planningProjectRepository.findPlanningProjectById(projectId, ownerUserId);
  if (!planningProject) throw httpError(404, 'Planning project not found', 'PLANNING_PROJECT_NOT_FOUND');
  const recommendations = await recommendationRepository.findRecommendationsByPlanningProject(projectId);
  return { planning_project: planningProject, recommendations };
}

export async function updateProjectRecommendationStatus({ projectId, recommendationId, ownerUserId, status }) {
  const planningProject = await planningProjectRepository.findPlanningProjectById(projectId, ownerUserId);
  if (!planningProject) throw httpError(404, 'Planning project not found', 'PLANNING_PROJECT_NOT_FOUND');
  const updated = await recommendationRepository.updateRecommendationStatus(projectId, recommendationId, status);
  if (!updated) throw httpError(404, 'Recommendation not found', 'RECOMMENDATION_NOT_FOUND');
  return updated;
}
