import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';
import { extractClientIp } from '../middleware/auth.js';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  referralCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().min(4),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const clientIp = extractClientIp(req);
      const result = await AuthService.register({ ...req.body, ipAddress: clientIp });
      res.status(201).json({
        success: true,
        data: result,
        message: 'Account registered successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const clientIp = extractClientIp(req);
      const result = await AuthService.login({ ...req.body, ipAddress: clientIp });
      res.json({
        success: true,
        data: result,
        message: 'Logged in successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.getProfile(req.user!.userId);
      res.json({
        success: true,
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.updateProfile(req.user!.userId, req.body);
      res.json({
        success: true,
        data: { user },
        message: 'Profile updated successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.changePassword(
        req.user!.userId,
        req.body.currentPassword,
        req.body.newPassword
      );
      res.json({
        success: true,
        data: result,
        message: 'Password changed successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.forgotPassword(req.body.email);
      res.json({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.resetPassword(
        req.body.email,
        req.body.token,
        req.body.newPassword
      );
      res.json({
        success: true,
        data: result,
        message: 'Password reset successfully. You may now sign in.',
      });
    } catch (err) {
      next(err);
    }
  }
}
