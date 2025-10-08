import express from 'express';
import Reel from '../models/Reel';
import Like from '../models/Like';
import Bookmark from '../models/Bookmark';
import Comment from '../models/Comment';
import User from '../models/User';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { caption, video, audio, location, hashtags } = req.body;

    const reel = await Reel.create({
      authorId: req.userId,
      caption,
      video,
      audio,
      location,
      hashtags: hashtags || []
    });

    const populatedReel = await Reel.findById(reel._id)
      .populate('authorId', 'username displayName profilePic verified');

    res.status(201).json(populatedReel);
  } catch (error) {
    console.error('Create reel error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/feed', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const reels = await Reel.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'username displayName profilePic verified');

    res.json(reels);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id)
      .populate('authorId', 'username displayName profilePic verified');

    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    res.json(reel);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/like', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reelId = req.params.id;
    const userId = req.userId!;

    const existingLike = await Like.findOne({
      userId,
      targetId: reelId,
      targetType: 'reel'
    });

    if (existingLike) {
      return res.status(400).json({ error: 'Already liked' });
    }

    await Like.create({
      userId,
      targetId: reelId,
      targetType: 'reel'
    });

    const reel = await Reel.findByIdAndUpdate(
      reelId,
      { $inc: { likesCount: 1 } },
      { new: true }
    );

    res.json({ success: true, liked: true, likesCount: reel?.likesCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/like', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reelId = req.params.id;
    const userId = req.userId!;

    const like = await Like.findOneAndDelete({
      userId,
      targetId: reelId,
      targetType: 'reel'
    });

    if (!like) {
      return res.status(400).json({ error: 'Not liked' });
    }

    const reel = await Reel.findByIdAndUpdate(
      reelId,
      { $inc: { likesCount: -1 } },
      { new: true }
    );

    res.json({ success: true, liked: false, likesCount: reel?.likesCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/like-status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const like = await Like.findOne({
      userId: req.userId,
      targetId: req.params.id,
      targetType: 'reel'
    });

    res.json({ liked: !!like });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/bookmark', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reelId = req.params.id;
    const userId = req.userId!;

    const existingBookmark = await Bookmark.findOne({
      userId,
      targetId: reelId,
      targetType: 'reel'
    });

    if (existingBookmark) {
      return res.status(400).json({ error: 'Already bookmarked' });
    }

    await Bookmark.create({
      userId,
      targetId: reelId,
      targetType: 'reel'
    });

    await Reel.findByIdAndUpdate(reelId, { $inc: { savesCount: 1 } });

    res.json({ success: true, bookmarked: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/bookmark', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reelId = req.params.id;
    const userId = req.userId!;

    const bookmark = await Bookmark.findOneAndDelete({
      userId,
      targetId: reelId,
      targetType: 'reel'
    });

    if (!bookmark) {
      return res.status(400).json({ error: 'Not bookmarked' });
    }

    await Reel.findByIdAndUpdate(reelId, { $inc: { savesCount: -1 } });

    res.json({ success: true, bookmarked: false });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/bookmark-status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const bookmark = await Bookmark.findOne({
      userId: req.userId,
      targetId: req.params.id,
      targetType: 'reel'
    });

    res.json({ bookmarked: !!bookmark });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ reelId: req.params.id })
      .sort({ createdAt: -1 })
      .populate('authorId', 'username displayName profilePic verified');

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/comments', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { text } = req.body;
    const reelId = req.params.id;

    if (!text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const comment = await Comment.create({
      reelId,
      authorId: req.userId,
      text
    });

    await Reel.findByIdAndUpdate(reelId, { $inc: { commentsCount: 1 } });

    const populatedComment = await Comment.findById(comment._id)
      .populate('authorId', 'username displayName profilePic verified');

    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
