import React from 'react';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import FollowButton from './FollowButton';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';

interface ReelFeedCardProps {
  reel: any;
}

const ReelFeedCard: React.FC<ReelFeedCardProps> = ({ reel }) => {
  const { user } = useAuth() as any;
  const author = reel.authorId || {};
  const [showMenu, setShowMenu] = React.useState(false);
  const [showReport, setShowReport] = React.useState(false);
  const [reportReason, setReportReason] = React.useState('');
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [bookmarked, setBookmarked] = React.useState<boolean>(false);
  React.useEffect(()=>{
    const load = async ()=>{
      try { const r = await apiClient.get(`/reels/${reel._id}/bookmark-status`); setBookmarked(!!r.data?.bookmarked); } catch {}
    };
    load();
  }, [reel._id]);
  const toggleBookmark = async ()=>{
    try {
      const next = !bookmarked;
      setBookmarked(next);
      if (next) await apiClient.post(`/reels/${reel._id}/bookmark`); else await apiClient.delete(`/reels/${reel._id}/bookmark`);
    } catch {
      setBookmarked((v)=> !v);
    }
  };
  React.useEffect(()=>{
    if (!showMenu) return;
    const onDoc = (e: MouseEvent)=>{ if(menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
    document.addEventListener('mousedown', onDoc);
    return ()=> document.removeEventListener('mousedown', onDoc);
  }, [showMenu]);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between p-4">
        <Link to={`/profile/${author._id}`} className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 flex items-center justify-center text-white font-bold">
            {author.profilePic ? (
              <img src={author.profilePic} alt={author.displayName} className="w-full h-full rounded-full object-cover" />
            ) : (
              (author.displayName || 'U')?.charAt(0)?.toUpperCase()
            )}
          </div>
    {showReport && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=> setShowReport(false)}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-4" onClick={(e)=> e.stopPropagation()}>
          <div className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Report reel</div>
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Reason</label>
          <select value={reportReason} onChange={(e)=> setReportReason(e.target.value)} className="w-full mb-3 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="">Select a reason…</option>
            <option value="Spam">Spam</option>
            <option value="Nudity">Nudity</option>
            <option value="Hate speech or symbols">Hate speech or symbols</option>
            <option value="Violence or dangerous organizations">Violence or dangerous organizations</option>
            <option value="Harassment or bullying">Harassment or bullying</option>
            <option value="Scam or fraud">Scam or fraud</option>
            <option value="Other">Other</option>
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={()=> setShowReport(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200">Cancel</button>
            <button disabled={!reportReason} onClick={async ()=>{ try{ await fetch('/api/reports', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ targetType:'reel', targetId: reel?._id, reason: reportReason }) }); alert('Report submitted'); } catch{} finally { setShowReport(false); setReportReason(''); } }} className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50">Submit</button>
          </div>
        </div>
      </div>
    )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{author.displayName || author.username}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">@{author.username}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {author._id && String(author._id) !== String(user?.id) && <FollowButton targetId={author._id} />}
          <div className="relative" ref={menuRef}>
            <button onClick={()=> setShowMenu(v=>!v)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="More">
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                <button onClick={()=>{ toggleBookmark(); setShowMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                  <Bookmark className={`w-4 h-4 ${bookmarked? 'text-blue-600':''}`} />
                  <span>{bookmarked? 'Remove from favourites':'Add to favourites'}</span>
                </button>
                <button onClick={()=>{ setShowReport(true); setShowMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  <span>Report</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Link to={`/reel/${reel._id}`} className="block">
        <div className="relative bg-black">
          <video
            src={reel.video?.url}
            poster={reel.video?.thumbnail}
            controls
            className="w-full max-h-[70vh] object-contain"
          />
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Heart className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{reel.likesCount || 0}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{reel.commentsCount || 0}</span>
            </div>
          </div>
          <Bookmark className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </div>
        {reel.caption && (
          <p className="text-gray-900 dark:text-white">
            <span className="font-semibold mr-2">{author.username}</span>
            {reel.caption}
          </p>
        )}
      </div>
    </div>
  );
};

export default ReelFeedCard;
