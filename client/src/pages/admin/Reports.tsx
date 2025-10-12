import React from 'react';
import apiClient from '../../api/client';

const Reports: React.FC = () => {
  const [items, setItems] = React.useState<any[]>([]);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [type, setType] = React.useState('');
  const [status, setStatus] = React.useState('open');
  const limit = 25;
  const load = React.useCallback(async ()=>{
    const r = await apiClient.get('/admin/reports', { params: { page, limit, type, status } });
    setItems(r.data.items || []);
    setTotal(r.data.total || 0);
  }, [page, type, status]);
  React.useEffect(()=>{ load().catch(()=>{}); }, [load]);

  const resolve = async (id: string) => {
    const resolution = window.prompt('Resolution note:') || 'resolved';
    await apiClient.patch(`/admin/reports/${id}/resolve`, { resolution });
    setItems(prev=> prev.filter((x)=> x._id!==id));
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
      <div className="flex gap-2 mb-3">
        <select value={type} onChange={(e)=> setType(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-700">
          <option value="">All types</option>
          <option value="account">Account</option>
          <option value="post">Post</option>
          <option value="reel">Reel</option>
        </select>
        <select value={status} onChange={(e)=> setStatus(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-700">
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
        <button onClick={()=> { setPage(1); load(); }} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Apply</button>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Type</th>
              <th className="p-2">Target</th>
              <th className="p-2">From</th>
              <th className="p-2">Reason</th>
              <th className="p-2">Created</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(r=> (
              <tr key={r._id} className="border-t border-gray-200 dark:border-slate-700">
                <td className="p-2">{r.type}</td>
                <td className="p-2">{r.targetId}</td>
                <td className="p-2">{r.fromUserId}</td>
                <td className="p-2">{r.reason}</td>
                <td className="p-2">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="p-2 flex gap-2">
                  {status!== 'resolved' && <button onClick={()=> resolve(r._id)} className="px-2 py-1 bg-green-600 text-white rounded">Resolve</button>}
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
export default Reports;
