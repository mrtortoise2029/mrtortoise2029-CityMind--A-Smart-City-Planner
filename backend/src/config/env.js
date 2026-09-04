import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

const integer = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const boolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: integer(process.env.PORT, 5001),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  demoMode: boolean(process.env.DEMO_MODE),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: integer(process.env.DB_PORT, 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'citymind',
    connectionLimit: integer(process.env.DB_CONNECTION_LIMIT, 10),
  },
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  jwtSecret: process.env.JWT_SECRET ?? (boolean(process.env.DEMO_MODE) ? 'citymind-demo-only-secret' : ''),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
};