import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Film, User, Heart, Bookmark, Settings, LogOut, Menu, X, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import logo from '../logo.png';
import { io as socketIO } from 'socket.io-client';
import { useAppDispatch } from '../store';
import { addNotification, setNotifications } from '../store/slices/notificationsSlice';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [chatsCount, setChatsCount] = useState<number>(0);
  const [notifUnread, setNotifUnread] = useState<number>(0);
  const dispatch = useAppDispatch();

  useEffect(()=>{
    let active = true;
    const load = async () => {
      try {
        const res = await apiClient.get('/chats');
        if (active) setChatsCount(Array.isArray(res.data) ? res.data.length : 0);
      } catch {}
    };
    if (user?.id) load();
    return ()=>{ active=false };
  }, [user?.id]);

  // notifications: fetch unread count and listen to socket events
  useEffect(()=>{
    let active = true;
    const init = async () => {
      try {
        const r = await apiClient.get('/notifications/unread-count');
        if (active) setNotifUnread(r.data?.count || 0);
      } catch {}
      try {
        const s = socketIO(import.meta.env.VITE_API_BASE?.replace('/api','') || 'http://localhost:3001', { withCredentials: true });
        s.on('connect', ()=>{
          if (user?.id) s.emit('user:online', user.id);
        });
        s.on('notification:new', (n:any)=>{
          // only count if notification targets current user
          if (n?.targetUserId && user?.id && n.targetUserId !== user.id) return;
          dispatch(addNotification({
            _id: n._id || Math.random().toString(36).slice(2),
            type: (n.type || 'message') as any,
            createdAt: n.createdAt || new Date().toISOString(),
            data: n.data,
            read: false,
          } as any));
          setNotifUnread((c)=> c+1);
        });
        return () => { try { s.disconnect(); } catch {} };
      } catch {}
    };
    if (user?.id) {
      const cleanup = init();
      return () => { active=false; if (typeof cleanup === 'function') cleanup(); };
    }
  }, [user?.id, dispatch]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Explore', path: '/explore' },
    { icon: Film, label: 'Reels', path: '/reels' },
    { icon: Heart, label: 'Notifications', path: '/notifications' },
    { icon: Bookmark, label: 'Saved', path: '/saved' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: MessageSquare, label: 'Messages', path: '/chats' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="lg:flex">
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <Link to="/" className="flex items-center flex-shrink-0 px-6 mb-8">
              <img src={logo} alt="Shikfy" className="w-8 h-8 object-contain" />
              <span className="ml-2 text-2xl font-bold bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">
                Shikfy
              </span>
            </Link>

            <nav className="flex-1 px-3 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-pink-600 text-white shadow-lg'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-6 h-6 mr-3" />
                    <span className="flex items-center gap-2">
                      {item.label}
                      {item.label==='Messages' && chatsCount>0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isActive? 'bg-white/20 text-white' : 'bg-blue-600 text-white'}`}>{chatsCount}</span>
                      )}
                      {item.label==='Notifications' && notifUnread>0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isActive? 'bg-white/20 text-white' : 'bg-red-600 text-white'}`}>{notifUnread}</span>
                      )}
                    </span>
                  </Link>
                );
              })}

              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
              >
                <LogOut className="w-6 h-6 mr-3" />
                Logout
              </button>
            </nav>

            <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4">
              <Link to={user?.id ? `/profile/${user.id}` : '/profile'} className="flex items-center w-full group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 flex items-center justify-center text-white font-bold">
                  {user?.profilePic ? (
                    <img
                      src={user.profilePic}
                      alt={user.displayName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    user?.displayName?.[0].toUpperCase()
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 transition">
                    {user?.displayName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">@{user?.username}</p>
                </div>
              </Link>
            </div>
          </div>
        </aside>

        <div className="lg:pl-64 flex flex-col flex-1">
          <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <Link to="/" className="flex items-center">
              <img src={logo} alt="Shikfy" className="w-7 h-7 object-contain" />
              <span className="ml-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">
                Shikfy
              </span>
            </Link>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              {showMobileMenu ? (
                <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          </header>

          {showMobileMenu && (
            <div className="lg:hidden fixed inset-0 z-50 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <Link to="/" className="flex items-center" onClick={() => setShowMobileMenu(false)}>
                  <img src={logo} alt="Shikfy" className="w-7 h-7 object-contain" />
                  <span className="ml-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">
                    Shikfy
                  </span>
                </Link>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
              </div>

              <nav className="p-4 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMobileMenu(false)}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-pink-600 text-white shadow-lg'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-6 h-6 mr-3" />
                      {item.label}
                    </Link>
                  );
                })}

                <button
                  onClick={() => {
                    handleLogout();
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  <LogOut className="w-6 h-6 mr-3" />
                  Logout
                </button>
              </nav>
            </div>
          )}

          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
