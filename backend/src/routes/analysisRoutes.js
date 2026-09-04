import { Router } from 'express';
import { z } from 'zod';
import * as analysisController from '../controllers/analysisController.js';
import { listAnalysis } from '../controllers/resourceController.js';
import { validate } from '../middleware/validate.js';

const positiveId = z.coerce.number().int().positive();
const wardQuery = z.object({ wardId: positiveId });
const wardParams = z.object({ wardId: positiveId });
const cityParams = z.object({ cityId: positiveId });
const router = Router();

router.get('/', validate(wardQuery, 'query'), listAnalysis);
router.post('/ward/:wardId', validate(wardParams), analysisController.runWardAnalysis);
router.get('/ward/:wardId/health-score', validate(wardParams), analysisController.getWardHealthScore);
router.get('/ward/:wardId', validate(wardParams), analysisController.getWardAnalysis);
router.get('/city/:cityId/health-scores', validate(cityParams), analysisController.getCityHealthScores);
router.get('/city/:cityId', validate(cityParams), analysisController.getCityAnalyses);

export default router;
