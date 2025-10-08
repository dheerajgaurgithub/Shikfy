import React, { useEffect, useRef, useState } from 'react';
import { X, Upload as UploadIcon, FileVideo } from 'lucide-react';
import apiClient from '../api/client';

interface CreateReelModalProps {
  onClose: () => void;
  onReelCreated: (reel: any) => void;
}

const CreateReelModal = ({ onClose, onReelCreated }: CreateReelModalProps) => {
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

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
    </div>
  );
};

export default CreateReelModal;
