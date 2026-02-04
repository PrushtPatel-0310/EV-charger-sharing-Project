import express from 'express';
import { body } from 'express-validator';
import {
  createOrUpgradeChat,
  getChats,
  getMessages,
  sendMessage,
  markChatRead,
  reportChat,
} from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  [body('chargerId').notEmpty().withMessage('Charger ID is required')],
  validate,
  createOrUpgradeChat
);
router.get('/', getChats);
router.get('/:chatId/messages', getMessages);
router.post(
  '/:chatId/messages',
  [body('messageText').trim().notEmpty().withMessage('Message text is required')],
  validate,
  sendMessage
);
router.patch('/:chatId/read', markChatRead);
router.post(
  '/:chatId/report',
  [body('reason').trim().notEmpty().withMessage('Reason is required')],
  validate,
  reportChat
);

export default router;
