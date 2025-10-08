import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Settings, Grid, Bookmark as BookmarkIcon } from 'lucide-react';
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
}

const Profile = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = currentUser?._id === id;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [userRes, postsRes] = await Promise.all([
          apiClient.get(`/users/${id}`),
          apiClient.get(`/users/${id}/posts`)
        ]);

        setUser(userRes.data);
        setPosts(postsRes.data);

        if (!isOwnProfile) {
          const statusRes = await apiClient.get(`/users/${id}/following-status`);
          setFollowing(statusRes.data.following);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, isOwnProfile]);

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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-8">
          <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 flex items-center justify-center text-white text-4xl font-bold">
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

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-center space-y-4 md:space-y-0 md:space-x-4 mb-4">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.username}
                </h1>
                {user.verified && (
                  <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                  </svg>
                )}
              </div>

              {isOwnProfile ? (
                <button className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              ) : (
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
              )}
            </div>

            <div className="flex justify-center md:justify-start space-x-8 mb-4">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {user.postsCount}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {user.followersCount}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {user.followingCount}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Following</div>
              </div>
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

      <div className="border-t border-gray-200 dark:border-gray-700 mb-8">
        <div className="flex justify-center space-x-16 py-4">
          <button className="flex items-center space-x-2 text-gray-900 dark:text-white font-semibold border-t-2 border-gray-900 dark:border-white pt-4 -mt-[1px]">
            <Grid className="w-5 h-5" />
            <span>POSTS</span>
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
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
      )}
    </div>
  );
};

export default Profile;
