import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/client';

const HubDetail: React.FC = () => {
  const { slug } = useParams();
  const [hub, setHub] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await apiClient.get(`/hubs/${slug}/feed`);
        setHub(r.data?.hub);
        setPosts(r.data?.posts || []);
      } catch {}
      finally { setLoading(false); }
    };
    if (slug) load();
  }, [slug]);

  const join = async () => {
    try { await apiClient.post(`/hubs/${slug}/join`); setHub((h:any)=> ({ ...h, membersCount: (h?.membersCount||0)+1 })); } catch {}
  };
  const leave = async () => {
    try { await apiClient.post(`/hubs/${slug}/leave`); setHub((h:any)=> ({ ...h, membersCount: Math.max(0,(h?.membersCount||0)-1) })); } catch {}
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8 text-gray-500 dark:text-gray-400">Loading...</div>;
  if (!hub) return <div className="max-w-3xl mx-auto px-4 py-8 text-gray-500 dark:text-gray-400">Hub not found</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden mb-6">
        <div className="w-full h-40 bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800">
          {hub.cover && <img src={hub.cover} className="w-full h-full object-cover"/>}
        </div>
        <div className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{hub.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">/{hub.slug} • {hub.membersCount} members</div>
          </div>
          <div className="flex gap-2">
            <button onClick={join} className="px-3 py-1.5 rounded bg-blue-600 text-white">Join</button>
            <button onClick={leave} className="px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">Leave</button>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Posts</h2>
      <div className="space-y-3">
        {posts.map((p:any)=> (
          <div key={p._id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">by {p.authorId?.displayName || 'User'}</div>
            {p.richContent && <div className="prose dark:prose-invert"><pre className="whitespace-pre-wrap">{p.richContent}</pre></div>}
            {!p.richContent && p.caption && <div className="text-gray-900 dark:text-white">{p.caption}</div>}
          </div>
        ))}
        {posts.length===0 && <div className="text-gray-500 dark:text-gray-400">No posts yet</div>}
      </div>
    </div>
  );
};

export default HubDetail;
