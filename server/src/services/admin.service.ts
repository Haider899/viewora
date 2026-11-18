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

  static async updateUserRole(adminId: string, userId: string, role: string, reason?: string) {
    const validRoles = ['SUPER_ADMIN', 'FINANCE_ADMIN', 'CONTENT_ADMIN', 'SUPPORT_AGENT', 'USER'];
    if (!validRoles.includes(role)) {
      throw { statusCode: 400, code: 'INVALID_ROLE', message: 'Invalid role specified.' };
    }

    // Section 12: Strict limit of maximum 10 Customer Support Agents
    if (role === 'SUPPORT_AGENT') {
      const activeAgentsCount = await prisma.user.count({
        where: { role: 'SUPPORT_AGENT', status: 'ACTIVE', id: { not: userId } },
      });
      if (activeAgentsCount >= 10) {
        throw {
          statusCode: 400,
          code: 'SUPPORT_AGENT_LIMIT_REACHED',
          message: 'Maximum limit reached: Only 10 Customer Support Agents are permitted as per system specification.',
        };
      }
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'User not found.' };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'USER_ROLE_UPDATED',
        resourceType: 'User',
        resourceId: userId,
        details: JSON.stringify({ previousRole: user.role, newRole: role, reason }),
      },
    });

    return updated;
  }

  static async updateAgentAvailability(userId: string, status: string) {
    if (!['ONLINE', 'BUSY', 'OFFLINE'].includes(status)) {
      throw { statusCode: 400, code: 'INVALID_STATUS', message: 'Status must be ONLINE, BUSY, or OFFLINE.' };
    }
    return await prisma.user.update({
      where: { id: userId },
      data: { agentAvailability: status },
    });
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

  /**
   * Generates a comprehensive financial audit dossier and activity history for any user.
   * Required for administrative review before settling withdrawals (Audio 2).
   */
  static async getUserFinancialDossier(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        accountLevel: true,
        referralCode: true,
        createdAt: true,
        referredBy: {
          select: { id: true, fullName: true, email: true, referralCode: true },
        },
      },
    });

    if (!user) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'User not found.' };
    }

    // 1. Double-Entry Balances Summary
    const balanceSummary = await LedgerService.getUserWalletSummary(userId);
    const usdSummary = balanceSummary.USD || {
      availableCents: 0,
      reservedCents: 0,
      referralCents: 0,
      totalCents: 0,
    };

    // 2. Deposits History
    const deposits = await prisma.depositRequest.findMany({
      where: { userId },
      include: {
        paymentMethod: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Withdrawals History
    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // 4. Video Watch Reward Claims
    const videoClaims = await prisma.rewardClaim.findMany({
      where: { userId },
      include: {
        video: { select: { title: true, durationSeconds: true, category: true } },
      },
      orderBy: { claimedAt: 'desc' },
    });

    // 5. Direct Referrals
    const directReferrals = await prisma.user.findMany({
      where: { referredById: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        accountLevel: true,
        status: true,
        isQualifiedReferral: true,
        createdAt: true,
        depositRequests: {
          where: { status: 'APPROVED' },
          select: { amountCents: true, currency: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 6. User Transactions / Ledger Entries
    const userTransactions = await LedgerService.getUserTransactions(userId, { pageSize: 50 });

    // Aggregate totals
    const totalDepositsApprovedUSD = deposits
      .filter((d) => d.status === 'APPROVED')
      .reduce((sum, d) => sum + (d.currency === 'USD' ? d.amountCents : Math.round(d.amountCents / 280)), 0);

    const totalWithdrawalsPaidUSD = withdrawals
      .filter((w) => w.status === 'COMPLETED')
      .reduce((sum, w) => sum + (w.currency === 'USD' ? w.amountCents : Math.round(w.amountCents / 280)), 0);

    const pendingWithdrawalUSD = withdrawals
      .filter((w) => w.status === 'PENDING')
      .reduce((sum, w) => sum + (w.currency === 'USD' ? w.amountCents : Math.round(w.amountCents / 280)), 0);

    const totalVideoRewardsUSD = videoClaims.reduce((sum, c) => sum + c.amountCents, 0);

    const qualifiedReferralsCount = directReferrals.filter((r) => {
      const depSum = r.depositRequests.reduce(
        (s: number, d: { amountCents: number; currency: string }) =>
          s + (d.currency === 'USD' ? d.amountCents : Math.round(d.amountCents / 280)),
        0
      );
      return r.isQualifiedReferral || depSum >= 5000; // minimum $50 qualifying
    }).length;

    let referralRank = 'New';
    if (qualifiedReferralsCount >= 200) referralRank = 'Rank 5';
    else if (qualifiedReferralsCount >= 100) referralRank = 'Rank 4';
    else if (qualifiedReferralsCount >= 40) referralRank = 'Diamond';
    else if (qualifiedReferralsCount >= 15) referralRank = 'Platinum';
    else if (qualifiedReferralsCount >= 5) referralRank = 'Gold';

    return {
      user: {
        ...user,
        referralRank,
      },
      balances: {
        availableUSD: usdSummary.availableCents / 100,
        reservedUSD: usdSummary.reservedCents / 100,
        referralUSD: usdSummary.referralCents / 100,
        totalUSD: usdSummary.totalCents / 100,
      },
      totals: {
        totalDepositsApprovedUSD: totalDepositsApprovedUSD / 100,
        totalWithdrawalsPaidUSD: totalWithdrawalsPaidUSD / 100,
        totalVideoRewardsUSD: totalVideoRewardsUSD / 100,
        pendingWithdrawalUSD: pendingWithdrawalUSD / 100,
      },
      deposits: deposits.map((d) => ({
        id: d.id,
        amountUSD: (d.currency === 'USD' ? d.amountCents : Math.round(d.amountCents / 280)) / 100,
        rawAmount: d.amountCents / 100,
        currency: d.currency,
        gateway: d.paymentMethod?.name || 'Manual Gateway',
        status: d.status,
        transactionRef: d.transactionRef,
        proofImageUrl: d.proofImageUrl,
        rejectionReason: d.rejectionReason,
        createdAt: d.createdAt,
        reviewedAt: d.reviewedAt,
      })),
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amountUSD: (w.currency === 'USD' ? w.amountCents : Math.round(w.amountCents / 280)) / 100,
        rawAmount: w.amountCents / 100,
        currency: w.currency,
        payoutMethod: w.payoutMethod,
        accountTitle: w.accountTitle,
        accountNumber: w.accountNumber,
        status: w.status,
        payoutRef: w.payoutRef,
        rejectionReason: w.rejectionReason,
        createdAt: w.createdAt,
        completedAt: w.completedAt,
      })),
      videoRewards: videoClaims.map((c) => ({
        id: c.id,
        videoId: c.videoId,
        videoTitle: c.video?.title || 'Masterclass Module',
        category: c.video?.category || 'General',
        durationSeconds: c.video?.durationSeconds || 180,
        rewardAmountUSD: c.amountCents / 100,
        claimedAt: c.claimedAt,
      })),
      referrals: {
        directCount: directReferrals.length,
        qualifiedCount: qualifiedReferralsCount,
        list: directReferrals.map((r) => ({
          id: r.id,
          fullName: r.fullName,
          email: r.email,
          accountLevel: r.accountLevel,
          status: r.status,
          createdAt: r.createdAt,
          totalApprovedDepositUSD:
            r.depositRequests.reduce(
              (sum: number, d: { amountCents: number; currency: string }) =>
                sum + (d.currency === 'USD' ? d.amountCents : Math.round(d.amountCents / 280)),
              0
            ) / 100,
        })),
      },
      recentLedgerEntries: (userTransactions.entries || []).map((e: any) => ({
        id: e.id,
        entryType: e.entryType,
        amountUSD: e.amountCents / 100,
        balanceAfterUSD: e.balanceAfterCents / 100,
        createdAt: e.createdAt,
        reference: e.transaction?.reference,
        transactionType: e.transaction?.transactionType,
        description: e.transaction?.description,
      })),
    };
  }
}
