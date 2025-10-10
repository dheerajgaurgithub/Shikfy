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
import hubsRoutes from './routes/hubs';
import Message from './models/Message';
import Chat from './models/Chat';
import searchRoutes from './routes/search';
import storiesRoutes from './routes/stories';

const app = express();
const httpServer = createServer(app);
// Build allowed origins from env
const defaultOrigins = ['http://localhost:5173', 'http://localhost:4173', 'https://shikfy.netlify.app'];
const envOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(new Set([...
  defaultOrigins,
  ...envOrigins
]));

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Make io accessible in route handlers
app.set('io', io);

const PORT = process.env.PORT || 3001;

// Trust reverse proxy (Render) for secure cookies
app.set('trust proxy', 1);
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS: origin not allowed: ' + origin));
  },
  credentials: true
}));
// Preflight
app.options(/.*/, cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

connectDatabase();

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
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', devRoutes);
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// In production, serve the client build (Vite) with SPA fallback
if (process.env.NODE_ENV === 'production') {
  // Expect client build copied to server/dist/public at build time
  const clientDist = path.resolve(__dirname, 'public');
  app.use(express.static(clientDist));
  // SPA fallback: let API routes pass through (Express 5 compatible)
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const onlineUsers = new Map<string, string>();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user:online', (userId: string) => {
    onlineUsers.set(userId, socket.id);
    // update lastSeen now
    try { User.findByIdAndUpdate(userId, { $set: { lastSeen: new Date() } }).exec(); } catch {}
    io.emit('user:status', { userId, online: true, lastSeen: new Date().toISOString() });
  });

  socket.on('user:typing', (data: { chatId: string; userId: string; username: string }) => {
    socket.to(data.chatId).emit('user:typing', {
      userId: data.userId,
      username: data.username
    });
  });

  socket.on('chat:join', (chatId: string) => {
    socket.join(chatId);
  });

  socket.on('message:send', (data) => {
    io.to(data.chatId).emit('message:new', data);
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        const when = new Date();
        try { User.findByIdAndUpdate(userId, { $set: { lastSeen: when } }).exec(); } catch {}
        io.emit('user:status', { userId, online: false, lastSeen: when.toISOString() });
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// Simple in-process scheduler for scheduled messages (dev-friendly)
setInterval(async () => {
  try {
    const due = await Message.find({ status: 'scheduled', scheduledAt: { $lte: new Date() } }).limit(50);
    for (const m of due) {
      (m as any).status = 'sent';
      await m.save();
      try {
        await Chat.findByIdAndUpdate(m.chatId, { lastMessageId: m._id, lastMessageAt: m.createdAt });
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
  } catch {}
}, 60 * 1000);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
});

export { io };
