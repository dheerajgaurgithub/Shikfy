import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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
  const [progress, setProgress] = useState(0); // 0..1
  const timerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // mark viewed when a story becomes current
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

  // Load counts for own stories
  useEffect(() => {
    const loadCounts = async () => {
      if (!user?.id || String(current?.author?._id) !== String(user.id)) return;
      try {
        const r = await apiClient.get(`/stories/user/${user.id}`);
        const map: Record<string, { viewers: number; reactions: number }> = {};
        (Array.isArray(r.data)? r.data: []).forEach((s:any)=> { map[String(s._id)] = { viewers: s.viewersCount||0, reactions: s.reactionsCount||0 }; });
        setCounts(map);
      } catch {}
    };
    loadCounts();
  }, [gi, si, user?.id, current?.author?._id]);

  // Load detailed viewers and reactions list for current story when it's your own
  useEffect(() => {
    const loadLists = async () => {
      const sid = String(story?._id||'');
      if (!sid || !isOwn) { setViewerList([]); setReactedSet(new Set()); return; }
      try {
        const [v, r] = await Promise.all([
          apiClient.get(`/stories/${sid}/viewers`),
          apiClient.get(`/stories/${sid}/reactions`)
        ]);
        setViewerList(Array.isArray(v.data)? v.data : []);
        const set = new Set<string>();
        (Array.isArray(r.data)? r.data : []).forEach((x:any)=> {
          const id = String(x.user?._id||x.user);
          // strict hearts only (common heart variants)
          if (['❤️','❤','💖','💗','💓','💞','💘','💝'].includes(x.emoji)) set.add(id);
        });
        setReactedSet(set);
      } catch {}
    };
    loadLists();
  }, [isOwn, story?._id]);

  // Auto-advance with animated progress for images; for videos, advance on ended
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
      // image: 5s duration
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
      setCounts(prev=> ({ ...prev, [String(story._id)]: { viewers: prev[String(story._id)]?.viewers||0, reactions: (prev[String(story._id)]?.reactions||0)+1 } }));
    } catch {}
  };

  const goReply = () => {
    // Navigate to chats page; if you want direct DM targeting, we can wire chatId lookup
    navigate('/chats');
    onClose(Array.from(authorsViewedSet));
  };

  // keyboard navigation
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <button className="absolute top-4 right-4 px-3 py-1.5 rounded bg-white/10 text-white" onClick={()=> onClose(Array.from(authorsViewedSet))}>Close</button>

      <div className="w-full max-w-5xl mx-auto px-4 flex gap-6">
        {/* Main column */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 text-white mb-3">
            <img src={current.author.profilePic || 'https://via.placeholder.com/40'} className="w-8 h-8 rounded-full" />
            <div className="font-semibold">{current.author.username}</div>
            <div className="text-xs text-white/70">{new Date(story.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
            <div className="ml-auto text-xs text-white/70">Ends {(() => { const ms = new Date(story.expiresAt).getTime()-Date.now(); const h=Math.max(0,Math.floor(ms/3600000)); const m=Math.max(0,Math.floor((ms%3600000)/60000)); return `${h}h ${m}m`; })()}</div>
          </div>
          {/* Media */}
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[80vh] mx-auto">
            {story.media.type === 'image' ? (
              <img src={story.media.url} className="w-full h-full object-contain" />
            ) : (
              <video ref={videoRef} src={story.media.url} className="w-full h-full object-contain" autoPlay controls />
            )}
            {/* Progress */}
            <div className="absolute top-0 left-0 right-0 flex gap-1 p-2">
              {current.stories.map((_, idx) => (
                <div key={idx} className="h-1 flex-1 rounded bg-white/30 overflow-hidden">
                  <div className="h-full bg-white" style={{ width: idx < si ? '100%' : idx === si ? `${Math.round(progress*100)}%` : '0%' }} />
                </div>
              ))}
            </div>
            {/* Nav zones */}
            <button onClick={prev} className="absolute inset-y-0 left-0 w-1/3" aria-label="Previous" />
            <button onClick={next} className="absolute inset-y-0 right-0 w-1/3" aria-label="Next" />
          </div>

          {/* Reply & reactions */}
          <div className="mt-3 flex items-center gap-2 text-white">
            <div className="flex gap-1">
              {['❤️','😂','🔥','👏','😮'].map(e=> (
                <button key={e} onClick={()=> reactQuick(e)} className="px-2 py-1 rounded-full bg-white/10 hover:bg-white/20">{e}</button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <input placeholder={`Reply to ${current.author.username}...`} onKeyDown={(ev)=> { if (ev.key==='Enter') goReply(); }} className="px-3 py-1.5 rounded-lg bg-white/10 placeholder-white/60 focus:outline-none min-w-[220px]" />
              <button onClick={goReply} className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">Send</button>
            </div>
          </div>
        </div>

        {/* Side column: next previews / own stats */}
        <div className="w-64 hidden md:block">
          {isOwn && story?._id ? (
            <div className="text-white/90">
              <div className="bg-white/10 rounded-xl p-3 mb-3">
                <div className="text-sm font-semibold mb-2">Your story</div>
                <div className="text-sm flex items-center justify-between"><span>Views</span><span>{counts[String(story._id)]?.viewers ?? 0}</span></div>
                <div className="text-sm flex items-center justify-between"><span>Reactions</span><span>{counts[String(story._id)]?.reactions ?? 0}</span></div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 max-h-[60vh] overflow-auto">
                <div className="text-sm font-semibold mb-2">Viewers</div>
                {viewerList.length===0 ? (
                  <div className="text-xs text-white/60">No viewers yet.</div>
                ) : viewerList.map((u:any)=> (
                  <div key={String(u._id)} className="flex items-center gap-2 py-1">
                    <img src={u.profilePic||'https://via.placeholder.com/40'} className="w-7 h-7 rounded-full" />
                    <div className="flex-1 truncate">
                      <div className="text-xs font-medium truncate">{u.username||u.displayName||'user'}</div>
                    </div>
                    {reactedSet.has(String(u._id)) && <span className="text-red-500">❤️</span>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-white/50 text-sm">Swipe or click to move between stories.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryViewerModal;
