import React, { useEffect, useRef, useState } from 'react';
import { X, Upload as UploadIcon } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export interface EditProfileModalProps {
  user: {
    _id: string;
    username: string;
    displayName: string;
    bio?: string;
    profilePic?: string;
    privacySettings?: {
      profileVisibility?: 'public' | 'private';
      showFollowersList?: boolean;
      showFollowingList?: boolean;
    };
  };
  onClose: () => void;
  onSaved: (updated: any) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onSaved }) => {
  const { user: currentUser } = useAuth();
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio || '');
  const [profilePic, setProfilePic] = useState(user.profilePic || '');
  const [profileVisibility, setProfileVisibility] = useState<'public'|'private'>(user.privacySettings?.profileVisibility || 'public');
  const [showFollowersList, setShowFollowersList] = useState(user.privacySettings?.showFollowersList !== false);
  const [showFollowingList, setShowFollowingList] = useState(user.privacySettings?.showFollowingList !== false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const form = new FormData();
      form.append('file', file);
      const res = await apiClient.post('/uploads/single', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfilePic(res.data.url);
    } catch (e) {
      console.error('Profile pic upload failed', e);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload: any = {
        displayName,
        bio,
        profilePic,
        privacySettings: {
          profileVisibility,
          showFollowersList,
          showFollowingList,
        },
      };
      if (username !== user.username) payload.username = username; // may be rejected by cooldown
      const id = user._id || currentUser?.id;
      const res = await apiClient.patch(`/users/${id}`, payload);
      onSaved(res.data);
      onClose();
    } catch (e: any) {
      console.error('Save profile failed', e);
      alert(e?.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Profile picture */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Profile Picture</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 flex items-center justify-center overflow-hidden">
                {profilePic ? (
                  <img src={profilePic} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-xl">{displayName?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }} />
              <button type="button" onClick={()=>fileRef.current?.click()} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                <UploadIcon className="w-4 h-4 inline mr-2" /> {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
              <input value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Usernames can be changed once every 14 days.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
              <input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
            <textarea value={bio} onChange={(e)=>setBio(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" />
          </div>

          {/* Privacy */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profile Visibility</label>
              <select value={profileVisibility} onChange={(e)=>setProfileVisibility(e.target.value as 'public'|'private')} className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={showFollowersList} onChange={(e)=>setShowFollowersList(e.target.checked)} />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show Followers</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={showFollowingList} onChange={(e)=>setShowFollowingList(e.target.checked)} />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show Following</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving || uploading} className="px-5 py-2 bg-gradient-to-r from-blue-600 to-pink-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
