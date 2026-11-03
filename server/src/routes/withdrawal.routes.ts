import { Router } from 'express';
import { WithdrawalController, withdrawalRequestSchema } from '../controllers/withdrawal.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

router.post('/request', authenticate, validateRequest(withdrawalRequestSchema), WithdrawalController.requestWithdrawal);
router.get('/my-withdrawals', authenticate, WithdrawalController.getMyWithdrawals);

export default router;
