import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import apiClient from '../api/client';
import { Link } from 'react-router-dom';

const Explore = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await apiClient.get('/posts/feed?page=1');
        setPosts(response.data);
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

        {/* Explore Posts Header */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Explore Posts
          </h2>
          <div className="h-1 w-16 sm:w-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-2"></div>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16 sm:py-20">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-gray-200 dark:border-slate-700"></div>
              <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-transparent border-t-blue-500 border-r-purple-500 animate-spin"></div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 sm:gap-2 lg:gap-3">
            {posts.map((post, index) => (
              <Link 
                to={`/post/${post._id}`} 
                key={post._id} 
                className="relative group aspect-square bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-800 rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-500 ring-2 ring-gray-300 dark:ring-slate-700 ring-opacity-0 hover:ring-opacity-100 group-hover:scale-105 transform"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {post.media && post.media[0] && (
                  <img
                    src={post.media[0].thumbnail || post.media[0].url}
                    alt="Post"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Stats Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                  <div className="flex items-center gap-3 sm:gap-4 text-white font-bold text-sm sm:text-base">
                    <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-2 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6.003 6.003 0 0 1 21 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                      <span>{post.likesCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-2 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l1.5-4.5C2.6 15.1 2 13.6 2 12 2 7.6 6.5 4 12 4s10 3.6 10 8-4.5 8-10 8c-1.6 0-3.1-.3-4.5-.8L2 21z"/></svg>
                      <span>{post.commentsCount || 0}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;