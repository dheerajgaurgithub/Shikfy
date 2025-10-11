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
            const followingIds = new Set(followingList.map((u:any)=>u._id));
            const sugsFollowers = followersList.filter((u:any)=> !followingIds.has(u._id));

            const sample = followingList.slice(0, 10);
            let fofCounts: Record<string, { user:any; count:number }> = {};
            try {
              const fofLists = await Promise.all(sample.map((u:any)=> apiClient.get(`/users/${u._id}/following`).catch(()=>({ data: [] })) ));
              fofLists.forEach((resp: any)=>{
                const arr = Array.isArray(resp.data)? resp.data : [];
                arr.forEach((x:any)=>{
                  if (!x?._id || followingIds.has(x._id) || x._id === user.id) return;
                  if (!fofCounts[x._id]) fofCounts[x._id] = { user: x, count: 0 };
                  fofCounts[x._id].count += 1;
                });
              });
            } catch {}

            const fofSorted = Object.values(fofCounts)
              .sort((a,b)=> b.count - a.count)
              .map(v=> ({ ...v.user, _mutuals: v.count }));

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

  useEffect(() => {
    const loadStories = async () => {
      try {
        const r = await apiClient.get('/stories/feed');
        setStoryFeed(Array.isArray(r.data) ? r.data : []);
      } catch {}
    };
    loadStories();
  }, [user?.id]);

  const refreshStories = async () => {
    try {
      const r = await apiClient.get('/stories/feed');
      setStoryFeed(Array.isArray(r.data) ? r.data : []);
    } catch {}
  };

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-pink-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-purple-500 border-l-indigo-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 font-semibold animate-pulse">Loading your feed...</div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950/20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6 xl:gap-8">
          
          {/* Center column (feed) */}
          <div className="lg:col-span-8 xl:col-span-7">
            
            {/* Stories Section with Enhanced Design */}
            <div className="mb-4 sm:mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 p-4 sm:p-5 overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-gradient-to-b from-pink-500 via-purple-500 to-blue-500 rounded-full"></div>
                <h2 className="text-sm sm:text-base font-bold text-gray-800 dark:text-white">Stories</h2>
              </div>
              
              <div className="overflow-x-auto scrollbar-hide -mx-2 px-2">
                <div className="flex items-center gap-3 sm:gap-4 min-w-max pb-2">
                  {(() => {
                    const meHasStory = storyFeed.some((g:any)=> String(g.author?._id||g.author) === String(user?.id));
                    const meViewed = viewedStoryAuthors.has(String(user?.id));
                    const tiles: any[] = [];
                    
                    tiles.push(
                      <div key="me" className="flex flex-col items-center w-16 sm:w-20 shrink-0 group">
                        <button 
                          onClick={()=> meHasStory ? (setViewerAuthorId(String(user?.id)), setShowStoryViewer(true)) : setShowCreateStory(true)} 
                          aria-label={meHasStory ? 'View your story' : 'Add a story'}
                          className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0.5 transition-all duration-300 transform group-hover:scale-105 ${
                            meHasStory 
                              ? meViewed 
                                ? 'ring-2 ring-gray-300 dark:ring-gray-600' 
                                : 'bg-gradient-to-tr from-pink-500 via-purple-500 to-yellow-400 shadow-lg shadow-pink-500/50'
                              : 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-md hover:shadow-lg'
                          }`}
                        >
                          <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 p-0.5 flex items-center justify-center overflow-hidden">
                            {user?.profilePic ? (
                              <img src={user.profilePic} className="w-full h-full rounded-full object-cover" alt="Your story" />
                            ) : (
                              <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center">
                                <span className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-purple-600">{meHasStory ? '👤' : '+'}</span>
                              </div>
                            )}
                          </div>
                          {/* Always show + button to add another story. Clicking it opens composer. */}
                          <button
                            type="button"
                            onClick={(e)=>{ e.stopPropagation(); setShowCreateStory(true); }}
                            aria-label="Add story"
                            className={`absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-md transition ${
                              meHasStory ? 'bg-gradient-to-br from-blue-600 to-purple-600' : 'bg-gradient-to-br from-blue-600 to-purple-600'
                            }`}
                          >
                            <span className="text-white text-xs font-bold">+</span>
                          </button>
                        </button>
                        <div className="mt-2 text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 truncate w-full text-center">
                          {meHasStory ? 'Your story' : 'Add story'}
                        </div>
                      </div>
                    );
                    
                    storyFeed
                      .filter((g:any)=> String(g.author?._id||g.author) !== String(user?.id))
                      .slice(0, 20)
                      .forEach((g:any)=> {
                        const aid = String(g.author?._id||g.author);
                        const viewed = viewedStoryAuthors.has(aid);
                        tiles.push(
                          <div key={aid} className="flex flex-col items-center w-16 sm:w-20 shrink-0 group">
                            <button 
                              onClick={()=> { setViewerAuthorId(aid); setShowStoryViewer(true); }} 
                              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0.5 transition-all duration-300 transform group-hover:scale-105 ${
                                viewed 
                                  ? 'ring-2 ring-gray-300 dark:ring-gray-600' 
                                  : 'bg-gradient-to-tr from-pink-500 via-purple-500 to-yellow-400 shadow-lg shadow-pink-500/50'
                              }`}
                            >
                              <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 p-0.5 overflow-hidden">
                                <img 
                                  src={g.author?.profilePic || 'https://via.placeholder.com/80'} 
                                  className="w-full h-full rounded-full object-cover" 
                                  alt={g.author?.username}
                                />
                              </div>
                            </button>
                            <div className="mt-2 text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 truncate w-full text-center">
                              {g.author?.username}
                            </div>
                          </div>
                        );
                      });
                    return tiles;
                  })()}
                </div>
              </div>
            </div>

            {/* Feed Posts */}
            {posts.length === 0 ? (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg p-12 sm:p-16 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No posts yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Follow people to see their posts in your feed</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {posts.map((post) => (
                  <PostCard key={post._id} post={post} onDelete={(id)=> setPosts(prev=> prev.filter(p=>p._id!==id))} />
                ))}
                {posts.length >= 20 && (
                  <button 
                    onClick={() => setPage(prev => prev + 1)} 
                    className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    Load More Posts
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right sidebar: Suggestions - Enhanced */}
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-5">
            <div className="sticky top-4 xl:top-6 space-y-4">
              
              {/* User Profile Card */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 p-5 xl:p-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
                <div className="relative flex items-center gap-4 mb-4">
                  <div className="relative">
                    <div className="w-14 h-14 xl:w-16 xl:h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 p-0.5 shadow-lg">
                      <img 
                        src={user?.profilePic || 'https://via.placeholder.com/64'} 
                        className="w-full h-full rounded-full object-cover border-2 border-white dark:border-gray-800" 
                        alt={user?.displayName}
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm xl:text-base font-bold text-gray-900 dark:text-white truncate">{user?.displayName}</div>
                    <div className="text-xs xl:text-sm text-gray-500 dark:text-gray-400 truncate">@{user?.username}</div>
                  </div>
                </div>
              </div>

              {/* Suggestions Card */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 p-5 xl:p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                    <h3 className="text-sm xl:text-base font-bold text-gray-800 dark:text-white">Suggested for you</h3>
                  </div>
                  <button 
                    className="text-xs xl:text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all" 
                    onClick={()=> navigate('/suggestions')}
                  >
                    See All
                  </button>
                </div>
                
                <div className="space-y-4">
                  {suggestions.slice(0, 6).map((s:any)=> (
                    <div key={s._id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 xl:w-12 xl:h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 p-0.5 group-hover:from-blue-500 group-hover:to-purple-600 transition-all duration-300">
                            <img 
                              src={s.profilePic || 'https://via.placeholder.com/48'} 
                              className="w-full h-full rounded-full object-cover" 
                              alt={s.displayName}
                            />
                          </div>
                          {s._mutuals > 0 && (
                            <span className="absolute -bottom-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg">
                              {s._mutuals}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate transition-colors">
                            {s.displayName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">@{s.username}</div>
                        </div>
                      </div>
                      <button 
                        onClick={async()=>{
                          try { 
                            await apiClient.post(`/users/${s._id}/follow`); 
                            setFollowing(prev=> [...prev, s]); 
                            setSuggestions(prev=> prev.filter((x:any)=> x._id!==s._id)); 
                          } catch {}
                        }} 
                        className="shrink-0 text-xs xl:text-sm px-4 xl:px-5 py-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                      >
                        Follow
                      </button>
                    </div>
                  ))}
                  {suggestions.length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">No suggestions available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>

    {/* Modals */}
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