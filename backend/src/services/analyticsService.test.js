import { calculateCityAnalysis, calculateWardAnalysis } from './analyticsService.js';

const ward = {
  id: 1, name: 'Test Ward', population: 50000, hospitals: 5, schools: 10, parks: 3,
  good_road_percent: 75, air_quality_index: 100, green_cover_percent: 20,
  water_quality_index: 80,
};

describe('urban analytics', () => {
  test('produces bounded and explainable ward scores', () => {
    const result = calculateWardAnalysis(ward);
    expect(result.healthScore).toBeGreaterThanOrEqual(0);
    expect(result.healthScore).toBeLessThanOrEqual(100);
    expect(result.gaps).toHaveLength(4);
    expect(result.dimensions).toHaveProperty('healthcare');
  });

  test('weights the city score by ward population', () => {
    const result = calculateCityAnalysis([ward, { ...ward, id: 2, population: 100000, hospitals: 0 }]);
    expect(result.population).toBe(150000);
    expect(result.wards).toHaveLength(2);
    expect(result.overallScore).toBeLessThan(result.wards[0].healthScore);
  });
});

