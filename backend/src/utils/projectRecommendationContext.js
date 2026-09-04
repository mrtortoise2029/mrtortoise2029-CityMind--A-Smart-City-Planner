const EARTH_RADIUS_KM = 6371;
export const PROPOSED_ASSET_COVERAGE_WEIGHT = 0.65;

const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const radians = (value) => value * Math.PI / 180;

export function normalizeFacilityType(value) {
  const normalized = String(value ?? '').trim().toLowerCase().replaceAll('_', ' ');
  return ({
    healthcare: 'hospital', clinic: 'hospital',
    education: 'school',
    recreation: 'park', 'green space': 'park',
    'commercial center': 'commercial',
  })[normalized] ?? normalized;
}

export function distanceKm(first, second) {
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function pointInsideBoundary(point, boundary) {
  const ring = boundary?.coordinates?.[0] ?? [];
  if (ring.length < 4) return false;
  let inside = false;
  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
    const [currentLongitude, currentLatitude] = ring[current];
    const [previousLongitude, previousLatitude] = ring[previous];
    const intersects = ((currentLatitude > point.latitude) !== (previousLatitude > point.latitude))
      && point.longitude < (previousLongitude - currentLongitude)
      * (point.latitude - currentLatitude) / (previousLatitude - currentLatitude) + currentLongitude;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointToSegmentDistanceKm(point, start, end) {
  const latitudeScale = 111.32;
  const longitudeScale = 111.32 * Math.cos(radians(point.latitude));
  const pointX = point.longitude * longitudeScale;
  const pointY = point.latitude * latitudeScale;
  const startX = start.longitude * longitudeScale;
  const startY = start.latitude * latitudeScale;
  const endX = end.longitude * longitudeScale;
  const endY = end.latitude * latitudeScale;
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const lengthSquared = deltaX ** 2 + deltaY ** 2;
  const ratio = lengthSquared
    ? Math.max(0, Math.min(1, ((pointX - startX) * deltaX + (pointY - startY) * deltaY) / lengthSquared))
    : 0;
  return Math.hypot(pointX - (startX + ratio * deltaX), pointY - (startY + ratio * deltaY));
}

export function distanceToBoundaryKm(point, boundary) {
  if (pointInsideBoundary(point, boundary)) return 0;
  const ring = boundary?.coordinates?.[0] ?? [];
  if (ring.length < 2) return Infinity;
  let minimum = Infinity;
  for (let index = 0; index < ring.length - 1; index += 1) {
    minimum = Math.min(minimum, pointToSegmentDistanceKm(
      point,
      { longitude: ring[index][0], latitude: ring[index][1] },
      { longitude: ring[index + 1][0], latitude: ring[index + 1][1] },
    ));
  }
  return minimum;
}

function boundaryEnvelope(boundary) {
  const ring = boundary.coordinates[0].slice(0, -1);
  return ring.reduce((result, [longitude, latitude]) => ({
    minLongitude: Math.min(result.minLongitude, longitude),
    maxLongitude: Math.max(result.maxLongitude, longitude),
    minLatitude: Math.min(result.minLatitude, latitude),
    maxLatitude: Math.max(result.maxLatitude, latitude),
  }), {
    minLongitude: Infinity, maxLongitude: -Infinity,
    minLatitude: Infinity, maxLatitude: -Infinity,
  });
}

/**
 * Creates deterministic candidate points from the saved project polygon. Grid
 * cells are used rather than random coordinates, so the same boundary always
 * produces the same auditable sites and every returned point is inside it.
 */
export function generateCandidateSites(boundary, maximumSites = 6) {
  if (!boundary?.coordinates?.[0] || boundary.coordinates[0].length < 4) return [];
  const envelope = boundaryEnvelope(boundary);
  const gridPositions = [
    [0.5, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75],
    [0.5, 0.25], [0.5, 0.75], [0.25, 0.5], [0.75, 0.5],
    [0.125, 0.125], [0.875, 0.125], [0.125, 0.875], [0.875, 0.875],
  ];
  const points = [];
  for (const [longitudeFraction, latitudeFraction] of gridPositions) {
    const point = {
      latitude: envelope.minLatitude + (envelope.maxLatitude - envelope.minLatitude) * latitudeFraction,
      longitude: envelope.minLongitude + (envelope.maxLongitude - envelope.minLongitude) * longitudeFraction,
    };
    if (pointInsideBoundary(point, boundary)) points.push(point);
  }
  return points.slice(0, maximumSites).map((point, index) => ({
    ...point,
    label: `Candidate Site ${String.fromCharCode(65 + index)}`,
    geometry: { type: 'Point', coordinates: [point.longitude, point.latitude] },
  }));
}

function nearestDistance(point, positions) {
  if (!positions.length) return null;
  return Math.min(...positions.map((position) => distanceKm(point, position)));
}

function roadPositions(roads) {
  return roads.flatMap((road) => (road.geometry ?? []).map(([latitude, longitude]) => ({ latitude, longitude })));
}

function facilityPositions(facilities, projectType) {
  const supportedType = ({
    HOSPITAL: 'hospital', SCHOOL: 'school', PARK: 'park',
    COMMERCIAL_CENTER: 'commercial',
  })[projectType];
  return facilities
    .filter((facility) => !supportedType || facility.type === supportedType)
    .map(({ latitude, longitude }) => ({ latitude: Number(latitude), longitude: Number(longitude) }));
}

function projectPopulation(project) {
  return project.project_type === 'EXISTING_AREA'
    ? numeric(project.current_population)
    : numeric(project.expected_population);
}

function projectDensity(project) {
  return project.project_type === 'EXISTING_AREA'
    ? numeric(project.current_density)
    : numeric(project.target_density);
}

function expectedFacilityCount(projectType, population) {
  const peoplePerAsset = {
    HOSPITAL: 25_000, SCHOOL: 8_000, PARK: 20_000, COMMERCIAL_CENTER: 30_000,
  }[projectType];
  return peoplePerAsset ? Math.max(1, Math.ceil(population / peoplePerAsset)) : 1;
}

function contextFacilityCount(projectType, facilities, boundary, site) {
  const mappedType = {
    HOSPITAL: 'hospital', SCHOOL: 'school', PARK: 'park', COMMERCIAL_CENTER: 'commercial',
  }[projectType];
  if (!mappedType) return 0;
  return facilities.filter((facility) => {
    if (facility.type !== mappedType) return false;
    if (facility.source === 'project_plan' && site.block_id && facility.block_id) {
      return Number(facility.block_id) === Number(site.block_id);
    }
    return pointInsideBoundary({
      latitude: Number(facility.latitude), longitude: Number(facility.longitude),
    }, boundary);
  }).reduce((sum, facility) => {
    if (facility.source !== 'project_plan' || facility.planning_status === 'approved') return sum + 1;
    // A proposal is visible to the next recommendation but contributes partial
    // certainty until the planner confirms implementation.
    return sum + PROPOSED_ASSET_COVERAGE_WEIGHT;
  }, 0);
}

/**
 * Converts project inputs and spatial evidence into the same five Part 6
 * factors. Existing weights and the final scoring formula remain untouched.
 */
export function projectFactorOverrides({ analysis, facilities, planningHorizon, project, roads, site, sites }) {
  const population = projectPopulation(project);
  const density = projectDensity(project);
  const basePopulationNeed = clamp((population / 100_000) * 65 + (density / 250) * 35);
  const populationNeed = project.project_type === 'EXISTING_AREA'
    ? clamp(basePopulationNeed * 0.65 + numeric(analysis.population_need_score) * 0.35)
    : basePopulationNeed;

  const roadDistance = nearestDistance(site, roadPositions(roads));
  const roadAccessibility = roadDistance === null ? 0 : clamp(100 - (roadDistance / 2) * 100);
  const insideFacilities = contextFacilityCount(
    project.requested_project_type,
    facilities,
    project.area.boundary_geojson,
    site,
  );
  const relevantFacilities = facilityPositions(facilities, project.requested_project_type);
  const facilityDistance = nearestDistance(site, relevantFacilities);
  const expectedAssets = expectedFacilityCount(project.requested_project_type, population);
  const assetDeficit = clamp((1 - Math.min(1, insideFacilities / expectedAssets)) * 100);
  const proximityDeficit = facilityDistance === null ? 100 : clamp((facilityDistance / 3) * 100);

  const roadGap = clamp(100 - roadAccessibility);
  const infrastructureGap = clamp(numeric(analysis.infrastructure_gap_score) * 0.45 + roadGap * 0.55);
  const growthRate = Math.max(0, numeric(analysis.evidence?.growth_rate)) / 100;
  const projectedGrowth = (Math.pow(1 + growthRate, planningHorizon) - 1) * 100;
  const horizonPressure = clamp((planningHorizon / 30) * 100);
  const futureDemand = clamp(populationNeed * 0.55 + clamp(projectedGrowth * 2.5) * 0.25 + horizonPressure * 0.20);

  const center = sites[0] ?? site;
  const maximumDistance = Math.max(0.001, ...sites.map((candidate) => distanceKm(center, candidate)));
  const populationCoverage = clamp(100 - (distanceKm(center, site) / maximumDistance) * 30);
  const environmentalDeficit = clamp(100 - numeric(analysis.environment_score));
  const calculatedLandSuitability = clamp(100 - environmentalDeficit * 0.45 - roadGap * 0.25);
  const enteredLandSuitability = Number(site.block_properties?.landSuitability);
  const landSuitability = Number.isFinite(enteredLandSuitability)
    ? clamp(enteredLandSuitability)
    : calculatedLandSuitability;
  const existingCoverage = ['ROAD', 'ROAD_CONNECTION'].includes(project.requested_project_type)
    ? roadGap
    : project.requested_project_type === 'DRAINAGE'
      ? clamp(environmentalDeficit * 0.7 + (100 - numeric(analysis.green_space_score)) * 0.3)
      : clamp(assetDeficit * 0.7 + proximityDeficit * 0.3);
  const baseAccessibility = ['ROAD', 'ROAD_CONNECTION'].includes(project.requested_project_type)
    ? roadGap
    : project.requested_project_type === 'DRAINAGE'
      ? clamp(environmentalDeficit * 0.7 + roadGap * 0.3)
      : roadAccessibility;
  const accessibility = Number.isFinite(enteredLandSuitability)
    ? clamp(baseAccessibility * 0.8 + landSuitability * 0.2)
    : baseAccessibility;

  const blockConstraintLevel = String(site.block_properties?.constraintLevel ?? '').toUpperCase();
  const blockConstraintNote = String(site.block_properties?.constraintNote ?? '').trim();

  const constraints = [
    roadDistance === null ? 'No mapped road geometry is available for access verification.' : null,
    roadDistance !== null && roadDistance > 1.5 ? `Nearest mapped road is ${roadDistance.toFixed(1)} km away.` : null,
    numeric(analysis.evidence?.air_quality_index) > 150
      ? `High air-quality pressure (AQI ${numeric(analysis.evidence.air_quality_index)}).` : null,
    landSuitability < 50 ? 'Land suitability requires detailed site investigation.' : null,
    ['HIGH', 'CRITICAL'].includes(blockConstraintLevel)
      ? `${blockConstraintLevel} block-level planning constraint.` : null,
    blockConstraintNote || null,
  ].filter(Boolean);

  return {
    factors: {
      population_need: populationNeed,
      infrastructure_gap: infrastructureGap,
      accessibility,
      future_demand: futureDemand,
      existing_coverage: existingCoverage,
    },
    evidence: {
      project_population: population,
      project_density: density,
      population_coverage_score: populationCoverage,
      land_suitability_score: landSuitability,
      mapped_facilities_inside_boundary: insideFacilities,
      planned_facility_coverage_included: facilities.some((facility) => (
        facility.source === 'project_plan' && facility.planning_status !== 'approved'
      )),
      nearest_facility_km: facilityDistance === null ? null : Number(facilityDistance.toFixed(2)),
      nearest_road_km: roadDistance === null ? null : Number(roadDistance.toFixed(2)),
      population_distribution: 'Uniform distribution assumed because no project population surface is available.',
      land_suitability_source: Number.isFinite(enteredLandSuitability) ? 'PLANNER_INPUT' : 'ESTIMATED',
    },
    constraints,
  };
}

export function nearestWard(site, wards) {
  return wards
    .filter((ward) => Number.isFinite(Number(ward.latitude)) && Number.isFinite(Number(ward.longitude)))
    .map((ward) => ({ ...ward, distance: distanceKm(site, {
      latitude: Number(ward.latitude), longitude: Number(ward.longitude),
    }) }))
    .sort((first, second) => first.distance - second.distance || first.id - second.id)[0] ?? null;
}
