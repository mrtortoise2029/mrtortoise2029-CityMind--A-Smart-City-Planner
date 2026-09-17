import { describe, expect, test } from '@jest/globals';
import { calculateGrowthPrediction } from './growthPrediction.js';

const area = { area_sq_km: 2 };

describe('calculateGrowthPrediction', () => {
  test('interpolates a new development only through its project horizon', () => {
    const result = calculateGrowthPrediction({ project: {
      id: 8, project_type: 'NEW_DEVELOPMENT', planning_horizon: 10,
      current_population: 0, expected_population: 20_000,
      current_households: 0, expected_households: 5_000, area,
    } });
    expect(result.scenarios.map(({ year }) => year)).toEqual([5, 10]);
    expect(result.scenarios[0].population).toBe(10_000);
    expect(result.scenarios[1].population).toBe(20_000);
    expect(result.confidence).toBe('PLANNING_ASSUMPTION');
  });

  test('compounds recorded contextual growth for an existing area', () => {
    const result = calculateGrowthPrediction({ project: {
      id: 9, project_type: 'EXISTING_AREA', planning_horizon: 5,
      current_population: 10_000, current_households: 2_500, area,
    }, referenceGrowthRate: 2, referenceCount: 3 });
    expect(result.scenarios).toHaveLength(1);
    expect(result.scenarios[0].population).toBe(11_041);
    expect(result.annual_growth_rate).toBe(2);
    expect(result.data_sources[1].records).toBe(3);
  });

  test('labels a flat scenario when historical reference data is missing', () => {
    const result = calculateGrowthPrediction({ project: {
      id: 10, project_type: 'REDEVELOPMENT', planning_horizon: 20,
      current_population: 7_500, current_households: 2_000, area,
    } });
    expect(result.projected_population).toBe(7_500);
    expect(result.annual_growth_rate).toBeNull();
    expect(result.data_sources[1].data_type).toBe('DATA_UNAVAILABLE');
    expect(result.projection_label).toMatch(/Scenario-based/);
  });
});
