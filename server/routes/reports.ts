import express from 'express';
import Report from '../models/Report';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import Notification from '../models/Notification';
import User from '../models/User';

const router = express.Router();

// Create a report (post/reel/account)
router.post('/', authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { targetType, targetId, reasons, reason, details } = req.body || {};
    if (!targetType || !targetId) return res.status(400).json({ error: 'targetType and targetId are required' });
    if (!['post','reel','account'].includes(targetType)) return res.status(400).json({ error: 'Invalid targetType' });
    const reasonList: string[] = Array.isArray(reasons) ? reasons : (reason ? [String(reason)] : []);
    if (reasonList.length === 0 && !String(details || '').trim()) return res.status(400).json({ error: 'Provide at least one reason or details' });

    const doc = await Report.create({
      type: targetType,
      targetId: new mongoose.Types.ObjectId(targetId),
      fromUserId: new mongoose.Types.ObjectId(req.userId!),
      reason: reasonList.join(', '),
      details: String(details || ''),
      status: 'open'
    } as any);
    try {
      const admins = await User.find({ roles: { $in: ['admin'] } }, { _id: 1 }).lean();
      const adminNotifs = admins.map((a:any)=> ({
        userId: a._id,
        type: 'report',
        fromUserId: new mongoose.Types.ObjectId(req.userId!),
        postId: targetType==='post'? new mongoose.Types.ObjectId(targetId): undefined,
        reelId: targetType==='reel'? new mongoose.Types.ObjectId(targetId): undefined,
        payload: { targetType, targetId, reasons: reasonList, details: String(details || ''), reportId: doc._id }
      }));
      if (adminNotifs.length) {
        const created = await Notification.insertMany(adminNotifs);
        const io = req.app.get('io');
        if (io) {
          created.forEach((n:any)=>{
            io.emit('notification:new', { 
              _id: n._id,
              type: 'report',
              createdAt: n.createdAt,
              data: { kind: 'report', targetType, targetId, reportId: String(doc._id) },
              targetUserId: String(n.userId)
            });
          });
        }
      }
    } catch (e) { /* non-fatal */ }
    res.status(201).json({ ok: true, id: doc._id });
  } catch (e) {
    console.error('Create report error:', e);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

export default router;
