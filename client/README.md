# Shikfy - Full-Stack Social Media Application

A modern, production-ready social media platform built with React, TypeScript, Node.js, Express, and MongoDB.

## Features

### Core Features
- **Authentication**: Email/password login with JWT tokens
- **Posts**: Create, edit, delete posts with images/videos
- **Reels**: Short-form vertical video content
- **Stories**: Temporary 24-hour content
- **Social Interactions**: Like, comment, bookmark, follow/unfollow
- **Real-time**: Live updates via Socket.IO
- **Notifications**: Activity notifications
- **Profile Management**: Customizable user profiles
- **Search & Explore**: Discover users and content
- **Dark Mode**: Light/dark theme support

### Advanced Features
- **Optimistic UI Updates**: Instant feedback on user actions
- **Privacy Controls**: Per-post visibility settings
- **Responsive Design**: Mobile-first, works on all devices
- **Performance**: Lazy loading and infinite scroll
- **Accessibility**: WCAG compliant components

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- React Router (routing)
- Axios (API client)
- Tailwind CSS (styling)
- Lucide React (icons)
- Socket.IO Client (real-time)

### Backend
- Node.js + Express
- TypeScript
- MongoDB + Mongoose (database)
- JWT (authentication)
- Socket.IO (real-time)
- bcryptjs (password hashing)

## Prerequisites

- Node.js 18+ and npm
- MongoDB (running on localhost:27017)

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the root directory (or use the existing one):
```env
VITE_API_URL=http://localhost:3001/api

MONGODB_URI=mongodb://localhost:27017/shikfy
JWT_SECRET=your-secret-key-change-in-production
PORT=3001
FRONTEND_URL=http://localhost:5173
```

4. Make sure MongoDB is running on your system:
```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

## Development

Run both frontend and backend in development mode:

```bash
npm run dev
```

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

Or run them separately:

```bash
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend
```

## Production Build

Build both frontend and backend:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Project Structure

```
shikfy/
├── src/                      # Frontend source
│   ├── api/                  # API client
│   ├── components/           # React components
│   ├── contexts/             # React contexts (Auth, Theme)
│   ├── pages/                # Page components
│   ├── App.tsx               # Main app component
│   └── main.tsx              # Entry point
├── server/                   # Backend source
│   ├── config/               # Configuration
│   ├── models/               # MongoDB models
│   ├── routes/               # API routes
│   ├── middleware/           # Express middleware
│   └── index.ts              # Server entry point
├── dist/                     # Production build output
└── package.json              # Dependencies and scripts
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/:id` - Get user profile
- `PATCH /api/users/:id` - Update profile
- `POST /api/users/:id/follow` - Follow user
- `DELETE /api/users/:id/follow` - Unfollow user
- `GET /api/users/:id/posts` - Get user posts
- `GET /api/users/search/:query` - Search users

### Posts
- `POST /api/posts` - Create post
- `GET /api/posts/feed` - Get feed
- `GET /api/posts/:id` - Get single post
- `PATCH /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like post
- `DELETE /api/posts/:id/like` - Unlike post
- `POST /api/posts/:id/bookmark` - Bookmark post
- `DELETE /api/posts/:id/bookmark` - Remove bookmark
- `GET /api/posts/:id/comments` - Get comments
- `POST /api/posts/:id/comments` - Add comment

### Reels
- `POST /api/reels` - Create reel
- `GET /api/reels/feed` - Get reels feed
- `POST /api/reels/:id/like` - Like reel
- Similar endpoints as posts

### Notifications
- `GET /api/notifications` - Get notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/mark-all-read` - Mark all as read

### Bookmarks
- `GET /api/bookmarks` - Get saved posts/reels

## Database Models

- **User**: User profiles and authentication
- **Post**: Photo/video posts
- **Reel**: Short-form video content
- **Story**: Temporary 24h content
- **Comment**: Comments on posts/reels
- **Like**: Likes on posts/reels/comments
- **Bookmark**: Saved posts/reels
- **Follow**: User follow relationships
- **Notification**: Activity notifications
- **Chat**: Direct messages (structure ready)
- **Message**: Chat messages (structure ready)

## Features to Add

This is a production-ready foundation. You can extend it with:
- Direct messaging (backend structure ready)
- Stories implementation
- Profile editing UI
- Advanced privacy controls
- Image upload with S3
- Video transcoding
- Push notifications
- Multi-language support
- Content moderation
- Analytics
- Group feeds
- Live streaming

## Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Protected API routes
- Input validation
- XSS protection
- CORS configuration

## Performance

- Optimistic UI updates
- Lazy loading
- Infinite scroll
- Efficient database queries
- Connection pooling
- Response caching

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - feel free to use this project for learning or production.

## Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using React, TypeScript, Node.js, and MongoDB
