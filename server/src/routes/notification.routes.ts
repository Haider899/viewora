import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { NotificationService } from '../services/notification.service.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const data = await NotificationService.getUserNotifications(req.user!.userId, limit);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    await NotificationService.markAsRead(req.user!.userId, req.params.id);
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
});

router.post('/read-all', async (req, res, next) => {
  try {
    await NotificationService.markAllAsRead(req.user!.userId);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
});

export default router;
