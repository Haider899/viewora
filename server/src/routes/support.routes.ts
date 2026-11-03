import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  SupportController,
  sendMessageSchema,
  startConversationSchema,
} from '../controllers/support.controller.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

router.get('/faqs', SupportController.getFaqs);
router.post('/conversations', authenticate, validateRequest(startConversationSchema), SupportController.getOrCreateConversation);
router.get('/conversations/:id', authenticate, SupportController.getConversation);
router.post('/conversations/:id/messages', authenticate, validateRequest(sendMessageSchema), SupportController.sendMessage);
router.post('/conversations/:id/escalate', authenticate, SupportController.escalate);

export default router;
