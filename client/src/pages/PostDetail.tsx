import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface CommentType {
  _id: string;
  text: string;
  authorId: { _id: string; username: string; displayName: string; profilePic?: string };
  createdAt: string;
}

interface PostType {
  _id: string;
  caption: string;
  media: { type: string; url: string; thumbnail?: string }[];
  authorId: { _id: string; username: string; displayName: string; profilePic?: string };
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

const PostDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<PostType | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replies, setReplies] = useState<Record<string, CommentType[]>>({});
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [showSavers, setShowSavers] = useState(false);
  const [savers, setSavers] = useState<any[]>([]);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [showEdit, setShowEdit] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [editVisibility, setEditVisibility] = useState<'public'|'followers'|'mutuals'|'close_friends'|'custom'>('public');
  const [editStatus, setEditStatus] = useState<'published'|'scheduled'|'draft'>('published');
  const [editScheduledAt, setEditScheduledAt] = useState('');

  const fetchAll = async () => {
    if (!id) return;
    try {
      const [p, c] = await Promise.all([
        apiClient.get(`/posts/${id}`),
        apiClient.get(`/posts/${id}/comments`)
      ]);
      setPost(p.data);
      setComments(c.data);
      setEditCaption(p.data.caption || '');
      // load like-status for top-level comments
      try {
        const ids = (c.data || []).map((cm:any)=> cm._id);
        await Promise.all(ids.map(async (cid:string)=>{
          try { const r = await apiClient.get(`/posts/${id}/comments/${cid}/like-status`); setLikedMap(prev=>({...prev,[cid]: !!r.data?.liked})); } catch {}
        }));
      } catch {}
    } catch (e) {
      console.error('Failed to fetch post or comments:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleLikeComment = async (commentId: string) => {
    if (!id) return;
    const liked = !!likedMap[commentId];
    // optimistic update
    setLikedMap(prev=> ({ ...prev, [commentId]: !liked }));
    // adjust counts in place
    const adjust = (arr: CommentType[]) => arr.map(cm => cm._id===commentId ? ({...cm, likesCount: (cm as any).likesCount? ((cm as any).likesCount + (liked?-1:1)) : (!liked?1:0) }) as any : cm);
    setComments(prev=> adjust(prev));
    Object.keys(replies).forEach(pid=> setReplies(prev=> ({...prev, [pid]: adjust(prev[pid]) })));
    try {
      if (!liked) await apiClient.post(`/posts/${id}/comments/${commentId}/like`);
      else await apiClient.delete(`/posts/${id}/comments/${commentId}/like`);
    } catch (e) {
      // revert
      setLikedMap(prev=> ({ ...prev, [commentId]: liked }));
      setComments(prev=> adjust(prev));
      Object.keys(replies).forEach(pid=> setReplies(prev=> ({...prev, [pid]: adjust(prev[pid]) })));
    }
  };

  const toggleReplies = async (commentId: string) => {
    setReplyOpen(prev => ({ ...prev, [commentId]: !prev[commentId] }));
    if (!replies[commentId]) {
      try {
        const res = await apiClient.get(`/posts/${id}/comments/${commentId}/replies`);
        setReplies(prev => ({ ...prev, [commentId]: res.data }));
        // load like-status for replies
        try {
          await Promise.all((res.data||[]).map(async (r:any)=>{
            try { const s = await apiClient.get(`/posts/${id}/comments/${r._id}/like-status`); setLikedMap(prev=>({...prev, [r._id]: !!s.data?.liked})); } catch {}
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
      const res = await apiClient.post(`/posts/${id}/comments`, { text, parentCommentId: parentId });
      setReplies(prev => ({ ...prev, [parentId]: [res.data, ...(prev[parentId] || [])] }));
      setReplyText(prev => ({ ...prev, [parentId]: '' }));
    } catch (e) {
      console.error('Failed to reply', e);
      alert('Failed to reply');
    }
  };

  const loadSavers = async () => {
    try {
      const res = await apiClient.get(`/posts/${id}/savers`);
      setSavers(res.data || []);
      setShowSavers(true);
    } catch (e) {
      console.error('Failed to load savers', e);
      alert('Failed to load savers');
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
      const res = await apiClient.post(`/posts/${id}/comments`, { text: commentText.trim() });
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
        <div className="text-gray-500 dark:text-gray-400">Loading post...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Post not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="relative bg-black">
          {post.media?.[0]?.type === 'video' ? (
            <video src={post.media[0].url} controls className="w-full max-h-[70vh] object-contain" />
          ) : (
            <img src={post.media?.[0]?.url} alt="Post" className="w-full max-h-[70vh] object-contain" />
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <Link to={`/profile/${post.authorId._id}`} className="font-semibold text-gray-900 dark:text-white">
              {post.authorId.username}
            </Link>
            <span className="text-gray-600 dark:text-gray-400">{post.caption}</span>
            {user?.id === post.authorId._id && (
              <div className="ml-auto flex gap-2">
                <button onClick={()=>{setShowEdit(true); setEditVisibility((post as any).visibility || 'public'); setEditStatus(((post as any).status)||'published'); setEditScheduledAt(((post as any).scheduledAt)? new Date((post as any).scheduledAt).toISOString().slice(0,16):'');}} className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200">Edit</button>
                <button onClick={loadSavers} className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200">Savers</button>
              </div>
            )}
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
        </div>
      </div>

      {showSavers && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={()=>setShowSavers(false)}>
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
      {showEdit && post && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowEdit(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-4" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Edit Post</div>
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
                    const res = await apiClient.patch(`/posts/${post._id}`, body);
                    setPost(res.data);
                    setShowEdit(false);
                  } catch (e) {
                    console.error('Failed to update post', e);
                    alert('Failed to update');
                  }
                }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostDetail;
