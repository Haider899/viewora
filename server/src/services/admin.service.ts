import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { LedgerService } from './ledger.service.js';
import { NotificationService } from './notification.service.js';
import {
  DEFAULT_BONUS_SETTINGS,
  DEFAULT_LANDING_CONTENT,
  DEFAULT_LIVE_POPUP_SETTINGS,
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

    const [allMatched, total] = await Promise.all([
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
          registrationIp: true,
          lastLoginIp: true,
          lastSeenAt: true,
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
      }),
      prisma.user.count({ where }),
    ]);

    const nowMs = Date.now();
    const ONLINE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

    const enriched = allMatched.map((u) => {
      const lastSeenMs = u.lastSeenAt ? u.lastSeenAt.getTime() : 0;
      const isOnline = lastSeenMs > 0 && nowMs - lastSeenMs <= ONLINE_WINDOW_MS;
      return {
        ...u,
        isOnline,
        ipAddress: u.lastLoginIp || u.registrationIp || null,
      };
    });

    // Issue #20 & #21: Online members ALWAYS first, then most recently seen, then newest joined
    enriched.sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      const aSeen = a.lastSeenAt ? a.lastSeenAt.getTime() : 0;
      const bSeen = b.lastSeenAt ? b.lastSeenAt.getTime() : 0;
      if (aSeen !== bSeen) return bSeen - aSeen;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const users = enriched.slice(skip, skip + pageSize);
    return { users, total, page, pageSize };
  }

  /**
   * Part 6 #1: Unified Users View Grouped by Actual IP Address
   * - Online users ALWAYS appear at the top.
   * - Users sharing a real IP address are grouped together with the ACTUAL IP shown.
   * - Users without a recorded IP are NOT lumped into one giant fake group; each stands individually.
   * - Every user line includes name, memberCode, totalBalanceCents, activePackageName, accountLevel, isOnline, lastSeenAt, status & restriction.
   */
  static async getIpGroups(search?: string) {
    const where: any = {};
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q } },
        { email: { contains: q } },
        { memberCode: { contains: q } },
        { lastLoginIp: { contains: q } },
        { registrationIp: { contains: q } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        memberCode: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        accountLevel: true,
        accountLockedUntil: true,
        registrationIp: true,
        lastLoginIp: true,
        lastSeenAt: true,
        createdAt: true,
        packagePurchases: {
          where: { status: 'ACTIVE' },
          orderBy: { purchasedAt: 'desc' },
          take: 1,
          select: { packageName: true, priceCentsPaid: true },
        },
        walletAccounts: {
          where: { currency: 'USD' },
          select: { accountType: true, balanceCents: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const nowMs = Date.now();
    const ONLINE_WINDOW_MS = 5 * 60 * 1000;
    const byIp = new Map<string, any[]>();
    const unrecordedGroups: any[] = [];

    for (const u of users) {
      const rawIp = (u.lastLoginIp || u.registrationIp || '').trim();
      const lastSeenMs = u.lastSeenAt ? u.lastSeenAt.getTime() : 0;
      const isOnline = lastSeenMs > 0 && nowMs - lastSeenMs <= ONLINE_WINDOW_MS;
      const isLocked = Boolean(u.accountLockedUntil && u.accountLockedUntil.getTime() > nowMs);
      const isSuspended = u.status === 'SUSPENDED';
      const isRestricted = isSuspended || isLocked;

      const restriction = isSuspended
        ? 'Suspended'
        : isLocked
        ? `Locked until ${u.accountLockedUntil!.toISOString().slice(0, 10)}`
        : null;

      let earningsCents = 0;
      let totalBalanceCents = 0;
      for (const acc of u.walletAccounts) {
        if (['USER_VIDEO_REWARDS', 'USER_REFERRAL', 'USER_OTHER_REWARDS'].includes(acc.accountType)) {
          earningsCents += acc.balanceCents;
        }
        if (
          ['USER_AVAILABLE', 'USER_VIDEO_REWARDS', 'USER_REFERRAL', 'USER_OTHER_REWARDS', 'USER_RESERVED'].includes(
            acc.accountType
          )
        ) {
          totalBalanceCents += acc.balanceCents;
        }
      }

      const accountObj = {
        id: u.id,
        memberCode: u.memberCode || `UID-${u.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        status: u.status,
        accountLevel: u.accountLevel,
        activePackageName: u.packagePurchases[0]?.packageName || null,
        earningsBalanceCents: earningsCents,
        totalBalanceCents,
        ipAddress: rawIp || null,
        isOnline,
        isLocked,
        isSuspended,
        isRestricted,
        restriction,
        accountLockedUntil: u.accountLockedUntil,
        lastSeenAt: u.lastSeenAt,
        createdAt: u.createdAt,
      };

      if (rawIp) {
        if (!byIp.has(rawIp)) byIp.set(rawIp, []);
        byIp.get(rawIp)!.push(accountObj);
      } else {
        // Never lump unrecorded-IP users into one misleading group of 23!
        unrecordedGroups.push({
          ipAddress: 'No IP Recorded Yet',
          ip: 'No IP Recorded Yet',
          isUnrecorded: true,
          accountCount: 1,
          onlineCount: isOnline ? 1 : 0,
          restrictedCount: isRestricted ? 1 : 0,
          latestSeenMs: lastSeenMs,
          accounts: [accountObj],
        });
      }
    }

    const recordedGroups = Array.from(byIp.entries()).map(([ip, accounts]) => {
      accounts.sort((a, b) => {
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        const aSeen = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
        const bSeen = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
        return bSeen - aSeen;
      });
      const latestSeenMs = Math.max(0, ...accounts.map((a) => (a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0)));
      return {
        ipAddress: ip,
        ip,
        isUnrecorded: false,
        accountCount: accounts.length,
        onlineCount: accounts.filter((a) => a.isOnline).length,
        restrictedCount: accounts.filter((a) => a.isRestricted).length,
        latestSeenMs,
        accounts,
      };
    });

    const allGroups = [...recordedGroups, ...unrecordedGroups];
    // Online users ALWAYS at the top, then shared-IP groups, then most recently active
    allGroups.sort((a, b) => {
      if ((a.onlineCount > 0) !== (b.onlineCount > 0)) return a.onlineCount > 0 ? -1 : 1;
      if (a.onlineCount !== b.onlineCount) return b.onlineCount - a.onlineCount;
      if (a.isUnrecorded !== b.isUnrecorded) return a.isUnrecorded ? 1 : -1;
      if (a.accountCount !== b.accountCount) return b.accountCount - a.accountCount;
      return b.latestSeenMs - a.latestSeenMs;
    });

    return allGroups;
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
        lastSeenAt: true,
        createdAt: true,
        assignedSupportTickets: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            messages: {
              select: { senderType: true, senderId: true, createdAt: true },
              orderBy: { createdAt: 'asc' },
            },
          },
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
      const resolvedList = a.assignedSupportTickets.filter((t) => t.status === 'RESOLVED');
      const resolvedTickets = resolvedList.length;

      // Issue #12: Compute real first-response time & average resolution time in minutes
      const firstResponseMins: number[] = [];
      for (const t of a.assignedSupportTickets) {
        const firstUserMsg = t.messages.find((m) => m.senderType === 'USER');
        const firstAgentMsg = t.messages.find((m) => m.senderType === 'AGENT' && m.senderId === a.id);
        if (firstAgentMsg) {
          const anchor = firstUserMsg ? firstUserMsg.createdAt.getTime() : t.createdAt.getTime();
          const diffMin = Math.max(0, (firstAgentMsg.createdAt.getTime() - anchor) / 60000);
          firstResponseMins.push(diffMin);
        }
      }

      const resolutionMins: number[] = resolvedList.map((t) =>
        Math.max(0, (t.updatedAt.getTime() - t.createdAt.getTime()) / 60000)
      );

      const avgFirstResponseMinutes =
        firstResponseMins.length > 0
          ? Number((firstResponseMins.reduce((s, v) => s + v, 0) / firstResponseMins.length).toFixed(1))
          : null;
      const avgResolutionMinutes =
        resolutionMins.length > 0
          ? Number((resolutionMins.reduce((s, v) => s + v, 0) / resolutionMins.length).toFixed(1))
          : null;

      return {
        id: a.id,
        memberCode: a.memberCode,
        fullName: a.fullName,
        email: a.email,
        status: a.status,
        agentAvailability: a.agentAvailability,
        lastSeenAt: a.lastSeenAt,
        createdAt: a.createdAt,
        performance: {
          totalAssigned,
          activeTickets,
          resolvedTickets,
          totalReplies: replyMap.get(a.id) || 0,
          avgFirstResponseMinutes,
          avgResolutionMinutes,
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
      const parsed = JSON.parse(row.value);
      return {
        ...DEFAULT_BONUS_SETTINGS,
        ...parsed,
        accountLevelBonus: {
          ...DEFAULT_BONUS_SETTINGS.accountLevelBonus,
          ...(parsed.accountLevelBonus || {}),
        },
        videoBonus: {
          ...DEFAULT_BONUS_SETTINGS.videoBonus,
          ...(parsed.videoBonus || {}),
          levelPercentages: {
            ...DEFAULT_BONUS_SETTINGS.videoBonus.levelPercentages,
            ...(parsed.videoBonus?.levelPercentages || {}),
          },
        },
        referralBonus: {
          ...DEFAULT_BONUS_SETTINGS.referralBonus,
          ...(parsed.referralBonus || {}),
        },
      };
    } catch {
      return DEFAULT_BONUS_SETTINGS;
    }
  }

  static async updateBonusSettings(adminId: string, settings: any) {
    const current = await this.getBonusSettings();
    const merged = {
      ...current,
      ...settings,
      accountLevelBonus: {
        ...current.accountLevelBonus,
        ...(settings.accountLevelBonus || {}),
      },
      videoBonus: {
        ...current.videoBonus,
        ...(settings.videoBonus || {}),
        levelPercentages: {
          ...current.videoBonus.levelPercentages,
          ...(settings.videoBonus?.levelPercentages || {}),
        },
      },
      referralBonus: {
        ...current.referralBonus,
        ...(settings.referralBonus || {}),
      },
    };
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

    const [deposits, withdrawals, purchases, revenueEvents, rewardClaims, commissions, levelChanges, adjustments, usersByLevel, walletLiabilities, ledgerAudit, dailyBonusTxs] =
      await Promise.all([
        prisma.depositRequest.findMany({ where: createdAtWhere, orderBy: { createdAt: 'desc' }, include: { user: { select: { fullName: true, email: true, memberCode: true } }, paymentMethod: { select: { name: true } } } }),
        prisma.withdrawalRequest.findMany({ where: createdAtWhere, orderBy: { createdAt: 'desc' }, include: { user: { select: { fullName: true, email: true, memberCode: true } } } }),
        prisma.packagePurchase.findMany({ where: Object.keys(dateFilter).length > 0 ? { purchasedAt: dateFilter } : {}, include: { user: { select: { fullName: true, email: true } } } }),
        prisma.revenueEvent.findMany({ where: createdAtWhere, select: { amountCents: true } }),
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
    // Use RevenueEvent.amountCents (actual paid delta, never double-counting upgraded tier values)
    const packageRevenueCents =
      revenueEvents.length > 0
        ? revenueEvents.reduce((s, r) => s + r.amountCents, 0)
        : purchases.reduce((s, p) => s + p.priceCentsPaid, 0);
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
        registrationIp: true,
        lastLoginIp: true,
        lastSeenAt: true,
        createdAt: true,
        referredBy: {
          select: { id: true, fullName: true, email: true, referralCode: true },
        },
        packagePurchases: {
          where: { status: 'ACTIVE' },
          orderBy: { purchasedAt: 'desc' },
          take: 1,
          include: { package: true },
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

    const [deposits, withdrawals, videoClaims, directReferrals, userTransactions, levelHistory, lockHistory, milestoneClaims, userAuditLogs, directMessages] =
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
        prisma.adminDirectMessage.findMany({
          where: { recipientId: userId },
          include: { sender: { select: { fullName: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          take: 30,
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
      ...directMessages.map((dm) => ({
        type: 'ADMIN_DIRECT_MESSAGE',
        title: `Admin Message: ${dm.subject}`,
        detail: `${dm.message}${dm.attachmentUrl ? ' [Screenshot attached]' : ''} • Sent by: ${dm.sender?.fullName || 'Admin'} (${dm.isRead ? 'Read' : 'Unread'})`,
        createdAt: dm.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 60);

    const nowMs = Date.now();
    const isOnline = Boolean(user.lastSeenAt && nowMs - user.lastSeenAt.getTime() <= 5 * 60 * 1000);
    const isLocked = Boolean(user.accountLockedUntil && user.accountLockedUntil.getTime() > nowMs);
    const activePurchase = user.packagePurchases[0] || null;

    return {
      user: {
        ...user,
        memberCode: user.memberCode || `UID-${user.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`,
        referralRank,
        isOnline,
        isLocked,
        ipAddress: user.lastLoginIp || user.registrationIp || null,
        activePackageName: activePurchase?.packageName || null,
        activePackagePriceUSD: activePurchase ? (activePurchase.priceCentsPaid / 100) : null,
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
      directMessages: directMessages.map((dm) => ({
        id: dm.id,
        subject: dm.subject,
        message: dm.message,
        attachmentUrl: dm.attachmentUrl,
        attachmentName: dm.attachmentName,
        isRead: dm.isRead,
        senderName: dm.sender?.fullName || 'Admin',
        createdAt: dm.createdAt,
      })),
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
        payoutProofUrl: (w as any).payoutProofUrl || null,
        sourceWallet: (w as any).sourceWallet || 'USER_VIDEO_REWARDS',
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

  // -------------------------------------------------------------
  // LIVE ACTIVITY POPUPS (PART 2 #6)
  // -------------------------------------------------------------
  static async getLivePopups(onlyActive = false) {
    const [settingsRow, items] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: 'LIVE_POPUP_SETTINGS' } }),
      prisma.liveActivityPopup.findMany({
        where: onlyActive ? { isActive: true } : {},
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    let settings = DEFAULT_LIVE_POPUP_SETTINGS;
    if (settingsRow) {
      try {
        settings = { ...DEFAULT_LIVE_POPUP_SETTINGS, ...JSON.parse(settingsRow.value) };
      } catch {}
    }

    return { settings, items };
  }

  static async createLivePopup(
    adminId: string,
    data: { eventType: string; amountText: string; timeText: string; isActive?: boolean }
  ) {
    const count = await prisma.liveActivityPopup.count();
    const created = await prisma.liveActivityPopup.create({
      data: {
        eventType: data.eventType.trim(),
        amountText: data.amountText.trim(),
        timeText: data.timeText.trim(),
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        orderIndex: count + 1,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'CREATE_LIVE_POPUP',
        resourceType: 'LiveActivityPopup',
        resourceId: created.id,
        details: JSON.stringify(created),
      },
    }).catch(() => {});
    return created;
  }

  static async updateLivePopup(
    adminId: string,
    id: string,
    data: Partial<{ eventType: string; amountText: string; timeText: string; isActive: boolean; orderIndex: number }>
  ) {
    const updated = await prisma.liveActivityPopup.update({
      where: { id },
      data: {
        ...(data.eventType !== undefined ? { eventType: data.eventType.trim() } : {}),
        ...(data.amountText !== undefined ? { amountText: data.amountText.trim() } : {}),
        ...(data.timeText !== undefined ? { timeText: data.timeText.trim() } : {}),
        ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
        ...(data.orderIndex !== undefined ? { orderIndex: Number(data.orderIndex) } : {}),
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_LIVE_POPUP',
        resourceType: 'LiveActivityPopup',
        resourceId: id,
        details: JSON.stringify(data),
      },
    }).catch(() => {});
    return updated;
  }

  static async deleteLivePopup(adminId: string, id: string) {
    const deleted = await prisma.liveActivityPopup.delete({ where: { id } });
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'DELETE_LIVE_POPUP',
        resourceType: 'LiveActivityPopup',
        resourceId: id,
        details: JSON.stringify({ eventType: deleted.eventType, amountText: deleted.amountText }),
      },
    }).catch(() => {});
    return deleted;
  }

  static async updateLivePopupSettings(
    adminId: string,
    data: Partial<{ enabled: boolean; intervalSeconds: number; durationSeconds: number }>
  ) {
    const current = (await this.getLivePopups(false)).settings;
    const merged = {
      enabled: data.enabled !== undefined ? Boolean(data.enabled) : current.enabled,
      intervalSeconds: Math.max(2, Math.min(60, Number(data.intervalSeconds ?? current.intervalSeconds) || 6)),
      durationSeconds: Math.max(2, Math.min(20, Number(data.durationSeconds ?? current.durationSeconds) || 5)),
    };
    await prisma.systemSetting.upsert({
      where: { key: 'LIVE_POPUP_SETTINGS' },
      update: { value: JSON.stringify(merged), updatedAt: new Date() },
      create: {
        key: 'LIVE_POPUP_SETTINGS',
        value: JSON.stringify(merged),
        description: 'Master toggle, interval, and display duration for member homepage live activity popups',
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_LIVE_POPUP_SETTINGS',
        resourceType: 'SystemSetting',
        resourceId: 'LIVE_POPUP_SETTINGS',
        details: JSON.stringify(merged),
      },
    }).catch(() => {});
    return merged;
  }

  // -------------------------------------------------------------
  // ADMIN PROACTIVE DIRECT MESSAGING TO ANY USER (PART 6 #2)
  // -------------------------------------------------------------
  static async sendDirectMessageToUser(
    senderId: string,
    recipientId: string,
    data: { subject?: string; message: string; attachmentUrl?: string; attachmentName?: string }
  ) {
    if (!data.message || !data.message.trim()) {
      throw { statusCode: 400, code: 'MESSAGE_REQUIRED', message: 'Message text is required.' };
    }
    const [sender, recipient] = await Promise.all([
      prisma.user.findUnique({ where: { id: senderId }, select: { id: true, fullName: true, role: true } }),
      prisma.user.findUnique({ where: { id: recipientId }, select: { id: true, fullName: true, email: true } }),
    ]);
    if (!recipient) {
      throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'Recipient user not found.' };
    }

    const subject = data.subject?.trim() || 'Message from U-Ads Administration';
    const cleanMessage = data.message.trim();

    const created = await prisma.$transaction(async (tx) => {
      const dm = await tx.adminDirectMessage.create({
        data: {
          senderId,
          recipientId,
          subject,
          message: cleanMessage,
          attachmentUrl: data.attachmentUrl || null,
          attachmentName: data.attachmentName || null,
          isRead: false,
        },
        include: {
          sender: { select: { id: true, fullName: true, role: true } },
        },
      });

      // Push notification alert into the user's notification bell immediately
      await tx.notification.create({
        data: {
          userId: recipientId,
          title: `📩 ${subject}`,
          message: data.attachmentUrl ? `${cleanMessage} (Screenshot attached — open Messages to view)` : cleanMessage,
          type: 'INFO',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: senderId,
          action: 'ADMIN_DIRECT_MESSAGE_SENT',
          resourceType: 'AdminDirectMessage',
          resourceId: dm.id,
          details: JSON.stringify({
            recipientId,
            recipientEmail: recipient.email,
            subject,
            hasAttachment: Boolean(data.attachmentUrl),
            senderName: sender?.fullName || 'Admin',
          }),
        },
      });

      return dm;
    });

    return created;
  }

  static async getDirectMessagesForUser(userId: string) {
    return await prisma.adminDirectMessage.findMany({
      where: { recipientId: userId },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  static async markDirectMessageRead(userId: string, messageId: string) {
    return await prisma.adminDirectMessage.updateMany({
      where: { id: messageId, recipientId: userId },
      data: { isRead: true },
    });
  }

  // Part 2 #3: Super Admin Default Theme ('orange' | 'green')
  static async getDefaultTheme(): Promise<'orange' | 'green'> {
    const row = await prisma.systemSetting.findUnique({ where: { key: 'DEFAULT_THEME' } });
    return row?.value === 'green' ? 'green' : 'orange';
  }

  static async updateDefaultTheme(adminId: string, theme: 'orange' | 'green') {
    const normalized: 'orange' | 'green' = theme === 'green' ? 'green' : 'orange';
    await prisma.systemSetting.upsert({
      where: { key: 'DEFAULT_THEME' },
      update: { value: normalized, updatedAt: new Date() },
      create: {
        key: 'DEFAULT_THEME',
        value: normalized,
        description: 'Platform default color theme for new & pre-login visitors (orange or green)',
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_DEFAULT_THEME',
        resourceType: 'SystemSetting',
        resourceId: 'DEFAULT_THEME',
        details: JSON.stringify({ defaultTheme: normalized }),
      },
    }).catch(() => {});
    return { defaultTheme: normalized };
  }
}
