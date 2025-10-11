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

// Vote in a poll
router.post('/:id/polls/vote', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { optionId } = req.body as { optionId: string };
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (!(post as any).poll) return res.status(400).json({ error: 'No poll on this post' });
    if ((post as any).poll.expiresAt && new Date((post as any).poll.expiresAt) < new Date()) return res.status(400).json({ error: 'Poll expired' });
    // prevent multi-vote by user: naive approach using Notification or separate collection; for now in-memory check is not viable, so keep simple
    // Increment count for selected option
    const idx = (post as any).poll.options.findIndex((o:any)=> String(o.id)===String(optionId));
    if (idx<0) return res.status(400).json({ error: 'Invalid option' });
    (post as any).poll.options[idx].count = Number((post as any).poll.options[idx].count||0) + 1;
    await post.save();
    const io = (req as any).app.get('io');
    if (io) io.emit('post:pollUpdate', { postId: post._id, poll: (post as any).poll });
    res.json({ success: true, poll: (post as any).poll });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
  } catch {}
}

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { caption, richContent, media, location, visibility, hashtags, allowList, excludeList, status, scheduledAt, coAuthors, poll, hubId } = req.body;

    const post = await Post.create({
      authorId: req.userId,
      caption,
      richContent: richContent || '',
      media,
      location,
      visibility: visibility || 'public',
      allowList: Array.isArray(allowList) ? allowList : [],
      excludeList: Array.isArray(excludeList) ? excludeList : [],
      status: status === 'draft' ? 'draft' : (status === 'scheduled' ? 'scheduled' : 'published'),
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      coAuthors: Array.isArray(coAuthors) ? coAuthors : [],
      poll: poll && poll.question && Array.isArray(poll.options) ? {
        question: String(poll.question),
        options: poll.options.map((o:any)=> ({ id: String(o.id||o.text), text: String(o.text), count: Number(o.count||0) })),
        expiresAt: poll.expiresAt ? new Date(poll.expiresAt) : undefined
      } : undefined,
      hubId: hubId || undefined,
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
    const random = String(req.query.random||'').toLowerCase()==='true';

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
    let candidates: any[];
    if (random && page===1) {
      const sampled = await Post.aggregate([
        { $sample: { size: limit * 2 } },
      ] as any);
      const ids = sampled.map((d:any)=> d._id);
      candidates = await Post.find({ _id: { $in: ids } })
        .populate('authorId', 'username displayName profilePic verified closeFriends');
    } else {
      candidates = await Post.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit * 2)
        .populate('authorId', 'username displayName profilePic verified closeFriends');
    }

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
    // allow co-authors to edit limited fields
    const isAuthor = String(post.authorId) === req.userId;
    const isCoAuthor = Array.isArray((post as any).coAuthors) && (post as any).coAuthors.map(String).includes(String(req.userId));
    if (!isAuthor && !isCoAuthor) return res.status(403).json({ error: 'Forbidden' });
    const { caption, richContent, media, visibility, allowList, excludeList, status, scheduledAt, location, coAuthors, poll } = req.body;
    if (caption !== undefined) (post as any).caption = caption;
    if (location !== undefined) (post as any).location = location;
    if (media !== undefined) (post as any).media = media;
    if (richContent !== undefined) (post as any).richContent = richContent;
    if (visibility) (post as any).visibility = visibility;
    if (allowList) (post as any).allowList = allowList;
    if (excludeList) (post as any).excludeList = excludeList;
    if (status) (post as any).status = status;
    if (scheduledAt !== undefined) (post as any).scheduledAt = scheduledAt ? new Date(scheduledAt) : undefined;
    if (coAuthors && isAuthor) (post as any).coAuthors = coAuthors; // only author can change co-authors
    if (poll && isAuthor) {
      (post as any).poll = poll && poll.question && Array.isArray(poll.options) ? {
        question: String(poll.question),
        options: poll.options.map((o:any)=> ({ id: String(o.id||o.text), text: String(o.text), count: Number(o.count||0) })),
        expiresAt: poll.expiresAt ? new Date(poll.expiresAt) : undefined
      } : undefined;
    }
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
      const notif = await Notification.create({
        userId: post.authorId,
        type: 'like',
        fromUserId: userId,
        postId: postId
      });
      const io = (req as any).app.get('io');
      if (io) io.emit('notification:new', { _id: notif._id, type: 'like', targetUserId: String(post.authorId), fromUserId: userId, createdAt: notif.createdAt, data: { postId } });
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

    // Simple moderation: if author is private, block toxic/spammy comments
    try {
      const post = await Post.findById(postId).select('authorId');
      if (post) {
        const author = await User.findById((post as any).authorId).select('privacySettings');
        const isPrivate = (author as any)?.privacySettings?.profileVisibility === 'private';
        if (isPrivate) {
          const banned = [
            'hate', 'kill', 'suicide', 'racist', 'terror', 'sex', 'nazi', 'slur', 'idiot', 'stupid', 'dumb'
          ];
          const lowered = String(text).toLowerCase();
          const hasBanned = banned.some(w => lowered.includes(w));
          const repeatedChars = /(.)\1{5,}/.test(lowered); // e.g., aaaaaa
          const repeatedWords = /(\b\w+\b)(?:\s+\1){3,}/i.test(lowered); // word repeated 4+ times
          if (hasBanned || repeatedChars || repeatedWords) {
            return res.status(400).json({ error: 'Comment flagged by moderation' });
          }
        }
      }
    } catch {}

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
      const notif = await Notification.create({
        userId: post.authorId,
        type: 'comment',
        fromUserId: req.userId!,
        postId: postId,
        commentId: comment._id
      });
      const io = (req as any).app.get('io');
      if (io) io.emit('notification:new', { _id: notif._id, type: 'comment', targetUserId: String(post.authorId), fromUserId: req.userId, createdAt: notif.createdAt, data: { postId, commentId: String(comment._id) } });
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
