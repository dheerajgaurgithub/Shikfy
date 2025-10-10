import React, { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import apiClient from '../api/client';
import { Shield, Moon, Sun, Monitor, Users } from 'lucide-react';

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

  // Messaging / status
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyText, setAutoReplyText] = useState('I am currently away and will reply later.');
  const [statusMessage, setStatusMessage] = useState('');

  // Profile views
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
        // load following for CF manager
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
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

      <div className="space-y-8">
        {/* Theme */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Monitor className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Theme</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setTheme('system')} className={`px-4 py-2 rounded-lg ${theme==='system'?'bg-blue-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
              System
            </button>
            <button onClick={() => setTheme('light')} className={`px-4 py-2 rounded-lg ${theme==='light'?'bg-blue-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
              <Sun className="w-4 h-4 inline mr-1" /> Light
            </button>
            <button onClick={() => setTheme('dark')} className={`px-4 py-2 rounded-lg ${theme==='dark'?'bg-blue-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
              <Moon className="w-4 h-4 inline mr-1" /> Dark
            </button>
          </div>
        </section>

        {/* Messaging */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Messaging</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-white">Enable Auto-Reply</span>
              <input type="checkbox" checked={autoReplyEnabled} onChange={(e)=> setAutoReplyEnabled(e.target.checked)} />
            </label>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Auto-Reply Text</label>
              <input value={autoReplyText} onChange={(e)=> setAutoReplyText(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Status Message</label>
              <input value={statusMessage} onChange={(e)=> setStatusMessage(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Shown under your name in chat headers.</p>
            </div>
            <div className="pt-2 flex justify-end">
              <button disabled={savingMsg || !me} onClick={handleSaveMessaging} className="px-5 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{savingMsg ? 'Saving...' : 'Save Messaging'}</button>
            </div>
          </div>
        </section>

        {/* Profile Views */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Views</h2>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">Only you can see who viewed your profile.</div>
            <button disabled={!me || loadingViews} onClick={async ()=>{
              if (!me) return; setLoadingViews(true);
              try {
                const r = await apiClient.get(`/users/${me._id || me.id}/profile-views`);
                setViews(r.data || []);
              } catch {}
              finally { setLoadingViews(false); }
            }} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{loadingViews? 'Loading…':'Refresh'}</button>
          </div>
          {views.length===0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">No recent views.</div>
          ) : (
            <div className="max-h-64 overflow-auto divide-y divide-gray-200 dark:divide-gray-700">
              {views.map((v:any)=> (
                <div key={v._id} className="flex items-center gap-3 py-2">
                  <img src={v.viewerId?.profilePic || 'https://via.placeholder.com/32'} className="w-8 h-8 rounded-full" />
                  <div>
                    <div className="text-gray-900 dark:text-white font-medium">{v.viewerId?.displayName}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">@{v.viewerId?.username}</div>
                  </div>
                  <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">{new Date(v.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Privacy & Control */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Privacy & Control</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Profile Visibility</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Public: anyone can see your posts/reels. Private: only followers can see them.</div>
              </div>
              <select
                className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                value={profileVisibility}
                onChange={(e) => setProfileVisibility(e.target.value as 'public'|'private')}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Show Followers List</div>
              </div>
              <input type="checkbox" checked={showFollowersList} onChange={(e)=>setShowFollowersList(e.target.checked)} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Show Following List</div>
              </div>
              <input type="checkbox" checked={showFollowingList} onChange={(e)=>setShowFollowingList(e.target.checked)} />
            </div>

            {/* Unsupported or advanced controls explained */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <div>• Post visibility per post is available via the Create Post modal (Public/Followers/Mutuals/Custom).</div>
              <div>• Approving per-post viewers, Close Friends, and restricting by content type are not enabled in this build.</div>
              <div>• Block without unfollowing: when blocking a user, you can choose to keep the follow count unchanged.</div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                disabled={saving}
                onClick={handleSavePrivacy}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </section>

        {/* Close Friends Manager */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Users className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Close Friends</h2>
          </div>
          <div className="mb-3">
            <input
              value={cfSearch}
              onChange={(e)=>setCfSearch(e.target.value)}
              placeholder="Search following..."
              className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="max-h-64 overflow-auto divide-y divide-gray-200 dark:divide-gray-700">
            {following
              .filter((u:any)=> u.username?.toLowerCase().includes(cfSearch.toLowerCase()) || u.displayName?.toLowerCase().includes(cfSearch.toLowerCase()))
              .map((u:any)=> (
                <label key={u._id} className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    checked={closeFriends.includes(u._id)}
                    onChange={(e)=> setCloseFriends(prev => e.target.checked ? [...prev, u._id] : prev.filter(id=>id!==u._id))}
                  />
                  <img src={u.profilePic || 'https://via.placeholder.com/32'} className="w-8 h-8 rounded-full" />
                  <div>
                    <div className="text-gray-900 dark:text-white font-medium">{u.displayName}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-sm">@{u.username}</div>
                  </div>
                </label>
            ))}
          </div>
          <div className="pt-4 flex justify-end">
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
              className="px-5 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {savingCF ? 'Saving...' : 'Save Close Friends'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
