import Notification from '../models/Notification';
import express from 'express';
import User from '../models/User';
import Block from '../models/Block';
import Follow from '../models/Follow';
import Post from '../models/Post';
import Reel from '../models/Reel';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Block a user
router.post('/:id/block', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.userId === req.params.id) return res.status(400).json({ error: 'Cannot block yourself' });
    await Block.updateOne(
      { blockerId: req.userId, blockedId: req.params.id },
      { $setOnInsert: { blockerId: req.userId, blockedId: req.params.id } },
      { upsert: true }
    );
    res.json({ blocked: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Block status between current user and target user
router.get('/:id/block-status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const targetId = req.params.id;
    const me = req.userId!;
    const [byYou, byThem] = await Promise.all([
      Block.findOne({ blockerId: me, blockedId: targetId }).lean(),
      Block.findOne({ blockerId: targetId, blockedId: me }).lean(),
    ]);
    res.json({ blockedByYou: !!byYou, blockedYou: !!byThem });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get following list (basic profile info) for building custom audiences
router.get('/:id/following', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Only allow reading your own following list or if profile is public
    const target = await User.findById(req.params.id).select('privacySettings');
    if (!target) return res.status(404).json({ error: 'User not found' });
    const isSelf = req.userId === req.params.id;
    const isPrivate = target.privacySettings?.profileVisibility === 'private';
    if (isPrivate && !isSelf) return res.status(403).json({ error: 'Forbidden' });

    const follows = await Follow.find({ followerId: req.params.id }).select('followingId').limit(500);
    const followingIds = follows.map(f => f.followingId);
    const users = await User.find({ _id: { $in: followingIds } })
      .select('username displayName profilePic verified');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update close friends list
router.patch('/:id/close-friends', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.userId !== req.params.id) return res.status(403).json({ error: 'Unauthorized' });
    const { userIds } = req.body as { userIds: string[] };
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { closeFriends: Array.isArray(userIds) ? userIds : [] } },
      { new: true }
    ).select('closeFriends');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updates = req.body as Partial<{
      username: string;
      displayName: string;
      bio: string;
      profilePic: string;
      privacySettings: { profileVisibility: 'public' | 'private' };
    }>;

    // Enforce 14-day cooldown for username changes
    if (updates.username) {
      const current = await User.findById(req.params.id).select('username lastUsernameChangeAt');
      if (!current) return res.status(404).json({ error: 'User not found' });
      const now = new Date();
      const last = current.lastUsernameChangeAt ? new Date(current.lastUsernameChangeAt) : undefined;
      const diffDays = last ? Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)) : 99999;
      if (diffDays < 14) {
        return res.status(400).json({ error: `Username can be changed again in ${14 - diffDays} day(s)` });
      }
      (updates as any).lastUsernameChangeAt = now;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    ).select('-passwordHash');

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/follow', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.userId!;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const existing = await Follow.findOne({ followerId: currentUserId, followingId: targetUserId });
    if (existing) {
      return res.status(400).json({ error: 'Already following' });
    }

    const target = await User.findById(targetUserId).select('privacySettings');
    const isPrivate = (target as any)?.privacySettings?.profileVisibility === 'private';
    if (isPrivate) {
      // create a follow request notification (pending)
      const notif = await Notification.create({
        userId: targetUserId,
        type: 'follow',
        fromUserId: currentUserId,
        payload: { pending: true }
      } as any);
      const io = (req as any).app.get('io');
      if (io) io.emit('notification:new', { _id: notif._id, type: 'follow', targetUserId: targetUserId, fromUserId: currentUserId, createdAt: notif.createdAt, data: { pending: true } });
      return res.json({ success: true, requested: true });
    } else {
      await Follow.create({ followerId: currentUserId, followingId: targetUserId });
      await User.findByIdAndUpdate(currentUserId, { $inc: { followingCount: 1 } });
      await User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: 1 } });
      try {
        const notif = await Notification.create({ userId: targetUserId, type: 'follow', fromUserId: currentUserId, payload: { pending: false } } as any);
        const io = (req as any).app.get('io');
        if (io) io.emit('notification:new', { _id: notif._id, type: 'follow', targetUserId: targetUserId, fromUserId: currentUserId, createdAt: notif.createdAt, data: {} });
      } catch {}
      return res.json({ success: true, following: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept a follow request (current user is target, :fromId is requester)
router.post('/follow-requests/:fromId/accept', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const targetUserId = req.userId!;
    const fromId = req.params.fromId;
    const existing = await Follow.findOne({ followerId: fromId, followingId: targetUserId });
    if (existing) return res.json({ success: true, following: true });
    await Follow.create({ followerId: fromId as any, followingId: targetUserId as any });
    await User.findByIdAndUpdate(fromId, { $inc: { followingCount: 1 } });
    await User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: 1 } });
    // Notify requester that request accepted
    try {
      const notif = await Notification.create({ userId: fromId as any, type: 'follow', fromUserId: targetUserId as any, payload: { accepted: true } } as any);
      const io = (req as any).app.get('io');
      if (io) io.emit('notification:new', { _id: notif._id, type: 'follow', targetUserId: fromId, fromUserId: targetUserId, createdAt: notif.createdAt, data: { accepted: true } });
    } catch {}
    res.json({ success: true, accepted: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Decline a follow request (no follow created)
router.post('/follow-requests/:fromId/decline', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Optionally notify requester of decline. For now just respond ok.
    res.json({ success: true, declined: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/follow', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.userId!;

    const follow = await Follow.findOneAndDelete({
      followerId: currentUserId,
      followingId: targetUserId
    });

    if (!follow) {
      return res.status(400).json({ error: 'Not following' });
    }

    await User.findByIdAndUpdate(currentUserId, { $inc: { followingCount: -1 } });
    await User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: -1 } });

    res.json({ success: true, following: false });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/following-status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const follow = await Follow.findOne({
      followerId: req.userId,
      followingId: req.params.id
    });

    res.json({ following: !!follow });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/posts', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Privacy enforcement: if target user is private and requester is not self nor follower, hide posts
    const target = await User.findById(req.params.id).select('privacySettings profileVisibility');
    if (!target) return res.status(404).json({ error: 'User not found' });

    const isPrivate = target.privacySettings?.profileVisibility === 'private';
    const isSelf = req.userId === req.params.id;
    let isFollower = false;
    if (!isSelf && isPrivate) {
      const follow = await Follow.findOne({ followerId: req.userId, followingId: req.params.id });
      isFollower = !!follow;
    }

    if (isPrivate && !isSelf && !isFollower) {
      return res.json([]);
    }

    const posts = await Post.find({ authorId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('authorId', 'username displayName profilePic verified');

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's reels with privacy enforcement
router.get('/:id/reels', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const target = await User.findById(req.params.id).select('privacySettings');
    if (!target) return res.status(404).json({ error: 'User not found' });

    const isPrivate = target.privacySettings?.profileVisibility === 'private';
    const isSelf = req.userId === req.params.id;
    let isFollower = false;
    if (!isSelf && isPrivate) {
      const follow = await Follow.findOne({ followerId: req.userId, followingId: req.params.id });
      isFollower = !!follow;
    }

    if (isPrivate && !isSelf && !isFollower) {
      return res.json([]);
    }

    const reels = await Reel.find({ authorId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('authorId', 'username displayName profilePic verified');

    res.json(reels);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get mentions (posts and reels) where caption contains @username
router.get('/:id/mentions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.params.id).select('username');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const mentionRegex = new RegExp(`@${user.username}\\b`, 'i');

    const [posts, reels] = await Promise.all([
      Post.find({ caption: { $regex: mentionRegex } })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('authorId', 'username displayName profilePic verified'),
      Reel.find({ caption: { $regex: mentionRegex } })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('authorId', 'username displayName profilePic verified')
    ]);

    res.json({ posts, reels });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const users = await User.find({
      $or: [
        { username: new RegExp(query, 'i') },
        { displayName: new RegExp(query, 'i') }
      ]
    })
      .select('-passwordHash')
      .limit(20);

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
