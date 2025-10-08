import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import PostCard from '../components/PostCard';

const Saved = () => {
  const [bookmarks, setBookmarks] = useState<{ posts: any[]; reels: any[] }>({
    posts: [],
    reels: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const response = await apiClient.get('/bookmarks');
        setBookmarks(response.data);
      } catch (error) {
        console.error('Failed to fetch bookmarks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarks();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading saved items...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Saved</h1>

      {bookmarks.posts.length === 0 && bookmarks.reels.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">
            No saved posts yet. Bookmark posts to see them here!
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {bookmarks.posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Saved;
