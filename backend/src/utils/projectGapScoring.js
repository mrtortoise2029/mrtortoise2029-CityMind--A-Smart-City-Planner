import { SCORING_BENCHMARKS } from './urbanScoring.js';
import {
  distanceKm, distanceToBoundaryKm, generateCandidateSites, pointInsideBoundary,
} from './projectRecommendationContext.js';

export const PROJECT_GAP_BENCHMARKS = Object.freeze({
  HOSPITAL: Object.freeze({
    label: 'Healthcare', unit: 'hospitals', per10k: SCORING_BENCHMARKS.hospitalsPer10k,
    capacityPer10k: SCORING_BENCHMARKS.hospitalCapacityPer10k, serviceRadiusKm: 3,
    facilityType: 'hospital', weight: 0.25,
  }),
  SCHOOL: Object.freeze({
    label: 'Education', unit: 'schools', per10k: SCORING_BENCHMARKS.schoolsPer10k,
    capacityPer10k: SCORING_BENCHMARKS.schoolCapacityPer10k, serviceRadiusKm: 1.5,
    facilityType: 'school', weight: 0.22,
  }),
  PARK: Object.freeze({
    label: 'Parks', unit: 'parks', per10k: SCORING_BENCHMARKS.parksPer10k,
    serviceRadiusKm: 1, facilityType: 'park', weight: 0.16,
  }),
  ROAD: Object.freeze({
    label: 'Road access', unit: 'road km', perSqKm: SCORING_BENCHMARKS.roadKmPerSqKm,
    serviceRadiusKm: 0.5, weight: 0.22,
  }),
  COMMERCIAL: Object.freeze({
    label: 'Commercial services', unit: 'facilities', peoplePerFacility: 15_000,
    serviceRadiusKm: 2, facilityType: 'commercial', weight: 0.15,
  }),
  EMERGENCY: Object.freeze({
    label: 'Emergency services', unit: 'facilities', peoplePerFacility: 40_000,
    serviceRadiusKm: 4, facilityType: 'fire_station', weight: 0.10,
  }),
  UTILITY: Object.freeze({
    label: 'Utility services', unit: 'facilities', peoplePerFacility: 30_000,
    serviceRadiusKm: 2.5, facilityType: 'utility', weight: 0.10,
  }),
  DRAINAGE: Object.freeze({
    label: 'Drainage network', unit: 'corridor km', perSqKm: 1,
    serviceRadiusKm: 0.5, lineType: 'DRAINAGE_CORRIDOR', weight: 0.12,
  }),
});

const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export function gapSeverity(gapPercent) {
  if (gapPercent >= 75) return 'CRITICAL';
  if (gapPercent >= 50) return 'HIGH';
  if (gapPercent >= 25) return 'MODERATE';
  return 'LOW';
}

function requiredSupply(config, population, areaSqKm) {
  if (config.perSqKm) return Number((areaSqKm * config.perSqKm).toFixed(2));
  if (config.peoplePerFacility) return Math.max(1, Math.ceil(population / config.peoplePerFacility));
  return Math.max(1, Math.ceil((population / 10_000) * config.per10k));
}

function requiredCapacity(config, population) {
  return config.capacityPer10k ? Math.ceil((population / 10_000) * config.capacityPer10k) : null;
}

function roadLengthInsideBoundary(roads, boundary) {
  let length = 0;
  for (const road of roads) {
    const geometry = road.geometry ?? [];
    for (let index = 0; index < geometry.length - 1; index += 1) {
      const start = { latitude: numeric(geometry[index][0]), longitude: numeric(geometry[index][1]) };
      const end = { latitude: numeric(geometry[index + 1][0]), longitude: numeric(geometry[index + 1][1]) };
      const midpoint = {
        latitude: (start.latitude + end.latitude) / 2,
        longitude: (start.longitude + end.longitude) / 2,
      };
      if (pointInsideBoundary(midpoint, boundary)) length += distanceKm(start, end);
    }
  }
  return Number(length.toFixed(2));
}

function roadDistance(site, roads) {
  const positions = roads.flatMap((road) => (road.geometry ?? []).map(([latitude, longitude]) => ({
    latitude: numeric(latitude), longitude: numeric(longitude),
  })));
  if (!positions.length) return null;
  return Math.min(...positions.map((position) => distanceKm(site, position)));
}

function facilityDistance(site, facilities) {
  if (!facilities.length) return null;
  return Math.min(...facilities.map((facility) => distanceKm(site, {
    latitude: numeric(facility.latitude), longitude: numeric(facility.longitude),
  })));
}

