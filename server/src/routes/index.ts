import { Router } from 'express';
import authRoutes from './auth.routes.js';
import packageRoutes from './package.routes.js';
import videoRoutes from './video.routes.js';
import walletRoutes from './wallet.routes.js';
import paymentRoutes from './payment.routes.js';
import withdrawalRoutes from './withdrawal.routes.js';
import referralRoutes from './referral.routes.js';
import adminRoutes from './admin.routes.js';
import supportRoutes from './support.routes.js';
import { CompanyDocumentService } from '../services/companyDocument.service.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/packages', packageRoutes);
router.use('/videos', videoRoutes);
router.use('/wallet', walletRoutes);
router.use('/payments', paymentRoutes);
router.use('/withdrawals', withdrawalRoutes);
router.use('/referrals', referralRoutes);
router.use('/admin', adminRoutes);
router.use('/support', supportRoutes);

// Public Verified Corporate Documents & Licenses (Section 2.1)
router.get('/documents', async (req, res, next) => {
  try {
    const docs = await CompanyDocumentService.getPublicDocuments();
    res.json({ success: true, data: docs });
  } catch (err) {
    next(err);
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'VistaraX API',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
  });
});

export default router;
