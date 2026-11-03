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
}
