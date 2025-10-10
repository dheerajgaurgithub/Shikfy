import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

const Hubs: React.FC = () => {
  const [hubs, setHubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const r = await apiClient.get('/hubs');
        setHubs(r.data || []);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const createHub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await apiClient.post('/hubs', { name, slug, description });
      setHubs(prev => [r.data, ...prev]);
      setName(''); setSlug(''); setDescription('');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to create hub');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Hubs</h1>

      <form onSubmit={createHub} className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-2">
        <input className="px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} />
        <input className="px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Slug" value={slug} onChange={(e)=>setSlug(e.target.value)} />
        <input className="px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Description" value={description} onChange={(e)=>setDescription(e.target.value)} />
        <button className="px-4 py-2 rounded bg-blue-600 text-white">Create</button>
      </form>

      {loading ? (
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      ) : hubs.length===0 ? (
        <div className="text-gray-500 dark:text-gray-400">No hubs yet</div>
      ) : (
        <div className="space-y-3">
          {hubs.map(h => (
            <Link key={h._id} to={`/h/${h.slug}`} className="block p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="font-semibold text-gray-900 dark:text-white">{h.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">/{h.slug} • {h.membersCount} members</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Hubs;
