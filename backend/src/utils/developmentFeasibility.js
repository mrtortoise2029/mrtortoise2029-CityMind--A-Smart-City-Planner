const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const ZONE_TYPES = new Set([
  'RESIDENTIAL_ZONE', 'COMMERCIAL_ZONE', 'EDUCATION_ZONE', 'HEALTHCARE_ZONE',
  'GREEN_ZONE', 'RECREATION_ZONE', 'UTILITY_ZONE', 'FUTURE_DEVELOPMENT_AREA',
]);
const ROAD_TYPES = new Set(['PRIMARY_ROAD', 'SECONDARY_ROAD', 'LOCAL_ROAD', 'ROAD_PROPOSAL']);
const FACILITY_TYPES = new Set(['FACILITY_PROPOSAL', 'COMMUNITY_FACILITY']);

function readinessBand(score) {
  if (score >= 80) return 'READY_FOR_DETAILED_STUDY';
  if (score >= 65) return 'PROMISING_FOR_FURTHER_INVESTIGATION';
  if (score >= 50) return 'PRELIMINARY_REVIEW_REQUIRED';
  return 'INSUFFICIENT_READINESS';
}

function populationFor(project) {
  const observed = Number(project.current_population || 0);
  const planned = Number(project.expected_population || 0);
  return {
    value: observed || planned || null,
    data_type: observed ? 'OBSERVED' : planned ? 'PLANNER_DEFINED' : 'DATA_UNAVAILABLE',
    note: observed
      ? 'Current population saved in the project brief.'
      : planned
        ? 'Expected population defined by the planner; this is not a calculated land-capacity limit.'
        : 'Population input is unavailable.',
  };
}

function populationCapacityFor(project, area) {
  const targetDensity = Number(project.target_density || 0);
  const expected = Number(project.expected_population || 0);
  if (area > 0 && targetDensity > 0) return {
    value: Math.round(area * targetDensity),
    data_type: 'PLANNER_DEFINED_DERIVATION',
    note: `Indicative capacity derived from ${area.toLocaleString()} acres × ${targetDensity.toLocaleString()} people per acre.`,
  };
  return {
    value: expected || null,
    data_type: expected ? 'PLANNER_DEFINED_TARGET' : 'DATA_UNAVAILABLE',
    note: expected
      ? 'Expected population supplied in the project brief; no independent density-based capacity has been calculated.'
      : 'Expected population or a target density is required for an indicative capacity.',
  };
}

