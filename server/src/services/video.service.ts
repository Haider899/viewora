import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { LedgerService } from './ledger.service.js';
import { NotificationService } from './notification.service.js';
import { AccountLevelService } from './accountLevel.service.js';
import { DEFAULT_BONUS_SETTINGS } from './bootstrap.service.js';
import { AccountType, Currency, EntryType, LedgerTransactionType } from '../types/index.js';
import { extractYouTubeId } from '../utils/youtube.js';
import { probeVideoDurationSeconds } from '../utils/videoDuration.js';

const TIER_RANK: Record<string, number> = {
  Starter: 1,
  Basic: 2,
  Premium: 3,
  VIP: 4,
};

const LEVEL_RANK: Record<string, number> = {
  NEW_USER: 0,
  LEVEL_0: 0,
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
  LEVEL_5: 5,
};

const TIER_TO_LEVEL: Record<string, string> = {
  Starter: 'LEVEL_1',
  Basic: 'LEVEL_2',
  Premium: 'LEVEL_3',
  VIP: 'LEVEL_4',
};

const LEVEL_TO_TIER: Record<string, string> = {
  NEW_USER: 'Starter',
  LEVEL_0: 'Starter',
  LEVEL_1: 'Starter',
  LEVEL_2: 'Basic',
  LEVEL_3: 'Premium',
  LEVEL_4: 'VIP',
  LEVEL_5: 'VIP',
};

export class VideoService {
  /**
   * Unified, single-source-of-truth reward calculator (Part 3 #1 & #2):
   * - Applies percentages ONLY to the video's standard reward (NEVER to member deposits!).
   * - Priority:
   *   1. Individual per-video % (`video.rewardPercentageBps`, e.g. 5000 = 50% of base reward)
   *   2. Global all-videos % × Member's level % applied to the video's standard reward
   * Returns the EXACT integer cents shown on cards, shown in player, and credited on claim.
   */
  static async getBonusRewardConfig() {
    const row = await prisma.systemSetting.findUnique({ where: { key: 'BONUS_SETTINGS' } });
    let settings: any = DEFAULT_BONUS_SETTINGS;
    if (row) {
      try {
        settings = { ...DEFAULT_BONUS_SETTINGS, ...JSON.parse(row.value) };
      } catch {}
    }
    const vb = settings.videoBonus || DEFAULT_BONUS_SETTINGS.videoBonus;
    return {
      enabled: vb.enabled !== false,
      defaultRewardCents: Number(vb.defaultRewardCents ?? 50),
      globalPercent: Number(vb.globalPercent ?? 100),
      levelPercentages: {
        NEW_USER: 0,
        LEVEL_1: 100,
        LEVEL_2: 125,
        LEVEL_3: 150,
        LEVEL_4: 200,
        LEVEL_5: 250,
        ...(vb.levelPercentages || {}),
      } as Record<string, number>,
    };
  }

  static computeEffectiveRewardCents(
    video: { rewardAmountCents: number; rewardPercentageBps?: number | null; rewardEligible?: boolean },
    userAccountLevel: string,
    cfg: { defaultRewardCents: number; globalPercent: number; levelPercentages: Record<string, number> }
  ): number {
    if (video.rewardEligible === false) return 0;
    // Part 9: Single unified base reward (defaultRewardCents, e.g. $0.50) so Packages Page, Ad Cards,
    // and actual credited amounts ALWAYS tell one consistent story (Starter $0.50, Basic $0.63, Premium $0.75, VIP $1.00).
    // If Admin sets an individual per-video %, it scales the base reward cleanly.
    const standardBaseCents = cfg.defaultRewardCents > 0 ? cfg.defaultRewardCents : 50;
    const baseCents =
      typeof video.rewardPercentageBps === 'number' && video.rewardPercentageBps > 0
        ? video.rewardAmountCents > 0
          ? video.rewardAmountCents
          : standardBaseCents
        : standardBaseCents;
    if (baseCents <= 0) return 0;

    // 1. Individual per-video % (stored in basis points: 5000 = 50%, 10000 = 100%, 15000 = 150%)
    if (typeof video.rewardPercentageBps === 'number' && video.rewardPercentageBps > 0) {
      return Math.max(1, Math.round((baseCents * video.rewardPercentageBps) / 10000));
    }

    // 2. Unified Global % × Level %
    const globalFactor = (cfg.globalPercent > 0 ? cfg.globalPercent : 100) / 100;
    const lvlPct = cfg.levelPercentages[userAccountLevel] ?? 100;
    if (lvlPct <= 0) return 0;
    const levelFactor = lvlPct / 100;
    return Math.max(1, Math.round(baseCents * globalFactor * levelFactor));
  }

