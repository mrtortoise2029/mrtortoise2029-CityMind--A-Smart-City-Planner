import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/planningProjectController.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';

const projectParams = z.object({ projectId: z.coerce.number().int().positive() });
const featureParams = z.object({
  projectId: z.coerce.number().int().positive(),
  featureId: z.coerce.number().int().positive(),
});
const recommendationParams = z.object({
  projectId: z.coerce.number().int().positive(),
  recommendationId: z.coerce.number().int().positive(),
});
const coordinate = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);
const boundary = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(coordinate).min(4)).length(1),
}).superRefine((value, context) => {
  const ring = value.coordinates[0];
  if (!ring?.length) return;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    context.addIssue({ code: 'custom', message: 'Polygon ring must be closed', path: ['coordinates'] });
  }
});
const optionalPositiveNumber = z.coerce.number().positive().optional().nullable();
const projectBody = z.object({
  name: z.string().trim().min(3).max(180),
  description: z.string().trim().min(5).max(2000),
  projectType: z.enum(['NEW_DEVELOPMENT', 'EXISTING_AREA', 'REDEVELOPMENT', 'URBAN_EXPANSION']),
  country: z.string().trim().min(2).max(100),
  cityId: z.coerce.number().int().positive(),
  region: z.string().trim().min(2).max(160),
  locationSearch: z.string().trim().max(255).optional(),
  boundary,
  planningHorizon: z.coerce.number().refine((value) => [5, 10, 20, 30].includes(value), {
    message: 'Planning horizon must be 5, 10, 20, or 30 years',
  }),
  expectedPopulation: optionalPositiveNumber,
  expectedHouseholds: optionalPositiveNumber,
  targetDensity: optionalPositiveNumber,
  currentPopulation: optionalPositiveNumber,
  currentHouseholds: optionalPositiveNumber,
  currentDensity: optionalPositiveNumber,
}).strict().superRefine((value, context) => {
  const fields = value.projectType === 'EXISTING_AREA'
    ? ['currentPopulation', 'currentHouseholds', 'currentDensity']
    : ['expectedPopulation', 'expectedHouseholds', 'targetDensity'];
  fields.forEach((field) => {
    if (!value[field]) context.addIssue({ code: 'custom', message: 'Required for this project type', path: [field] });
  });
});
const recommendationBody = z.object({
  projectType: z.enum([
    'HOSPITAL', 'SCHOOL', 'ROAD', 'ROAD_CONNECTION', 'DRAINAGE', 'PARK',
    'COMMERCIAL_CENTER', 'OTHER',
  ]),
  budget: z.coerce.number().positive().max(1_000_000_000_000),
  planningHorizon: z.coerce.number().int().min(1).max(30).optional(),
}).strict();
const healthSimulationBody = z.object({
  blockId: z.coerce.number().int().positive(),
  intervention: z.enum(['HOSPITAL', 'SCHOOL', 'PARK', 'ROAD', 'DRAINAGE']),
}).strict();
const gapQuery = z.object({ benchmarkScale: z.coerce.number().min(0.75).max(1.5).optional() });
const recommendationStatusBody = z.object({
  status: z.enum(['proposed', 'approved', 'in_progress', 'completed', 'dismissed']),
}).strict();
const facilityType = z.enum([
  'HOSPITAL', 'SCHOOL', 'PARK', 'COMMERCIAL_CENTER', 'ROAD', 'DRAINAGE',
  'COMMUNITY_FACILITY', 'OTHER',
]);
const locationEvaluationBody = z.object({
  facilityType,
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
}).strict();
const locationAcceptanceBody = locationEvaluationBody.extend({
  name: z.string().trim().min(3).max(180).optional(),
  overrideReason: z.string().trim().min(10).max(500).optional(),
}).strict();
const planningRulesQuery = z.object({ facilityType: facilityType.optional() });
const phaseParams = projectParams.extend({ phaseId: z.coerce.number().int().positive() });
const phaseBody = z.object({
  name: z.string().trim().min(3).max(120), phaseOrder: z.coerce.number().int().min(1).max(20),
  startYear: z.coerce.number().int().min(1).max(30), endYear: z.coerce.number().int().min(1).max(30),
  status: z.enum(['planned', 'active', 'completed']), description: z.string().trim().max(1000).optional().nullable(),
}).strict();
const budgetSimulationBody = z.object({
  availableBudget: z.coerce.number().positive().max(10_000_000_000_000), currency: z.string().trim().length(3).default('BDT'),
  scenarioType: z.enum(['MINIMUM_COST', 'BALANCED', 'MAXIMUM_IMPACT']), scenarioName: z.string().trim().min(3).max(120).optional(),
  saveScenario: z.boolean().optional().default(false),
}).strict();
const pointGeometry = z.object({ type: z.literal('Point'), coordinates: coordinate });
const lineGeometry = z.object({ type: z.literal('LineString'), coordinates: z.array(coordinate).min(2) });
const polygonGeometry = z.object({ type: z.literal('Polygon'), coordinates: z.array(z.array(coordinate).min(4)).length(1) });
const planningFeatureBody = z.object({
  featureType: z.enum([
    'PLANNING_POINT', 'FACILITY_PROPOSAL', 'ROAD_PROPOSAL', 'RESIDENTIAL_ZONE',
    'COMMERCIAL_ZONE', 'EDUCATION_ZONE', 'HEALTHCARE_ZONE', 'GREEN_ZONE',
    'FUTURE_DEVELOPMENT_AREA', 'BLOCK', 'PRIMARY_ROAD', 'SECONDARY_ROAD',
    'LOCAL_ROAD', 'MAIN_GATE', 'SECONDARY_GATE', 'RECREATION_ZONE', 'UTILITY_ZONE',
    'DRAINAGE_CORRIDOR', 'WATER_BODY', 'COMMUNITY_FACILITY',
  ]),
  category: z.string().trim().min(2).max(60).optional(),
  name: z.string().trim().min(3).max(180),
  geometry: z.union([pointGeometry, lineGeometry, polygonGeometry]),
  status: z.enum(['proposed', 'recommended', 'approved', 'rejected']).optional(),
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
}).strict().superRefine((value, context) => {
  const lineTypes = ['ROAD_PROPOSAL', 'PRIMARY_ROAD', 'SECONDARY_ROAD', 'LOCAL_ROAD', 'DRAINAGE_CORRIDOR'];
  const polygonTypes = [
    'RESIDENTIAL_ZONE', 'COMMERCIAL_ZONE', 'EDUCATION_ZONE', 'HEALTHCARE_ZONE',
    'GREEN_ZONE', 'FUTURE_DEVELOPMENT_AREA', 'BLOCK', 'RECREATION_ZONE',
    'UTILITY_ZONE', 'WATER_BODY',
  ];
  const expectedGeometry = lineTypes.includes(value.featureType)
    ? 'LineString'
    : polygonTypes.includes(value.featureType)
      ? 'Polygon'
      : 'Point';
  if (value.geometry.type !== expectedGeometry) {
    context.addIssue({ code: 'custom', path: ['geometry'], message: `${value.featureType} requires ${expectedGeometry} geometry` });
  }
});

