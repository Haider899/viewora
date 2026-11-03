import { PrismaClient } from '@prisma/client';
import { SupportBotService, SUPPORT_FAQS } from './supportBot.service.js';

const prisma = new PrismaClient();

export class SupportService {
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

    // Add initial greeting from Vistara AI Support Bot
    const welcome = await prisma.supportMessage.create({
      data: {
        conversationId: newConvo.id,
        senderType: 'BOT',
        senderName: 'Vistara AI Assistant',
        message: `👋 Welcome to **VistaraX Support**!
Main aapki help karne ke liye 24/7 yahan mojood hoon.

Aap mujh se Deposits, Withdrawals, Packages ya Rewards ke bare mein pooch sakte hain, ya **"Talk to Support Agent"** select karke live staff se rabta kar sakte hain.`,
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

    return convo;
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
      const botResult = SupportBotService.matchFaq(params.message);

      if (botResult.suggestEscalation || isEscalation) {
        newStatus = 'WAITING_FOR_AGENT';
      }

      // Record Bot Reply
      botMessage = await prisma.supportMessage.create({
        data: {
          conversationId: params.conversationId,
          senderType: 'BOT',
          senderName: 'Vistara AI Assistant',
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

    return {
      conversation: updatedConvo,
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
        senderName: 'Vistara AI Assistant',
        message: `🔔 **Human Support Requested**:
Aapki request Support Desk ko forward kardi gayi hai. Hamari team member abhi is chat ko dekh rahe hain aur foran reply karenge.

Aap apna sawal ya receipt screenshot yahan attach kar ke share kar dein.`,
      },
    });

    const updated = await prisma.supportConversation.update({
      where: { id: params.conversationId },
      data: {
        status: 'WAITING_FOR_AGENT',
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

    return {
      conversation: updated,
      botMessage: botConfirmation,
    };
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
   * Admin lists all conversations with filtering and pagination
   */
  public static async adminGetConversations(filter?: {
    status?: string;
    search?: string;
  }) {
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

    return updated;
  }
}
