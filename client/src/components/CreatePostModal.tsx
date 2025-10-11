import React, { useEffect, useRef, useState } from 'react';
import { X, Image as ImageIcon, Upload as UploadIcon, FileVideo, FileImage, Sparkles, Hash, Globe, Users, Lock, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';

interface CreatePostModalProps {
  onClose: () => void;
  onPostCreated: (post: any) => void;
}

const CreatePostModal = ({ onClose, onPostCreated }: CreatePostModalProps) => {
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [captionSuggestions, setCaptionSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Build hashtag suggestions from current caption + some trending defaults
  useEffect(() => {
    const words = (caption || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const base = new Set<string>();
    const add = (t:string)=>{ if (t && t.length>1) base.add('#'+t.replace(/^#+/, '')); };
    words.forEach(w => { if (w.length>2) add(w); });
    // simple domain keywords based on media type
    if (mediaType==='image') ['photo','pics','snapshot','aesthetic'].forEach(add);
    if (mediaType==='video') ['video','reel','vibes','creator'].forEach(add);
    // trending generic
    ['love','life','friends','fun','style','travel','instagood','explore'].forEach(add);
    const arr = Array.from(base).slice(0, 12);
    setTagSuggestions(arr);
  }, [caption, mediaType]);

  const buildCaptionSuggestions = () => {
    const ts = new Date();
    const hour = ts.getHours();
    const day = ts.toLocaleDateString(undefined, { weekday: 'long' });
    const feels = hour < 11 ? 'morning vibes' : hour < 17 ? 'daylight glow' : 'golden hour';
    const core = mediaType==='video' ? 'Dropping a new clip' : 'A moment I loved';
    const opt1 = `${core} ✨ | ${feels}`;
    const opt2 = `${core} • ${day} mood`;
    const opt3 = `${core} — what do you think?`;
    setCaptionSuggestions([opt1, opt2, opt3]);
    setShowSuggestions(true);
  };
  const [preview, setPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [visibility, setVisibility] = useState<'public'|'followers'|'mutuals'|'close_friends'|'custom'>('public');
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [allowList, setAllowList] = useState<string[]>([]);
  const [excludeList, setExcludeList] = useState<string[]>([]);
  const [showAudiencePicker, setShowAudiencePicker] = useState(false);
  const [status, setStatus] = useState<'published'|'scheduled'|'draft'>('published');
  const [scheduledAt, setScheduledAt] = useState<string>('');

  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    const loadFollowing = async () => {
      if (visibility !== 'custom' || followingList.length > 0 || !user?.id) return;
      try {
        const res = await apiClient.get(`/users/${user.id}/following`);
        setFollowingList(res.data || []);
      } catch (e) {
        console.error('Failed to load following list', e);
      }
    };
    loadFollowing();
  }, [visibility, user?.id, followingList.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption && !mediaUrl && !file) return;

    setLoading(true);

    try {
      let finalUrl = mediaUrl;
      let uploadedThumb: string | undefined;
      let uploadedDuration: number | undefined;

      if (file && !finalUrl) {
        setUploading(true);
        const form = new FormData();
        form.append('file', file);
        const uploadRes = await apiClient.post('/uploads/single', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        finalUrl = uploadRes.data.url;
        uploadedThumb = uploadRes.data.thumbnail;
        uploadedDuration = uploadRes.data.duration;
      }

      const derivedType = file?.type?.startsWith('video') ? 'video' : mediaType;
      const media = finalUrl
        ? [{ type: derivedType, url: finalUrl, thumbnail: derivedType === 'image' ? finalUrl : undefined }]
        : [];

      const hashtags = caption.match(/#\w+/g)?.map(tag => tag.slice(1)) || [];

      let response;
      if (derivedType === 'video' && finalUrl) {
        response = await apiClient.post('/reels', {
          caption,
          video: {
            url: finalUrl,
            thumbnail: uploadedThumb || finalUrl,
            duration: uploadedDuration || 0,
          },
          hashtags,
          visibility,
          allowList,
          excludeList,
          status,
          scheduledAt: status==='scheduled' && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        });
      } else {
        response = await apiClient.post('/posts', {
          caption,
          media,
          hashtags,
          visibility,
          allowList,
          excludeList,
          status,
          scheduledAt: status==='scheduled' && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        });
      }

      onPostCreated(response.data);
      onClose();
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  const visibilityIcons = {
    public: <Globe className="w-4 h-4" />,
    followers: <Users className="w-4 h-4" />,
    mutuals: <Users className="w-4 h-4" />,
    close_friends: <Lock className="w-4 h-4" />,
    custom: <CheckCircle2 className="w-4 h-4" />,
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 border-b-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">Create Post</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Share your moment</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-all duration-200 hover:scale-110"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          
          {/* User Profile Section */}
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg">
              {user?.profilePic ? (
                <img
                  src={user.profilePic}
                  alt={user.displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                user?.displayName[0].toUpperCase()
              )}
            </div>

            <div className="flex-1 space-y-3">
              <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">{user?.displayName}</p>
              
              {/* Publish Status */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
                  <Clock className="w-4 h-4" /> Publish:
                </label>
                <select
                  className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 text-xs sm:text-sm font-medium transition-all focus:ring-2 focus:ring-blue-500"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="published">Publish now</option>
                  <option value="scheduled">Schedule</option>
                  <option value="draft">Save as Draft</option>
                </select>
                {status === 'scheduled' && (
                  <input 
                    type="datetime-local" 
                    value={scheduledAt} 
                    onChange={(e) => setScheduledAt(e.target.value)} 
                    className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Caption Textarea */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">What's on your mind?</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Share your thoughts, feelings, or ideas..."
              className="w-full px-3 sm:px-4 py-3 sm:py-4 bg-gray-50 dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none text-sm sm:text-base transition-all"
              rows={5}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">{caption.length} characters</p>
            {/* Hashtag suggestions chips */}
            {tagSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tagSuggestions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCaption((c) => (c.includes(t) ? c : (c ? c + ' ' : '') + t))}
                    className="px-2 py-1 rounded-full text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center gap-1"
                  >
                    <Hash className="w-3 h-3" />{t}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={buildCaptionSuggestions}
                  className="ml-auto px-3 py-1.5 rounded-full text-xs bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Suggest captions
                </button>
              </div>
            )}
            {/* Caption suggestions */}
            {showSuggestions && captionSuggestions.length > 0 && (
              <div className="mt-2 p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Suggested:</div>
                <div className="flex flex-col gap-1">
                  {captionSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCaption((c) => (c ? `${s} ${c}` : s))}
                      className="text-left px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Media Section */}
          <div className="space-y-3 sm:space-y-4 p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-700 dark:to-slate-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Add Media (optional)</label>

            {/* Visibility */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1 whitespace-nowrap">
                <Lock className="w-4 h-4" /> Visibility:
              </label>
              <select
                className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-slate-600 text-xs sm:text-sm font-medium transition-all focus:ring-2 focus:ring-blue-500 flex-1"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
              >
                <option value="public">🌍 Public</option>
                <option value="followers">👥 Followers</option>
                <option value="mutuals">🔗 Mutuals</option>
                <option value="close_friends">❤️ Close Friends</option>
                <option value="custom">⚙️ Custom</option>
              </select>
              {visibility === 'custom' && (
                <button 
                  type="button" 
                  onClick={() => setShowAudiencePicker(true)} 
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs sm:text-sm transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                  Choose audience
                </button>
              )}
            </div>

            {/* Media Type Selection */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setMediaType('image')}
                className={`px-3 sm:px-4 py-2 rounded-lg transition-all font-semibold text-xs sm:text-sm flex items-center gap-1.5 ${
                  mediaType === 'image'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-slate-600 hover:border-blue-400'
                }`}
              >
                <FileImage className="w-4 h-4" /> Image
              </button>
              <button
                type="button"
                onClick={() => setMediaType('video')}
                className={`px-3 sm:px-4 py-2 rounded-lg transition-all font-semibold text-xs sm:text-sm flex items-center gap-1.5 ${
                  mediaType === 'video'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-slate-600 hover:border-blue-400'
                }`}
              >
                <FileVideo className="w-4 h-4" /> Video
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  setMediaUrl('');
                  if (f) setMediaType(f.type.startsWith('video') ? 'video' : 'image');
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 sm:px-4 py-2 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-400 transition-all font-semibold text-xs sm:text-sm flex items-center gap-1.5 group hover:scale-105"
              >
                <UploadIcon className="w-4 h-4 group-hover:scale-110 transition-transform" /> Upload
              </button>
            </div>

            {/* URL Input */}
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => {
                setMediaUrl(e.target.value);
                if (e.target.value) setFile(null);
              }}
              placeholder="Or paste media URL (Unsplash/Pexels)"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-xs sm:text-sm transition-all"
            />

            {/* Media Preview */}
            {(preview || mediaUrl) && (
              <div className="relative rounded-lg overflow-hidden shadow-lg border-2 border-gray-300 dark:border-slate-600">
                {mediaType === 'image' ? (
                  <img
                    src={preview || mediaUrl}
                    alt="Preview"
                    className="w-full h-40 sm:h-48 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Invalid+Image';
                    }}
                  />
                ) : (
                  <video src={preview || mediaUrl} className="w-full h-40 sm:h-48 object-cover" controls />
                )}
                <button
                  type="button"
                  onClick={() => { setPreview(''); setFile(null); setMediaUrl(''); }}
                  className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all hover:scale-110"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t-2 border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading || (!caption && !mediaUrl && !file)}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 text-xs sm:text-sm shadow-lg hover:shadow-xl"
            >
              {uploading ? 'Uploading...' : loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>

      {/* Custom Audience Picker Modal */}
      {showAudiencePicker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto border-2 border-gray-200 dark:border-slate-700">
            
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 border-b-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Custom Audience</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Choose who can see this post</p>
              </div>
              <button 
                onClick={() => setShowAudiencePicker(false)} 
                className="px-3 sm:px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold transition-all text-xs sm:text-sm"
              >
                Done
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                
                {/* Include */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                    <CheckCircle2 className="w-5 h-5 text-green-500" /> Include
                  </h4>
                  <div className="max-h-64 overflow-y-auto space-y-2 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border-2 border-gray-200 dark:border-slate-600">
                    {followingList.map((u) => (
                      <label key={u._id} className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer transition text-gray-800 dark:text-gray-200 text-xs sm:text-sm">
                        <input 
                          type="checkbox" 
                          checked={allowList.includes(u._id)} 
                          onChange={(e) => {
                            setAllowList(prev => e.target.checked ? [...prev, u._id] : prev.filter(id => id !== u._id));
                          }}
                          className="w-4 h-4 rounded border-2 border-gray-300 accent-blue-600 cursor-pointer"
                        />
                        <img src={u.profilePic || 'https://via.placeholder.com/32'} alt={u.displayName} className="w-6 h-6 rounded-full object-cover" />
                        <span className="font-medium flex-1 truncate">@{u.username}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Exclude */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                    <X className="w-5 h-5 text-red-500" /> Exclude
                  </h4>
                  <div className="max-h-64 overflow-y-auto space-y-2 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border-2 border-gray-200 dark:border-slate-600">
                    {followingList.map((u) => (
                      <label key={u._id} className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer transition text-gray-800 dark:text-gray-200 text-xs sm:text-sm">
                        <input 
                          type="checkbox" 
                          checked={excludeList.includes(u._id)} 
                          onChange={(e) => {
                            setExcludeList(prev => e.target.checked ? [...prev, u._id] : prev.filter(id => id !== u._id));
                          }}
                          className="w-4 h-4 rounded border-2 border-gray-300 accent-red-600 cursor-pointer"
                        />
                        <img src={u.profilePic || 'https://via.placeholder.com/32'} alt={u.displayName} className="w-6 h-6 rounded-full object-cover" />
                        <span className="font-medium flex-1 truncate">@{u.username}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePostModal;