import * as analysisRepository from '../repositories/analysisRepository.js';
import * as cityRepository from '../repositories/cityRepository.js';
import { calculateUrbanGapScores } from '../utils/urbanScoring.js';
import { httpError } from '../utils/httpError.js';

function buildFindings(input) {
  const scores = calculateUrbanGapScores(input);
  return {
    ward: {
      id: input.id,
      city_id: input.city_id,
      name: input.name,
      ward_code: input.ward_code,
    },
    ...scores,
    scoring_version: '1.0',
    generated_by: 'deterministic',
  };
}

function healthResponse(analysis) {
  return {
    ward: analysis.ward,
    score: analysis.urban_health_score,
    category: analysis.health_category,
    components: {
      healthcare: analysis.healthcare_score,
      education: analysis.education_score,
      mobility: analysis.mobility_score,
      environment: analysis.environment_score,
      green_space: analysis.green_space_score,
      infrastructure: analysis.infrastructure_score,
    },
    weights: analysis.health_weights,
    data_quality: analysis.data_quality,
    analysis_id: analysis.analysis_id,
    analyzed_at: analysis.analyzed_at,
  };
}

function isCurrentAnalysis(previous, current) {
  if (!previous) return false;
  const scoreFields = [
    'healthcare_score', 'education_score', 'mobility_score', 'environment_score',
    'green_space_score', 'infrastructure_score', 'urban_health_score', 'health_category',
  ];
  const sameNumericObject = (left = {}, right = {}) => Object.keys(right).every((key) => {
    if (left[key] === null || right[key] === null) return left[key] === right[key];
    return Number(left[key]) === Number(right[key]);
  });
  return scoreFields.every((field) => previous[field] === current[field])
    && sameNumericObject(previous.evidence, current.evidence)
    && sameNumericObject(previous.health_weights, current.health_weights);
}

export async function runWardAnalysis(wardId) {
  const input = await analysisRepository.findWardAnalysisInput(wardId);
  if (!input) throw httpError(404, 'Ward not found', 'WARD_NOT_FOUND');
  return analysisRepository.saveWardAnalysis(wardId, buildFindings(input));
}

export async function getLatestWardAnalysis(wardId) {
  const input = await analysisRepository.findWardAnalysisInput(wardId);
  if (!input) throw httpError(404, 'Ward not found', 'WARD_NOT_FOUND');
  const analysis = await analysisRepository.findLatestWardAnalysis(wardId);
  if (!analysis) throw httpError(404, 'No urban gap analysis exists for this ward', 'ANALYSIS_NOT_FOUND');
  return analysis;
}

export async function getCityAnalyses(cityId) {
  const city = await cityRepository.findCityById(cityId);
  if (!city) throw httpError(404, 'City not found', 'CITY_NOT_FOUND');
  const analyses = await analysisRepository.findLatestCityAnalyses(cityId);
  return { city, analyses, analyzed_wards: analyses.length };
}

export async function getWardHealthScore(wardId) {
  const input = await analysisRepository.findWardAnalysisInput(wardId);
  if (!input) throw httpError(404, 'Ward not found', 'WARD_NOT_FOUND');
  const current = buildFindings(input);
  const previous = await analysisRepository.findLatestWardAnalysis(wardId);
  const analysis = isCurrentAnalysis(previous, current)
    ? previous
    : await analysisRepository.saveWardAnalysis(wardId, current);
  return healthResponse(analysis);
}

export async function getCityHealthScores(cityId) {
  const city = await cityRepository.findCityById(cityId);
  if (!city) throw httpError(404, 'City not found', 'CITY_NOT_FOUND');
  const wards = await cityRepository.findWardMetrics(cityId);
  const rankings = await Promise.all(wards.map((ward) => getWardHealthScore(ward.id)));
  rankings.sort((a, b) => b.score - a.score || a.ward.name.localeCompare(b.ward.name));
  return { city, rankings };
}
