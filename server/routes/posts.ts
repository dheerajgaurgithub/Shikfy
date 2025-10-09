import express from 'express';
import Post from '../models/Post';
import Like from '../models/Like';
import Follow from '../models/Follow';
import Bookmark from '../models/Bookmark';
import Comment from '../models/Comment';
import User from '../models/User';
import Notification from '../models/Notification';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Auto-publish any scheduled posts whose time has come
async function publishDuePosts() {
  try {
    await Post.updateMany({ status: 'scheduled', scheduledAt: { $lte: new Date() } }, { $set: { status: 'published' } });
  } catch {}
}

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { caption, media, location, visibility, hashtags, allowList, excludeList, status, scheduledAt } = req.body;

    const post = await Post.create({
      authorId: req.userId,
      caption,
      media,
      location,
      visibility: visibility || 'public',
      allowList: Array.isArray(allowList) ? allowList : [],
      excludeList: Array.isArray(excludeList) ? excludeList : [],
      status: status === 'draft' ? 'draft' : (status === 'scheduled' ? 'scheduled' : 'published'),
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      hashtags: hashtags || []
    });

    await User.findByIdAndUpdate(req.userId, { $inc: { postsCount: 1 } });

    const populatedPost = await Post.findById(post._id)
      .populate('authorId', 'username displayName profilePic verified');

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/feed', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await publishDuePosts();
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Precompute relationships for visibility decisions
    const userId = req.userId!;
    const [followingDocs, followersDocs] = await Promise.all([
      Follow.find({ followerId: userId }).select('followingId'),
      Follow.find({ followingId: userId }).select('followerId')
    ]);
    const followingIds = new Set(followingDocs.map(f => String(f.followingId)));
    const followersIds = new Set(followersDocs.map(f => String(f.followerId)));
    const mutualIds = new Set<string>();
    followingIds.forEach(id => { if (followersIds.has(id)) mutualIds.add(id); });

    // Fetch a broader set, then filter in memory to honor all modes including custom and close_friends
    const candidates = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit * 2)
      .populate('authorId', 'username displayName profilePic verified closeFriends');

    const visible = candidates.filter((p: any) => {
      const authorId = String(p.authorId?._id || p.authorId);
      const vis = p.visibility || 'public';
      // Exclude drafts and scheduled (unless viewer is author)
      if ((p.status === 'draft' || p.status === 'scheduled') && authorId !== String(req.userId)) return false;
      if (vis === 'public') return true;
      if (vis === 'followers') return followingIds.has(authorId);
      if (vis === 'mutuals') return mutualIds.has(authorId);
      if (vis === 'custom') {
        const allowed = (p.allowList || []).map((id: any) => String(id));
        const excluded = (p.excludeList || []).map((id: any) => String(id));
        return allowed.includes(userId) && !excluded.includes(userId);
      }
      if (vis === 'close_friends') {
        const cf = (p.authorId?.closeFriends || []).map((id: any) => String(id));
        return cf.includes(userId);
      }
      return true;
    }).slice(0, limit);

    res.json(visible);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit post (caption, media, visibility, schedule)
