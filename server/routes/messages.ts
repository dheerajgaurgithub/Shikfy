import express from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message';
import Chat from '../models/Chat';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Send a message
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { chatId, content, attachments } = req.body as {
      chatId: string;
      content?: string;
      attachments?: { type: 'image' | 'video' | 'file'; url: string; name?: string }[];
    };

    if (!chatId || (!content && !(attachments && attachments.length))) {
      return res.status(400).json({ error: 'chatId and content or attachments are required' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (!chat.members.map(String).includes(req.userId!)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const msg = await Message.create({
      chatId: new mongoose.Types.ObjectId(chatId),
      senderId: new mongoose.Types.ObjectId(req.userId!),
      content: content || '',
      attachments: attachments || [],
      status: 'sent',
      readBy: [new mongoose.Types.ObjectId(req.userId!)],
    });

    await Chat.findByIdAndUpdate(chatId, {
      lastMessageId: msg._id,
      lastMessageAt: msg.createdAt,
    });

    // Emit via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(chatId).emit('message:new', {
        _id: msg._id,
        chatId: msg.chatId,
        senderId: msg.senderId,
        content: msg.content,
        attachments: msg.attachments,
        createdAt: msg.createdAt,
      });
    }

    res.status(201).json(msg);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// List messages in a chat (paginated)
router.get('/:chatId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { chatId } = req.params as { chatId: string };
    const page = parseInt((req.query.page as string) || '1');
    const limit = Math.min(parseInt((req.query.limit as string) || '30'), 100);
    const skip = (page - 1) * limit;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (!chat.members.map(String).includes(req.userId!)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const messages = await Message.find({ chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark messages as read in a chat
router.patch('/:chatId/read', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { chatId } = req.params as { chatId: string };
    const userId = new mongoose.Types.ObjectId(req.userId!);

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (!chat.members.map(String).includes(req.userId!)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await Message.updateMany(
      { chatId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId }, $set: { status: 'read' } }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(chatId).emit('chat:read', { chatId, userId: req.userId });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
