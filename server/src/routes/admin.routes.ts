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

export default router;

