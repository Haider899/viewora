import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/summary', authenticate, WalletController.getSummary);
router.get('/transactions', authenticate, WalletController.getTransactions);

export default router;
