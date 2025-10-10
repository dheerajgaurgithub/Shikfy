import express from 'express';
import mongoose from 'mongoose';
import Chat from '../models/Chat';
import Message from '../models/Message';
import User from '../models/User';
import Follow from '../models/Follow';
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

// Folder counts for badges
router.get('/folder-counts', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const myId = req.userId!;
    const chats = await Chat.find({ members: myId }).select('inboxes updatedAt lastMessageAt');
    let primary = 0, general = 0, requests = 0;
    chats.forEach((c:any) => {
      const me = (c.inboxes||[]).find((e:any)=> String(e.userId)===String(myId));
      if (!me) return;
      if (me.folder==='primary') primary++;
      else if (me.folder==='general') general++;
      else if (me.folder==='requests' && me.accepted===false) requests++;
    });
    res.json({ primary, general, requests });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update my inbox entry (accept request or move folders)
router.patch('/:id/inbox', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { folder, accepted } = req.body as { folder?: 'primary'|'general'|'requests'; accepted?: boolean };
    const chat: any = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (!chat.members.map(String).includes(String(req.userId))) return res.status(403).json({ error: 'Forbidden' });
    const list = (chat.inboxes || []) as any[];
    const idx = list.findIndex(e => String(e.userId) === String(req.userId));
    if (idx >= 0) {
      if (folder) list[idx].folder = folder;
      if (typeof accepted === 'boolean') list[idx].accepted = accepted;
    } else {
      list.push({ userId: req.userId, folder: folder || 'primary', accepted: typeof accepted==='boolean'? accepted : true });
    }
    chat.inboxes = list;
    await chat.save();
    const populated = await Chat.findById(chat._id)
      .populate('members', 'username displayName profilePic verified')
      .populate('lastMessageId');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
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

    // Inbox seeding (Requests if recipient private and sender not following)
    let inboxes: any[] | undefined = undefined;
    if (type === 'dm' && members.length === 2) {
      const [a, b] = members.map(String);
      const otherId = a === String(currentUserId) ? b : a;
      const other = await User.findById(otherId).select('privacySettings.profileVisibility').lean();
      const isPrivate = (other as any)?.privacySettings?.profileVisibility === 'private';
      const follows = await Follow.findOne({ followerId: currentUserId, followingId: otherId }).lean();
      const request = isPrivate && !follows;
      inboxes = [
        { userId: currentUserId, folder: 'primary', accepted: true },
        { userId: otherId, folder: request ? 'requests' : 'primary', accepted: !request }
      ];
    }

    const chat = await Chat.create({
      type,
      members,
      name: type === 'group' ? name : undefined,
      createdBy: currentUserId,
      lastMessageAt: new Date(),
      inboxes,
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

// Unread chats count for current user
router.get('/unread-count', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    // get chats for user (limit to 200 for safety)
    const chats = await Chat.find({ members: userId }).select('_id lastMessageId').limit(200);
    const chatIds = chats.map(c => c._id);
    if (chatIds.length === 0) return res.json({ count: 0 });

    const lastMessageIds = chats.map(c => (c as any).lastMessageId).filter(Boolean);
    let unreadChatIds = new Set<string>();
    if (lastMessageIds.length) {
      const lastMessages = await Message.find({ _id: { $in: lastMessageIds } }).select('_id chatId readBy');
      lastMessages.forEach(m => {
        const readBy = ((m as any).readBy || []).map((r:any)=> String(typeof r === 'string' ? r : r._id));
        if (!readBy.includes(String(userId))) unreadChatIds.add(String((m as any).chatId));
      });
    }

    // Fallback: if lastMessageId not set, check latest message per chat
    const missing = chatIds.filter(id => !unreadChatIds.has(String(id)) && !lastMessageIds.some((lm:any)=> String((lm as any)?.chatId)===String(id)));
    if (missing.length) {
      const latestByChat = await Message.aggregate([
        { $match: { chatId: { $in: missing } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$chatId', doc: { $first: '$$ROOT' } } },
      ] as any);
      latestByChat.forEach((g:any)=>{
        const readBy = (g.doc.readBy || []).map((r:any)=> String(typeof r === 'string' ? r : r._id));
        if (!readBy.includes(String(userId))) unreadChatIds.add(String(g._id));
      });
    }

    return res.json({ count: unreadChatIds.size });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user's chats
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const folder = String((req.query.folder||'') as any);
    const base: any = { members: req.userId };
    if (folder === 'primary' || folder === 'general' || folder === 'requests') {
      base.inboxes = { $elemMatch: { userId: req.userId, folder } };
      if (folder === 'requests') base.inboxes.$elemMatch.accepted = false;
    }
    const chats = await Chat.find(base)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(100)
      .populate('members', 'username displayName profilePic verified lastSeen statusMessage')
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
      .populate('members', 'username displayName profilePic verified lastSeen statusMessage')
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

// Update chat settings (disappearing messages, per-user nickname)
router.patch('/:id/settings', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (!chat.members.map(String).includes(req.userId!)) return res.status(403).json({ error: 'Forbidden' });

    const { disappearing24h, nickname, muted } = req.body as { disappearing24h?: boolean; nickname?: string; muted?: boolean };

    if (typeof disappearing24h === 'boolean') {
      (chat as any).settings = (chat as any).settings || {};
      (chat as any).settings.disappearing24h = disappearing24h;
    }

    if (typeof nickname === 'string') {
      (chat as any).settings = (chat as any).settings || {};
      const list = ((chat as any).settings.nicknames || []) as Array<{ userId: any; name: string }>;
      const idx = list.findIndex(n => String(n.userId) === req.userId);
      if (idx >= 0) list[idx].name = nickname;
      else list.push({ userId: req.userId as any, name: nickname });
      (chat as any).settings.nicknames = list;
    }

    if (typeof muted === 'boolean') {
      (chat as any).settings = (chat as any).settings || {};
      const m = new Set(((chat as any).settings.mutedUsers || []).map((v:any)=> String(v)));
      if (muted) m.add(String(req.userId)); else m.delete(String(req.userId));
      (chat as any).settings.mutedUsers = Array.from(m);
    }

    await chat.save();
    const populated = await Chat.findById(chat._id)
      .populate('members', 'username displayName profilePic verified')
      .populate('lastMessageId');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
