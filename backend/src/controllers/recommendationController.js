import * as recommendationService from '../services/recommendationService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function createRecommendations(req, res, next) {
  try {
    const result = await recommendationService.createRecommendations(req.validated.body);
    sendSuccess(res, result, { status: result.recommendations.length ? 201 : 200 });
  } catch (error) {
    next(error);
  }
}
