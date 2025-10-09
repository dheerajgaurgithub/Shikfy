import React, { useEffect, useRef, useState } from 'react';
import { X, Upload as UploadIcon, FileVideo } from 'lucide-react';
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
      // Upload video
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
          thumbnail: thumbnail || videoUrl, // fallback
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Reel</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Say something about your reel..."
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white resize-none"
            rows={3}
          />

          {/* Visibility selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">Visibility:</label>
            <select
              className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
              value={visibility}
              onChange={(e)=>setVisibility(e.target.value as any)}
            >
              <option value="public">Public</option>
              <option value="followers">Followers</option>
              <option value="mutuals">Mutuals</option>
              <option value="close_friends">Close Friends</option>
              <option value="custom">Custom</option>
            </select>
            {visibility === 'custom' && (
              <button type="button" onClick={()=>setShowAudiencePicker(true)} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200">Choose audience</button>
            )}
          </div>

          {/* Scheduling / Draft */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">Publish:</label>
            <select
              className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
              value={status}
              onChange={(e)=>setStatus(e.target.value as any)}
            >
              <option value="published">Publish now</option>
              <option value="scheduled">Schedule</option>
              <option value="draft">Save as Draft</option>
            </select>
            {status==='scheduled' && (
              <input type="datetime-local" value={scheduledAt} onChange={(e)=>setScheduledAt(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" />
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            <UploadIcon className="w-4 h-4 inline mr-2" /> Choose video
          </button>

          {preview && (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-[9/16]">
              <video src={preview} className="w-full h-full object-contain" controls />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploading || posting}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-pink-600 text-white rounded-lg hover:from-blue-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading || posting ? 'Creating…' : 'Create Reel'}
            </button>
          </div>
        </form>
      </div>
      {showAudiencePicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Custom audience</h3>
              <button onClick={()=>setShowAudiencePicker(false)} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">Done</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-medium mb-2 text-gray-900 dark:text-white">Include</div>
                <div className="max-h-64 overflow-auto space-y-2">
                  {followingList.map((u)=> (
                    <label key={u._id} className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                      <input type="checkbox" checked={allowList.includes(u._id)} onChange={(e)=>{
                        setAllowList(prev => e.target.checked ? [...prev, u._id] : prev.filter(id=>id!==u._id));
                      }} />
                      <img src={u.profilePic || 'https://via.placeholder.com/24'} className="w-6 h-6 rounded-full" />
                      <span>@{u.username}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-medium mb-2 text-gray-900 dark:text-white">Exclude</div>
                <div className="max-h-64 overflow-auto space-y-2">
                  {followingList.map((u)=> (
                    <label key={u._id} className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                      <input type="checkbox" checked={excludeList.includes(u._id)} onChange={(e)=>{
                        setExcludeList(prev => e.target.checked ? [...prev, u._id] : prev.filter(id=>id!==u._id));
                      }} />
                      <img src={u.profilePic || 'https://via.placeholder.com/24'} className="w-6 h-6 rounded-full" />
                      <span>@{u.username}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateReelModal;
