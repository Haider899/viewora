import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { JWTPayload, UserRole, UserStatus } from '../types/index.js';

export class AuthService {
  static async register(input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    referralCode?: string;
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

  static async login(input: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
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

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

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
        createdAt: user.createdAt,
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
        createdAt: true,
      },
    });

    if (!user) {
      throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'User profile not found.' };
    }

    return user;
  }

  private static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
    });
  }
}
