import { Router } from 'express';
import {
  AuthController,
  loginSchema,
  registerSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../controllers/auth.controller.js';
import { validateRequest } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', validateRequest(registerSchema), AuthController.register);
router.post('/login', validateRequest(loginSchema), AuthController.login);
router.post('/forgot-password', validateRequest(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', validateRequest(resetPasswordSchema), AuthController.resetPassword);
router.get('/me', authenticate, AuthController.me);
router.patch('/profile', authenticate, validateRequest(updateProfileSchema), AuthController.updateProfile);
router.post('/change-password', authenticate, validateRequest(changePasswordSchema), AuthController.changePassword);

export default router;
