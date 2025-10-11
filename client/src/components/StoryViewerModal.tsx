import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { X, Send, Eye, Heart, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export interface StoryItem {
  _id: string;
  media: { type: 'image' | 'video'; url: string };
  createdAt: string;
  expiresAt: string;
}

export interface StoryGroup {
  author: { _id: string; username: string; displayName: string; profilePic?: string };
  stories: StoryItem[];
}

interface Props {
  groups: StoryGroup[];
  startAuthorId: string;
  onClose: (authorsViewed: string[]) => void;
}

const StoryViewerModal: React.FC<Props> = ({ groups, startAuthorId, onClose }) => {
  const { user } = useAuth() as any;
  const navigate = useNavigate();
  const startIndex = Math.max(0, groups.findIndex(g => String(g.author._id) === String(startAuthorId)));
  const [gi, setGi] = useState(startIndex);
  const [si, setSi] = useState(0);
  const current = groups[gi];
  const story = current?.stories?.[si];
  const [authorsViewedSet] = useState<Set<string>>(new Set());
  const isOwn = !!user?.id && String(current?.author?._id) === String(user?.id);
  const [counts, setCounts] = useState<Record<string, { viewers: number; reactions: number }>>({});
  const [viewerList, setViewerList] = useState<any[]>([]);
  const [reactedSet, setReactedSet] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const timerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mark = async () => {
      if (!story?._id) return;
      try { await apiClient.post(`/stories/${story._id}/view`); } catch {}
    };
    mark();
    if (current?.author?._id) {
      authorsViewedSet.add(String(current.author._id));
    }
  }, [story?._id]);

  useEffect(() => {
    const loadCounts = async () => {
      if (!user?.id || String(current?.author?._id) !== String(user.id)) return;
      try {
        const r = await apiClient.get(`/stories/user/${user.id}`);
        const map: Record<string, { viewers: number; reactions: number }> = {};
        (Array.isArray(r.data) ? r.data : []).forEach((s: any) => { map[String(s._id)] = { viewers: s.viewersCount || 0, reactions: s.reactionsCount || 0 }; });
        setCounts(map);
      } catch {}
    };
    loadCounts();
  }, [gi, si, user?.id, current?.author?._id]);

  useEffect(() => {
    const loadLists = async () => {
      const sid = String(story?._id || '');
      if (!sid || !isOwn) { setViewerList([]); setReactedSet(new Set()); return; }
      try {
        const [v, r] = await Promise.all([
          apiClient.get(`/stories/${sid}/viewers`),
          apiClient.get(`/stories/${sid}/reactions`)
        ]);
        setViewerList(Array.isArray(v.data) ? v.data : []);
        const set = new Set<string>();
        (Array.isArray(r.data) ? r.data : []).forEach((x: any) => {
          const id = String(x.user?._id || x.user);
          if (['❤️', '❤', '💖', '💗', '💓', '💞', '💘', '💝'].includes(x.emoji)) set.add(id);
        });
        setReactedSet(set);
      } catch {}
    };
    loadLists();
  }, [isOwn, story?._id]);

  useEffect(() => {
    setProgress(0);
    if (!story) return;
    if (story.media.type === 'video') {
      const v = videoRef.current;
      if (!v) return;
      const onTime = () => {
        if (v.duration && !isNaN(v.duration)) setProgress(Math.min(1, v.currentTime / v.duration));
      };
      const onEnd = () => next();
      v.addEventListener('timeupdate', onTime);
      v.addEventListener('ended', onEnd);
      return () => { v.removeEventListener('timeupdate', onTime); v.removeEventListener('ended', onEnd); };
    } else {
      const start = Date.now();
      const dur = 5000;
      timerRef.current = setInterval(() => {
        const p = Math.min(1, (Date.now() - start) / dur);
        setProgress(p);
        if (p >= 1) { clearInterval(timerRef.current); next(); }
      }, 50);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [story?._id]);

  const next = () => {
    if (!current) return;
    if (si + 1 < current.stories.length) {
      setSi(si + 1);
    } else if (gi + 1 < groups.length) {
      setGi(gi + 1); setSi(0);
    } else {
      onClose(Array.from(authorsViewedSet));
    }
  };

  const prev = () => {
    if (!current) return;
    if (si > 0) {
      setSi(si - 1);
    } else if (gi > 0) {
      const prevLen = groups[gi - 1].stories.length;
      setGi(gi - 1); setSi(Math.max(0, prevLen - 1));
    }
  };

  const reactQuick = async (emoji: string) => {
    try {
      if (!story?._id) return;
      await apiClient.post(`/stories/${story._id}/react`, { emoji });
      setCounts(prev => ({ ...prev, [String(story._id)]: { viewers: prev[String(story._id)]?.viewers || 0, reactions: (prev[String(story._id)]?.reactions || 0) + 1 } }));
    } catch {}
  };

  const goReply = () => {
    navigate('/chats');
    onClose(Array.from(authorsViewedSet));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(Array.from(authorsViewedSet));
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gi, si]);

  if (!current || !story) return null;

  const expiresIn = (() => { const ms = new Date(story.expiresAt).getTime() - Date.now(); const h = Math.max(0, Math.floor(ms / 3600000)); const m = Math.max(0, Math.floor((ms % 3600000) / 60000)); return `${h}h ${m}m`; })();
  const timestamp = new Date(story.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-black via-slate-900 to-black flex items-center justify-center p-2 sm:p-4">
      {/* Close Button */}
      <button 
        className="absolute top-3 sm:top-6 right-3 sm:right-6 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-200 hover:scale-110 backdrop-blur-md border border-white/20 z-10 group"
        onClick={() => onClose(Array.from(authorsViewedSet))}
      >
        <X className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform" />
      </button>

      <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-3 sm:gap-6">
        
        {/* Main Story Column */}
        <div className="flex-1 min-w-0 flex flex-col gap-3 sm:gap-4">
          
          {/* Story Header */}
          <div className="flex items-center gap-2 sm:gap-3 text-white px-2 sm:px-4 py-2 sm:py-3 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
            <div className="relative flex-shrink-0">
              <img 
                src={current.author.profilePic || 'https://via.placeholder.com/40'} 
                alt={current.author.username}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white/30" 
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm sm:text-base truncate">{current.author.username}</div>
              <div className="text-xs sm:text-sm text-white/60">{current.author.displayName}</div>
            </div>
            <div className="text-xs sm:text-sm text-white/60 whitespace-nowrap">{timestamp}</div>
            <div className="text-xs sm:text-sm text-white/60 flex items-center gap-1 whitespace-nowrap">
              <Eye className="w-4 h-4" />
              Ends {expiresIn}
            </div>
          </div>

          {/* Progress Bars */}
          <div className="flex gap-1 px-2 sm:px-4">
            {current.stories.map((_, idx) => (
              <div key={idx} className="h-1 sm:h-1.5 flex-1 rounded-full bg-white/20 backdrop-blur-sm overflow-hidden border border-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full transition-all duration-100" 
                  style={{ width: idx < si ? '100%' : idx === si ? `${Math.round(progress * 100)}%` : '0%' }} 
                />
              </div>
            ))}
          </div>

          {/* Media Container */}
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[70vh] sm:max-h-[80vh] mx-auto w-full shadow-2xl border-2 border-white/10 group">
            {story.media.type === 'image' ? (
              <img 
                src={story.media.url} 
                alt="Story"
                className="w-full h-full object-contain" 
              />
            ) : (
              <video 
                ref={videoRef} 
                src={story.media.url} 
                className="w-full h-full object-contain" 
                autoPlay
                controls
              />
            )}

            {/* Navigation Zones */}
            <button 
              onClick={prev} 
              className="absolute inset-y-0 left-0 w-1/4 hover:bg-black/20 transition-colors flex items-center justify-start pl-2 sm:pl-4 opacity-0 hover:opacity-100 group-hover:opacity-100"
              aria-label="Previous story"
            >
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 text-white drop-shadow-lg" />
            </button>
            <button 
              onClick={next} 
              className="absolute inset-y-0 right-0 w-1/4 hover:bg-black/20 transition-colors flex items-center justify-end pr-2 sm:pr-4 opacity-0 hover:opacity-100 group-hover:opacity-100"
              aria-label="Next story"
            >
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-white drop-shadow-lg" />
            </button>
          </div>

          {/* Reactions & Reply */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 px-2 sm:px-4">
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {['❤️', '😂', '🔥', '👏', '😮'].map(e => (
                <button 
                  key={e} 
                  onClick={() => reactQuick(e)} 
                  className="px-3 sm:px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold transition-all hover:scale-110 active:scale-95 text-lg sm:text-xl whitespace-nowrap flex-shrink-0 shadow-lg"
                  title={`React with ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
            
            <div className="flex gap-2 flex-1 sm:ml-auto">
              <input 
                placeholder={`Reply to ${current.author.username}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(ev) => { if (ev.key === 'Enter') goReply(); }}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 text-white text-xs sm:text-sm font-medium transition-all"
              />
              <button 
                onClick={goReply} 
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold transition-all hover:scale-110 active:scale-95 shadow-lg flex items-center gap-1 text-xs sm:text-sm"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Reply</span>
              </button>
            </div>
          </div>
        </div>

        {/* Side Panel: Stats or Navigation Hint */}
        <div className="w-full lg:w-72 flex-shrink-0">
          {isOwn && story?._id ? (
            <div className="space-y-3">
              {/* Stats Card */}
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-2xl p-4 sm:p-5 border-2 border-white/20 shadow-lg">
                <h4 className="text-white font-bold text-sm sm:text-base mb-3 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Your Story
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-white/80 text-xs sm:text-sm">
                    <span className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Views
                    </span>
                    <span className="font-bold text-white text-sm sm:text-base">{counts[String(story._id)]?.viewers ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-white/80 text-xs sm:text-sm">
                    <span className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-400" />
                      Reactions
                    </span>
                    <span className="font-bold text-white text-sm sm:text-base">{counts[String(story._id)]?.reactions ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Viewers List */}
              <div className="bg-white/5 backdrop-blur-md rounded-2xl border-2 border-white/20 overflow-hidden shadow-lg max-h-96 overflow-y-auto">
                <div className="sticky top-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 px-4 py-3 border-b border-white/10 backdrop-blur-md">
                  <h5 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Viewers ({viewerList.length})
                  </h5>
                </div>
                <div className="divide-y divide-white/10">
                  {viewerList.length === 0 ? (
                    <div className="text-white/60 text-xs sm:text-sm p-4 text-center">No viewers yet. Share your story!</div>
                  ) : viewerList.map((u: any) => (
                    <div key={String(u._id)} className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 hover:bg-white/5 transition-colors">
                      <img 
                        src={u.profilePic || 'https://via.placeholder.com/40'} 
                        alt={u.username}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0 border border-white/20" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold text-xs sm:text-sm truncate">{u.username || u.displayName || 'user'}</div>
                      </div>
                      {reactedSet.has(String(u._id)) && (
                        <span className="text-lg sm:text-xl flex-shrink-0 animate-pulse">❤️</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 sm:p-6 border-2 border-white/20 text-white/70 text-xs sm:text-sm text-center space-y-3 hidden lg:block">
              <MessageCircle className="w-8 h-8 mx-auto text-white/40" />
              <p className="font-medium">Use arrow keys or click to navigate</p>
              <p className="text-white/60">Left side: Previous • Right side: Next</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryViewerModal;