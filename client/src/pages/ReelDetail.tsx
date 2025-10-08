import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';

interface CommentType {
  _id: string;
  text: string;
  authorId: { _id: string; username: string; displayName: string; profilePic?: string };
  createdAt: string;
}

interface ReelType {
  _id: string;
  caption: string;
  video: { url: string; thumbnail: string; duration: number };
  authorId: { _id: string; username: string; displayName: string; profilePic?: string };
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

const ReelDetail = () => {
  const { id } = useParams();
  const [reel, setReel] = useState<ReelType | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    if (!id) return;
    try {
      const [r, c] = await Promise.all([
        apiClient.get(`/reels/${id}`),
        apiClient.get(`/reels/${id}/comments`)
      ]);
      setReel(r.data);
      setComments(c.data);
    } catch (e) {
      console.error('Failed to fetch reel or comments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !commentText.trim()) return;
    try {
      setSubmitting(true);
      const res = await apiClient.post(`/reels/${id}/comments`, { text: commentText.trim() });
      setComments(prev => [res.data, ...prev]);
      setCommentText('');
    } catch (e) {
      console.error('Failed to add comment:', e);
      alert('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading reel...</div>
      </div>
    );
  }

  if (!reel) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Reel not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="relative bg-black aspect-[9/16]">
          <video src={reel.video.url} poster={reel.video.thumbnail} controls className="w-full h-full object-contain" />
        </div>
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <Link to={`/profile/${reel.authorId._id}`} className="font-semibold text-gray-900 dark:text-white">
              {reel.authorId.username}
            </Link>
            <span className="text-gray-600 dark:text-gray-400">{reel.caption}</span>
          </div>

          <form onSubmit={handleAddComment} className="flex items-center space-x-2 mb-4">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </form>

          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c._id} className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 flex items-center justify-center text-white font-bold">
                  {c.authorId.profilePic ? (
                    <img src={c.authorId.profilePic} alt={c.authorId.displayName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    c.authorId.displayName?.[0]?.toUpperCase()
                  )}
                </div>
                <div>
                  <div className="text-gray-900 dark:text-white">
                    <Link to={`/profile/${c.authorId._id}`} className="font-semibold mr-2">{c.authorId.username}</Link>
                    {c.text}
                  </div>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <div className="text-gray-500 dark:text-gray-400">No comments yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReelDetail;
