import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import { Link } from 'react-router-dom';

interface SugUser {
  _id: string;
  username: string;
  displayName: string;
  profilePic?: string;
  verified?: boolean;
  bio?: string;
  mutuals?: number;
  score?: number;
}

const Suggestions: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<SugUser[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const load = async (p = 1) => {
    if (!user?.id || loading) return;
    try {
      setLoading(true);
      const r = await apiClient.get(`/users/${user.id}/suggestions?page=${p}&limit=20`);
      const data = r.data || { items: [], hasMore: false };
      setItems(prev => (p === 1 ? data.items : [...prev, ...data.items]));
      setHasMore(!!data.hasMore);
      setPage(p);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(()=>{ if (user?.id) load(1); }, [user?.id]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suggestions</h1>
        <button onClick={()=> load(1)} className="px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">Refresh</button>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {items.length === 0 && !loading && (
          <div className="p-6 text-gray-500 dark:text-gray-400">No suggestions right now.</div>
        )}
        {items.map(u => (
          <div key={u._id} className="flex items-center justify-between p-4">
            <Link to={`/profile/${u._id}`} className="flex items-center gap-3">
              <div className="relative">
                <img src={u.profilePic || 'https://via.placeholder.com/40'} className="w-12 h-12 rounded-full" />
                {u.mutuals && u.mutuals > 0 && (
                  <span className="absolute -bottom-1 -right-1 text-[10px] px-1 rounded bg-blue-600 text-white">{u.mutuals}</span>
                )}
              </div>
              <div>
                <div className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
                  {u.displayName}
                  {u.verified && <span className="text-[10px] px-1 rounded bg-blue-600 text-white">✔</span>}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">@{u.username}</div>
                {u.bio && <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 max-w-[38ch]">{u.bio}</div>}
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <button onClick={async ()=>{
                try { await apiClient.post(`/users/${u._id}/follow`); setItems(prev=> prev.filter(x=> x._id!==u._id)); }
                catch {}
              }} className="px-3 py-1.5 rounded bg-blue-600 text-white">Follow</button>
              <button onClick={async ()=>{
                try { const r = await apiClient.post('/chats', { type: 'dm', memberIds: [u._id] }); window.location.href = `/chats?chatId=${r.data._id}`; }
                catch {}
              }} className="px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">Message</button>
            </div>
          </div>
        ))}
        {loading && <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading...</div>}
      </div>

      {hasMore && (
        <button onClick={()=> load(page+1)} disabled={loading} className="mt-4 w-full py-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50">
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
};

export default Suggestions;
