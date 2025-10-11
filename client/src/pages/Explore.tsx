import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import apiClient from '../api/client';
import { Link } from 'react-router-dom';
import FollowButton from '../components/FollowButton';

const Explore = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const mixed = React.useMemo(()=>{
    const a = (posts||[]).map((p:any)=> ({
      __kind: 'post',
      _id: p._id,
      thumb: p?.media?.[0]?.thumbnail || p?.media?.[0]?.url,
      isVideo: (p?.media?.[0]?.type === 'video'),
      videoUrl: p?.media?.[0]?.type === 'video' ? p?.media?.[0]?.url : undefined,
      authorId: p?.authorId?._id || p?.authorId,
      likesCount: p.likesCount||0,
      commentsCount: p.commentsCount||0,
    }));
    const b = (reels||[]).map((r:any)=> ({
      __kind: 'reel',
      _id: r._id,
      thumb: r?.video?.thumbnail,
      isVideo: true,
      videoUrl: r?.video?.url,
      authorId: r?.authorId?._id || r?.authorId,
      likesCount: r.likesCount||0,
      commentsCount: r.commentsCount||0,
    }));
    const all = [...a, ...b];
    // simple shuffle
    for (let i=all.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [all[i], all[j]] = [all[j], all[i]]; }
    return all;
  }, [posts, reels]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const [p, r] = await Promise.all([
          apiClient.get('/posts/feed?page=1&random=true'),
          apiClient.get('/reels/feed?page=1&random=true'),
        ]);
        setPosts(p.data || []);
        setReels(r.data || []);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await apiClient.get(`/users/search/${query}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-10">
        {/* Search Section */}
        <div className="mb-8 sm:mb-12">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-0 group-hover:opacity-75 transition duration-500 dark:opacity-0 dark:group-hover:opacity-50"></div>
            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
              />
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 sm:mt-6 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95 animate-in fade-in slide-in-from-top-2 duration-300">
              {searchResults.map((user, index) => (
                <Link
                  key={user._id}
                  to={`/profile/${user._id}`}
                  className={`flex items-center space-x-3 p-3 sm:p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-slate-700 dark:hover:to-slate-700 transition-all duration-300 group/item ${
                    index !== searchResults.length - 1 ? 'border-b border-gray-100 dark:border-slate-700' : ''
                  }`}
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-md group-hover/item:shadow-lg group-hover/item:scale-110 transition-transform duration-300 flex-shrink-0">
                    {user.profilePic ? (
                      <img
                        src={user.profilePic}
                        alt={user.displayName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      user.displayName[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900 dark:text-white truncate group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">
                        {user.displayName}
                      </span>
                      {user.verified && (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Mixed Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16 sm:py-20">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-gray-200 dark:border-slate-700"></div>
              <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-transparent border-t-blue-500 border-r-purple-500 animate-spin"></div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 sm:gap-2 lg:gap-3">
            {mixed.map((it:any, index:number)=> (
              <Link
                key={`${it.__kind}-${it._id}`}
                to={it.__kind==='post' ? `/post/${it._id}` : `/reel/${it._id}`}
                className={`relative group ${it.__kind==='reel' || it.isVideo? 'aspect-[9/16]':'aspect-square'} bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-800 rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-500 ring-2 ring-gray-300 dark:ring-slate-700 ring-opacity-0 hover:ring-opacity-100 group-hover:scale-105 transform`}
                style={{ animationDelay: `${index*40}ms` }}
              >
                {/* Thumb */}
                <img src={it.thumb || 'https://via.placeholder.com/400x400'} alt="Explore item" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                {/* Hover autoplay for videos */}
                {it.isVideo && it.videoUrl && (
                  <video
                    src={it.videoUrl}
                    className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    muted
                    loop
                    playsInline
                    onMouseEnter={(e)=>{ const v=e.currentTarget; try{v.play();}catch{}}}
                    onMouseLeave={(e)=>{ const v=e.currentTarget; try{v.pause(); v.currentTime=0;}catch{}}}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {it.isVideo && (
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">Video</div>
                )}
                <div className="absolute bottom-2 left-2 text-white text-xs sm:text-sm bg-black/40 px-2 py-1 rounded-md flex items-center gap-2">
                  <span>❤ {it.likesCount||0}</span>
                  <span>💬 {it.commentsCount||0}</span>
                </div>
                {/* Follow overlay */}
                {it.authorId && (
                  <div className="absolute top-2 left-2">
                    <FollowButton targetId={String(it.authorId)} compact />
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;