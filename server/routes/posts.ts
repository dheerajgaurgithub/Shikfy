import express from 'express';
import Post from '../models/Post';
import Like from '../models/Like';
import Bookmark from '../models/Bookmark';
import Comment from '../models/Comment';
import User from '../models/User';
import Notification from '../models/Notification';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { caption, media, location, visibility, hashtags } = req.body;

    const post = await Post.create({
      authorId: req.userId,
      caption,
      media,
      location,
      visibility: visibility || 'public',
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ visibility: { $in: ['public', 'followers'] } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'username displayName profilePic verified');

    res.json(posts);
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
    const { text } = req.body;
    const postId = req.params.id;

    if (!text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const comment = await Comment.create({
      postId,
      authorId: req.userId,
      text
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

export default router;
