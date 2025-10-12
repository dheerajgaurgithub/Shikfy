import React from 'react';
import apiClient from '../../api/client';

const Dashboard: React.FC = () => {
  const [data, setData] = React.useState<any>(null);
  React.useEffect(()=>{
    (async()=>{
      try { const r = await apiClient.get('/admin/dashboard/summary'); setData(r.data); } catch {}
    })();
  },[]);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {['users','posts','reels','reportsOpen'].map((k)=> (
        <div key={k} className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">{k}</div>
          <div className="text-2xl font-bold">{data? data[k] : '-'}</div>
        </div>
      ))}
    </div>
  );
};
export default Dashboard;
