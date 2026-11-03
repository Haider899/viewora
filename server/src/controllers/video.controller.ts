import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { VideoService } from '../services/video.service.js';

export const heartbeatSchema = z.object({
  sessionToken: z.string().min(10),
  watchSeconds: z.number().int().nonnegative(),
});

export const claimRewardSchema = z.object({
  sessionToken: z.string().min(10),
});

export class VideoController {
  static async getVideos(req: Request, res: Response, next: NextFunction) {
    try {
      const category = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;
      const userId = req.user?.userId;

      const videos = await VideoService.getVideos(userId, { category, search });
      res.json({
        success: true,
        data: videos,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getVideo(req: Request, res: Response, next: NextFunction) {
    try {
      const video = await VideoService.getVideoById(req.params.id, req.user?.userId);
      res.json({
        success: true,
        data: video,
      });
    } catch (err) {
      next(err);
    }
  }

  static async startSession(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await VideoService.startSession(req.user!.userId, req.params.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async heartbeat(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await VideoService.recordHeartbeat(
        req.user!.userId,
        req.params.id,
        req.body.sessionToken,
        req.body.watchSeconds
      );
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async claimReward(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await VideoService.claimReward(
        req.user!.userId,
        req.params.id,
        req.body.sessionToken
      );
      res.json({
        success: true,
        data: result,
        message: 'Reward claimed and credited to your wallet.',
      });
    } catch (err) {
      next(err);
    }
  }
}
