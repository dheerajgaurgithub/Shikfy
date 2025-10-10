import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import Post from '../models/Post';

const router = express.Router();

// Advanced search across posts
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const {
      q,
      hashtags,
      authorId,
      dateFrom,
      dateTo,
      mediaType,
      minImages,
      hasLinks
    } = req.query as any;

    const filter: any = {};

    if (q) {
      filter.$text = { $search: String(q) };
    }

    if (hashtags) {
      const arr = Array.isArray(hashtags) ? hashtags : String(hashtags).split(',');
      filter.hashtags = { $in: arr.map((h: string)=> h.replace(/^#/, '')) };
    }

    if (authorId) filter.authorId = authorId;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(String(dateFrom));
      if (dateTo) filter.createdAt.$lte = new Date(String(dateTo));
    }

    if (mediaType) {
      // image or video
      filter['media.type'] = String(mediaType);
    }

    if (minImages) {
      const n = Number(minImages) || 0;
      filter.$expr = { $gte: [{ $size: '$media' }, n] };
    }

    if (hasLinks) {
      const v = String(hasLinks).toLowerCase() === 'true';
      if (v) {
        filter.$or = [
          { caption: { $regex: /(https?:\/\/|www\.)/i } },
          { richContent: { $regex: /(https?:\/\/|www\.)/i } }
        ];
      }
    }

    const results = await Post.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('authorId', 'username displayName profilePic verified');

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
