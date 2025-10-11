import express from 'express';
import Reel from '../models/Reel';
import Follow from '../models/Follow';
import Like from '../models/Like';
import Bookmark from '../models/Bookmark';
import Comment from '../models/Comment';
import User from '../models/User';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Auto-publish scheduled reels when time reached
async function publishDueReels() {
  try {
    await Reel.updateMany({ status: 'scheduled', scheduledAt: { $lte: new Date() } }, { $set: { status: 'published' } });
  } catch {}
}

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { caption, video, audio, location, hashtags, visibility, allowList, excludeList } = req.body;

    const reel = await Reel.create({
      authorId: req.userId,
      caption,
      video,
      audio,
      location,
      visibility: visibility || 'public',
      allowList: Array.isArray(allowList) ? allowList : [],
      excludeList: Array.isArray(excludeList) ? excludeList : [],
      hashtags: hashtags || []
    });

// Who saved this reel (author only)
router.get('/:id/savers', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reel = await Reel.findById(req.params.id).select('authorId');
    if (!reel) return res.status(404).json({ error: 'Reel not found' });
    if (String(reel.authorId) !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    const savers = await Bookmark.find({ reelId: req.params.id }).populate('userId', 'username displayName profilePic verified');
    res.json(savers.map((b:any)=> b.userId));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

    const populatedReel = await Reel.findById(reel._id)
      .populate('authorId', 'username displayName profilePic verified');

    res.status(201).json(populatedReel);
  } catch (error) {
    console.error('Create reel error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/feed', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await publishDueReels();
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const random = String(req.query.random||'').toLowerCase()==='true';

    const userId = req.userId!;
    const [followingDocs, followersDocs] = await Promise.all([
      Follow.find({ followerId: userId }).select('followingId'),
      Follow.find({ followingId: userId }).select('followerId')
    ]);
    const followingIds = new Set(followingDocs.map(f => String(f.followingId)));
    const followersIds = new Set(followersDocs.map(f => String(f.followerId)));
    const mutualIds = new Set<string>();
    followingIds.forEach(id => { if (followersIds.has(id)) mutualIds.add(id); });

    let candidates: any[];
    if (random && page===1) {
      const sampled = await Reel.aggregate([
        { $sample: { size: limit * 2 } },
      ] as any);
      const ids = sampled.map((d:any)=> d._id);
      candidates = await Reel.find({ _id: { $in: ids } })
        .populate('authorId', 'username displayName profilePic verified closeFriends');
    } else {
      candidates = await Reel.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit * 2)
        .populate('authorId', 'username displayName profilePic verified closeFriends');
    }

    const visible = candidates.filter((r: any) => {
      const authorId = String(r.authorId?._id || r.authorId);
      const vis = r.visibility || 'public';
      if ((r.status === 'draft' || r.status === 'scheduled') && authorId !== String(req.userId)) return false;
      if (vis === 'public') return true;
      if (vis === 'followers') return followingIds.has(authorId);
      if (vis === 'mutuals') return mutualIds.has(authorId);
      if (vis === 'custom') {
        const allowed = (r.allowList || []).map((id: any) => String(id));
        const excluded = (r.excludeList || []).map((id: any) => String(id));
        return allowed.includes(userId) && !excluded.includes(userId);
      }
      if (vis === 'close_friends') {
        const cf = (r.authorId?.closeFriends || []).map((id: any) => String(id));
        return cf.includes(userId);
      }
      return true;
    }).slice(0, limit);

    res.json(visible);
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
    const comments = await Comment.find({ reelId: req.params.id, parentCommentId: null })
      .sort({ createdAt: -1 })
      .populate('authorId', 'username displayName profilePic verified');

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/comments', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { text, parentCommentId } = req.body;
    const reelId = req.params.id;

    if (!text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const comment = await Comment.create({
      reelId,
      authorId: req.userId,
      text,
      parentCommentId: parentCommentId || null
    });

    await Reel.findByIdAndUpdate(reelId, { $inc: { commentsCount: 1 } });

    const populatedComment = await Comment.findById(comment._id)
      .populate('authorId', 'username displayName profilePic verified');

    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Replies for a specific comment on a reel
router.get('/:reelId/comments/:commentId/replies', async (req, res) => {
  try {
    const replies = await Comment.find({ reelId: req.params.reelId, parentCommentId: req.params.commentId })
      .sort({ createdAt: 1 })
      .populate('authorId', 'username displayName profilePic verified');
    res.json(replies);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Like a comment on a reel
router.post('/:reelId/comments/:commentId/like', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { commentId } = req.params as { reelId: string; commentId: string };
    const userId = req.userId!;
    const existing = await Like.findOne({ userId, targetId: commentId, targetType: 'comment' });
    if (existing) return res.status(400).json({ error: 'Already liked' });
    await Like.create({ userId, targetId: commentId, targetType: 'comment' });
    const updated = await Comment.findByIdAndUpdate(commentId, { $inc: { likesCount: 1 } }, { new: true });
    res.json({ liked: true, likesCount: updated?.likesCount ?? 0 });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Unlike a comment on a reel
router.delete('/:reelId/comments/:commentId/like', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { commentId } = req.params as { reelId: string; commentId: string };
    const userId = req.userId!;
    const like = await Like.findOneAndDelete({ userId, targetId: commentId, targetType: 'comment' });
    if (!like) return res.status(400).json({ error: 'Not liked' });
    const updated = await Comment.findByIdAndUpdate(commentId, { $inc: { likesCount: -1 } }, { new: true });
    res.json({ liked: false, likesCount: updated?.likesCount ?? 0 });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Comment like status (reel)
router.get('/:reelId/comments/:commentId/like-status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { commentId } = req.params as { reelId: string; commentId: string };
    const like = await Like.findOne({ userId: req.userId, targetId: commentId, targetType: 'comment' });
    res.json({ liked: !!like });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit reel (caption, video props, visibility, schedule)
router.patch('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ error: 'Reel not found' });
    if (String(reel.authorId) !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    const { caption, video, audio, visibility, allowList, excludeList, status, scheduledAt, location } = req.body;
    if (caption !== undefined) (reel as any).caption = caption;
    if (location !== undefined) (reel as any).location = location;
    if (video !== undefined) (reel as any).video = video;
    if (audio !== undefined) (reel as any).audio = audio;
    if (visibility) (reel as any).visibility = visibility;
    if (allowList) (reel as any).allowList = allowList;
    if (excludeList) (reel as any).excludeList = excludeList;
    if (status) (reel as any).status = status;
    if (scheduledAt !== undefined) (reel as any).scheduledAt = scheduledAt ? new Date(scheduledAt) : undefined;
    await reel.save();
    const populated = await Reel.findById(reel._id).populate('authorId', 'username displayName profilePic verified');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Download reel assets (author only): returns URLs to video and original audio
router.get('/:id/download', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ error: 'Reel not found' });
    if (String(reel.authorId) !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    res.json({ videoUrl: (reel as any).video?.url, audioUrl: (reel as any).audio?.url });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
