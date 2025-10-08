import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';

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

interface PostCardProps {
  post: Post;
  onDelete?: (postId: string) => void;
}

const PostCard = ({ post, onDelete }: PostCardProps) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const [likeRes, bookmarkRes] = await Promise.all([
          apiClient.get(`/posts/${post._id}/like-status`),
          apiClient.get(`/posts/${post._id}/bookmark-status`)
        ]);
        setLiked(likeRes.data.liked);
        setBookmarked(bookmarkRes.data.bookmarked);
      } catch (error) {
        console.error('Failed to fetch statuses:', error);
      }
    };

    fetchStatuses();
  }, [post._id]);

  const handleLike = async () => {
    try {
      const optimisticLiked = !liked;
      const optimisticCount = optimisticLiked ? likesCount + 1 : likesCount - 1;

      setLiked(optimisticLiked);
      setLikesCount(optimisticCount);

      if (optimisticLiked) {
        const res = await apiClient.post(`/posts/${post._id}/like`);
        setLikesCount(res.data.likesCount);
      } else {
        const res = await apiClient.delete(`/posts/${post._id}/like`);
        setLikesCount(res.data.likesCount);
      }
    } catch (error) {
      setLiked(!liked);
      setLikesCount(liked ? likesCount + 1 : likesCount - 1);
      console.error('Failed to toggle like:', error);
    }
  };

  const handleBookmark = async () => {
    try {
      const optimisticBookmarked = !bookmarked;
      setBookmarked(optimisticBookmarked);

      if (optimisticBookmarked) {
        await apiClient.post(`/posts/${post._id}/bookmark`);
      } else {
        await apiClient.delete(`/posts/${post._id}/bookmark`);
      }
    } catch (error) {
      setBookmarked(!bookmarked);
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await apiClient.delete(`/posts/${post._id}`);
        onDelete?.(post._id);
      } catch (error) {
        console.error('Failed to delete post:', error);
        alert('Failed to delete post');
      }
    }
  };

  const formatDate = (date: string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return postDate.toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <Link to={`/profile/${post.authorId._id}`} className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 flex items-center justify-center text-white font-bold">
            {post.authorId.profilePic ? (
              <img
                src={post.authorId.profilePic}
                alt={post.authorId.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              post.authorId.displayName[0].toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-gray-900 dark:text-white">
                {post.authorId.displayName}
              </span>
              {post.authorId.verified && (
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                </svg>
              )}
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              @{post.authorId.username} • {formatDate(post.createdAt)}
            </span>
          </div>
        </Link>

        {user?._id === post.authorId._id && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 z-10">
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center space-x-2 px-4 py-3 text-left text-red-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Post</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {post.media && post.media.length > 0 && (
        <div className="relative bg-gray-100 dark:bg-gray-900">
          {post.media[0].type === 'image' ? (
            <img
              src={post.media[0].url}
              alt="Post"
              className="w-full max-h-[600px] object-cover"
            />
          ) : (
            <video
              src={post.media[0].url}
              controls
              className="w-full max-h-[600px] object-cover"
            />
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLike}
              className="flex items-center space-x-1 group"
            >
              <Heart
                className={`w-6 h-6 transition ${
                  liked
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-700 dark:text-gray-300 group-hover:text-red-500'
                }`}
              />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {likesCount}
              </span>
            </button>

            <Link
              to={`/post/${post._id}`}
              className="flex items-center space-x-1 group"
            >
              <MessageCircle className="w-6 h-6 text-gray-700 dark:text-gray-300 group-hover:text-blue-500 transition" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {post.commentsCount}
              </span>
            </Link>
          </div>

          <button
            onClick={handleBookmark}
            className="group"
          >
            <Bookmark
              className={`w-6 h-6 transition ${
                bookmarked
                  ? 'fill-blue-500 text-blue-500'
                  : 'text-gray-700 dark:text-gray-300 group-hover:text-blue-500'
              }`}
            />
          </button>
        </div>

        {post.caption && (
          <div className="text-gray-900 dark:text-white">
            <Link
              to={`/profile/${post.authorId._id}`}
              className="font-semibold mr-2"
            >
              {post.authorId.username}
            </Link>
            <span>{post.caption}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostCard;
