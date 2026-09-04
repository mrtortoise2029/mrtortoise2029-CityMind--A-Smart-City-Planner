const city = {
  id: 1,
  name: 'Dhaka Central',
  country: 'Bangladesh',
  latitude: 23.7806,
  longitude: 90.407,
  area_sq_km: 78.4,
};

const planningProjects = [
  {
    id: 1, owner_user_id: 1, city_id: 1, name: 'Bashundhara Residential Area',
    description: 'A long-horizon residential master-planning workspace.',
    project_type: 'NEW_DEVELOPMENT', country: 'Bangladesh', region: 'Dhaka', location_search: '',
    planning_stage: 'Master Planning', status: 'active',
    area_acres: 500, current_population: null, expected_population: 85000,
    current_households: null, expected_households: 18000, current_density: null, target_density: 170,
    planning_horizon: 20, progress_percent: 32, health_score: null,
    area: {
      id: 1, name: 'Bashundhara Residential Area Boundary',
      boundary_geojson: { type: 'Polygon', coordinates: [[[90.4200, 23.7850], [90.4350, 23.7850], [90.4350, 23.7970], [90.4200, 23.7970], [90.4200, 23.7850]]] },
      centroid_latitude: 23.7910, centroid_longitude: 90.4275,
      area_acres: 500, area_sq_km: 2.0234, boundary_source: 'drawn',
    },
  },
  {
    id: 2, owner_user_id: 1, city_id: 1, name: 'United City',
    description: 'An existing community improvement and infrastructure planning workspace.',
    project_type: 'EXISTING_AREA', country: 'Bangladesh', region: 'Dhaka', location_search: '',
    planning_stage: 'Improvement Planning', status: 'active',
    area_acres: 310, current_population: 42600, expected_population: 58000,
    current_households: 9800, expected_households: null, current_density: 137.42, target_density: null,
    planning_horizon: 10, progress_percent: 58, health_score: 56,
    area: {
      id: 2, name: 'United City Boundary',
      boundary_geojson: { type: 'Polygon', coordinates: [[[90.4040, 23.7880], [90.4160, 23.7880], [90.4160, 23.7970], [90.4040, 23.7970], [90.4040, 23.7880]]] },
      centroid_latitude: 23.7925, centroid_longitude: 90.4100,
      area_acres: 310, area_sq_km: 1.2150, boundary_source: 'drawn',
    },
  },
];

const wards = [
  { id: 1, city_id: 1, name: 'Banani', ward_code: 'W19', latitude: 23.7937, longitude: 90.4066, area_sq_km: 6.2, population: 42100, hospitals: 1, schools: 1, parks: 1, total_facilities: 3, road_length_km: 3.2, good_road_percent: 100, air_quality_index: 118, green_cover_percent: 21, water_quality_index: 72 },
  { id: 2, city_id: 1, name: 'Mohakhali', ward_code: 'W20', latitude: 23.7776, longitude: 90.3994, area_sq_km: 7.1, population: 68300, hospitals: 1, schools: 1, parks: 0, total_facilities: 2, road_length_km: 4.8, good_road_percent: 100, air_quality_index: 157, green_cover_percent: 9, water_quality_index: 58 },
  { id: 3, city_id: 1, name: 'Tejgaon', ward_code: 'W24', latitude: 23.7639, longitude: 90.391, area_sq_km: 8.7, population: 81900, hospitals: 0, schools: 1, parks: 1, total_facilities: 2, road_length_km: 6.3, good_road_percent: 0, air_quality_index: 171, green_cover_percent: 7, water_quality_index: 51 },
  { id: 4, city_id: 1, name: 'Badda', ward_code: 'W21', latitude: 23.7802, longitude: 90.4255, area_sq_km: 9.4, population: 93500, hospitals: 1, schools: 1, parks: 0, total_facilities: 2, road_length_km: 7.1, good_road_percent: 0, air_quality_index: 149, green_cover_percent: 8, water_quality_index: 55 },
  { id: 5, city_id: 1, name: 'Gulshan', ward_code: 'W18', latitude: 23.7925, longitude: 90.416, area_sq_km: 7.8, population: 38600, hospitals: 1, schools: 1, parks: 1, total_facilities: 3, road_length_km: 4.1, good_road_percent: 100, air_quality_index: 102, green_cover_percent: 28, water_quality_index: 79 },
  { id: 6, city_id: 1, name: 'Rampura', ward_code: 'W22', latitude: 23.7612, longitude: 90.4207, area_sq_km: 8.9, population: 104200, hospitals: 0, schools: 1, parks: 0, total_facilities: 1, road_length_km: 7.8, good_road_percent: 0, air_quality_index: 184, green_cover_percent: 5, water_quality_index: 47 },
];

