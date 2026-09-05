export const SCORING_BENCHMARKS = Object.freeze({
  hospitalsPer10k: 1.2,
  hospitalCapacityPer10k: 25,
  schoolsPer10k: 2.5,
  schoolCapacityPer10k: 1500,
  roadKmPerSqKm: 4,
  greenCoverPercent: 25,
  parksPer10k: 0.8,
  populationDensityHigh: 12000,
  wardPopulationHigh: 100000,
  annualGrowthHigh: 5,
});

export const HEALTHCARE_WEIGHT = 0.20;
export const EDUCATION_WEIGHT = 0.18;
export const MOBILITY_WEIGHT = 0.18;
export const ENVIRONMENT_WEIGHT = 0.18;
export const GREEN_SPACE_WEIGHT = 0.12;
export const INFRASTRUCTURE_WEIGHT = 0.14;

export const URBAN_HEALTH_WEIGHTS = Object.freeze({
  healthcare: HEALTHCARE_WEIGHT,
  education: EDUCATION_WEIGHT,
  mobility: MOBILITY_WEIGHT,
  environment: ENVIRONMENT_WEIGHT,
  green_space: GREEN_SPACE_WEIGHT,
  infrastructure: INFRASTRUCTURE_WEIGHT,
});

const clamp = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : 0;
};
const numeric = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const hasValue = (value) => value !== null && value !== undefined && value !== '';
const attainment = (actual, target) => clamp((numeric(actual) / target) * 100);
const per10k = (value, population) => population > 0 ? (numeric(value) / population) * 10000 : 0;

function aqiScore(aqi) {
  if (!hasValue(aqi)) return 0;
  return clamp(((250 - numeric(aqi)) / 200) * 100);
}

function noiseScore(noiseLevel) {
  if (!hasValue(noiseLevel)) return 0;
  return clamp(((90 - numeric(noiseLevel)) / 45) * 100);
}

function priorityFromScore(priorityScore) {
  if (priorityScore >= 70) return 'CRITICAL';
  if (priorityScore >= 50) return 'HIGH';
  if (priorityScore >= 30) return 'MEDIUM';
  return 'LOW';
}

/**
 * Weighted mean of six normalized components. Dividing by the configured
 * weight total keeps the result valid if planners later rebalance the weights.
 */
export function calculateUrbanHealthScore(components, weights = URBAN_HEALTH_WEIGHTS) {
  const componentScores = {
    healthcare: clamp(components.healthcare_score ?? components.healthcare),
    education: clamp(components.education_score ?? components.education),
    mobility: clamp(components.mobility_score ?? components.mobility),
    environment: clamp(components.environment_score ?? components.environment),
    green_space: clamp(components.green_space_score ?? components.green_space),
    infrastructure: clamp(components.infrastructure_score ?? components.infrastructure),
  };
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + Math.max(0, numeric(weight)), 0);
  if (!totalWeight) return 0;
  return clamp(Object.entries(componentScores).reduce(
    (sum, [key, score]) => sum + score * Math.max(0, numeric(weights[key])), 0,
  ) / totalWeight);
}

export function getUrbanHealthCategory(score) {
  const normalized = clamp(score);
  if (normalized >= 80) return 'Excellent';
  if (normalized >= 65) return 'Good';
  if (normalized >= 50) return 'Moderate';
  if (normalized >= 30) return 'Poor';
  return 'Critical';
}

/**
 * Deterministic scoring model (all results are clamped to 0–100):
 * - Healthcare: hospital rate 45%, capacity rate 45%, road access proxy 10%.
 * - Education: school rate 50%, seat capacity rate 40%, road access proxy 10%.
 * - Mobility: road density 35%, average condition 40%, congestion performance 25%.
 * - Environment: AQI performance 45%, water quality 30%, noise performance 25%.
 * - Green space: green-cover attainment 70%, park rate 30%.
 * - Infrastructure: presence of five essential systems 30%, average service performance 70%.
 * - Urban health: healthcare 20%, education 18%, mobility 18%, environment 18%,
 *   green space 12%, infrastructure 14%.
 * - Infrastructure gap: 100 minus weighted healthcare/education/mobility/green/infrastructure coverage.
 * - Population need: density pressure 55%, absolute population 30%, annual growth 15%.
 * - Priority need: infrastructure gap 55%, population need 35%, environmental deficit 10%.
 *
 * Benchmarks are centralized above so they can be reviewed and changed without altering formulas.
 * Missing measurements score zero and are reported in data_quality rather than silently imputed.
 */
