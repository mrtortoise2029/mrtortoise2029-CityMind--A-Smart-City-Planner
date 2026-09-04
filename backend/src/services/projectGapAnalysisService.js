import * as analysisRepository from '../repositories/analysisRepository.js';
import * as planningProjectRepository from '../repositories/planningProjectRepository.js';
import * as resourceRepository from '../repositories/resourceRepository.js';
import { calculateProjectGapReport } from '../utils/projectGapScoring.js';
import { distanceToBoundaryKm, normalizeFacilityType } from '../utils/projectRecommendationContext.js';
import { httpError } from '../utils/httpError.js';
import * as planningFeatureRepository from '../repositories/planningFeatureRepository.js';
import { calculateBlockAnalyses, summarizeProjectBlockHealth } from '../utils/projectBlockScoring.js';

export async function getProjectGapAnalysis(projectId, ownerUserId, benchmarkScale = 1) {
  const project = await planningProjectRepository.findPlanningProjectById(projectId, ownerUserId);
  if (!project) throw httpError(404, 'Planning project not found', 'PLANNING_PROJECT_NOT_FOUND');
  const boundary = project.area?.boundary_geojson;
  if (!boundary?.coordinates?.[0]?.length) {
    throw httpError(409, 'A valid project boundary is required for gap analysis', 'PROJECT_SPATIAL_CONTEXT_REQUIRED');
  }
  if (!project.city_id) {
    throw httpError(409, 'A linked spatial dataset is required for gap analysis', 'PROJECT_SPATIAL_CONTEXT_REQUIRED');
  }

  const [wards, facilities, roads, planningFeatures] = await Promise.all([
    resourceRepository.findWardsByCity(project.city_id),
    resourceRepository.findFacilitiesByCity(project.city_id),
    resourceRepository.findRoadsByCity(project.city_id),
    planningFeatureRepository.findPlanningFeatures(projectId),
  ]);
  const contextWards = wards.filter((ward) => distanceToBoundaryKm({
    latitude: Number(ward.latitude), longitude: Number(ward.longitude),
  }, boundary) <= 3);
  const inputs = (await Promise.all(contextWards.map((ward) => (
    analysisRepository.findWardAnalysisInput(ward.id)
  )))).filter(Boolean);
  const growthRate = inputs.length
    ? inputs.reduce((sum, input) => sum + Number(input.growth_rate || 0), 0) / inputs.length
    : 0;
  const implementedFacilities = planningFeatures
    .filter(({ feature_type: type, geometry, status }) => ['FACILITY_PROPOSAL', 'COMMUNITY_FACILITY'].includes(type) && geometry.type === 'Point' && status === 'approved')
    .map((feature) => ({
      type: normalizeFacilityType(feature.category), latitude: feature.geometry.coordinates[1],
      longitude: feature.geometry.coordinates[0], capacity: Number(feature.properties?.capacity || 0),
    }));
  const implementedRoads = planningFeatures
    .filter(({ feature_type: type, geometry, status }) => ['PRIMARY_ROAD', 'SECONDARY_ROAD', 'LOCAL_ROAD', 'ROAD_PROPOSAL', 'DRAINAGE_CORRIDOR'].includes(type) && geometry.type === 'LineString' && status === 'approved')
    .map((feature) => ({
      geometry: feature.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]),
      length_km: Number(feature.properties?.lengthKm || 0), condition_rating: 4,
      feature_type: feature.feature_type,
    }));
  const pipelineFacilities = planningFeatures
    .filter(({ feature_type: type, geometry, status }) => ['FACILITY_PROPOSAL', 'COMMUNITY_FACILITY'].includes(type) && geometry.type === 'Point' && status !== 'rejected')
    .map((feature) => ({
      type: normalizeFacilityType(feature.category), latitude: feature.geometry.coordinates[1],
      longitude: feature.geometry.coordinates[0], capacity: Number(feature.properties?.capacity || 0),
      planning_status: feature.status, source: 'project_plan',
    }));
  const pipelineRoads = planningFeatures
    .filter(({ feature_type: type, geometry, status }) => ['PRIMARY_ROAD', 'SECONDARY_ROAD', 'LOCAL_ROAD', 'ROAD_PROPOSAL', 'DRAINAGE_CORRIDOR'].includes(type) && geometry.type === 'LineString' && status !== 'rejected')
    .map((feature) => ({
      geometry: feature.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]),
      length_km: Number(feature.properties?.lengthKm || 0), condition_rating: 4,
      feature_type: feature.feature_type, planning_status: feature.status, source: 'project_plan',
    }));
  const report = calculateProjectGapReport({
    project, facilities: [...facilities, ...implementedFacilities], roads: [...roads, ...implementedRoads], growthRate,
    benchmarkScale,
  });
  const blockAnalysis = calculateBlockAnalyses({ project, features: planningFeatures });
  const plannedFeatures = planningFeatures.map((feature) => feature.status === 'rejected'
    ? feature : { ...feature, status: 'approved' });
  const plannedBlockAnalysis = calculateBlockAnalyses({ project, features: plannedFeatures });
  const plannedReport = calculateProjectGapReport({
    project, facilities: [...facilities, ...pipelineFacilities], roads: [...roads, ...pipelineRoads], growthRate,
    benchmarkScale,
  });

  return {
    project: {
      id: project.id,
      name: project.name,
      project_type: project.project_type,
      planning_horizon: project.planning_horizon,
      boundary,
    },
    question: 'What does this planning area currently need?',
    spatial_context: {
      contextual_wards: contextWards.length,
      mapped_facilities: facilities.length,
      mapped_roads: roads.length,
      maximum_service_radius_km: 3,
      approved_project_assets: planningFeatures.filter(({ status }) => status === 'approved').length,
      proposed_project_assets_excluded_from_current_scores: planningFeatures
        .filter(({ status }) => ['proposed', 'recommended'].includes(status)).length,
      rejected_project_assets_ignored: planningFeatures.filter(({ status }) => status === 'rejected').length,
    },
    block_analysis: {
      summary: summarizeProjectBlockHealth(blockAnalysis),
      blocks: blockAnalysis,
    },
    planned_scenario: {
      confidence: 'SIMULATED',
      description: 'Expected coverage if every non-rejected project proposal is implemented.',
      overview: plannedReport.overview,
      categories: plannedReport.categories,
      block_analysis: {
        summary: summarizeProjectBlockHealth(plannedBlockAnalysis),
        blocks: plannedBlockAnalysis,
      },
      gap_change: report.overview.overall_gap_percent - plannedReport.overview.overall_gap_percent,
    },
    ...report,
  };
}
