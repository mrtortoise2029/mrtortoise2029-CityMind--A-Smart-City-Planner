import {
  calculateUrbanGapScores,
  calculateUrbanHealthScore,
  getUrbanHealthCategory,
  URBAN_HEALTH_WEIGHTS,
} from './urbanScoring.js';

const normalInput = {
  population: 50000,
  area_sq_km: 8,
  population_density: 6250,
  growth_rate: 2.5,
  hospitals: 5,
  hospital_capacity: 180,
  schools: 12,
  school_capacity: 8000,
  parks: 4,
  road_length_km: 28,
  average_road_condition: 3.8,
  congestion_score: 65,
  air_quality_index: 105,
  green_cover_percent: 20,
  water_quality_index: 75,
  noise_level_db: 60,
};

const expectNormalized = (result) => {
  for (const key of [
    'healthcare_score', 'education_score', 'mobility_score', 'environment_score',
    'green_space_score', 'infrastructure_score', 'urban_health_score',
    'infrastructure_gap_score', 'population_need_score', 'priority_score',
  ]) {
    expect(result[key]).toBeGreaterThanOrEqual(0);
    expect(result[key]).toBeLessThanOrEqual(100);
  }
};

test('calculates normalized deterministic scores for normal values', () => {
  const first = calculateUrbanGapScores(normalInput);
  const second = calculateUrbanGapScores(normalInput);
  expect(first).toEqual(second);
  expectNormalized(first);
  expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(first.overall_priority);
});

test('handles missing facility data', () => {
  const result = calculateUrbanGapScores({ ...normalInput, hospitals: undefined, schools: undefined, parks: undefined });
  expect(result.healthcare_score).toBeLessThan(calculateUrbanGapScores(normalInput).healthcare_score);
  expect(result.infrastructure_gap_score).toBeGreaterThan(calculateUrbanGapScores(normalInput).infrastructure_gap_score);
});

test('zero hospitals produces a lower healthcare score', () => {
  const result = calculateUrbanGapScores({ ...normalInput, hospitals: 0, hospital_capacity: 0 });
  expect(result.healthcare_score).toBeLessThan(20);
});

test('zero schools produces a lower education score', () => {
  const result = calculateUrbanGapScores({ ...normalInput, schools: 0, school_capacity: 0 });
  expect(result.education_score).toBeLessThan(20);
});

test('empty environment data is reported and penalized', () => {
  const result = calculateUrbanGapScores({
    ...normalInput,
    air_quality_index: null,
    water_quality_index: null,
    noise_level_db: null,
    green_cover_percent: null,
  });
  expect(result.environment_score).toBe(0);
  expect(result.data_quality.missing_fields).toContain('air_quality_index');
});

test('high population creates greater population need', () => {
  const high = calculateUrbanGapScores({ ...normalInput, population: 180000, population_density: 18000, growth_rate: 6 });
  const baseline = calculateUrbanGapScores(normalInput);
  expect(high.population_need_score).toBeGreaterThan(baseline.population_need_score);
  expect(high.population_need_score).toBe(100);
});

test('low population creates low population need', () => {
  const result = calculateUrbanGapScores({ ...normalInput, population: 8000, population_density: 900, growth_rate: 0.5 });
  expect(result.population_need_score).toBeLessThan(15);
});

test('urban health uses the centralized weights', () => {
  const components = { healthcare: 80, education: 70, mobility: 60, environment: 50, green_space: 40, infrastructure: 30 };
  const expected = Math.round(Object.entries(components).reduce(
    (sum, [key, value]) => sum + value * URBAN_HEALTH_WEIGHTS[key], 0,
  ));
  expect(calculateUrbanHealthScore(components)).toBe(expected);
});

test('urban health cannot exceed 100 or fall below zero', () => {
  expect(calculateUrbanHealthScore({ healthcare: 500, education: 500, mobility: 500, environment: 500, green_space: 500, infrastructure: 500 })).toBe(100);
  expect(calculateUrbanHealthScore({ healthcare: -20, education: -20, mobility: -20, environment: -20, green_space: -20, infrastructure: -20 })).toBe(0);
});

test('urban health safely handles missing components', () => {
  expect(calculateUrbanHealthScore({ healthcare: 80 })).toBeGreaterThanOrEqual(0);
  expect(calculateUrbanHealthScore({ healthcare: 80 })).toBeLessThanOrEqual(100);
  expect(calculateUrbanHealthScore({})).toBe(0);
});

test.each([
  [80, 'Excellent'], [79, 'Good'], [65, 'Good'], [64, 'Moderate'],
  [50, 'Moderate'], [49, 'Poor'], [30, 'Poor'], [29, 'Critical'], [0, 'Critical'],
])('categorizes health score %i as %s', (score, category) => {
  expect(getUrbanHealthCategory(score)).toBe(category);
});
