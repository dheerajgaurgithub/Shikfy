import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Heart, MessageCircle, Bookmark, Share2, PlusCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import CreateReelModal from '../components/CreateReelModal';

// Share helper with clipboard fallback
const shareReel = async (url: string, text?: string) => {
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Check out this reel', text, url });
      return;
    }
  } catch {}
  try {
    await navigator.clipboard.writeText(url);
    window.alert('Link copied to clipboard');
  } catch {
    window.prompt('Copy this link', url);
  }
};

// Bookmark (Save) button for a reel
const BookmarkButton: React.FC<{ reelId: string }> = ({ reelId }) => {
  const [bookmarked, setBookmarked] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await apiClient.get(`/reels/${reelId}/bookmark-status`);
        if (mounted) setBookmarked(!!r.data?.bookmarked);
      } catch {
        if (mounted) setBookmarked(false);
      }
    })();
    return () => { mounted = false; };
  }, [reelId]);

  const toggle = async () => {
    if (bookmarked === null || loading) return;
    setLoading(true);
    try {
      if (!bookmarked) {
        await apiClient.post(`/reels/${reelId}/bookmark`);
      } else {
        await apiClient.delete(`/reels/${reelId}/bookmark`);
      }
      setBookmarked(!bookmarked);
    } catch {
      // no-op: keep previous state on error
    } finally {
      setLoading(false);
    }
  };

  const active = bookmarked === true;

  return (
    <button
      onClick={toggle}
      disabled={loading || bookmarked === null}
      aria-label={active ? 'Remove from favourites' : 'Add to favourites'}
      className={`group/bookmark w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
        active
          ? 'bg-gradient-to-r from-pink-500 to-purple-500'
          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gradient-to-r hover:from-pink-500 hover:to-purple-500'
      }`}
      title={active ? 'Remove from favourites' : 'Add to favourites'}
    >
      <Bookmark
        className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${
          active ? 'text-white' : 'text-gray-600 dark:text-gray-300 group-hover/bookmark:text-white'
        }`}
        fill={active ? 'currentColor' : 'none'}
      />
    </button>
  );
};

// Local component to manage each reel video's play/pause behavior
const ReelVideo: React.FC<{ src: string; poster?: string }> = ({ src, poster }) => {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Try autoplay when mounted
    v.play().catch(() => {});
  }, []);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    // If paused, resume and unmute so music plays
    if (v.paused) {
      v.muted = false;
      v.play().catch(() => {});
      return;
    }
    // If playing but muted (autoplayed), unmute on first interaction
    if (v.muted) {
      v.muted = false;
      v.play().catch(() => {});
      return;
    }
    // Otherwise toggle pause
    v.pause();
  };

  return (
    <div className="block relative group/video mx-auto w-full max-w-[430px] sm:max-w-[460px]" onClick={toggle}>
      <div className="relative bg-black aspect-[9/16] overflow-hidden">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
};

const Reels = () => {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReels = async () => {
      try {
        const response = await apiClient.get('/reels/feed?random=true');
        setReels(response.data);
      } catch (error) {
        console.error('Failed to fetch reels:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReels();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 rounded-full border-4 border-gray-200 dark:border-gray-700 mx-auto"></div>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 rounded-full border-4 border-transparent border-t-pink-500 border-r-purple-500 border-b-blue-500 animate-spin"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl sm:text-3xl animate-pulse">🎬</div>
          </div>
          <p className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent animate-pulse">
            Loading amazing reels...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30 dark:opacity-10">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-pink-400/30 via-purple-400/30 to-blue-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-400/30 via-purple-400/30 to-pink-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                Reels
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 font-medium">
                Watch short, creative videos 🎥✨
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-2xl blur opacity-70 group-hover:opacity-100 transition duration-300 animate-pulse"></div>
              <div className="relative flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105">
                <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="hidden sm:inline text-sm sm:text-base">Create</span>
              </div>
            </button>
          </div>
        </div>

        {/* Reels Content */}
        {reels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 lg:py-32">
            <div className="text-6xl sm:text-7xl lg:text-8xl mb-4 sm:mb-6 animate-bounce">🎬</div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">No reels yet</h3>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
              Be the first to create an amazing reel!
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              Create Your First Reel
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 place-items-center gap-4 sm:gap-6 lg:gap-8">
            {reels.map((reel, index) => (
              <div 
                key={reel._id} 
                className="w-full max-w-[460px] sm:max-w-[500px] bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden border-2 border-white dark:border-gray-700 hover:shadow-2xl transition-all duration-500 hover:scale-105 animate-fadeInUp"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Author Header */}
                <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10">
                  <Link to={`/profile/${reel.authorId._id}`} className="flex items-center gap-3 group/author flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center text-white font-bold shadow-lg group-hover/author:shadow-xl group-hover/author:scale-110 transition-all duration-300 overflow-hidden ring-2 ring-white dark:ring-gray-800">
                        {reel.authorId.profilePic ? (
                          <img
                            src={reel.authorId.profilePic}
                            alt={reel.authorId.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-base sm:text-lg">{reel.authorId.displayName[0].toUpperCase()}</span>
                        )}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate group-hover/author:text-purple-600 dark:group-hover/author:text-purple-400 transition-colors">
                        {reel.authorId.displayName}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                        @{reel.authorId.username}
                      </p>
                    </div>
                  </Link>
                  <FollowButton targetId={reel.authorId._id} />
                </div>

                {/* Video Container: click toggles play/pause, no navigation */}
                <ReelVideo src={reel.video.url} poster={reel.video.thumbnail} />

                {/* Interactions */}
                <div className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <button className="group/like flex items-center gap-1.5 sm:gap-2 hover:scale-110 transition-transform">
                        <div className="relative">
                          <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-gray-600 dark:text-gray-300 group-hover/like:text-red-500 transition-colors" />
                          <div className="absolute inset-0 bg-red-500 rounded-full blur opacity-0 group-hover/like:opacity-50 transition-opacity"></div>
                        </div>
                        <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                          {reel.likesCount}
                        </span>
                      </button>
                      <button onClick={() => navigate(`/reel/${reel._id}`)} className="group/comment flex items-center gap-1.5 sm:gap-2 hover:scale-110 transition-transform">
                        <div className="relative">
                          <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-gray-600 dark:text-gray-300 group-hover/comment:text-blue-500 transition-colors" />
                          <div className="absolute inset-0 bg-blue-500 rounded-full blur opacity-0 group-hover/comment:opacity-50 transition-opacity"></div>
                        </div>
                        <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                          {reel.commentsCount}
                        </span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookmarkButton reelId={reel._id} />
                      <button
                        onClick={() => shareReel(`${window.location.origin}/reel/${reel._id}`, reel.caption)}
                        aria-label="Share reel"
                        className="group/share w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gradient-to-r hover:from-blue-500 hover:to-cyan-500 transition-all hover:scale-110"
                      >
                        <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-300 group-hover/share:text-white transition-colors" />
                      </button>
                    </div>
                  </div>

                  {/* Caption */}
                  {reel.caption && (
                    <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-blue-900/20 rounded-xl p-3 border border-purple-200 dark:border-purple-800">
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white">
                        <Link to={`/profile/${reel.authorId._id}`} className="font-bold hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                          {reel.authorId.username}
                        </Link>
                        <span className="ml-2">{reel.caption}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Decorative Bottom Border */}
                <div className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500"></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateReelModal
          onClose={() => setShowCreate(false)}
          onReelCreated={(reel) => {
            setReels((prev) => [reel, ...prev]);
            setShowCreate(false);
          }}
        />
      )}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

const FollowButton = ({ targetId }: { targetId: string }) => {
  const [following, setFollowing] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  
  React.useEffect(() => {
    const load = async () => {
      try {
        const r = await apiClient.get(`/users/${targetId}/following-status`);
        setFollowing(!!r.data?.following);
      } catch { 
        setFollowing(false); 
      }
    };
    load();
  }, [targetId]);
  
  const toggle = async () => {
    if (following === null || loading) return;
    setLoading(true);
    try {
      if (!following) {
        await apiClient.post(`/users/${targetId}/follow`);
      } else {
        await apiClient.delete(`/users/${targetId}/follow`);
      }
      setFollowing(!following);
    } catch {} 
    finally { 
      setLoading(false); 
    }
  };
  
  if (following === null) return <div className="w-16 sm:w-20 h-8 sm:h-9 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse"/>;
  
  return (
    <button 
      onClick={toggle} 
      disabled={loading} 
      className={`relative group/btn px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all hover:scale-105 shadow-md hover:shadow-lg ${
        following 
          ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600' 
          : 'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-700 hover:to-purple-700'
      }`}
    >
      {!following && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur opacity-50 group-hover/btn:opacity-75 transition-opacity"></div>
      )}
      <span className="relative">
        {loading ? (
          <span className="inline-flex items-center gap-1">
            <span className="w-1 h-1 bg-current rounded-full animate-bounce"></span>
            <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
            <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
          </span>
        ) : following ? (
          'Following'
        ) : (
          '+ Follow'
        )}
      </span>
    </button>
  );
};

export default Reels;