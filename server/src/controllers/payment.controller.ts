import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PaymentService } from '../services/payment.service.js';

export const depositRequestSchema = z.object({
  paymentMethodId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  currency: z.enum(['USD', 'PKR']),
  transactionRef: z.string().min(4, 'Transaction reference/hash is required'),
  senderPhone: z.string().optional(),
  senderName: z.string().optional(),
  proofImageUrl: z.string().optional(),
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
