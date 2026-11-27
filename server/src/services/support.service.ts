import { PrismaClient } from '@prisma/client';
import { SupportBotService, SUPPORT_FAQS, BotAccountContext } from './supportBot.service.js';
import { LedgerService } from './ledger.service.js';

const prisma = new PrismaClient();

export class SupportService {
  /**
   * Part 3 #1: Strictly scoped read-only summary for ONLY the member chatting in `conversationId`.
   * Returns package, level, earnings summary, and last 5 recent activities — NO full dossier,
   * NO other members, and NO edit/financial approval capabilities.
   */
  public static async getChattingMemberSummary(conversationId: string) {
    const convo = await prisma.supportConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, userId: true, guestName: true, guestEmail: true },
    });
    if (!convo) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Conversation not found.' };
    }
    if (!convo.userId) {
      return {
        isGuest: true,
        fullName: convo.guestName || 'Guest Visitor',
        email: convo.guestEmail || null,
        memberCode: null,
        activePackageName: null,
        accountLevel: 'NEW_USER',
        earnings: { videoRewardsUSD: 0, referralUSD: 0, bonusesUSD: 0, totalEarningsUSD: 0 },
        recentActivity: [],
      };
    }

    const userId = convo.userId;
    const [user, activePurchase, wallet, recentClaims, recentWithdrawals, recentDeposits] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true, email: true, memberCode: true, accountLevel: true, status: true },
      }),
      prisma.packagePurchase.findFirst({
        where: { userId, status: 'ACTIVE' },
        orderBy: { purchasedAt: 'desc' },
        select: { packageName: true, purchasedAt: true },
      }),
      LedgerService.getUserWalletSummary(userId),
      prisma.rewardClaim.findMany({
        where: { userId },
        orderBy: { claimedAt: 'desc' },
        take: 5,
        include: { video: { select: { title: true } } },
      }),
      prisma.withdrawalRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { amountCents: true, status: true, createdAt: true },
      }),
      prisma.depositRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { amountCents: true, status: true, createdAt: true },
      }),
    ]);

    if (!user) return null;

    const videoRewardsUSD = (wallet.USD?.videoRewardsCents || 0) / 100;
    const referralUSD = (wallet.USD?.referralCents || 0) / 100;
    const bonusesUSD = (wallet.USD?.otherRewardsCents || 0) / 100;

    const recentActivity = [
      ...recentClaims.map((c) => ({
        type: 'AD_REWARD',
        label: `Ad reward +$${(c.amountCents / 100).toFixed(2)} (${c.video?.title || 'Ad'})`,
        createdAt: c.claimedAt,
      })),
      ...recentWithdrawals.map((w) => ({
        type: 'WITHDRAWAL',
        label: `Withdrawal $${(w.amountCents / 100).toFixed(2)} — ${w.status}`,
        createdAt: w.createdAt,
      })),
      ...recentDeposits.map((d) => ({
        type: 'DEPOSIT',
        label: `Subscription payment $${(d.amountCents / 100).toFixed(2)} — ${d.status}`,
        createdAt: d.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      isGuest: false,
      fullName: user.fullName,
      email: user.email,
      memberCode: user.memberCode,
      status: user.status,
      activePackageName: activePurchase?.packageName || 'No Active Plan',
      accountLevel: user.accountLevel || 'NEW_USER',
      earnings: {
        videoRewardsUSD,
        referralUSD,
        bonusesUSD,
        totalEarningsUSD: videoRewardsUSD + referralUSD + bonusesUSD,
      },
      recentActivity,
    };
  }

  private static async buildAccountContext(userId?: string | null): Promise<BotAccountContext | null> {
    if (!userId) return null;
    try {
      const [user, wallet, deposits, withdrawals, totalReferrals, qualifiedReferrals] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { fullName: true, memberCode: true, accountLevel: true },
        }),
        LedgerService.getUserWalletSummary(userId),
        prisma.depositRequest.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.withdrawalRequest.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.user.count({ where: { referredById: userId } }),
        prisma.user.count({ where: { referredById: userId, isQualifiedReferral: true } }),
      ]);

      if (!user) return null;

      let referralRank = 'New';
      if (qualifiedReferrals >= 501) referralRank = 'Rank 5';
      else if (qualifiedReferrals >= 101) referralRank = 'Rank 4';
      else if (qualifiedReferrals >= 11) referralRank = 'Diamond';
      else if (qualifiedReferrals >= 6) referralRank = 'Platinum';
      else if (qualifiedReferrals >= 1) referralRank = 'Gold';

      return {
        fullName: user.fullName,
        memberCode: user.memberCode || undefined,
        accountLevel: user.accountLevel,
        mainUSD: (wallet.USD?.availableCents || 0) / 100,
        videoRewardsUSD: (wallet.USD?.videoRewardsCents || 0) / 100,
        referralUSD: (wallet.USD?.referralCents || 0) / 100,
        reservedUSD: (wallet.USD?.reservedCents || 0) / 100,
        totalReferrals,
        qualifiedReferrals,
        referralRank,
        latestDeposits: deposits.map((d) => ({
          amountUSD: d.amountCents / 100,
          status: d.status,
          transactionRef: d.transactionRef,
          rejectionReason: d.rejectionReason,
          createdAt: d.createdAt.toISOString(),
        })),
        latestWithdrawals: withdrawals.map((w) => ({
          amountUSD: w.amountCents / 100,
          status: w.status,
          payoutRef: w.payoutRef,
          rejectionReason: w.rejectionReason,
          createdAt: w.createdAt.toISOString(),
        })),
      };
    } catch {
      return null;
    }
  }

  private static async attachQueueMetadata<T extends { id: string; status: string; createdAt: Date }>(convo: T) {
    const ticketNumber = `TKT-${convo.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    let queuePosition: number | null = null;
    let estimatedWaitMinutes: number | null = null;

    if (convo.status === 'WAITING_FOR_AGENT' || convo.status === 'ESCALATED_TO_ADMIN') {
      const ahead = await prisma.supportConversation.count({
        where: {
          status: { in: ['WAITING_FOR_AGENT', 'ESCALATED_TO_ADMIN'] },
          createdAt: { lte: convo.createdAt },
        },
      });
      queuePosition = Math.max(1, ahead);
      estimatedWaitMinutes = Math.min(30, queuePosition * 3);
    }

    return {
      ...convo,
      ticketNumber,
      queuePosition,
      estimatedWaitMinutes,
    };
  }
  /**
   * Retrieves active conversation for a user or creates a new one
   */
  public static async getOrCreateConversation(params: {
    userId?: string;
    guestName?: string;
    guestEmail?: string;
    conversationId?: string;
  }) {
    // 1. If explicit conversationId is provided, try to find it
    if (params.conversationId) {
      const existing = await prisma.supportConversation.findUnique({
        where: { id: params.conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
          assignedTo: {
            select: { id: true, fullName: true, role: true },
          },
        },
      });
      if (existing) return existing;
    }

    // 2. If authenticated user, find their most recent unresolved conversation or create a fresh one
    if (params.userId) {
      const activeConvo = await prisma.supportConversation.findFirst({
        where: {
          userId: params.userId,
          status: { in: ['BOT', 'WAITING_FOR_AGENT', 'AGENT_ACTIVE'] },
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
          assignedTo: {
            select: { id: true, fullName: true, role: true },
          },
        },
      });

      if (activeConvo) return activeConvo;
    }

    // 3. Otherwise create a brand new conversation
    const newConvo = await prisma.supportConversation.create({
      data: {
        userId: params.userId || null,
        guestName: params.guestName || (params.userId ? undefined : 'Guest Visitor'),
        guestEmail: params.guestEmail || null,
        status: 'BOT',
        subject: 'General Support Inquiry',
      },
      include: {
        messages: true,
        user: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    // Add initial greeting from U-Ads Support
    const welcome = await prisma.supportMessage.create({
      data: {
        conversationId: newConvo.id,
        senderType: 'BOT',
        senderName: 'U-Ads Support',
        message: `Welcome to **U-Ads Support**.
I can answer questions about your deposits, withdrawals, plans, video rewards, and referral progress right away.

Ask a question below or select **Talk to a human** to connect with a specialist.`,
      },
    });

    return {
      ...newConvo,
      messages: [welcome],
    };
  }

  /**
   * Retrieves single conversation with ordered messages
   */
  public static async getConversation(conversationId: string) {
    const convo = await prisma.supportConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    if (!convo) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Conversation not found.' };
    }

    // Part 15: Refresh any older bot Account Summary messages live from current figures so they are never stale!
    if (convo.userId && convo.messages.some((m) => m.senderType === 'BOT' && m.message.includes('Your U-Ads Earnings Summary'))) {
      const freshCtx = await this.buildAccountContext(convo.userId);
      if (freshCtx) {
        const freshSummary = SupportBotService.matchFaq('check my wallet balance', freshCtx).answer;
        convo.messages = convo.messages.map((m) =>
          m.senderType === 'BOT' && m.message.includes('Your U-Ads Earnings Summary')
            ? { ...m, message: freshSummary }
            : m
        );
      }
    }

    return await this.attachQueueMetadata(convo);
  }

  /**
   * Sends user message. If conversation is in BOT mode, generates automated smart response.
   */
  public static async sendMessage(params: {
    conversationId: string;
    message: string;
    senderName?: string;
    userId?: string;
    attachmentUrl?: string;
    attachmentName?: string;
  }) {
    const convo = await prisma.supportConversation.findUnique({
      where: { id: params.conversationId },
      include: { user: true },
    });

    if (!convo) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Conversation not found.' };
    }

    // Determine sender name
    const senderName =
      params.senderName ||
      convo.user?.fullName ||
      convo.guestName ||
      'Customer';

    // 1. Record User Message
    const userMessage = await prisma.supportMessage.create({
      data: {
        conversationId: params.conversationId,
        senderType: 'USER',
        senderId: params.userId || null,
        senderName,
        message: params.message,
        attachmentUrl: params.attachmentUrl || null,
        attachmentName: params.attachmentName || null,
      },
    });

    let botMessage = null;
    let newStatus = convo.status;

    // Check if user requested human escalation
    const isEscalation = SupportBotService.isEscalationRequest(params.message);

    if (convo.status === 'BOT' || isEscalation) {
      const accountCtx = await this.buildAccountContext(params.userId || convo.userId);
      const botResult = SupportBotService.matchFaq(params.message, accountCtx);

      if (botResult.suggestEscalation || isEscalation) {
        newStatus = 'WAITING_FOR_AGENT';
      }

      // Record Bot Reply
      botMessage = await prisma.supportMessage.create({
        data: {
          conversationId: params.conversationId,
          senderType: 'BOT',
          senderName: 'U-Ads AI Assistant',
          message: botResult.answer,
        },
      });
    }

    // Update conversation last message timestamp & status
    const updatedConvo = await prisma.supportConversation.update({
      where: { id: params.conversationId },
      data: {
        status: newStatus,
        lastMessageAt: new Date(),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    const enrichedConvo = await this.attachQueueMetadata(updatedConvo);

    return {
      conversation: enrichedConvo,
      userMessage,
      botMessage,
    };
  }

  /**
   * Explicitly escalates conversation to human support agent
   */
  public static async escalateToHuman(params: {
    conversationId: string;
    userId?: string;
    reason?: string;
  }) {
    const convo = await prisma.supportConversation.findUnique({
      where: { id: params.conversationId },
    });

    if (!convo) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Conversation not found.' };
    }

    // System message confirming escalation
    const botConfirmation = await prisma.supportMessage.create({
      data: {
        conversationId: params.conversationId,
        senderType: 'BOT',
        senderName: 'U-Ads Support',
        message: `**Human Support Requested**
Your conversation has been added to our live support queue. A specialist will reply directly in this chat shortly.

Feel free to share your transaction reference or attach a receipt screenshot.`,
      },
    });

    // Strict Rule: Automatically assign ONLY to active ONLINE Support Agents (least-loaded)
    const availableAgents = await prisma.user.findMany({
      where: {
        role: 'SUPPORT_AGENT',
        status: 'ACTIVE',
        agentAvailability: 'ONLINE',
      },
      include: {
        assignedSupportTickets: {
          where: { status: { in: ['WAITING_FOR_AGENT', 'AGENT_ACTIVE'] } },
        },
      },
    });

    let assignedAgentId = convo.assignedToId;
    if (!assignedAgentId && availableAgents.length > 0) {
      availableAgents.sort((a, b) => a.assignedSupportTickets.length - b.assignedSupportTickets.length);
      assignedAgentId = availableAgents[0].id;
    }

    const updated = await prisma.supportConversation.update({
      where: { id: params.conversationId },
      data: {
        status: 'WAITING_FOR_AGENT',
        assignedToId: assignedAgentId,
        lastMessageAt: new Date(),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    // Notify assigned agent
    if (assignedAgentId) {
      await prisma.notification.create({
        data: {
          userId: assignedAgentId,
          title: '🛎️ New Customer Support Chat Assigned',
          message: `New support inquiry from ${convo.guestName || 'Registered User'}. Please review and respond.`,
          type: 'INFO',
        },
      });
    }

    return {
      conversation: await this.attachQueueMetadata(updated),
      botMessage: botConfirmation,
    };
  }

  /**
   * Internal Escalation to Super Admin (Section 12.6)
   */
  public static async escalateToAdmin(params: {
    conversationId: string;
    agentId: string;
    reason: string;
  }) {
    const convo = await prisma.supportConversation.findUnique({
      where: { id: params.conversationId },
    });

    if (!convo) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Conversation not found.' };
    }

    const agent = await prisma.user.findUnique({
      where: { id: params.agentId },
    });

    // Create system note in the conversation
    await prisma.supportMessage.create({
      data: {
        conversationId: params.conversationId,
        senderType: 'BOT',
        senderName: 'System Escalation',
        message: `🚨 **Internal Escalation to Platform Admin**:\nEscalated by staff member: ${agent?.fullName || 'Agent'}\nReason: ${params.reason}`,
      },
    });

    const superAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });

    const updated = await prisma.supportConversation.update({
      where: { id: params.conversationId },
      data: {
        status: 'ESCALATED_TO_ADMIN',
        priority: 'HIGH',
        assignedToId: superAdmin?.id || convo.assignedToId,
        lastMessageAt: new Date(),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    if (superAdmin) {
      await prisma.notification.create({
        data: {
          userId: superAdmin.id,
          title: '🚨 Support Ticket Escalated',
          message: `Ticket #${convo.id.slice(0, 8)} has been escalated for review by ${agent?.fullName}. Reason: ${params.reason}`,
          type: 'DANGER',
        },
      });
    }

    return updated;
  }

  /**
   * Retrieves list of FAQs for quick UI prompts
   */
  public static getFaqs() {
    return SUPPORT_FAQS;
  }

  // -------------------------------------------------------------
  // ADMIN & SUPPORT AGENT CAPABILITIES
  // -------------------------------------------------------------

  /**
   * Automatically reassigns WAITING_FOR_AGENT chats if assigned agent fails to respond within timeout
   */
  public static async reassignTimedOutChats() {
    const timeoutSetting = await prisma.systemSetting.findUnique({ where: { key: 'SUPPORT_REASSIGN_TIMEOUT_SECONDS' } });
    const timeoutSec = timeoutSetting && !isNaN(parseInt(timeoutSetting.value)) ? parseInt(timeoutSetting.value) : 180;
    const cutoff = new Date(Date.now() - timeoutSec * 1000);

    const staleChats = await prisma.supportConversation.findMany({
      where: {
        status: 'WAITING_FOR_AGENT',
        assignedToId: { not: null },
        lastMessageAt: { lt: cutoff },
      },
    });

    if (staleChats.length === 0) return;

    const onlineAgents = await prisma.user.findMany({
      where: { role: 'SUPPORT_AGENT', status: 'ACTIVE', agentAvailability: 'ONLINE' },
      include: {
        assignedSupportTickets: {
          where: { status: { in: ['WAITING_FOR_AGENT', 'AGENT_ACTIVE'] } },
        },
      },
    });

    for (const chat of staleChats) {
      const candidates = onlineAgents.filter((a) => a.id !== chat.assignedToId);
      if (candidates.length === 0) continue;

      candidates.sort((a, b) => a.assignedSupportTickets.length - b.assignedSupportTickets.length);
      const nextAgent = candidates[0];

      await prisma.supportConversation.update({
        where: { id: chat.id },
        data: { assignedToId: nextAgent.id, lastMessageAt: new Date() },
      });

      await prisma.supportMessage.create({
        data: {
          conversationId: chat.id,
          senderType: 'BOT',
          senderName: 'System Router',
          message: `🔄 Chat automatically reassigned to ${nextAgent.fullName} due to agent response timeout.`,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: chat.assignedToId,
          action: 'SUPPORT_TIMEOUT_REASSIGNED',
          resourceType: 'SupportConversation',
          resourceId: chat.id,
          details: JSON.stringify({
            previousAgentId: chat.assignedToId,
            newAgentId: nextAgent.id,
            newAgentName: nextAgent.fullName,
            timeoutSeconds: timeoutSec,
          }),
        },
      }).catch(() => {});
    }
  }

  /**
   * Admin lists all conversations with filtering and pagination
   */
  public static async adminGetConversations(filter?: {
    status?: string;
    search?: string;
  }) {
    await this.reassignTimedOutChats().catch(() => {});
    const where: any = {};

    if (filter?.status && filter.status !== 'ALL') {
      where.status = filter.status;
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      where.OR = [
        { guestName: { contains: q } },
        { guestEmail: { contains: q } },
        { user: { fullName: { contains: q } } },
        { user: { email: { contains: q } } },
        { messages: { some: { message: { contains: q } } } },
      ];
    }

    const conversations = await prisma.supportConversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, role: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // latest message preview
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return conversations;
  }

  /**
   * Admin sends a reply message to user as human agent
   */
  public static async adminReply(params: {
    conversationId: string;
    agentId: string;
    agentName: string;
    message: string;
    attachmentUrl?: string;
    attachmentName?: string;
  }) {
    const convo = await prisma.supportConversation.findUnique({
      where: { id: params.conversationId },
    });

    if (!convo) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Conversation not found.' };
    }

    // Create Agent Message
    const agentMsg = await prisma.supportMessage.create({
      data: {
        conversationId: params.conversationId,
        senderType: 'AGENT',
        senderId: params.agentId,
        senderName: params.agentName || 'Support Specialist',
        message: params.message,
        attachmentUrl: params.attachmentUrl || null,
        attachmentName: params.attachmentName || null,
      },
    });

    // Update conversation status to AGENT_ACTIVE and assign agent
    const updated = await prisma.supportConversation.update({
      where: { id: params.conversationId },
      data: {
        status: 'AGENT_ACTIVE',
        assignedToId: params.agentId,
        lastMessageAt: new Date(),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    // Audit Log & User Notification for Agent Reply
    if (convo.userId) {
      await prisma.notification.create({
        data: {
          userId: convo.userId,
          title: 'New Support Reply',
          message: `${params.agentName || 'Support Agent'} replied to your live chat: "${params.message.slice(0, 80)}"`,
          type: 'INFO',
        },
      }).catch(() => {});
    }

    await prisma.auditLog.create({
      data: {
        userId: params.agentId,
        action: 'SUPPORT_AGENT_REPLY',
        resourceType: 'SupportConversation',
        resourceId: params.conversationId,
        details: JSON.stringify({
          agentName: params.agentName,
          targetUserId: convo.userId,
          messagePreview: params.message.slice(0, 150),
          hasAttachment: !!params.attachmentUrl,
        }),
      },
    }).catch(() => {});

    return {
      conversation: updated,
      message: agentMsg,
    };
  }

  /**
   * Admin updates conversation status (e.g. mark RESOLVED or WAITING_FOR_AGENT)
   */
  public static async adminUpdateStatus(params: {
    conversationId: string;
    status: 'BOT' | 'WAITING_FOR_AGENT' | 'AGENT_ACTIVE' | 'RESOLVED';
    assignedToId?: string;
  }) {
    const convo = await prisma.supportConversation.findUnique({
      where: { id: params.conversationId },
    });

    if (!convo) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Conversation not found.' };
    }

    const updated = await prisma.supportConversation.update({
      where: { id: params.conversationId },
      data: {
        status: params.status,
        ...(params.assignedToId ? { assignedToId: params.assignedToId } : {}),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: params.assignedToId || null,
        action: `SUPPORT_STATUS_${params.status}`,
        resourceType: 'SupportConversation',
        resourceId: params.conversationId,
        details: JSON.stringify({
          previousStatus: convo.status,
          newStatus: params.status,
          targetUserId: convo.userId,
        }),
      },
    }).catch(() => {});

    return updated;
  }

  /**
   * Issue #11: Admin / Super Admin manually assigns or reassigns a conversation to a chosen agent.
   */
  public static async adminAssignConversation(params: {
    conversationId: string;
    agentId: string;
    adminId: string;
  }) {
    const [convo, targetAgent, adminUser] = await Promise.all([
      prisma.supportConversation.findUnique({ where: { id: params.conversationId } }),
      prisma.user.findUnique({ where: { id: params.agentId }, select: { id: true, fullName: true, role: true, status: true } }),
      prisma.user.findUnique({ where: { id: params.adminId }, select: { id: true, fullName: true } }),
    ]);

    if (!convo) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Conversation not found.' };
    }
    if (!targetAgent || !['SUPPORT_AGENT', 'SUPER_ADMIN'].includes(targetAgent.role)) {
      throw { statusCode: 400, code: 'INVALID_AGENT', message: 'Selected user is not an active support agent.' };
    }

    const previousAgentId = convo.assignedToId;
    const nextStatus = convo.status === 'BOT' ? 'WAITING_FOR_AGENT' : convo.status;

    const updated = await prisma.supportConversation.update({
      where: { id: params.conversationId },
      data: {
        assignedToId: targetAgent.id,
        status: nextStatus,
        lastMessageAt: new Date(),
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        user: { select: { id: true, fullName: true, email: true, role: true } },
        assignedTo: { select: { id: true, fullName: true, role: true } },
      },
    });

    await prisma.supportMessage.create({
      data: {
        conversationId: params.conversationId,
        senderType: 'BOT',
        senderName: 'System Assignment',
        message: `Conversation assigned to **${targetAgent.fullName}** by ${adminUser?.fullName || 'Administrator'}.`,
      },
    });

    await prisma.notification.create({
      data: {
        userId: targetAgent.id,
        title: 'Support Conversation Assigned',
        message: `Administrator assigned ticket #${convo.id.slice(0, 8).toUpperCase()} to you.`,
        type: 'INFO',
      },
    }).catch(() => {});

    await prisma.auditLog.create({
      data: {
        userId: params.adminId,
        action: 'SUPPORT_MANUAL_ASSIGN',
        resourceType: 'SupportConversation',
        resourceId: params.conversationId,
        details: JSON.stringify({
          previousAgentId,
          newAgentId: targetAgent.id,
          newAgentName: targetAgent.fullName,
        }),
      },
    }).catch(() => {});

    return await this.getConversation(updated.id);
  }
}
