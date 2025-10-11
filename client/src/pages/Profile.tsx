import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, Grid, Bookmark as BookmarkIcon, Film, AtSign, MessageCircle } from 'lucide-react';
import EditProfileModal from '../components/EditProfileModal';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';

interface UserProfile {
  _id: string;
  username: string;
  displayName: string;
  bio?: string;
  profilePic?: string;
  verified: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  privacySettings?: {
    profileVisibility?: 'public' | 'private';
    showFollowersList?: boolean;
    showFollowingList?: boolean;
  };
}

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [mentionsPosts, setMentionsPosts] = useState<any[]>([]);
  const [mentionsReels, setMentionsReels] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [savedReels, setSavedReels] = useState<any[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts'|'reels'|'mentions'|'saved'>('posts');
  const [showEdit, setShowEdit] = useState(false);
  const [hasActiveStory, setHasActiveStory] = useState(false);
  const [showCover, setShowCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) { setLoading(false); return; }
      try {
        const userRes = await apiClient.get(`/users/${id}`);
        const u = (userRes as any)?.data || null;
        setUser(u as any);

        const postsRes = await apiClient.get(`/users/${id}/posts`);
        const p = (postsRes as any)?.data;
        const postsList = Array.isArray(p) ? p : Array.isArray(p?.posts) ? p.posts : [];
        setPosts(postsList);

        if (!isOwnProfile) {
          const statusRes = await apiClient.get(`/users/${id}/following-status`);
          const statusData = (statusRes as any)?.data || {};
          setFollowing(!!statusData.following);
        }

        try {
          const s = await apiClient.get(`/stories/user/${id}`);
          const storiesData = (s as any)?.data || [];
          setHasActiveStory(Array.isArray(storiesData) && storiesData.length > 0);
        } catch {}
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, isOwnProfile]);

  useEffect(() => {
    const fetchTab = async () => {
      if (!id) return;
      try {
        if (activeTab === 'reels') {
          const r = await apiClient.get(`/users/${id}/reels`);
          const list = (r as any)?.data;
          const reelsList = Array.isArray(list) ? list : Array.isArray(list?.reels) ? list.reels : [];
          setReels(reelsList);
        } else if (activeTab === 'mentions') {
          const m = await apiClient.get(`/users/${id}/mentions`);
          const md = (m as any)?.data || {};
          setMentionsPosts(Array.isArray(md.posts) ? md.posts : []);
          setMentionsReels(Array.isArray(md.reels) ? md.reels : []);
        } else if (activeTab === 'saved' && isOwnProfile) {
          const b = await apiClient.get('/bookmarks');
          const bd = (b as any)?.data || {};
          setSavedPosts(Array.isArray(bd.posts) ? bd.posts : []);
          setSavedReels(Array.isArray(bd.reels) ? bd.reels : []);
        }
      } catch (e) {
        console.error('Failed to fetch tab data:', e);
      }
    };
    fetchTab();
  }, [activeTab, id, isOwnProfile]);

  const handleFollow = async () => {
    try {
      const optimisticFollowing = !following;
      const optimisticCount = user!.followersCount + (optimisticFollowing ? 1 : -1);

      setFollowing(optimisticFollowing);
      setUser(prev => prev ? { ...prev, followersCount: optimisticCount } : null);

      if (optimisticFollowing) {
        await apiClient.post(`/users/${id}/follow`);
      } else {
        await apiClient.delete(`/users/${id}/follow`);
      }
    } catch (error) {
      setFollowing(!following);
      setUser(prev => prev ? { ...prev, followersCount: prev.followersCount + (following ? 1 : -1) } : null);
      console.error('Failed to toggle follow:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-600 dark:text-gray-300 font-medium">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="text-center space-y-4">
          <div className="text-6xl">😔</div>
          <div className="text-gray-600 dark:text-gray-300 text-lg font-medium">User not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Enhanced Profile Card with Glassmorphism */}
        <div className="relative rounded-3xl overflow-hidden backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-200/50 dark:shadow-black/20 mb-8 transition-all duration-300 hover:shadow-3xl">
          
          {/* Cover Image Section */}
          <div className="relative overflow-visible">
            <div 
              className="w-full h-48 sm:h-56 md:h-64 lg:h-72 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative group cursor-pointer transition-transform duration-500 hover:scale-105" 
              onClick={()=>{ if ((user as any)?.bannerUrl) setShowCover(true); }}
            >
              {(user as any)?.bannerUrl ? (
                <img src={(user as any).bannerUrl} alt="cover" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-80"></div>
              )}
              
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30"></div>
              
              {isOwnProfile && (
                <button 
                  onClick={(e)=>{ e.stopPropagation(); fileInputRef.current?.click(); }} 
                  className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-full backdrop-blur-md bg-black/50 hover:bg-black/70 text-white border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Change Cover
                </button>
              )}
            </div>
            
            {/* Profile Picture with Story Ring */}
            <div className="absolute -bottom-12 sm:-bottom-14 md:-bottom-16 left-4 sm:left-6 md:left-8">
              <div className={`w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full ${hasActiveStory ? 'p-[3px] bg-gradient-to-tr from-pink-500 via-purple-500 to-yellow-400 animate-pulse' : ''} border-4 sm:border-[5px] border-white dark:border-gray-900 shadow-2xl transition-transform duration-300 hover:scale-105`}>
                <div className={`w-full h-full rounded-full ${hasActiveStory ? 'bg-white dark:bg-gray-900 p-[3px]' : 'bg-transparent'} overflow-hidden ring-2 ring-white/20`}> 
                  {user.profilePic ? (
                    <img src={user.profilePic} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
                      {user.displayName[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Profile Info Section */}
          <div className="pt-14 sm:pt-16 md:pt-20 px-4 sm:px-6 md:px-8 pb-6 sm:pb-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-start lg:justify-between gap-4 sm:gap-6">
              
              {/* Left Side - User Info */}
              <div className="flex-1 w-full lg:w-auto">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                      {user.username}
                    </h1>
                    {user.verified && (
                      <div className="relative group">
                        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500 drop-shadow-lg animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                        </svg>
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-black/80 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Verified</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 lg:gap-8 mb-5">
                  <div className="group">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">{user.postsCount}</span>
                      <span className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">Posts</span>
                    </div>
                  </div>
                  
                  {(user.privacySettings?.showFollowersList !== false) && (
                    <button 
                      onClick={()=> navigate(`/profile/${id}/followers`)} 
                      className="group hover:scale-105 transition-transform"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{user.followersCount}</span>
                        <span className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Followers</span>
                      </div>
                    </button>
                  )}
                  
                  {(user.privacySettings?.showFollowingList !== false) && (
                    <button 
                      onClick={()=> navigate(`/profile/${id}/following`)} 
                      className="group hover:scale-105 transition-transform"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{user.followingCount}</span>
                        <span className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Following</span>
                      </div>
                    </button>
                  )}
                </div>

                {/* Display Name and Bio */}
                <div className="space-y-2">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{user.displayName}</h2>
                  {user.bio && (
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">{user.bio}</p>
                  )}
                </div>
              </div>

              {/* Right Side - Action Buttons */}
              <div className="w-full lg:w-auto lg:mt-0">
                {isOwnProfile ? (
                  <button 
                    onClick={()=>setShowEdit(true)} 
                    className="w-full lg:w-auto px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-900 dark:text-white rounded-xl hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    <button
                      onClick={handleFollow}
                      className={`flex-1 sm:flex-initial px-6 sm:px-8 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                        following
                          ? 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-900 dark:text-white hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500'
                          : 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:from-blue-700 hover:via-purple-700 hover:to-pink-700'
                      }`}
                    >
                      {following ? 'Following' : 'Follow'}
                    </button>
                    <button 
                      onClick={async ()=>{
                        try { 
                          const res = await apiClient.post('/chats', { type: 'dm', memberIds: [id] }); 
                          navigate(`/chats?chatId=${res.data._id}`); 
                        } catch { 
                          alert('Failed to start chat'); 
                        }
                      }} 
                      className="flex-1 sm:flex-initial px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-900 dark:text-indigo-200 hover:from-indigo-200 hover:to-purple-200 dark:hover:from-indigo-800/40 dark:hover:to-purple-800/40 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>Message</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs Section */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl mb-6 overflow-hidden">
          <div className="flex justify-around sm:justify-center sm:space-x-2 md:space-x-8 px-2 sm:px-4">
            <button 
              onClick={()=>setActiveTab('posts')} 
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-6 py-4 font-bold text-xs sm:text-sm transition-all duration-300 relative ${
                activeTab==='posts'
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Grid className="w-4 h-4 sm:w-5 sm:h-5" /> 
              <span className="hidden sm:inline">POSTS</span>
              {activeTab==='posts' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-t-full"></div>
              )}
            </button>
            
            <button 
              onClick={()=>setActiveTab('reels')} 
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-6 py-4 font-bold text-xs sm:text-sm transition-all duration-300 relative ${
                activeTab==='reels'
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Film className="w-4 h-4 sm:w-5 sm:h-5" /> 
              <span className="hidden sm:inline">REELS</span>
              {activeTab==='reels' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-t-full"></div>
              )}
            </button>
            
            <button 
              onClick={()=>setActiveTab('mentions')} 
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-6 py-4 font-bold text-xs sm:text-sm transition-all duration-300 relative ${
                activeTab==='mentions'
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <AtSign className="w-4 h-4 sm:w-5 sm:h-5" /> 
              <span className="hidden sm:inline">MENTIONS</span>
              {activeTab==='mentions' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-t-full"></div>
              )}
            </button>
            
            {isOwnProfile && (
              <button 
                onClick={()=>setActiveTab('saved')} 
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-6 py-4 font-bold text-xs sm:text-sm transition-all duration-300 relative ${
                  activeTab==='saved'
                    ? 'text-gray-900 dark:text-white' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <BookmarkIcon className="w-4 h-4 sm:w-5 sm:h-5" /> 
                <span className="hidden sm:inline">SAVED</span>
                {activeTab==='saved' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-t-full"></div>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl p-3 sm:p-4 md:p-6">
          {activeTab==='posts' && (posts.length === 0 ? (
            <div className="text-center py-16 sm:py-24">
              <div className="text-5xl sm:text-6xl mb-4">📸</div>
              <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-medium">No posts yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
              {posts.map((post) => (
                <div
                  key={post._id}
                  className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg sm:rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-xl group relative"
                >
                  {post.media && post.media[0] && (
                    <img
                      src={post.media[0].thumbnail || post.media[0].url}
                      alt="Post"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              ))}
            </div>
          ))}

          {activeTab==='reels' && (
            reels.length === 0 ? (
              <div className="text-center py-16 sm:py-24">
                <div className="text-5xl sm:text-6xl mb-4">🎬</div>
                <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-medium">No reels yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
                {reels.map((reel)=> (
                  <div key={reel._id} className="aspect-[9/16] bg-black rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 group relative">
                    <video src={reel.video.url} poster={reel.video.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab==='mentions' && (
            (mentionsPosts.length + mentionsReels.length === 0) ? (
              <div className="text-center py-16 sm:py-24">
                <div className="text-5xl sm:text-6xl mb-4">@</div>
                <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-medium">No mentions yet</p>
              </div>
            ) : (
              <div className="space-y-8 sm:space-y-10">
                {mentionsPosts.length>0 && (
                  <div>
                    <h3 className="mb-3 sm:mb-4 text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Posts</h3>
                    <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
                      {mentionsPosts.map((p:any)=> (
                        <div key={p._id} className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 group relative">
                          {p.media?.[0] && <img src={p.media[0].thumbnail || p.media[0].url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {mentionsReels.length>0 && (
                  <div>
                    <h3 className="mb-3 sm:mb-4 text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Reels</h3>
                    <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
                      {mentionsReels.map((r:any)=> (
                        <div key={r._id} className="aspect-[9/16] bg-black rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 group relative">
                          <video src={r.video.url} poster={r.video.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {activeTab==='saved' && isOwnProfile && (
            (savedPosts.length + savedReels.length === 0) ? (
              <div className="text-center py-16 sm:py-24">
                <div className="text-5xl sm:text-6xl mb-4">🔖</div>
                <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-medium">No saved items yet</p>
              </div>
            ) : (
              <div className="space-y-8 sm:space-y-10">
                {savedPosts.length>0 && (
                  <div>
                    <h3 className="mb-3 sm:mb-4 text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                      <BookmarkIcon className="w-5 h-5 text-blue-600" />
                      Saved Posts
                    </h3>
                    <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
                      {savedPosts.map((p:any)=> (
                        <div key={p._id} className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 group relative">
                          {p.media?.[0] && <img src={p.media[0].thumbnail || p.media[0].url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {savedReels.length>0 && (
                  <div>
                    <h3 className="mb-3 sm:mb-4 text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                      <Film className="w-5 h-5 text-purple-600" />
                      Saved Reels
                    </h3>
                    <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
                      {savedReels.map((r:any)=> (
                        <div key={r._id} className="aspect-[9/16] bg-black rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 group relative">
                          <video src={r.video.url} poster={r.video.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Hidden file input for cover upload */}
      {isOwnProfile && (
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={async (e)=>{
            const f = e.target.files?.[0];
            if (!f || !id) return;
            const fd = new FormData();
            fd.append('banner', f);
            try {
              const res = await apiClient.post(`/users/${id}/banner`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
              const url = res.data?.bannerUrl || res.data?.url;
              if (url) setUser(prev=> prev ? { ...prev, bannerUrl: url } as any : prev);
            } catch (err) {
              console.error('Failed to upload cover', err);
              alert('Failed to upload cover');
            } finally {
              if (fileInputRef.current) fileInputRef.current.value = '';
            }
          }} 
        />
      )}

      {/* Enhanced Cover Preview Modal */}
      {showCover && (user as any)?.bannerUrl && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fadeIn" 
          onClick={()=> setShowCover(false)}
        >
          <button 
            className="absolute top-4 right-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-2xl font-bold transition-all duration-300 hover:scale-110 shadow-2xl"
            onClick={()=> setShowCover(false)}
          >
            ×
          </button>
          <img 
            src={(user as any).bannerUrl} 
            alt="cover" 
            className="w-full max-w-6xl h-auto object-contain rounded-2xl shadow-2xl animate-scaleIn" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {showEdit && user && (
        <EditProfileModal
          user={user}
          onClose={()=>setShowEdit(false)}
          onSaved={(u)=>{
            setUser(prev=> prev ? { ...prev, ...u } : u);
          }}
        />
      )}
    </div>
  );
};

export default Profile;