export function calculateUrbanGapScores(input) {
  const population = numeric(input.population);
  const areaSqKm = numeric(input.area_sq_km);
  const density = hasValue(input.population_density)
    ? numeric(input.population_density)
    : areaSqKm > 0 ? population / areaSqKm : 0;
  const hospitals = numeric(input.hospitals);
  const schools = numeric(input.schools);
  const parks = numeric(input.parks);
  const hospitalCapacity = numeric(input.hospital_capacity);
  const schoolCapacity = numeric(input.school_capacity);
  const roadLength = numeric(input.road_length_km);
  const roadDensity = areaSqKm > 0 ? roadLength / areaSqKm : 0;
  const conditionScore = clamp((numeric(input.average_road_condition) / 5) * 100);
  const congestionScore = clamp(input.congestion_score);

  const hospitalRate = per10k(hospitals, population);
  const hospitalCapacityRate = per10k(hospitalCapacity, population);
  const schoolRate = per10k(schools, population);
  const schoolCapacityRate = per10k(schoolCapacity, population);
  const parkRate = per10k(parks, population);
  const roadAccessProxy = attainment(roadDensity, SCORING_BENCHMARKS.roadKmPerSqKm);

  const healthcareScore = clamp(
    attainment(hospitalRate, SCORING_BENCHMARKS.hospitalsPer10k) * 0.45
    + attainment(hospitalCapacityRate, SCORING_BENCHMARKS.hospitalCapacityPer10k) * 0.45
    + roadAccessProxy * 0.1,
  );
  const educationScore = clamp(
    attainment(schoolRate, SCORING_BENCHMARKS.schoolsPer10k) * 0.5
    + attainment(schoolCapacityRate, SCORING_BENCHMARKS.schoolCapacityPer10k) * 0.4
    + roadAccessProxy * 0.1,
  );
  const mobilityScore = clamp(
    roadAccessProxy * 0.35 + conditionScore * 0.4 + congestionScore * 0.25,
  );
  const environmentScore = clamp(
    aqiScore(input.air_quality_index) * 0.45
    + clamp(input.water_quality_index) * 0.3
    + noiseScore(input.noise_level_db) * 0.25,
  );
  const greenSpaceScore = clamp(
    attainment(input.green_cover_percent, SCORING_BENCHMARKS.greenCoverPercent) * 0.7
    + attainment(parkRate, SCORING_BENCHMARKS.parksPer10k) * 0.3,
  );

  const systemPresence = [hospitals, schools, parks, roadLength, hasValue(input.air_quality_index) ? 1 : 0]
    .filter((value) => numeric(value) > 0).length / 5 * 100;
  const infrastructureScore = clamp(
    systemPresence * 0.3
    + ((healthcareScore + educationScore + mobilityScore + environmentScore + greenSpaceScore) / 5) * 0.7,
  );
  const urbanHealthScore = calculateUrbanHealthScore({
    healthcare_score: healthcareScore,
    education_score: educationScore,
    mobility_score: mobilityScore,
    environment_score: environmentScore,
    green_space_score: greenSpaceScore,
    infrastructure_score: infrastructureScore,
  });
  const infrastructureGapScore = clamp(100 - (
    healthcareScore * 0.25 + educationScore * 0.2 + mobilityScore * 0.25
    + greenSpaceScore * 0.15 + infrastructureScore * 0.15
  ));
  const populationNeedScore = clamp(
    attainment(density, SCORING_BENCHMARKS.populationDensityHigh) * 0.55
    + attainment(population, SCORING_BENCHMARKS.wardPopulationHigh) * 0.3
    + attainment(input.growth_rate, SCORING_BENCHMARKS.annualGrowthHigh) * 0.15,
  );
  const priorityScore = clamp(
    infrastructureGapScore * 0.55 + populationNeedScore * 0.35 + (100 - environmentScore) * 0.1,
  );

  const dimensions = {
    healthcare_score: healthcareScore,
    education_score: educationScore,
    mobility_score: mobilityScore,
    environment_score: environmentScore,
    green_space_score: greenSpaceScore,
    infrastructure_score: infrastructureScore,
  };
  const labels = {
    healthcare_score: 'Healthcare availability',
    education_score: 'Education availability',
    mobility_score: 'Road accessibility',
    environment_score: 'Environmental quality',
    green_space_score: 'Park and green-space access',
    infrastructure_score: 'Infrastructure coverage',
  };
  const reasons = Object.entries(dimensions)
    .sort(([, scoreA], [, scoreB]) => scoreA - scoreB)
    .slice(0, 3)
    .map(([key, score]) => `${labels[key]} is ${score}/100 and is one of the ward's weakest measured dimensions.`);
  if (populationNeedScore >= 60) {
    reasons.push(`Population pressure is ${populationNeedScore}/100 based on density, total population, and recorded growth.`);
  }

  const missingFields = [
    'hospital_capacity', 'school_capacity', 'average_road_condition', 'congestion_score',
    'air_quality_index', 'water_quality_index', 'noise_level_db', 'green_cover_percent',
  ].filter((field) => !hasValue(input[field]));

  return {
    ...dimensions,
    urban_health_score: urbanHealthScore,
    health_category: getUrbanHealthCategory(urbanHealthScore),
    health_weights: URBAN_HEALTH_WEIGHTS,
    infrastructure_gap_score: infrastructureGapScore,
    population_need_score: populationNeedScore,
    priority_score: priorityScore,
    overall_priority: priorityFromScore(priorityScore),
    reasons,
    evidence: {
      population,
      population_density: Math.round(density),
      growth_rate: numeric(input.growth_rate),
      hospitals,
      hospital_capacity: hospitalCapacity,
      schools,
      school_capacity: schoolCapacity,
      parks,
      road_length_km: roadLength,
      road_density: Math.round(roadDensity * 100) / 100,
      average_road_condition: numeric(input.average_road_condition),
      congestion_score: congestionScore,
      air_quality_index: hasValue(input.air_quality_index) ? numeric(input.air_quality_index) : null,
      green_cover_percent: hasValue(input.green_cover_percent) ? numeric(input.green_cover_percent) : null,
    },
    benchmarks: SCORING_BENCHMARKS,
    data_quality: {
      completeness_percent: clamp(((8 - missingFields.length) / 8) * 100),
      missing_fields: missingFields,
    },
  };
}
