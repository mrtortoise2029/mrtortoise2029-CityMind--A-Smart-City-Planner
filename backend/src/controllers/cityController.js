import * as cityService from '../services/cityService.js';
import { sendSuccess } from '../utils/apiResponse.js';

const send = (service) => async (req, res, next) => {
  try {
    sendSuccess(res, await service(req.params.cityId));
  } catch (error) {
    next(error);
  }
};

export async function listCities(req, res, next) {
  try {
    sendSuccess(res, await cityService.getCities());
  } catch (error) {
    next(error);
  }
}

export const getCity = send(cityService.getCity);

export const overview = send(cityService.getOverview);
export const gapAnalysis = send(cityService.getGapAnalysis);
export const mapData = send(cityService.getMapData);
export const recommendations = send(cityService.getRecommendations);
export const healthScore = send(cityService.getHealthScore);
