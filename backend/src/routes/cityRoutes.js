import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/cityController.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const cityParams = z.object({ cityId: z.coerce.number().int().positive() });
const validateCity = validate(cityParams);

router.get('/', controller.listCities);
router.get('/:cityId', validateCity, controller.getCity);
router.get('/:cityId/overview', validateCity, controller.overview);
router.get('/:cityId/gap-analysis', validateCity, controller.gapAnalysis);
router.get('/:cityId/map', validateCity, controller.mapData);
router.get('/:cityId/recommendations', validateCity, controller.recommendations);
router.get('/:cityId/health-score', validateCity, controller.healthScore);

export default router;
