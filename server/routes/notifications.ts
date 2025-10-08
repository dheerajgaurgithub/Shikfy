import express from 'express';
import Notification from '../models/Notification.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('fromUserId', 'username displayName profilePic verified')
      .populate('postId', 'media caption')
      .populate('reelId', 'video caption');

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/read', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/mark-all-read', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await Notification.updateMany(
      { userId: req.userId, readAt: null },
      { readAt: new Date() }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/unread-count', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.userId,
      readAt: null
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
