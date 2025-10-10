import express from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message';
import Chat from '../models/Chat';
import Notification from '../models/Notification';
import Block from '../models/Block';
import User from '../models/User';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// simple in-memory rate limit for auto-replies: key => lastSentMs
const autoReplyLast: Map<string, number> = new Map();

// Send a message
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { chatId, content, attachments, replyToMessageId, scheduledAt } = req.body as {
      chatId: string;
      content?: string;
      attachments?: { type: 'image' | 'video' | 'file'; url: string; name?: string }[];
      replyToMessageId?: string;
      scheduledAt?: string;
    };

    if (!chatId || (!content && !(attachments && attachments.length))) {
      return res.status(400).json({ error: 'chatId and content or attachments are required' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (!chat.members.map(String).includes(req.userId!)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Block check: if either side blocked the other, do not allow sending
    if (chat.type === 'dm') {
      const otherId = chat.members.map(String).find(id => id !== req.userId);
      if (otherId) {
        const blocked = await Block.findOne({ blockerId: otherId, blockedId: req.userId });
        const youBlocked = await Block.findOne({ blockerId: req.userId, blockedId: otherId });
        if (blocked || youBlocked) {
          return res.status(403).json({ error: 'Messaging is not allowed' });
        }
      }
    }

    const scheduleDate = scheduledAt ? new Date(scheduledAt) : undefined;
    const isScheduled = !!(scheduleDate && scheduleDate.getTime() > Date.now());
    const msg = await Message.create({
      chatId: new mongoose.Types.ObjectId(chatId),
      senderId: new mongoose.Types.ObjectId(req.userId!),
      content: content || '',
      attachments: attachments || [],
      replyToMessageId: replyToMessageId ? new mongoose.Types.ObjectId(replyToMessageId) : undefined,
      status: isScheduled ? 'scheduled' : 'sent',
      scheduledAt: isScheduled ? scheduleDate : undefined,
      readBy: [new mongoose.Types.ObjectId(req.userId!)],
    });

    await Chat.findByIdAndUpdate(chatId, {
      lastMessageId: msg._id,
      lastMessageAt: msg.createdAt,
    });

    // Emit via Socket.IO immediately only if not scheduled in the future
    const io = req.app.get('io');
    if (io && !isScheduled) {
      io.to(chatId).emit('message:new', {
        _id: msg._id,
        chatId: msg.chatId,
        senderId: msg.senderId,
        content: msg.content,
        attachments: msg.attachments,
        replyToMessageId: msg.replyToMessageId,
        createdAt: msg.createdAt,
      });

      try {
        // Create notifications for other members
        const recipients = (chat.members as any[]).map(String).filter(id => id !== req.userId);
        for (const rid of recipients) {
          const notif = await Notification.create({
            userId: rid,
            type: 'message',
            fromUserId: req.userId,
            payload: { kind: 'message', chatId, messageId: msg._id },
          } as any);
          io.to(chatId).emit('notification:new', {
            _id: notif._id,
            type: 'message',
            targetUserId: rid,
            fromUserId: req.userId,
            createdAt: notif.createdAt,
            data: { chatId, messageId: msg._id }
          });
        }
      } catch {}
    }

    // Auto-reply (receiver settings)
    try {
      if (chat.type === 'dm') {
        const otherId = chat.members.map(String).find(id => id !== req.userId);
        if (otherId) {
          const other = await User.findById(otherId).select('autoReplyEnabled autoReplyText');
          if (other?.autoReplyEnabled) {
            const key = `${otherId}:${req.userId}:${chatId}`;
            const now = Date.now();
            const last = autoReplyLast.get(key) || 0;
            if (now - last > 60 * 60 * 1000) { // 1 hour cooldown
              autoReplyLast.set(key, now);
              const reply = await Message.create({
                chatId: new mongoose.Types.ObjectId(chatId),
                senderId: new mongoose.Types.ObjectId(otherId),
                content: other.autoReplyText || 'I am currently away and will reply later.',
                attachments: [],
                status: 'sent',
                readBy: [new mongoose.Types.ObjectId(otherId)]
              });
              await Chat.findByIdAndUpdate(chatId, { lastMessageId: reply._id, lastMessageAt: reply.createdAt });
              if (io) {
                io.to(chatId).emit('message:new', {
                  _id: reply._id,
                  chatId: reply.chatId,
                  senderId: reply.senderId,
                  content: reply.content,
                  attachments: [],
                  createdAt: reply.createdAt,
                });
              }
            }
          }
        }
      }
    } catch {}

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

    // Disappearing logic: when enabled, only return last 24h
    const filter: any = { chatId };
    if ((chat as any).settings?.disappearing24h) {
      const since = new Date(Date.now() - 24*60*60*1000);
      filter.createdAt = { $gte: since };
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // filter out messages deleted for requester
    const filtered = messages.filter((m:any) => !(Array.isArray(m.deletedFor) && m.deletedFor.some((id:any)=> String(id)===String(req.userId))));
    res.json(filtered);
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

// Add a reaction to a message (upsert for current user)
router.post('/:id/reactions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { emoji } = req.body as { emoji: string };
    if (!emoji) return res.status(400).json({ error: 'emoji required' });
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    // ensure user is in chat
    const chat = await Chat.findById(msg.chatId);
    if (!chat || !chat.members.map(String).includes(req.userId!)) return res.status(403).json({ error: 'Forbidden' });
    // upsert reaction
    const existing = (msg as any).reactions || [];
    const filtered = existing.filter((r:any)=> !(String(r.userId)===String(req.userId) && r.emoji===emoji));
    filtered.push({ emoji, userId: req.userId });
    (msg as any).reactions = filtered;
    await msg.save();
    const io = req.app.get('io');
    if (io) io.to(String(msg.chatId)).emit('message:reactions', { _id: msg._id, reactions: msg.reactions });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove a reaction for current user
router.delete('/:id/reactions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { emoji } = (req.body || {}) as { emoji?: string };
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    const chat = await Chat.findById(msg.chatId);
    if (!chat || !chat.members.map(String).includes(req.userId!)) return res.status(403).json({ error: 'Forbidden' });
    const existing = (msg as any).reactions || [];
    (msg as any).reactions = existing.filter((r:any)=> {
      if (emoji) return !(String(r.userId)===String(req.userId) && r.emoji===emoji);
      return String(r.userId)!==String(req.userId);
    });
    await msg.save();
    const io = req.app.get('io');
    if (io) io.to(String(msg.chatId)).emit('message:reactions', { _id: msg._id, reactions: msg.reactions });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
// Add reactions endpoints below export? Move export to end
