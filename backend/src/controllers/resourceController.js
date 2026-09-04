import * as resourceService from '../services/resourceService.js';
import { sendSuccess } from '../utils/apiResponse.js';

const sendCollection = (service, getArguments) => async (req, res, next) => {
  try {
    const data = await service(...getArguments(req));
    sendSuccess(res, data, { meta: { count: data.length } });
  } catch (error) {
    next(error);
  }
};

export const listWards = sendCollection(
  resourceService.getWards,
  (req) => [req.validated.query.cityId],
);

export async function getWard(req, res, next) {
  try {
    sendSuccess(res, await resourceService.getWard(req.validated.params.wardId));
  } catch (error) {
    next(error);
  }
}

const wardQueryArguments = (req) => [req.validated.query.wardId];

export const listPopulation = sendCollection(resourceService.getPopulation, wardQueryArguments);
export const listFacilities = sendCollection(resourceService.getFacilities, wardQueryArguments);
export const listRoads = sendCollection(resourceService.getRoads, wardQueryArguments);
export const listEnvironment = sendCollection(resourceService.getEnvironment, wardQueryArguments);
export const listAnalysis = sendCollection(resourceService.getAnalysis, wardQueryArguments);
export const listRecommendations = sendCollection(
  resourceService.getRecommendations,
  (req) => [req.validated.query.cityId, req.validated.query.wardId],
);