export function calculateDevelopmentFeasibility({ project, features = [], gapAnalysis = null, riskDetection = null }) {
  const boundaryReady = Boolean(project.area?.boundary_geojson?.coordinates?.[0]?.length >= 4);
  const area = Number(project.area?.area_acres || project.area_acres || 0);
  const planningPopulation = populationFor(project);
  const populationCapacity = populationCapacityFor(project, area);
  const counts = {
    blocks: features.filter(({ feature_type: type }) => type === 'BLOCK').length,
    roads: features.filter(({ feature_type: type }) => ROAD_TYPES.has(type)).length,
    zones: features.filter(({ feature_type: type }) => ZONE_TYPES.has(type)).length,
    facilities: features.filter(({ feature_type: type }) => FACILITY_TYPES.has(type)).length,
  };
  const relevantPopulationFields = project.project_type === 'EXISTING_AREA'
    ? [project.current_population, project.current_households, project.current_density]
    : [project.expected_population, project.expected_households, project.target_density];
  const completeInputs = [...relevantPopulationFields, project.planning_horizon]
    .filter((value) => Number(value) > 0).length;
  const factors = [
    {
      key: 'SPATIAL_CONTEXT', label: 'Site definition', weight: 0.20,
      score: boundaryReady && area > 0 ? 100 : boundaryReady || area > 0 ? 50 : 0,
      evidence: boundaryReady && area > 0 ? 'Boundary and measured project area are available.' : 'A valid boundary and area are required.',
    },
    {
      key: 'PROJECT_INPUTS', label: 'Project data completeness', weight: 0.20,
      score: clamp((completeInputs / 4) * 100),
      evidence: `${completeInputs} of 4 core planning inputs are available.`,
    },
    {
      key: 'MASTER_PLAN', label: 'Master-plan definition', weight: 0.20,
      score: clamp(Math.min(counts.blocks, 1) * 35 + Math.min(counts.roads, 1) * 30
        + Math.min(counts.zones, 1) * 20 + Math.min(counts.facilities, 1) * 15),
      evidence: `${counts.blocks} blocks, ${counts.roads} roads, ${counts.zones} zones, and ${counts.facilities} facilities saved.`,
    },
    {
      key: 'INFRASTRUCTURE', label: 'Infrastructure coverage', weight: 0.25,
      score: gapAnalysis?.overview?.overall_gap_percent == null
        ? null : clamp(100 - gapAnalysis.overview.overall_gap_percent),
      evidence: gapAnalysis?.overview?.overall_gap_percent == null
        ? 'Gap analysis is unavailable.' : `${gapAnalysis.overview.overall_gap_percent}% weighted infrastructure gap.`,
    },
    {
      key: 'RISK_SCREENING', label: 'Available-evidence resilience', weight: 0.15,
      score: riskDetection?.overall_risk_score == null
        ? null : clamp(100 - riskDetection.overall_risk_score),
      evidence: riskDetection?.overall_risk_score == null
        ? 'No supported risk score is available.' : `${riskDetection.overall_risk_score}/100 risk from supported screening categories.`,
    },
  ];
  const supported = factors.filter(({ score }) => score != null);
  const supportedWeight = supported.reduce((sum, factor) => sum + factor.weight, 0);
  const score = supportedWeight
    ? clamp(supported.reduce((sum, factor) => sum + factor.score * factor.weight, 0) / supportedWeight)
    : null;
  const findings = [];
  if (boundaryReady && area > 0) findings.push({ type: 'POSITIVE', title: 'Site boundary is ready for analysis', detail: `${area.toLocaleString()} acres are defined by the saved project geometry.`, source: 'Project geometry', confidence: 'MEASURED' });
  const roadGap = gapAnalysis?.categories?.find(({ key }) => key === 'ROAD');
  if (roadGap && roadGap.gap_percent < 25) findings.push({ type: 'POSITIVE', title: 'Road coverage meets the current planning benchmark', detail: `${roadGap.coverage_percent}% calculated coverage.`, source: 'Project gap analysis', confidence: 'ESTIMATED' });
  (gapAnalysis?.priority_areas ?? []).filter(({ gap_percent }) => gap_percent >= 25).slice(0, 4).forEach((item) => {
    findings.push({ type: 'WARNING', title: `${item.category} requires investigation`, detail: `${item.gap_percent}% calculated gap; ${item.missing} ${item.unit} missing under the current benchmark.`, source: 'Project gap analysis', confidence: item.confidence?.required_supply ?? 'ESTIMATED' });
  });
  const unavailableRisks = riskDetection?.unavailable_risks ?? [];
  if (unavailableRisks.length) findings.push({ type: 'UNAVAILABLE', title: 'Additional hazard evidence is required', detail: `${unavailableRisks.map(({ risk_type: type }) => type.replaceAll('_', ' ').toLowerCase()).join(', ')} data is unavailable.`, source: 'Dataset availability audit', confidence: 'DATA_UNAVAILABLE' });
  if (!counts.blocks || !counts.roads) findings.push({ type: 'WARNING', title: 'Master plan needs further definition', detail: 'Add project blocks and road alignments before detailed feasibility review.', source: 'Saved project features', confidence: 'MEASURED' });

  return {
    project_id: project.id,
    assessment_type: 'PRELIMINARY_DEVELOPMENT_FEASIBILITY',
    site_overview: {
      area_acres: area || null,
      project_type: project.project_type,
      planning_horizon: Number(project.planning_horizon),
      planning_population: planningPopulation,
      population_capacity: populationCapacity,
      infrastructure_gap_percent: gapAnalysis?.overview?.overall_gap_percent ?? null,
      urban_health_score: gapAnalysis?.block_analysis?.summary?.block_count
        ? gapAnalysis.block_analysis.summary.score : project.health_score ?? null,
      risk_level: riskDetection?.overall_risk_level ?? 'DATA_UNAVAILABLE',
    },
    planning_readiness: {
      score,
      band: score == null ? 'DATA_UNAVAILABLE' : readinessBand(score),
      factors: factors.map((factor) => ({ ...factor, status: factor.score == null ? 'DATA_UNAVAILABLE' : 'CALCULATED' })),
      methodology: 'Weighted supported evidence: site definition 20%, project inputs 20%, master plan 20%, infrastructure coverage 25%, available-evidence resilience 15%. Unavailable factors are excluded and disclosed.',
    },
    feature_counts: counts,
    findings,
    decision_notice: 'Preliminary decision-support assessment only. It does not establish legal approval, regulatory compliance, engineering feasibility, land value, or guaranteed development permission. Professional and regulatory verification is required.',
  };
}
