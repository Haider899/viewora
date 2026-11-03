import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SupportService } from '../services/support.service.js';

export const startConversationSchema = z.object({
  conversationId: z.string().optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional(),
});

export const sendMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
});

export const adminReplySchema = z.object({
  message: z.string().min(1, 'Reply message cannot be empty'),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
});

export const adminStatusSchema = z.object({
  status: z.enum(['BOT', 'WAITING_FOR_AGENT', 'AGENT_ACTIVE', 'RESOLVED']),
  assignedToId: z.string().optional(),
});

export class SupportController {
  /**
   * User / Visitor starts or restores active conversation
   */
  public static async getOrCreateConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'You must be logged in to access customer support.' },
        });
      }
      const { conversationId } = req.body || {};

      const convo = await SupportService.getOrCreateConversation({
        userId,
        conversationId,
      });

      res.status(200).json({
        success: true,
        data: convo,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets conversation details and full chat history
   */
  public static async getConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'You must be logged in to access customer support.' },
        });
      }
      const convo = await SupportService.getConversation(req.params.id);
      res.status(200).json({
        success: true,
        data: convo,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User sends message (triggers automated bot response if in bot mode)
   */
  public static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'You must be logged in to send support messages.' },
        });
      }
      const { message, attachmentUrl, attachmentName } = req.body;

      const result = await SupportService.sendMessage({
        conversationId: req.params.id,
        message,
        userId,
        attachmentUrl,
        attachmentName,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User explicitly requests human support escalation
   */
  public static async escalate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'You must be logged in to request escalation.' },
        });
      }
      const result = await SupportService.escalateToHuman({
        conversationId: req.params.id,
        userId,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets FAQ items for quick prompts
   */
  public static async getFaqs(req: Request, res: Response, next: NextFunction) {
    try {
      const faqs = SupportService.getFaqs();
      res.status(200).json({
        success: true,
        data: faqs,
      });
    } catch (error) {
      next(error);
    }
  }

  // -------------------------------------------------------------
  // ADMIN HANDLERS
  // -------------------------------------------------------------

  public static async adminGetConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;

      const conversations = await SupportService.adminGetConversations({ status, search });
      res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async adminGetConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const convo = await SupportService.getConversation(req.params.id);
      res.status(200).json({
        success: true,
        data: convo,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async adminReply(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = (req as any).user.id;
      const agentName = (req as any).user.fullName || 'Support Specialist';
      const { message, attachmentUrl, attachmentName } = req.body;

      const result = await SupportService.adminReply({
        conversationId: req.params.id,
        agentId,
        agentName,
        message,
        attachmentUrl,
        attachmentName,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async adminUpdateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, assignedToId } = req.body;
      const updated = await SupportService.adminUpdateStatus({
        conversationId: req.params.id,
        status,
        assignedToId,
      });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}
