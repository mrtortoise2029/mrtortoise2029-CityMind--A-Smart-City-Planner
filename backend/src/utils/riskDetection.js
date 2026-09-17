import { gapSeverity } from './projectGapScoring.js';

const RISK_CONFIG = Object.freeze({
  HOSPITAL: ['HEALTHCARE_COVERAGE', 'Insufficient healthcare coverage', 'Investigate service capacity and accessible candidate sites.'],
  SCHOOL: ['EDUCATION_COVERAGE', 'Insufficient education coverage', 'Investigate education capacity and safe access routes.'],
  PARK: ['GREEN_SPACE_DEFICIENCY', 'Green-space deficiency', 'Investigate accessible green-space opportunities.'],
  ROAD: ['ROAD_CONNECTIVITY', 'Road connectivity deficiency', 'Review network continuity, hierarchy, and access.'],
  DRAINAGE: ['DRAINAGE_DEFICIENCY', 'Drainage infrastructure deficiency', 'Commission drainage and waterlogging investigation before design decisions.'],
  UTILITY: ['UTILITY_DEFICIENCY', 'Utility service deficiency', 'Verify utility capacity with the relevant provider.'],
  EMERGENCY: ['EMERGENCY_ACCESS', 'Emergency-service access deficiency', 'Review emergency response coverage and access.'],
  COMMERCIAL: ['COMMERCIAL_ACCESS', 'Commercial-service access deficiency', 'Review mixed-use access as a planning option.'],
});

function riskSeverity(score) {
  const severity = gapSeverity(score);
  return severity === 'MODERATE' ? 'MEDIUM' : severity;
}

/** Risk score equals the documented deterministic category gap percentage. */
export function detectRisksFromGapAnalysis(gapAnalysis) {
  const categories = gapAnalysis?.categories ?? [];
  const risks = categories
    .filter((category) => category.gap_percent > 0 && RISK_CONFIG[category.key])
    .map((category) => {
      const [riskType, label, recommendation] = RISK_CONFIG[category.key];
      const locations = (gapAnalysis.critical_areas ?? [])
        .filter((area) => area.category === category.category)
        .map((area) => ({
          id: area.id,
          label: area.site,
          latitude: area.coordinates.latitude,
          longitude: area.coordinates.longitude,
          evidence: area.reason,
          confidence: area.confidence,
        }));
      return {
        risk_type: riskType,
        label,
        severity: riskSeverity(category.gap_percent),
        score: category.gap_percent,
        score_basis: 'Infrastructure/service gap percentage (100 minus calculated coverage).',
        location: locations.length ? locations : null,
        evidence: {
          required: category.required,
          effective_supply: category.effective_supply,
          missing: category.missing,
          unit: category.unit,
          service_radius_km: category.service_radius_km,
        },
        data_source: 'Project gap analysis using saved project geometry and linked CityMind context records',
        data_year: null,
        data_year_status: 'DATA_UNAVAILABLE',
        confidence: 'ESTIMATED',
        evidence_supply_confidence: category.confidence?.existing_supply ?? 'ESTIMATED',
        recommendations: [recommendation],
      };
    });
  const overallScore = risks.length
    ? Math.round(risks.reduce((sum, risk) => sum + risk.score, 0) / risks.length)
    : null;
  return {
    overall_risk_level: overallScore === null ? 'DATA_UNAVAILABLE' : riskSeverity(overallScore),
    overall_risk_score: overallScore,
    risks,
    unavailable_risks: [
      { risk_type: 'FLOOD_WATERLOGGING', status: 'DATA_UNAVAILABLE', reason: 'No verified project flood or waterlogging dataset is connected.' },
      { risk_type: 'POLLUTION_HOTSPOTS', status: 'DATA_UNAVAILABLE', reason: 'No verified project pollution-hotspot dataset is connected.' },
      { risk_type: 'TRAFFIC_BOTTLENECKS', status: 'DATA_UNAVAILABLE', reason: 'No verified project traffic-flow or bottleneck dataset is connected.' },
      { risk_type: 'ENVIRONMENTAL_HAZARDS', status: 'DATA_UNAVAILABLE', reason: 'No verified project hazard surface is connected.' },
    ],
    methodology: {
      model: 'deterministic-risk-1.0',
      overall_score: 'Arithmetic mean of available service-deficiency risk scores.',
      severity_thresholds: { LOW: '0–24', MEDIUM: '25–49', HIGH: '50–74', CRITICAL: '75–100' },
    },
  };
}
