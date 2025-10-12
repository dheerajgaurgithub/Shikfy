import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Film, LogOut, Menu, X, MessageSquare, Plus, Compass, Settings, User, Bell, Grid } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import { io as socketIO } from 'socket.io-client';
import { useAppDispatch } from '../store';
import { addNotification } from '../store/slices/notificationsSlice';
import CreatePostModal from './CreatePostModal';
import lightLogo from '../lightlogo.png';
import darkLogo from '../darklogo.png';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [chatsUnread, setChatsUnread] = useState<number>(0);
  const [notifUnread, setNotifUnread] = useState<number>(0);
  const dispatch = useAppDispatch();
  const [showCreatePicker, setShowCreatePicker] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    const hasDarkClass = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    if (hasDarkClass) return true;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const logoSrc = isDark ? darkLogo : lightLogo;

  useEffect(()=>{
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const handler = (e: MediaQueryListEvent)=> {
      // Only update from media query if the app isn't forcing a theme with the 'dark' class
      const forced = document.documentElement.classList.contains('dark') || document.documentElement.classList.contains('light');
      if (!forced) setIsDark(e.matches);
    };
    mq?.addEventListener?.('change', handler);

    // Observe Tailwind 'dark' class changes to reflect actual app theme
    const observer = new MutationObserver(() => {
      const hasDark = document.documentElement.classList.contains('dark');
      setIsDark(hasDark);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return ()=> {
      mq?.removeEventListener?.('change', handler as any);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await apiClient.get('/chats/unread-count');
        if (active) setChatsUnread(Number(res.data?.count || 0));
      } catch {}
    };
    if (user?.id) load();
    const onFocus = () => { if (user?.id) load(); };
    const onUnread = (e: any) => { if (typeof e?.detail?.count === 'number') setChatsUnread(e.detail.count); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('chats:unread', onUnread as any);
    return () => { active = false; window.removeEventListener('focus', onFocus); window.removeEventListener('chats:unread', onUnread as any); };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const r = await apiClient.get('/notifications/unread-count');
        if (active) setNotifUnread(r.data?.count || 0);
      } catch {}
      try {
        const s = socketIO(import.meta.env.VITE_API_BASE?.replace('/api', '') || 'http://localhost:3001', { withCredentials: true });
        s.on('connect', () => {
          if (user?.id) s.emit('user:online', user.id);
        });
        s.on('notification:new', (n: any) => {
          if (n?.targetUserId && user?.id && n.targetUserId !== user.id) return;
          dispatch(addNotification({
            _id: n._id || Math.random().toString(36).slice(2),
            type: (n.type || 'message') as any,
            createdAt: n.createdAt || new Date().toISOString(),
            data: n.data,
            read: false,
          } as any));
          setNotifUnread((c) => c + 1);
          if ((n.type === 'message' || n.data?.kind === 'message')) {
            setChatsUnread((c) => c + 1);
          }
        });
        return () => { try { s.disconnect(); } catch {} };
      } catch {}
    };
    if (user?.id) {
      let socketCleanup: (() => void) | undefined;
      init().then((ret: any) => { if (typeof ret === 'function') socketCleanup = ret; }).catch(() => { });
      const onNotifUnread = (e: any) => { if (typeof e?.detail?.count === 'number') setNotifUnread(e.detail.count); };
      window.addEventListener('notifications:unread', onNotifUnread as any);
      return () => { active = false; if (socketCleanup) socketCleanup(); window.removeEventListener('notifications:unread', onNotifUnread as any); };
    }
  }, [user?.id, dispatch]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = Array.isArray((user as any)?.roles) && (user as any).roles.includes('admin');
  const navItems = isAdmin
    ? [
        { icon: Home, label: 'Home', path: '/home' },
        { icon: Compass, label: 'Explore', path: '/explore' },
        { icon: User, label: 'Users', path: '/admin/users' },
        { icon: Grid, label: 'Posts', path: '/admin/posts' },
        { icon: Film, label: 'Reels', path: '/admin/reels' },
        { icon: Bell, label: 'Reports', path: '/admin/reports' },
        { icon: Bell, label: 'Notifications', path: '/notifications', badge: notifUnread },
      ]
    : [
        { icon: Home, label: 'Home', path: '/home' },
        { icon: Compass, label: 'Explore', path: '/explore' },
        { icon: Film, label: 'Reels', path: '/reels' },
        { icon: MessageSquare, label: 'Messages', path: '/chats', badge: chatsUnread },
        { icon: Bell, label: 'Notifications', path: '/notifications', badge: notifUnread },
      ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
      <div className="lg:flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-r-2 border-gray-200 dark:border-slate-700 shadow-xl">
          <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 px-6 mb-8 group">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-pink-600 rounded-lg blur opacity-0 group-hover:opacity-75 transition duration-500"></div>
                <img src={logoSrc} alt="Shikfy" className="relative w-12 h-12 object-contain" />
              </div>
              <span className="text-2xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Shikfy
              </span>
            </Link>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const badgeCount = Number(item.badge || 0);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-300 group ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-lg'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${isActive ? 'group-hover:scale-110' : 'group-hover:scale-110'} transition-transform`} />
                    <span className="flex items-center gap-2">
                      {item.label}
                      {badgeCount > 0 && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                          isActive ? 'bg-white/30 text-white' : 'bg-blue-600 text-white'
                        }`}>
                          {badgeCount}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}

              {/* Divider */}
              <div className="my-3 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-slate-700 to-transparent"></div>

              {/* Create Button */}
              <button
                onClick={() => setShowCreatePicker(true)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-300 text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 group"
              >
                <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                Create
              </button>

              {/* Settings */}
              <Link
                to="/settings"
                className="flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-300 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700/50 group"
              >
                <Settings className="w-6 h-6 group-hover:rotate-180 transition-transform" />
                Settings
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 group"
              >
                <LogOut className="w-6 h-6" />
                Logout
              </button>
            </nav>

            {/* Profile Card */}
            <div className="flex-shrink-0 border-t-2 border-gray-200 dark:border-slate-700 p-4">
              <Link to={user?.id ? `/profile/${user.id}` : '/profile'} className="flex items-center gap-3 group p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-all">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-transform">
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
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {user?.displayName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user?.username}</p>
                </div>
              </Link>
            </div>
          </div>
        </aside>

        <div className="lg:pl-72 flex flex-col flex-1">
          {/* Mobile Header */}
          <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b-2 border-gray-200 dark:border-slate-700 shadow-lg">
            <Link to="/" className="flex items-center gap-2 group flex-1">
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-pink-600 rounded-lg blur opacity-0 group-hover:opacity-75 transition duration-500"></div>
                <img src={logoSrc} alt="Shikfy" className="relative w-11 h-11 object-contain" />
              </div>
              <span className="text-lg font-black bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">Shikfy</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                to={user?.id ? `/profile/${user.id}` : '/profile'}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                aria-label="Profile"
              >
                {user?.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt={user.displayName || 'Profile'}
                    className="w-9 h-9 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {(user?.displayName || 'U')[0].toUpperCase()}
                  </div>
                )}
              </Link>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              >
                {showMobileMenu ? (
                  <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                )}
              </button>
            </div>
          </header>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <div className="lg:hidden fixed inset-0 top-16 z-50 bg-white dark:bg-slate-800 border-t-2 border-gray-200 dark:border-slate-700 shadow-xl">
              <div className="p-4 space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const badgeCount = Number(item.badge || 0);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMobileMenu(false)}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-pink-600 text-white shadow-lg'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="flex items-center gap-2">
                        {item.label}
                        {badgeCount > 0 && (
                          <span className={`text-xs px-2 py-1 rounded-full font-bold ${isActive ? 'bg-white/30 text-white' : 'bg-red-600 text-white'}`}>
                            {badgeCount}
                          </span>
                        )}
                      </span>
                    </Link>
                  );
                })}

                <div className="my-2 h-px bg-gray-200 dark:bg-slate-700"></div>

                <button
                  onClick={() => {
                    setShowCreatePicker(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Create
                </button>

                <Link
                  to="/settings"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <Settings className="w-5 h-5" />
                  Settings
                </Link>

                <button
                  onClick={() => {
                    handleLogout();
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>

      {/* Create Picker Modal */}
      {showCreatePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-sm rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border-2 border-gray-200 dark:border-slate-700 overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-gray-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-700 dark:to-slate-700">
              <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">What do you want to create?</h3>
              <button 
                onClick={() => setShowCreatePicker(false)} 
                className="p-2 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
            </div>

            {/* Options */}
            <div className="p-4 sm:p-6 space-y-3">
              <button 
                onClick={() => { setShowCreatePicker(false); setShowCreatePost(true); }} 
                className="w-full px-4 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 hover:from-blue-200 hover:to-blue-100 dark:hover:from-blue-900/50 dark:hover:to-blue-800/40 text-gray-900 dark:text-white font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-3 border-2 border-blue-200 dark:border-blue-800"
              >
                <Plus className="w-5 h-5" />
                Post
              </button>
              
              <button 
                onClick={() => { setShowCreatePicker(false); navigate('/live'); }} 
                className="w-full px-4 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/20 hover:from-red-200 hover:to-red-100 dark:hover:from-red-900/50 dark:hover:to-red-800/40 text-gray-900 dark:text-white font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-3 border-2 border-red-200 dark:border-red-800"
              >
                <Film className="w-5 h-5" />
                Live Video
              </button>
              
              <button 
                onClick={() => { setShowCreatePicker(false); navigate('/reels'); }} 
                className="w-full px-4 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 hover:from-purple-200 hover:to-purple-100 dark:hover:from-purple-900/50 dark:hover:to-purple-800/40 text-gray-900 dark:text-white font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-3 border-2 border-purple-200 dark:border-purple-800"
              >
                <Film className="w-5 h-5" />
                Reel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Composer Modal */}
      {showCreatePost && (
        <CreatePostModal
          onClose={() => setShowCreatePost(false)}
          onPostCreated={() => setShowCreatePost(false)}
        />
      )}
    </div>
  );
};

export default Layout;