import React, { useEffect, useRef, useState } from 'react';
import { X, Upload as UploadIcon, FileVideo, Eye, Users, Lock, Heart, Calendar, Clock, Sparkles } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface CreateReelModalProps {
  onClose: () => void;
  onReelCreated: (reel: any) => void;
}

const CreateReelModal = ({ onClose, onReelCreated }: CreateReelModalProps) => {
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
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
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const loadFollowing = async () => {
      if (visibility !== 'custom' || followingList.length > 0 || !user?.id) return;
      try {
        const res = await apiClient.get(`/users/${user.id}/following`);
        setFollowingList(res.data || []);
      } catch (e) {
        console.error('Failed to load following', e);
      }
    };
    loadFollowing();
  }, [visibility, user?.id, followingList.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !caption) return;

    try {
      setUploading(true);
      let videoUrl = '';
      let thumbnail = '';
      let duration: number | undefined = undefined;

      if (file) {
        const form = new FormData();
        form.append('file', file);
        const uploadRes = await apiClient.post('/uploads/single', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        videoUrl = uploadRes.data.url;
        thumbnail = uploadRes.data.thumbnail || '';
        duration = uploadRes.data.duration;
      }

      setPosting(true);
      const hashtags = caption.match(/#\w+/g)?.map(t => t.slice(1)) || [];

      const res = await apiClient.post('/reels', {
        caption,
        video: {
          url: videoUrl,
          thumbnail: thumbnail || videoUrl,
          duration: duration || 0,
        },
        hashtags,
        visibility,
        allowList,
        excludeList,
        status,
        scheduledAt: status==='scheduled' && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      });

      onReelCreated(res.data);
      onClose();
    } catch (err) {
      console.error('Failed to create reel:', err);
      alert('Failed to create reel. Please try again.');
    } finally {
      setUploading(false);
      setPosting(false);
    }
  };

  const visibilityIcons = {
    public: Eye,
    followers: Users,
    mutuals: Heart,
    close_friends: Lock,
    custom: Users
  };

  const VisibilityIcon = visibilityIcons[visibility];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200/50 dark:border-gray-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-gradient-to-b from-pink-500 via-purple-500 to-blue-500 rounded-full"></div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Create Reel</h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Share your video moment</p>
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
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            
            {/* Caption Input */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileVideo className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                <label className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Caption</label>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Say something about your reel... Use #hashtags to reach more people!"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-500 text-gray-900 dark:text-white resize-none outline-none transition-all placeholder:text-gray-400"
                rows={4}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-right">{caption.length} characters</p>
            </div>

            {/* Video Upload */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                  <span className="text-white text-xs">🎬</span>
                </div>
                <label className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Video</label>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />

              {!preview ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-[9/16] max-h-96 rounded-2xl border-3 border-dashed border-gray-300 dark:border-gray-600 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 hover:from-purple-100 hover:to-pink-100 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all flex flex-col items-center justify-center gap-4 group"
                  >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all">
                      <UploadIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1">Upload Video</p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Click to choose a video file</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">MP4, MOV, AVI up to 100MB</p>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-96 mx-auto border-2 border-gray-200/50 dark:border-gray-700/50 shadow-2xl">
                    <video src={preview} className="w-full h-full object-contain" controls />
                    <div className="absolute top-3 right-3">
                      <button
                        type="button"
                        onClick={() => {setFile(null); setPreview('');}}
                        className="p-2 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-all group"
                      >
                        <X className="w-4 h-4 text-white group-hover:rotate-90 transition-transform" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-600 text-gray-900 dark:text-white font-semibold hover:from-purple-100 hover:to-pink-100 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all border border-purple-200 dark:border-gray-600 flex items-center justify-center gap-2"
                  >
                    <UploadIcon className="w-4 h-4" />
                    Change Video
                  </button>
                </div>
              )}
            </div>

            {/* Visibility Settings */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <VisibilityIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                <label className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Visibility</label>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <select
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-gray-700 dark:to-gray-600 border-2 border-blue-200 dark:border-gray-600 text-gray-900 dark:text-white font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                  value={visibility}
                  onChange={(e)=>setVisibility(e.target.value as any)}
                >
                  <option value="public">🌍 Public - Everyone can see</option>
                  <option value="followers">👥 Followers Only</option>
                  <option value="mutuals">🤝 Mutual Followers</option>
                  <option value="close_friends">💚 Close Friends</option>
                  <option value="custom">⚙️ Custom Audience</option>
                </select>
                
                {visibility === 'custom' && (
                  <button 
                    type="button" 
                    onClick={()=>setShowAudiencePicker(true)} 
                    className="px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
                  >
                    Choose Audience
                  </button>
                )}
              </div>
            </div>

            {/* Publishing Options */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                <label className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Publishing</label>
              </div>
              
              <div className="flex flex-col gap-3">
                <select
                  className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 border-2 border-green-200 dark:border-gray-600 text-gray-900 dark:text-white font-medium focus:ring-4 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all cursor-pointer"
                  value={status}
                  onChange={(e)=>setStatus(e.target.value as any)}
                >
                  <option value="published">✅ Publish Immediately</option>
                  <option value="scheduled">📅 Schedule for Later</option>
                  <option value="draft">📝 Save as Draft</option>
                </select>
                
                {status==='scheduled' && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-gray-700 dark:to-gray-600 border border-orange-200 dark:border-gray-600">
                    <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />
                    <input 
                      type="datetime-local" 
                      value={scheduledAt} 
                      onChange={(e)=>setScheduledAt(e.target.value)} 
                      className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-orange-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                    />
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
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
              onClick={handleSubmit}
              disabled={!file || uploading || posting}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 text-white rounded-xl font-bold hover:from-pink-700 hover:via-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
            >
              {uploading || posting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{uploading ? 'Uploading...' : 'Creating...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Create Reel</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Audience Picker Modal */}
      {showAudiencePicker && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50 animate-in zoom-in-95 duration-300">
            
            {/* Audience Picker Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200/50 dark:border-gray-700/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-gradient-to-b from-blue-500 via-cyan-500 to-teal-500 rounded-full"></div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Custom Audience</h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Choose who can see this reel</p>
                </div>
              </div>
              <button 
                onClick={()=>setShowAudiencePicker(false)} 
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md"
              >
                Done
              </button>
            </div>

            {/* Audience Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6 overflow-y-auto custom-scrollbar">
              
              {/* Include List */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm pb-2 z-10">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-md">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Include</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Who can see this</p>
                  </div>
                  {allowList.length > 0 && (
                    <span className="ml-auto px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">
                      {allowList.length}
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 max-h-96 overflow-auto custom-scrollbar pr-2">
                  {followingList.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                      Loading followers...
                    </div>
                  ) : (
                    followingList.map((u)=> (
                      <label 
                        key={u._id} 
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer group"
                      >
                        <input 
                          type="checkbox" 
                          checked={allowList.includes(u._id)} 
                          onChange={(e)=>{
                            setAllowList(prev => e.target.checked ? [...prev, u._id] : prev.filter(id=>id!==u._id));
                          }} 
                          className="w-5 h-5 rounded-lg border-2 border-gray-300 dark:border-gray-500 text-green-600 focus:ring-4 focus:ring-green-500/20 cursor-pointer"
                        />
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 p-0.5 group-hover:scale-110 transition-transform">
                          <img src={u.profilePic || 'https://via.placeholder.com/40'} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-gray-800" alt={u.username} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{u.displayName || u.username}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{u.username}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Exclude List */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm pb-2 z-10">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-md">
                    <span className="text-white text-sm font-bold">✕</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Exclude</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Who can't see this</p>
                  </div>
                  {excludeList.length > 0 && (
                    <span className="ml-auto px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold">
                      {excludeList.length}
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 max-h-96 overflow-auto custom-scrollbar pr-2">
                  {followingList.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                      Loading followers...
                    </div>
                  ) : (
                    followingList.map((u)=> (
                      <label 
                        key={u._id} 
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer group"
                      >
                        <input 
                          type="checkbox" 
                          checked={excludeList.includes(u._id)} 
                          onChange={(e)=>{
                            setExcludeList(prev => e.target.checked ? [...prev, u._id] : prev.filter(id=>id!==u._id));
                          }} 
                          className="w-5 h-5 rounded-lg border-2 border-gray-300 dark:border-gray-500 text-red-600 focus:ring-4 focus:ring-red-500/20 cursor-pointer"
                        />
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-pink-400 p-0.5 group-hover:scale-110 transition-transform">
                          <img src={u.profilePic || 'https://via.placeholder.com/40'} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-gray-800" alt={u.username} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{u.displayName || u.username}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{u.username}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #ec4899, #a855f7, #3b82f6);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #db2777, #9333ea, #2563eb);
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

export default CreateReelModal;