function categoryReport(key, config, context) {
  const { areaSqKm, benchmarkScale, boundary, facilities, population, roads, futurePopulation, projectType } = context;
  const categoryFacilities = config.facilityType
    ? facilities.filter((facility) => facility.type === config.facilityType)
    : [];
  const insideFacilities = categoryFacilities.filter((facility) => pointInsideBoundary({
    latitude: numeric(facility.latitude), longitude: numeric(facility.longitude),
  }, boundary));
  const surroundingFacilities = categoryFacilities.filter((facility) => {
    const point = { latitude: numeric(facility.latitude), longitude: numeric(facility.longitude) };
    return !pointInsideBoundary(point, boundary)
      && distanceToBoundaryKm(point, boundary) <= config.serviceRadiusKm;
  });

  const required = requiredSupply(config, population, areaSqKm) * benchmarkScale;
  const futureRequired = requiredSupply(config, futurePopulation, areaSqKm) * benchmarkScale;
  const categoryRoads = config.lineType ? roads.filter(({ feature_type: type }) => type === config.lineType) : roads;
  const existing = ['ROAD', 'DRAINAGE'].includes(key) ? roadLengthInsideBoundary(categoryRoads, boundary) : insideFacilities.length;
  // Surrounding assets contribute only partial capacity because their primary
  // catchment is outside the project. This is an explicit planning estimate.
  const surroundingContribution = ['ROAD', 'DRAINAGE'].includes(key) ? 0 : surroundingFacilities.length * 0.35;
  const effectiveSupply = existing + surroundingContribution;
  const coveragePercent = clamp(required ? (effectiveSupply / required) * 100 : 100);
  const gapPercent = clamp(100 - coveragePercent);
  const requiredCapacityValue = requiredCapacity(config, population);
  const existingCapacity = config.capacityPer10k
    ? insideFacilities.reduce((sum, facility) => sum + numeric(facility.capacity), 0)
      + surroundingFacilities.reduce((sum, facility) => sum + numeric(facility.capacity) * 0.35, 0)
    : null;
  const capacityGap = requiredCapacityValue === null
    ? null : Math.max(0, Math.ceil(requiredCapacityValue - existingCapacity));

  return {
    key,
    category: config.label,
    coverage_percent: coveragePercent,
    gap_percent: gapPercent,
    gap: gapSeverity(gapPercent),
    required: Number(required.toFixed?.(2) ?? required),
    existing_inside: Number(existing.toFixed?.(2) ?? existing),
    surrounding_available: surroundingFacilities.length,
    effective_supply: Number(effectiveSupply.toFixed(2)),
    missing: Number(Math.max(0, required - effectiveSupply).toFixed(2)),
    unit: config.unit,
    service_radius_km: config.serviceRadiusKm,
    capacity: requiredCapacityValue === null ? null : {
      required: requiredCapacityValue,
      available: Math.round(existingCapacity),
      gap: capacityGap,
      overloaded_facilities: capacityGap > 0 && insideFacilities.length ? insideFacilities.length : 0,
    },
    future: {
      required: Number(futureRequired.toFixed?.(2) ?? futureRequired),
      projected_gap: Number(Math.max(0, futureRequired - effectiveSupply).toFixed(2)),
      confidence: 'SIMULATED',
    },
    confidence: {
      existing_supply: 'MEASURED',
      required_supply: projectType === 'NEW_DEVELOPMENT' ? 'ESTIMATED' : 'ESTIMATED',
      future_gap: 'SIMULATED',
    },
  };
}

function criticalSiteFeatures(sites, categories, facilities, roads) {
  return sites.flatMap((site) => categories.flatMap((category) => {
    const config = PROJECT_GAP_BENCHMARKS[category.key];
    const matchingFacilities = config.facilityType
      ? facilities.filter((facility) => facility.type === config.facilityType) : [];
    const distance = ['ROAD', 'DRAINAGE'].includes(category.key)
      ? roadDistance(site, config.lineType ? roads.filter(({ feature_type: type }) => type === config.lineType) : roads)
      : facilityDistance(site, matchingFacilities);
    const outsideRadius = distance === null || distance > config.serviceRadiusKm;
    if (!outsideRadius || !['CRITICAL', 'HIGH'].includes(category.gap)) return [];
    return [{
      id: `${category.key}-${site.label}`,
      site: site.label,
      category: category.category,
      severity: category.gap,
      coordinates: { latitude: site.latitude, longitude: site.longitude },
      service_distance_km: distance === null ? null : Number(distance.toFixed(2)),
      service_radius_km: config.serviceRadiusKm,
      reason: distance === null
        ? `No mapped ${category.category.toLowerCase()} service is available.`
        : `Nearest service is ${distance.toFixed(1)} km away; benchmark radius is ${config.serviceRadiusKm} km.`,
      confidence: 'ESTIMATED',
    }];
  }));
}

