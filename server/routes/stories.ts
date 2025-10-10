import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import Story from '../models/Story';
import Follow from '../models/Follow';
import User from '../models/User';

const router = express.Router();

// Create a story (expects media {type,url}), expires in 24h
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { media, template, text, visibility, audienceIds, batchId, poll } = req.body as any;
    if (!media?.type || !media?.url) return res.status(400).json({ error: 'media required' });
    const expiresAt = new Date(Date.now() + 24*60*60*1000);
    const story = await Story.create({ authorId: req.userId, media, template, text, visibility, audienceIds, batchId, poll, expiresAt });
    res.status(201).json(story);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Batch create stories (multi-slide)
router.post('/batch', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { slides } = req.body as { slides: Array<any> };
    if (!Array.isArray(slides) || slides.length === 0) return res.status(400).json({ error: 'slides required' });
    const expiresAt = new Date(Date.now() + 24*60*60*1000);
    const batchId = `${req.userId}-${Date.now()}`;
    const docs = slides.map(s => ({ authorId: req.userId, expiresAt, batchId, media: s.media, template: s.template, text: s.text, visibility: s.visibility, audienceIds: s.audienceIds, poll: s.poll }));
    const created = await Story.insertMany(docs);
    res.status(201).json({ batchId, count: created.length });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get active stories for a specific user
router.get('/user/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    const requester = req.userId!;
    const author = await User.findById(req.params.id).select('closeFriends');
    const isSelf = String(requester) === String(req.params.id);
    const allow = (s: any) => {
      if (isSelf) return true;
      if (!s.visibility || s.visibility === 'all') return true;
      if (s.visibility === 'close_friends') return Array.isArray((author as any)?.closeFriends) && (author as any).closeFriends.some((x:any)=> String(x)===String(requester));
      if (s.visibility === 'custom') return Array.isArray(s.audienceIds) && s.audienceIds.some((x:any)=> String(x)===String(requester));
      return false;
    };
    const storiesAll = await Story.find({ authorId: req.params.id, expiresAt: { $gt: now } }).sort({ createdAt: -1 }).lean();
    const stories = storiesAll.filter(allow).map((s:any)=> ({
      _id: s._id,
      media: s.media,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      viewersCount: Array.isArray(s.viewers)? s.viewers.length : 0,
      reactionsCount: Array.isArray(s.reactions)? s.reactions.length : 0,
      poll: s.poll ? { question: s.poll.question, options: s.poll.options||[], counts: (s.poll.options||[]).map((_:any, i:number)=> (s.poll.votes||[]).filter((v:any)=> v.optionIndex===i).length), voted: (s.poll.votes||[]).find((v:any)=> String(v.userId)===String(requester))?.optionIndex ?? null } : undefined
    }));
    res.json(stories);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Feed: active stories from you + people you follow (most recent per user first)
router.get('/feed', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    const myId = req.userId!;
    const following = await Follow.find({ followerId: myId }).select('followingId').limit(1000);
    const ids = [myId, ...following.map(f=> f.followingId)];
    const storiesAll = await Story.find({ authorId: { $in: ids }, expiresAt: { $gt: now } })
      .sort({ createdAt: -1 })
      .populate('authorId', 'username displayName profilePic closeFriends')
      .lean();

    const allow = (s: any) => {
      const isSelf = String(s.authorId._id||s.authorId) === String(myId);
      if (isSelf) return true;
      if (!s.visibility || s.visibility === 'all') return true;
      if (s.visibility === 'close_friends') return Array.isArray((s.authorId as any)?.closeFriends) && (s.authorId as any).closeFriends.some((x:any)=> String(x)===String(myId));
      if (s.visibility === 'custom') return Array.isArray(s.audienceIds) && s.audienceIds.some((x:any)=> String(x)===String(myId));
      return false;
    };
    const stories = storiesAll.filter(allow);

    // group by author
    const byAuthor: Record<string, any[]> = {};
    for (const s of stories) {
      const aid = String((s as any).authorId._id || s.authorId);
      if (!byAuthor[aid]) byAuthor[aid] = [];
      byAuthor[aid].push(s);
    }

    const items = Object.values(byAuthor).map(list => ({
      author: (list[0] as any).authorId,
      stories: list.map((s:any)=> ({
        _id: s._id,
        media: s.media,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        poll: s.poll ? { question: s.poll.question, options: s.poll.options||[], counts: (s.poll.options||[]).map((_:any, i:number)=> (s.poll.votes||[]).filter((v:any)=> String(v.userId)===String(myId) ? true : v.optionIndex===i).length) } : undefined
      }))
    }));

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark a story as viewed by current user
router.post('/:id/view', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const story: any = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Not found' });
    const uid = req.userId!;
    const has = Array.isArray(story.viewers) && story.viewers.some((v:any)=> String(v)===String(uid));
    if (!has) {
      story.viewers = [...(story.viewers||[]), uid as any];
      story.viewersCount = (story.viewersCount||0) + 1;
      await story.save();
    }
    res.json({ viewed: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// React to a story with a quick emoji (creates like notification for hearts)
router.post('/:id/react', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { emoji } = req.body as { emoji: string };
    if (!emoji) return res.status(400).json({ error: 'emoji required' });
    const story: any = await Story.findByIdAndUpdate(
      req.params.id,
      { $push: { reactions: { userId: req.userId, emoji, createdAt: new Date() } } },
      { new: true }
    );
    try {
      if (story && String(story.authorId) !== String(req.userId)) {
        const isHeart = ['❤️','❤','💖','💗','💓','💞','💘','💝'].includes(emoji);
        if (isHeart) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const Notification = require('../models/Notification').default;
          await Notification.create({
            userId: story.authorId,
            type: 'like',
            fromUserId: req.userId,
            payload: { storyId: story._id, emoji }
          });
        }
      }
    } catch {}
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List viewers (author-only)
router.get('/:id/viewers', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const story: any = await Story.findById(req.params.id).populate('authorId', '_id').lean();
    if (!story) return res.status(404).json({ error: 'Not found' });
    if (String(story.authorId._id || story.authorId) !== String(req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const viewers = Array.isArray(story.viewers) ? story.viewers : [];
    // fetch minimal user info
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const User = require('../models/User').default;
    const users = await User.find({ _id: { $in: viewers } }).select('username displayName profilePic').lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List reactions (author-only)
router.get('/:id/reactions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const story: any = await Story.findById(req.params.id).populate('authorId', '_id').lean();
    if (!story) return res.status(404).json({ error: 'Not found' });
    if (String(story.authorId._id || story.authorId) !== String(req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const reactions = Array.isArray(story.reactions) ? story.reactions : [];
    const userIds = reactions.map((r:any)=> r.userId);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const User = require('../models/User').default;
    const users = await User.find({ _id: { $in: userIds } }).select('username displayName profilePic').lean();
    const map: Record<string, any> = {};
    users.forEach((u:any)=> { map[String(u._id)] = u; });
    const list = reactions.map((r:any)=> ({ emoji: r.emoji, user: map[String(r.userId)] || { _id: r.userId } }));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