for (const ward of wards) {
  ward.population_density = Math.round((ward.population / ward.area_sq_km) * 100) / 100;
  ward.growth_rate = ({ 1: 2.1, 2: 3.3, 3: 2.8, 4: 4.2, 5: 1.8, 6: 4.6 })[ward.id];
  ward.noise_level_db = ({ 1: 64, 2: 75, 3: 79, 4: 73, 5: 61, 6: 81 })[ward.id];
  ward.boundary_geojson = null;
}

const facilities = [
  [1, 1, 'Banani Community Clinic', 'hospital', 23.7948, 90.4054, 80],
  [2, 1, 'Banani Model School', 'school', 23.7921, 90.4083, 900],
  [3, 1, 'Banani Lake Park', 'park', 23.7961, 90.4091, 1200],
  [4, 2, 'Mohakhali General Hospital', 'hospital', 23.779, 90.398, 220],
  [5, 2, 'Mohakhali High School', 'school', 23.7758, 90.401, 1100],
  [6, 3, 'Tejgaon Government School', 'school', 23.7648, 90.3895, 1300],
  [7, 3, 'Shahid Anwar Park', 'park', 23.7619, 90.3932, 800],
  [8, 4, 'Badda Health Centre', 'hospital', 23.782, 90.4267, 120],
  [9, 4, 'Badda Primary School', 'school', 23.7785, 90.4238, 1000],
  [10, 5, 'Gulshan Medical Centre', 'hospital', 23.7917, 90.4146, 160],
  [11, 5, 'Gulshan Model School', 'school', 23.794, 90.4184, 950],
  [12, 5, 'Gulshan Lake Park', 'park', 23.7895, 90.4172, 1700],
  [13, 6, 'Rampura Primary School', 'school', 23.7625, 90.422, 1200],
].map(([id, ward_id, name, type, latitude, longitude, capacity]) => ({
  id, ward_id, name, type, latitude, longitude, capacity, status: 'active',
  ward_name: wards.find((ward) => ward.id === ward_id).name,
}));

const roads = [
  [1, 1, 'Banani Road 11', 4, 'medium', [[23.7908, 90.404], [23.797, 90.409]]],
  [2, 2, 'Mohakhali Link Road', 3, 'severe', [[23.773, 90.397], [23.782, 90.401]]],
  [3, 3, 'Tejgaon Industrial Road', 2, 'high', [[23.7575, 90.387], [23.77, 90.395]]],
  [4, 4, 'Badda Main Road', 2, 'severe', [[23.773, 90.423], [23.788, 90.428]]],
  [5, 5, 'Gulshan Avenue', 5, 'medium', [[23.7865, 90.414], [23.798, 90.418]]],
  [6, 6, 'Rampura DIT Road', 1, 'severe', [[23.752, 90.416], [23.77, 90.425]]],
].map(([id, ward_id, name, condition_rating, congestion_level, geometry]) => ({
  id, ward_id, name, road_type: 'primary', length_km: wards.find((ward) => ward.id === ward_id).road_length_km,
  condition_rating, congestion_level, geometry,
}));

