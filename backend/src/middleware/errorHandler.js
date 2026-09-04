import { ZodError } from 'zod';
import { sendError } from '../utils/apiResponse.js';

export function notFoundHandler(req, res) {
  return sendError(res, {
    status: 404,
    code: 'ROUTE_NOT_FOUND',
    message: 'Route not found',
  });
}

export function errorHandler(error, req, res, next) {
  if (error instanceof ZodError) {
    return sendError(res, {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request',
      details: error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
    });
  }

  const status = error.status ?? 500;
  if (status >= 500) console.error(error);
  return sendError(res, {
    status,
    code: status >= 500 ? 'INTERNAL_ERROR' : (error.code ?? 'REQUEST_ERROR'),
    message: status >= 500 ? 'Internal server error' : error.message,
  });
}