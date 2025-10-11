import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import PostCard from '../components/PostCard';
import { Bookmark, Grid3x3, Film, Sparkles } from 'lucide-react';

const Saved = () => {
  const [bookmarks, setBookmarks] = useState<{ posts: any[]; reels: any[] }>({
    posts: [],
    reels: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'reels'>('all');
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('saved:favorites');
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch { return new Set<string>(); }
  });

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const response = await apiClient.get('/bookmarks');
        setBookmarks(response.data);
      } catch (error) {
        console.error('Failed to fetch bookmarks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarks();
  }, []);

  // persist favorites
  useEffect(() => {
    try { localStorage.setItem('saved:favorites', JSON.stringify(Array.from(favorites))); } catch {}
  }, [favorites]);

  const favKey = (type: 'post' | 'reel', id: string) => `${type}:${id}`;
  const isFav = (type: 'post' | 'reel', id: string) => favorites.has(favKey(type, id));
  const toggleFav = (type: 'post' | 'reel', id: string) => {
    setFavorites(prev => {
      const k = favKey(type, id);
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const handleDeletePost = (postId: string) => {
    setBookmarks(prev => ({
      ...prev,
      posts: prev.posts.filter(p => p._id !== postId)
    }));
  };

  const filteredContent = () => {
    if (activeTab === 'posts') return bookmarks.posts;
    if (activeTab === 'reels') return bookmarks.reels;
    return [...bookmarks.posts, ...bookmarks.reels];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/20">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 border-r-pink-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-blue-500 border-l-indigo-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 font-semibold animate-pulse">
            Loading saved items...
          </div>
        </div>
      </div>
    );
  }

  const totalCount = bookmarks.posts.length + bookmarks.reels.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/20">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        
        {/* Header Section - Enhanced */}
        <div className="mb-6 sm:mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl shadow-gray-200/50 dark:shadow-black/30 p-6 sm:p-8">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
            
            {/* Content */}
            <div className="relative flex items-center gap-4 mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-0.5 shadow-xl shadow-purple-500/30">
                <div className="w-full h-full rounded-[14px] bg-white dark:bg-gray-900 flex items-center justify-center">
                  <Bookmark className="w-7 h-7 sm:w-8 sm:h-8 text-transparent bg-clip-text fill-current bg-gradient-to-br from-purple-600 to-pink-600" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white mb-1">
                  Saved Collection
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Your bookmarked posts and reels
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="relative flex flex-wrap gap-3 sm:gap-4">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border border-purple-200/50 dark:border-purple-700/50">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <div className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">{totalCount}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Total Saved</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 border border-blue-200/50 dark:border-blue-700/50">
                <Grid3x3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <div className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">{bookmarks.posts.length}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Posts</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500/10 to-red-500/10 dark:from-pink-500/20 dark:to-red-500/20 border border-pink-200/50 dark:border-pink-700/50">
                <Film className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                <div>
                  <div className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">{bookmarks.reels.length}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Reels</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs - Enhanced */}
        <div className="mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm sm:text-base transition-all duration-300 ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white shadow-lg shadow-purple-500/30'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm sm:text-base transition-all duration-300 ${
                activeTab === 'posts'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className="hidden sm:inline">Posts</span>
              <span className="sm:hidden">Posts</span> ({bookmarks.posts.length})
            </button>
            <button
              onClick={() => setActiveTab('reels')}
              className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm sm:text-base transition-all duration-300 ${
                activeTab === 'reels'
                  ? 'bg-gradient-to-r from-pink-600 to-red-600 text-white shadow-lg shadow-pink-500/30'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className="hidden sm:inline">Reels</span>
              <span className="sm:hidden">Reels</span> ({bookmarks.reels.length})
            </button>
          </div>
        </div>

        {/* Content Area */}
        {totalCount === 0 ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-12 sm:p-16 lg:p-20 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
            
            {/* Empty state */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full flex items-center justify-center shadow-xl">
                <Bookmark className="w-12 h-12 sm:w-14 sm:h-14 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-3">
                No Saved Items Yet
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                Start bookmarking your favorite posts and reels to access them anytime!
              </p>
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border border-purple-200/50 dark:border-purple-700/50 text-sm text-gray-700 dark:text-gray-300">
                <Sparkles className="w-4 h-4" />
                Tip: Tap the bookmark icon on any post to save it
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {filteredContent().length === 0 ? (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-lg p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                  {activeTab === 'posts' ? (
                    <Grid3x3 className="w-10 h-10 text-gray-400" />
                  ) : (
                    <Film className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <p className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  No {activeTab === 'posts' ? 'posts' : 'reels'} saved
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {activeTab === 'posts' 
                    ? 'Bookmark some posts to see them here'
                    : 'Bookmark some reels to see them here'
                  }
                </p>
              </div>
            ) : (
              <>
                {activeTab === 'reels' || activeTab === 'all' && bookmarks.reels.length > 0 ? (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-6 bg-gradient-to-b from-pink-500 to-red-500 rounded-full"></div>
                      <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">Saved Reels</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {bookmarks.reels.map((reel: any) => {
                        const fav = isFav('reel', reel._id);
                        return (
                          <button
                            type="button"
                            onClick={() => toggleFav('reel', reel._id)}
                            key={reel._id}
                            className={`group relative aspect-[9/16] rounded-2xl overflow-hidden bg-black shadow-lg transition-all duration-300 hover:scale-105 ${fav ? 'ring-2 ring-purple-500' : 'hover:shadow-2xl'}`}
                            aria-pressed={fav}
                            title={fav ? 'Favorited' : 'Add to favorites'}
                          >
                            <img
                              src={reel.video?.thumbnail || 'https://via.placeholder.com/240x426?text=Reel'}
                              className="w-full h-full object-cover"
                              alt="Reel thumbnail"
                            />
                            <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 ${fav ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'}`}></div>
                            <div className="absolute bottom-2 left-2 right-2">
                              <div className="flex items-center gap-2 text-white text-xs sm:text-sm">
                                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 fill-current" viewBox="0 0 24 24">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                  </svg>
                                  <span className="font-bold">{reel.likesCount || 0}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {(activeTab === 'posts' || activeTab === 'all') && bookmarks.posts.length > 0 ? (
                  <div>
                    {activeTab === 'all' && bookmarks.reels.length > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                        <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">Saved Posts</h2>
                      </div>
                    )}
                    <div className="space-y-4 sm:space-y-6">
                      {bookmarks.posts.map((post) => {
                        const fav = isFav('post', post._id);
                        return (
                          <div
                            key={post._id}
                            onClick={() => toggleFav('post', post._id)}
                            className={`rounded-2xl transition-colors duration-300 ${fav ? 'bg-black/5 dark:bg-white/5 ring-2 ring-purple-500' : ''}`}
                            title={fav ? 'Favorited' : 'Add to favorites'}
                          >
                            <PostCard 
                              post={post}
                              onDelete={handleDeletePost}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Saved;