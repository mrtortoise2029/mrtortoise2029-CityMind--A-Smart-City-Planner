import { describe, expect, test } from '@jest/globals';
import { calculateBlockAnalyses, summarizeProjectBlockHealth } from './projectBlockScoring.js';

const block = { id: 1, feature_type: 'BLOCK', name: 'Block A', category: 'residential', status: 'approved', geometry: { type: 'Polygon', coordinates: [[[90.4,23.78],[90.41,23.78],[90.41,23.79],[90.4,23.79],[90.4,23.78]]] }, properties: { population: 10000, households: 2200, greenSpacePercent: 10, utilityCoverage: 80, landSuitability: 75, constraintLevel: 'LOW' } };
const facility = { id: 2, feature_type: 'FACILITY_PROPOSAL', category: 'hospital', name: 'Clinic', status: 'approved', geometry: { type: 'Point', coordinates: [90.405,23.785] }, properties: {} };
const road = { id: 3, feature_type: 'PRIMARY_ROAD', category: 'primary', name: 'Avenue', status: 'approved', geometry: { type: 'LineString', coordinates: [[90.401,23.785],[90.409,23.785]] }, properties: {} };

describe('project block urban health scoring', () => {
  test('uses implemented spatial assets and seven transparent dimensions', () => {
    const [analysis] = calculateBlockAnalyses({ project: { expected_population: 10000 }, features: [block, facility, road] });
    expect(analysis.population).toBe(10000); expect(analysis.facilities.hospitals).toBe(1);
    expect(Object.keys(analysis.components)).toEqual(['healthcare','education','mobility','environment','green_space','infrastructure','accessibility']);
    expect(analysis.score).toBeGreaterThan(0); expect(analysis.score_details.contributions).toBeDefined();
  });
  test('excludes unimplemented proposals from current score', () => {
    const [current] = calculateBlockAnalyses({ project: { expected_population: 10000 }, features: [block, { ...facility, status: 'proposed' }] });
    const [implemented] = calculateBlockAnalyses({ project: { expected_population: 10000 }, features: [block, facility] });
    expect(current.components.healthcare).toBe(0); expect(implemented.components.healthcare).toBe(100);
  });
  test('creates a population-weighted project score', () => {
    const analyses = calculateBlockAnalyses({ project: { expected_population: 10000 }, features: [block, facility, road] });
    const summary = summarizeProjectBlockHealth(analyses);
    expect(summary.block_count).toBe(1); expect(summary.population).toBe(10000); expect(summary.score).toBe(analyses[0].score);
  });
});
