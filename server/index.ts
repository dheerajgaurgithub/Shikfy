import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
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

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Make io accessible in route handlers
app.set('io', io);

const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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
app.use('/api/uploads', uploadsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const onlineUsers = new Map<string, string>();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user:online', (userId: string) => {
    onlineUsers.set(userId, socket.id);
    io.emit('user:status', { userId, online: true });
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
        io.emit('user:status', { userId, online: false });
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
});

export { io };
