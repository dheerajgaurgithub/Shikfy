import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import PostCard from '../components/PostCard';
import ReelFeedCard from '../components/ReelFeedCard';
import CreateStoryModal from '../components/CreateStoryModal';
import StoryViewerModal from '../components/StoryViewerModal';
import { Heart, MessageCircle, Bookmark, MoreHorizontal } from 'lucide-react';
import FollowButton from '../components/FollowButton';

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
  
  // Feed state
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [reels, setReels] = useState<any[]>([]);
  const mixedFeed = useMemo(()=>{
    const p = posts.map((x:any)=> ({ __kind:'post', _id:x._id, data:x }));
    const r = reels.map((x:any)=> ({ __kind:'reel', _id:x._id, data:x }));
    const all = [...p, ...r];
    // simple interleave by createdAt if available; otherwise shuffle
    all.sort((a:any,b:any)=>{
      const ad = new Date(a.data?.createdAt||0).getTime();
      const bd = new Date(b.data?.createdAt||0).getTime();
      return bd - ad;
    });
    return all;
  }, [posts, reels]);
  
  // User connections
  const [following, setFollowing] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  
  // Stories state
  const [storyFeed, setStoryFeed] = useState<any[]>([]);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [viewerAuthorId, setViewerAuthorId] = useState<string>('');
  const [viewedStoryAuthors, setViewedStoryAuthors] = useState<Set<string>>(new Set());
  
  // Post dialog state
  const [postDialog, setPostDialog] = useState<{ open: boolean; post: any | null; comments: any[] }>({ 
    open: false, 
    post: null, 
    comments: [] 
  });
  const [postLikes, setPostLikes] = useState<number>(0);
  const [postLiked, setPostLiked] = useState<boolean>(false);
  const [postBookmarked, setPostBookmarked] = useState<boolean>(false);
  const [postComment, setPostComment] = useState<string>('');
  const dialogCommentRef = useRef<HTMLInputElement | null>(null);

  // Fetch posts and reels
  const fetchPosts = async () => {
    try {
      const [postsResponse, reelsResponse] = await Promise.all([
        apiClient.get(`/posts/feed?page=${page}&random=${page===1}`),
        page === 1 ? apiClient.get('/reels/feed?page=1&random=true') : Promise.resolve({ data: [] })
      ]);
      
      if (page === 1) {
        setPosts(postsResponse.data);
        setReels(reelsResponse.data || []);
      } else {
        setPosts(prev => [...prev, ...postsResponse.data]);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open post dialog and load data
  const openPostDialog = async (postId: string) => {
    try {
      const [postResponse, commentsResponse] = await Promise.all([
        apiClient.get(`/posts/${postId}`),
        apiClient.get(`/posts/${postId}/comments`)
      ]);
      
      const post = postResponse.data;
      setPostDialog({ open: true, post, comments: commentsResponse.data || [] });
      setPostLikes(post?.likesCount || 0);
      
      try {
        const [likeStatusResponse, bookmarkStatusResponse] = await Promise.all([
          apiClient.get(`/posts/${postId}/like-status`),
          apiClient.get(`/posts/${postId}/bookmark-status`)
        ]);
        setPostLiked(!!likeStatusResponse.data?.liked);
        setPostBookmarked(!!bookmarkStatusResponse.data?.bookmarked);
      } catch {}
    } catch (error) {
      console.error('Failed to open post dialog', error);
    }
  };

  // Toggle like on post
  const toggleLikePost = async () => {
    const postId = postDialog.post?._id;
    if (!postId) return;
    
    const nextLikedState = !postLiked;
    setPostLiked(nextLikedState);
    setPostLikes(prev => prev + (nextLikedState ? 1 : -1));
    
    try {
      if (nextLikedState) {
        const response = await apiClient.post(`/posts/${postId}/like`);
        if (typeof response.data?.likesCount === 'number') {
          setPostLikes(response.data.likesCount);
        }
      } else {
        const response = await apiClient.delete(`/posts/${postId}/like`);
        if (typeof response.data?.likesCount === 'number') {
          setPostLikes(response.data.likesCount);
        }
      }
    } catch (error) {
      // Revert on error
      setPostLiked(!nextLikedState);
      setPostLikes(prev => prev + (nextLikedState ? -1 : 1));
    }
  };

  // Toggle bookmark on post
  const toggleBookmark = async () => {
    const postId = postDialog.post?._id;
    if (!postId) return;
    
    const nextBookmarkedState = !postBookmarked;
    setPostBookmarked(nextBookmarkedState);
    
    try {
      if (nextBookmarkedState) {
        await apiClient.post(`/posts/${postId}/bookmark`);
      } else {
        await apiClient.delete(`/posts/${postId}/bookmark`);
      }
    } catch (error) {
      setPostBookmarked(!nextBookmarkedState);
    }
  };

  // Add comment to post
  const handleAddPostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const postId = postDialog.post?._id;
    const text = postComment.trim();
    
    if (!postId || !text) return;
    
    try {
      const response = await apiClient.post(`/posts/${postId}/comments`, { text });
      setPostDialog(prev => ({ 
        ...prev, 
        comments: [response.data, ...prev.comments] 
      }));
      setPostComment('');
    } catch (error) {
      console.error('Failed to add comment', error);
      alert('Failed to add comment');
    }
  };

  // Load user connections and suggestions
  const loadUserConnections = async () => {
    if (!user?.id) return;
    
    try {
      const [followingResponse, followersResponse] = await Promise.all([
        apiClient.get(`/users/${user.id}/following`),
        apiClient.get(`/users/${user.id}/followers`)
      ]);
      
      const followingList = followingResponse.data || [];
      const followersList = followersResponse.data || [];
      setFollowing(followingList);
      
      const followingIds = new Set(followingList.map((u: any) => u._id));
      const suggestedFollowers = followersList.filter((u: any) => !followingIds.has(u._id));
      
      // Get friends-of-friends suggestions
      const sampleFollowing = followingList.slice(0, 10);
      let friendsOfFriendsCounts: Record<string, { user: any; count: number }> = {};
      
      try {
        const friendsOfFriendsLists = await Promise.all(
          sampleFollowing.map((u: any) => 
            apiClient.get(`/users/${u._id}/following`).catch(() => ({ data: [] }))
          )
        );
        
        friendsOfFriendsLists.forEach((response: any) => {
          const users = Array.isArray(response.data) ? response.data : [];
          users.forEach((u: any) => {
            if (!u?._id || followingIds.has(u._id) || u._id === user.id) return;
            if (!friendsOfFriendsCounts[u._id]) {
              friendsOfFriendsCounts[u._id] = { user: u, count: 0 };
            }
            friendsOfFriendsCounts[u._id].count += 1;
          });
        });
      } catch {}
      
      const friendsOfFriendsSorted = Object.values(friendsOfFriendsCounts)
        .sort((a, b) => b.count - a.count)
        .map(v => ({ ...v.user, _mutuals: v.count }));
      
      // Merge suggestions with weights
      const usersByIdMap = new Map<string, any>();
      const addToMap = (users: any[], weightKey: string) => {
        users.forEach(u => {
          const existing = usersByIdMap.get(u._id);
          const weight = (u._mutuals || 0) + (weightKey === 'follower' ? 0.5 : 0);
          if (!existing || (existing.__w || 0) < weight) {
            usersByIdMap.set(u._id, { ...u, __w: weight });
          }
        });
      };
      
      addToMap(friendsOfFriendsSorted, 'fof');
      addToMap(suggestedFollowers, 'follower');
      
      const mergedSuggestions = Array.from(usersByIdMap.values())
        .sort((a: any, b: any) => (b.__w || 0) - (a.__w || 0))
        .slice(0, 20);
      
      setSuggestions(mergedSuggestions);
    } catch (error) {
      console.error('Failed to load user connections:', error);
    }
  };

  // Load stories feed
  const loadStories = async () => {
    try {
      const response = await apiClient.get('/stories/feed');
      setStoryFeed(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load stories:', error);
    }
  };

  // Refresh stories after creation
  const refreshStories = async () => {
    try {
      const response = await apiClient.get('/stories/feed');
      setStoryFeed(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to refresh stories:', error);
    }
  };

  // Handle follow action
  const handleFollowUser = async (userId: string) => {
    try {
      await apiClient.post(`/users/${userId}/follow`);
      const followedUser = suggestions.find((s: any) => s._id === userId);
      if (followedUser) {
        setFollowing(prev => [...prev, followedUser]);
        setSuggestions(prev => prev.filter((s: any) => s._id !== userId));
      }
    } catch (error) {
      console.error('Failed to follow user:', error);
    }
  };

  // Handle story click
  const handleStoryClick = (authorId: string) => {
    setViewerAuthorId(authorId);
    setShowStoryViewer(true);
  };

  // Handle story viewer close
  const handleStoryViewerClose = (authorsViewed: string[]) => {
    setShowStoryViewer(false);
    setViewerAuthorId('');
    if (Array.isArray(authorsViewed) && authorsViewed.length) {
      setViewedStoryAuthors(prev => new Set([...Array.from(prev), ...authorsViewed]));
    }
  };

  // Close post dialog
  const closePostDialog = () => {
    setPostDialog({ open: false, post: null, comments: [] });
  };

  // Keyboard navigation inside dialog
  useEffect(()=>{
    if (!postDialog.open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closePostDialog(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const ids = mixedFeed.filter(i=> i.__kind==='post').map(i=> i._id);
        const idx = ids.findIndex(id=> id === postDialog.post?._id);
        if (idx !== -1) {
          const nextIdx = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
          const nextId = ids[nextIdx];
          if (nextId) openPostDialog(nextId);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return ()=> window.removeEventListener('keydown', handler);
  }, [postDialog.open, postDialog.post?._id, mixedFeed]);

  // Effects
  useEffect(() => {
    fetchPosts();
  }, [page]);

  useEffect(() => {
    loadUserConnections();
  }, [user?.id]);

  useEffect(() => {
    loadStories();
  }, [user?.id]);

  // Loading screen
  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-pink-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-purple-500 border-l-indigo-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 font-semibold animate-pulse">
            Loading your feed...
          </div>
        </div>
      </div>
    );
  }

  // Render stories tiles
  const renderStoryTiles = () => {
    const meHasStory = storyFeed.some((g: any) => String(g.author?._id || g.author) === String(user?.id));
    const meViewed = viewedStoryAuthors.has(String(user?.id));
    const tiles: JSX.Element[] = [];
    
    // User's own story tile
    tiles.push(
      <div key="me" className="flex flex-col items-center w-16 sm:w-20 shrink-0 group">
        <button 
          onClick={() => meHasStory ? handleStoryClick(String(user?.id)) : setShowCreateStory(true)} 
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
                <span className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-purple-600">
                  {meHasStory ? '👤' : '+'}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowCreateStory(true); }}
            aria-label="Add story"
            className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-md transition bg-gradient-to-br from-blue-600 to-purple-600"
          >
            <span className="text-white text-xs font-bold">+</span>
          </button>
        </button>
        <div className="mt-2 text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 truncate w-full text-center">
          {meHasStory ? 'Your story' : 'Add story'}
        </div>
      </div>
    );
    
    // Other users' stories
    storyFeed
      .filter((g: any) => String(g.author?._id || g.author) !== String(user?.id))
      .slice(0, 20)
      .forEach((g: any) => {
        const authorId = String(g.author?._id || g.author);
        const viewed = viewedStoryAuthors.has(authorId);
        
        tiles.push(
          <div key={authorId} className="flex flex-col items-center w-16 sm:w-20 shrink-0 group">
            <button 
              onClick={() => handleStoryClick(authorId)} 
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
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950/20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-6 xl:gap-8">
            
            {/* Center column (feed) */}
            <div className="lg:col-span-8 xl:col-span-7">
              
              {/* Stories Section */}
              <div className="mb-4 sm:mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 p-4 sm:p-5 overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-gradient-to-b from-pink-500 via-purple-500 to-blue-500 rounded-full"></div>
                  <h2 className="text-sm sm:text-base font-bold text-gray-800 dark:text-white">Stories</h2>
                </div>
                
                <div className="overflow-x-auto scrollbar-hide -mx-2 px-2">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-max pb-2">
                    {renderStoryTiles()}
                  </div>
                </div>
              </div>

              {/* Mixed feed: posts + reels */}
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
                  {mixedFeed.map((item:any)=> (
                    item.__kind==='post' ? (
                      <div key={`post-${item._id}`}>
                        {/* Header actions: follow near username handled by PostCard header if needed; keep dialog for details */}
                        <PostCard 
                          post={item.data} 
                          onDelete={(id) => setPosts(prev => prev.filter(p => p._id !== id))} 
                          onOpenDialog={(postId) => openPostDialog(postId)} 
                        />
                      </div>
                    ) : (
                      <div key={`reel-${item._id}`}>
                        <ReelFeedCard reel={item.data} />
                      </div>
                    )
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

            {/* Right sidebar: Suggestions */}
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
                      <div className="text-sm xl:text-base font-bold text-gray-900 dark:text-white truncate">
                        {user?.displayName}
                      </div>
                      <div className="text-xs xl:text-sm text-gray-500 dark:text-gray-400 truncate">
                        @{user?.username}
                      </div>
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
                      onClick={() => navigate('/suggestions')}
                    >
                      See All
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {suggestions.slice(0, 6).map((suggestion: any) => (
                      <div key={suggestion._id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative shrink-0">
                            <div className="w-11 h-11 xl:w-12 xl:h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 p-0.5 group-hover:from-blue-500 group-hover:to-purple-600 transition-all duration-300">
                              <img 
                                src={suggestion.profilePic || 'https://via.placeholder.com/48'} 
                                className="w-full h-full rounded-full object-cover" 
                                alt={suggestion.displayName}
                              />
                            </div>
                            {suggestion._mutuals > 0 && (
                              <span className="absolute -bottom-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg">
                                {suggestion._mutuals}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate transition-colors">
                              {suggestion.displayName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              @{suggestion.username}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleFollowUser(suggestion._id)} 
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

      {/* Post Dialog Modal */}
      {postDialog.open && postDialog.post && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3" 
          onClick={closePostDialog}
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 border border-gray-200 dark:border-gray-800" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Media */}
            <div className="bg-black flex items-center justify-center max-h-[85vh]">
              {postDialog.post.media?.[0]?.type === 'video' ? (
                <video 
                  src={postDialog.post.media?.[0]?.url} 
                  poster={postDialog.post.media?.[0]?.thumbnail} 
                  controls 
                  className="w-full h-full max-h-[85vh] object-contain" 
                />
              ) : (
                <img 
                  src={postDialog.post.media?.[0]?.url} 
                  className="w-full h-full max-h-[85vh] object-contain" 
                  alt="Post media"
                />
              )}
            </div>
            
            {/* Right: Comments */}
            <div className="flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
                <img 
                  src={postDialog.post.authorId?.profilePic || 'https://via.placeholder.com/36'} 
                  className="w-8 h-8 rounded-full" 
                  alt={postDialog.post.authorId?.username}
                />
                <div className="font-semibold text-gray-900 dark:text-white">
                  {postDialog.post.authorId?.username}
                </div>
                {/* Follow button near username */}
                {postDialog.post.authorId?._id && (
                  <FollowButton targetId={postDialog.post.authorId._id} compact />
                )}
                <div className="ml-auto flex items-center gap-3 text-gray-600 dark:text-gray-300">
                  {/* More menu with Add to favourites */}
                  <div className="relative">
                    <button aria-label="More" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    {/* simple menu */}
                    <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg hidden group-hover:block">
                      <button onClick={toggleBookmark} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">Add to favourites</button>
                    </div>
                  </div>
                  <button 
                    className="flex items-center gap-1" 
                    onClick={toggleLikePost}
                    aria-label="Like post"
                  >
                    <Heart className={`w-5 h-5 ${postLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    <span>{postLikes}</span>
                  </button>
                  <button 
                    className="flex items-center gap-1" 
                    onClick={() => dialogCommentRef.current?.focus()}
                    aria-label="Comment on post"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{postDialog.post.commentsCount || 0}</span>
                  </button>
                  <button 
                    onClick={toggleBookmark}
                    aria-label="Bookmark post"
                  >
                    <Bookmark className={`w-5 h-5 ${postBookmarked ? 'fill-blue-500 text-blue-500' : ''}`} />
                  </button>
                </div>
              </div>
              
              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {postDialog.comments.map((comment: any) => (
                  <div key={comment._id} className="flex items-start gap-3">
                    <img 
                      src={comment.authorId?.profilePic || 'https://via.placeholder.com/32'} 
                      className="w-7 h-7 rounded-full" 
                      alt={comment.authorId?.username}
                    />
                    <div>
                      <div className="text-gray-900 dark:text-white">
                        <span className="font-semibold mr-2">{comment.authorId?.username}</span>
                        {comment.text}
                      </div>
                    </div>
                  </div>
                ))}
                {postDialog.comments.length === 0 && (
                  <div className="text-gray-500 dark:text-gray-400">No comments yet</div>
                )}
              </div>
              
              {/* Comment Input */}
              <form 
                onSubmit={handleAddPostComment} 
                className="p-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2"
              >
                <input 
                  ref={dialogCommentRef}
                  value={postComment} 
                  onChange={(e) => setPostComment(e.target.value)} 
                  placeholder="Add a comment..." 
                  className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
                <button 
                  type="submit" 
                  disabled={!postComment.trim()} 
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                >
                  Post
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Story Modal */}
      {showCreateStory && (
        <CreateStoryModal
          onClose={() => setShowCreateStory(false)}
          onCreated={() => { 
            refreshStories(); 
            setShowCreateStory(false); 
          }}
        />
      )}

      {/* Story Viewer Modal */}
      {showStoryViewer && viewerAuthorId && (
        <StoryViewerModal
          groups={storyFeed as any}
          startAuthorId={viewerAuthorId}
          onClose={handleStoryViewerClose}
        />
      )}
    </>
  );
};

export default Home;