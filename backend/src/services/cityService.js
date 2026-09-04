import * as cityRepository from '../repositories/cityRepository.js';
import { calculateCityAnalysis } from './analyticsService.js';
import { enhanceRecommendationSummary } from './geminiService.js';
import { httpError } from '../utils/httpError.js';

async function requireCity(cityId) {
  const city = await cityRepository.findCityById(cityId);
  if (!city) throw httpError(404, 'City not found');
  return city;
}

export async function getCities() {
  return cityRepository.findCities();
}

export async function getCity(cityId) {
  return requireCity(cityId);
}

export async function getHealthScore(cityId) {
  const [city, wards] = await Promise.all([
    requireCity(cityId),
    cityRepository.findWardMetrics(cityId),
  ]);
  return { city, ...calculateCityAnalysis(wards) };
}

export async function getGapAnalysis(cityId) {
  const result = await getHealthScore(cityId);
  const gaps = result.wards.flatMap((ward) => ward.gaps.map((gap) => ({
    ...gap,
    wardId: ward.id,
    wardName: ward.name,
    population: ward.population,
  }))).sort((a, b) => a.score - b.score);
  return {
    city: result.city,
    summary: {
      critical: gaps.filter((gap) => gap.severity === 'critical').length,
      high: gaps.filter((gap) => gap.severity === 'high').length,
      moderate: gaps.filter((gap) => gap.severity === 'moderate').length,
    },
    gaps,
    wards: result.wards.map(({ id, name, latitude, longitude, healthScore }) => ({ id, name, latitude, longitude, healthScore })),
  };
}

function createFallbackBoundary(ward) {
  const latitude = Number(ward.latitude);
  const longitude = Number(ward.longitude);
  const radius = Math.max(0.0045, Math.min(0.007, Math.sqrt(Number(ward.area_sq_km) || 6) * 0.002));
  const longitudeRadius = radius / Math.cos((latitude * Math.PI) / 180);
  const coordinates = Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 3) * index;
    return [longitude + Math.cos(angle) * longitudeRadius, latitude + Math.sin(angle) * radius];
  });
  coordinates.push([...coordinates[0]]);

  return {
    type: 'Feature',
    properties: { wardId: ward.id, name: ward.name, geometrySource: 'centroid-fallback' },
    geometry: { type: 'Polygon', coordinates: [coordinates] },
  };
}

function normalizeBoundary(ward) {
  if (!ward.boundary_geojson) return { boundary: createFallbackBoundary(ward), geometrySource: 'centroid-fallback' };
  const source = ward.boundary_geojson;
  const sourceFeature = source.type === 'FeatureCollection' ? source.features?.[0] : source;
  if (!sourceFeature?.type) return { boundary: createFallbackBoundary(ward), geometrySource: 'centroid-fallback' };
  const boundary = sourceFeature.type === 'Feature'
    ? sourceFeature
    : { type: 'Feature', properties: {}, geometry: sourceFeature };
  return {
    boundary: {
      ...boundary,
      properties: { ...boundary.properties, wardId: ward.id, name: ward.name, geometrySource: 'database' },
    },
    geometrySource: 'database',
  };
}

export async function getMapData(cityId) {
  const [city, wards, facilities, roads] = await Promise.all([
    requireCity(cityId),
    cityRepository.findWardMetrics(cityId),
    cityRepository.findFacilities(cityId),
    cityRepository.findRoads(cityId),
  ]);
  const analyzed = calculateCityAnalysis(wards);
  const mapWards = analyzed.wards.map(({ gaps, dimensions, boundary_geojson, ...ward }) => ({
    ...ward,
    ...normalizeBoundary({ ...ward, boundary_geojson }),
  }));
  return {
    city,
    wards: mapWards,
    facilities,
    roads,
    geometrySummary: {
      database: mapWards.filter((ward) => ward.geometrySource === 'database').length,
      fallback: mapWards.filter((ward) => ward.geometrySource !== 'database').length,
    },
  };
}

const templates = {
  Healthcare: { title: 'Expand primary healthcare access', action: 'Add a community clinic or mobile care point', cost: 120000, impact: 'Improves emergency and primary care coverage' },
  Education: { title: 'Improve local education capacity', action: 'Add classrooms and support an underserved school zone', cost: 90000, impact: 'Reduces student travel distance and overcrowding' },
  Mobility: { title: 'Rehabilitate priority road segments', action: 'Repair low-condition roads and improve safe crossings', cost: 180000, impact: 'Improves access, safety, and travel reliability' },
  'Green space': { title: 'Create a neighborhood green pocket', action: 'Convert available public land into an accessible park', cost: 60000, impact: 'Improves heat resilience and local liveability' },
};

export async function getRecommendations(cityId) {
  const [analysis, saved] = await Promise.all([
    getGapAnalysis(cityId),
    cityRepository.findSavedRecommendations(cityId),
  ]);
  const generated = analysis.gaps.slice(0, 8).map((gap, index) => {
    const template = templates[gap.category];
    return {
      id: `generated-${gap.wardId}-${gap.category}`,
      rank: index + 1,
      title: template.title,
      description: `${template.action} in ${gap.wardName}. Current ${gap.category.toLowerCase()} performance is ${gap.score}/100.`,
      category: gap.category,
      priority: gap.severity === 'critical' ? 'critical' : gap.severity === 'high' ? 'high' : 'medium',
      wardName: gap.wardName,
      estimatedCost: template.cost,
      estimatedImpact: template.impact,
      confidence: Math.max(68, 94 - index * 3),
      source: 'rules',
    };
  });
  let aiSummary = null;
  try {
    aiSummary = await enhanceRecommendationSummary(analysis.city, generated);
  } catch (error) {
    console.warn('Gemini enhancement unavailable:', error.message);
  }
  return { city: analysis.city, aiSummary, recommendations: saved.length ? saved : generated };
}

export async function getOverview(cityId) {
  const [health, gaps, recommendations] = await Promise.all([
    getHealthScore(cityId), getGapAnalysis(cityId), getRecommendations(cityId),
  ]);
  return {
    city: health.city,
    health: { overallScore: health.overallScore, dimensions: health.dimensions, benchmark: health.benchmark },
    population: health.population,
    wardCount: health.wards.length,
    gapSummary: gaps.summary,
    priorityRecommendations: recommendations.recommendations.slice(0, 3),
    wardScores: health.wards.map(({ id, name, healthScore }) => ({ id, name, healthScore })),
  };
}
