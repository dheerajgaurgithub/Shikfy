import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDatabase } from './config/database';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import postsRoutes from './routes/posts';
import reelsRoutes from './routes/reels';
import notificationsRoutes from './routes/notifications';
import bookmarksRoutes from './routes/bookmarks';
import chatsRoutes from './routes/chats';
import messagesRoutes from './routes/messages';
import uploadsRoutes from './routes/uploads';
import devRoutes from './routes/dev';
import User from './models/User';
import bcrypt from 'bcryptjs';
import hubsRoutes from './routes/hubs';
import Message from './models/Message';
import Chat from './models/Chat';
import searchRoutes from './routes/search';
import storiesRoutes from './routes/stories';
import translateRoutes from './routes/translate';
import reportsRoutes from './routes/reports';
import adminRoutes from './routes/admin';

const app = express();
const httpServer = createServer(app);

// ✅ Build allowed origins from environment + defaults
const defaultOrigins = [
  'http://localhost:5173',
  'https://shikfy.netlify.app',
  'https://shikfy.netlify.app/signup'
];
const envOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

// ✅ Setup Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Make io accessible in routes
app.set('io', io);

// ✅ Server Port
const PORT = process.env.PORT || 3001;

// ✅ Trust Render reverse proxy for HTTPS cookies
app.set('trust proxy', 1);

// ✅ Enhanced CORS middleware (handles preflight + credentials)
app.use(cors({
  origin: (origin, callback) => {
    console.log('🌐 CORS request from:', origin);
    if (!origin) return callback(null, true); // Allow non-browser tools
    if (allowedOrigins.includes(origin)) {
      console.log('✅ Allowed origin:', origin);
      return callback(null, true);
    }
    console.warn('❌ Blocked origin:', origin);
    return callback(new Error('CORS not allowed for ' + origin));
  },
  credentials: true
}));

// ✅ Preflight (OPTIONS) handler — ensures proper headers
app.options(/.*/, (req, res) => {
  res.header('Access-Control-Allow-Origin', req.header('Origin'));
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// ✅ Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// ✅ Connect to MongoDB
connectDatabase();

// ✅ Seed hardcoded admin (as requested)
const seedAdmin = async () => {
  try {
    const email = 'dheerajgaur.0fficial@gmail.com';
    const plainPassword = 'she@160106';
    const username = 'dheerajgaur.0fficial';
    const displayName = 'Admin';

    const existing = await User.findOne({ email });
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    if (!existing) {
      await User.create({
        username,
        email,
        passwordHash,
        displayName,
        roles: ['admin', 'user'],
        verified: true
      } as any);
      console.log('👑 Seeded admin user');
    } else {
      const roles = new Set([...(existing as any).roles || [], 'admin', 'user']);
      (existing as any).roles = Array.from(roles);
      (existing as any).passwordHash = passwordHash; // ensure known password
      if (!(existing as any).displayName) (existing as any).displayName = displayName;
      await existing.save();
      console.log('👑 Ensured admin privileges for existing admin account');
    }
  } catch (e) {
    console.error('Failed to seed admin:', e);
  }
};
seedAdmin();

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/reels', reelsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/hubs', hubsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);

if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', devRoutes);
}

// ✅ Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ✅ Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, 'public');
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ✅ Online user tracking
const onlineUsers = new Map<string, string>();

io.on('connection', (socket) => {
  console.log('⚡ User connected:', socket.id);

  socket.on('user:online', (userId: string) => {
    onlineUsers.set(userId, socket.id);
    try {
      User.findByIdAndUpdate(userId, { $set: { lastSeen: new Date() } }).exec();
    } catch {}
    io.emit('user:status', { userId, online: true, lastSeen: new Date().toISOString() });
  });

  socket.on('user:typing', (data: { chatId: string; userId: string; username: string }) => {
    socket.to(data.chatId).emit('user:typing', data);
  });

  socket.on('chat:join', (chatId: string) => socket.join(chatId));

  socket.on('message:send', (data) => {
    io.to(data.chatId).emit('message:new', data);
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        const when = new Date();
        try {
          User.findByIdAndUpdate(userId, { $set: { lastSeen: when } }).exec();
        } catch {}
        io.emit('user:status', { userId, online: false, lastSeen: when.toISOString() });
        break;
      }
    }
    console.log('🔌 User disconnected:', socket.id);
  });
});

// ✅ Scheduled message sender
setInterval(async () => {
  try {
    const due = await Message.find({
      status: 'scheduled',
      scheduledAt: { $lte: new Date() }
    }).limit(50);

    for (const m of due) {
      (m as any).status = 'sent';
      await m.save();
      try {
        await Chat.findByIdAndUpdate(m.chatId, {
          lastMessageId: m._id,
          lastMessageAt: m.createdAt
        });
      } catch {}
      io.to(String(m.chatId)).emit('message:new', {
        _id: m._id,
        chatId: m.chatId,
        senderId: m.senderId,
        content: (m as any).content,
        attachments: (m as any).attachments || [],
        replyToMessageId: (m as any).replyToMessageId,
        createdAt: m.createdAt,
      });
    }
  } catch (err) {
    console.error('Scheduled message error:', err);
  }
}, 60 * 1000);

// ✅ Start Server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
});

export { io };