const routes = Router();
routes.use(authenticate);
routes.get('/', controller.listPlanningProjects);
routes.post('/', validate(projectBody, 'body'), controller.createPlanningProject);
routes.get('/:projectId', validate(projectParams), controller.getPlanningProject);
routes.put('/:projectId', validate(projectParams), validate(projectBody, 'body'), controller.updatePlanningProject);
routes.delete('/:projectId', validate(projectParams), controller.deletePlanningProject);
routes.get('/:projectId/gap-analysis', validate(projectParams), validate(gapQuery, 'query'), controller.getProjectGapAnalysis);
routes.get('/:projectId/block-analysis', validate(projectParams), controller.getProjectBlockAnalysis);
routes.post('/:projectId/health-simulation', validate(projectParams), validate(healthSimulationBody, 'body'), controller.simulateProjectBlockHealth);
routes.get('/:projectId/validation', validate(projectParams), controller.validateProjectPlan);
routes.get('/:projectId/planning-rules', validate(projectParams), validate(planningRulesQuery, 'query'), controller.getPlanningRules);
routes.post('/:projectId/evaluate-location', validate(projectParams), validate(locationEvaluationBody, 'body'), controller.evaluateProjectLocation);
routes.post('/:projectId/evaluated-locations/accept', validate(projectParams), validate(locationAcceptanceBody, 'body'), controller.acceptProjectLocation);
routes.get('/:projectId/development-phases', validate(projectParams), controller.listDevelopmentPhases);
routes.post('/:projectId/development-phases', validate(projectParams), validate(phaseBody, 'body'), controller.createDevelopmentPhase);
routes.put('/:projectId/development-phases/:phaseId', validate(phaseParams), validate(phaseBody, 'body'), controller.updateDevelopmentPhase);
routes.delete('/:projectId/development-phases/:phaseId', validate(phaseParams), controller.deleteDevelopmentPhase);
routes.get('/:projectId/future-plan', validate(projectParams), controller.getFuturePlan);
routes.get('/:projectId/budgets', validate(projectParams), controller.listProjectBudgets);
routes.post('/:projectId/budget-simulation', validate(projectParams), validate(budgetSimulationBody, 'body'), controller.simulateProjectBudget);
routes.get('/:projectId/features', validate(projectParams), controller.listPlanningFeatures);
routes.post('/:projectId/features', validate(projectParams), validate(planningFeatureBody, 'body'), controller.createPlanningFeature);
routes.put('/:projectId/features/:featureId', validate(featureParams), validate(planningFeatureBody, 'body'), controller.updatePlanningFeature);
routes.delete('/:projectId/features/:featureId', validate(featureParams), controller.deletePlanningFeature);
routes.get('/:projectId/recommendations', validate(projectParams), controller.listProjectRecommendations);
routes.post(
  '/:projectId/recommendations',
  validate(projectParams),
  validate(recommendationBody, 'body'),
  controller.createProjectRecommendations,
);
routes.patch('/:projectId/recommendations/:recommendationId', validate(recommendationParams), validate(recommendationStatusBody, 'body'), controller.updateProjectRecommendationStatus);

export default routes;
