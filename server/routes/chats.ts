import express from 'express';
import mongoose from 'mongoose';
import Chat from '../models/Chat';
import Message from '../models/Message';
import User from '../models/User';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Create a chat (DM or group)
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { type, memberIds, name } = req.body as {
      type: 'dm' | 'group';
      memberIds: string[];
      name?: string;
    };

    if (!type || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'type and memberIds are required' });
    }

    const currentUserId = req.userId!;
    const membersSet = new Set<string>(memberIds.map(String));
    membersSet.add(currentUserId);
    const members = [...membersSet].map(id => new mongoose.Types.ObjectId(id));

    // Validate members exist
    const usersCount = await User.countDocuments({ _id: { $in: members } });
    if (usersCount !== members.length) {
      return res.status(400).json({ error: 'One or more members not found' });
    }

    // For DMs, avoid duplicate: same two members and type 'dm'
    if (type === 'dm' && members.length === 2) {
      const existing = await Chat.findOne({
        type: 'dm',
        members: { $all: members, $size: 2 },
      });
      if (existing) return res.json(existing);
    }

    const chat = await Chat.create({
      type,
      members,
      name: type === 'group' ? name : undefined,
      createdBy: currentUserId,
      lastMessageAt: new Date(),
    });

    const populated = await Chat.findById(chat._id)
      .populate('members', 'username displayName profilePic verified')
      .populate('lastMessageId');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user's chats
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const chats = await Chat.find({ members: req.userId })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(100)
      .populate('members', 'username displayName profilePic verified')
      .populate('lastMessageId');

    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a chat by id
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('members', 'username displayName profilePic verified')
      .populate('lastMessageId');

    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (!chat.members.map(String).includes(req.userId!)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
