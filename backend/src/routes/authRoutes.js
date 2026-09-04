import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

const email = z.string().trim().email().max(190).transform((value) => value.toLowerCase());
const password = z.string().min(8).max(128);
const router = Router();

router.post('/register', validate(z.object({
  name: z.string().trim().min(2).max(120), email, password,
}).strict(), 'body'), controller.register);
router.post('/login', validate(z.object({ email, password }).strict(), 'body'), controller.login);
router.get('/me', authenticate, controller.me);

export default router;
