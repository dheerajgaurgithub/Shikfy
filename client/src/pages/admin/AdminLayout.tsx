import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AdminLayout: React.FC = () => {
  const { user } = useAuth() as any;
  const navigate = useNavigate();
  React.useEffect(()=>{ if (!user || !Array.isArray((user as any).roles) || !(user as any).roles.includes('admin')) navigate('/home'); }, [user, navigate]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Link to="/home" className="text-2xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Shikfy Admin</Link>
        </div>
        <div className="flex gap-3 mb-6">
          <NavLink to="/admin" end className={({isActive})=>`px-3 py-2 rounded-lg font-bold ${isActive? 'bg-blue-600 text-white':'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200'}`}>Dashboard</NavLink>
          <NavLink to="/admin/users" className={({isActive})=>`px-3 py-2 rounded-lg font-bold ${isActive? 'bg-blue-600 text-white':'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200'}`}>Users</NavLink>
          <NavLink to="/admin/posts" className={({isActive})=>`px-3 py-2 rounded-lg font-bold ${isActive? 'bg-blue-600 text-white':'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200'}`}>Posts</NavLink>
          <NavLink to="/admin/reels" className={({isActive})=>`px-3 py-2 rounded-lg font-bold ${isActive? 'bg-blue-600 text-white':'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200'}`}>Reels</NavLink>
          <NavLink to="/admin/reports" className={({isActive})=>`px-3 py-2 rounded-lg font-bold ${isActive? 'bg-blue-600 text-white':'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200'}`}>Reports</NavLink>
          <NavLink to="/admin/audit" className={({isActive})=>`px-3 py-2 rounded-lg font-bold ${isActive? 'bg-blue-600 text-white':'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200'}`}>Audit</NavLink>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
