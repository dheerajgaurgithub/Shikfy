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
    bannerUrl?: string;
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
  const [bannerUrl, setBannerUrl] = useState(user.bannerUrl || '');
  const [profileVisibility, setProfileVisibility] = useState<'public'|'private'>(user.privacySettings?.profileVisibility || 'public');
  const [showFollowersList, setShowFollowersList] = useState(user.privacySettings?.showFollowersList !== false);
  const [showFollowingList, setShowFollowingList] = useState(user.privacySettings?.showFollowingList !== false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const bannerFileRef = useRef<HTMLInputElement | null>(null);
  const [profileCropSrc, setProfileCropSrc] = useState<string>('');
  const [coverCropSrc, setCoverCropSrc] = useState<string>('');
  const [profileRotation, setProfileRotation] = useState<number>(0);
  const [coverRotation, setCoverRotation] = useState<number>(0);
  const [coverOffset, setCoverOffset] = useState<number>(50); // 0..100 (top to bottom)

  // Canvas processor: crop center with aspect and rotation degrees
  const processImage = async (src: string, aspect: number, rotationDeg: number, offsetFrac = 0.5): Promise<Blob> => {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = src;
    });
    const radians = (rotationDeg % 360) * Math.PI / 180;
    const t = document.createElement('canvas');
    const ctxT = t.getContext('2d')!;
    const diagonal = Math.ceil(Math.sqrt(img.width*img.width + img.height*img.height));
    t.width = diagonal; t.height = diagonal;
    ctxT.translate(diagonal/2, diagonal/2);
    ctxT.rotate(radians);
    ctxT.drawImage(img, -img.width/2, -img.height/2);
    const w = t.width, h = t.height;
    let cropW = w, cropH = Math.round(w / aspect);
    if (cropH > h) { cropH = h; cropW = Math.round(h * aspect); }
    const sx = Math.round((w - cropW)/2);
    // offsetFrac 0..1 from top to bottom
    const maxY = h - cropH;
    const sy = Math.max(0, Math.min(maxY, Math.round(maxY * offsetFrac)));
    const out = document.createElement('canvas');
    out.width = aspect === 1 ? 512 : 1280;
    out.height = aspect === 1 ? 512 : Math.round(out.width / aspect);
    const ctxO = out.getContext('2d')!;
    ctxO.imageSmoothingQuality = 'high';
    ctxO.drawImage(t, sx, sy, cropW, cropH, 0, 0, out.width, out.height);
    return await new Promise<Blob>((resolve)=> out.toBlob(b=> resolve(b!), 'image/jpeg', 0.95));
  };

  const applyProfileCrop = async () => {
    if (!profileCropSrc) return;
    try {
      setUploading(true);
      const blob = await processImage(profileCropSrc, 1, profileRotation);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      await handleUpload(file);
      URL.revokeObjectURL(profileCropSrc); setProfileCropSrc(''); setProfileRotation(0);
    } finally { setUploading(false); }
  };

  const applyCoverCrop = async () => {
    if (!coverCropSrc) return;
    try {
      setUploading(true);
      const blob = await processImage(coverCropSrc, 16/9, coverRotation, coverOffset/100);
      const file = new File([blob], 'cover.jpg', { type: 'image/jpeg' });
      const form = new FormData(); form.append('file', file);
      const res = await apiClient.post('/uploads/single', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBannerUrl(res.data.url);
      URL.revokeObjectURL(coverCropSrc); setCoverCropSrc(''); setCoverRotation(0);
    } finally { setUploading(false); }
  };

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

  const handleBannerUpload = async (file: File) => {
    try {
      setUploading(true);
      const form = new FormData();
      form.append('file', file);
      const res = await apiClient.post('/uploads/single', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setBannerUrl(res.data.url);
    } catch (e) {
      console.error('Banner upload failed', e);
      alert('Failed to upload banner');
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
        bannerUrl,
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
          {/* Cover/Banner photo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cover Photo</label>
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-2">
              {coverCropSrc ? (
                <div className="p-2">
                  <img src={coverCropSrc} className="w-full h-40 object-cover" style={{ objectPosition: `center ${coverOffset}%` }} />
                  <div className="flex items-center gap-2 mt-2">
                    <button type="button" onClick={()=>setCoverRotation(r=>r-90)} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">Rotate -90°</button>
                    <button type="button" onClick={()=>setCoverRotation(r=>r+90)} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">Rotate +90°</button>
                    <div className="flex items-center gap-2 ml-2 text-sm text-gray-700 dark:text-gray-300">
                      <span>Offset</span>
                      <input type="range" min={0} max={100} value={coverOffset} onChange={(e)=> setCoverOffset(Number(e.target.value))} />
                    </div>
                    <button type="button" onClick={applyCoverCrop} className="ml-auto px-3 py-1.5 rounded bg-blue-600 text-white">Apply Crop</button>
                    <button type="button" onClick={()=>{ URL.revokeObjectURL(coverCropSrc); setCoverCropSrc(''); setCoverRotation(0); setCoverOffset(50);} } className="px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-700">Cancel</button>
                  </div>
                </div>
              ) : bannerUrl ? (
                <img src={bannerUrl} alt="banner" className="w-full h-32 md:h-40 object-cover" />
              ) : (
                <div className="w-full h-32 md:h-40 bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800" />
              )}
            </div>
            <input ref={bannerFileRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{
              const f = e.target.files?.[0];
              if (f) { const url = URL.createObjectURL(f); setCoverCropSrc(url); }
            }} />
            <button type="button" onClick={()=>bannerFileRef.current?.click()} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
              <UploadIcon className="w-4 h-4 inline mr-2" /> {uploading ? 'Processing...' : (coverCropSrc? 'Adjust Cover' : 'Upload Cover')}
            </button>
          </div>

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
                if (f) { const url = URL.createObjectURL(f); setProfileCropSrc(url); }
              }} />
              <button type="button" onClick={()=>fileRef.current?.click()} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                <UploadIcon className="w-4 h-4 inline mr-2" /> {uploading ? 'Processing...' : (profileCropSrc? 'Adjust' : 'Upload')}
              </button>
            </div>
            {profileCropSrc && (
              <div className="mt-3">
                <img src={profileCropSrc} className="w-32 h-32 object-contain rounded" />
                <div className="flex items-center gap-2 mt-2">
                  <button type="button" onClick={()=>setProfileRotation(r=>r-90)} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">Rotate -90°</button>
                  <button type="button" onClick={()=>setProfileRotation(r=>r+90)} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">Rotate +90°</button>
                  <button type="button" onClick={applyProfileCrop} className="ml-auto px-3 py-1.5 rounded bg-blue-600 text-white">Apply Crop</button>
                  <button type="button" onClick={()=>{ URL.revokeObjectURL(profileCropSrc); setProfileCropSrc(''); setProfileRotation(0); }} className="px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-700">Cancel</button>
                </div>
              </div>
            )}
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
