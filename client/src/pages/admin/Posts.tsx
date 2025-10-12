import React from 'react';
import apiClient from '../../api/client';

const Posts: React.FC = () => {
  const [items, setItems] = React.useState<any[]>([]);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [q, setQ] = React.useState('');
  const limit = 25;
  const load = React.useCallback(async ()=>{
    const r = await apiClient.get('/admin/posts', { params: { page, limit, search: q } });
    setItems(r.data.items || []);
    setTotal(r.data.total || 0);
  }, [page, q]);
  React.useEffect(()=>{ load().catch(()=>{}); }, [load]);

  const del = async (id: string) => {
    if (!window.confirm('Delete this post?')) return;
    await apiClient.delete(`/admin/posts/${id}`);
    setItems(prev=> prev.filter((x)=> x._id!==id));
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
      <div className="flex gap-2 mb-3">
        <input value={q} onChange={(e)=> setQ(e.target.value)} placeholder="Search posts" className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-700" />
        <button onClick={()=> { setPage(1); load(); }} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Search</button>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Caption</th>
              <th className="p-2">Author</th>
              <th className="p-2">Created</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p=> (
              <tr key={p._id} className="border-t border-gray-200 dark:border-slate-700">
                <td className="p-2 max-w-xs truncate">{p.caption}</td>
                <td className="p-2">{String(p.authorId)}</td>
                <td className="p-2">{new Date(p.createdAt).toLocaleString()}</td>
                <td className="p-2 flex gap-2">
                  <button onClick={()=> del(p._id)} className="px-2 py-1 bg-red-600 text-white rounded">Delete</button>
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
export default Posts;
