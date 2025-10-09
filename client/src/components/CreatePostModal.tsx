import React, { useEffect, useRef, useState } from 'react';
import { X, Image as ImageIcon, Upload as UploadIcon, FileVideo, FileImage } from 'lucide-react';
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
    // Load following list only when custom audience is selected and not yet loaded
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

      // If a local file is selected, upload it first
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
        // Create a Reel if user selected a video
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
        // Create a standard Post
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Post</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 flex items-center justify-center text-white font-bold">
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
            <div className="flex-1">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white resize-none"
                rows={4}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Add Media (optional)
            </label>
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMediaType('image')}
                className={`px-4 py-2 rounded-lg transition ${
                  mediaType === 'image'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title="Post as image"
              >
                <FileImage className="w-4 h-4 inline mr-2" /> Image
              </button>
              <button
                type="button"
                onClick={() => setMediaType('video')}
                className={`px-4 py-2 rounded-lg transition ${
                  mediaType === 'video'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title="Post as video"
              >
                <FileVideo className="w-4 h-4 inline mr-2" /> Video
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
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                <UploadIcon className="w-4 h-4 inline mr-2" /> Choose file
              </button>
            </div>

            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => {
                setMediaUrl(e.target.value);
                if (e.target.value) setFile(null);
              }}
              placeholder="Or paste media URL (Unsplash/Pexels)"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            />

            {(preview || mediaUrl) && (
              <div className="relative rounded-lg overflow-hidden">
                { (mediaType === 'image') ? (
                  <img
                    src={preview || mediaUrl}
                    alt="Preview"
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Invalid+Image';
                    }}
                  />
                ) : (
                  <video src={preview || mediaUrl} className="w-full h-48 object-cover" controls />
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading || (!caption && !mediaUrl && !file)}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-pink-600 text-white rounded-lg hover:from-blue-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : loading ? 'Posting...' : 'Post'}
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

export default CreatePostModal;
