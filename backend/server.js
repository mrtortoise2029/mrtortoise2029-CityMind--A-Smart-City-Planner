import { app } from './api.js';
import { env } from './src/config/env.js';
import { checkDatabaseConnection } from './src/config/database.js';

try {
  if (!env.demoMode && !env.jwtSecret) {
    throw new Error('JWT_SECRET is required when DEMO_MODE is disabled');
  }
  await checkDatabaseConnection();
  app.listen(env.port, '127.0.0.1', () => {
    const source = env.demoMode ? 'demo data' : 'MySQL';
    console.log(`CityMind API running at http://127.0.0.1:${env.port} using ${source}`);
  });
} catch (error) {
  console.error('Unable to start CityMind API. Check the MySQL configuration.', error.message);
  process.exit(1);
}
