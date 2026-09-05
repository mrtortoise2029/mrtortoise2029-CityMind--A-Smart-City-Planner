import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './src/config/env.js';
import cityRoutes from './src/routes/cityRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import analysisRoutes from './src/routes/analysisRoutes.js';
import planningProjectRoutes from './src/routes/planningProjectRoutes.js';
import {
  environmentRoutes,
  facilityRoutes,
  populationRoutes,
  recommendationRoutes,
  roadRoutes,
  wardRoutes,
} from './src/routes/resourceRoutes.js';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';
import { sendSuccess } from './src/utils/apiResponse.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
const configuredOrigins = new Set([env.frontendUrl]);
function isAllowedOrigin(origin) {
  if (!origin || configuredOrigins.has(origin)) return true;
  if (env.nodeEnv === 'production') return false;
  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}
app.use(cors({
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => sendSuccess(res, {
  status: 'ok',
  service: 'citymind-api',
  timestamp: new Date().toISOString(),
}));
app.use('/api/auth', authRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/projects', planningProjectRoutes);
app.use('/api/planning-projects', planningProjectRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/population', populationRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/roads', roadRoutes);
app.use('/api/environment', environmentRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
