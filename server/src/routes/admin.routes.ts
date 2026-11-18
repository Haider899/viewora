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

const router = Router();

// Protect all admin routes with authentication
router.use(authenticate);

// KPIs & Analytics (Super Admin & Finance Admin)
router.get(
  '/kpis',
  requireRole(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN),
  AdminController.getKpis
);

// User Management (Super Admin & Support Agent can view; only Super Admin can alter status)
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

// Finance Review: Deposits (Super Admin & Finance Admin ONLY. Support/Content excluded!)
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

// Payment Methods & Gateway Configuration (Super Admin & Finance Admin)
router.get(
  '/payment-methods',
  requireRole(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN),
  AdminController.getPaymentMethods
);
router.put(
  '/payment-methods/:id',
  requireRole(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN),
  AdminController.updatePaymentMethod
);

// System Settings (Super Admin ONLY)
router.get('/settings', requireRole(UserRole.SUPER_ADMIN), AdminController.getSettings);
router.put(
  '/settings',
  requireRole(UserRole.SUPER_ADMIN),
  validateRequest(updateSettingSchema),
  AdminController.updateSetting
);

// Audit Logs (Super Admin ONLY)
router.get('/audit-logs', requireRole(UserRole.SUPER_ADMIN), AdminController.getAuditLogs);

// Live Chat & Support Ticket Desk (Super Admin & Support Agent)
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

// -------------------------------------------------------------
// COMPANY DOCUMENTS & PUBLIC CREDENTIALS (SECTION 2.1)
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// ACCOUNT LEVEL CONFIGURATION & MANUAL ADJUSTMENT (SECTION 3)
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// ACCOUNT LOCK / UNLOCK PRESETS (SECTION 11: 60, 100, 360 DAYS)
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// USER ROLE MANAGEMENT WITH 10 SUPPORT AGENTS CAP (SECTION 12)
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// AGENT AVAILABILITY STATUS (ONLINE / BUSY / OFFLINE)
// -------------------------------------------------------------
router.put('/support/agent-status', requireRole(UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT), async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await AdminService.updateAgentAvailability(req.user!.userId, status);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// -------------------------------------------------------------
// DAILY LEVEL BONUS BATCH EXECUTION (SECTION 5.1)
// -------------------------------------------------------------
router.post('/bonuses/daily-batch', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const result = await AccountLevelService.processDailyLevelBonuses(req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

export default router;