  static async getCurrentCycleInfo() {
    const resetHour = await AccountLevelService.getDailyResetHour();
    return AccountLevelService.getDailyWindow(resetHour);
  }

  static async getVideos(
    userId?: string,
    filters?: { category?: string; search?: string }
  ) {
    const [cycle, rewardCfg] = await Promise.all([
      this.getCurrentCycleInfo(),
      this.getBonusRewardConfig(),
    ]);

    let userActivePurchase: any = null;
    let watchedThisCycleIds = new Set<string>();
    let claimedThisCycleIds = new Set<string>();
    let isStaff = false;
    let userAccountLevel = 'NEW_USER';

    if (userId) {
      const [purchase, userRecord, views, claims] = await Promise.all([
        prisma.packagePurchase.findFirst({
          where: { userId, status: 'ACTIVE' },
          orderBy: { purchasedAt: 'desc' },
          include: { package: true },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, accountLevel: true },
        }),
        prisma.videoSession.findMany({
          where: {
            userId,
            completed: true,
            completedAt: { gte: cycle.windowStart, lt: cycle.windowEnd },
          },
          select: { videoId: true },
        }),
        // Part 7: Match claims by BOTH cycleKey AND claimedAt inside [windowStart, windowEnd)
        // so claim records survive any system update or cycleKey format migration without resetting!
        prisma.rewardClaim.findMany({
          where: {
            userId,
            OR: [
              { cycleKey: cycle.cycleKey },
              { claimedAt: { gte: cycle.windowStart, lt: cycle.windowEnd } },
            ],
          },
          select: { videoId: true },
        }),
      ]);

      userActivePurchase = purchase;
      if (userRecord) {
        userAccountLevel = userRecord.accountLevel || 'NEW_USER';
        isStaff = ['SUPER_ADMIN', 'CONTENT_ADMIN'].includes(userRecord.role);
      }
      watchedThisCycleIds = new Set(views.map((v) => v.videoId));
      claimedThisCycleIds = new Set(claims.map((c) => c.videoId));
    }

    // Rule 3 & Rule 4: Access follows active package + assigned level (NOT list position, NOT raw deposit)
    const hasActivePackage = Boolean(userActivePurchase);
    const pkgLevelKey = userActivePurchase
      ? AccountLevelService.mapPackageToLevel(userActivePurchase.packageName)
      : 'NEW_USER';
    const effectiveUserLevel = hasActivePackage
      ? (LEVEL_RANK[userAccountLevel] ?? 0) >= (LEVEL_RANK[pkgLevelKey] ?? 0)
        ? userAccountLevel
        : pkgLevelKey
      : 'NEW_USER';
    const effectiveUserLevelRank = hasActivePackage ? (LEVEL_RANK[effectiveUserLevel] ?? 1) : 0;

    const conditions: any[] = [{ isPublished: true }];
    if (!userId) {
      conditions.push({ assignedUserId: null });
    } else {
      conditions.push({
        OR: [{ assignedUserId: null }, { assignedUserId: userId }],
      });
    }

    if (filters?.category && filters.category !== 'All') {
      conditions.push({ category: filters.category });
    }
    if (filters?.search) {
      conditions.push({
        OR: [
          { title: { contains: filters.search } },
          { description: { contains: filters.search } },
        ],
      });
    }

