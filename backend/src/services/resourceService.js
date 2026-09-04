import * as cityRepository from '../repositories/cityRepository.js';
import * as resourceRepository from '../repositories/resourceRepository.js';
import { httpError } from '../utils/httpError.js';

async function requireCity(cityId) {
  const city = await cityRepository.findCityById(cityId);
  if (!city) throw httpError(404, 'City not found', 'CITY_NOT_FOUND');
  return city;
}

async function requireWard(wardId) {
  const ward = await resourceRepository.findWardById(wardId);
  if (!ward) throw httpError(404, 'Ward not found', 'WARD_NOT_FOUND');
  return ward;
}

export async function getWards(cityId) {
  await requireCity(cityId);
  return resourceRepository.findWardsByCity(cityId);
}

export async function getWard(wardId) {
  return requireWard(wardId);
}

async function getWardResource(wardId, finder) {
  await requireWard(wardId);
  return finder(wardId);
}

export const getPopulation = (wardId) => getWardResource(wardId, resourceRepository.findPopulationByWard);
export const getFacilities = (wardId) => getWardResource(wardId, resourceRepository.findFacilitiesByWard);
export const getRoads = (wardId) => getWardResource(wardId, resourceRepository.findRoadsByWard);
export const getEnvironment = (wardId) => getWardResource(wardId, resourceRepository.findEnvironmentByWard);
export const getAnalysis = (wardId) => getWardResource(wardId, resourceRepository.findAnalysisByWard);

export async function getRecommendations(cityId, wardId) {
  await requireCity(cityId);
  if (wardId !== undefined) {
    const ward = await requireWard(wardId);
    if (Number(ward.city_id) !== Number(cityId)) {
      throw httpError(400, 'Ward does not belong to the selected city', 'WARD_CITY_MISMATCH');
    }
  }
  return resourceRepository.findRecommendations(cityId, wardId);
}

