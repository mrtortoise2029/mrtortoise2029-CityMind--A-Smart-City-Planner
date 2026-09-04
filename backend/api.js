import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import cityRoutes from './routes/cityRoutes.js';
import authRoutes from './routes/authRoutes.js';
import analysisRoutes from './routes/analysisRoutes.js';
import planningProjectRoutes from './routes/planningProjectRoutes.js';
import {
  environmentRoutes,
  facilityRoutes,
  populationRoutes,
  recommendationRoutes,
  roadRoutes,
  wardRoutes,
} from './routes/resourceRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { sendSuccess } from './utils/apiResponse.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
const localOrigins = new Set([env.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173']);
app.use(cors({ origin: (origin, callback) => callback(null, !origin || localOrigins.has(origin)) }));
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