    const videos = await prisma.video.findMany({
      where: { AND: conditions },
      include: {
        assignedUser: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: [{ assignedUserId: 'desc' }, { orderIndex: 'asc' }, { createdAt: 'desc' }],
    });

    return videos.map((v) => {
      const isAssignedToUser = !!userId && v.assignedUserId === userId;
      const requiredLevelKey = v.minAccountLevel || TIER_TO_LEVEL[v.minPackageTier] || 'LEVEL_1';
      const requiredLevelRank = LEVEL_RANK[requiredLevelKey] ?? 1;
      const requiredPackageTier = v.minPackageTier || LEVEL_TO_TIER[requiredLevelKey] || 'Starter';
      const isExplicitlyLocked = Boolean(v.isLocked);

      // Part 1 Rule 5, 6 & Part 4 #1, #2: Access strictly by assigned level + active package!
      const hasTierAccess =
        isStaff ||
        isAssignedToUser ||
        (!isExplicitlyLocked && hasActivePackage && effectiveUserLevelRank >= requiredLevelRank);

      // Part 9: Open ads display member's active level reward; locked ads display the unlocking package's reward
      const effectiveRewardCents = this.computeEffectiveRewardCents(
        v,
        hasTierAccess && hasActivePackage ? effectiveUserLevel : requiredLevelKey,
        rewardCfg
      );

      const hasClaimedReward = claimedThisCycleIds.has(v.id);

      return {
        ...v,
        minPackageTier: requiredPackageTier,
        minAccountLevel: requiredLevelKey,
        baseRewardAmountCents: v.rewardAmountCents,
        rewardAmountCents: effectiveRewardCents,
        effectiveRewardCents,
        // API Security: never expose stream URL for locked / next-level videos
        videoUrl: hasTierAccess ? v.videoUrl : '',
        hasAccess: hasTierAccess,
        isAssignedToUser,
        isWatched: watchedThisCycleIds.has(v.id) || hasClaimedReward,
        hasClaimedReward,
        cycleKey: cycle.cycleKey,
        cycleEndsAt: cycle.windowEnd.toISOString(),
        isYouTube: hasTierAccess ? !!extractYouTubeId(v.videoUrl) : false,
      };
    });
  }

  static async getVideoById(videoId: string, userId?: string) {
    const [video, cycle, rewardCfg] = await Promise.all([
      prisma.video.findUnique({
        where: { id: videoId },
        include: {
          assignedUser: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      this.getCurrentCycleInfo(),
      this.getBonusRewardConfig(),
    ]);

    if (!video || !video.isPublished) {
      throw { statusCode: 404, code: 'VIDEO_NOT_FOUND', message: 'Video not found or is unpublished.' };
    }

    let hasAccess = false;
    let isWatched = false;
    let hasClaimedReward = false;
    let effectiveUserLevel = 'NEW_USER';
    const isAssignedToUser = !!userId && video.assignedUserId === userId;
    const requiredLevelKey = video.minAccountLevel || TIER_TO_LEVEL[video.minPackageTier] || 'LEVEL_1';
    const requiredLevelRank = LEVEL_RANK[requiredLevelKey] ?? 1;
    const requiredPackageTier = video.minPackageTier || LEVEL_TO_TIER[requiredLevelKey] || 'Starter';

    if (userId) {
      const [userRecord, userActivePurchase, session, claim] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, accountLevel: true },
        }),
        prisma.packagePurchase.findFirst({
          where: { userId, status: 'ACTIVE' },
          orderBy: { purchasedAt: 'desc' },
          include: { package: true },
        }),
        prisma.videoSession.findFirst({
          where: {
            userId,
            videoId,
            completed: true,
            completedAt: { gte: cycle.windowStart, lt: cycle.windowEnd },
          },
        }),
        // Part 7: Match claims by BOTH cycleKey AND timestamp window so claims survive updates!
        prisma.rewardClaim.findFirst({
          where: {
            userId,
            videoId,
            OR: [
              { cycleKey: cycle.cycleKey },
              { claimedAt: { gte: cycle.windowStart, lt: cycle.windowEnd } },
            ],
          },
        }),
      ]);

