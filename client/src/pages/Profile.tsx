import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, Grid, Bookmark as BookmarkIcon, Film, AtSign } from 'lucide-react';
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
        setUser(userRes.data);

        // Always load posts initially
        const postsRes = await apiClient.get(`/users/${id}/posts`);
        setPosts(postsRes.data);

        if (!isOwnProfile) {
          const statusRes = await apiClient.get(`/users/${id}/following-status`);
          setFollowing(statusRes.data.following);
        }
        // Check active stories
        try {
          const s = await apiClient.get(`/stories/user/${id}`);
          setHasActiveStory(Array.isArray(s.data) && s.data.length > 0);
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
          setReels(r.data);
        } else if (activeTab === 'mentions') {
          const m = await apiClient.get(`/users/${id}/mentions`);
          setMentionsPosts(m.data.posts || []);
          setMentionsReels(m.data.reels || []);
        } else if (activeTab === 'saved' && isOwnProfile) {
          const b = await apiClient.get('/bookmarks');
          setSavedPosts(b.data.posts || []);
          setSavedReels(b.data.reels || []);
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">User not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Banner / Cover */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow">
        <div className="relative">
          <div className="w-full h-40 md:h-56 bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800 relative group cursor-pointer" onClick={()=>{ if ((user as any)?.bannerUrl) setShowCover(true); }}>
            {(user as any)?.bannerUrl ? (
              <img src={(user as any).bannerUrl} alt="cover" className="w-full h-full object-cover" />
            ) : null}
            {isOwnProfile && (
              <button onClick={(e)=>{ e.stopPropagation(); fileInputRef.current?.click(); }} className="absolute bottom-2 right-2 px-3 py-1.5 text-xs rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition">Change cover</button>
            )}
          </div>
          <div className={`absolute -bottom-10 left-6 w-24 h-24 rounded-full ${hasActiveStory ? 'p-[2px] bg-gradient-to-tr from-pink-500 to-yellow-400' : ''} border-4 border-white dark:border-gray-800`}>
            <div className={`w-full h-full rounded-full ${hasActiveStory ? 'bg-white dark:bg-gray-800 p-[2px]' : 'bg-transparent'} overflow-hidden`}> 
              {user.profilePic ? (
                <img src={user.profilePic} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold bg-gradient-to-r from-blue-500 to-pink-500">
                  {user.displayName[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="pt-12 px-6 pb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start md:justify-between gap-4">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.username}</h1>
                {user.verified && (
                  <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
                )}
              </div>
            </div>
            {isOwnProfile ? (
              <button onClick={()=>setShowEdit(true)} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFollow}
                  className={`px-6 py-2 rounded-lg font-semibold transition ${
                    following
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      : 'bg-gradient-to-r from-blue-600 to-pink-600 text-white hover:from-blue-700 hover:to-pink-700'
                  }`}
                >
                  {following ? 'Following' : 'Follow'}
                </button>
                <button onClick={async ()=>{
                  try { const res = await apiClient.post('/chats', { type: 'dm', memberIds: [id] }); navigate(`/chats?chatId=${res.data._id}`); } catch { alert('Failed to start chat'); }
                }} className="px-6 py-2 rounded-lg font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">Message</button>
              </div>
            )}
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-center space-y-4 md:space-y-0 md:space-x-4 mb-4">
              <div className="flex items-center space-x-2"> 
                {user.verified && (
                  <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                  </svg>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 mb-4">
              <div className="flex items-baseline gap-2 text-gray-900 dark:text-white text-xl font-bold"><span>{user.postsCount}</span><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Posts</span></div>
              {(user.privacySettings?.showFollowersList !== false) && (
                <button onClick={()=> navigate(`/profile/${id}/followers`)} className="flex items-baseline gap-2 text-xl font-bold text-gray-900 dark:text-white">
                  <span>{user.followersCount}</span>
                  <span className="text-sm font-medium underline text-gray-500 dark:text-gray-400">Followers</span>
                </button>
              )}
              {(user.privacySettings?.showFollowingList !== false) && (
                <button onClick={()=> navigate(`/profile/${id}/following`)} className="flex items-baseline gap-2 text-xl font-bold text-gray-900 dark:text-white">
                  <span>{user.followingCount}</span>
                  <span className="text-sm font-medium underline text-gray-500 dark:text-gray-400">Following</span>
                </button>
              )}
            </div>

            <div>
              <h2 className="font-bold text-gray-900 dark:text-white mb-1">{user.displayName}</h2>
              {user.bio && (
                <p className="text-gray-600 dark:text-gray-400">{user.bio}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 mb-8 mt-6">
        <div className="flex justify-center space-x-8 py-4">
          <button onClick={()=>setActiveTab('posts')} className={`flex items-center space-x-2 font-semibold pt-4 -mt-[1px] ${activeTab==='posts'?'text-gray-900 dark:text-white border-t-2 border-gray-900 dark:border-white':'text-gray-500 dark:text-gray-400'}`}>
            <Grid className="w-5 h-5" /> <span>POSTS</span>
          </button>
          <button onClick={()=>setActiveTab('reels')} className={`flex items-center space-x-2 font-semibold pt-4 -mt-[1px] ${activeTab==='reels'?'text-gray-900 dark:text-white border-t-2 border-gray-900 dark:border-white':'text-gray-500 dark:text-gray-400'}`}>
            <Film className="w-5 h-5" /> <span>REELS</span>
          </button>
          <button onClick={()=>setActiveTab('mentions')} className={`flex items-center space-x-2 font-semibold pt-4 -mt-[1px] ${activeTab==='mentions'?'text-gray-900 dark:text-white border-t-2 border-gray-900 dark:border-white':'text-gray-500 dark:text-gray-400'}`}>
            <AtSign className="w-5 h-5" /> <span>MENTIONS</span>
          </button>
          {isOwnProfile && (
            <button onClick={()=>setActiveTab('saved')} className={`flex items-center space-x-2 font-semibold pt-4 -mt-[1px] ${activeTab==='saved'?'text-gray-900 dark:text-white border-t-2 border-gray-900 dark:border-white':'text-gray-500 dark:text-gray-400'}`}>
              <BookmarkIcon className="w-5 h-5" /> <span>FAVOURITES</span>
            </button>
          )}
        </div>
      </div>

      {activeTab==='posts' && (posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">No posts yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {posts.map((post) => (
            <div
              key={post._id}
              className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:opacity-75 transition"
            >
              {post.media && post.media[0] && (
                <img
                  src={post.media[0].thumbnail || post.media[0].url}
                  alt="Post"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
      ))}

      {activeTab==='reels' && (
        reels.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No reels yet</div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {reels.map((reel)=> (
              <div key={reel._id} className="aspect-[9/16] bg-black rounded-lg overflow-hidden">
                <video src={reel.video.url} poster={reel.video.thumbnail} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )
      )}

      {/* Hidden file input for cover upload */}
      {isOwnProfile && (
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e)=>{
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
        }} />
      )}

      {/* Cover preview modal */}
      {showCover && (user as any)?.bannerUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={()=> setShowCover(false)}>
          <img src={(user as any).bannerUrl} alt="cover" className="w-full max-w-6xl h-auto object-contain" />
        </div>
      )}

      {activeTab==='mentions' && (
        (mentionsPosts.length + mentionsReels.length === 0) ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No mentions yet</div>
        ) : (
          <div className="space-y-8">
            {mentionsPosts.length>0 && (
              <div>
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Posts</h3>
                <div className="grid grid-cols-3 gap-1">
                  {mentionsPosts.map((p:any)=> (
                    <div key={p._id} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                      {p.media?.[0] && <img src={p.media[0].thumbnail || p.media[0].url} className="w-full h-full object-cover" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {mentionsReels.length>0 && (
              <div>
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Reels</h3>
                <div className="grid grid-cols-3 gap-1">
                  {mentionsReels.map((r:any)=> (
                    <div key={r._id} className="aspect-[9/16] bg-black rounded-lg overflow-hidden">
                      <video src={r.video.url} poster={r.video.thumbnail} className="w-full h-full object-cover" />
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
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No favourites yet</div>
        ) : (
          <div className="space-y-8">
            {savedPosts.length>0 && (
              <div>
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Favourites · Posts</h3>
                <div className="grid grid-cols-3 gap-1">
                  {savedPosts.map((p:any)=> (
                    <div key={p._id} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                      {p.media?.[0] && <img src={p.media[0].thumbnail || p.media[0].url} className="w-full h-full object-cover" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {savedReels.length>0 && (
              <div>
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Favourites · Reels</h3>
                <div className="grid grid-cols-3 gap-1">
                  {savedReels.map((r:any)=> (
                    <div key={r._id} className="aspect-[9/16] bg-black rounded-lg overflow-hidden">
                      <video src={r.video.url} poster={r.video.thumbnail} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
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
