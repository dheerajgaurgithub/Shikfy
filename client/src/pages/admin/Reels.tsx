import React from 'react';
import apiClient from '../../api/client';

const Reels: React.FC = () => {
  const [items, setItems] = React.useState<any[]>([]);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const limit = 25;
  const load = React.useCallback(async ()=>{
    const r = await apiClient.get('/admin/reels', { params: { page, limit } });
    setItems(r.data.items || []);
    setTotal(r.data.total || 0);
  }, [page]);
  React.useEffect(()=>{ load().catch(()=>{}); }, [load]);

  const del = async (id: string) => {
    if (!window.confirm('Delete this reel?')) return;
    await apiClient.delete(`/admin/reels/${id}`);
    setItems(prev=> prev.filter((x)=> x._id!==id));
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">ID</th>
              <th className="p-2">Author</th>
              <th className="p-2">Created</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(r=> (
              <tr key={r._id} className="border-t border-gray-200 dark:border-slate-700">
                <td className="p-2">{r._id}</td>
                <td className="p-2">{String(r.authorId)}</td>
                <td className="p-2">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="p-2 flex gap-2">
                  <button onClick={()=> del(r._id)} className="px-2 py-1 bg-red-600 text-white rounded">Delete</button>
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
export default Reels;
