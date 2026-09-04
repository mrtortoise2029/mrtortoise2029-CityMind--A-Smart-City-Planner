import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import * as userRepository from '../repositories/userRepository.js';
import { httpError } from '../utils/httpError.js';

const publicUser = ({ id, name, email, role }) => ({ id, name, email, role });

function tokenFor(user) {
  return jwt.sign(
    { role: user.role, email: user.email },
    env.jwtSecret,
    { subject: String(user.id), expiresIn: env.jwtExpiresIn },
  );
}

export async function register(input) {
  if (await userRepository.findUserByEmail(input.email)) {
    throw httpError(409, 'An account already uses this email', 'EMAIL_ALREADY_EXISTS');
  }
  const user = await userRepository.createUser({
    name: input.name,
    email: input.email,
    passwordHash: await bcrypt.hash(input.password, 12),
  });
  return { user: publicUser(user), token: tokenFor(user) };
}

export async function login({ email, password }) {
  const user = await userRepository.findUserByEmail(email);
  if (!user || !user.is_active || !await bcrypt.compare(password, user.password_hash)) {
    throw httpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }
  return { user: publicUser(user), token: tokenFor(user) };
}

export async function getCurrentUser(userId) {
  const user = await userRepository.findUserById(userId);
  if (!user || !user.is_active) throw httpError(401, 'Account is unavailable', 'UNAUTHENTICATED');
  return publicUser(user);
}
