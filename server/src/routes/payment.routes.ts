import { Router } from 'express';
import { PaymentController, depositRequestSchema } from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

router.get('/methods', PaymentController.getMethods);
router.post('/deposit', authenticate, validateRequest(depositRequestSchema), PaymentController.submitDeposit);
router.get('/my-deposits', authenticate, PaymentController.getMyDeposits);

export default router;
