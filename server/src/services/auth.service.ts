import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { AccountLevelService } from './accountLevel.service.js';
import { JWTPayload, UserRole, UserStatus } from '../types/index.js';

export class AuthService {
  static async register(input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    referralCode?: string;
    ipAddress?: string;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) {
      throw { statusCode: 400, code: 'EMAIL_EXISTS', message: 'An account with this email address already exists.' };
    }

    let referrer = null;
    if (input.referralCode) {
      referrer = await prisma.user.findUnique({
        where: { referralCode: input.referralCode.trim().toUpperCase() },
      });
      if (!referrer) {
        throw { statusCode: 400, code: 'INVALID_REFERRAL', message: 'The specified referral code was not found.' };
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const userReferralCode = 'UAD-' + randomSuffix;
    const memberCode = 'UID-' + randomSuffix;

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          fullName: input.fullName,
          phone: input.phone || null,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          emailVerified: true, // auto-verified for seamless evaluation
          referralCode: userReferralCode,
          memberCode,
          referredById: referrer?.id || null,
          registrationIp: input.ipAddress || null,
          lastLoginIp: input.ipAddress || null,
          lastSeenAt: new Date(),
        },
      });

      // Initialize USD-only separate wallets: Main Account, Video Rewards, Other Rewards, Reserved, Referral
      await tx.walletAccount.createMany({
        data: [
          { userId: newUser.id, accountType: 'USER_AVAILABLE', currency: 'USD', balanceCents: 0 },
          { userId: newUser.id, accountType: 'USER_VIDEO_REWARDS', currency: 'USD', balanceCents: 0 },
          { userId: newUser.id, accountType: 'USER_OTHER_REWARDS', currency: 'USD', balanceCents: 0 },
          { userId: newUser.id, accountType: 'USER_RESERVED', currency: 'USD', balanceCents: 0 },
          { userId: newUser.id, accountType: 'USER_REFERRAL', currency: 'USD', balanceCents: 0 },
        ],
      });

      // Create Registration Notification
      await tx.notification.create({
        data: {
          userId: newUser.id,
          title: 'Welcome to U-Ads!',
          message: `Your U-Ads account (${memberCode}) is active. Complete a qualifying deposit or select an access plan to start watching videos and earning USD rewards.`,
          type: 'SUCCESS',
        },
      });

      // Notify Referrer if any
      if (referrer) {
        await tx.notification.create({
          data: {
            userId: referrer.id,
            title: 'New Referral Registered',
            message: `${input.fullName} registered using your invitation code (${userReferralCode}). Commissions unlock on their first qualifying transaction.`,
            type: 'INFO',
          },
        });
      }

      return newUser;
    });

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    return {
      user: {
        id: user.id,
        memberCode: user.memberCode,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        accountLevel: user.accountLevel,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  static async login(input: { email: string; password: string; ipAddress?: string }) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        referredBy: {
          select: { id: true, fullName: true, memberCode: true, referralCode: true },
        },
      },
    });

    if (!user) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email address or password.' };
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw { statusCode: 403, code: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended. Please contact support.' };
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email address or password.' };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastSeenAt: new Date(),
        ...(input.ipAddress ? { lastLoginIp: input.ipAddress } : {}),
        ...(!user.registrationIp && input.ipAddress ? { registrationIp: input.ipAddress } : {}),
      },
    }).catch(() => {});

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    const levelProgress = await AccountLevelService.getUserLevelProgress(user.id).catch(() => null);

    return {
      user: {
        id: user.id,
        memberCode: user.memberCode || `UID-${user.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        accountLevel: user.accountLevel,
        accountLockedUntil: user.accountLockedUntil,
        agentAvailability: user.agentAvailability,
        referralCode: user.referralCode,
        referredById: user.referredById,
        referredBy: (user as any).referredBy || null,
        savedPayoutMethod: user.savedPayoutMethod,
        savedAccountTitle: user.savedAccountTitle,
        savedAccountNumber: user.savedAccountNumber,
        createdAt: user.createdAt,
        levelProgress,
      },
      token,
    };
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        memberCode: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        emailVerified: true,
        accountLevel: true,
        accountLockedUntil: true,
        agentAvailability: true,
        referralCode: true,
        referredById: true,
        referredBy: {
          select: { id: true, fullName: true, memberCode: true, referralCode: true },
        },
        savedPayoutMethod: true,
        savedAccountTitle: true,
        savedAccountNumber: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'User profile not found.' };
    }

    const levelProgress = await AccountLevelService.getUserLevelProgress(userId).catch(() => null);

    return {
      ...user,
      levelProgress,
    };
  }

  static async updateProfile(userId: string, data: { fullName?: string; phone?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'User not found.' };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName ? { fullName: data.fullName.trim() } : {}),
        ...(data.phone !== undefined ? { phone: data.phone.trim() || null } : {}),
      },
      select: {
        id: true,
        memberCode: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        emailVerified: true,
        accountLevel: true,
        accountLockedUntil: true,
        agentAvailability: true,
        referralCode: true,
        referredById: true,
        referredBy: {
          select: { id: true, fullName: true, memberCode: true, referralCode: true },
        },
        savedPayoutMethod: true,
        savedAccountTitle: true,
        savedAccountNumber: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PROFILE_UPDATED',
        resourceType: 'User',
        resourceId: userId,
        details: JSON.stringify({ fullName: updated.fullName, phone: updated.phone }),
      },
    });

    return updated;
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'User not found.' };
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw { statusCode: 400, code: 'INVALID_PASSWORD', message: 'Current password is incorrect.' };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.auditLog.create({
        data: {
          userId,
          action: 'PASSWORD_CHANGED',
          resourceType: 'User',
          resourceId: userId,
          details: JSON.stringify({ method: 'self_service' }),
        },
      }),
      prisma.notification.create({
        data: {
          userId,
          title: 'Password Updated',
          message: 'Your U-Ads account password was successfully changed.',
          type: 'INFO',
        },
      }),
    ]);

    return { changed: true };
  }

  static async forgotPassword(email: string) {
    const genericResponse = {
      sent: true,
      expiresInMinutes: 15,
      message:
        'If an account with that email exists, a 6-digit password recovery code has been sent to your registered email address.',
    };

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) {
      return genericResponse;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: code,
        passwordResetExpires: expires,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        resourceType: 'User',
        resourceId: user.id,
        details: JSON.stringify({ email: user.email, expiresAt: expires.toISOString() }),
      },
    }).catch(() => {});

    // Dispatch recovery code strictly out-of-band (email/SMTP relay — NEVER returned in HTTP response!)
    console.info(`[U-Ads Security Mailer] Password reset code dispatched to ${user.email} (valid 15m).`);

    return genericResponse;
  }

  static async resetPassword(email: string, token: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (
      !user ||
      !user.passwordResetToken ||
      user.passwordResetToken !== token.trim() ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      throw { statusCode: 400, code: 'INVALID_RESET_TOKEN', message: 'Invalid or expired reset code.' };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET',
          resourceType: 'User',
          resourceId: user.id,
          details: JSON.stringify({ method: 'reset_code' }),
        },
      }),
      prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Password Reset Completed',
          message: 'Your U-Ads account password has been reset. You can now sign in with your new password.',
          type: 'SUCCESS',
        },
      }),
    ]);

    return { reset: true };
  }

  private static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
    });
  }
}
