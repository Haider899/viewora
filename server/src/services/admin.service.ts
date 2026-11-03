import prisma from '../lib/prisma.js';
import { LedgerService } from './ledger.service.js';
import { DepositStatus, WithdrawalStatus } from '../types/index.js';

export class AdminService {
  static async getDashboardKpis() {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      pendingDeposits,
      approvedDeposits,
      pendingWithdrawals,
      completedWithdrawals,
      totalVideos,
      totalViews,
      ledgerAudit,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.depositRequest.findMany({ where: { status: DepositStatus.PENDING } }),
      prisma.depositRequest.findMany({ where: { status: DepositStatus.APPROVED } }),
      prisma.withdrawalRequest.findMany({ where: { status: WithdrawalStatus.PENDING } }),
      prisma.withdrawalRequest.findMany({ where: { status: WithdrawalStatus.COMPLETED } }),
      prisma.video.count(),
      prisma.videoSession.count({ where: { completed: true } }),
      LedgerService.auditLedgerIntegrity(),
    ]);

    const sumByCurrency = (items: Array<{ amountCents: number; currency: string }>) => {
      const res = { USD: 0, PKR: 0 };
      for (const item of items) {
        if (item.currency === 'USD') res.USD += item.amountCents;
        else if (item.currency === 'PKR') res.PKR += item.amountCents;
      }
      return res;
    };

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      pendingDepositsCount: pendingDeposits.length,
      pendingDepositsCents: sumByCurrency(pendingDeposits),
      verifiedDepositsCents: sumByCurrency(approvedDeposits),
      pendingWithdrawalsCount: pendingWithdrawals.length,
      pendingWithdrawalsCents: sumByCurrency(pendingWithdrawals),
      completedPayoutsCents: sumByCurrency(completedWithdrawals),
      totalVideosCount: totalVideos,
      totalViewsCount: totalViews,
      ledgerIntegrity: ledgerAudit.isValid,
      ledgerAnomaliesCount: ledgerAudit.anomalies.length,
    };
  }

  static async getUsers(options: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (options.role) where.role = options.role;
    if (options.status) where.status = options.status;
    if (options.search) {
      where.OR = [
        { email: { contains: options.search } },
        { fullName: { contains: options.search } },
        { referralCode: { contains: options.search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          referralCode: true,
          createdAt: true,
          packagePurchases: {
            where: { status: 'ACTIVE' },
            select: { packageName: true, priceCentsPaid: true, currency: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, pageSize };
  }

  static async updateUserStatus(adminId: string, userId: string, status: string, reason: string) {
    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      throw { statusCode: 400, code: 'INVALID_STATUS', message: 'Status must be ACTIVE or SUSPENDED.' };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'User not found.' };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: `USER_${status}`,
        resourceType: 'User',
        resourceId: userId,
        details: JSON.stringify({ previousStatus: user.status, newStatus: status, reason }),
      },
    });

    return updated;
  }

  static async getSystemSettings() {
    const rate = await prisma.systemSetting.findUnique({ where: { key: 'EXCHANGE_RATE_USD_PKR' } });
    if (!rate) {
      await prisma.systemSetting.create({
        data: {
          key: 'EXCHANGE_RATE_USD_PKR',
          value: '280',
          description: 'Official platform exchange rate (1 USD = X PKR) for package pricing and financial conversions',
        },
      });
    }

    return await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  static async updateSystemSetting(adminId: string, key: string, value: string) {
    const updated = await prisma.systemSetting.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_SYSTEM_SETTING',
        resourceType: 'SystemSetting',
        resourceId: key,
        details: JSON.stringify({ key, value }),
      },
    });

    return updated;
  }

  static async getAuditLogs(page = 1, pageSize = 30) {
    const skip = (page - 1) * pageSize;
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: {
          user: { select: { email: true, fullName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.auditLog.count(),
    ]);

    return { logs, total, page, pageSize };
  }
}
