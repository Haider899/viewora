import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { LedgerService } from './ledger.service.js';
import { NotificationService } from './notification.service.js';
import {
  DEFAULT_BONUS_SETTINGS,
  DEFAULT_LANDING_CONTENT,
} from './bootstrap.service.js';
import {
  AccountType,
  Currency,
  DepositStatus,
  EntryType,
  LedgerTransactionType,
  WithdrawalStatus,
} from '../types/index.js';

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
      totalRewardClaims,
      rewardClaimsAgg,
      totalReferralsCount,
      qualifiedReferralsCount,
      activeSupportAgentsCount,
      onlineSupportAgentsCount,
      waitingSupportChatsCount,
      ledgerAudit,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.depositRequest.findMany({ where: { status: DepositStatus.PENDING } }),
      prisma.depositRequest.findMany({ where: { status: DepositStatus.APPROVED } }),
      prisma.withdrawalRequest.findMany({
        where: { status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.UNDER_REVIEW, WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING] } },
      }),
      prisma.withdrawalRequest.findMany({
        where: { status: { in: [WithdrawalStatus.COMPLETED, WithdrawalStatus.PAID] } },
      }),
      prisma.video.count(),
      prisma.videoSession.count({ where: { completed: true } }),
      prisma.rewardClaim.count(),
      prisma.rewardClaim.aggregate({ _sum: { amountCents: true } }),
      prisma.user.count({ where: { referredById: { not: null } } }),
      prisma.user.count({ where: { referredById: { not: null }, isQualifiedReferral: true } }),
      prisma.user.count({ where: { role: 'SUPPORT_AGENT', status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'SUPPORT_AGENT', status: 'ACTIVE', agentAvailability: 'ONLINE' } }),
      prisma.supportConversation.count({ where: { status: { in: ['WAITING_FOR_AGENT', 'ESCALATED_TO_ADMIN'] } } }),
      LedgerService.auditLedgerIntegrity(),
    ]);

    const sumUSD = (items: Array<{ amountCents: number; currency: string }>) => {
      let usd = 0;
      for (const item of items) {
        usd += item.currency === 'USD' ? item.amountCents : Math.round(item.amountCents / 280);
      }
      return { USD: usd, PKR: 0 };
    };

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      pendingDepositsCount: pendingDeposits.length,
      pendingDepositsCents: sumUSD(pendingDeposits),
      verifiedDepositsCents: sumUSD(approvedDeposits),
      pendingWithdrawalsCount: pendingWithdrawals.length,
      pendingWithdrawalsCents: sumUSD(pendingWithdrawals),
      completedPayoutsCents: sumUSD(completedWithdrawals),
      totalVideosCount: totalVideos,
      totalViewsCount: totalViews,
      totalVideoCompletions: totalViews,
      totalRewardClaimsCount: totalRewardClaims,
      totalEligibleRewardsCents: rewardClaimsAgg._sum.amountCents || 0,
      totalReferrals: totalReferralsCount,
      totalReferralsCount,
      qualifiedReferralsCount,
      activeSupportAgents: activeSupportAgentsCount,
      activeSupportAgentsCount,
      onlineSupportAgents: onlineSupportAgentsCount,
      onlineSupportAgentsCount,
      waitingSupportChats: waitingSupportChatsCount,
      waitingSupportChatsCount,
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
    const pageSize = options.pageSize || 30;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (options.role) where.role = options.role;
    if (options.status) where.status = options.status;
    if (options.search) {
      where.OR = [
        { email: { contains: options.search } },
        { fullName: { contains: options.search } },
        { referralCode: { contains: options.search } },
        { memberCode: { contains: options.search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
          createdAt: true,
          packagePurchases: {
            where: { status: 'ACTIVE' },
            select: { packageName: true, priceCentsPaid: true, currency: true },
          },
          walletAccounts: {
            where: { currency: 'USD' },
            select: { accountType: true, balanceCents: true },
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

    if (role === 'SUPPORT_AGENT') {
      const activeAgentsCount = await prisma.user.count({
        where: { role: 'SUPPORT_AGENT', status: 'ACTIVE', id: { not: userId } },
      });
      if (activeAgentsCount >= 10) {
        throw {
          statusCode: 400,
          code: 'SUPPORT_AGENT_LIMIT_REACHED',
          message: 'Maximum limit reached: Only 10 Customer Support Agents are permitted.',
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

  // -------------------------------------------------------------
  // SUPPORT AGENT MANAGEMENT (MAX 10 AGENTS)
  // -------------------------------------------------------------
  static async getSupportAgents() {
    const agents = await prisma.user.findMany({
      where: { role: 'SUPPORT_AGENT' },
      select: {
        id: true,
        memberCode: true,
        fullName: true,
        email: true,
        status: true,
        agentAvailability: true,
        createdAt: true,
        assignedSupportTickets: {
          select: { id: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const replyCounts = await prisma.supportMessage.groupBy({
      by: ['senderId'],
      where: { senderType: 'AGENT', senderId: { in: agents.map((a) => a.id) } },
      _count: true,
    });
    const replyMap = new Map(replyCounts.map((r) => [r.senderId, r._count]));

    return agents.map((a) => {
      const totalAssigned = a.assignedSupportTickets.length;
      const activeTickets = a.assignedSupportTickets.filter((t) =>
        ['WAITING_FOR_AGENT', 'AGENT_ACTIVE'].includes(t.status)
      ).length;
      const resolvedTickets = a.assignedSupportTickets.filter((t) => t.status === 'RESOLVED').length;
      return {
        id: a.id,
        memberCode: a.memberCode,
        fullName: a.fullName,
        email: a.email,
        status: a.status,
        agentAvailability: a.agentAvailability,
        createdAt: a.createdAt,
        performance: {
          totalAssigned,
          activeTickets,
          resolvedTickets,
          totalReplies: replyMap.get(a.id) || 0,
        },
      };
    });
  }

  static async toggleSupportAgentStatus(adminId: string, agentId: string, status: 'ACTIVE' | 'SUSPENDED') {
    const agent = await prisma.user.findUnique({ where: { id: agentId } });
    if (!agent || agent.role !== 'SUPPORT_AGENT') {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Support agent not found.' };
    }
    const updated = await prisma.user.update({
      where: { id: agentId },
      data: {
        status,
        agentAvailability: status === 'ACTIVE' ? 'ONLINE' : 'OFFLINE',
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: status === 'ACTIVE' ? 'ACTIVATE_SUPPORT_AGENT' : 'DEACTIVATE_SUPPORT_AGENT',
        resourceType: 'User',
        resourceId: agentId,
        details: JSON.stringify({ email: agent.email, status }),
      },
    });
    return updated;
  }

  static async createSupportAgent(
    adminId: string,
    data: { fullName: string; email: string; password?: string; existingUserId?: string }
  ) {
    const activeAgentsCount = await prisma.user.count({
      where: { role: 'SUPPORT_AGENT', status: 'ACTIVE' },
    });
    if (activeAgentsCount >= 10) {
      throw {
        statusCode: 400,
        code: 'AGENT_LIMIT_REACHED',
        message: 'Maximum 10 Customer Support Agents allowed.',
      };
    }

    if (data.existingUserId) {
      return await this.updateUserRole(adminId, data.existingUserId, 'SUPPORT_AGENT', 'Added to Support Agent roster');
    }

    const email = data.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return await this.updateUserRole(adminId, existing.id, 'SUPPORT_AGENT', 'Promoted existing account to Support Agent');
    }

    const passwordHash = await bcrypt.hash(data.password || 'Support@2026', 10);
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();

    const agent = await prisma.user.create({
      data: {
        email,
        fullName: data.fullName.trim(),
        passwordHash,
        role: 'SUPPORT_AGENT',
        status: 'ACTIVE',
        emailVerified: true,
        agentAvailability: 'ONLINE',
        referralCode: `SUP-${suffix}`,
        memberCode: `UID-${suffix}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'CREATE_SUPPORT_AGENT',
        resourceType: 'User',
        resourceId: agent.id,
        details: JSON.stringify({ email: agent.email, fullName: agent.fullName }),
      },
    });

    return agent;
  }

  static async removeSupportAgent(adminId: string, agentId: string) {
    const agent = await prisma.user.findUnique({ where: { id: agentId } });
    if (!agent || agent.role !== 'SUPPORT_AGENT') {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Support agent not found.' };
    }

    const updated = await prisma.user.update({
      where: { id: agentId },
      data: { role: 'USER', agentAvailability: 'OFFLINE' },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'REMOVE_SUPPORT_AGENT',
        resourceType: 'User',
        resourceId: agentId,
        details: JSON.stringify({ email: agent.email, previousRole: 'SUPPORT_AGENT', newRole: 'USER' }),
      },
    });

    return updated;
  }

  // -------------------------------------------------------------
  // ADMIN WALLET ADJUSTMENT (4 CATEGORIES, CREDIT/DEBIT + AUDIT)
  // -------------------------------------------------------------
  static async adjustUserWallet(
    adminId: string,
    payload: {
      userId: string;
      walletCategory: 'USER_AVAILABLE' | 'USER_REFERRAL' | 'USER_VIDEO_REWARDS' | 'USER_OTHER_REWARDS';
      direction: 'CREDIT' | 'DEBIT';
      amountCents: number;
      reason: string;
    }
  ) {
    const validCategories = ['USER_AVAILABLE', 'USER_REFERRAL', 'USER_VIDEO_REWARDS', 'USER_OTHER_REWARDS'];
    if (!validCategories.includes(payload.walletCategory)) {
      throw { statusCode: 400, code: 'INVALID_WALLET', message: 'Invalid wallet category selected.' };
    }
    if (!['CREDIT', 'DEBIT'].includes(payload.direction)) {
      throw { statusCode: 400, code: 'INVALID_DIRECTION', message: 'Direction must be CREDIT or DEBIT.' };
    }
    if (!Number.isInteger(payload.amountCents) || payload.amountCents <= 0) {
      throw { statusCode: 400, code: 'INVALID_AMOUNT', message: 'Amount must be a positive USD value.' };
    }
    if (!payload.reason || payload.reason.trim().length < 3) {
      throw { statusCode: 400, code: 'REASON_REQUIRED', message: 'A clear audit reason is required.' };
    }

    const [targetUser, adminUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: payload.userId } }),
      prisma.user.findUnique({ where: { id: adminId } }),
    ]);

    if (!targetUser) {
      throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'Target user not found.' };
    }

    const cleanReason = payload.reason.trim();
    const categoryLabelMap: Record<string, string> = {
      USER_AVAILABLE: 'Account Credits (Main Wallet)',
      USER_REFERRAL: 'Referral Rewards Wallet',
      USER_VIDEO_REWARDS: 'Video Rewards Wallet',
      USER_OTHER_REWARDS: 'Approved Other Rewards Wallet',
    };
    const label = categoryLabelMap[payload.walletCategory];

    const result = await prisma.$transaction(async (tx) => {
      const userAccount = await LedgerService.getOrCreateAccount(
        tx,
        payload.walletCategory as AccountType,
        Currency.USD,
        targetUser.id
      );

      if (payload.direction === 'DEBIT' && userAccount.balanceCents < payload.amountCents) {
        throw {
          statusCode: 400,
          code: 'INSUFFICIENT_FUNDS',
          message: `Cannot debit $${(payload.amountCents / 100).toFixed(2)} USD. Current ${label} balance is $${(userAccount.balanceCents / 100).toFixed(2)} USD.`,
        };
      }

      const sysAccount = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.SYSTEM_ADJUSTMENT,
        Currency.USD,
        null
      );

      const ref = `ADM-ADJ-${targetUser.id.slice(0, 6)}-${Date.now()}`;
      const isCredit = payload.direction === 'CREDIT';

      const ledgerTx = await LedgerService.postTransaction(
        {
          reference: ref,
          transactionType: LedgerTransactionType.ADJUSTMENT,
          currency: Currency.USD,
          description: `Admin ${payload.direction} on ${label} by ${adminUser?.fullName || 'Admin'}: ${cleanReason}`,
          postedById: adminId,
          entries: [
            {
              accountId: isCredit ? sysAccount.id : userAccount.id,
              entryType: EntryType.DEBIT,
              amountCents: payload.amountCents,
            },
            {
              accountId: isCredit ? userAccount.id : sysAccount.id,
              entryType: EntryType.CREDIT,
              amountCents: payload.amountCents,
            },
          ],
        },
        tx
      );

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: `WALLET_ADJUSTMENT_${payload.direction}`,
          resourceType: 'WalletAccount',
          resourceId: userAccount.id,
          details: JSON.stringify({
            adminId,
            adminName: adminUser?.fullName || 'Administrator',
            targetUserId: targetUser.id,
            targetUserName: targetUser.fullName,
            walletCategory: payload.walletCategory,
            walletLabel: label,
            source: isCredit ? 'SYSTEM_ADJUSTMENT' : payload.walletCategory,
            destination: isCredit ? payload.walletCategory : 'SYSTEM_ADJUSTMENT',
            direction: payload.direction,
            amountCents: payload.amountCents,
            amountUSD: (payload.amountCents / 100).toFixed(2),
            reason: cleanReason,
            reference: ref,
          }),
        },
      });

      return { reference: ref, ledgerTxId: ledgerTx.id };
    });

    await NotificationService.send({
      userId: targetUser.id,
      eventKey: 'rewardCredited',
      title: `Wallet ${payload.direction === 'CREDIT' ? 'Credited' : 'Debited'} by Admin`,
      message: `${payload.direction === 'CREDIT' ? '+' : '-'}$${(payload.amountCents / 100).toFixed(2)} USD in ${label}. Reason: ${cleanReason}`,
      type: payload.direction === 'CREDIT' ? 'SUCCESS' : 'WARNING',
    });

    return result;
  }

  // -------------------------------------------------------------
  // BONUS SETTINGS & LANDING PAGE CMS & REPORTS
  // -------------------------------------------------------------
  static async getBonusSettings() {
    const row = await prisma.systemSetting.findUnique({ where: { key: 'BONUS_SETTINGS' } });
    if (!row) return DEFAULT_BONUS_SETTINGS;
    try {
      return { ...DEFAULT_BONUS_SETTINGS, ...JSON.parse(row.value) };
    } catch {
      return DEFAULT_BONUS_SETTINGS;
    }
  }

  static async updateBonusSettings(adminId: string, settings: any) {
    const merged = { ...(await this.getBonusSettings()), ...settings };
    await prisma.systemSetting.upsert({
      where: { key: 'BONUS_SETTINGS' },
      update: { value: JSON.stringify(merged), updatedAt: new Date() },
      create: {
        key: 'BONUS_SETTINGS',
        value: JSON.stringify(merged),
        description: 'Configurable Account/Level Bonus, Video Bonus, and Referral Bonus policies',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_BONUS_SETTINGS',
        resourceType: 'SystemSetting',
        resourceId: 'BONUS_SETTINGS',
        details: JSON.stringify(merged),
      },
    });

    return merged;
  }

  static async getLandingContent() {
    const row = await prisma.systemSetting.findUnique({ where: { key: 'LANDING_CONTENT' } });
    if (!row) return DEFAULT_LANDING_CONTENT;
    try {
      return { ...DEFAULT_LANDING_CONTENT, ...JSON.parse(row.value) };
    } catch {
      return DEFAULT_LANDING_CONTENT;
    }
  }

  static async updateLandingContent(adminId: string, content: any) {
    const merged = { ...(await this.getLandingContent()), ...content };
    await prisma.systemSetting.upsert({
      where: { key: 'LANDING_CONTENT' },
      update: { value: JSON.stringify(merged), updatedAt: new Date() },
      create: {
        key: 'LANDING_CONTENT',
        value: JSON.stringify(merged),
        description: 'Editable landing page hero, video preview, rewards, and contact section content',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_LANDING_CONTENT',
        resourceType: 'SystemSetting',
        resourceId: 'LANDING_CONTENT',
        details: JSON.stringify(merged),
      },
    });

    return merged;
  }

  static async getReportsSummary(from?: string, to?: string) {
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    const createdAtWhere = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const [deposits, withdrawals, purchases, rewardClaims, commissions, levelChanges, adjustments, usersByLevel, walletLiabilities, ledgerAudit, dailyBonusTxs] =
      await Promise.all([
        prisma.depositRequest.findMany({ where: createdAtWhere, orderBy: { createdAt: 'desc' }, include: { user: { select: { fullName: true, email: true, memberCode: true } }, paymentMethod: { select: { name: true } } } }),
        prisma.withdrawalRequest.findMany({ where: createdAtWhere, orderBy: { createdAt: 'desc' }, include: { user: { select: { fullName: true, email: true, memberCode: true } } } }),
        prisma.packagePurchase.findMany({ where: Object.keys(dateFilter).length > 0 ? { purchasedAt: dateFilter } : {}, include: { user: { select: { fullName: true, email: true } } } }),
        prisma.rewardClaim.findMany({ where: Object.keys(dateFilter).length > 0 ? { claimedAt: dateFilter } : {}, include: { user: { select: { fullName: true, email: true } }, video: { select: { title: true } } } }),
        prisma.referralCommission.findMany({ where: createdAtWhere, include: { beneficiary: { select: { fullName: true, email: true } }, sourceUser: { select: { fullName: true } } } }),
        prisma.accountLevelHistory.findMany({ where: createdAtWhere, orderBy: { createdAt: 'desc' }, include: { user: { select: { fullName: true, email: true } } } }),
        prisma.auditLog.findMany({ where: { ...createdAtWhere, action: { startsWith: 'WALLET_ADJUSTMENT' } }, orderBy: { createdAt: 'desc' }, include: { user: { select: { fullName: true, email: true } } } }),
        prisma.user.groupBy({ by: ['accountLevel'], _count: true }),
        prisma.walletAccount.groupBy({
          by: ['accountType'],
          where: { userId: { not: null }, currency: 'USD' },
          _sum: { balanceCents: true },
        }),
        LedgerService.auditLedgerIntegrity(),
        prisma.ledgerTransaction.findMany({
          where: {
            ...createdAtWhere,
            reference: { startsWith: 'DAILY-BONUS-' },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            entries: {
              where: { entryType: 'CREDIT' },
              include: {
                account: {
                  include: { user: { select: { fullName: true, email: true, accountLevel: true } } },
                },
              },
            },
          },
        }),
      ]);

    const approvedDepositsCents = deposits.filter((d) => d.status === 'APPROVED').reduce((s, d) => s + d.amountCents, 0);
    const completedWithdrawalsCents = withdrawals.filter((w) => w.status === 'COMPLETED' || w.status === 'PAID').reduce((s, w) => s + w.amountCents, 0);
    const packageRevenueCents = purchases.reduce((s, p) => s + p.priceCentsPaid, 0);
    const videoRewardsCents = rewardClaims.reduce((s, r) => s + r.amountCents, 0);
    const referralCommissionsCents = commissions.reduce((s, c) => s + c.commissionCents, 0);
    const dailyBonusCents = dailyBonusTxs.reduce((s, t) => s + (t.entries[0]?.amountCents || 0), 0);

    const liabilityByType: Record<string, number> = {};
    let totalUserLiabilityCents = 0;
    for (const row of walletLiabilities) {
      const val = row._sum.balanceCents || 0;
      liabilityByType[row.accountType] = val;
      totalUserLiabilityCents += val;
    }

    const approvedDepositsUSD = approvedDepositsCents / 100;
    const completedWithdrawalsUSD = completedWithdrawalsCents / 100;
    const packageRevenueUSD = packageRevenueCents / 100;
    const videoRewardsPaidUSD = videoRewardsCents / 100;
    const referralCommissionsUSD = referralCommissionsCents / 100;

    return {
      // Top-level convenience fields + nested totals for full compatibility
      approvedDepositsCents,
      approvedDepositsCount: deposits.filter((d) => d.status === 'APPROVED').length,
      completedWithdrawalsCents,
      completedWithdrawalsCount: withdrawals.filter((w) => w.status === 'COMPLETED' || w.status === 'PAID').length,
      videoRewardsCents,
      videoCompletionsCount: rewardClaims.length,
      referralCommissionsCents,
      totals: {
        approvedDepositsCount: deposits.filter((d) => d.status === 'APPROVED').length,
        approvedDepositsUSD,
        pendingDepositsCount: deposits.filter((d) => d.status === 'PENDING').length,
        completedWithdrawalsCount: withdrawals.filter((w) => w.status === 'COMPLETED' || w.status === 'PAID').length,
        completedWithdrawalsUSD,
        pendingWithdrawalsCount: withdrawals.filter((w) => !['COMPLETED', 'PAID', 'REJECTED', 'FAILED', 'CANCELLED'].includes(w.status)).length,
        packagePurchasesCount: purchases.length,
        packageRevenueUSD,
        videoRewardsCount: rewardClaims.length,
        videoRewardsPaidUSD,
        referralCommissionsCount: commissions.length,
        referralCommissionsUSD,
        dailyBonusPaidUSD: dailyBonusCents / 100,
        levelChangesCount: levelChanges.length,
        walletAdjustmentsCount: adjustments.length,
      },
      reconciliation: {
        ledgerBalanced: ledgerAudit.isValid,
        anomaliesCount: ledgerAudit.anomalies.length,
        totalApprovedDepositsUSD: approvedDepositsUSD,
        totalSettledWithdrawalsUSD: completedWithdrawalsUSD,
        netCashFlowUSD: (approvedDepositsCents - completedWithdrawalsCents) / 100,
        totalUserLiabilityUSD: totalUserLiabilityCents / 100,
        mainWalletsUSD: (liabilityByType['USER_AVAILABLE'] || 0) / 100,
        videoRewardsWalletsUSD: (liabilityByType['USER_VIDEO_REWARDS'] || 0) / 100,
        referralWalletsUSD: (liabilityByType['USER_REFERRAL'] || 0) / 100,
        reservedHoldsUSD: (liabilityByType['USER_RESERVED'] || 0) / 100,
        otherRewardsWalletsUSD: (liabilityByType['USER_OTHER_REWARDS'] || 0) / 100,
      },
      bonusHistory: [
        ...dailyBonusTxs.map((t) => ({
          id: t.id,
          category: 'Daily Level Bonus',
          userName: t.entries[0]?.account?.user?.fullName || 'Member',
          userEmail: t.entries[0]?.account?.user?.email || '',
          amountUSD: (t.entries[0]?.amountCents || 0) / 100,
          description: t.description,
          createdAt: t.createdAt,
        })),
        ...rewardClaims.slice(0, 30).map((r) => ({
          id: r.id,
          category: 'Video Reward',
          userName: r.user?.fullName || 'Member',
          userEmail: r.user?.email || '',
          amountUSD: r.amountCents / 100,
          description: `Completed: ${r.video?.title || 'Video'}`,
          createdAt: r.claimedAt,
        })),
        ...commissions.slice(0, 30).map((c) => ({
          id: c.id,
          category: 'Referral Commission',
          userName: c.beneficiary?.fullName || 'Member',
          userEmail: c.beneficiary?.email || '',
          amountUSD: c.commissionCents / 100,
          description: `${c.ratePercent}% from ${c.sourceUser?.fullName || 'Referral'}`,
          createdAt: c.createdAt,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      usersByLevel,
      recentDeposits: deposits.slice(0, 50),
      recentWithdrawals: withdrawals.slice(0, 50),
      recentAdjustments: adjustments.slice(0, 50),
      recentLevelChanges: levelChanges.slice(0, 50),
    };
  }

  static async getSystemSettings() {
    // Filter out legacy PKR settings so UI remains cleanly USD-only
    return await prisma.systemSetting.findMany({
      where: {
        key: {
          notIn: [
            'EXCHANGE_RATE_USD_PKR',
            'MIN_WITHDRAWAL_PKR_CENTS',
            'REFERRAL_CONFIG',
            'BONUS_SETTINGS',
            'NOTIFICATION_SETTINGS',
            'LANDING_CONTENT',
          ],
        },
      },
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

  static async getAuditLogs(page = 1, pageSize = 50, actionFilter?: string, search?: string) {
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (actionFilter && actionFilter !== 'ALL') {
      where.action = { contains: actionFilter };
    }
    if (search) {
      where.OR = [
        { action: { contains: search } },
        { resourceType: { contains: search } },
        { details: { contains: search } },
        { user: { fullName: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, fullName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, pageSize };
  }

  static async getUserFinancialDossier(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        memberCode: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        accountLevel: true,
        accountLockedUntil: true,
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

    const balanceSummary = await LedgerService.getUserWalletSummary(userId);
    const usdSummary = balanceSummary.USD || {
      availableCents: 0,
      videoRewardsCents: 0,
      otherRewardsCents: 0,
      reservedCents: 0,
      referralCents: 0,
      totalCents: 0,
    };

    const [deposits, withdrawals, videoClaims, directReferrals, userTransactions, levelHistory, lockHistory, milestoneClaims, userAuditLogs] =
      await Promise.all([
        prisma.depositRequest.findMany({
          where: { userId },
          include: { paymentMethod: { select: { name: true, code: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.withdrawalRequest.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.rewardClaim.findMany({
          where: { userId },
          include: { video: { select: { title: true, durationSeconds: true, category: true } } },
          orderBy: { claimedAt: 'desc' },
        }),
        prisma.user.findMany({
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
        }),
        LedgerService.getUserTransactions(userId, { pageSize: 50 }),
        prisma.accountLevelHistory.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 25,
        }),
        prisma.accountLockHistory.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 25,
        }),
        prisma.referralMilestoneClaim.findMany({
          where: { userId },
          orderBy: { claimedAt: 'desc' },
        }),
        prisma.auditLog.findMany({
          where: {
            OR: [
              { resourceId: userId },
              { userId },
              { details: { contains: userId } },
            ],
          },
          include: { user: { select: { fullName: true, email: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          take: 40,
        }),
      ]);

    // Resolve admin actor names for deposits, withdrawals, level changes, and locks
    const actorIds = Array.from(
      new Set(
        [
          ...deposits.map((d) => d.reviewedById),
          ...withdrawals.map((w) => w.reviewedById),
          ...levelHistory.map((h) => h.adjustedById),
          ...lockHistory.map((l) => l.performedById),
        ].filter((id): id is string => Boolean(id && id !== 'SYSTEM'))
      )
    );
    const actors = actorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, fullName: true, email: true, role: true },
        })
      : [];
    const actorMap = new Map(actors.map((a) => [a.id, `${a.fullName} (${a.role})`]));
    const resolveActor = (id?: string | null) => {
      if (!id) return null;
      if (id === 'SYSTEM') return 'System Auto';
      return actorMap.get(id) || id;
    };

    const totalDepositsApprovedUSD = deposits
      .filter((d) => d.status === 'APPROVED')
      .reduce((sum, d) => sum + d.amountCents, 0);

    const totalWithdrawalsPaidUSD = withdrawals
      .filter((w) => w.status === 'COMPLETED' || w.status === 'PAID')
      .reduce((sum, w) => sum + w.amountCents, 0);

    const pendingWithdrawalUSD = withdrawals
      .filter((w) => ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING'].includes(w.status))
      .reduce((sum, w) => sum + w.amountCents, 0);

    const totalVideoRewardsUSD = videoClaims.reduce((sum, c) => sum + c.amountCents, 0);

    const qualifiedReferralsCount = directReferrals.filter((r) => r.isQualifiedReferral).length;

    let referralRank = 'New';
    if (qualifiedReferralsCount >= 501) referralRank = 'Rank 5';
    else if (qualifiedReferralsCount >= 101) referralRank = 'Rank 4';
    else if (qualifiedReferralsCount >= 11) referralRank = 'Diamond';
    else if (qualifiedReferralsCount >= 6) referralRank = 'Platinum';
    else if (qualifiedReferralsCount >= 1) referralRank = 'Gold';

    // Unified Activity Timeline
    const activityTimeline = [
      ...levelHistory.map((h) => ({
        type: 'LEVEL_CHANGE',
        title: `Account Level: ${h.oldLevel} → ${h.newLevel}`,
        detail: `${h.reason || 'Qualification update'} • By: ${resolveActor(h.adjustedById) || 'System'}`,
        createdAt: h.createdAt,
      })),
      ...lockHistory.map((l) => ({
        type: 'ACCOUNT_LOCK',
        title: `Account ${l.action}${l.durationDays ? ` (${l.durationDays} days)` : ''}`,
        detail: `${l.reason || ''} • By: ${resolveActor(l.performedById) || 'Admin'}`,
        createdAt: l.createdAt,
      })),
      ...milestoneClaims.map((m) => ({
        type: 'RANK_MILESTONE',
        title: `Referral Milestone Unlocked: ${m.rankName} (+$${(m.rewardAmountCents / 100).toFixed(2)} USD)`,
        detail: `${m.qualifiedCount} qualified referrals reached`,
        createdAt: m.claimedAt,
      })),
      ...deposits.map((d) => ({
        type: 'DEPOSIT',
        title: `Deposit $${(d.amountCents / 100).toFixed(2)} USD — ${d.status}`,
        detail: `Ref: ${d.transactionRef}${d.reviewedById ? ` • Reviewed by: ${resolveActor(d.reviewedById)}` : ''}${d.rejectionReason ? ` • Reason: ${d.rejectionReason}` : ''}`,
        createdAt: d.reviewedAt || d.createdAt,
      })),
      ...withdrawals.map((w) => ({
        type: 'WITHDRAWAL',
        title: `Withdrawal $${(w.amountCents / 100).toFixed(2)} USD — ${w.status}`,
        detail: `${w.payoutMethod}${w.payoutRef ? ` • Payout Ref: ${w.payoutRef}` : ''}${w.reviewedById ? ` • Processed by: ${resolveActor(w.reviewedById)}` : ''}${w.rejectionReason ? ` • Reason: ${w.rejectionReason}` : ''}`,
        createdAt: w.completedAt || w.createdAt,
      })),
      ...userAuditLogs.map((a) => ({
        type: a.action,
        title: a.action.replace(/_/g, ' '),
        detail: `Actor: ${a.user ? `${a.user.fullName} (${a.user.role})` : 'System'} • ${a.details || ''}`,
        createdAt: a.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 60);

    return {
      user: {
        ...user,
        memberCode: user.memberCode || `UID-${user.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`,
        referralRank,
      },
      balances: {
        availableUSD: usdSummary.availableCents / 100,
        videoRewardsUSD: (usdSummary.videoRewardsCents || 0) / 100,
        otherRewardsUSD: (usdSummary.otherRewardsCents || 0) / 100,
        reservedUSD: usdSummary.reservedCents / 100,
        referralUSD: usdSummary.referralCents / 100,
        totalUSD: usdSummary.totalCents / 100,
      },
      totals: {
        totalDepositsApprovedUSD: totalDepositsApprovedUSD / 100,
        totalWithdrawalsPaidUSD: totalWithdrawalsPaidUSD / 100,
        totalVideoRewardsUSD: (usdSummary.videoRewardsCents || 0) / 100, // Show actual wallet balance including admin adjustments (F13)
        totalVideoClaimsUSD: totalVideoRewardsUSD / 100,
        pendingWithdrawalUSD: pendingWithdrawalUSD / 100,
      },
      levelHistory: levelHistory.map((h) => ({
        ...h,
        adjustedByName: resolveActor(h.adjustedById),
      })),
      lockHistory: lockHistory.map((l) => ({
        ...l,
        performedByName: resolveActor(l.performedById),
      })),
      rankHistory: milestoneClaims.map((m) => ({
        ...m,
        rewardUSD: m.rewardAmountCents / 100,
      })),
      activityTimeline,
      deposits: deposits.map((d) => ({
        id: d.id,
        amountUSD: d.amountCents / 100,
        rawAmount: d.amountCents / 100,
        currency: 'USD',
        gateway: d.paymentMethod?.name || 'Manual USD Gateway',
        status: d.status,
        transactionRef: d.transactionRef,
        proofImageUrl: d.proofImageUrl,
        rejectionReason: d.rejectionReason,
        createdAt: d.createdAt,
        reviewedAt: d.reviewedAt,
        reviewedByName: resolveActor(d.reviewedById),
      })),
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amountUSD: w.amountCents / 100,
        rawAmount: w.amountCents / 100,
        currency: 'USD',
        payoutMethod: w.payoutMethod,
        accountTitle: w.accountTitle,
        accountNumber: w.accountNumber,
        status: w.status,
        payoutRef: w.payoutRef,
        rejectionReason: w.rejectionReason,
        createdAt: w.createdAt,
        completedAt: w.completedAt,
        approvedByName: resolveActor(w.reviewedById),
        paidByName: w.status === 'COMPLETED' || w.status === 'PAID' ? resolveActor(w.reviewedById) : null,
      })),
      videoRewards: videoClaims.map((c) => ({
        id: c.id,
        videoId: c.videoId,
        videoTitle: c.video?.title || 'Video Campaign',
        category: c.video?.category || 'General',
        durationSeconds: c.video?.durationSeconds || 60,
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
          totalApprovedDepositUSD: r.depositRequests.reduce((sum, d) => sum + d.amountCents, 0) / 100,
        })),
      },
      recentLedgerEntries: (userTransactions.entries || []).map((e: any) => ({
        id: e.id,
        entryType: e.entryType,
        amountUSD: e.amountCents / 100,
        rawAmount: e.amountCents / 100,
        currency: 'USD',
        accountType: e.account?.accountType || 'USER_AVAILABLE',
        balanceAfterUSD: null,
        createdAt: e.createdAt,
        reference: e.transaction?.reference || 'SYSTEM_TX',
        transactionType: e.transaction?.transactionType || 'ADJUSTMENT',
        description: e.transaction?.description || 'Double-entry ledger transfer',
      })),
    };
  }
}
