import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Heart, MessageCircle, Bookmark, Share2, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import CreateReelModal from '../components/CreateReelModal';

const Reels = () => {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

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
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading reels...</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reels</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-pink-600 text-white hover:from-blue-700 hover:to-pink-700 transition"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Create</span>
        </button>
      </div>

      {reels.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">No reels available yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {reels.map((reel) => (
            <div key={reel._id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-4">
                <Link to={`/profile/${reel.authorId._id}`} className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {reel.authorId.profilePic ? (
                      <img
                        src={reel.authorId.profilePic}
                        alt={reel.authorId.displayName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      reel.authorId.displayName[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {reel.authorId.displayName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      @{reel.authorId.username}
                    </p>
                  </div>
                </Link>
                <FollowButton targetId={reel.authorId._id} />
              </div>

              <Link to={`/reel/${reel._id}`} className="block">
                <div className="relative bg-black aspect-[9/16]">
                  <video
                    src={reel.video.url}
                    poster={reel.video.thumbnail}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>
              </Link>

              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-4">
                    <button className="flex items-center space-x-1">
                      <Heart className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {reel.likesCount}
                      </span>
                    </button>
                    <button className="flex items-center space-x-1">
                      <MessageCircle className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {reel.commentsCount}
                      </span>
                    </button>
                  </div>
                  <button>
                    <Bookmark className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                  </button>
                </div>

                {reel.caption && (
                  <p className="text-gray-900 dark:text-white">
                    <span className="font-semibold mr-2">{reel.authorId.username}</span>
                    {reel.caption}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {showCreate && (
        <CreateReelModal
          onClose={() => setShowCreate(false)}
          onReelCreated={(reel) => {
            setReels((prev) => [reel, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
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
      } catch { setFollowing(false); }
    };
    load();
  }, [targetId]);
  const toggle = async () => {
    if (following===null || loading) return;
    setLoading(true);
    try {
      if (!following) await apiClient.post(`/users/${targetId}/follow`); else await apiClient.delete(`/users/${targetId}/follow`);
      setFollowing(!following);
    } catch {} finally { setLoading(false); }
  };
  if (following===null) return <div className="w-20 h-8"/>;
  return (
    <button onClick={toggle} disabled={loading} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${following? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200':'bg-blue-600 text-white'}`}>
      {loading ? '...' : following? 'Unfollow' : 'Follow'}
    </button>
  );
};

export default Reels;
