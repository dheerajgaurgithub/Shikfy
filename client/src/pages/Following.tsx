import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const Following: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await apiClient.get(`/users/${id}/following`);
        setUsers(r.data || []);
      } catch {}
      finally { setLoading(false); }
    };
    if (id) load();
  }, [id]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={()=>navigate(`/profile/${id}`)} className="px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">← Back</button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Following</h1>
      </div>
      {loading ? (
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      ) : users.length===0 ? (
        <div className="text-gray-500 dark:text-gray-400">Not following anyone yet</div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {users.map(u => (
            <div key={u._id} className="flex items-center gap-3 py-3">
              <Link to={`/profile/${u._id}`} className="flex items-center gap-3 flex-1">
                <img src={u.profilePic || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full" />
                <div>
                  <div className="text-gray-900 dark:text-white font-medium">{u.displayName}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">@{u.username}</div>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                {me?.id === id && (
                  <button onClick={async ()=>{
                    if (!window.confirm(`Unfollow @${u.username}?`)) return;
                    try { await apiClient.delete(`/users/${u._id}/follow`); setUsers(prev=> prev.filter(x=> x._id!==u._id)); }
                    catch (e:any) { alert(e?.response?.data?.error || 'Failed to unfollow'); }
                  }} className="px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">Unfollow</button>
                )}
                <button onClick={async ()=>{
                  try { const r = await apiClient.post('/chats', { type: 'dm', memberIds: [u._id] }); window.location.href = `/chats?chatId=${r.data._id}`; }
                  catch { alert('Failed to open chat'); }
                }} className="px-3 py-1.5 rounded bg-blue-600 text-white">Message</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Following;
