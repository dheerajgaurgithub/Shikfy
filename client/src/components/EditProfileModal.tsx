import React, { useEffect, useRef, useState } from 'react';
import { X, Upload as UploadIcon, Camera, Image as ImageIcon, Sparkles } from 'lucide-react';
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
  const [coverOffset, setCoverOffset] = useState<number>(50);

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
      if (username !== user.username) payload.username = username;
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 md:p-6 animate-in fade-in duration-300">
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50 animate-in zoom-in-95 duration-300">
        
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-gray-200/50 dark:border-gray-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-gradient-to-b from-blue-600 via-purple-600 to-pink-600 rounded-full"></div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Edit Profile</h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Update your personal information</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 sm:p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-300 group shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400 group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <form onSubmit={handleSave} className="p-4 sm:p-5 md:p-6 space-y-6 sm:space-y-8">
            
            {/* Cover Photo Section - Enhanced */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-600" />
                <label className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Cover Photo</label>
              </div>
              
              <div className="rounded-2xl overflow-hidden border-2 border-gray-200/50 dark:border-gray-700/50 shadow-lg group">
                {coverCropSrc ? (
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-3 sm:p-4">
                    <div className="rounded-xl overflow-hidden border-2 border-dashed border-blue-300 dark:border-blue-700">
                      <img 
                        src={coverCropSrc} 
                        className="w-full h-48 sm:h-56 md:h-64 object-cover" 
                        style={{ objectPosition: `center ${coverOffset}%`, transform: `rotate(${coverRotation}deg)` }} 
                        alt="Cover preview"
                      />
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button 
                          type="button" 
                          onClick={()=>setCoverRotation(r=>r-90)} 
                          className="px-3 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-500 transition-all font-medium shadow-sm"
                        >
                          ↺ Rotate -90°
                        </button>
                        <button 
                          type="button" 
                          onClick={()=>setCoverRotation(r=>r+90)} 
                          className="px-3 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-500 transition-all font-medium shadow-sm"
                        >
                          ↻ Rotate +90°
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3 bg-white dark:bg-gray-700 rounded-xl p-3 border border-gray-200 dark:border-gray-600">
                        <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">Vertical Align</span>
                        <input 
                          type="range" 
                          min={0} 
                          max={100} 
                          value={coverOffset} 
                          onChange={(e)=> setCoverOffset(Number(e.target.value))} 
                          className="flex-1 h-2 bg-gradient-to-r from-blue-200 to-purple-200 dark:from-blue-900 dark:to-purple-900 rounded-full appearance-none cursor-pointer slider-thumb"
                        />
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{coverOffset}%</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <button 
                          type="button" 
                          onClick={applyCoverCrop} 
                          disabled={uploading}
                          className="flex-1 min-w-[120px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploading ? 'Processing...' : '✓ Apply Crop'}
                        </button>
                        <button 
                          type="button" 
                          onClick={()=>{ URL.revokeObjectURL(coverCropSrc); setCoverCropSrc(''); setCoverRotation(0); setCoverOffset(50);}} 
                          className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500 transition-all font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden">
                    {bannerUrl ? (
                      <img src={bannerUrl} alt="banner" className="w-full h-48 sm:h-56 md:h-64 object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-48 sm:h-56 md:h-64 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
                        <ImageIcon className="w-16 h-16 sm:w-20 sm:h-20 text-gray-300 dark:text-gray-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                      <p className="text-white text-sm font-medium">Click below to change cover</p>
                    </div>
                  </div>
                )}
              </div>
              
              <input 
                ref={bannerFileRef} 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e)=>{
                  const f = e.target.files?.[0];
                  if (f) { const url = URL.createObjectURL(f); setCoverCropSrc(url); }
                }} 
              />
              <button 
                type="button" 
                onClick={()=>bannerFileRef.current?.click()} 
                disabled={uploading}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 text-gray-900 dark:text-white font-semibold hover:from-blue-100 hover:to-purple-100 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all border border-blue-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <UploadIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                {uploading ? 'Processing...' : (coverCropSrc ? 'Adjust Cover Photo' : 'Upload Cover Photo')}
              </button>
            </div>

            {/* Profile Picture Section - Enhanced */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-600" />
                <label className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Profile Picture</label>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <div className="relative group shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-1 shadow-2xl">
                    {profilePic ? (
                      <img src={profilePic} alt="avatar" className="w-full h-full rounded-full object-cover border-4 border-white dark:border-gray-800" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center border-4 border-white dark:border-gray-800">
                        <span className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-purple-600">
                          {displayName?.[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
                
                <div className="flex-1 w-full space-y-2">
                  <input 
                    ref={fileRef} 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e)=>{
                      const f = e.target.files?.[0];
                      if (f) { const url = URL.createObjectURL(f); setProfileCropSrc(url); }
                    }} 
                  />
                  <button 
                    type="button" 
                    onClick={()=>fileRef.current?.click()} 
                    disabled={uploading}
                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-600 text-gray-900 dark:text-white font-semibold hover:from-purple-100 hover:to-pink-100 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all border border-purple-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <UploadIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    {uploading ? 'Processing...' : (profileCropSrc ? 'Adjust Picture' : 'Upload Picture')}
                  </button>
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400">Recommended: Square image, at least 400x400px</p>
                </div>
              </div>
              
              {profileCropSrc && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-4 border-2 border-purple-200 dark:border-gray-700">
                  <div className="flex justify-center mb-4">
                    <img 
                      src={profileCropSrc} 
                      className="w-40 h-40 sm:w-48 sm:h-48 object-contain rounded-2xl border-2 border-dashed border-purple-300 dark:border-purple-700" 
                      style={{ transform: `rotate(${profileRotation}deg)` }}
                      alt="Profile preview"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <button 
                      type="button" 
                      onClick={()=>setProfileRotation(r=>r-90)} 
                      className="px-3 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-500 transition-all font-medium shadow-sm"
                    >
                      ↺ Rotate -90°
                    </button>
                    <button 
                      type="button" 
                      onClick={()=>setProfileRotation(r=>r+90)} 
                      className="px-3 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-500 transition-all font-medium shadow-sm"
                    >
                      ↻ Rotate +90°
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      type="button" 
                      onClick={applyProfileCrop} 
                      disabled={uploading}
                      className="flex-1 min-w-[120px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? 'Processing...' : '✓ Apply Crop'}
                    </button>
                    <button 
                      type="button" 
                      onClick={()=>{ URL.revokeObjectURL(profileCropSrc); setProfileCropSrc(''); setProfileRotation(0); }} 
                      className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500 transition-all font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Basic Info - Enhanced */}
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-600" />
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Username</label>
                  <input 
                    value={username} 
                    onChange={(e)=>setUsername(e.target.value)} 
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none" 
                    placeholder="Enter username"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                    <span className="text-blue-600">ℹ️</span>
                    <span>Usernames can be changed once every 14 days.</span>
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Display Name</label>
                  <input 
                    value={displayName} 
                    onChange={(e)=>setDisplayName(e.target.value)} 
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:border-purple-500 dark:focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all outline-none" 
                    placeholder="Enter display name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Bio</label>
                <textarea 
                  value={bio} 
                  onChange={(e)=>setBio(e.target.value)} 
                  rows={4} 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:border-pink-500 dark:focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 transition-all outline-none resize-none" 
                  placeholder="Tell us about yourself..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 text-right">{bio.length} characters</p>
              </div>
            </div>

            {/* Privacy Settings - Enhanced */}
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <span className="text-white text-xs">🔒</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Privacy Settings</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Profile Visibility</label>
                  <select 
                    value={profileVisibility} 
                    onChange={(e)=>setProfileVisibility(e.target.value as 'public'|'private')} 
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-500 focus:ring-4 focus:ring-green-500/20 transition-all outline-none cursor-pointer"
                  >
                    <option value="public">🌍 Public</option>
                    <option value="private">🔒 Private</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-700 dark:to-gray-600 border border-blue-200 dark:border-gray-600">
                  <input 
                    type="checkbox" 
                    id="showFollowers"
                    checked={showFollowersList} 
                    onChange={(e)=>setShowFollowersList(e.target.checked)} 
                    className="w-5 h-5 rounded-lg border-2 border-gray-300 dark:border-gray-500 text-blue-600 focus:ring-4 focus:ring-blue-500/20 cursor-pointer"
                  />
                  <label htmlFor="showFollowers" className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">Show Followers</label>
                </div>
                
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-600 border border-purple-200 dark:border-gray-600">
                  <input 
                    type="checkbox" 
                    id="showFollowing"
                    checked={showFollowingList} 
                    onChange={(e)=>setShowFollowingList(e.target.checked)} 
                    className="w-5 h-5 rounded-lg border-2 border-gray-300 dark:border-gray-500 text-purple-600 focus:ring-4 focus:ring-purple-500/20 cursor-pointer"
                  />
                  <label htmlFor="showFollowing" className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">Show Following</label>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer with Action Buttons - Fixed */}
        <div className="border-t border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-5 md:p-6 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-semibold border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all shadow-sm"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              onClick={handleSave}
              disabled={saving || uploading} 
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #a855f7, #ec4899);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #9333ea, #db2777);
        }
        
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #a855f7);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
        }
        
        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #a855f7);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes zoom-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        .animate-in {
          animation-fill-mode: both;
        }
        
        .fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .zoom-in-95 {
          animation: zoom-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default EditProfileModal;