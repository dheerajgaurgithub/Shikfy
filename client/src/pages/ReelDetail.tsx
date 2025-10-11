import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';

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
  const { user } = useAuth();
  const [reel, setReel] = useState<ReelType | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [replies, setReplies] = useState<Record<string, CommentType[]>>({});
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [showEdit, setShowEdit] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [editVisibility, setEditVisibility] = useState<'public'|'followers'|'mutuals'|'close_friends'|'custom'>('public');
  const [editStatus, setEditStatus] = useState<'published'|'scheduled'|'draft'>('published');
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [showSavers, setShowSavers] = useState(false);
  const [savers, setSavers] = useState<any[]>([]);
  const [showShare, setShowShare] = useState(false);
  const [following, setFollowing] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [shareSearch, setShareSearch] = useState('');
  const [sharing, setSharing] = useState(false);
  const commentInputRef = useRef<HTMLInputElement | null>(null);

  const fetchAll = async () => {
    if (!id) return;
    try {
      const [r, c] = await Promise.all([
        apiClient.get(`/reels/${id}`),
        apiClient.get(`/reels/${id}/comments`)
      ]);
      setReel(r.data);
      setComments(c.data);
      setEditCaption(r.data.caption || '');
      setLikesCount(r.data.likesCount || 0);
      // load like status for top-level comments
      try {
        const ids = (c.data || []).map((cm:any)=> cm._id);
        await Promise.all(ids.map(async (cid:string)=>{
          try { const s = await apiClient.get(`/reels/${id}/comments/${cid}/like-status`); setLikedMap(prev=>({...prev,[cid]: !!s.data?.liked})); } catch {}
        }));
      } catch {}
    } catch (e) {
      console.error('Failed to fetch reel or comments:', e);
    } finally {
      setLoading(false);
    }
  };

  // Like/unlike reel with optimistic UI
  const handleLike = async () => {
    if (!id) return;
    try {
      const nextLiked = !liked;
      setLiked(nextLiked);
      setLikesCount((prev)=> prev + (nextLiked ? 1 : -1));
      if (nextLiked) {
        const res = await apiClient.post(`/reels/${id}/like`);
        if (typeof res.data?.likesCount === 'number') setLikesCount(res.data.likesCount);
      } else {
        const res = await apiClient.delete(`/reels/${id}/like`);
        if (typeof res.data?.likesCount === 'number') setLikesCount(res.data.likesCount);
      }
    } catch (e) {
      // revert on error
      setLiked((prev)=> !prev);
      setLikesCount((prev)=> prev + (liked ? 1 : -1));
      console.error('Failed to toggle like', e);
    }
  };

  // Bookmark/unbookmark reel with optimistic UI
  const handleBookmark = async () => {
    if (!id) return;
    try {
      const next = !bookmarked;
      setBookmarked(next);
      if (next) await apiClient.post(`/reels/${id}/bookmark`);
      else await apiClient.delete(`/reels/${id}/bookmark`);
    } catch (e) {
      setBookmarked((prev)=> !prev);
      console.error('Failed to toggle bookmark', e);
    }
  };

  useEffect(() => {
    const loadStatuses = async () => {
      if (!id) return;
      try {
        const [likeRes, bookmarkRes] = await Promise.all([
          apiClient.get(`/reels/${id}/like-status`),
          apiClient.get(`/reels/${id}/bookmark-status`)
        ]);
        setLiked(!!likeRes.data?.liked);
        setBookmarked(!!bookmarkRes.data?.bookmarked);
      } catch (e) {
        // best effort
      }
    };
    loadStatuses();
  }, [id]);

  useEffect(() => {
    if (!showShare || !user?.id) return;
    const loadFollowing = async () => {
      try {
        const fl = await apiClient.get(`/users/${user.id}/following`);
        setFollowing(fl.data || []);
      } catch {}
    };
    loadFollowing();
  }, [showShare, user?.id]);

  const loadSavers = async () => {
    try {
      const res = await apiClient.get(`/reels/${id}/savers`);
      setSavers(res.data || []);
      setShowSavers(true);
    } catch (e) {
      console.error('Failed to load savers', e);
      alert('Failed to load savers');
    }
  };

  const toggleReplies = async (commentId: string) => {
    setReplyOpen(prev => ({ ...prev, [commentId]: !prev[commentId] }));
    if (!replies[commentId]) {
      try {
        const res = await apiClient.get(`/reels/${id}/comments/${commentId}/replies`);
        setReplies(prev => ({ ...prev, [commentId]: res.data }));
        // load like-status for replies
        try {
          await Promise.all((res.data||[]).map(async (r:any)=>{
            try { const s = await apiClient.get(`/reels/${id}/comments/${r._id}/like-status`); setLikedMap(prev=>({...prev, [r._id]: !!s.data?.liked})); } catch {}
          }));
        } catch {}
      } catch (e) {
        console.error('Failed to load replies', e);
      }
    }
  };

  const submitReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    const text = (replyText[parentId] || '').trim();
    if (!text) return;
    try {
      const res = await apiClient.post(`/reels/${id}/comments`, { text, parentCommentId: parentId });
      setReplies(prev => ({ ...prev, [parentId]: [res.data, ...(prev[parentId] || [])] }));
      setReplyText(prev => ({ ...prev, [parentId]: '' }));
    } catch (e) {
      console.error('Failed to reply', e);
      alert('Failed to reply');
    }
  };

  // Like/unlike a comment or reply with optimistic UI
  const toggleLikeComment = async (commentId: string) => {
    if (!id) return;
    const wasLiked = !!likedMap[commentId];
    setLikedMap(prev => ({ ...prev, [commentId]: !wasLiked }));
    // adjust counts for top-level and replies
    const adjust = (arr: CommentType[]) => arr.map(cm =>
      cm._id === commentId
        ? ({ ...cm, likesCount: (cm as any).likesCount ? ((cm as any).likesCount + (wasLiked ? -1 : 1)) : (!wasLiked ? 1 : 0) } as any)
        : cm
    );
    setComments(prev => adjust(prev));
    Object.keys(replies).forEach(pid => setReplies(prev => ({ ...prev, [pid]: adjust(prev[pid]) })));
    try {
      if (!wasLiked) await apiClient.post(`/reels/${id}/comments/${commentId}/like`);
      else await apiClient.delete(`/reels/${id}/comments/${commentId}/like`);
    } catch (e) {
      // revert on error
      setLikedMap(prev => ({ ...prev, [commentId]: wasLiked }));
      setComments(prev => adjust(prev));
      Object.keys(replies).forEach(pid => setReplies(prev => ({ ...prev, [pid]: adjust(prev[pid]) })));
      console.error('Failed to toggle comment like', e);
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
    <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Left: Video */}
        <div className="relative bg-black flex items-center justify-center lg:min-h-[85vh]">
          <video src={reel.video.url} poster={reel.video.thumbnail} controls className="w-full h-full max-h-[85vh] object-contain" />
          {/* Floating action bar */}
          <div className="absolute right-3 bottom-6 flex flex-col items-center gap-4">
            <button onClick={handleLike} className="flex flex-col items-center text-white">
              <Heart className={`w-7 h-7 ${liked ? 'fill-red-500 text-red-500' : 'text-white/90'}`} />
              <span className="text-xs mt-1">{likesCount}</span>
            </button>
            <button onClick={() => commentInputRef.current?.focus()} className="flex flex-col items-center text-white">
              <MessageCircle className="w-7 h-7 text-white/90" />
            </button>
            <button onClick={()=>setShowShare(true)} className="flex flex-col items-center text-white">
              <Send className="w-7 h-7 text-white/90" />
            </button>
            <button onClick={handleBookmark} className="flex flex-col items-center text-white">
              <Bookmark className={`w-7 h-7 ${bookmarked ? 'fill-blue-500 text-blue-500' : 'text-white/90'}`} />
            </button>
          </div>
        </div>

        {/* Right: Comments panel */}
        <div className="flex flex-col max-h-[85vh] lg:border-l border-gray-200 dark:border-gray-800">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
            <Link to={`/profile/${reel.authorId._id}`} className="font-semibold text-gray-900 dark:text-white">
              {reel.authorId.username}
            </Link>
            <span className="text-gray-600 dark:text-gray-400 truncate">{reel.caption}</span>
            {user?.id === reel.authorId._id && (
              <div className="ml-auto flex gap-2">
                <button onClick={()=>{setShowEdit(true); setEditVisibility((reel as any).visibility || 'public'); setEditStatus(((reel as any).status)||'published'); setEditScheduledAt(((reel as any).scheduledAt)? new Date((reel as any).scheduledAt).toISOString().slice(0,16):'');}} className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-800 dark:text-gray-200">Edit</button>
                <button onClick={loadSavers} className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-800 dark:text-gray-200">Savers</button>
              </div>
            )}
          </div>
          {/* Comments scroll area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <button onClick={()=>toggleReplies(c._id)}>Reply</button>
                    <button onClick={()=>toggleLikeComment(c._id)} className={`${likedMap[c._id]?'text-blue-600 dark:text-blue-400':''}`}>Like {(c as any).likesCount||0}</button>
                  </div>
                  {replyOpen[c._id] && (
                    <div className="mt-2 space-y-2">
                      <form onSubmit={(e)=>submitReply(e, c._id)} className="flex items-center gap-2">
                        <input value={replyText[c._id]||''} onChange={(e)=>setReplyText(prev=>({...prev,[c._id]: e.target.value}))} placeholder="Write a reply..." className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" />
                        <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-lg">Reply</button>
                      </form>
                      {(replies[c._id]||[]).map((r)=> (
                        <div key={r._id} className="flex items-start space-x-2 pl-10">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                            {r.authorId.profilePic ? (
                              <img src={r.authorId.profilePic} alt={r.authorId.displayName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              r.authorId.displayName?.[0]?.toUpperCase()
                            )}
                          </div>
                          <div className="text-gray-900 dark:text-white text-sm">
                            <Link to={`/profile/${r.authorId._id}`} className="font-semibold mr-2">{r.authorId.username}</Link>
                            {r.text}
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <button onClick={()=>toggleLikeComment(r._id)} className={`${likedMap[r._id]?'text-blue-600 dark:text-blue-400':''}`}>Like {(r as any).likesCount||0}</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <div className="text-gray-500 dark:text-gray-400">No comments yet</div>
            )}
          </div>
          {/* Composer */}
          <form onSubmit={handleAddComment} className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2">
            <input
              ref={commentInputRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </form>
        </div>
      </div>
      {showEdit && reel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowEdit(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-4" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Edit Reel</div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Caption</label>
                <textarea value={editCaption} onChange={(e)=>setEditCaption(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" rows={3} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-300">Visibility:</label>
                <select value={editVisibility} onChange={(e)=>setEditVisibility(e.target.value as any)} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="public">Public</option>
                  <option value="followers">Followers</option>
                  <option value="mutuals">Mutuals</option>
                  <option value="close_friends">Close Friends</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-300">Publish:</label>
                <select value={editStatus} onChange={(e)=>setEditStatus(e.target.value as any)} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="published">Publish now</option>
                  <option value="scheduled">Schedule</option>
                  <option value="draft">Draft</option>
                </select>
                {editStatus==='scheduled' && (
                  <input type="datetime-local" value={editScheduledAt} onChange={(e)=>setEditScheduledAt(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" />
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={()=>setShowEdit(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200">Cancel</button>
                <button onClick={async ()=>{
                  try {
                    const body:any = { caption: editCaption, visibility: editVisibility, status: editStatus };
                    if (editStatus==='scheduled') body.scheduledAt = new Date(editScheduledAt).toISOString();
                    const res = await apiClient.patch(`/reels/${reel._id}`, body);
                    setReel(res.data);
                    setShowEdit(false);
                  } catch (e) {
                    console.error('Failed to update reel', e);
                    alert('Failed to update');
                  }
                }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showSavers && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowSavers(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-4" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Saved by</div>
            <div className="max-h-80 overflow-auto divide-y divide-gray-200 dark:divide-gray-700">
              {savers.map((u:any)=> (
                <Link key={u._id} to={`/profile/${u._id}`} className="flex items-center gap-3 py-2">
                  <img src={u.profilePic || 'https://via.placeholder.com/32'} className="w-8 h-8 rounded-full" />
                  <div>
                    <div className="text-gray-900 dark:text-white font-medium">{u.displayName}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-sm">@{u.username}</div>
                  </div>
                </Link>
              ))}
              {savers.length===0 && <div className="text-gray-500 dark:text-gray-400 p-3">No one yet</div>}
            </div>
            <div className="pt-3 text-right">
              <button onClick={()=>setShowSavers(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}
      {showShare && reel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowShare(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-4" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Share reel via DM</div>
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
                  const url = `${window.location.origin}/reel/${reel._id}`;
                  for (const uid of selectedUserIds) {
                    const chatRes = await apiClient.post('/chats', { type: 'dm', memberIds: [uid] });
                    const chatId = chatRes.data._id;
                    await apiClient.post('/messages', { chatId, content: `Check this reel: ${url}` });
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

export default ReelDetail;
