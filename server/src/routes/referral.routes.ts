import { Router } from 'express';
import { ReferralController } from '../controllers/referral.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/summary', authenticate, ReferralController.getSummary);

export default router;
