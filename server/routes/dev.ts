import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Post from '../models/Post';
import Reel from '../models/Reel';
import Chat from '../models/Chat';
import Message from '../models/Message';

const router = express.Router();

router.post('/seed', async (_req, res) => {
  try {
    // Create or find two demo users
    const u1 = await User.findOneAndUpdate(
      { email: 'demo1@shikfy.local' },
      {
        $setOnInsert: {
          email: 'demo1@shikfy.local',
          username: 'demo_one',
          displayName: 'Demo One',
          passwordHash: 'dev',
          verified: true,
          bio: 'Hello from Demo One',
        }
      },
      { upsert: true, new: true }
    );

    const u2 = await User.findOneAndUpdate(
      { email: 'demo2@shikfy.local' },
      {
        $setOnInsert: {
          email: 'demo2@shikfy.local',
          username: 'demo_two',
          displayName: 'Demo Two',
          passwordHash: 'dev',
          verified: false,
          bio: 'Hello from Demo Two',
        }
      },
      { upsert: true, new: true }
    );

    // Simple follow counts
    await User.updateOne({ _id: u1._id }, { $set: { followersCount: 1, followingCount: 1 } });
    await User.updateOne({ _id: u2._id }, { $set: { followersCount: 1, followingCount: 1 } });

    // Create a few demo posts for u1
    const existingPosts = await Post.find({ authorId: u1._id }).limit(1);
    if (existingPosts.length === 0) {
      await Post.create([
        {
          authorId: u1._id,
          caption: 'Sunset by the beach',
          media: [{ url: 'https://picsum.photos/seed/post1/800/800', thumbnail: 'https://picsum.photos/seed/post1/300/300', type: 'image' }],
          likesCount: 5,
        },
        {
          authorId: u1._id,
          caption: 'City lights',
          media: [{ url: 'https://picsum.photos/seed/post2/800/800', thumbnail: 'https://picsum.photos/seed/post2/300/300', type: 'image' }],
          likesCount: 3,
        },
        {
          authorId: u1._id,
          caption: 'Nature walk',
          media: [{ url: 'https://picsum.photos/seed/post3/800/800', thumbnail: 'https://picsum.photos/seed/post3/300/300', type: 'image' }],
          likesCount: 7,
        },
      ] as any);
    }

    // Create a couple of reels for u2
    const existingReels = await Reel.find({ authorId: u2._id }).limit(1);
    if (existingReels.length === 0) {
      await Reel.create([
        {
          authorId: u2._id,
          caption: 'Skate tricks',
          video: { url: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4', thumbnail: 'https://picsum.photos/seed/reel1/300/500', duration: 10 },
          likesCount: 2,
        },
        {
          authorId: u2._id,
          caption: 'Cooking fast',
          video: { url: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4', thumbnail: 'https://picsum.photos/seed/reel2/300/500', duration: 12 },
          likesCount: 4,
        },
      ] as any);
    }

    // Create a DM chat between them if not exists
    let chat = await Chat.findOne({ type: 'dm', members: { $all: [u1._id, u2._id], $size: 2 } });
    if (!chat) {
      chat = await Chat.create({ type: 'dm', members: [u1._id, u2._id] } as any);
      await Message.create([
        { chatId: chat._id, senderId: u1._id, content: 'Hey there! 👋', readBy: [u1._id], status: 'sent' },
        { chatId: chat._id, senderId: u2._id, content: 'Hello! Welcome to Shikfy.', readBy: [u2._id], status: 'sent' },
      ] as any);
    }

    return res.json({ ok: true, users: [u1._id, u2._id], chatId: chat._id });
  } catch (e: any) {
    console.error('Seed error:', e);
    return res.status(500).json({ error: 'Seed failed', detail: e?.message });
  }
});

export default router;
