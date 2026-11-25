import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { LedgerService } from './ledger.service.js';
import { NotificationService } from './notification.service.js';
import { AccountType, Currency, EntryType, LedgerTransactionType } from '../types/index.js';
import { extractYouTubeId } from '../utils/youtube.js';

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

export class VideoService {
  static async getVideos(
    userId?: string,
    filters?: { category?: string; search?: string }
  ) {
    let userActivePurchase: any = null;
    let watchedVideoIds = new Set<string>();
    let claimedVideoIds = new Set<string>();

    if (userId) {
      userActivePurchase = await prisma.packagePurchase.findFirst({
        where: { userId, status: 'ACTIVE' },
        orderBy: { purchasedAt: 'desc' },
      });

      const [views, claims] = await Promise.all([
        prisma.videoSession.findMany({
          where: { userId, completed: true },
          select: { videoId: true },
        }),
        prisma.rewardClaim.findMany({
          where: { userId },
          select: { videoId: true },
        }),
      ]);

      watchedVideoIds = new Set(views.map((v) => v.videoId));
      claimedVideoIds = new Set(claims.map((c) => c.videoId));
    }

    let userTierRank = 0;
    let userVideoLimit = 0;
    let isStaff = false;
    let userAccountLevel = 'NEW_USER';

    if (userId) {
      const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, accountLevel: true },
      });
      if (userRecord) {
        userAccountLevel = userRecord.accountLevel || 'NEW_USER';
        isStaff = ['SUPER_ADMIN', 'CONTENT_ADMIN'].includes(userRecord.role);
      }
    }

    const levelConfigs = await prisma.accountLevelConfig.findMany();
    const levelLimits: Record<string, number> = {
      NEW_USER: 0,
      LEVEL_1: 2,
      LEVEL_2: 6,
      LEVEL_3: 15,
      LEVEL_4: 30,
      LEVEL_5: 60,
    };
    levelConfigs.forEach((cfg) => {
      levelLimits[cfg.levelKey] = cfg.videoLimit;
    });

    const levelLimit = levelLimits[userAccountLevel] ?? 0;
    const purchaseLimit = userActivePurchase?.videoLimitGranted || 0;
    userVideoLimit = isStaff ? 9999 : Math.max(levelLimit, purchaseLimit);
    userTierRank = userActivePurchase ? TIER_RANK[userActivePurchase.packageName] || 1 : (userAccountLevel !== 'NEW_USER' ? 4 : 0);

    const conditions: any[] = [{ isPublished: true }];

    if (!userId) {
      conditions.push({ assignedUserId: null });
    } else {
      conditions.push({
        OR: [
          { assignedUserId: null },
          { assignedUserId: userId },
        ],
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
      orderBy: [
        { assignedUserId: 'desc' },
        { orderIndex: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const userLevelRank = LEVEL_RANK[userAccountLevel] ?? 0;

    return videos.map((v, idx) => {
      const isAssignedToUser = !!userId && v.assignedUserId === userId;
      const requiredTierRank = TIER_RANK[v.minPackageTier] || 1;
      const requiredLevelRank = LEVEL_RANK[(v as any).minAccountLevel || 'LEVEL_1'] ?? 1;
      const effectivePosition = v.orderIndex > 0 ? v.orderIndex : idx + 1;
      const isWithinLimit = effectivePosition <= userVideoLimit;
      const meetsLevelOrPackage =
        userLevelRank >= requiredLevelRank || (userActivePurchase && userTierRank >= requiredTierRank);
      const isExplicitlyLocked = Boolean((v as any).isLocked);
      const hasTierAccess =
        isStaff ||
        isAssignedToUser ||
        (!isExplicitlyLocked && userVideoLimit > 0 && isWithinLimit && meetsLevelOrPackage);

      return {
        ...v,
        // API Security: never expose stream URL for locked / next-level videos
        videoUrl: hasTierAccess ? v.videoUrl : '',
        hasAccess: hasTierAccess,
        isAssignedToUser,
        isWatched: watchedVideoIds.has(v.id),
        hasClaimedReward: claimedVideoIds.has(v.id),
        isYouTube: hasTierAccess ? !!extractYouTubeId(v.videoUrl) : false,
        userVideoLimit,
      };
    });
  }

  static async getVideoById(videoId: string, userId?: string) {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        assignedUser: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!video || !video.isPublished) {
      throw { statusCode: 404, code: 'VIDEO_NOT_FOUND', message: 'Video not found or is unpublished.' };
    }

    let hasAccess = false;
    let isWatched = false;
    let hasClaimedReward = false;
    const isAssignedToUser = !!userId && video.assignedUserId === userId;

    if (userId) {
      const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, accountLevel: true },
      });
      const isStaff = userRecord && ['SUPER_ADMIN', 'CONTENT_ADMIN'].includes(userRecord.role);

      if (isAssignedToUser || isStaff) {
        hasAccess = true;
      } else if (video.assignedUserId && video.assignedUserId !== userId) {
        hasAccess = false;
      } else {
        const userActivePurchase = await prisma.packagePurchase.findFirst({
          where: { userId, status: 'ACTIVE' },
          orderBy: { purchasedAt: 'desc' },
        });

        const levelConfigs = await prisma.accountLevelConfig.findMany();
        const levelLimits: Record<string, number> = {
          NEW_USER: 0,
          LEVEL_1: 2,
          LEVEL_2: 6,
          LEVEL_3: 15,
          LEVEL_4: 30,
          LEVEL_5: 60,
        };
        levelConfigs.forEach((cfg) => {
          levelLimits[cfg.levelKey] = cfg.videoLimit;
        });

        const userAccountLevel = userRecord?.accountLevel || 'NEW_USER';
        const levelLimit = levelLimits[userAccountLevel] ?? 0;
        const purchaseLimit = userActivePurchase?.videoLimitGranted || 0;
        const allowedLimit = Math.max(levelLimit, purchaseLimit);
        const userLevelRank = LEVEL_RANK[userAccountLevel] ?? 0;
        const requiredLevelRank = LEVEL_RANK[(video as any).minAccountLevel || 'LEVEL_1'] ?? 1;
        const requiredTierRank = TIER_RANK[video.minPackageTier] || 1;
        const userTierRank = userActivePurchase ? TIER_RANK[userActivePurchase.packageName] || 1 : 0;
        const meetsLevelOrPackage =
          userLevelRank >= requiredLevelRank || (!!userActivePurchase && userTierRank >= requiredTierRank);

        hasAccess =
          !Boolean((video as any).isLocked) &&
          allowedLimit > 0 &&
          video.orderIndex <= allowedLimit &&
          meetsLevelOrPackage;
      }

      const [session, claim] = await Promise.all([
        prisma.videoSession.findFirst({
          where: { userId, videoId, completed: true },
        }),
        prisma.rewardClaim.findUnique({
          where: { userId_videoId: { userId, videoId } },
        }),
      ]);

      isWatched = !!session;
      hasClaimedReward = !!claim;
    }

    return {
      ...video,
      // API Security: strip video stream URL when user does not have access
      videoUrl: hasAccess ? video.videoUrl : '',
      hasAccess,
      isAssignedToUser,
      isWatched,
      hasClaimedReward,
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
        message: `Increase your account level or upgrade your plan to unlock this video.`,
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

    // Preserve existing reward priority:
    // If Admin set an individual per-video rewardPercentageBps (> 0), apply it to user's qualifying volume (with rewardAmountCents floor);
    // otherwise use the video's configured fixed rewardAmountCents.
    let rewardAmountCents = video.rewardAmountCents;
    const videoPctBps = (video as any).rewardPercentageBps;
    if (typeof videoPctBps === 'number' && videoPctBps > 0) {
      const [approvedDeps, activePkgs] = await Promise.all([
        prisma.depositRequest.aggregate({
          where: { userId, status: 'APPROVED', currency: 'USD' },
          _sum: { amountCents: true },
        }),
        prisma.packagePurchase.aggregate({
          where: { userId, status: 'ACTIVE', currency: 'USD' },
          _sum: { priceCentsPaid: true },
        }),
      ]);
      const baseCents = Math.max(approvedDeps._sum.amountCents || 0, activePkgs._sum.priceCentsPaid || 0);
      const pctCents = Math.floor((baseCents * videoPctBps) / 10000);
      if (pctCents > 0) {
        rewardAmountCents = pctCents;
      }
    }

    const existingBefore = await prisma.rewardClaim.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });
    if (existingBefore) {
      throw { statusCode: 400, code: 'ALREADY_CLAIMED', message: 'Reward has already been claimed for this video.' };
    }

    const claim = await prisma.$transaction(async (tx) => {
      const existingInTx = await tx.rewardClaim.findUnique({
        where: { userId_videoId: { userId, videoId } },
      });
      if (existingInTx) {
        throw { statusCode: 400, code: 'ALREADY_CLAIMED', message: 'Reward has already been claimed for this video.' };
      }

      let createdClaim;
      try {
        createdClaim = await tx.rewardClaim.create({
          data: {
            userId,
            videoId,
            videoSessionId: session.id,
            amountCents: rewardAmountCents,
            currency: 'USD',
            status: 'CLAIMED',
          },
        });
      } catch (err: any) {
        if (err.code === 'P2002') {
          throw { statusCode: 400, code: 'ALREADY_CLAIMED', message: 'Reward has already been claimed for this video.' };
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

    return await prisma.video.create({
      data: {
        title: data.title,
        description: data.description || 'Verified U-Ads video campaign',
        thumbnailUrl: thumbnail,
        videoUrl: data.videoUrl,
        // Duration automatically captured from actual video metadata on client upload/playback
        durationSeconds: data.durationSeconds && data.durationSeconds > 0 ? data.durationSeconds : 60,
        category: data.category || 'Special Assignment',
        minPackageTier: data.minPackageTier || 'Starter',
        minAccountLevel: data.minAccountLevel || 'LEVEL_1',
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
