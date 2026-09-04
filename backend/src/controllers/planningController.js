import * as planningProjectService from '../services/planningProjectService.js';
import * as recommendationService from '../services/recommendationService.js';
import * as planningFeatureService from '../services/planningFeatureService.js';
import * as projectGapAnalysisService from '../services/projectGapAnalysisService.js';
import * as projectBlockAnalysisService from '../services/projectBlockAnalysisService.js';
import * as projectValidationService from '../services/projectValidationService.js';
import * as locationSuitabilityService from '../services/locationSuitabilityService.js';
import * as projectDeliveryService from '../services/projectDeliveryService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function listPlanningProjects(req, res, next) {
  try {
    const projects = await planningProjectService.listPlanningProjects(req.user.id);
    sendSuccess(res, projects, { meta: { count: projects.length } });
  } catch (error) {
    next(error);
  }
}

export async function getPlanningProject(req, res, next) {
  try {
    sendSuccess(res, await planningProjectService.getPlanningProject(req.validated.params.projectId, req.user.id));
  } catch (error) {
    next(error);
  }
}

export async function createPlanningProject(req, res, next) {
  try {
    sendSuccess(res, await planningProjectService.createPlanningProject(req.validated.body, req.user.id), { status: 201 });
  } catch (error) {
    next(error);
  }
}

export async function updatePlanningProject(req, res, next) {
  try {
    sendSuccess(res, await planningProjectService.updatePlanningProject(
      req.validated.params.projectId,
      req.validated.body,
      req.user.id,
    ));
  } catch (error) {
    next(error);
  }
}

export async function deletePlanningProject(req, res, next) {
  try {
    sendSuccess(res, await planningProjectService.deletePlanningProject(req.validated.params.projectId, req.user.id));
  } catch (error) {
    next(error);
  }
}

export async function createProjectRecommendations(req, res, next) {
  try {
    const result = await recommendationService.createProjectRecommendations({
      projectId: req.validated.params.projectId,
      ownerUserId: req.user.id,
      ...req.validated.body,
    });
    sendSuccess(res, result, { status: result.recommendations.length ? 201 : 200 });
  } catch (error) {
    next(error);
  }
}

export async function listProjectRecommendations(req, res, next) {
  try {
    sendSuccess(res, await recommendationService.listProjectRecommendations(req.validated.params.projectId, req.user.id));
  } catch (error) {
    next(error);
  }
}

export async function updateProjectRecommendationStatus(req, res, next) {
  try {
    sendSuccess(res, await recommendationService.updateProjectRecommendationStatus({
      projectId: req.validated.params.projectId,
      recommendationId: req.validated.params.recommendationId,
      ownerUserId: req.user.id,
      status: req.validated.body.status,
    }));
  } catch (error) { next(error); }
}

export async function listPlanningFeatures(req, res, next) {
  try {
    const features = await planningFeatureService.listPlanningFeatures(req.validated.params.projectId, req.user.id);
    sendSuccess(res, features, { meta: { count: features.length } });
  } catch (error) {
    next(error);
  }
}

export async function createPlanningFeature(req, res, next) {
  try {
    sendSuccess(res, await planningFeatureService.createPlanningFeature(
      req.validated.params.projectId,
      req.validated.body,
      req.user.id,
    ), { status: 201 });
  } catch (error) {
    next(error);
  }
}

export async function updatePlanningFeature(req, res, next) {
  try {
    sendSuccess(res, await planningFeatureService.updatePlanningFeature(
      req.validated.params.projectId,
      req.validated.params.featureId,
      req.validated.body,
      req.user.id,
    ));
  } catch (error) { next(error); }
}

export async function deletePlanningFeature(req, res, next) {
  try {
    sendSuccess(res, await planningFeatureService.deletePlanningFeature(
      req.validated.params.projectId,
      req.validated.params.featureId,
      req.user.id,
    ));
  } catch (error) {
    next(error);
  }
}

export async function getProjectGapAnalysis(req, res, next) {
  try {
    sendSuccess(res, await projectGapAnalysisService.getProjectGapAnalysis(
      req.validated.params.projectId,
      req.user.id,
      req.validated.query?.benchmarkScale ?? 1,
    ));
  } catch (error) {
    next(error);
  }
}

export async function getProjectBlockAnalysis(req, res, next) {
  try {
    sendSuccess(res, await projectBlockAnalysisService.getProjectBlockAnalysis(
      req.validated.params.projectId,
      req.user.id,
    ));
  } catch (error) { next(error); }
}

export async function simulateProjectBlockHealth(req, res, next) {
  try {
    sendSuccess(res, await projectBlockAnalysisService.simulateProjectBlockHealth(
      req.validated.params.projectId, req.user.id, req.validated.body,
    ));
  } catch (error) { next(error); }
}

export async function validateProjectPlan(req, res, next) {
  try {
    sendSuccess(res, await projectValidationService.validateProjectPlan(
      req.validated.params.projectId, req.user.id,
    ));
  } catch (error) { next(error); }
}

export async function evaluateProjectLocation(req, res, next) {
  try {
    sendSuccess(res, await locationSuitabilityService.evaluateLocation(
      req.validated.params.projectId, req.user.id, req.validated.body,
    ));
  } catch (error) { next(error); }
}

export async function acceptProjectLocation(req, res, next) {
  try {
    sendSuccess(res, await locationSuitabilityService.acceptEvaluatedLocation(
      req.validated.params.projectId, req.user.id, req.validated.body,
    ), { status: 201 });
  } catch (error) { next(error); }
}

export async function getPlanningRules(req, res, next) {
  try {
    sendSuccess(res, await locationSuitabilityService.listPlanningRules(
      req.validated.params.projectId, req.user.id, req.validated.query?.facilityType ?? null,
    ));
  } catch (error) { next(error); }
}

export async function listDevelopmentPhases(req, res, next) { try { sendSuccess(res, await projectDeliveryService.listPhases(req.validated.params.projectId, req.user.id)); } catch (error) { next(error); } }
export async function createDevelopmentPhase(req, res, next) { try { sendSuccess(res, await projectDeliveryService.createPhase(req.validated.params.projectId, req.user.id, req.validated.body), { status: 201 }); } catch (error) { next(error); } }
export async function updateDevelopmentPhase(req, res, next) { try { sendSuccess(res, await projectDeliveryService.updatePhase(req.validated.params.projectId, req.validated.params.phaseId, req.user.id, req.validated.body)); } catch (error) { next(error); } }
export async function deleteDevelopmentPhase(req, res, next) { try { sendSuccess(res, await projectDeliveryService.deletePhase(req.validated.params.projectId, req.validated.params.phaseId, req.user.id)); } catch (error) { next(error); } }
export async function getFuturePlan(req, res, next) { try { sendSuccess(res, await projectDeliveryService.getFuturePlan(req.validated.params.projectId, req.user.id)); } catch (error) { next(error); } }
export async function simulateProjectBudget(req, res, next) { try { sendSuccess(res, await projectDeliveryService.simulateBudget(req.validated.params.projectId, req.user.id, req.validated.body), { status: req.validated.body.saveScenario ? 201 : 200 }); } catch (error) { next(error); } }
export async function listProjectBudgets(req, res, next) { try { sendSuccess(res, await projectDeliveryService.listBudgets(req.validated.params.projectId, req.user.id)); } catch (error) { next(error); } }
