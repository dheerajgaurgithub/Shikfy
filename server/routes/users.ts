import express from 'express';
import User from '../models/User';
import Follow from '../models/Follow';
import Post from '../models/Post';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
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

    const updates = req.body;
    delete updates.passwordHash;
    delete updates.email;

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

    const existingFollow = await Follow.findOne({
      followerId: currentUserId,
      followingId: targetUserId
    });

    if (existingFollow) {
      return res.status(400).json({ error: 'Already following' });
    }

    await Follow.create({
      followerId: currentUserId,
      followingId: targetUserId
    });

    await User.findByIdAndUpdate(currentUserId, { $inc: { followingCount: 1 } });
    await User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: 1 } });

    res.json({ success: true, following: true });
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

router.get('/:id/posts', async (req, res) => {
  try {
    const posts = await Post.find({ authorId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('authorId', 'username displayName profilePic verified');

    res.json(posts);
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
