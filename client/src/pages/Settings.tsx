import React, { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import apiClient from '../api/client';
import { Shield, Moon, Sun, Monitor, Lock, Users } from 'lucide-react';

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

  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private'>('public');
  const [showFollowersList, setShowFollowersList] = useState(true);
  const [showFollowingList, setShowFollowingList] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/users/me');
        setMe(res.data);
        const ps = res.data.privacySettings || {};
        setProfileVisibility(ps.profileVisibility || 'public');
        setShowFollowersList(ps.showFollowersList !== false);
        setShowFollowingList(ps.showFollowingList !== false);
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
              <div>• Profile views are not shown. Blocking without unfollowing and group feeds are not yet implemented.</div>
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
      </div>
    </div>
  );
};

export default Settings;
