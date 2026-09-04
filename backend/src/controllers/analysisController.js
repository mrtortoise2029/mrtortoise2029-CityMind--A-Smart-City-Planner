import * as analysisService from '../services/urbanGapAnalysisService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function runWardAnalysis(req, res, next) {
  try {
    sendSuccess(res, await analysisService.runWardAnalysis(req.validated.params.wardId), { status: 201 });
  } catch (error) {
    next(error);
  }
}

export async function getWardAnalysis(req, res, next) {
  try {
    sendSuccess(res, await analysisService.getLatestWardAnalysis(req.validated.params.wardId));
  } catch (error) {
    next(error);
  }
}

export async function getCityAnalyses(req, res, next) {
  try {
    sendSuccess(res, await analysisService.getCityAnalyses(req.validated.params.cityId));
  } catch (error) {
    next(error);
  }
}

export async function getWardHealthScore(req, res, next) {
  try {
    sendSuccess(res, await analysisService.getWardHealthScore(req.validated.params.wardId));
  } catch (error) {
    next(error);
  }
}

export async function getCityHealthScores(req, res, next) {
  try {
    sendSuccess(res, await analysisService.getCityHealthScores(req.validated.params.cityId));
  } catch (error) {
    next(error);
  }
}
