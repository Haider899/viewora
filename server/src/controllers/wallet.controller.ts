import { Request, Response, NextFunction } from 'express';
import { LedgerService } from '../services/ledger.service.js';
import { Currency } from '../types/index.js';

export class WalletController {
  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await LedgerService.getUserWalletSummary(req.user!.userId);
      res.json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 20;
      const currency = req.query.currency as Currency | undefined;

      const result = await LedgerService.getUserTransactions(req.user!.userId, {
        page,
        pageSize,
        currency,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
