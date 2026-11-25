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
import notificationRoutes from './notification.routes.js';
import { CompanyDocumentService } from '../services/companyDocument.service.js';
import { AdminService } from '../services/admin.service.js';

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
router.use('/notifications', notificationRoutes);

// Public Verified Corporate Documents & Licenses
router.get('/documents', async (req, res, next) => {
  try {
    const docs = await CompanyDocumentService.getPublicDocuments();
    res.json({ success: true, data: docs });
  } catch (err) {
    next(err);
  }
});

// Public Landing Page Content (Editable by Admin)
router.get('/landing-content', async (req, res, next) => {
  try {
    const content = await AdminService.getLandingContent();
    res.json({ success: true, data: content });
  } catch (err) {
    next(err);
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'U-Ads API',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
  });
});

export default router;
