import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import Hub from '../models/Hub';
import Post from '../models/Post';

const router = express.Router();

// Create a hub
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name, slug, description, cover } = req.body as { name: string; slug: string; description?: string; cover?: string };
    if (!name || !slug) return res.status(400).json({ error: 'name and slug required' });
    const exists = await Hub.findOne({ slug });
    if (exists) return res.status(400).json({ error: 'Slug already taken' });
    const hub = await Hub.create({ name, slug, description: description||'', cover: cover||'', ownerId: req.userId, moderators: [req.userId] });
    res.status(201).json(hub);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List hubs (simple)
router.get('/', async (_req, res) => {
  try { const hubs = await Hub.find({}).sort({ createdAt: -1 }).limit(50); res.json(hubs); }
  catch { res.status(500).json({ error: 'Server error' }); }
});

// Hub details
router.get('/:slug', async (req, res) => {
  try { const hub = await Hub.findOne({ slug: req.params.slug }); if (!hub) return res.status(404).json({ error: 'Not found' }); res.json(hub); }
  catch { res.status(500).json({ error: 'Server error' }); }
});

// Join/leave (counter only for now)
router.post('/:slug/join', authenticateToken, async (req: AuthRequest, res) => {
  try { const hub = await Hub.findOneAndUpdate({ slug: req.params.slug }, { $inc: { membersCount: 1 } }, { new: true }); if (!hub) return res.status(404).json({ error: 'Not found' }); res.json({ success: true, hub }); }
  catch { res.status(500).json({ error: 'Server error' }); }
});
router.post('/:slug/leave', authenticateToken, async (req: AuthRequest, res) => {
  try { const hub = await Hub.findOneAndUpdate({ slug: req.params.slug }, { $inc: { membersCount: -1 } }, { new: true }); if (!hub) return res.status(404).json({ error: 'Not found' }); res.json({ success: true, hub }); }
  catch { res.status(500).json({ error: 'Server error' }); }
});

// Hub feed
router.get('/:slug/feed', async (req, res) => {
  try {
    const hub = await Hub.findOne({ slug: req.params.slug }); if (!hub) return res.status(404).json({ error: 'Not found' });
    const posts = await Post.find({ hubId: hub._id }).sort({ createdAt: -1 }).limit(50).populate('authorId', 'username displayName profilePic verified');
    res.json({ hub, posts });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
