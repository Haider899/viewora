import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PackageService } from '../services/package.service.js';

export const purchaseSchema = z.object({
  packageId: z.string().uuid(),
  currency: z.enum(['USD', 'PKR']).optional(),
});

export class PackageController {
  static async getPackages(req: Request, res: Response, next: NextFunction) {
    try {
      const packages = await PackageService.getAllPackages(true);
      res.json({
        success: true,
        data: packages,
      });
    } catch (err) {
      next(err);
    }
  }

  static async purchase(req: Request, res: Response, next: NextFunction) {
    try {
      const purchase = await PackageService.purchasePackageWithWallet(
        req.user!.userId,
        req.body.packageId,
        req.body.currency || 'USD'
      );
      res.json({
        success: true,
        data: purchase,
        message: 'Package purchased successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMyPurchases(req: Request, res: Response, next: NextFunction) {
    try {
      const purchases = await PackageService.getUserPurchases(req.user!.userId);
      res.json({
        success: true,
        data: purchases,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMyActivePackage(req: Request, res: Response, next: NextFunction) {
    try {
      const active = await PackageService.getUserActivePackage(req.user!.userId);
      res.json({
        success: true,
        data: active,
      });
    } catch (err) {
      next(err);
    }
  }
}