const smartRecommendations = [];
let smartRecommendationId = 1;
const planningFeatures = [{
  id: 1, planning_project_id: 1, feature_type: 'FACILITY_PROPOSAL', category: 'hospital',
  name: 'Proposed Community Hospital', geometry: { type: 'Point', coordinates: [90.428, 23.791] },
  status: 'recommended', source: 'citymind', properties: { note: 'Demonstration planning proposal' },
  created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 2, planning_project_id: 1, feature_type: 'BLOCK', category: 'residential',
  name: 'Block A', geometry: { type: 'Polygon', coordinates: [[[90.421, 23.786], [90.425, 23.786], [90.425, 23.796], [90.421, 23.796], [90.421, 23.786]]] },
  status: 'proposed', source: 'planner', properties: { blockId: 'A', landUse: 'residential', phase: 1, population: 26000, households: 5530, greenSpacePercent: 8, utilityCoverage: 68 }, created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 3, planning_project_id: 1, feature_type: 'BLOCK', category: 'residential',
  name: 'Block B', geometry: { type: 'Polygon', coordinates: [[[90.426, 23.786], [90.430, 23.786], [90.430, 23.796], [90.426, 23.796], [90.426, 23.786]]] },
  status: 'proposed', source: 'planner', properties: { blockId: 'B', landUse: 'residential', phase: 1, population: 30000, households: 6380, greenSpacePercent: 14, utilityCoverage: 76 }, created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 4, planning_project_id: 1, feature_type: 'BLOCK', category: 'mixed-use',
  name: 'Block C', geometry: { type: 'Polygon', coordinates: [[[90.431, 23.786], [90.434, 23.786], [90.434, 23.796], [90.431, 23.796], [90.431, 23.786]]] },
  status: 'proposed', source: 'planner', properties: { blockId: 'C', landUse: 'mixed-use', phase: 2, population: 29000, households: 6090, greenSpacePercent: 6, utilityCoverage: 62 }, created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 5, planning_project_id: 1, feature_type: 'PRIMARY_ROAD', category: 'primary', name: 'Central Primary Avenue',
  geometry: { type: 'LineString', coordinates: [[90.4205, 23.791], [90.4345, 23.791]] }, status: 'proposed', source: 'planner', properties: { widthMeters: 24 }, created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 6, planning_project_id: 1, feature_type: 'SECONDARY_ROAD', category: 'secondary', name: 'North-South Connector',
  geometry: { type: 'LineString', coordinates: [[90.428, 23.7855], [90.428, 23.7965]] }, status: 'proposed', source: 'planner', properties: { widthMeters: 16 }, created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 7, planning_project_id: 1, feature_type: 'LOCAL_ROAD', category: 'local', name: 'Block C Local Street',
  geometry: { type: 'LineString', coordinates: [[90.4315, 23.788], [90.4335, 23.794]] }, status: 'proposed', source: 'planner', properties: { widthMeters: 9 }, created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 8, planning_project_id: 1, feature_type: 'MAIN_GATE', category: 'entry', name: 'Main Western Gate',
  geometry: { type: 'Point', coordinates: [90.4201, 23.791] }, status: 'proposed', source: 'planner', properties: { connectedRoad: 'Central Primary Avenue' }, created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 9, planning_project_id: 1, feature_type: 'FACILITY_PROPOSAL', category: 'school', name: 'Block A Community School',
  geometry: { type: 'Point', coordinates: [90.423, 23.793] }, status: 'proposed', source: 'planner', properties: { capacity: 1800 }, created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 10, planning_project_id: 1, feature_type: 'FACILITY_PROPOSAL', category: 'park', name: 'Block B Neighborhood Park',
  geometry: { type: 'Point', coordinates: [90.428, 23.794] }, status: 'proposed', source: 'planner', properties: { areaAcres: 9 }, created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 11, planning_project_id: 2, feature_type: 'BLOCK', category: 'residential',
  name: 'Block A', geometry: { type: 'Polygon', coordinates: [[[90.4045, 23.7885], [90.4081, 23.7885], [90.4081, 23.7965], [90.4045, 23.7965], [90.4045, 23.7885]]] },
  status: 'approved', source: 'planner', properties: { blockId: 'A', landUse: 'residential', phase: 1, population: 14000, households: 3200, populationConfidence: 'ESTIMATED', greenSpacePercent: 4, utilityCoverage: 58, landSuitability: 68, constraintLevel: 'HIGH', constraintNote: 'Drainage capacity requires field verification.' }, created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 12, planning_project_id: 2, feature_type: 'BLOCK', category: 'mixed-use',
  name: 'Block B', geometry: { type: 'Polygon', coordinates: [[[90.4083, 23.7885], [90.4121, 23.7885], [90.4121, 23.7965], [90.4083, 23.7965], [90.4083, 23.7885]]] },
  status: 'approved', source: 'planner', properties: { blockId: 'B', landUse: 'mixed-use', phase: 1, population: 15600, households: 3600, populationConfidence: 'ESTIMATED', greenSpacePercent: 11, utilityCoverage: 71, landSuitability: 82, constraintLevel: 'LOW', constraintNote: 'Existing utility easement must be retained.' }, created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 13, planning_project_id: 2, feature_type: 'BLOCK', category: 'residential',
  name: 'Block C', geometry: { type: 'Polygon', coordinates: [[[90.4123, 23.7885], [90.4155, 23.7885], [90.4155, 23.7965], [90.4123, 23.7965], [90.4123, 23.7885]]] },
  status: 'approved', source: 'planner', properties: { blockId: 'C', landUse: 'residential', phase: 2, population: 13000, households: 3000, populationConfidence: 'ESTIMATED', greenSpacePercent: 7, utilityCoverage: 64, landSuitability: 61, constraintLevel: 'MEDIUM', constraintNote: 'Eastern access and storm-water capacity need detailed survey.' }, created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 14, planning_project_id: 2, feature_type: 'PRIMARY_ROAD', category: 'primary', name: 'United City Central Avenue',
  geometry: { type: 'LineString', coordinates: [[90.4043, 23.7925], [90.4157, 23.7925]] }, status: 'approved', source: 'planner', properties: { widthMeters: 20 }, created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 15, planning_project_id: 2, feature_type: 'SECONDARY_ROAD', category: 'secondary', name: 'United City Cross Connector',
  geometry: { type: 'LineString', coordinates: [[90.4102, 23.7882], [90.4102, 23.7968]] }, status: 'approved', source: 'planner', properties: { widthMeters: 14 }, created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 16, planning_project_id: 2, feature_type: 'LOCAL_ROAD', category: 'local', name: 'Block C Access Street',
  geometry: { type: 'LineString', coordinates: [[90.4130, 23.7892], [90.4148, 23.7955]] }, status: 'approved', source: 'planner', properties: { widthMeters: 8 }, created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 17, planning_project_id: 2, feature_type: 'MAIN_GATE', category: 'entry', name: 'United City Main Gate',
  geometry: { type: 'Point', coordinates: [90.4041, 23.7925] }, status: 'approved', source: 'planner', properties: { connectedRoad: 'United City Central Avenue' }, created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 18, planning_project_id: 2, feature_type: 'COMMUNITY_FACILITY', category: 'hospital', name: 'United City Clinic',
  geometry: { type: 'Point', coordinates: [90.4064, 23.7935] }, status: 'approved', source: 'planner', properties: { capacity: 120, dataConfidence: 'ESTIMATED' }, created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 19, planning_project_id: 2, feature_type: 'COMMUNITY_FACILITY', category: 'school', name: 'United City School',
  geometry: { type: 'Point', coordinates: [90.4104, 23.7942] }, status: 'approved', source: 'planner', properties: { capacity: 950, dataConfidence: 'ESTIMATED' }, created_at: '2026-09-02T00:00:00.000Z',
}, {
  id: 20, planning_project_id: 2, feature_type: 'COMMUNITY_FACILITY', category: 'park', name: 'United City Neighborhood Park',
  geometry: { type: 'Point', coordinates: [90.4138, 23.7943] }, status: 'approved', source: 'planner', properties: { areaAcres: 5, dataConfidence: 'ESTIMATED' }, created_at: '2026-09-02T00:00:00.000Z',
}];
let planningFeatureId = 21;

