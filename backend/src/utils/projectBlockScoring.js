import { polygonMetrics } from './projectGeometry.js';
import { pointInsideBoundary } from './projectRecommendationContext.js';

export const BLOCK_HEALTH_WEIGHTS = Object.freeze({
  healthcare: 0.16, education: 0.15, mobility: 0.16, environment: 0.13,
  green_space: 0.12, infrastructure: 0.16, accessibility: 0.12,
});

const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const scoreCategory = (score) => score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Moderate' : score >= 30 ? 'Poor' : 'Critical';

function featureTouchesBlock(feature, boundary) {
  const coordinates = feature.geometry.type === 'Point'
    ? [feature.geometry.coordinates]
    : feature.geometry.type === 'LineString'
      ? feature.geometry.coordinates
      : feature.geometry.coordinates[0];
  if (coordinates.some(([longitude, latitude]) => pointInsideBoundary({ longitude, latitude }, boundary))) return true;
  if (feature.geometry.type !== 'LineString') return false;
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const [startLongitude, startLatitude] = coordinates[index];
    const [endLongitude, endLatitude] = coordinates[index + 1];
    for (let step = 1; step < 20; step += 1) {
      const ratio = step / 20;
      if (pointInsideBoundary({
        longitude: startLongitude + (endLongitude - startLongitude) * ratio,
        latitude: startLatitude + (endLatitude - startLatitude) * ratio,
      }, boundary)) return true;
    }
  }
  return false;
}

function coverageScore(actual, required) {
  if (required <= 0) return 100;
  return clamp(actual / required * 100);
}

const isImplemented = (feature) => feature.status === undefined
  || ['approved', 'completed'].includes(String(feature.status).toLowerCase());

