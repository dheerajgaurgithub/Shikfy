# Quick Start Guide for Shikfy

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 18+ installed (`node --version`)
- ✅ npm installed (`npm --version`)
- ✅ MongoDB installed and running

## Start MongoDB

### macOS (with Homebrew)
```bash
brew services start mongodb-community
```

### Linux
```bash
sudo systemctl start mongod
```

### Windows
```bash
net start MongoDB
```

### Docker (alternative)
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Run the Application

### Option 1: Run Everything Together (Recommended)
```bash
npm install
npm run dev
```

This starts:
- Frontend at http://localhost:5173
- Backend at http://localhost:3001

### Option 2: Run Separately
```bash
# Terminal 1 - Frontend
npm run dev:frontend

# Terminal 2 - Backend
npm run dev:backend
```

## First Time Setup

1. Open http://localhost:5173 in your browser
2. Click "Sign up" to create an account
3. Fill in your details:
   - Username (lowercase, unique)
   - Display Name
   - Email
   - Password (6+ characters)
4. You'll be automatically logged in

## Test the Features

1. **Create a Post**
   - Click "Create Post" button
   - Add caption (try adding #hashtags)
   - Add image URL (e.g., from pexels.com or unsplash.com)
   - Click "Post"

2. **Interact with Posts**
   - Click the heart icon to like
   - Click the bookmark icon to save
   - Click the comment icon to view/add comments

3. **Follow Users**
   - Use the search bar in Explore page
   - Visit user profiles
   - Click "Follow" button

4. **View Notifications**
   - Click the heart icon in the sidebar
   - See likes, comments, and new followers

5. **Explore Content**
   - Navigate to "Explore" to discover posts
   - Navigate to "Reels" for video content
   - Navigate to "Saved" to see bookmarked posts

## Sample Image URLs for Testing

You can use these URLs when creating posts:

### Images
- https://images.pexels.com/photos/1181676/pexels-photo-1181676.jpeg?auto=compress&cs=tinysrgb&w=800
- https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=800
- https://images.pexels.com/photos/1181317/pexels-photo-1181317.jpeg?auto=compress&cs=tinysrgb&w=800
- https://images.pexels.com/photos/1181411/pexels-photo-1181411.jpeg?auto=compress&cs=tinysrgb&w=800

### Videos (for Reels)
- https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4
- https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4

## Testing the Dark Mode

1. The app respects your system theme by default
2. Future: Theme toggle will be added to settings

## Common Issues

### MongoDB Connection Error
**Error**: "MongoDB connection error"
**Solution**:
1. Check if MongoDB is running: `mongosh` or `mongo`
2. Check MongoDB service status
3. Verify connection string in `.env` file

### Port Already in Use
**Error**: "Port 3001 is already in use"
**Solution**:
1. Kill the process: `lsof -ti:3001 | xargs kill -9`
2. Or change PORT in `.env` file

### Module Not Found
**Error**: "Cannot find module"
**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Production Build

To create a production build:

```bash
npm run build
```

To run the production build:
```bash
npm start
```

## Database Management

View your MongoDB data:
```bash
mongosh
use shikfy
db.users.find()
db.posts.find()
```

Clear database (careful!):
```bash
mongosh
use shikfy
db.dropDatabase()
```

## API Testing

The backend API is available at: http://localhost:3001/api

Test the health endpoint:
```bash
curl http://localhost:3001/api/health
```

## Next Steps

1. Create multiple test accounts
2. Create posts with different users
3. Follow users and see the feed populate
4. Test like/unlike functionality
5. Test bookmarks
6. Check notifications

## Development Tips

- Hot reload is enabled for both frontend and backend
- Check the browser console for any errors
- Check the terminal for backend logs
- MongoDB automatically creates indexes

## Getting Help

Check these files:
- `README.md` - Full documentation
- `IMPLEMENTATION_SUMMARY.md` - What was built
- API endpoints documentation in README

---

Enjoy building with Shikfy! 🚀
