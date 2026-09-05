export const PROJECT_TYPES = Object.freeze([
  'HOSPITAL', 'SCHOOL', 'ROAD', 'ROAD_CONNECTION', 'DRAINAGE', 'PARK',
  'COMMERCIAL_CENTER', 'OTHER',
]);

export const RECOMMENDATION_WEIGHTS = Object.freeze({
  HOSPITAL: Object.freeze({ population_need: 0.25, infrastructure_gap: 0.15, accessibility: 0.10, future_demand: 0.15, existing_coverage: 0.35 }),
  SCHOOL: Object.freeze({ population_need: 0.25, infrastructure_gap: 0.15, accessibility: 0.10, future_demand: 0.15, existing_coverage: 0.35 }),
  ROAD: Object.freeze({ population_need: 0.20, infrastructure_gap: 0.25, accessibility: 0.35, future_demand: 0.10, existing_coverage: 0.10 }),
  ROAD_CONNECTION: Object.freeze({ population_need: 0.20, infrastructure_gap: 0.25, accessibility: 0.35, future_demand: 0.10, existing_coverage: 0.10 }),
  DRAINAGE: Object.freeze({ population_need: 0.20, infrastructure_gap: 0.25, accessibility: 0.25, future_demand: 0.20, existing_coverage: 0.10 }),
  PARK: Object.freeze({ population_need: 0.20, infrastructure_gap: 0.15, accessibility: 0.10, future_demand: 0.15, existing_coverage: 0.40 }),
  COMMERCIAL_CENTER: Object.freeze({ population_need: 0.30, infrastructure_gap: 0.15, accessibility: 0.25, future_demand: 0.20, existing_coverage: 0.10 }),
  OTHER: Object.freeze({ population_need: 0.30, infrastructure_gap: 0.25, accessibility: 0.20, future_demand: 0.15, existing_coverage: 0.10 }),
});

export const PROJECT_CONFIG = Object.freeze({
  HOSPITAL: Object.freeze({ baseCost: 100_000_000, servedRate: 0.35, coverageComponent: 'healthcare_score' }),
  SCHOOL: Object.freeze({ baseCost: 70_000_000, servedRate: 0.25, coverageComponent: 'education_score' }),
  ROAD: Object.freeze({ baseCost: 90_000_000, servedRate: 0.75, coverageComponent: 'mobility_score' }),
  ROAD_CONNECTION: Object.freeze({ baseCost: 90_000_000, servedRate: 0.75, coverageComponent: 'mobility_score' }),
  DRAINAGE: Object.freeze({ baseCost: 80_000_000, servedRate: 0.65, coverageComponent: 'environment_score' }),
  PARK: Object.freeze({ baseCost: 30_000_000, servedRate: 0.45, coverageComponent: 'green_space_score' }),
  COMMERCIAL_CENTER: Object.freeze({ baseCost: 60_000_000, servedRate: 0.30, coverageComponent: 'infrastructure_score' }),
  OTHER: Object.freeze({ baseCost: 50_000_000, servedRate: 0.25, coverageComponent: 'infrastructure_score' }),
});

const clamp = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : 0;
};
const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export function recommendationPriority(score) {
  if (score >= 80) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

export function calculateRecommendationScore(factors, weights) {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + Math.max(0, numeric(weight)), 0);
  if (!totalWeight) return 0;
  return clamp(Object.entries(weights).reduce(
    (sum, [factor, weight]) => sum + clamp(factors[factor]) * Math.max(0, numeric(weight)), 0,
  ) / totalWeight);
}

function accessibilityForProject(projectType, analysis) {
  if (projectType === 'ROAD') return clamp(100 - analysis.mobility_score);
  if (projectType === 'DRAINAGE') {
    return clamp((100 - analysis.environment_score) * 0.7 + (100 - analysis.green_space_score) * 0.3);
  }
  return clamp(analysis.mobility_score);
}

