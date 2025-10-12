import express from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Post from '../models/Post';
import Reel from '../models/Reel';
import Report from '../models/Report';

const router = express.Router();

// Guard all routes
router.use(authenticateToken as any, requireAdmin as any);

// Dashboard summary
router.get('/dashboard/summary', async (_req, res) => {
  try {
    const [users, posts, reels, reportsOpen] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Reel.countDocuments(),
      Report.countDocuments({ status: 'open' })
    ]);
    res.json({ users, posts, reels, reportsOpen });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load summary' });
  }
});

// Users list
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const search = String(req.query.search || '').trim();
    const q: any = {};
    if (search) {
      q.$or = [
        { username: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { displayName: new RegExp(search, 'i') }
      ];
    }
    const [items, total] = await Promise.all([
      User.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(q)
    ]);
    res.json({ items, total, page, limit });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// Block user (temporary by until date or permanent if not provided)
router.patch('/users/:id/block', async (req: AuthRequest, res) => {
  try {
    const { until, reason } = req.body || {};
    const adminId = req.userId;
    // Store block flags on the user for enforcement (simple MVP)
    const update: any = { $set: { blocked: true, blockedReason: reason || 'policy_violation', blockedUntil: until ? new Date(until) : null, blockedBy: adminId } };
    await User.findByIdAndUpdate(req.params.id, update);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to block user' });
  }
});

router.patch('/users/:id/unblock', async (_req, res) => {
  try {
    await User.findByIdAndUpdate(_req.params.id, { $unset: { blocked: 1, blockedReason: 1, blockedUntil: 1, blockedBy: 1 } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// Posts list
router.get('/posts', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const search = String(req.query.search || '').trim();
    const q: any = {};
    if (search) q.caption = new RegExp(search, 'i');
    const [items, total] = await Promise.all([
      Post.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Post.countDocuments(q)
    ]);
    res.json({ items, total, page, limit });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load posts' });
  }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Reels list
router.get('/reels', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const q: any = {};
    const [items, total] = await Promise.all([
      Reel.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Reel.countDocuments(q)
    ]);
    res.json({ items, total, page, limit });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load reels' });
  }
});

router.delete('/reels/:id', async (req, res) => {
  try {
    await Reel.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete reel' });
  }
});

// Reports list
router.get('/reports', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const type = String(req.query.type || '');
    const status = String(req.query.status || '');
    const q: any = {};
    if (type) q.type = type;
    if (status) q.status = status;
    const [items, total] = await Promise.all([
      Report.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Report.countDocuments(q)
    ]);
    res.json({ items, total, page, limit });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load reports' });
  }
});

router.patch('/reports/:id/resolve', async (req: AuthRequest, res) => {
  try {
    const { resolution } = req.body || {};
    await Report.findByIdAndUpdate(req.params.id, { $set: { status: 'resolved', resolution: resolution || 'resolved', resolvedBy: req.userId, resolvedAt: new Date() } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to resolve report' });
  }
});

export default router;
