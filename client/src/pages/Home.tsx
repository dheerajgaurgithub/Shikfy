import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import PostCard from '../components/PostCard';
import CreateStoryModal from '../components/CreateStoryModal';
import StoryViewerModal from '../components/StoryViewerModal';

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
  const auth = useAuth() as any;
  const user = auth.user as any;
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [following, setFollowing] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [storyFeed, setStoryFeed] = useState<any[]>([]);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [viewerAuthorId, setViewerAuthorId] = useState<string>('');
  const [viewedStoryAuthors, setViewedStoryAuthors] = useState<Set<string>>(new Set());

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

  // Load following and followers for stories & suggestions
  useEffect(() => {
    const load = async () => {
      try {
        if (user?.id) {
          try {
            const [fl, fr] = await Promise.all([
              apiClient.get(`/users/${user.id}/following`),
              apiClient.get(`/users/${user.id}/followers`),
            ]);
            const followingList = fl.data||[];
            const followersList = fr.data||[];
            setFollowing(followingList);
            // Suggestions: followers you don't follow back
            const followingIds = new Set(followingList.map((u:any)=>u._id));
            const sugsFollowers = followersList.filter((u:any)=> !followingIds.has(u._id));

            // Friends-of-friends: accounts followed by the people you follow
            // Limit breadth to avoid many requests
            const sample = followingList.slice(0, 10);
            let fofCounts: Record<string, { user:any; count:number }> = {};
            try {
              const fofLists = await Promise.all(sample.map((u:any)=> apiClient.get(`/users/${u._id}/following`).catch(()=>({ data: [] })) ));
              fofLists.forEach((resp: any)=>{
                const arr = Array.isArray(resp.data)? resp.data : [];
                arr.forEach((x:any)=>{
                  // Exclude already-following and self
                  if (!x?._id || followingIds.has(x._id) || x._id === user.id) return;
                  if (!fofCounts[x._id]) fofCounts[x._id] = { user: x, count: 0 };
                  fofCounts[x._id].count += 1;
                });
              });
            } catch {}

            const fofSorted = Object.values(fofCounts)
              .sort((a,b)=> b.count - a.count)
              .map(v=> ({ ...v.user, _mutuals: v.count }));

            // Merge lists and dedupe by id, prioritize higher mutual count then follower-suggestion signal
            const byId = new Map<string, any>();
            const push = (arr:any[], weightKey:string) => {
              arr.forEach(u=>{
                const existing = byId.get(u._id);
                const weight = (u._mutuals || 0) + (weightKey==='follower' ? 0.5 : 0);
                if (!existing || (existing.__w||0) < weight) {
                  byId.set(u._id, { ...u, __w: weight });
                }
              });
            };
            push(fofSorted, 'fof');
            push(sugsFollowers, 'follower');
            const merged = Array.from(byId.values()).sort((a:any,b:any)=> (b.__w||0) - (a.__w||0));
            const sugs = merged.slice(0, 20);
            setSuggestions(sugs);
          } catch {}
        }
      } catch {}
    };
    load();
  }, [user?.id]);

  // Load stories feed (me + following), active within 24h
  useEffect(() => {
    const loadStories = async () => {
      try {
        const r = await apiClient.get('/stories/feed');
        setStoryFeed(Array.isArray(r.data) ? r.data : []);
      } catch {}
    };
    loadStories();
  }, [user?.id]);

  // Expose refresh for modal callback
  const refreshStories = async () => {
    try {
      const r = await apiClient.get('/stories/feed');
      setStoryFeed(Array.isArray(r.data) ? r.data : []);
    } catch {}
  };

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading feed...</div>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-6xl mx-auto px-4 py-6 lg:grid lg:grid-cols-3 lg:gap-6">
      {/* Center column (feed) */}
      <div className="lg:col-span-2">
        {/* Stories */}
        <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 overflow-x-auto">
          <div className="flex items-center gap-4 min-w-max">
            {(() => {
              const meHasStory = storyFeed.some((g:any)=> String(g.author?._id||g.author) === String(user?.id));
              const meViewed = viewedStoryAuthors.has(String(user?.id));
              const tiles: any[] = [];
              // First tile: me
              tiles.push(
                <div key="me" className="flex flex-col items-center w-16 shrink-0">
                  <button onClick={()=> meHasStory ? (setViewerAuthorId(String(user?.id)), setShowStoryViewer(true)) : setShowCreateStory(true)} className={`w-14 h-14 rounded-full p-[2px] ${meHasStory ? (meViewed ? 'border border-white/70' : 'bg-gradient-to-tr from-pink-500 to-yellow-400') : 'bg-transparent border-2 border-dashed border-gray-300 dark:border-gray-600'}`}>
                    <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 p-[2px] flex items-center justify-center overflow-hidden">
                      {user?.profilePic ? (
                        <img src={user.profilePic} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-xl text-gray-400">{meHasStory ? '' : '+'}</span>
                      )}
                    </div>
                  </button>
                  <div className="mt-1 text-[11px] text-gray-700 dark:text-gray-300 truncate w-full text-center">Your story</div>
                </div>
              );
              // Following authors with stories
              storyFeed
                .filter((g:any)=> String(g.author?._id||g.author) !== String(user?.id))
                .slice(0, 20)
                .forEach((g:any)=> {
                  const aid = String(g.author?._id||g.author);
                  const viewed = viewedStoryAuthors.has(aid);
                  tiles.push(
                    <div key={String(g.author?._id||g.author)} className="flex flex-col items-center w-16 shrink-0">
                      <button onClick={()=> { setViewerAuthorId(aid); setShowStoryViewer(true); }} className={`w-14 h-14 rounded-full p-[2px] ${viewed ? 'border border-white/70' : 'bg-gradient-to-tr from-pink-500 to-yellow-400'}`}>
                        <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 p-[2px] overflow-hidden">
                          <img src={g.author?.profilePic || 'https://via.placeholder.com/80'} className="w-full h-full rounded-full object-cover" />
                        </div>
                      </button>
                      <div className="mt-1 text-[11px] text-gray-700 dark:text-gray-300 truncate w-full text-center">{g.author?.username}</div>
                    </div>
                  );
                });
              return tiles;
            })()}
          </div>
        </div>

        {/* Feed */}
        {posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 mb-2">No posts yet.</p>
            <p className="text-gray-400 text-sm">Follow people to see posts here.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} onDelete={(id)=> setPosts(prev=> prev.filter(p=>p._id!==id))} />
            ))}
            {posts.length >= 20 && (
              <button onClick={() => setPage(prev => prev + 1)} className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition">Load More</button>
            )}
          </div>
        )}
      </div>

      {/* Right sidebar: Suggestions */}
      <aside className="hidden lg:block">
        <div className="sticky top-6 space-y-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <img src={user?.profilePic || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full" />
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{user?.displayName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">@{user?.username}</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">Suggested for you</div>
              <button className="text-xs text-blue-600 hover:underline" onClick={()=> navigate('/suggestions')}>See All</button>
            </div>
            <div className="mt-3 space-y-3">
              {suggestions.slice(0,6).map((s:any)=> (
                <div key={s._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={s.profilePic || 'https://via.placeholder.com/40'} className="w-9 h-9 rounded-full" />
                      {s._mutuals>0 && (
                        <span className="absolute -bottom-1 -right-1 text-[10px] px-1 rounded bg-blue-600 text-white">{s._mutuals}</span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white hover:underline cursor-pointer">{s.displayName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">@{s.username}</div>
                    </div>
                  </div>
                  <button onClick={async()=>{
                    try { await apiClient.post(`/users/${s._id}/follow`); setFollowing(prev=> [...prev, s]); setSuggestions(prev=> prev.filter((x:any)=> x._id!==s._id)); }
                    catch { /* ignore */ }
                  }} className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700">Follow</button>
                </div>
              ))}
              {suggestions.length===0 && (
                <div className="text-xs text-gray-500">No suggestions right now</div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>

    {/* Create Story Modal */}
    {showCreateStory && (
      <CreateStoryModal
        onClose={()=> setShowCreateStory(false)}
        onCreated={()=> { refreshStories(); setShowCreateStory(false); }}
      />
    )}
    {showStoryViewer && viewerAuthorId && (
      <StoryViewerModal
        groups={storyFeed as any}
        startAuthorId={viewerAuthorId}
        onClose={(authorsViewed)=> { 
          setShowStoryViewer(false); 
          setViewerAuthorId(''); 
          if (Array.isArray(authorsViewed) && authorsViewed.length) setViewedStoryAuthors(prev=> new Set([...Array.from(prev), ...authorsViewed]));
        }}
      />
    )}
    </>
  );
};

export default Home;

// Story viewer could be added later; currently we show ring and allow creation via modal
// Modal mount

