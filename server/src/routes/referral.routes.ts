import { Router } from 'express';
import { ReferralController } from '../controllers/referral.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/summary', authenticate, ReferralController.getSummary);
router.get('/rank-progress', authenticate, ReferralController.getRankProgress);
router.post('/transfer-to-account', authenticate, ReferralController.transferToMainBalance);

export default router;
