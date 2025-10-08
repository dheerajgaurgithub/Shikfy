# Shikfy Project Structure

```
shikfy/
│
├── src/                                 # Frontend React Application
│   ├── api/
│   │   └── client.ts                    # Axios API client with interceptors
│   │
│   ├── components/
│   │   ├── Layout.tsx                   # Main layout with navigation
│   │   ├── PostCard.tsx                 # Post display component
│   │   └── CreatePostModal.tsx          # Post creation modal
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx              # Authentication state management
│   │   └── ThemeContext.tsx             # Theme (light/dark) management
│   │
│   ├── pages/
│   │   ├── Landing.tsx                  # Marketing landing page
│   │   ├── Login.tsx                    # Login page
│   │   ├── Signup.tsx                   # Registration page
│   │   ├── Home.tsx                     # Main feed
│   │   ├── Profile.tsx                  # User profile
│   │   ├── Explore.tsx                  # Discover content
│   │   ├── Reels.tsx                    # Reels feed
│   │   ├── Notifications.tsx            # Activity notifications
│   │   └── Saved.tsx                    # Bookmarked content
│   │
│   ├── App.tsx                          # Main app with routing
│   ├── main.tsx                         # Entry point
│   ├── index.css                        # Global styles
│   └── vite-env.d.ts                    # TypeScript definitions
│
├── server/                              # Backend Node.js Application
│   ├── config/
│   │   └── database.ts                  # MongoDB connection
│   │
│   ├── models/                          # MongoDB Mongoose Models
│   │   ├── User.ts                      # User model
│   │   ├── Post.ts                      # Post model
│   │   ├── Reel.ts                      # Reel model
│   │   ├── Story.ts                     # Story model
│   │   ├── Like.ts                      # Like model
│   │   ├── Bookmark.ts                  # Bookmark model
│   │   ├── Comment.ts                   # Comment model
│   │   ├── Follow.ts                    # Follow model
│   │   ├── Notification.ts              # Notification model
│   │   ├── Chat.ts                      # Chat model
│   │   └── Message.ts                   # Message model
│   │
│   ├── routes/                          # API Route Handlers
│   │   ├── auth.ts                      # Authentication routes
│   │   ├── users.ts                     # User management routes
│   │   ├── posts.ts                     # Post routes
│   │   ├── reels.ts                     # Reel routes
│   │   ├── notifications.ts             # Notification routes
│   │   └── bookmarks.ts                 # Bookmark routes
│   │
│   ├── middleware/
│   │   └── auth.ts                      # JWT authentication middleware
│   │
│   └── index.ts                         # Express server entry point
│
├── dist/                                # Production build output
│   ├── assets/                          # Built frontend assets
│   ├── server/                          # Compiled backend JavaScript
│   └── index.html                       # Frontend entry HTML
│
├── node_modules/                        # Dependencies
│
├── public/                              # Static assets
│
├── .env                                 # Environment variables
├── .env.example                         # Environment template
├── .gitignore                           # Git ignore rules
│
├── package.json                         # Dependencies and scripts
├── package-lock.json                    # Dependency lock file
│
├── tsconfig.json                        # TypeScript config (shared)
├── tsconfig.app.json                    # Frontend TypeScript config
├── tsconfig.node.json                   # Node TypeScript config
├── tsconfig.server.json                 # Backend TypeScript config
│
├── vite.config.ts                       # Vite configuration
├── tailwind.config.js                   # Tailwind CSS config
├── postcss.config.js                    # PostCSS config
├── eslint.config.js                     # ESLint configuration
│
├── index.html                           # Frontend HTML template
│
├── README.md                            # Full documentation
├── QUICK_START.md                       # Quick start guide
├── IMPLEMENTATION_SUMMARY.md            # Implementation details
└── PROJECT_STRUCTURE.md                 # This file
```

## Key Files Explained

### Frontend

**src/api/client.ts**
- Axios instance with base URL
- Request interceptor (adds auth token)
- Response interceptor (handles 401 errors)

**src/contexts/AuthContext.tsx**
- User authentication state
- Login, signup, logout functions
- Token management
- Used by all protected pages

**src/contexts/ThemeContext.tsx**
- Light/dark mode state
- System theme detection
- Theme persistence

**src/components/Layout.tsx**
- Responsive navigation
- Desktop: Sidebar
- Mobile: Bottom navigation + hamburger menu
- User info display

**src/components/PostCard.tsx**
- Post display with media
- Like/comment/bookmark actions
- Optimistic UI updates
- User info with verified badge

**src/components/CreatePostModal.tsx**
- Post creation interface
- Image/video URL input
- Caption with hashtag support
- Preview functionality

**src/pages/Home.tsx**
- Main feed with posts
- Infinite scroll ready
- Create post button
- Pull to refresh ready

**src/pages/Profile.tsx**
- User profile display
- Follow/unfollow button
- Posts grid view
- Stats (followers, following, posts)

### Backend

