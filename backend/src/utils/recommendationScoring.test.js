import {
  buildRecommendationCandidate,
  calculateRecommendationScore,
  rankRecommendationCandidates,
  RECOMMENDATION_WEIGHTS,
} from './recommendationScoring.js';

const analysis = {
  population_need_score: 80, infrastructure_gap_score: 70, mobility_score: 55,
  environment_score: 45, green_space_score: 30, infrastructure_score: 50,
  healthcare_score: 25, education_score: 40,
  evidence: { population: 100000, growth_rate: 4 },
};
const ward = { id: 1, city_id: 1, name: 'Ward A', ward_code: 'A' };

test('calculates a normalized recommendation score from configured weights', () => {
  const factors = { population_need: 90, infrastructure_gap: 80, accessibility: 70, future_demand: 60, existing_coverage: 50 };
  const score = calculateRecommendationScore(factors, RECOMMENDATION_WEIGHTS.OTHER);
  expect(score).toBe(75);
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
});

test('adapts coverage and accessibility factors by project type', () => {
  const hospital = buildRecommendationCandidate({ ward, analysis, projectType: 'HOSPITAL', planningHorizon: 5 });
  const road = buildRecommendationCandidate({ ward, analysis, projectType: 'ROAD', planningHorizon: 5 });
  expect(hospital.existing_coverage_score).toBe(75);
  expect(road.existing_coverage_score).toBe(45);
  expect(road.accessibility_score).toBe(45);
  expect(hospital.recommendation_score).not.toBe(road.recommendation_score);
});

test('ranks candidates by score', () => {
  const candidates = [
    { ...buildRecommendationCandidate({ ward, analysis, projectType: 'PARK', planningHorizon: 5 }), recommendation_score: 60, estimated_cost: 20 },
    { ...buildRecommendationCandidate({ ward: { ...ward, id: 2, name: 'Ward B' }, analysis, projectType: 'PARK', planningHorizon: 5 }), recommendation_score: 85, estimated_cost: 20 },
  ];
  const ranked = rankRecommendationCandidates(candidates, 100);
  expect(ranked.map(({ ward: item }) => item.name)).toEqual(['Ward B', 'Ward A']);
  expect(ranked.map(({ rank }) => rank)).toEqual([1, 2]);
});

test('equal scores have stable deterministic ordering', () => {
  const base = buildRecommendationCandidate({ ward, analysis, projectType: 'OTHER', planningHorizon: 5 });
  const ranked = rankRecommendationCandidates([
    { ...base, ward: { ...ward, id: 2, name: 'Zulu' }, recommendation_score: 70, infrastructure_gap_score: 50, estimated_cost: 10 },
    { ...base, ward: { ...ward, id: 1, name: 'Alpha' }, recommendation_score: 70, infrastructure_gap_score: 50, estimated_cost: 10 },
  ], 100);
  expect(ranked.map(({ ward: item }) => item.name)).toEqual(['Alpha', 'Zulu']);
});

test('returns no candidates when none fit the budget', () => {
  const candidate = buildRecommendationCandidate({ ward, analysis, projectType: 'HOSPITAL', planningHorizon: 5 });
  expect(rankRecommendationCandidates([candidate], 1)).toEqual([]);
  expect(rankRecommendationCandidates([], 100000)).toEqual([]);
});
