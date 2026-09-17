import { describe, expect, test } from '@jest/globals';
import { detectRisksFromGapAnalysis } from './riskDetection.js';

describe('detectRisksFromGapAnalysis', () => {
  test('uses documented gap scores and severity thresholds', () => {
    const result = detectRisksFromGapAnalysis({
      categories: [{
        key: 'HOSPITAL', category: 'Healthcare', gap_percent: 78,
        required: 5, effective_supply: 1, missing: 4, unit: 'hospitals', service_radius_km: 3,
        confidence: { existing_supply: 'MEASURED' },
      }],
      critical_areas: [{
        id: 'health-a', category: 'Healthcare', site: 'North sector',
        coordinates: { latitude: 23.8, longitude: 90.4 }, reason: 'Nearest service exceeds radius.', confidence: 'ESTIMATED',
      }],
    });
    expect(result.overall_risk_level).toBe('CRITICAL');
    expect(result.risks[0]).toMatchObject({ score: 78, severity: 'CRITICAL', risk_type: 'HEALTHCARE_COVERAGE' });
    expect(result.risks[0].location[0].label).toBe('North sector');
  });

  test('does not fabricate unsupported hazard categories', () => {
    const result = detectRisksFromGapAnalysis({ categories: [], critical_areas: [] });
    expect(result.overall_risk_level).toBe('DATA_UNAVAILABLE');
    expect(result.unavailable_risks.map(({ risk_type }) => risk_type)).toContain('FLOOD_WATERLOGGING');
    expect(result.risks).toEqual([]);
  });
});
