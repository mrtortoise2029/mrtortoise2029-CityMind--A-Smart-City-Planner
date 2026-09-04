import { calculateUrbanGapScores, SCORING_BENCHMARKS } from '../utils/urbanScoring.js';

const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));
const rate = (count, population) => (population ? (Number(count || 0) / population) * 10000 : 0);

export function calculateWardAnalysis(ward) {
  const hospitalRate = rate(ward.hospitals, ward.population);
  const schoolRate = rate(ward.schools, ward.population);
  const score = calculateUrbanGapScores(ward);
  const dimensions = {
    healthcare: score.healthcare_score,
    education: score.education_score,
    mobility: score.mobility_score,
    environment: score.environment_score,
    liveability: clamp((score.green_space_score + score.infrastructure_score) / 2),
  };
  const healthScore = score.urban_health_score;

  const gaps = [
    { category: 'Healthcare', score: score.healthcare_score, actual: hospitalRate, target: SCORING_BENCHMARKS.hospitalsPer10k, unit: 'facilities / 10k' },
    { category: 'Education', score: score.education_score, actual: schoolRate, target: SCORING_BENCHMARKS.schoolsPer10k, unit: 'facilities / 10k' },
    { category: 'Mobility', score: score.mobility_score, actual: score.evidence.road_density, target: SCORING_BENCHMARKS.roadKmPerSqKm, unit: 'road km / km²' },
    { category: 'Green space', score: score.green_space_score, actual: Number(ward.green_cover_percent || 0), target: SCORING_BENCHMARKS.greenCoverPercent, unit: '% green cover' },
  ].map((gap) => ({ ...gap, severity: gap.score < 35 ? 'critical' : gap.score < 60 ? 'high' : gap.score < 80 ? 'moderate' : 'low' }));

  return { ...ward, dimensions, healthScore, gaps, analysis: score };
}

export function calculateCityAnalysis(wards) {
  const analyzedWards = wards.map(calculateWardAnalysis);
  const totalPopulation = analyzedWards.reduce((sum, ward) => sum + ward.population, 0);
  const weighted = (selector) => totalPopulation
    ? analyzedWards.reduce((sum, ward) => sum + selector(ward) * ward.population, 0) / totalPopulation
    : 0;
  const dimensions = Object.fromEntries(
    ['healthcare', 'education', 'mobility', 'environment', 'liveability']
      .map((key) => [key, clamp(weighted((ward) => ward.dimensions[key]))]),
  );

  return {
    overallScore: clamp(weighted((ward) => ward.healthScore)),
    dimensions,
    population: totalPopulation,
    wards: analyzedWards,
    benchmark: 70,
  };
}
