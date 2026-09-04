import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { sendError } from '../utils/apiResponse.js';

export function authenticate(req, res, next) {
  const header = req.get('authorization');
  if (!header && env.demoMode) {
    req.user = { id: 1, name: 'Fahiz Ahmed', email: 'fahizahmed@gmail.com', role: 'planner' };
    return next();
  }
  if (!header?.startsWith('Bearer ')) {
    return sendError(res, { status: 401, code: 'UNAUTHENTICATED', message: 'Authentication is required' });
  }
  try {
    const payload = jwt.verify(header.slice(7), env.jwtSecret);
    req.user = { id: Number(payload.sub), email: payload.email, role: payload.role };
    return next();
  } catch {
    return sendError(res, { status: 401, code: 'INVALID_TOKEN', message: 'Authentication token is invalid or expired' });
  }
}
