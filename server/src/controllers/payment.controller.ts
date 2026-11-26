import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PaymentService } from '../services/payment.service.js';

export const depositRequestSchema = z
  .object({
    paymentMethodId: z.string().uuid(),
    amountCents: z.number().int().positive().optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    amountUsd: z.union([z.string(), z.number()]).optional(),
    currency: z.enum(['USD', 'PKR']).default('USD'),
    transactionRef: z.string().min(4, 'Transaction reference/hash is required'),
    senderPhone: z.string().optional(),
    senderName: z.string().optional(),
    proofImageUrl: z.string().optional(),
  })
  .transform((data, ctx) => {
    let resolvedCents = data.amountCents;
    if (!resolvedCents) {
      const raw = data.amount ?? data.amountUsd;
      if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
        const cleaned = String(raw).replace(/[$,\s]/g, '');
        const parsed = Number(cleaned);
        if (Number.isFinite(parsed) && parsed > 0) {
          resolvedCents = Math.round(parsed * 100);
        }
      }
    }
    if (!resolvedCents || !Number.isInteger(resolvedCents) || resolvedCents <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amountCents'],
        message: 'Enter a valid USD amount greater than $0.00.',
      });
      return z.NEVER;
    }
    return {
      ...data,
      amountCents: resolvedCents,
    };
  });

export class PaymentController {
  static async getMethods(req: Request, res: Response, next: NextFunction) {
    try {
      const methods = await PaymentService.getActivePaymentMethods();
      res.json({
        success: true,
        data: methods,
      });
    } catch (err) {
      next(err);
    }
  }

  static async submitDeposit(req: Request, res: Response, next: NextFunction) {
    try {
      const deposit = await PaymentService.submitDepositRequest(req.user!.userId, req.body);
      res.status(201).json({
        success: true,
        data: deposit,
        message: 'Deposit request submitted successfully. Pending verification by finance administration.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMyDeposits(req: Request, res: Response, next: NextFunction) {
    try {
      const deposits = await PaymentService.getUserDeposits(req.user!.userId);
      res.json({
        success: true,
        data: deposits,
      });
    } catch (err) {
      next(err);
    }
  }
}