**server/index.ts**
- Express app setup
- Socket.IO integration
- Route mounting
- CORS configuration
- Server startup

**server/config/database.ts**
- MongoDB connection
- Connection event handlers
- Error handling

**server/middleware/auth.ts**
- JWT token verification
- Request authentication
- Token generation
- Protected route middleware

**server/models/*.ts**
- Mongoose schemas
- Model definitions
- Indexes for performance
- Validation rules

**server/routes/*.ts**
- RESTful API endpoints
- Request handling
- Database operations
- Response formatting

## Data Flow

### Authentication Flow
1. User submits login form
2. Frontend sends POST to `/api/auth/login`
3. Backend verifies credentials
4. Backend generates JWT token
5. Frontend stores token in localStorage
6. Frontend adds token to all API requests
7. Backend verifies token on protected routes

### Post Creation Flow
1. User fills create post modal
2. Frontend sends POST to `/api/posts`
3. Backend creates post in MongoDB
4. Backend increments user's post count
5. Frontend adds post to feed (optimistic)
6. Backend returns created post
7. Frontend updates with actual data

### Like/Unlike Flow
1. User clicks heart icon
2. Frontend updates UI instantly (optimistic)
3. Frontend sends POST/DELETE to `/api/posts/:id/like`
4. Backend updates database
5. Backend creates notification
6. Backend returns new count
7. Frontend updates with actual count

### Follow Flow
1. User clicks follow button
2. Frontend updates UI instantly
3. Frontend sends POST to `/api/users/:id/follow`
4. Backend creates follow relationship
5. Backend updates follower/following counts
6. Backend creates notification
7. Frontend confirms update

## Real-time Features (Socket.IO)

### Events
- `user:online` - User comes online
- `user:status` - User status change
- `user:typing` - User typing in chat
- `chat:join` - Join chat room
- `message:send` - Send message
- `message:new` - New message received

## Database Collections

MongoDB automatically creates these collections:
- `users` - User accounts
- `posts` - Photo/video posts
- `reels` - Short videos
- `stories` - Temporary content
- `likes` - Like records
- `bookmarks` - Saved content
- `comments` - Comments
- `follows` - Follow relationships
- `notifications` - Activity notifications
- `chats` - Chat rooms (ready)
- `messages` - Chat messages (ready)

## API Routes Summary

### Authentication
- POST `/api/auth/signup` - Register
- POST `/api/auth/login` - Login

### Users
- GET `/api/users/me` - Current user
- GET `/api/users/:id` - User profile
- PATCH `/api/users/:id` - Update profile
- POST `/api/users/:id/follow` - Follow
- DELETE `/api/users/:id/follow` - Unfollow
- GET `/api/users/:id/following-status` - Check follow status
- GET `/api/users/:id/posts` - User posts
- GET `/api/users/search/:query` - Search users

### Posts
- POST `/api/posts` - Create post
- GET `/api/posts/feed` - Get feed
- GET `/api/posts/:id` - Get post
- PATCH `/api/posts/:id` - Update post
- DELETE `/api/posts/:id` - Delete post
- POST `/api/posts/:id/like` - Like
- DELETE `/api/posts/:id/like` - Unlike
- GET `/api/posts/:id/like-status` - Check like
- POST `/api/posts/:id/bookmark` - Bookmark
- DELETE `/api/posts/:id/bookmark` - Unbookmark
- GET `/api/posts/:id/bookmark-status` - Check bookmark
- GET `/api/posts/:id/comments` - Get comments
- POST `/api/posts/:id/comments` - Add comment

### Reels (similar to posts)
- POST `/api/reels`
- GET `/api/reels/feed`
- GET `/api/reels/:id`
- POST `/api/reels/:id/like`
- DELETE `/api/reels/:id/like`
- etc.

### Notifications
- GET `/api/notifications` - Get all
- PATCH `/api/notifications/:id/read` - Mark read
- PATCH `/api/notifications/mark-all-read` - Mark all read
- GET `/api/notifications/unread-count` - Get count

### Bookmarks
- GET `/api/bookmarks` - Get saved items

## Environment Variables

### Required
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT signing
- `PORT` - Backend server port
- `FRONTEND_URL` - Frontend URL for CORS
- `VITE_API_URL` - Backend API URL

### Optional (for extensions)
- `AWS_ACCESS_KEY_ID` - For S3 uploads
- `AWS_SECRET_ACCESS_KEY` - For S3 uploads
- `AWS_REGION` - S3 region
- `AWS_BUCKET_NAME` - S3 bucket
- `REDIS_URL` - For caching/sessions
- `GOOGLE_CLIENT_ID` - For OAuth
- `GOOGLE_CLIENT_SECRET` - For OAuth

## Technology Versions

- Node.js: 18+
- React: 18.3
- TypeScript: 5.5
- Express: 4.18
- MongoDB/Mongoose: 8.1
- Socket.IO: 4.6
- Tailwind CSS: 3.4
- Vite: 5.4

---

This structure provides a solid foundation for a production social media application.
