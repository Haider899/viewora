import { Router } from 'express';
import {
  AdminController,
  reviewDepositSchema,
  reviewWithdrawalSchema,
  updateSettingSchema,
  updateUserStatusSchema,
} from '../controllers/admin.controller.js';
import {
  SupportController,
  adminReplySchema,
  adminStatusSchema,
} from '../controllers/support.controller.js';
import {
  AdminVideoController,
  createVideoSchema,
  updateVideoSchema,
} from '../controllers/adminVideo.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { UserRole } from '../types/index.js';
import { CompanyDocumentService } from '../services/companyDocument.service.js';
import { AccountLevelService } from '../services/accountLevel.service.js';
import { AdminService } from '../services/admin.service.js';
import { PackageService } from '../services/package.service.js';
import { ReferralService } from '../services/referral.service.js';
import { NotificationService } from '../services/notification.service.js';

const router = Router();

// Protect all admin routes with authentication
router.use(authenticate);

// KPIs & Analytics (Super Admin & Finance Admin)
router.get(
  '/kpis',
  requireRole(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN),
  AdminController.getKpis
);

// User Management
router.get(
  '/users',
  requireRole(UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT, UserRole.FINANCE_ADMIN),
  AdminController.getUsers
);
router.get(
  '/users/:userId/financial-dossier',
  requireRole(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.SUPPORT_AGENT),
  AdminController.getUserFinancialDossier
);
router.patch(
  '/users/:id/status',
  requireRole(UserRole.SUPER_ADMIN),
  validateRequest(updateUserStatusSchema),
  AdminController.updateUserStatus
);

// Finance Review: Deposits (Super Admin & Finance Admin ONLY. Support excluded!)
router.get(
  '/deposits',
  requireRole(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN),
  AdminController.getDeposits
);
router.post(
  '/deposits/:id/review',
  requireRole(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN),
  validateRequest(reviewDepositSchema),
  AdminController.reviewDeposit
);

// Finance Review: Withdrawals (Super Admin & Finance Admin ONLY)
router.get(
  '/withdrawals',
  requireRole(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN),
  AdminController.getWithdrawals
);
router.post(
  '/withdrawals/:id/review',
  requireRole(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN),
  validateRequest(reviewWithdrawalSchema),
  AdminController.reviewWithdrawal
);

// Payment Channels Management (Create, Edit, List, Delete - Super Admin & Finance Admin)
router.get(
  '/payment-methods',
  requireRole(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN),
  AdminController.getPaymentMethods
);
router.post(
  '/payment-methods',
  requireRole(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN),
  AdminController.createPaymentMethod
);
router.put(
  '/payment-methods/:id',
  requireRole(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN),
  AdminController.updatePaymentMethod
);
router.delete(
  '/payment-methods/:id',
  requireRole(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN),
  AdminController.deletePaymentMethod
);

// Wallet Management (Manual Credit/Debit Adjustment with Ledger & Audit Trail)
router.post(
  '/wallets/adjust',
  requireRole(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN),
  async (req, res, next) => {
    try {
      const result = await AdminService.adjustUserWallet(req.user!.userId, req.body);
      res.json({ success: true, data: result, message: 'Wallet adjusted and recorded in audit ledger.' });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        error: { message: err.message || 'Wallet adjustment failed.' },
      });
    }
  }
);

// Packages & Access CRUD Management
router.get('/packages', requireRole(UserRole.SUPER_ADMIN, UserRole.CONTENT_ADMIN), async (req, res, next) => {
  try {
    const pkgs = await PackageService.getAllPackages(false);
    res.json({ success: true, data: pkgs });
  } catch (err) { next(err); }
});

router.post('/packages', requireRole(UserRole.SUPER_ADMIN, UserRole.CONTENT_ADMIN), async (req, res, next) => {
  try {
    const pkg = await PackageService.createPackage(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: pkg, message: 'Package created successfully.' });
  } catch (err) { next(err); }
});

