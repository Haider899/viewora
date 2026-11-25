import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller.js';
import { VideoService } from '../services/video.service.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/summary', authenticate, WalletController.getSummary);
router.get('/transactions', authenticate, WalletController.getTransactions);
router.post('/transfer-video-rewards', authenticate, async (req, res, next) => {
  try {
    const amountCents = parseInt(req.body.amountCents);
    const data = await VideoService.transferVideoRewardsToMainBalance(req.user!.userId, amountCents);
    res.json({ success: true, data, message: 'Video rewards transferred to Main Account successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
