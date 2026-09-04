import { pool } from '../config/database.js';
import { env } from '../config/env.js';

const demoUsers = [{
  id: 1,
  role_id: 2,
  role: 'planner',
  name: 'Demo Planner',
  email: 'planner@citymind.local',
  password_hash: '$2b$10$eS3hw4luwyossoP5eghEYuk2i/2Qw/iD5WPzmKe3Udv6DmGlfpCJW',
  is_active: true,
}];

export async function findUserByEmail(email) {
  if (env.demoMode) return structuredClone(demoUsers.find((user) => user.email === email) ?? null);
  const [rows] = await pool.execute(`
    SELECT u.id, u.role_id, r.name AS role, u.name, u.email, u.password_hash, u.is_active
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.email = ?
    LIMIT 1
  `, [email]);
  return rows[0] ?? null;
}

export async function findUserById(userId) {
  if (env.demoMode) return structuredClone(demoUsers.find((user) => user.id === Number(userId)) ?? null);
  const [rows] = await pool.execute(`
    SELECT u.id, u.role_id, r.name AS role, u.name, u.email, u.password_hash, u.is_active
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = ?
    LIMIT 1
  `, [userId]);
  return rows[0] ?? null;
}

export async function createUser({ name, email, passwordHash }) {
  if (env.demoMode) {
    const user = {
      id: Math.max(...demoUsers.map(({ id }) => id)) + 1,
      role_id: 2, role: 'planner', name, email, password_hash: passwordHash, is_active: true,
    };
    demoUsers.push(user);
    return structuredClone(user);
  }
  const [result] = await pool.execute(`
    INSERT INTO users (role_id, name, email, password_hash)
    SELECT id, ?, ?, ? FROM roles WHERE name = 'planner' LIMIT 1
  `, [name, email, passwordHash]);
  return findUserById(result.insertId);
}