router.put('/packages/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.CONTENT_ADMIN), async (req, res, next) => {
  try {
    const pkg = await PackageService.updatePackage(req.user!.userId, req.params.id, req.body);
    res.json({ success: true, data: pkg, message: 'Package updated successfully.' });
  } catch (err) { next(err); }
});

router.delete('/packages/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.CONTENT_ADMIN), async (req, res, next) => {
  try {
    const pkg = await PackageService.deletePackage(req.user!.userId, req.params.id);
    res.json({ success: true, data: pkg, message: 'Package removed/deactivated.' });
  } catch (err) { next(err); }
});

// Referrals & Ranks Configuration
router.get('/referral-config', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const cfg = await ReferralService.getReferralConfig();
    res.json({ success: true, data: cfg });
  } catch (err) { next(err); }
});

router.put('/referral-config', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const cfg = await ReferralService.updateReferralConfig(req.user!.userId, req.body);
    res.json({ success: true, data: cfg, message: 'Referral & Rank configuration updated.' });
  } catch (err) { next(err); }
});

// Rewards & Bonuses Configuration
router.get('/bonus-settings', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const settings = await AdminService.getBonusSettings();
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
});

router.put('/bonus-settings', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const settings = await AdminService.updateBonusSettings(req.user!.userId, req.body);
    res.json({ success: true, data: settings, message: 'Bonus settings saved successfully.' });
  } catch (err) { next(err); }
});

// Notification Settings Management
router.get('/notification-settings', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const settings = await NotificationService.getSettings();
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
});

router.put('/notification-settings', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const settings = await NotificationService.updateSettings(req.user!.userId, req.body);
    res.json({ success: true, data: settings, message: 'Notification preferences updated.' });
  } catch (err) { next(err); }
});

// Landing Page CMS Content Management
router.get('/landing-content', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const content = await AdminService.getLandingContent();
    res.json({ success: true, data: content });
  } catch (err) { next(err); }
});

router.put('/landing-content', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const content = await AdminService.updateLandingContent(req.user!.userId, req.body);
    res.json({ success: true, data: content, message: 'Landing page content updated successfully.' });
  } catch (err) { next(err); }
});

// Financial & Operational Reports
router.get('/reports', requireRole(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN), async (req, res, next) => {
  try {
    const report = await AdminService.getReportsSummary(req.query.from as string, req.query.to as string);
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

// System Settings (Super Admin ONLY)
router.get('/settings', requireRole(UserRole.SUPER_ADMIN), AdminController.getSettings);
router.put(
  '/settings',
  requireRole(UserRole.SUPER_ADMIN),
  validateRequest(updateSettingSchema),
  AdminController.updateSetting
);

// Immutable Audit Logs (Super Admin ONLY — read-only, never editable or deletable)
router.get('/audit-logs', requireRole(UserRole.SUPER_ADMIN), AdminController.getAuditLogs);

// Live Chat & Support Ticket Desk & Agent Management
router.get(
  '/support/conversations',
  requireRole(UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT, UserRole.FINANCE_ADMIN),
  SupportController.adminGetConversations
);
router.get(
  '/support/conversations/:id',
  requireRole(UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT, UserRole.FINANCE_ADMIN),
  SupportController.adminGetConversation
);
router.post(
  '/support/conversations/:id/reply',
  requireRole(UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT),
  validateRequest(adminReplySchema),
  SupportController.adminReply
);
router.patch(
  '/support/conversations/:id/status',
  requireRole(UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT),
  validateRequest(adminStatusSchema),
  SupportController.adminUpdateStatus
);
router.post(
  '/support/conversations/:id/escalate-to-admin',
  requireRole(UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT),
  SupportController.adminEscalateToSuperAdmin
);

// Support Agent Management (Create / List / Activate-Deactivate / Remove - Max 10 Agents)
router.get('/support/agents', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const agents = await AdminService.getSupportAgents();
    res.json({ success: true, data: agents });
  } catch (err) { next(err); }
});

router.post('/support/agents', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const agent = await AdminService.createSupportAgent(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: agent, message: 'Support agent added successfully.' });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: { message: err.message || 'Failed to add agent' } });
  }
});

