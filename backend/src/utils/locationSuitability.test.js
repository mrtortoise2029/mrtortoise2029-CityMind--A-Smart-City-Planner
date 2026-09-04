import {
  landUseCompatibility, suitabilityStatus, weightedSuitabilityScore,
} from './locationSuitability.js';

describe('location suitability scoring', () => {
  test('keeps the weighted score within 0–100', () => {
    expect(weightedSuitabilityScore({
      policy_compliance: 200, land_use_compatibility: 100, population_need: 100,
      infrastructure_gap: 100, accessibility: 100, existing_coverage_gap: 100,
      future_demand: 100, road_connectivity: 100, urban_health_impact: 100,
      spatial_constraints: 100,
    })).toBe(100);
  });

  test('classifies warnings and blocking failures', () => {
    expect(suitabilityStatus(75)).toBe('SUITABLE');
    expect(suitabilityStatus(60)).toBe('WARNING');
    expect(suitabilityStatus(90, true)).toBe('NOT_RECOMMENDED');
  });

  test('evaluates land-use compatibility explicitly', () => {
    expect(landUseCompatibility('SCHOOL', 'residential').status).toBe('PASS');
    expect(landUseCompatibility('SCHOOL', 'commercial').status).toBe('WARNING');
    expect(landUseCompatibility('SCHOOL', null).status).toBe('UNVERIFIED');
  });
});
