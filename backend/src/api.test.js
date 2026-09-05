import { describe, expect, test } from '@jest/globals';
import request from 'supertest';
import { app } from '../api.js';

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
