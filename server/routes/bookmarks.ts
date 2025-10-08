import express from 'express';
import Bookmark from '../models/Bookmark.js';
import Post from '../models/Post.js';
import Reel from '../models/Reel.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);

    const postIds = bookmarks
      .filter(b => b.targetType === 'post')
      .map(b => b.targetId);

    const reelIds = bookmarks
      .filter(b => b.targetType === 'reel')
      .map(b => b.targetId);

    const posts = await Post.find({ _id: { $in: postIds } })
      .populate('authorId', 'username displayName profilePic verified');

    const reels = await Reel.find({ _id: { $in: reelIds } })
      .populate('authorId', 'username displayName profilePic verified');

    res.json({
      posts,
      reels
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