export function calculateProjectGapReport({ project, facilities, roads, growthRate = 0, benchmarkScale = 1 }) {
  const boundary = project.area?.boundary_geojson;
  const population = project.project_type === 'EXISTING_AREA'
    ? numeric(project.current_population) : numeric(project.expected_population);
  const areaSqKm = numeric(project.area?.area_sq_km || project.area_acres / 247.105);
  const planningHorizon = numeric(project.planning_horizon);
  const futurePopulation = project.project_type === 'NEW_DEVELOPMENT'
    ? population
    : Math.round(population * Math.pow(1 + Math.max(0, growthRate) / 100, planningHorizon));
  const context = {
    areaSqKm, boundary, facilities, population, roads, futurePopulation,
    projectType: project.project_type, benchmarkScale,
  };
  const categories = Object.entries(PROJECT_GAP_BENCHMARKS)
    .map(([key, config]) => categoryReport(key, config, context));
  const weightTotal = Object.values(PROJECT_GAP_BENCHMARKS).reduce((sum, item) => sum + item.weight, 0);
  const overallGap = clamp(categories.reduce((sum, category) => (
    sum + category.gap_percent * PROJECT_GAP_BENCHMARKS[category.key].weight
  ), 0) / weightTotal);
  const sites = generateCandidateSites(boundary);
  const criticalAreas = criticalSiteFeatures(sites, categories, facilities, roads);
  const horizonScenarios = [5, 10, 20, 30].map((years) => {
    const scenarioPopulation = project.project_type === 'NEW_DEVELOPMENT'
      ? Math.round(population * Math.min(1, years / Math.max(planningHorizon, 1)))
      : Math.round(population * Math.pow(1 + Math.max(0, growthRate) / 100, years));
    return {
      years, population: scenarioPopulation, confidence: 'SIMULATED',
      requirements: Object.fromEntries(Object.entries(PROJECT_GAP_BENCHMARKS).map(([key, config]) => (
        [key, Number((requiredSupply(config, scenarioPopulation, areaSqKm) * benchmarkScale).toFixed(2))]
      ))),
    };
  });

  return {
    population: {
      value: population,
      projected_value: futurePopulation,
      planning_horizon: planningHorizon,
      density: project.project_type === 'EXISTING_AREA'
        ? numeric(project.current_density) : numeric(project.target_density),
      confidence: project.project_type === 'EXISTING_AREA' ? 'MEASURED' : 'ESTIMATED',
      projection_confidence: 'SIMULATED',
    },
    overview: {
      overall_gap_percent: overallGap,
      status: gapSeverity(overallGap),
      critical_categories: categories.filter(({ gap }) => gap === 'CRITICAL').length,
      high_categories: categories.filter(({ gap }) => gap === 'HIGH').length,
      mapped_critical_areas: criticalAreas.length,
    },
    categories,
    critical_areas: criticalAreas,
    horizon_scenarios: horizonScenarios,
    priority_areas: [...categories]
      .sort((first, second) => second.gap_percent - first.gap_percent)
      .map((category, index) => ({ rank: index + 1, ...category })),
    map_visualization: {
      type: 'FeatureCollection',
      features: criticalAreas.map((area) => ({
        type: 'Feature',
        id: area.id,
        geometry: { type: 'Point', coordinates: [area.coordinates.longitude, area.coordinates.latitude] },
        properties: {
          category: area.category, severity: area.severity,
          reason: area.reason, confidence: area.confidence,
        },
      })),
    },
    methodology: {
      version: '1.0',
      generated_by: 'deterministic',
      service_distance_logic: true,
      surrounding_asset_contribution: 0.35,
      benchmark_scale: benchmarkScale,
      data_confidence: {
        MEASURED: 'Directly calculated from mapped project-context records.',
        ESTIMATED: 'Derived from transparent service benchmarks or spatial catchments.',
        SIMULATED: 'Future condition calculated from the planning horizon and recorded growth.',
      },
    },
  };
}
