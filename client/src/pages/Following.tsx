import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, UserMinus, UserCheck } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const Following: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await apiClient.get(`/users/${id}/following`);
        setUsers(r.data || []);
      } catch {}
      finally { setLoading(false); }
    };
    if (id) load();
  }, [id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        
        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4 mb-4">
            <button 
              onClick={() => navigate(`/profile/${id}`)} 
              className="group flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-slate-800 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-slate-700 dark:hover:to-slate-700 border-2 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 transition-all duration-300 hover:shadow-lg hover:scale-110"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <div className="flex items-center gap-2 sm:gap-3">
                <UserCheck className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Following
                </h1>
              </div>
              <div className="h-1 w-12 sm:w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-2"></div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-16 sm:py-24">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-gray-200 dark:border-slate-700"></div>
              <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-transparent border-t-blue-500 border-r-purple-500 animate-spin"></div>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24">
            <UserCheck className="w-16 h-16 sm:w-20 sm:h-20 text-gray-300 dark:text-slate-700 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-medium">Not following anyone yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Start following people to see their amazing content</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {users.map((u, index) => (
              <div 
                key={u._id} 
                className="group bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border-2 border-gray-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 dark:hover:shadow-purple-500/20"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 lg:p-5">
                  
                  {/* User Info */}
                  <Link 
                    to={`/profile/${u._id}`} 
                    className="flex items-center gap-3 sm:gap-4 flex-1 group/link"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-0 group-hover/link:opacity-75 blur transition duration-300"></div>
                      <img 
                        src={u.profilePic || 'https://via.placeholder.com/40'} 
                        alt={u.displayName}
                        className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-white dark:border-slate-800"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 dark:text-white font-bold text-sm sm:text-base group-hover/link:text-purple-600 dark:group-hover/link:text-purple-400 transition-colors truncate">
                        {u.displayName}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 group-hover/link:text-gray-600 dark:group-hover/link:text-gray-300 transition-colors truncate">
                        @{u.username}
                      </div>
                    </div>
                  </Link>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    {me?.id === id && (
                      <button 
                        onClick={async () => {
                          if (!window.confirm(`Unfollow @${u.username}?`)) return;
                          try { 
                            await apiClient.delete(`/users/${u._id}/follow`); 
                            setUsers(prev => prev.filter(x => x._id !== u._id)); 
                          }
                          catch (e: any) { 
                            alert(e?.response?.data?.error || 'Failed to unfollow'); 
                          }
                        }} 
                        className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 font-medium text-xs sm:text-sm transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20 group-hover:scale-105 active:scale-95"
                        title="Unfollow user"
                      >
                        <UserMinus className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">Unfollow</span>
                      </button>
                    )}
                    
                    <button 
                      onClick={async () => {
                        try { 
                          const r = await apiClient.post('/chats', { type: 'dm', memberIds: [u._id] }); 
                          window.location.href = `/chats?chatId=${r.data._id}`; 
                        }
                        catch { 
                          alert('Failed to open chat'); 
                        }
                      }} 
                      className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border border-blue-700/50 font-medium text-xs sm:text-sm transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30 group-hover:scale-105 active:scale-95"
                      title="Send message"
                    >
                      <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Message</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Following;