function futureDemand(analysis, planningHorizon) {
  const growthRate = Math.max(0, numeric(analysis.evidence?.growth_rate)) / 100;
  const projectedGrowth = (Math.pow(1 + growthRate, planningHorizon) - 1) * 100;
  const growthPressure = clamp((projectedGrowth / 40) * 100);
  return clamp(analysis.population_need_score * 0.55 + growthPressure * 0.45);
}

/**
 * All factors express recommendation desirability from 0–100. In particular,
 * existing_coverage_score is the coverage deficit: 100 means the project type
 * has the least current coverage and therefore the greatest intervention need.
 */
export function buildRecommendationCandidate({
  ward, analysis, projectType, planningHorizon, factorOverrides = null,
  candidateLocation = null, projectEvidence = null, constraints = [], population = null,
}) {
  if (!PROJECT_TYPES.includes(projectType)) throw new TypeError(`Unsupported project type: ${projectType}`);
  const config = PROJECT_CONFIG[projectType];
  const evidencePopulation = population === null ? numeric(analysis.evidence?.population) : numeric(population);
  const factors = factorOverrides ?? {
    population_need: clamp(analysis.population_need_score),
    infrastructure_gap: clamp(analysis.infrastructure_gap_score),
    accessibility: accessibilityForProject(projectType, analysis),
    future_demand: futureDemand(analysis, planningHorizon),
    existing_coverage: clamp(100 - analysis[config.coverageComponent]),
  };
  const recommendationScore = calculateRecommendationScore(factors, RECOMMENDATION_WEIGHTS[projectType]);
  const estimatedCost = Math.round(config.baseCost * (
    0.75 + factors.infrastructure_gap / 200 + factors.population_need / 400
  ));
  const horizonFactor = Math.min(1.15, 1 + planningHorizon * 0.01);
  const servedFactor = Math.min(1, config.servedRate * (0.75 + recommendationScore * 0.0025) * horizonFactor);
  const expectedPopulationServed = Math.round(evidencePopulation * servedFactor);
  const weakestFactor = Object.entries(factors).sort(([, a], [, b]) => b - a)[0];

  return {
    ward: { id: ward.id, city_id: ward.city_id, name: ward.name, ward_code: ward.ward_code },
    candidate_location: candidateLocation ?? {
      label: ward.name,
      latitude: numeric(ward.latitude),
      longitude: numeric(ward.longitude),
      geometry: { type: 'Point', coordinates: [numeric(ward.longitude), numeric(ward.latitude)] },
    },
    project_type: projectType,
    recommendation_score: recommendationScore,
    population_need_score: factors.population_need,
    infrastructure_gap_score: factors.infrastructure_gap,
    accessibility_score: factors.accessibility,
    future_demand_score: factors.future_demand,
    existing_coverage_score: factors.existing_coverage,
    estimated_cost: estimatedCost,
    expected_population_served: expectedPopulationServed,
    priority: recommendationPriority(recommendationScore),
    status: 'proposed',
    factors,
    weights: RECOMMENDATION_WEIGHTS[projectType],
    project_evidence: projectEvidence,
    constraints,
    explanation: [
      `${candidateLocation?.label ?? ward.name} is a planning option with ${recommendationScore}/100 suitability for a ${projectType.toLowerCase().replaceAll('_', ' ')} project.`,
      `${weakestFactor[0].replaceAll('_', ' ')} contributes ${weakestFactor[1]}/100 to the location need.`,
      `The estimate could serve approximately ${expectedPopulationServed.toLocaleString()} residents over the ${planningHorizon}-year horizon.`,
      'CityMind recommends this as an option; the planner makes the final site decision.',
    ],
  };
}

export function rankRecommendationCandidates(candidates, budget) {
  return candidates
    .filter((candidate) => candidate.estimated_cost <= budget)
    .sort((a, b) => b.recommendation_score - a.recommendation_score
      || b.infrastructure_gap_score - a.infrastructure_gap_score
      || a.candidate_location.label.localeCompare(b.candidate_location.label)
      || a.ward.id - b.ward.id)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}
