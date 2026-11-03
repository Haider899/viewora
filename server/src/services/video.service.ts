import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { LedgerService } from './ledger.service.js';
import { AccountType, Currency, EntryType, LedgerTransactionType } from '../types/index.js';
import { extractYouTubeId } from '../utils/youtube.js';

const TIER_RANK: Record<string, number> = {
  Starter: 1,
  Basic: 2,
  Premium: 3,
  VIP: 4,
};

export class VideoService {
  /**
   * Retrieves list of videos with access status computed against the user's active package.
   */
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

    const userTierRank = userActivePurchase
      ? TIER_RANK[userActivePurchase.packageName] || 1
      : 0;

    const userVideoLimit = userActivePurchase?.videoLimitGranted || 0;

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

    return videos.map((v) => {
      const isAssignedToUser = !!userId && v.assignedUserId === userId;
      const requiredRank = TIER_RANK[v.minPackageTier] || 1;
      const isWithinLimit = v.orderIndex <= userVideoLimit;
      // If directly assigned by Admin to this user, grant access immediately!
      const hasTierAccess = isAssignedToUser || (userTierRank >= requiredRank && isWithinLimit);

      return {
        ...v,
        hasAccess: hasTierAccess,
        isAssignedToUser,
        isWatched: watchedVideoIds.has(v.id),
        hasClaimedReward: claimedVideoIds.has(v.id),
        isYouTube: !!extractYouTubeId(v.videoUrl),
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
      // Check if user is staff (Super Admin or Content Admin)
      const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      const isStaff = userRecord && ['SUPER_ADMIN', 'CONTENT_ADMIN'].includes(userRecord.role);

      if (isAssignedToUser || isStaff) {
        hasAccess = true;
      } else if (video.assignedUserId && video.assignedUserId !== userId) {
        // Video is assigned exclusively to another user
        hasAccess = false;
      } else {
        const userActivePurchase = await prisma.packagePurchase.findFirst({
          where: { userId, status: 'ACTIVE' },
          orderBy: { purchasedAt: 'desc' },
        });

        const userTierRank = userActivePurchase ? TIER_RANK[userActivePurchase.packageName] || 1 : 0;
        const requiredRank = TIER_RANK[video.minPackageTier] || 1;
        const isWithinLimit = video.orderIndex <= (userActivePurchase?.videoLimitGranted || 0);

        hasAccess = userTierRank >= requiredRank && isWithinLimit;
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
      hasAccess,
      isAssignedToUser,
      isWatched,
      hasClaimedReward,
      isYouTube: !!extractYouTubeId(video.videoUrl),
    };
  }

  /**
   * Starts a secure video playback session. Generates sessionToken.
   */
  static async startSession(userId: string, videoId: string) {
    const video = await this.getVideoById(videoId, userId);
    if (!video.hasAccess) {
      throw {
        statusCode: 403,
        code: 'ACCESS_RESTRICTED',
        message: `Your current tier does not grant access to this video. Requires package tier '${video.minPackageTier}' or above.`,
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
   * Heartbeat endpoint to validate real playback engagement.
   * Client cannot fast-forward or fake time because heartbeat checks wall-clock delta!
   */
  static async recordHeartbeat(
    userId: string,
    videoId: string,
    sessionToken: string,
    clientWatchSeconds: number
  ) {
    const session = await prisma.videoSession.findUnique({
      where: { sessionToken },
      include: { video: true },
    });

    if (!session || session.userId !== userId || session.videoId !== videoId) {
      throw { statusCode: 400, code: 'INVALID_SESSION', message: 'Playback session is invalid.' };
    }

    const now = new Date();
    const elapsedRealSeconds = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);

    // Strict Anti-Cheat: client watchSeconds cannot exceed real elapsed time by more than 15s tolerance
    if (clientWatchSeconds > elapsedRealSeconds + 15) {
      throw {
        statusCode: 400,
        code: 'TIMING_ANOMALY',
        message: 'Invalid playback telemetry detected. Playback rate exceeds permissible limits.',
      };
    }

    const videoDuration = session.video.durationSeconds;
    // Mark completed if at least 80% watched or >= 60 seconds of valid engagement
    const isCompleted = clientWatchSeconds >= Math.min(videoDuration * 0.8, 60);

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
    };
  }

  /**
   * Reward claim workflow with anti-fraud duplicate prevention and double-entry ledger credit.
   */
  static async claimReward(userId: string, videoId: string, sessionToken: string) {
    if (!env.ENABLE_REWARDS) {
      throw { statusCode: 400, code: 'REWARDS_DISABLED', message: 'Rewards policy is currently in disabled mode.' };
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

    if (!session.completed) {
      throw { statusCode: 400, code: 'INCOMPLETE_VIEWING', message: 'Video must be fully completed to qualify for rewards.' };
    }

    // Check duplicate claim
    const existingClaim = await prisma.rewardClaim.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });
    if (existingClaim) {
      throw { statusCode: 400, code: 'ALREADY_CLAIMED', message: 'Reward for this video has already been claimed.' };
    }

    const rewardAmountCents = video.rewardAmountCents;

    return await prisma.$transaction(async (tx) => {
      // Create reward claim record
      const claim = await tx.rewardClaim.create({
        data: {
          userId,
          videoId,
          videoSessionId: session.id,
          amountCents: rewardAmountCents,
          currency: 'USD',
          status: 'CLAIMED',
        },
      });

      // Credit user available balance via double-entry ledger:
      // Debit: SYSTEM_EXPENSE_REWARDS
      // Credit: USER_AVAILABLE
      const userAccount = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.USER_AVAILABLE,
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
          description: `Engagement reward for: ${video.title} ($${(rewardAmountCents / 100).toFixed(2)})`,
          entries: [
            {
              accountId: sysExpenseAccount.id,
              entryType: EntryType.DEBIT,
              amountCents: rewardAmountCents,
            },
            {
              accountId: userAccount.id,
              entryType: EntryType.CREDIT,
              amountCents: rewardAmountCents,
            },
          ],
        },
        tx
      );

      return claim;
    });
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
      orderBy: [
        { createdAt: 'desc' },
      ],
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
    orderIndex?: number;
    rewardEligible?: boolean;
    rewardAmountCents?: number;
    assignedUserId?: string | null;
    isPublished?: boolean;
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
        description: data.description || 'Masterclass streaming module',
        thumbnailUrl: thumbnail,
        videoUrl: data.videoUrl,
        durationSeconds: data.durationSeconds && data.durationSeconds > 0 ? data.durationSeconds : 180,
        category: data.category || 'Special Assignment',
        minPackageTier: data.minPackageTier || 'Starter',
        orderIndex: data.orderIndex ?? count + 1,
        rewardEligible: data.rewardEligible ?? true,
        rewardAmountCents: data.rewardAmountCents ?? 50,
        assignedUserId: data.assignedUserId ? data.assignedUserId : null,
        isPublished: data.isPublished ?? true,
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