      const isStaff = Boolean(userRecord && ['SUPER_ADMIN', 'CONTENT_ADMIN'].includes(userRecord.role));
      const hasActivePackage = Boolean(userActivePurchase);
      const pkgLevelKey = userActivePurchase
        ? AccountLevelService.mapPackageToLevel(userActivePurchase.packageName)
        : 'NEW_USER';
      const userAccountLevel = userRecord?.accountLevel || 'NEW_USER';
      effectiveUserLevel = hasActivePackage
        ? (LEVEL_RANK[userAccountLevel] ?? 0) >= (LEVEL_RANK[pkgLevelKey] ?? 0)
          ? userAccountLevel
          : pkgLevelKey
        : 'NEW_USER';
      const effectiveUserLevelRank = hasActivePackage ? (LEVEL_RANK[effectiveUserLevel] ?? 1) : 0;

      if (isAssignedToUser || isStaff) {
        hasAccess = true;
      } else if (video.assignedUserId && video.assignedUserId !== userId) {
        hasAccess = false;
      } else {
        hasAccess =
          !Boolean(video.isLocked) &&
          hasActivePackage &&
          effectiveUserLevelRank >= requiredLevelRank;
      }

      hasClaimedReward = Boolean(claim);
      isWatched = Boolean(session) || hasClaimedReward;
    }

    const effectiveRewardCents = this.computeEffectiveRewardCents(
      video,
      hasAccess && effectiveUserLevel !== 'NEW_USER' ? effectiveUserLevel : requiredLevelKey,
      rewardCfg
    );

    return {
      ...video,
      minPackageTier: requiredPackageTier,
      minAccountLevel: requiredLevelKey,
      baseRewardAmountCents: video.rewardAmountCents,
      rewardAmountCents: effectiveRewardCents,
      effectiveRewardCents,
      // API Security: strip video stream URL when user does not have access
      videoUrl: hasAccess ? video.videoUrl : '',
      hasAccess,
      isAssignedToUser,
      isWatched,
      hasClaimedReward,
      cycleKey: cycle.cycleKey,
      cycleEndsAt: cycle.windowEnd.toISOString(),
      isYouTube: hasAccess ? !!extractYouTubeId(video.videoUrl) : false,
    };
  }

  static async startSession(userId: string, videoId: string) {
    // Check account status / lock before allowing playback
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, accountLockedUntil: true },
    });
    if (!userRecord || userRecord.status === 'SUSPENDED') {
      throw { statusCode: 403, code: 'ACCOUNT_SUSPENDED', message: 'Your account is suspended.' };
    }
    if (userRecord.accountLockedUntil && userRecord.accountLockedUntil > new Date()) {
      throw { statusCode: 403, code: 'ACCOUNT_LOCKED', message: 'Your account is temporarily locked.' };
    }

    const video = await this.getVideoById(videoId, userId);
    if (!video.hasAccess) {
      throw {
        statusCode: 403,
        code: 'ACCESS_RESTRICTED',
        message: `Upgrade to the ${video.minPackageTier} plan (${video.minAccountLevel}) to unlock this ad.`,
      };
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');

    const session = await prisma.videoSession.create({
      data: {
        userId,
        videoId,
        sessionToken,
        watchSeconds: 0,
        completed: false,
      },
    });

    return { sessionToken: session.sessionToken };
  }

  /**
   * Heartbeat endpoint: validates real playback progress against actual video duration & wall-clock time.
   * Also strictly enforces server-side video access so next-level videos cannot be spoofed via API.
   */
  static async recordHeartbeat(
    userId: string,
    videoId: string,
    sessionToken: string,
    clientWatchSeconds: number,
    actualDurationSeconds?: number
  ) {
    const accessCheck = await this.getVideoById(videoId, userId);
    if (!accessCheck.hasAccess) {
      throw {
        statusCode: 403,
        code: 'ACCESS_RESTRICTED',
        message: 'Increase your account level to access this video.',
      };
    }

    const session = await prisma.videoSession.findUnique({
      where: { sessionToken },
      include: { video: true },
    });

    if (!session || session.userId !== userId || session.videoId !== videoId) {
      throw { statusCode: 400, code: 'INVALID_SESSION', message: 'Playback session is invalid.' };
    }

    const now = new Date();
    const elapsedRealSeconds = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);

    // Anti-cheat: prevent fast-forwarding or client timer manipulation
    if (clientWatchSeconds > elapsedRealSeconds + 15) {
      throw {
        statusCode: 400,
        code: 'TIMING_ANOMALY',
        message: 'Invalid playback telemetry detected. Seeking forward or speed manipulation is prohibited.',
      };
    }

    // If actual video file metadata duration differs from placeholder, sync actual duration safely
    let videoDuration = session.video.durationSeconds;
    if (
      actualDurationSeconds &&
      Number.isFinite(actualDurationSeconds) &&
      actualDurationSeconds >= 5 &&
      actualDurationSeconds <= 7200 &&
      Math.abs(actualDurationSeconds - videoDuration) >= 2
    ) {
      await prisma.video.update({
        where: { id: videoId },
        data: { durationSeconds: Math.round(actualDurationSeconds) },
      });
      videoDuration = Math.round(actualDurationSeconds);
    }

    const requiredWatchSeconds = Math.max(5, Math.floor(videoDuration * 0.95));
    const isCompleted = clientWatchSeconds >= requiredWatchSeconds;

    const updated = await prisma.videoSession.update({
      where: { id: session.id },
      data: {
        watchSeconds: Math.min(clientWatchSeconds, videoDuration),
        completed: session.completed || isCompleted,
        completedAt: session.completed || !isCompleted ? session.completedAt : now,
        lastHeartbeat: now,
      },
    });

    return {
      watchSeconds: updated.watchSeconds,
      completed: updated.completed,
      durationSeconds: videoDuration,
    };
  }

  /**
   * Automatic server-verified reward credit into the user's dedicated USER_VIDEO_REWARDS wallet.
   * Re-watching the same video gracefully prevents duplicate credit.
   */
  static async claimReward(userId: string, videoId: string, sessionToken: string) {
    if (!env.ENABLE_REWARDS) {
      throw { statusCode: 400, code: 'REWARDS_DISABLED', message: 'Rewards policy is currently disabled.' };
    }

    const bonusSetting = await prisma.systemSetting.findUnique({ where: { key: 'BONUS_SETTINGS' } });
    if (bonusSetting) {
      try {
        const parsed = JSON.parse(bonusSetting.value);
        if (parsed?.videoBonus?.enabled === false) {
          throw { statusCode: 400, code: 'REWARDS_DISABLED', message: 'Video completion bonuses are currently paused by Admin.' };
        }
      } catch (e: any) {
        if (e.statusCode) throw e;
      }
    }

    // Strict API security: verify member still holds access to this video level
    const accessCheck = await this.getVideoById(videoId, userId);
    if (!accessCheck.hasAccess) {
      throw {
        statusCode: 403,
        code: 'ACCESS_RESTRICTED',
        message: 'Your current account level does not grant access to claim rewards for this video.',
      };
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });
    if (!video || !video.rewardEligible) {
      throw { statusCode: 400, code: 'NOT_REWARD_ELIGIBLE', message: 'This video is not eligible for completion rewards.' };
    }

    const session = await prisma.videoSession.findUnique({
      where: { sessionToken },
    });

    if (!session || session.userId !== userId || session.videoId !== videoId) {
      throw { statusCode: 400, code: 'INVALID_SESSION', message: 'Session does not match video.' };
    }

    // Strict full-duration completion check
    if (!session.completed) {
      const now = new Date();
      const elapsedRealSeconds = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);
      const effectiveWatch = Math.max(session.watchSeconds, elapsedRealSeconds);
      const requiredWatchSeconds = Math.max(5, Math.floor(video.durationSeconds * 0.95));

      if (effectiveWatch >= requiredWatchSeconds) {
        await prisma.videoSession.update({
          where: { id: session.id },
          data: {
            watchSeconds: video.durationSeconds,
            completed: true,
            completedAt: now,
          },
        });
        session.completed = true;
      } else {
        throw {
          statusCode: 400,
          code: 'INCOMPLETE_VIEWING',
          message: `Video must play through its full duration to credit rewards. Watched ${effectiveWatch}s / ${video.durationSeconds}s.`,
        };
      }
    }

    // Part 3 #1 & #2: Exact same effective reward shown on the card & player before watching!
    const rewardAmountCents = accessCheck.effectiveRewardCents;
    const cycleKey = accessCheck.cycleKey;

    if (!rewardAmountCents || rewardAmountCents <= 0) {
      throw { statusCode: 400, code: 'NO_REWARD', message: 'No reward amount is configured for this ad.' };
    }

    // Part 7: Enforce one-claim-per-cycle using BOTH cycleKey AND claimedAt timestamp window
    // so an update can NEVER reset already-claimed ads in the current 24h cycle!
    const cycle = await this.getCurrentCycleInfo();
    const existingBefore = await prisma.rewardClaim.findFirst({
      where: {
        userId,
        videoId,
        OR: [
          { cycleKey },
          { claimedAt: { gte: cycle.windowStart, lt: cycle.windowEnd } },
        ],
      },
    });
    if (existingBefore) {
      throw {
        statusCode: 400,
        code: 'ALREADY_CLAIMED',
        message: 'Reward has already been claimed for this ad in the current 24-hour cycle (8:00 PM – 7:59:59 PM).',
      };
    }

    const claim = await prisma.$transaction(async (tx) => {
      const existingInTx = await tx.rewardClaim.findFirst({
        where: {
          userId,
          videoId,
          OR: [
            { cycleKey },
            { claimedAt: { gte: cycle.windowStart, lt: cycle.windowEnd } },
          ],
        },
      });
      if (existingInTx) {
        throw {
          statusCode: 400,
          code: 'ALREADY_CLAIMED',
          message: 'Reward has already been claimed for this ad in the current 24-hour cycle.',
        };
      }

      let createdClaim;
      try {
        createdClaim = await tx.rewardClaim.create({
          data: {
            userId,
            videoId,
            videoSessionId: session.id,
            cycleKey,
            amountCents: rewardAmountCents,
            currency: 'USD',
            status: 'CLAIMED',
          },
        });
      } catch (err: any) {
        if (err.code === 'P2002') {
          throw {
            statusCode: 400,
            code: 'ALREADY_CLAIMED',
            message: 'Reward has already been claimed for this ad in the current 24-hour cycle.',
          };
        }
        throw err;
      }

      // Credit user's dedicated Video Rewards wallet (USER_VIDEO_REWARDS) via double-entry ledger
      const videoRewardsAccount = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.USER_VIDEO_REWARDS,
        Currency.USD,
        userId
      );

      const sysExpenseAccount = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.SYSTEM_EXPENSE_REWARDS,
        Currency.USD,
        null
      );

      const reference = `REW-VID-${userId.slice(0, 8)}-${videoId.slice(0, 8)}-${Date.now()}`;
      await LedgerService.postTransaction(
        {
          reference,
          transactionType: LedgerTransactionType.REWARD_CREDIT,
          currency: Currency.USD,
          description: `Video completion reward for: ${video.title} ($${(rewardAmountCents / 100).toFixed(2)} USD)`,
          entries: [
            {
              accountId: sysExpenseAccount.id,
              entryType: EntryType.DEBIT,
              amountCents: rewardAmountCents,
            },
            {
              accountId: videoRewardsAccount.id,
              entryType: EntryType.CREDIT,
              amountCents: rewardAmountCents,
            },
          ],
        },
        tx
      );

      return { ...createdClaim, alreadyClaimed: false };
    });

    if (claim && !claim.alreadyClaimed) {
      await NotificationService.send({
        userId,
        eventKey: 'videoCompleted',
        title: 'Video Completed',
        message: `You completed "${video.title}". Full watch duration verified.`,
        type: 'INFO',
      });
      await NotificationService.send({
        userId,
        eventKey: 'rewardCredited',
        title: 'Video Reward Credited!',
        message: `+$${(rewardAmountCents / 100).toFixed(2)} USD has been credited to your Video Rewards wallet for watching "${video.title}".`,
        type: 'SUCCESS',
      });
    }

    return claim;
  }

  /**
   * Allows users to transfer balance from Video Rewards Wallet -> Main Account Credits
   */
  static async transferVideoRewardsToMainBalance(userId: string, amountCents: number) {
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw { statusCode: 400, code: 'INVALID_AMOUNT', message: 'Transfer amount must be greater than $0.00.' };
    }

    const result = await prisma.$transaction(async (tx) => {
      const videoRewardsAccount = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.USER_VIDEO_REWARDS,
        Currency.USD,
        userId
      );

      if (videoRewardsAccount.balanceCents < amountCents) {
        throw {
          statusCode: 400,
          code: 'INSUFFICIENT_FUNDS',
          message: `Insufficient Video Rewards balance. Available: $${(videoRewardsAccount.balanceCents / 100).toFixed(2)} USD.`,
        };
      }

      const mainAccount = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.USER_AVAILABLE,
        Currency.USD,
        userId
      );

      const ref = `VID-CONV-${userId.slice(0, 8)}-${Date.now()}`;
      await LedgerService.postTransaction(
        {
          reference: ref,
          transactionType: LedgerTransactionType.VIDEO_REWARD_CONVERT,
          currency: Currency.USD,
          description: `Transferred $${(amountCents / 100).toFixed(2)} USD from Video Rewards Wallet to Main Account`,
          postedById: userId,
          entries: [
            {
              accountId: videoRewardsAccount.id,
              entryType: EntryType.DEBIT,
              amountCents,
            },
            {
              accountId: mainAccount.id,
              entryType: EntryType.CREDIT,
              amountCents,
            },
          ],
        },
        tx
      );

      return {
        transferredCents: amountCents,
        reference: ref,
      };
    });

    await NotificationService.send({
      userId,
      eventKey: 'rewardCredited',
      title: 'Video Rewards Transferred',
      message: `Successfully transferred $${(amountCents / 100).toFixed(2)} USD from Video Rewards into your Main Account.`,
      type: 'SUCCESS',
    });

    return result;
  }

  // Admin video operations
  static async getAllVideosAdmin(filters?: {
    search?: string;
    category?: string;
    assignedUserId?: string;
    filterType?: 'ALL' | 'ASSIGNED' | 'CATALOG';
  }) {
    const conditions: any[] = [];

    if (filters?.category && filters.category !== 'All') {
      conditions.push({ category: filters.category });
    }

    if (filters?.filterType === 'ASSIGNED') {
      conditions.push({ assignedUserId: { not: null } });
    } else if (filters?.filterType === 'CATALOG') {
      conditions.push({ assignedUserId: null });
    }

    if (filters?.assignedUserId) {
      conditions.push({ assignedUserId: filters.assignedUserId });
    }

    if (filters?.search) {
      conditions.push({
        OR: [
          { title: { contains: filters.search } },
          { description: { contains: filters.search } },
          { assignedUser: { fullName: { contains: filters.search } } },
          { assignedUser: { email: { contains: filters.search } } },
        ],
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const videos = await prisma.video.findMany({
      where,
      include: {
        assignedUser: {
          select: { id: true, fullName: true, email: true },
        },
        _count: {
          select: { sessions: true, rewardClaims: true },
        },
      },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'desc' }],
    });

    return videos.map((v) => ({
      ...v,
      isYouTube: !!extractYouTubeId(v.videoUrl),
    }));
  }

  static async createVideo(data: {
    title: string;
    description?: string;
    thumbnailUrl?: string;
    videoUrl: string;
    durationSeconds?: number;
    category?: string;
    minPackageTier?: string;
    minAccountLevel?: string;
    orderIndex?: number;
    rewardEligible?: boolean;
    rewardAmountCents?: number;
    rewardPercentageBps?: number | null;
    assignedUserId?: string | null;
    isPublished?: boolean;
    isLocked?: boolean;
  }) {
    const youtubeId = extractYouTubeId(data.videoUrl);
    let thumbnail = data.thumbnailUrl;
    if (!thumbnail && youtubeId) {
      thumbnail = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    }
    if (!thumbnail) {
      thumbnail = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80';
    }

    const count = await prisma.video.count();

    // Keep minPackageTier and minAccountLevel synchronized so changing either enforces actual access!
    const resolvedLevel = data.minAccountLevel || TIER_TO_LEVEL[data.minPackageTier || 'Starter'] || 'LEVEL_1';
    const resolvedTier = data.minPackageTier || LEVEL_TO_TIER[resolvedLevel] || 'Starter';

    // Part 6: Always probe real video duration from file/URL when adding a video
    const probedDuration = await probeVideoDurationSeconds(data.videoUrl);
    const resolvedDuration =
      probedDuration && probedDuration > 0
        ? probedDuration
        : data.durationSeconds && data.durationSeconds > 0
        ? Math.round(data.durationSeconds)
        : 60;

    return await prisma.video.create({
      data: {
        title: data.title,
        description: data.description || 'Verified U-Ads video campaign',
        thumbnailUrl: thumbnail,
        videoUrl: data.videoUrl,
        durationSeconds: resolvedDuration,
        category: data.category || 'Special Assignment',
        minPackageTier: resolvedTier,
        minAccountLevel: resolvedLevel,
        orderIndex: data.orderIndex ?? count + 1,
        rewardEligible: data.rewardEligible ?? true,
        rewardAmountCents: data.rewardAmountCents ?? 50,
        rewardPercentageBps: data.rewardPercentageBps ?? null,
        assignedUserId: data.assignedUserId ? data.assignedUserId : null,
        isPublished: data.isPublished ?? true,
        isLocked: data.isLocked ?? false,
      },
      include: {
        assignedUser: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  static async updateVideo(id: string, data: any) {
    if (data.videoUrl && !data.thumbnailUrl) {
      const youtubeId = extractYouTubeId(data.videoUrl);
      if (youtubeId) {
        data.thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
      }
    }
    if (data.assignedUserId === '') {
      data.assignedUserId = null;
    }

    // Part 4 #2 & Part 6: Fetch existing video to sync tier/level AND re-probe duration on URL change!
    const existing = await prisma.video.findUnique({
      where: { id },
      select: { minPackageTier: true, minAccountLevel: true, videoUrl: true, durationSeconds: true },
    });

    if (data.videoUrl && existing && data.videoUrl.trim() !== existing.videoUrl.trim()) {
      const probed = await probeVideoDurationSeconds(data.videoUrl);
      if (probed && probed > 0) {
        data.durationSeconds = probed;
      }
    } else if (data.videoUrl && (!data.durationSeconds || data.durationSeconds <= 0)) {
      const probed = await probeVideoDurationSeconds(data.videoUrl);
      if (probed && probed > 0) {
        data.durationSeconds = probed;
      }
    }
    if (data.minAccountLevel && data.minPackageTier && existing) {
      const tierChanged = data.minPackageTier !== existing.minPackageTier;
      const levelChanged = data.minAccountLevel !== existing.minAccountLevel;
      if (tierChanged && !levelChanged) {
        data.minAccountLevel = TIER_TO_LEVEL[data.minPackageTier] || data.minAccountLevel;
      } else if (levelChanged && !tierChanged) {
        data.minPackageTier = LEVEL_TO_TIER[data.minAccountLevel] || data.minPackageTier;
      } else if (tierChanged && levelChanged) {
        // Keep tier/level consistent if mismatched
        const expectedLevel = TIER_TO_LEVEL[data.minPackageTier];
        if (expectedLevel && expectedLevel !== data.minAccountLevel) {
          data.minPackageTier = LEVEL_TO_TIER[data.minAccountLevel] || data.minPackageTier;
        }
      }
    } else if (data.minAccountLevel && !data.minPackageTier) {
      data.minPackageTier = LEVEL_TO_TIER[data.minAccountLevel] || 'Starter';
    } else if (data.minPackageTier && !data.minAccountLevel) {
      data.minAccountLevel = TIER_TO_LEVEL[data.minPackageTier] || 'LEVEL_1';
    }

    return await prisma.video.update({
      where: { id },
      data,
      include: {
        assignedUser: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  static async deleteVideo(id: string) {
    return await prisma.video.delete({
      where: { id },
    });
  }
}