export const findCities = async () => [{
  ...city,
  ward_count: wards.length,
  population: wards.reduce((total, ward) => total + ward.population, 0),
}];

export const findCityById = async (cityId) => Number(cityId) === city.id ? { ...city } : null;
export const findPlanningProjects = async (ownerUserId) => structuredClone(
  planningProjects.filter(({ owner_user_id: owner }) => owner === Number(ownerUserId)),
);
export const findPlanningProjectById = async (projectId, ownerUserId) => structuredClone(
  planningProjects.find(({ id, owner_user_id: owner }) => (
    id === Number(projectId) && owner === Number(ownerUserId)
  )) ?? null,
);
export const createPlanningProject = async (record) => {
  const id = Math.max(0, ...planningProjects.map((project) => project.id)) + 1;
  const project = { ...structuredClone(record), id };
  planningProjects.push(project);
  return structuredClone(project);
};
export const updatePlanningProject = async (projectId, record, ownerUserId) => {
  const index = planningProjects.findIndex(({ id, owner_user_id: owner }) => (
    id === Number(projectId) && owner === Number(ownerUserId)
  ));
  if (index < 0) return null;
  planningProjects[index] = { ...structuredClone(record), id: Number(projectId) };
  return structuredClone(planningProjects[index]);
};
export const deletePlanningProject = async (projectId, ownerUserId) => {
  const index = planningProjects.findIndex(({ id, owner_user_id: owner }) => (
    id === Number(projectId) && owner === Number(ownerUserId)
  ));
  if (index < 0) return false;
  planningProjects.splice(index, 1);
  for (let featureIndex = planningFeatures.length - 1; featureIndex >= 0; featureIndex -= 1) {
    if (planningFeatures[featureIndex].planning_project_id === Number(projectId)) planningFeatures.splice(featureIndex, 1);
  }
  return true;
};
export const findPlanningFeatures = async (projectId) => structuredClone(
  planningFeatures.filter(({ planning_project_id: id }) => id === Number(projectId)),
);
export const createPlanningFeature = async (projectId, feature) => {
  const saved = {
    ...structuredClone(feature), id: planningFeatureId, planning_project_id: Number(projectId),
    created_at: new Date().toISOString(),
  };
  planningFeatureId += 1;
  planningFeatures.push(saved);
  return structuredClone(saved);
};
export const updatePlanningFeature = async (projectId, featureId, feature) => {
  const index = planningFeatures.findIndex(({ id, planning_project_id: owner }) => (
    id === Number(featureId) && owner === Number(projectId)
  ));
  if (index < 0) return null;
  planningFeatures[index] = {
    ...planningFeatures[index], ...structuredClone(feature), id: Number(featureId),
    planning_project_id: Number(projectId), updated_at: new Date().toISOString(),
  };
  return structuredClone(planningFeatures[index]);
};
export const deletePlanningFeature = async (projectId, featureId) => {
  const index = planningFeatures.findIndex(({ id, planning_project_id: owner }) => (
    id === Number(featureId) && owner === Number(projectId)
  ));
  if (index < 0) return false;
  planningFeatures.splice(index, 1);
  return true;
};
export const findWardMetrics = async (cityId) => Number(cityId) === city.id ? structuredClone(wards.map((ward) => {
  const wardFacilities = facilities.filter((facility) => facility.ward_id === ward.id);
  const wardRoads = roads.filter((road) => road.ward_id === ward.id);
  return {
    ...ward,
    hospital_capacity: wardFacilities.filter(({ type }) => type === 'hospital').reduce((sum, item) => sum + item.capacity, 0),
    school_capacity: wardFacilities.filter(({ type }) => type === 'school').reduce((sum, item) => sum + item.capacity, 0),
    average_road_condition: wardRoads.length ? wardRoads.reduce((sum, road) => sum + road.condition_rating, 0) / wardRoads.length : 0,
    congestion_score: wardRoads.length ? wardRoads.reduce((sum, road) => sum + ({ low: 100, medium: 70, high: 40, severe: 15 }[road.congestion_level] ?? 0), 0) / wardRoads.length : 0,
  };
})) : [];
export const findFacilities = async (cityId) => Number(cityId) === city.id ? structuredClone(facilities) : [];
export const findRoads = async (cityId) => Number(cityId) === city.id ? structuredClone(roads) : [];
export const findSavedRecommendations = async (cityId) => structuredClone(
  smartRecommendations.filter((item) => Number(item.city_id) === Number(cityId)),
);

