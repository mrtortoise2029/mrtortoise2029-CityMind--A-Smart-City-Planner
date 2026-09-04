import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5001/api',
  timeout: 12000,
});

const AUTH_TOKEN_KEY = 'citymind.authToken';

export function getAuthToken() {
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  else window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

api.interceptors.request.use((configuration) => {
  const token = getAuthToken();
  if (token) configuration.headers.Authorization = `Bearer ${token}`;
  return configuration;
});

export const login = (input) => api.post('/auth/login', input).then(({ data }) => data.data);
export const register = (input) => api.post('/auth/register', input).then(({ data }) => data.data);
export const getCurrentUser = () => api.get('/auth/me').then(({ data }) => data.data);

export const getCities = () => api.get('/cities').then(({ data }) => data.data);
export const getPlanningProjects = () => api.get('/planning-projects').then(({ data }) => data.data);
export const getPlanningProject = (projectId) => api.get(`/planning-projects/${projectId}`).then(({ data }) => data.data);
export const createPlanningProject = (input) => api.post('/planning-projects', input).then(({ data }) => data.data);
export const updatePlanningProject = (projectId, input) => api.put(`/planning-projects/${projectId}`, input).then(({ data }) => data.data);
export const deletePlanningProject = (projectId) => api.delete(`/planning-projects/${projectId}`).then(({ data }) => data.data);
export const getPlanningFeatures = (projectId) => api.get(`/planning-projects/${projectId}/features`).then(({ data }) => data.data);
export const createPlanningFeature = (projectId, input) => api.post(`/planning-projects/${projectId}/features`, input).then(({ data }) => data.data);
export const updatePlanningFeature = (projectId, featureId, input) => api.put(`/planning-projects/${projectId}/features/${featureId}`, input).then(({ data }) => data.data);
export const deletePlanningFeature = (projectId, featureId) => api.delete(`/planning-projects/${projectId}/features/${featureId}`).then(({ data }) => data.data);
export const getProjectGapAnalysis = (projectId, benchmarkScale = 1) => api.get(`/planning-projects/${projectId}/gap-analysis`, { params: { benchmarkScale } }).then(({ data }) => data.data);
export const getProjectBlockAnalysis = (projectId) => api.get(`/planning-projects/${projectId}/block-analysis`).then(({ data }) => data.data);
export const simulateProjectBlockHealth = (projectId, input) => api.post(`/planning-projects/${projectId}/health-simulation`, input).then(({ data }) => data.data);
export const getProjectValidation = (projectId) => api.get(`/planning-projects/${projectId}/validation`).then(({ data }) => data.data);
export const evaluateProjectLocation = (projectId, input) => api.post(`/planning-projects/${projectId}/evaluate-location`, input).then(({ data }) => data.data);
export const acceptEvaluatedProjectLocation = (projectId, input) => api.post(`/planning-projects/${projectId}/evaluated-locations/accept`, input).then(({ data }) => data.data);
export const getProjectPlanningRules = (projectId, facilityType) => api.get(`/planning-projects/${projectId}/planning-rules`, { params: facilityType ? { facilityType } : {} }).then(({ data }) => data.data);
export const getProjectDevelopmentPhases = (projectId) => api.get(`/planning-projects/${projectId}/development-phases`).then(({ data }) => data.data);
export const createProjectDevelopmentPhase = (projectId, input) => api.post(`/planning-projects/${projectId}/development-phases`, input).then(({ data }) => data.data);
export const getProjectFuturePlan = (projectId) => api.get(`/planning-projects/${projectId}/future-plan`).then(({ data }) => data.data);
export const getProjectBudgets = (projectId) => api.get(`/planning-projects/${projectId}/budgets`).then(({ data }) => data.data);
export const simulateProjectBudget = (projectId, input) => api.post(`/planning-projects/${projectId}/budget-simulation`, input).then(({ data }) => data.data);
export const getOverview = (cityId) => api.get(`/cities/${cityId}/overview`).then(({ data }) => data.data);
export const getGapAnalysis = (cityId) => api.get(`/cities/${cityId}/gap-analysis`).then(({ data }) => data.data);
export const getMapData = (cityId) => api.get(`/cities/${cityId}/map`).then(({ data }) => data.data);
export const getRecommendations = (cityId) => api.get(`/cities/${cityId}/recommendations`).then(({ data }) => data.data);
export const getHealthScore = (cityId) => api.get(`/cities/${cityId}/health-score`).then(({ data }) => data.data);
export const runWardAnalysis = (wardId) => api.post(`/analysis/ward/${wardId}`).then(({ data }) => data.data);
export const getWardAnalysis = (wardId) => api.get(`/analysis/ward/${wardId}`).then(({ data }) => data.data);
export const getCityAnalyses = (cityId) => api.get(`/analysis/city/${cityId}`).then(({ data }) => data.data);
export const getWardHealthScore = (wardId) => api.get(`/analysis/ward/${wardId}/health-score`).then(({ data }) => data.data);
export const getCityHealthScores = (cityId) => api.get(`/analysis/city/${cityId}/health-scores`).then(({ data }) => data.data);
export const createRecommendations = (input) => api.post('/recommendations', input).then(({ data }) => data.data);
export const createProjectRecommendations = (projectId, input) => api
  .post(`/planning-projects/${projectId}/recommendations`, input)
  .then(({ data }) => data.data);
export const updateProjectRecommendationStatus = (projectId, recommendationId, status) => api
  .patch(`/planning-projects/${projectId}/recommendations/${recommendationId}`, { status })
  .then(({ data }) => data.data);
