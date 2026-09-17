import { describe, expect, test } from '@jest/globals';
import { calculateDevelopmentFeasibility } from './developmentFeasibility.js';

const project = {
  id: 17, project_type: 'NEW_DEVELOPMENT', expected_population: 8500,
  expected_households: 1700, target_density: 455, planning_horizon: 20,
  area: {
    area_acres: 18.7,
    boundary_geojson: { type: 'Polygon', coordinates: [[[90.4, 23.8], [90.41, 23.8], [90.41, 23.81], [90.4, 23.8]]] },
  },
};

describe('development feasibility calculation', () => {
  test('produces a deterministic readiness score from disclosed evidence', () => {
    const input = {
      project,
      features: [
        { feature_type: 'BLOCK' }, { feature_type: 'PRIMARY_ROAD' },
        { feature_type: 'RESIDENTIAL_ZONE' }, { feature_type: 'COMMUNITY_FACILITY' },
      ],
      gapAnalysis: {
        overview: { overall_gap_percent: 20 },
        categories: [{ key: 'ROAD', coverage_percent: 82, gap_percent: 18 }],
        priority_areas: [{ category: 'Healthcare', gap_percent: 35, missing: 2, unit: 'facilities', confidence: { required_supply: 'ESTIMATED' } }],
        block_analysis: { summary: { block_count: 1, score: 74 } },
      },
      riskDetection: { overall_risk_score: 30, overall_risk_level: 'MODERATE', unavailable_risks: [] },
    };
    const first = calculateDevelopmentFeasibility(input);
    const second = calculateDevelopmentFeasibility(input);
    expect(first).toEqual(second);
    expect(first.planning_readiness.score).toBe(91);
    expect(first.planning_readiness.band).toBe('READY_FOR_DETAILED_STUDY');
    expect(first.site_overview.planning_population).toEqual(expect.objectContaining({ value: 8500, data_type: 'PLANNER_DEFINED' }));
    expect(first.site_overview.population_capacity).toEqual(expect.objectContaining({ value: 8509, data_type: 'PLANNER_DEFINED_DERIVATION' }));
    expect(first.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'POSITIVE', title: expect.stringMatching(/Road coverage/) }),
      expect.objectContaining({ type: 'WARNING', title: expect.stringMatching(/Healthcare/) }),
    ]));
  });

  test('does not invent population or unsupported risk evidence', () => {
    const result = calculateDevelopmentFeasibility({
      project: { id: 19, project_type: 'NEW_DEVELOPMENT', planning_horizon: 0 },
    });
    expect(result.site_overview.planning_population).toEqual(expect.objectContaining({
      value: null, data_type: 'DATA_UNAVAILABLE',
    }));
    expect(result.site_overview.population_capacity).toEqual(expect.objectContaining({
      value: null, data_type: 'DATA_UNAVAILABLE',
    }));
    expect(result.site_overview.risk_level).toBe('DATA_UNAVAILABLE');
    expect(result.planning_readiness.factors).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'INFRASTRUCTURE', status: 'DATA_UNAVAILABLE' }),
      expect.objectContaining({ key: 'RISK_SCREENING', status: 'DATA_UNAVAILABLE' }),
    ]));
    expect(result.decision_notice).toMatch(/does not establish legal approval/i);
  });
});