export const findWardsByCity = async (cityId) => Number(cityId) === city.id ? structuredClone(wards) : [];
export const findWardById = async (wardId) => structuredClone(wards.find((ward) => ward.id === Number(wardId)) ?? null);
export const findPopulationByWard = async (wardId) => {
  const ward = wards.find((item) => item.id === Number(wardId));
  return ward ? [{
    id: ward.id,
    ward_id: ward.id,
    year: 2026,
    population: ward.population,
    population_density: Math.round((ward.population / ward.area_sq_km) * 100) / 100,
    growth_rate: ward.growth_rate,
  }] : [];
};
export const findFacilitiesByWard = async (wardId) => structuredClone(
  facilities.filter((facility) => facility.ward_id === Number(wardId)),
);
export const findRoadsByWard = async (wardId) => structuredClone(
  roads.filter((road) => road.ward_id === Number(wardId)),
);
export const findEnvironmentByWard = async (wardId) => {
  const ward = wards.find((item) => item.id === Number(wardId));
  return ward ? [{
    id: ward.id,
    ward_id: ward.id,
    air_quality_index: ward.air_quality_index,
    green_cover_percent: ward.green_cover_percent,
    water_quality_index: ward.water_quality_index,
    noise_level_db: ward.noise_level_db,
    recorded_at: '2026-08-01T09:00:00.000Z',
  }] : [];
};
export const findAnalysisByWard = async () => [];
export const findRecommendations = async (cityId, wardId) => structuredClone(
  smartRecommendations.filter((item) => Number(item.city_id) === Number(cityId)
    && (wardId === undefined || Number(item.ward_id) === Number(wardId))),
);
export const findRecommendationsByPlanningProject = async (projectId) => structuredClone(
  smartRecommendations.filter((item) => Number(item.planning_project_id) === Number(projectId)),
);
export const updateRecommendationStatus = async (projectId, recommendationId, status) => {
  const item = smartRecommendations.find(({ recommendation_id: id, planning_project_id: owner }) => (
    Number(id) === Number(recommendationId) && Number(owner) === Number(projectId)
  ));
  if (!item) return null;
  item.status = status;
  return structuredClone(item);
};
export const supersedeProjectRecommendations = async (projectId, projectType) => {
  smartRecommendations.forEach((item) => {
    if (Number(item.planning_project_id) === Number(projectId)
      && item.project_type === projectType && item.status === 'proposed') item.status = 'dismissed';
  });
};
export const saveSmartRecommendations = async (rows) => structuredClone(rows.map((row) => {
  const saved = {
    ...row,
    id: smartRecommendationId,
    recommendation_id: smartRecommendationId,
    created_at: new Date().toISOString(),
  };
  smartRecommendationId += 1;
  smartRecommendations.push(saved);
  return saved;
}));
