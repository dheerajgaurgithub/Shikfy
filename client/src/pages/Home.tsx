import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import { Plus } from 'lucide-react';

interface Post {
  _id: string;
  caption: string;
  media: { type: string; url: string; thumbnail?: string }[];
  authorId: {
    _id: string;
    username: string;
    displayName: string;
    profilePic?: string;
    verified: boolean;
  };
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  createdAt: string;
}

const Home = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);

  const fetchPosts = async () => {
    try {
      const response = await apiClient.get(`/posts/feed?page=${page}`);
      if (page === 1) {
        setPosts(response.data);
      } else {
        setPosts(prev => [...prev, ...response.data]);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [page]);

  const handlePostCreated = (newPost: Post) => {
    setPosts(prev => [newPost, ...prev]);
    setShowCreateModal(false);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p._id !== postId));
  };

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading feed...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Feed</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-pink-600 text-white rounded-full hover:from-blue-700 hover:to-pink-700 transition shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Create Post</span>
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No posts yet. Follow users or create your first post!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
          >
            Create Your First Post
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} onDelete={handlePostDeleted} />
          ))}

          {posts.length >= 20 && (
            <button
              onClick={() => setPage(prev => prev + 1)}
              className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              Load More
            </button>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
};

export default Home;
