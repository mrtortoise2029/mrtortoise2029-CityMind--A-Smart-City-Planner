import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  ...env.db,
  waitForConnections: true,
  queueLimit: 0,
  decimalNumbers: true,
  timezone: 'Z',
});

export async function checkDatabaseConnection() {
  if (env.demoMode) return;
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}