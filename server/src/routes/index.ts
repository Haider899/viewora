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
import { authenticate } from '../middleware/auth.js';

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

// Public Theme & Auth Banner Config (Part 1 #3 & Part 2 #3)
router.get('/theme-config', async (req, res, next) => {
  try {
    const [defaultTheme, landingContent] = await Promise.all([
      AdminService.getDefaultTheme(),
      AdminService.getLandingContent(),
    ]);
    res.json({
      success: true,
      data: {
        defaultTheme,
        authBannerImageUrl: (landingContent as any).authBannerImageUrl || '',
      },
    });
  } catch (err) {
    next(err);
  }
});

// Active Live Activity Popups (Member Homepage Left-Edge Loop)
router.get('/live-popups', async (req, res, next) => {
  try {
    const data = await AdminService.getLivePopups(true);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Member Direct Messages from Admin (Proactive Admin Push + Screenshot)
router.get('/messages', authenticate, async (req, res, next) => {
  try {
    const msgs = await AdminService.getDirectMessagesForUser(req.user!.userId);
    res.json({ success: true, data: msgs });
  } catch (err) {
    next(err);
  }
});

router.post('/messages/:id/read', authenticate, async (req, res, next) => {
  try {
    await AdminService.markDirectMessageRead(req.user!.userId, req.params.id);
    res.json({ success: true });
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