router.patch('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (String(post.authorId) !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    const { caption, media, visibility, allowList, excludeList, status, scheduledAt, location } = req.body;
    if (caption !== undefined) (post as any).caption = caption;
    if (location !== undefined) (post as any).location = location;
    if (media !== undefined) (post as any).media = media;
    if (visibility) (post as any).visibility = visibility;
    if (allowList) (post as any).allowList = allowList;
    if (excludeList) (post as any).excludeList = excludeList;
    if (status) (post as any).status = status;
    if (scheduledAt !== undefined) (post as any).scheduledAt = scheduledAt ? new Date(scheduledAt) : undefined;
    await post.save();
    const populated = await Post.findById(post._id).populate('authorId', 'username displayName profilePic verified');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Who saved this post (author only)
router.get('/:id/savers', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const post = await Post.findById(req.params.id).select('authorId');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (String(post.authorId) !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    const savers = await Bookmark.find({ postId: req.params.id }).populate('userId', 'username displayName profilePic verified');
    res.json(savers.map((b:any)=> b.userId));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('authorId', 'username displayName profilePic verified');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.authorId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updates = req.body;
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    ).populate('authorId', 'username displayName profilePic verified');

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.authorId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Post.findByIdAndDelete(req.params.id);
    await User.findByIdAndUpdate(req.userId, { $inc: { postsCount: -1 } });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/like', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const postId = req.params.id;
    const userId = req.userId!;

    const existingLike = await Like.findOne({
      userId,
      targetId: postId,
      targetType: 'post'
    });

    if (existingLike) {
      return res.status(400).json({ error: 'Already liked' });
    }

    await Like.create({
      userId,
      targetId: postId,
      targetType: 'post'
    });

    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { likesCount: 1 } },
      { new: true }
    );

    if (post && post.authorId.toString() !== userId) {
      await Notification.create({
        userId: post.authorId,
        type: 'like',
        fromUserId: userId,
        postId: postId
      });
    }

    res.json({ success: true, liked: true, likesCount: post?.likesCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/like', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const postId = req.params.id;
    const userId = req.userId!;

    const like = await Like.findOneAndDelete({
      userId,
      targetId: postId,
      targetType: 'post'
    });

    if (!like) {
      return res.status(400).json({ error: 'Not liked' });
    }

    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { likesCount: -1 } },
      { new: true }
    );

    res.json({ success: true, liked: false, likesCount: post?.likesCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/like-status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const like = await Like.findOne({
      userId: req.userId,
      targetId: req.params.id,
      targetType: 'post'
    });

    res.json({ liked: !!like });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/bookmark', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const postId = req.params.id;
    const userId = req.userId!;

    const existingBookmark = await Bookmark.findOne({
      userId,
      targetId: postId,
      targetType: 'post'
    });

    if (existingBookmark) {
      return res.status(400).json({ error: 'Already bookmarked' });
    }

    await Bookmark.create({
      userId,
      targetId: postId,
      targetType: 'post'
    });

    await Post.findByIdAndUpdate(postId, { $inc: { savesCount: 1 } });

    res.json({ success: true, bookmarked: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/bookmark', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const postId = req.params.id;
    const userId = req.userId!;

    const bookmark = await Bookmark.findOneAndDelete({
      userId,
      targetId: postId,
      targetType: 'post'
    });

    if (!bookmark) {
      return res.status(400).json({ error: 'Not bookmarked' });
    }

    await Post.findByIdAndUpdate(postId, { $inc: { savesCount: -1 } });

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
      targetType: 'post'
    });

    res.json({ bookmarked: !!bookmark });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.id, parentCommentId: null })
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
    const postId = req.params.id;

    if (!text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const comment = await Comment.create({
      postId,
      authorId: req.userId,
      text,
      parentCommentId: parentCommentId || null
    });

    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

    const populatedComment = await Comment.findById(comment._id)
      .populate('authorId', 'username displayName profilePic verified');

    const post = await Post.findById(postId);
    if (post && post.authorId.toString() !== req.userId) {
      await Notification.create({
        userId: post.authorId,
        type: 'comment',
        fromUserId: req.userId,
        postId: postId,
        commentId: comment._id
      });
    }

    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Replies for a specific comment
router.get('/:postId/comments/:commentId/replies', async (req, res) => {
  try {
    const replies = await Comment.find({ postId: req.params.postId, parentCommentId: req.params.commentId })
      .sort({ createdAt: 1 })
      .populate('authorId', 'username displayName profilePic verified');
    res.json(replies);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Like a comment on a post
router.post('/:postId/comments/:commentId/like', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { postId, commentId } = req.params as { postId: string; commentId: string };
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

// Unlike a comment on a post
router.delete('/:postId/comments/:commentId/like', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { commentId } = req.params as { postId: string; commentId: string };
    const userId = req.userId!;
    const like = await Like.findOneAndDelete({ userId, targetId: commentId, targetType: 'comment' });
    if (!like) return res.status(400).json({ error: 'Not liked' });
    const updated = await Comment.findByIdAndUpdate(commentId, { $inc: { likesCount: -1 } }, { new: true });
    res.json({ liked: false, likesCount: updated?.likesCount ?? 0 });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Comment like status (post)
router.get('/:postId/comments/:commentId/like-status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { commentId } = req.params as { postId: string; commentId: string };
    const like = await Like.findOne({ userId: req.userId, targetId: commentId, targetType: 'comment' });
    res.json({ liked: !!like });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
