import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus, Bell, Sparkles, Check, X } from 'lucide-react';
import apiClient from '../api/client';

const Notifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await apiClient.get('/notifications');
        setNotifications(response.data);
        // broadcast current unread count to nav badges
        try {
          const unread = Array.isArray(response.data)
            ? response.data.filter((n: any) => !n.readAt).length
            : 0;
          window.dispatchEvent(new CustomEvent('notifications:unread', { detail: { count: unread } }));
        } catch {}
        // mark all as read when viewing notifications
        try {
          await apiClient.patch('/notifications/mark-all-read');
          const now = new Date().toISOString();
          setNotifications(prev => prev.map(n => ({ ...n, readAt: now })));
          window.dispatchEvent(new CustomEvent('notifications:unread', { detail: { count: 0 } }));
        } catch {}
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-500/30">
            <Heart className="w-6 h-6 text-white fill-white" />
          </div>
        );
      case 'comment':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
        );
      case 'report':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Bell className="w-6 h-6 text-white" />
          </div>
        );
      case 'follow':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow-lg">
            <Bell className="w-6 h-6 text-white" />
          </div>
        );
    }
  };

  const getMessage = (notification: any) => {
    switch (notification.type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      case 'report': {
        const t = notification.payload?.targetType || (notification.postId? 'post' : notification.reelId? 'reel':'account');
        return `submitted a report on ${t}`;
      }
      case 'follow':
        if (notification.payload?.pending) return 'requested to follow you';
        if (notification.payload?.accepted) return 'accepted your follow request';
        return 'started following you';
      default:
        return 'interacted with you';
    }
  };

  const formatDate = (date: string) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - notifDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return notifDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950/20">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-purple-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-pink-500 border-l-indigo-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 font-semibold animate-pulse">
            Loading notifications...
          </div>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.readAt).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950/20">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        
        {/* Header Section - Enhanced */}
        <div className="mb-6 sm:mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl shadow-gray-200/50 dark:shadow-black/30 p-6 sm:p-8">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-pink-500/10 to-blue-500/10 rounded-full blur-3xl"></div>
            
            {/* Content */}
            <div className="relative flex items-center gap-4">
              
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white mb-1">
                  Notifications
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  {notifications.length === 0 
                    ? 'No new updates' 
                    : unreadCount > 0 
                      ? `${unreadCount} new notification${unreadCount > 1 ? 's' : ''}`
                      : 'All caught up!'
                  }
                </p>
              </div>
              {notifications.length > 0 && (
                <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 border border-blue-200/50 dark:border-blue-700/50">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div className="text-right">
                    <div className="text-lg font-black text-gray-900 dark:text-white">{notifications.length}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-12 sm:p-16 lg:p-20 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-pink-500/10 to-blue-500/10 rounded-full blur-3xl"></div>
            
            {/* Empty state */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center shadow-xl">
                <Bell className="w-12 h-12 sm:w-14 sm:h-14 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-3">
                No Notifications Yet
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                When someone likes, comments, or follows you, you'll see it here!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl transition-all duration-300 hover:scale-[1.02] ${
                  notification.readAt
                    ? 'bg-white/80 dark:bg-gray-800/80 shadow-lg hover:shadow-xl'
                    : 'bg-gradient-to-r from-blue-50/90 to-purple-50/90 dark:from-blue-900/30 dark:to-purple-900/30 shadow-xl hover:shadow-2xl'
                } border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl`}
              >
                {/* Unread indicator */}
                {!notification.readAt && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-600 via-purple-600 to-pink-600"></div>
                )}
                
                {/* Background hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-purple-600/0 to-pink-600/0 group-hover:from-blue-600/5 group-hover:via-purple-600/5 group-hover:to-pink-600/5 transition-all duration-500"></div>

                <div className="relative flex items-start gap-3 sm:gap-4 p-4 sm:p-5">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>

                  {/* Profile Picture */}
                  <Link
                    to={`/profile/${notification.fromUserId._id}`}
                    className="flex-shrink-0 mt-1 group/avatar"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-0.5 shadow-lg group-hover/avatar:shadow-xl group-hover/avatar:scale-110 transition-all duration-300">
                      {notification.fromUserId.profilePic ? (
                        <img
                          src={notification.fromUserId.profilePic}
                          alt={notification.fromUserId.displayName}
                          className="w-full h-full rounded-full object-cover border-2 border-white dark:border-gray-800"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl border-2 border-white dark:border-gray-800">
                          {notification.fromUserId.displayName[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base text-gray-900 dark:text-white leading-relaxed">
                      <Link
                        to={`/profile/${notification.fromUserId._id}`}
                        className="font-bold hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 transition-all"
                      >
                        {notification.fromUserId.displayName}
                      </Link>{' '}
                      <span className="text-gray-700 dark:text-gray-300">{getMessage(notification)}</span>
                    </p>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {formatDate(notification.createdAt)}
                      </p>
                      {!notification.readAt && (
                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-[10px] font-bold shadow-lg">
                          NEW
                        </span>
                      )}
                    </div>

                    {/* Follow request actions */}
                    {notification.type === 'follow' && notification.payload?.pending && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button 
                          onClick={async () => {
                            try { 
                              await apiClient.post(`/users/follow-requests/${notification.fromUserId._id}/accept`); 
                              setNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, payload: { accepted: true } } : n)); 
                            } catch {}
                          }} 
                          className="px-4 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Accept
                        </button>
                        <button 
                          onClick={async () => {
                            try { 
                              await apiClient.post(`/users/follow-requests/${notification.fromUserId._id}/decline`); 
                              setNotifications(prev => prev.filter(n => n._id !== notification._id)); 
                            } catch {}
                          }} 
                          className="px-4 py-2 text-sm font-bold rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Decline
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Post thumbnail */}
                  {notification.postId && notification.postId.media?.[0] && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <img
                          src={notification.postId.media[0].thumbnail || notification.postId.media[0].url}
                          alt="Post"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;