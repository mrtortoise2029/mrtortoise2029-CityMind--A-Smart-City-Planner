import * as authService from '../services/authService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function register(req, res, next) {
  try {
    sendSuccess(res, await authService.register(req.validated.body), { status: 201 });
  } catch (error) { next(error); }
}

export async function login(req, res, next) {
  try {
    sendSuccess(res, await authService.login(req.validated.body));
  } catch (error) { next(error); }
}

export async function me(req, res, next) {
  try {
    sendSuccess(res, await authService.getCurrentUser(req.user.id));
  } catch (error) { next(error); }
}
