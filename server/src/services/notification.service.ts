import prisma from '../lib/prisma.js';
import { DEFAULT_NOTIFICATION_SETTINGS } from './bootstrap.service.js';

export type NotificationEventKey = keyof typeof DEFAULT_NOTIFICATION_SETTINGS;

export class NotificationService {
  static async getSettings() {
    const row = await prisma.systemSetting.findUnique({
      where: { key: 'NOTIFICATION_SETTINGS' },
    });
    if (!row) return { ...DEFAULT_NOTIFICATION_SETTINGS };
    try {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(row.value) };
    } catch {
      return { ...DEFAULT_NOTIFICATION_SETTINGS };
    }
  }

  static async updateSettings(adminId: string, settings: Record<string, boolean>) {
    const merged = { ...(await this.getSettings()), ...settings };
    const updated = await prisma.systemSetting.upsert({
      where: { key: 'NOTIFICATION_SETTINGS' },
      update: { value: JSON.stringify(merged), updatedAt: new Date() },
      create: {
        key: 'NOTIFICATION_SETTINGS',
        value: JSON.stringify(merged),
        description: 'Toggle in-app notifications per platform event',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_NOTIFICATION_SETTINGS',
        resourceType: 'SystemSetting',
        resourceId: 'NOTIFICATION_SETTINGS',
        details: JSON.stringify(merged),
      },
    });

    return merged;
  }

  static async isEventEnabled(eventKey?: NotificationEventKey): Promise<boolean> {
    if (!eventKey) return true;
    const settings = await this.getSettings();
    return settings[eventKey] !== false;
  }

  static async send(params: {
    userId: string;
    eventKey?: NotificationEventKey;
    title: string;
    message: string;
    type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
  }) {
    try {
      const enabled = await this.isEventEnabled(params.eventKey);
      if (!enabled) return null;

      return await prisma.notification.create({
        data: {
          userId: params.userId,
          title: params.title,
          message: params.message,
          type: params.type || 'INFO',
        },
      });
    } catch (err) {
      console.error('Notification send error:', err);
      return null;
    }
  }

  static async getUserNotifications(userId: string, limit = 50) {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return { notifications, unreadCount };
  }

  static async markAsRead(userId: string, notificationId: string) {
    return await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  static async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
