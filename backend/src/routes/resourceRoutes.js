import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/resourceController.js';
import * as recommendationController from '../controllers/recommendationController.js';
import { validate } from '../middleware/validate.js';

const positiveId = z.coerce.number().int().positive();
const cityQuery = z.object({ cityId: positiveId });
const wardQuery = z.object({ wardId: positiveId });
const wardParams = z.object({ wardId: positiveId });
const recommendationQuery = z.object({
  cityId: positiveId,
  wardId: positiveId.optional(),
});
const recommendationBody = z.object({
  projectType: z.enum([
    'HOSPITAL', 'SCHOOL', 'ROAD', 'ROAD_CONNECTION', 'DRAINAGE', 'PARK',
    'COMMERCIAL_CENTER', 'OTHER',
  ]),
  budget: z.coerce.number().positive().max(1_000_000_000_000),
  planningHorizon: z.coerce.number().int().min(1).max(30),
  cityId: positiveId,
}).strict();

export const wardRoutes = Router();
wardRoutes.get('/', validate(cityQuery, 'query'), controller.listWards);
wardRoutes.get('/:wardId', validate(wardParams), controller.getWard);

function createWardResourceRouter(controllerMethod) {
  const router = Router();
  router.get('/', validate(wardQuery, 'query'), controllerMethod);
  return router;
}

export const populationRoutes = createWardResourceRouter(controller.listPopulation);
export const facilityRoutes = createWardResourceRouter(controller.listFacilities);
export const roadRoutes = createWardResourceRouter(controller.listRoads);
export const environmentRoutes = createWardResourceRouter(controller.listEnvironment);
export const recommendationRoutes = Router();
recommendationRoutes.get('/', validate(recommendationQuery, 'query'), controller.listRecommendations);
recommendationRoutes.post('/', validate(recommendationBody, 'body'), recommendationController.createRecommendations);
