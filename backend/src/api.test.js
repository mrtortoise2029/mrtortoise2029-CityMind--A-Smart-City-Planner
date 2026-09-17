import { describe, expect, test } from '@jest/globals';
import request from 'supertest';

process.env.DEMO_MODE = 'true';
const { app } = await import('../api.js');

describe('development CORS policy', () => {
  test('allows a local Vite fallback port', async () => {
    const response = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:5177')
      .set('Access-Control-Request-Method', 'POST');
    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5177');
  });

  test('does not allow an unrelated web origin', async () => {
    const response = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'https://untrusted.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('project planning intelligence APIs', () => {
  let token;
  let projectId;

  beforeAll(async () => {
    const login = await request(app).post('/api/auth/login').send({
      email: 'planner@citymind.local', password: 'CityMindDemo123!',
    });
    token = login.body.data.token;
    const projects = await request(app).get('/api/planning-projects').set('Authorization', `Bearer ${token}`);
    projectId = projects.body.data[0].id;
  });

  test('returns project-scoped growth prediction without extending the horizon', async () => {
    const response = await request(app)
      .get(`/api/planning-projects/${projectId}/growth-prediction`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.project_id).toBe(projectId);
    expect(response.body.data.current.year).toBe(0);
    expect(Math.max(...response.body.data.scenarios.map(({ year }) => year)))
      .toBeLessThanOrEqual(response.body.data.planning_horizon);
    expect(response.body.data.methodology.official_forecast).toBe(false);
  });

  test('returns evidence-based risks and explicit unavailable datasets', async () => {
    const response = await request(app)
      .get(`/api/planning-projects/${projectId}/risk-detection`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.project_id).toBe(projectId);
    expect(response.body.data.unavailable_risks).toEqual(expect.arrayContaining([
      expect.objectContaining({ risk_type: 'FLOOD_WATERLOGGING', status: 'DATA_UNAVAILABLE' }),
    ]));
  });

  test('returns a transparent preliminary development feasibility assessment', async () => {
    const response = await request(app)
      .get(`/api/planning-projects/${projectId}/development-feasibility`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.project_id).toBe(projectId);
    expect(response.body.data.assessment_type).toBe('PRELIMINARY_DEVELOPMENT_FEASIBILITY');
    expect(response.body.data.planning_readiness).toEqual(expect.objectContaining({
      score: expect.any(Number), factors: expect.any(Array),
    }));
    expect(response.body.data.planning_readiness.methodology).toMatch(/weighted supported evidence/i);
    expect(response.body.data.decision_notice).toMatch(/professional and regulatory verification/i);
  });

  test('aggregates a project report and does not synthesize a budget result', async () => {
    const response = await request(app)
      .get(`/api/planning-projects/${projectId}/report`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.project_id).toBe(projectId);
    expect(response.body.data.title).toMatch(/Preliminary Urban Development Assessment/);
    expect(response.body.data.assessment_notice).toMatch(/regulatory verification/i);
    expect(response.body.data.growth_prediction.status).toBe('READY');
    expect(response.body.data.development_feasibility.status).toBe('READY');
    expect(['READY', 'UNAVAILABLE']).toContain(response.body.data.budget_information.status);
    if (response.body.data.budget_information.status === 'UNAVAILABLE') {
      expect(response.body.data.budget_information.reason).toMatch(/No existing saved/);
    }
  });

  test('does not expose an unknown or unowned project', async () => {
    const response = await request(app)
      .get('/api/planning-projects/999999/growth-prediction')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(404);
  });
});
