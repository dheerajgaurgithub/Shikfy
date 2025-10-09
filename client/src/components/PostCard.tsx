import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Trash2, Send } from 'lucide-react';
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
  const [showShare, setShowShare] = useState(false);
  const [following, setFollowing] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [shareSearch, setShareSearch] = useState('');
  const [sharing, setSharing] = useState(false);

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

  useEffect(() => {
    const loadFollowing = async () => {
      try {
        if (!user?.id) return;
        const fl = await apiClient.get(`/users/${user.id}/following`);
        setFollowing(fl.data || []);
      } catch (e) {
        console.warn('Failed to load following for share', e);
      }
    };
    if (showShare) loadFollowing();
  }, [showShare, user?.id]);

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

        {user?.id === post.authorId._id && (
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
        <div className="relative bg-black">
          {post.media[0].type === 'image' ? (
            <img
              src={post.media[0].url}
              alt="Post"
              className="w-full max-h-[70vh] object-contain"
            />
          ) : (
            <video
              src={post.media[0].url}
              poster={post.media[0].thumbnail}
              controls
              className="w-full max-h-[70vh] object-contain"
            />
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-6">
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
            <button onClick={()=>setShowShare(true)} className="group">
              <Send className="w-6 h-6 text-gray-700 dark:text-gray-300 group-hover:text-blue-500" />
            </button>
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
    {showShare && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowShare(false)}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-4" onClick={(e)=>e.stopPropagation()}>
          <div className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Share post via DM</div>
          <input
            value={shareSearch}
            onChange={(e)=>setShareSearch(e.target.value)}
            placeholder="Search following..."
            className="w-full mb-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <div className="max-h-72 overflow-auto divide-y divide-gray-200 dark:divide-gray-700">
            {following
              .filter((u:any)=> u.username?.toLowerCase().includes(shareSearch.toLowerCase()) || u.displayName?.toLowerCase().includes(shareSearch.toLowerCase()))
              .map((u:any)=> (
                <label key={u._id} className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(u._id)}
                    onChange={(e)=> setSelectedUserIds(prev => e.target.checked ? [...prev, u._id] : prev.filter(id=>id!==u._id))}
                  />
                  <img src={u.profilePic || 'https://via.placeholder.com/32'} className="w-8 h-8 rounded-full" />
                  <div>
                    <div className="text-gray-900 dark:text-white font-medium">{u.displayName}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-sm">@{u.username}</div>
                  </div>
                </label>
              ))}
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <button onClick={()=>setShowShare(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200">Cancel</button>
            <button disabled={sharing || selectedUserIds.length===0} onClick={async ()=>{
              try {
                setSharing(true);
                const url = `${window.location.origin}/post/${post._id}`;
                for (const uid of selectedUserIds) {
                  const chatRes = await apiClient.post('/chats', { type: 'dm', memberIds: [uid] });
                  const chatId = chatRes.data._id;
                  await apiClient.post('/messages', { chatId, content: `Check this post: ${url}` });
                }
                setShowShare(false);
                setSelectedUserIds([]);
                alert('Shared successfully');
              } catch (e) {
                console.error('Failed to share', e);
                alert('Failed to share');
              } finally {
                setSharing(false);
              }
            }} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{sharing? 'Sharing...' : 'Send'}</button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

export default PostCard;