router.delete('/support/agents/:id', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const result = await AdminService.removeSupportAgent(req.user!.userId, req.params.id);
    res.json({ success: true, data: result, message: 'Support agent removed.' });
  } catch (err) { next(err); }
});

router.patch('/support/agents/:id/status', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await AdminService.toggleSupportAgentStatus(req.user!.userId, req.params.id, status);
    res.json({ success: true, data: result, message: `Support agent marked ${status}.` });
  } catch (err) { next(err); }
});

router.put('/support/agent-status', requireRole(UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT), async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await AdminService.updateAgentAvailability(req.user!.userId, status);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// Video Management & User Assignments (Super Admin & Content Admin)
router.get(
  '/videos',
  requireRole(UserRole.SUPER_ADMIN, UserRole.CONTENT_ADMIN),
  AdminVideoController.getVideos
);
router.post(
  '/videos',
  requireRole(UserRole.SUPER_ADMIN, UserRole.CONTENT_ADMIN),
  validateRequest(createVideoSchema),
  AdminVideoController.createVideo
);
router.put(
  '/videos/:id',
  requireRole(UserRole.SUPER_ADMIN, UserRole.CONTENT_ADMIN),
  validateRequest(updateVideoSchema),
  AdminVideoController.updateVideo
);
router.delete(
  '/videos/:id',
  requireRole(UserRole.SUPER_ADMIN, UserRole.CONTENT_ADMIN),
  AdminVideoController.deleteVideo
);

// Company Documents & Public Credentials
router.get('/documents', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const docs = await CompanyDocumentService.getAllDocumentsAdmin();
    res.json({ success: true, data: docs });
  } catch (err) { next(err); }
});
router.post('/documents', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const doc = await CompanyDocumentService.createDocument(req.body);
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
});
router.put('/documents/:id', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const doc = await CompanyDocumentService.updateDocument(req.params.id, req.body);
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
});
router.delete('/documents/:id', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const doc = await CompanyDocumentService.deleteDocument(req.params.id);
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
});

// Account Level Configuration & Manual Adjustment
router.get('/levels', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const levels = await AccountLevelService.getAllLevels();
    res.json({ success: true, data: levels });
  } catch (err) { next(err); }
});
router.put('/levels/:levelKey', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const updated = await AccountLevelService.updateLevel(req.params.levelKey, req.body);
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});
router.post('/users/:id/level', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { newLevel, reason } = req.body;
    const result = await AccountLevelService.manualAdjustUserLevel(
      req.params.id,
      newLevel,
      reason || 'Manual Admin Adjustment',
      req.user!.userId
    );
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// Account Lock / Unlock Presets
router.post('/users/:id/lock', requireRole(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN), async (req, res, next) => {
  try {
    const { durationDays, reason } = req.body;
    const result = await AccountLevelService.lockUserAccount(
      req.params.id,
      parseInt(durationDays) || 60,
      reason || 'Account policy lock',
      req.user!.userId
    );
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});
router.post('/users/:id/unlock', requireRole(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN), async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await AccountLevelService.unlockUserAccount(
      req.params.id,
      reason || 'Early unlock authorization',
      req.user!.userId
    );
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// User Role Management
router.post('/users/:id/role', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { role, reason } = req.body;
    const result = await AdminService.updateUserRole(
      req.user!.userId,
      req.params.id,
      role,
      reason
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({
      success: false,
      error: { message: err.message || 'Failed to update user role' },
    });
  }
});

// Daily Level Bonus Batch Execution & History
router.get('/bonuses/batches', requireRole(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN), async (req, res, next) => {
  try {
    const data = await AccountLevelService.getDailyBonusBatches();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/bonuses/daily-batch', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const result = await AccountLevelService.processDailyLevelBonuses(req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

export default router;
