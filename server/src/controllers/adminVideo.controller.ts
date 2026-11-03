import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { VideoService } from '../services/video.service.js';

export const createVideoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  videoUrl: z.string().min(1, 'Video URL is required'),
  thumbnailUrl: z.string().optional(),
  durationSeconds: z.number().int().positive().optional(),
  category: z.string().optional(),
  minPackageTier: z.string().optional(),
  assignedUserId: z.string().nullable().optional(),
  isPublished: z.boolean().optional(),
  rewardEligible: z.boolean().optional(),
  rewardAmountCents: z.number().int().nonnegative().optional(),
});

export const updateVideoSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  videoUrl: z.string().min(1).optional(),
  thumbnailUrl: z.string().optional(),
  durationSeconds: z.number().int().positive().optional(),
  category: z.string().optional(),
  minPackageTier: z.string().optional(),
  assignedUserId: z.string().nullable().optional(),
  isPublished: z.boolean().optional(),
  rewardEligible: z.boolean().optional(),
  rewardAmountCents: z.number().int().nonnegative().optional(),
});

export class AdminVideoController {
  static async getVideos(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const category = req.query.category as string | undefined;
      const assignedUserId = req.query.assignedUserId as string | undefined;
      const filterType = req.query.filterType as ('ALL' | 'ASSIGNED' | 'CATALOG') | undefined;

      const videos = await VideoService.getAllVideosAdmin({
        search,
        category,
        assignedUserId,
        filterType,
      });

      res.json({
        success: true,
        data: videos,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createVideo(req: Request, res: Response, next: NextFunction) {
    try {
      const video = await VideoService.createVideo(req.body);
      res.status(201).json({
        success: true,
        data: video,
        message: req.body.assignedUserId
          ? 'Video successfully created and assigned to designated user.'
          : 'Video successfully published to the catalog.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateVideo(req: Request, res: Response, next: NextFunction) {
    try {
      const video = await VideoService.updateVideo(req.params.id, req.body);
      res.json({
        success: true,
        data: video,
        message: 'Video updated successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteVideo(req: Request, res: Response, next: NextFunction) {
    try {
      await VideoService.deleteVideo(req.params.id);
      res.json({
        success: true,
        message: 'Video deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
}
