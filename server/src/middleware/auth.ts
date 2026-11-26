import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { JWTPayload, UserRole } from '../types/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export function extractClientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  const raw =
    (Array.isArray(xff) ? xff[0] : typeof xff === 'string' ? xff.split(',')[0] : '') ||
    (req.headers['x-real-ip'] as string) ||
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown';
  return raw.trim().replace(/^::ffff:/, '') || 'unknown';
}

// Throttle lastSeenAt updates in memory so active sessions stay live without hammering SQLite
const lastSeenCache = new Map<string, number>();

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required. No token provided.' },
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JWTPayload;
    req.user = decoded;

    // Live presence & IP tracking + real-time suspension check
    const nowMs = Date.now();
    const prevMs = lastSeenCache.get(decoded.userId) || 0;
    if (nowMs - prevMs > 30000) {
      lastSeenCache.set(decoded.userId, nowMs);
      const clientIp = extractClientIp(req);
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { status: true },
      }).catch(() => null);

      if (dbUser && dbUser.status === 'SUSPENDED') {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended. Please contact support.' },
        });
      }

      if (dbUser) {
        prisma.user
          .update({
            where: { id: decoded.userId },
            data: {
              lastSeenAt: new Date(nowMs),
              ...(clientIp && clientIp !== 'unknown' ? { lastLoginIp: clientIp } : {}),
            },
          })
          .catch(() => {});
      }
    }

    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired session token.' },
    });
  }
};

export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, env.JWT_ACCESS_SECRET) as JWTPayload;
    } catch {
      // ignore invalid optional token
    }
  }
  next();
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Role '${req.user.role}' is not authorized to perform this operation.`,
        },
      });
    }

    next();
  };
};
