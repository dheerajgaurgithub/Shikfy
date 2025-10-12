import React from 'react';
import apiClient from '../../api/client';

const Users: React.FC = () => {
  const [items, setItems] = React.useState<any[]>([]);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [q, setQ] = React.useState('');
  const limit = 25;
  const load = React.useCallback(async ()=>{
    const r = await apiClient.get('/admin/users', { params: { page, limit, search: q } });
    setItems(r.data.items || []);
    setTotal(r.data.total || 0);
  }, [page, q]);
  React.useEffect(()=>{ load().catch(()=>{}); }, [load]);

  const block = async (id: string) => {
    const until = window.prompt('Block until (YYYY-MM-DD) or leave blank for permanent:');
    const reason = window.prompt('Reason for block:') || 'policy_violation';
    await apiClient.patch(`/admin/users/${id}/block`, { until: until? new Date(until): null, reason });
    alert('User blocked');
  };
  const unblock = async (id: string) => {
    await apiClient.patch(`/admin/users/${id}/unblock`);
    alert('User unblocked');
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
      <div className="flex gap-2 mb-3">
        <input value={q} onChange={(e)=> setQ(e.target.value)} placeholder="Search users" className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-700" />
        <button onClick={()=> { setPage(1); load(); }} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Search</button>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Username</th>
              <th className="p-2">Email</th>
              <th className="p-2">Created</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(u=> (
              <tr key={u._id} className="border-t border-gray-200 dark:border-slate-700">
                <td className="p-2">{u.username}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">{new Date(u.createdAt).toLocaleString()}</td>
                <td className="p-2 flex gap-2">
                  <button onClick={()=> block(u._id)} className="px-2 py-1 bg-red-600 text-white rounded">Block</button>
                  <button onClick={()=> unblock(u._id)} className="px-2 py-1 bg-green-600 text-white rounded">Unblock</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-3">
        <div>Total: {total}</div>
        <div className="flex gap-2">
          <button disabled={page===1} onClick={()=> setPage(p=> p-1)} className="px-2 py-1 rounded bg-gray-200 dark:bg-slate-700 disabled:opacity-50">Prev</button>
          <button disabled={(page*limit)>=total} onClick={()=> setPage(p=> p+1)} className="px-2 py-1 rounded bg-gray-200 dark:bg-slate-700 disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
};
export default Users;
