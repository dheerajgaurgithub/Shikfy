import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import apiClient from '../api/client';
import { Link } from 'react-router-dom';
import FollowButton from '../components/FollowButton';
import { useAuth } from '../contexts/AuthContext';

const Explore = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const { user } = useAuth();
  const mixed = React.useMemo(() => {
    const a = (posts || []).map((p: any) => ({
      __kind: 'post',
      _id: p._id,
      thumb: p?.media?.[0]?.thumbnail || p?.media?.[0]?.url,
      isVideo: (p?.media?.[0]?.type === 'video'),
      videoUrl: p?.media?.[0]?.type === 'video' ? p?.media?.[0]?.url : undefined,
      authorId: p?.authorId?._id || p?.authorId,
      likesCount: p.likesCount || 0,
      commentsCount: p.commentsCount || 0,
    }));
    const b = (reels || []).map((r: any) => ({
      __kind: 'reel',
      _id: r._id,
      thumb: r?.video?.thumbnail,
      isVideo: true,
      videoUrl: r?.video?.url,
      authorId: r?.authorId?._id || r?.authorId,
      likesCount: r.likesCount || 0,
      commentsCount: r.commentsCount || 0,
    }));
    const all = [...a, ...b];
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30 dark:opacity-10">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-pink-400/30 via-purple-400/30 to-blue-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-400/30 via-purple-400/30 to-pink-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-center mb-2 sm:mb-3 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent animate-gradient">
            Explore
          </h1>
          <p className="text-center text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-300 font-medium">
            Discover amazing content from creators worldwide ✨
          </p>
          {/* Counts Bar (Total removed) */}
          {!loading && (
            <div className="mt-4 flex items-center justify-center gap-3 sm:gap-4">
              <span className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                Posts: {posts.length}
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                Reels: {reels.length}
              </span>
            </div>
          )}
        </div>

        {/* Search Section */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <div className="relative group max-w-2xl mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-2xl sm:rounded-3xl blur-lg opacity-30 group-hover:opacity-60 group-focus-within:opacity-70 transition duration-500 animate-pulse"></div>
            <div className="relative">
              <div className="absolute left-4 sm:left-5 top-1/2 transform -translate-y-1/2 text-purple-500 dark:text-purple-400">
                <Search className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search for amazing people..."
                className="w-full pl-12 sm:pl-14 pr-4 sm:pr-6 py-3 sm:py-4 lg:py-5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-2 border-white dark:border-gray-700 rounded-2xl sm:rounded-3xl focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-600 focus:border-purple-400 dark:focus:border-purple-500 text-sm sm:text-base lg:text-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-300 shadow-xl hover:shadow-2xl focus:shadow-2xl font-medium"
              />
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 sm:mt-6 max-w-2xl mx-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-purple-200 dark:border-purple-700 overflow-hidden animate-slideDown">
              <div className="p-3 sm:p-4 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500">
                <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-xl sm:text-2xl">🔍</span>
                  Found {searchResults.length} {searchResults.length === 1 ? 'person' : 'people'}
                </h3>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {searchResults.map((user, index) => (
                  <Link
                    key={user._id}
                    to={`/profile/${user._id}`}
                    className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 lg:p-5 hover:bg-gradient-to-r hover:from-pink-50 hover:via-purple-50 hover:to-blue-50 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30 transition-all duration-300 group/item ${
                      index !== searchResults.length - 1 ? 'border-b-2 border-gray-100 dark:border-gray-700' : ''
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center text-white font-bold shadow-lg group-hover/item:shadow-2xl group-hover/item:scale-110 transition-all duration-300 overflow-hidden ring-4 ring-white dark:ring-gray-800">
                        {user.profilePic ? (
                          <img
                            src={user.profilePic}
                            alt={user.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg sm:text-xl lg:text-2xl">{user.displayName[0].toUpperCase()}</span>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm sm:text-base lg:text-lg text-gray-900 dark:text-white truncate group-hover/item:text-purple-600 dark:group-hover/item:text-purple-400 transition-colors">
                          {user.displayName}
                        </span>
                        {user.verified && (
                          <div className="flex-shrink-0 relative">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-500 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                            </svg>
                            <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75"></div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400 truncate font-medium">@{user.username}</p>
                    </div>
                    <div className="flex-shrink-0 text-purple-600 dark:text-purple-400 group-hover/item:translate-x-1 transition-transform duration-300">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 lg:py-32">
            <div className="relative mb-6 sm:mb-8">
              <div className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
              <div className="absolute top-0 left-0 h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 rounded-full border-4 border-transparent border-t-pink-500 border-r-purple-500 border-b-blue-500 animate-spin"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl sm:text-3xl animate-pulse">✨</div>
            </div>
            <p className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent animate-pulse">
              Loading amazing content...
            </p>
          </div>
        ) : mixed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 lg:py-32">
            <div className="text-6xl sm:text-7xl lg:text-8xl mb-4 sm:mb-6 animate-bounce">🎨</div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">No content yet</h3>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400 text-center max-w-md">
              Be the first to create something amazing!
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="text-2xl sm:text-3xl">🎭</span>
                Discover
              </h2>
              {/* Total items badge removed */}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
              {mixed.map((it: any, index: number) => (
                <Link
                  key={`${it.__kind}-${it._id}`}
                  to={it.__kind === 'post' ? `/post/${it._id}` : `/reel/${it._id}`}
                  className={`relative group ${it.__kind === 'reel' || it.isVideo ? 'aspect-[9/16]' : 'aspect-square'} bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 ring-2 ring-purple-300 dark:ring-purple-700 ring-opacity-0 hover:ring-opacity-100 hover:scale-105 transform animate-fadeInUp`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {/* Thumbnail */}
                  <img 
                    src={it.thumb || 'https://via.placeholder.com/400x400'} 
                    alt="Content" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-125" 
                  />
                  
                  {/* Video Preview on Hover */}
                  {it.isVideo && it.videoUrl && (
                    <video
                      src={it.videoUrl}
                      className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      muted
                      loop
                      playsInline
                      onMouseEnter={(e) => { const v = e.currentTarget; try { v.play(); } catch { } }}
                      onMouseLeave={(e) => { const v = e.currentTarget; try { v.pause(); v.currentTime = 0; } catch { } }}
                    />
                  )}
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                  
                  {/* Video Badge */}
                  {it.isVideo && (
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                      <span>▶</span>
                      <span className="hidden sm:inline">Video</span>
                    </div>
                  )}
                  
                  {/* Stats */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="flex items-center gap-1 bg-red-500/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-lg">
                          <span>❤️</span>
                          <span>{it.likesCount || 0}</span>
                        </span>
                        <span className="flex items-center gap-1 bg-blue-500/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-lg">
                          <span>💬</span>
                          <span>{it.commentsCount || 0}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Follow Button Overlay */}
                  {it.authorId && String(it.authorId) !== String(user?.id) && (
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform scale-90 group-hover:scale-100">
                      <FollowButton targetId={String(it.authorId)} compact />
                    </div>
                  )}
                  
                  {/* Sparkle Effect */}
                  <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute top-1/4 left-1/4 text-yellow-300 text-lg sm:text-xl animate-ping">✨</div>
                    <div className="absolute top-3/4 right-1/4 text-pink-300 text-lg sm:text-xl animate-ping" style={{ animationDelay: '0.3s' }}>💫</div>
                    <div className="absolute top-1/2 right-1/3 text-purple-300 text-lg sm:text-xl animate-ping" style={{ animationDelay: '0.6s' }}>⭐</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.4s ease-out;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Explore;