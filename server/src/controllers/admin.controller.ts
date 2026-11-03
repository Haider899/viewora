import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AdminService } from '../services/admin.service.js';
import { PaymentService } from '../services/payment.service.js';
import { WithdrawalService } from '../services/withdrawal.service.js';

export const reviewDepositSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().optional(),
});

export const reviewWithdrawalSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'COMPLETE']),
  payoutRef: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  reason: z.string().min(3),
});

export const updateSettingSchema = z.object({
  key: z.string().min(2),
  value: z.string().min(1),
});

export class AdminController {
  static async getKpis(req: Request, res: Response, next: NextFunction) {
    try {
      const kpis = await AdminService.getDashboardKpis();
      res.json({
        success: true,
        data: kpis,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const role = req.query.role as string | undefined;
      const status = req.query.status as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;

      const result = await AdminService.getUsers({ search, role, status, page });
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.updateUserStatus(
        req.user!.userId,
        req.params.id,
        req.body.status,
        req.body.reason
      );
      res.json({
        success: true,
        data: result,
        message: `User status updated to ${req.body.status}.`,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDeposits(req: Request, res: Response, next: NextFunction) {
    try {
      const status = (req.query.status as string) || 'PENDING';
      const deposits = await PaymentService.getDepositsForReview(status);
      res.json({
        success: true,
        data: deposits,
      });
    } catch (err) {
      next(err);
    }
  }

  static async reviewDeposit(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PaymentService.reviewDeposit(
        req.user!.userId,
        req.params.id,
        req.body.action,
        req.body.rejectionReason
      );
      res.json({
        success: true,
        data: result,
        message: `Deposit request ${req.body.action.toLowerCase()}ed successfully.`,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getWithdrawals(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const withdrawals = await WithdrawalService.getWithdrawalsForReview(status);
      res.json({
        success: true,
        data: withdrawals,
      });
    } catch (err) {
      next(err);
    }
  }

  static async reviewWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await WithdrawalService.reviewWithdrawal(
        req.user!.userId,
        req.params.id,
        req.body.action,
        {
          payoutRef: req.body.payoutRef,
          rejectionReason: req.body.rejectionReason,
        }
      );
      res.json({
        success: true,
        data: result,
        message: `Withdrawal action '${req.body.action}' processed successfully.`,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await AdminService.getSystemSettings();
      res.json({
        success: true,
        data: settings,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateSetting(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.updateSystemSetting(
        req.user!.userId,
        req.body.key,
        req.body.value
      );
      res.json({
        success: true,
        data: result,
        message: 'System setting updated successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPaymentMethods(req: Request, res: Response, next: NextFunction) {
    try {
      const methods = await PaymentService.getAllPaymentMethods();
      res.json({
        success: true,
        data: methods,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updatePaymentMethod(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PaymentService.updatePaymentMethod(
        req.user!.userId,
        req.params.id,
        req.body
      );
      res.json({
        success: true,
        data: result,
        message: 'Payment channel details updated successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const logs = await AdminService.getAuditLogs(page);
      res.json({
        success: true,
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  }
}
