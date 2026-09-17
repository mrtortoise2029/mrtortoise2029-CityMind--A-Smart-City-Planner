import * as planningProjectRepository from '../repositories/planningProjectRepository.js';
import * as planningFeatureService from './planningFeatureService.js';
import * as projectGapAnalysisService from './projectGapAnalysisService.js';
import * as projectBlockAnalysisService from './projectBlockAnalysisService.js';
import * as projectGrowthService from './projectGrowthService.js';
import * as projectRiskService from './projectRiskService.js';
import * as projectDeliveryService from './projectDeliveryService.js';
import * as recommendationService from './recommendationService.js';
import { explainProjectReport } from './geminiService.js';
import { httpError } from '../utils/httpError.js';

const unavailable = (reason) => ({ status: 'UNAVAILABLE', reason });
const valueOrUnavailable = (result) => result.status === 'fulfilled'
  ? { status: 'READY', data: result.value }
  : unavailable(result.reason?.message ?? 'Data unavailable');

export async function getProjectReport(projectId, ownerUserId) {
  const project = await planningProjectRepository.findPlanningProjectById(projectId, ownerUserId);
  if (!project) throw httpError(404, 'Planning project not found', 'PLANNING_PROJECT_NOT_FOUND');
  const results = await Promise.allSettled([
    planningFeatureService.listPlanningFeatures(projectId, ownerUserId),
    projectGapAnalysisService.getProjectGapAnalysis(projectId, ownerUserId),
    projectBlockAnalysisService.getProjectBlockAnalysis(projectId, ownerUserId),
    recommendationService.listProjectRecommendations(projectId, ownerUserId),
    projectGrowthService.getGrowthPrediction(projectId, ownerUserId),
    projectRiskService.getRiskDetection(projectId, ownerUserId),
    projectDeliveryService.getFuturePlan(projectId, ownerUserId),
    projectDeliveryService.listBudgets(projectId, ownerUserId),
  ]);
  const [features, gaps, health, recommendations, growth, risks, future, budgets] = results.map(valueOrUnavailable);
  const featureData = features.data ?? [];
  const assetCounts = featureData.reduce((counts, feature) => ({
    ...counts, [feature.feature_type]: (counts[feature.feature_type] ?? 0) + 1,
  }), {});
  const savedBudgets = budgets.data?.scenarios ?? [];
  const aiSummary = await explainProjectReport(project, {
    project_type: project.project_type, planning_horizon: project.planning_horizon,
    infrastructure_gap_percent: gaps.data?.overview?.overall_gap_percent ?? 'DATA_UNAVAILABLE',
    growth_scenario_population: growth.data?.projected_population ?? 'DATA_UNAVAILABLE',
    growth_confidence: growth.data?.confidence ?? 'DATA_UNAVAILABLE',
    overall_risk: risks.data?.overall_risk_level ?? 'DATA_UNAVAILABLE',
    recommendation_count: recommendations.data?.recommendations?.length ?? 0,
    unavailable_risk_datasets: risks.data?.unavailable_risks?.map(({ risk_type }) => risk_type) ?? [],
  }).catch(() => null);
  return {
    report_version: '1.0', generated_at: new Date().toISOString(), project_id: project.id,
    title: `${project.name} — CityMind Planning Report`,
    branding: 'CityMind – AI Urban Planning Decision Support System',
    project_overview: { status: 'READY', data: {
      id: project.id, name: project.name, description: project.description,
      project_type: project.project_type, planning_stage: project.planning_stage,
      planning_horizon: project.planning_horizon, region: project.region, country: project.country,
      boundary: project.area?.boundary_geojson ?? null,
      area_acres: project.area?.area_acres ?? project.area_acres,
      population: {
        current: project.current_population, expected: project.expected_population,
        current_data_type: project.current_population ? 'OBSERVED' : 'DATA_UNAVAILABLE',
        expected_data_type: project.expected_population ? 'PLANNER_DEFINED' : 'DATA_UNAVAILABLE',
      },
    } },
    gis_assets: features.status === 'READY' ? { status: 'READY', data: { counts: assetCounts, features: featureData } } : features,
    gap_analysis: gaps, urban_health: health,
    recommendations: recommendations.data?.recommendations?.length
      ? recommendations : unavailable('No project recommendations have been generated.'),
    growth_prediction: growth, risk_detection: risks, future_planning: future,
    budget_information: savedBudgets.length
      ? { status: 'READY', data: savedBudgets, notice: 'Existing saved Budget Optimizer output; no budget calculation was performed for this report.' }
      : unavailable('No existing saved Budget Optimizer result is available.'),
    ai_summary: aiSummary
      ? { status: 'READY', data: { text: aiSummary, role: 'EXPLANATION_ONLY' } }
      : unavailable('Gemini is not configured or could not provide an explanation. Deterministic results remain available.'),
    data_notice: 'Observed, estimated, projected, simulated, and planner-defined values retain their labels. Simulations are not official forecasts or mandatory decisions.',
  };
}
