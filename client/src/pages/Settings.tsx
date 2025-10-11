import React, { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import apiClient from '../api/client';
import { Shield, Moon, Sun, Monitor, Users, MessageSquare, Eye, Sparkles, Check } from 'lucide-react';

interface MeUser {
  _id: string;
  id?: string;
  username: string;
  displayName: string;
  bio?: string;
  profilePic?: string;
  privacySettings?: {
    profileVisibility?: 'public' | 'private';
    showFollowersList?: boolean;
    showFollowingList?: boolean;
  };
}

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const [me, setMe] = useState<MeUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingCF, setSavingCF] = useState(false);
  const [savingMsg, setSavingMsg] = useState(false);

  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private'>('public');
  const [showFollowersList, setShowFollowersList] = useState(true);
  const [showFollowingList, setShowFollowingList] = useState(true);
  const [following, setFollowing] = useState<any[]>([]);
  const [closeFriends, setCloseFriends] = useState<string[]>([]);
  const [cfSearch, setCfSearch] = useState('');

  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyText, setAutoReplyText] = useState('I am currently away and will reply later.');
  const [statusMessage, setStatusMessage] = useState('');

  const [views, setViews] = useState<any[]>([]);
  const [loadingViews, setLoadingViews] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/users/me');
        setMe(res.data);
        const ps = res.data.privacySettings || {};
        setProfileVisibility(ps.profileVisibility || 'public');
        setShowFollowersList(ps.showFollowersList !== false);
        setShowFollowingList(ps.showFollowingList !== false);
        setCloseFriends(res.data.closeFriends || []);
        setAutoReplyEnabled(!!res.data.autoReplyEnabled);
        setAutoReplyText(res.data.autoReplyText || 'I am currently away and will reply later.');
        setStatusMessage(res.data.statusMessage || '');
        try {
          const who = res.data._id || res.data.id;
          const fl = await apiClient.get(`/users/${who}/following`);
          setFollowing(fl.data || []);
        } catch (e) { console.warn('Failed to load following for CF', e); }
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    };
    load();
  }, []);

  const handleSavePrivacy = async () => {
    if (!me) return;
    try {
      setSaving(true);
      await apiClient.patch(`/users/${me._id || me.id}`, {
        privacySettings: {
          profileVisibility,
          showFollowersList,
          showFollowingList,
        },
      });
      alert('Privacy settings saved');
    } catch (e) {
      console.error('Failed to save privacy settings', e);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMessaging = async () => {
    if (!me) return;
    try {
      setSavingMsg(true);
      await apiClient.patch(`/users/${me._id || me.id}`, {
        autoReplyEnabled,
        autoReplyText,
        statusMessage,
      });
      alert('Messaging settings saved');
    } catch (e) {
      console.error('Failed to save messaging settings', e);
      alert('Failed to save settings');
    } finally {
      setSavingMsg(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12">
        
        {/* Header */}
        <div className="mb-8 sm:mb-10 lg:mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-xl">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Customize your experience</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-5 lg:space-y-6">
          
          {/* Theme Section */}
          <section className="group relative overflow-hidden rounded-2xl sm:rounded-3xl backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative p-5 sm:p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-5 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Monitor className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Appearance</h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Choose your interface theme</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <button 
                  onClick={() => setTheme('system')} 
                  className={`relative overflow-hidden px-5 py-4 sm:py-5 rounded-xl sm:rounded-2xl font-semibold transition-all duration-300 ${
                    theme==='system'
                      ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-xl scale-105'
                      : 'bg-gray-100/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-105'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Monitor className="w-6 h-6 sm:w-7 sm:h-7" />
                    <span className="text-sm sm:text-base">System</span>
                  </div>
                  {theme === 'system' && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-5 h-5" />
                    </div>
                  )}
                </button>

                <button 
                  onClick={() => setTheme('light')} 
                  className={`relative overflow-hidden px-5 py-4 sm:py-5 rounded-xl sm:rounded-2xl font-semibold transition-all duration-300 ${
                    theme==='light'
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-xl scale-105'
                      : 'bg-gray-100/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-105'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Sun className="w-6 h-6 sm:w-7 sm:h-7" />
                    <span className="text-sm sm:text-base">Light</span>
                  </div>
                  {theme === 'light' && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-5 h-5" />
                    </div>
                  )}
                </button>

                <button 
                  onClick={() => setTheme('dark')} 
                  className={`relative overflow-hidden px-5 py-4 sm:py-5 rounded-xl sm:rounded-2xl font-semibold transition-all duration-300 ${
                    theme==='dark'
                      ? 'bg-gradient-to-br from-indigo-600 to-blue-800 text-white shadow-xl scale-105'
                      : 'bg-gray-100/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-105'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Moon className="w-6 h-6 sm:w-7 sm:h-7" />
                    <span className="text-sm sm:text-base">Dark</span>
                  </div>
                  {theme === 'dark' && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-5 h-5" />
                    </div>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* Messaging Section */}
          <section className="group relative overflow-hidden rounded-2xl sm:rounded-3xl backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative p-5 sm:p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-5 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Messaging</h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Configure your chat preferences</p>
                </div>
              </div>
              
              <div className="space-y-5 sm:space-y-6">
                <label className="flex items-center justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-800 transition-all duration-300 cursor-pointer group/item">
                  <div className="flex-1">
                    <span className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">Enable Auto-Reply</span>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Automatically respond when you're away</p>
                  </div>
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={autoReplyEnabled} 
                      onChange={(e)=> setAutoReplyEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-teal-500 transition-all duration-300 shadow-inner"></div>
                    <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 peer-checked:translate-x-6"></div>
                  </div>
                </label>

                <div className="space-y-2">
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Auto-Reply Message</label>
                  <textarea 
                    value={autoReplyText} 
                    onChange={(e)=> setAutoReplyText(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-white border-2 border-transparent focus:border-green-500 dark:focus:border-green-400 transition-all duration-300 shadow-inner focus:shadow-lg resize-none"
                    placeholder="I am currently away..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Status Message</label>
                  <input 
                    value={statusMessage} 
                    onChange={(e)=> setStatusMessage(e.target.value)}
                    className="w-full px-4 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-white border-2 border-transparent focus:border-green-500 dark:focus:border-green-400 transition-all duration-300 shadow-inner focus:shadow-lg"
                    placeholder="What's on your mind?"
                  />
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 pl-1">Shown under your name in chat headers</p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button 
                    disabled={savingMsg || !me} 
                    onClick={handleSaveMessaging}
                    className="px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl sm:rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-700 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {savingMsg ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </span>
                    ) : 'Save Messaging'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Profile Views Section */}
          <section className="group relative overflow-hidden rounded-2xl sm:rounded-3xl backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-fuchsia-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative p-5 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 sm:mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
                    <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Profile Views</h2>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">See who checked out your profile</p>
                  </div>
                </div>
                <button 
                  disabled={!me || loadingViews} 
                  onClick={async ()=>{
                    if (!me) return; 
                    setLoadingViews(true);
                    try {
                      const r = await apiClient.get(`/users/${me._id || me.id}/profile-views`);
                      setViews(r.data || []);
                    } catch {}
                    finally { setLoadingViews(false); }
                  }}
                  className="px-4 py-2 sm:px-6 sm:py-3 rounded-xl bg-gradient-to-r from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30 text-violet-900 dark:text-violet-200 font-semibold hover:from-violet-200 hover:to-fuchsia-200 dark:hover:from-violet-800/40 dark:hover:to-fuchsia-800/40 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50"
                >
                  {loadingViews ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-violet-900 dark:border-violet-200 border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </span>
                  ) : 'Refresh'}
                </button>
              </div>
              
              {views.length===0 ? (
                <div className="text-center py-12 sm:py-16">
                  <div className="text-4xl sm:text-5xl mb-3">👀</div>
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium">No recent profile views</p>
                </div>
              ) : (
                <div className="max-h-80 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                  {views.map((v:any)=> (
                    <div key={v._id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="relative">
                        <img 
                          src={v.viewerId?.profilePic || 'https://via.placeholder.com/40'} 
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full ring-2 ring-violet-200 dark:ring-violet-800 object-cover" 
                          alt={v.viewerId?.displayName}
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm sm:text-base text-gray-900 dark:text-white font-semibold truncate">{v.viewerId?.displayName}</div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">@{v.viewerId?.username}</div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-right whitespace-nowrap">
                        {new Date(v.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Privacy & Control Section */}
          <section className="group relative overflow-hidden rounded-2xl sm:rounded-3xl backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-red-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative p-5 sm:p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-5 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Privacy & Control</h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Manage who sees your content</p>
                </div>
              </div>

              <div className="space-y-5 sm:space-y-6">
                <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex-1">
                      <div className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white">Profile Visibility</div>
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Choose who can see your posts and reels</div>
                    </div>
                    <select
                      className="px-4 py-2 sm:px-5 sm:py-3 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600 focus:border-orange-500 dark:focus:border-orange-400 transition-all duration-300 shadow-md font-semibold cursor-pointer"
                      value={profileVisibility}
                      onChange={(e) => setProfileVisibility(e.target.value as 'public'|'private')}
                    >
                      <option value="public">🌍 Public</option>
                      <option value="private">🔒 Private</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-800 transition-all duration-300 cursor-pointer group/item">
                  <div className="flex-1">
                    <div className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white group-hover/item:text-orange-600 dark:group-hover/item:text-orange-400 transition-colors">Show Followers List</div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Let others see who follows you</p>
                  </div>
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={showFollowersList} 
                      onChange={(e)=>setShowFollowersList(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-500 transition-all duration-300 shadow-inner"></div>
                    <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 peer-checked:translate-x-6"></div>
                  </div>
                </label>

                <label className="flex items-center justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-800 transition-all duration-300 cursor-pointer group/item">
                  <div className="flex-1">
                    <div className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white group-hover/item:text-orange-600 dark:group-hover/item:text-orange-400 transition-colors">Show Following List</div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Let others see who you follow</p>
                  </div>
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={showFollowingList} 
                      onChange={(e)=>setShowFollowingList(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-500 transition-all duration-300 shadow-inner"></div>
                    <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 peer-checked:translate-x-6"></div>
                  </div>
                </label>

                <div className="pt-4 border-t-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <div className="space-y-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                      <span>Post visibility per post is available via the Create Post modal (Public/Followers/Mutuals/Custom)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                      <span>Approving per-post viewers, Close Friends, and restricting by content type are not enabled in this build</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                      <span>Block without unfollowing: when blocking a user, you can choose to keep the follow count unchanged</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    disabled={saving}
                    onClick={handleSavePrivacy}
                    className="px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl sm:rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:from-orange-700 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </span>
                    ) : 'Save Privacy Settings'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Close Friends Manager */}
          <section className="group relative overflow-hidden rounded-2xl sm:rounded-3xl backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative p-5 sm:p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-5 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Close Friends</h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Select your closest connections</p>
                </div>
              </div>
              
              <div className="space-y-4 sm:space-y-5">
                <div className="relative">
                  <input
                    value={cfSearch}
                    onChange={(e)=>setCfSearch(e.target.value)}
                    placeholder="Search following..."
                    className="w-full px-4 py-3 sm:px-5 sm:py-4 pl-12 sm:pl-14 rounded-xl sm:rounded-2xl bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-white border-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-400 transition-all duration-300 shadow-inner focus:shadow-lg"
                  />
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>

                {following.length === 0 ? (
                  <div className="text-center py-12 sm:py-16">
                    <div className="text-4xl sm:text-5xl mb-3">👥</div>
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium">No following users yet</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-auto rounded-xl border-2 border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                    {following
                      .filter((u:any)=> u.username?.toLowerCase().includes(cfSearch.toLowerCase()) || u.displayName?.toLowerCase().includes(cfSearch.toLowerCase()))
                      .map((u:any)=> (
                        <label key={u._id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-900/20 dark:hover:to-teal-900/20 transition-all duration-300 cursor-pointer group/user">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={closeFriends.includes(u._id)}
                              onChange={(e)=> setCloseFriends(prev => e.target.checked ? [...prev, u._id] : prev.filter(id=>id!==u._id))}
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
                            />
                          </div>
                          <div className="relative">
                            <img 
                              src={u.profilePic || 'https://via.placeholder.com/40'} 
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full ring-2 ring-gray-200 dark:ring-gray-700 group-hover/user:ring-emerald-400 dark:group-hover/user:ring-emerald-500 transition-all object-cover" 
                              alt={u.displayName}
                            />
                            {closeFriends.includes(u._id) && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm sm:text-base text-gray-900 dark:text-white font-semibold truncate group-hover/user:text-emerald-600 dark:group-hover/user:text-emerald-400 transition-colors">
                              {u.displayName}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">@{u.username}</div>
                          </div>
                        </label>
                    ))}
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    disabled={savingCF || !me}
                    onClick={async ()=>{
                      if (!me) return;
                      try {
                        setSavingCF(true);
                        await apiClient.patch(`/users/${me._id || me.id}/close-friends`, { userIds: closeFriends });
                        alert('Close Friends updated');
                      } catch (e) {
                        console.error('Failed to update close friends', e);
                        alert('Failed to update close friends');
                      } finally {
                        setSavingCF(false);
                      }
                    }}
                    className="px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl sm:rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {savingCF ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        Save Close Friends
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom Spacer */}
        <div className="h-8 sm:h-12"></div>
      </div>
    </div>
  );
};

export default Settings;