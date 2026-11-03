import { Router } from 'express';
import { VideoController, claimRewardSchema, heartbeatSchema } from '../controllers/video.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { JWTPayload } from '../types/index.js';

// Optional auth middleware for video catalog listing
const optionalAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JWTPayload;
      req.user = decoded;
    } catch {}
  }
  next();
};

const router = Router();

router.get('/', optionalAuth, VideoController.getVideos);
router.get('/:id', optionalAuth, VideoController.getVideo);
router.post('/:id/session', authenticate, VideoController.startSession);
router.post('/:id/heartbeat', authenticate, validateRequest(heartbeatSchema), VideoController.heartbeat);
router.post('/:id/claim-reward', authenticate, validateRequest(claimRewardSchema), VideoController.claimReward);

export default router;
