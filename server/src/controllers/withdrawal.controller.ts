import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { WithdrawalService } from '../services/withdrawal.service.js';

export const withdrawalRequestSchema = z.object({
  amountCents: z.number().int().positive(),
  currency: z.enum(['USD', 'PKR']),
  payoutMethod: z.string().min(2),
  accountTitle: z.string().min(2),
  accountNumber: z.string().min(4),
});

export class WithdrawalController {
  static async requestWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const withdrawal = await WithdrawalService.requestWithdrawal(req.user!.userId, req.body);
      res.status(201).json({
        success: true,
        data: withdrawal,
        message: 'Withdrawal request created. Funds reserved pending verification.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMyWithdrawals(req: Request, res: Response, next: NextFunction) {
    try {
      const withdrawals = await WithdrawalService.getUserWithdrawals(req.user!.userId);
      res.json({
        success: true,
        data: withdrawals,
      });
    } catch (err) {
      next(err);
    }
  }
}
