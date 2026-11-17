import { Request, Response, NextFunction } from 'express';
import { ReferralService } from '../services/referral.service.js';

export class ReferralController {
  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await ReferralService.getUserReferralSummary(req.user!.userId);
      res.json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getRankProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const progress = await ReferralService.getReferralRankAndProgress(req.user!.userId);
      res.json({
        success: true,
        data: progress,
      });
    } catch (err) {
      next(err);
    }
  }

  static async transferToMainBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const { amountCents } = req.body;
      const parsedAmount = parseInt(amountCents);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid transfer amount. Must be greater than zero.' },
        });
      }

      const result = await ReferralService.transferReferralToMainBalance(req.user!.userId, parsedAmount);
      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Transfer failed.' },
      });
    }
  }
}