export function calculateBlockAnalyses({ project, features }) {
  const blocks = features.filter(({ feature_type: type }) => type === 'BLOCK');
  if (!blocks.length) return [];
  const totalPopulation = Number(project.current_population || project.expected_population || 0);
  const blockAreas = blocks.map((block) => polygonMetrics(block.geometry).areaAcres);
  const totalBlockArea = blockAreas.reduce((sum, area) => sum + area, 0) || 1;

  return blocks.map((block, index) => {
    const boundary = block.geometry;
    const areaAcres = blockAreas[index];
    const explicitPopulation = Number(block.properties?.population);
    const population = explicitPopulation > 0
      ? explicitPopulation
      : Math.round(totalPopulation * areaAcres / totalBlockArea);
    const households = Number(block.properties?.households) || Math.round(population / 4.7);
    // Blocks remain analysis units while only approved/implemented assets
    // contribute service, road and infrastructure coverage.
    const related = features.filter((feature) => (
      feature.id !== block.id && isImplemented(feature) && featureTouchesBlock(feature, boundary)
    ));
    const facilityTypes = related.filter(({ geometry }) => geometry.type === 'Point').map(({ category }) => String(category ?? '').toLowerCase());
    const roadTypes = related.filter(({ feature_type: type }) => ['PRIMARY_ROAD', 'SECONDARY_ROAD', 'LOCAL_ROAD', 'ROAD_PROPOSAL'].includes(type));
    const roadValue = Math.max(0, ...roadTypes.map(({ feature_type: type }) => ({ PRIMARY_ROAD: 100, SECONDARY_ROAD: 78, LOCAL_ROAD: 58, ROAD_PROPOSAL: 45 }[type] ?? 0)));
    const hospitals = facilityTypes.filter((type) => ['hospital', 'clinic', 'healthcare'].includes(type)).length;
    const schools = facilityTypes.filter((type) => ['school', 'education'].includes(type)).length;
    const parks = facilityTypes.filter((type) => ['park', 'recreation'].includes(type)).length;
    const greenAssumption = Number(block.properties?.greenSpacePercent || 0);
    const utilityCoverage = clamp(block.properties?.utilityCoverage ?? 55);
    const drainage = related.some(({ feature_type: type }) => type === 'DRAINAGE_CORRIDOR') ? 85 : 45;
    const gateAccess = related.some(({ feature_type: type }) => ['MAIN_GATE', 'SECONDARY_GATE'].includes(type)) ? 100 : 55;
    const components = {
      healthcare: coverageScore(hospitals, Math.max(1, Math.ceil(population / 20_000))),
      education: coverageScore(schools, Math.max(1, Math.ceil(population / 8_000))),
      mobility: roadValue,
      environment: clamp(drainage * 0.55 + Math.min(100, greenAssumption * 5) * 0.45),
      green_space: clamp(Math.max(coverageScore(parks, Math.max(1, Math.ceil(population / 12_000))), greenAssumption * 5)),
      infrastructure: clamp(roadValue * 0.55 + utilityCoverage * 0.45),
      accessibility: clamp(roadValue * 0.75 + gateAccess * 0.25),
    };
    const contributions = Object.fromEntries(Object.entries(BLOCK_HEALTH_WEIGHTS).map(([key, weight]) => (
      [key, Number((components[key] * weight).toFixed(2))]
    )));
    const rawScore = clamp(Object.values(contributions).reduce((sum, value) => sum + value, 0));
    const constraintLevel = String(block.properties?.constraintLevel ?? 'UNASSESSED').toUpperCase();
    const constraintPenalty = ({ HIGH: 8, CRITICAL: 15 })[constraintLevel] ?? 0;
    const requiredEvidence = ['greenSpacePercent', 'utilityCoverage', 'landSuitability', 'constraintLevel'];
    const missingFields = requiredEvidence.filter((field) => block.properties?.[field] === undefined);
    const missingDataPenalty = Math.min(8, missingFields.length * 2);
    const penalties = { constraint: constraintPenalty, missing_data: missingDataPenalty };
    const score = clamp(rawScore - constraintPenalty - missingDataPenalty);
    const gaps = Object.entries(components).filter(([, value]) => value < 65).map(([category, value]) => ({
      category, score: value, gap_score: 100 - value, priority: value < 30 ? 'CRITICAL' : value < 50 ? 'HIGH' : 'MEDIUM',
    }));
    const populationConfidence = block.properties?.populationConfidence
      ?? (explicitPopulation > 0 ? 'PLANNING_ASSUMPTION' : 'ESTIMATED');
    return {
      block: { id: block.id, name: block.name, geometry: block.geometry, land_use: block.properties?.landUse ?? block.category, phase: block.properties?.phase ?? null },
      population, households, population_confidence: populationConfidence,
      area_acres: areaAcres, population_density_per_acre: Number((population / Math.max(areaAcres, 0.01)).toFixed(1)),
      facilities: { hospitals, schools, parks }, roads: roadTypes.map(({ id, name, feature_type }) => ({ id, name, type: feature_type })),
      planning_evidence: {
        green_space_percent: greenAssumption,
        utility_coverage: utilityCoverage,
        land_suitability: clamp(block.properties?.landSuitability ?? 70),
        constraint_level: constraintLevel,
        constraint_note: block.properties?.constraintNote ?? null,
      },
      score_details: { raw_score: rawScore, contributions, penalties, missing_fields: missingFields },
      vulnerability_score: clamp((100 - score) * 0.6 + Math.min(100, population / Math.max(areaAcres, 0.01) / 3) * 0.4),
      components, score, category: scoreCategory(score), gaps,
    };
  }).sort((first, second) => second.score - first.score || first.block.name.localeCompare(second.block.name))
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function summarizeProjectBlockHealth(analyses) {
  const population = analyses.reduce((sum, item) => sum + item.population, 0);
  const score = population
    ? clamp(analyses.reduce((sum, item) => sum + item.score * item.population, 0) / population)
    : 0;
  return { score, category: scoreCategory(score), population, block_count: analyses.length, weights: BLOCK_HEALTH_WEIGHTS };
}
