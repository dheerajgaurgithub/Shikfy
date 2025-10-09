import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus } from 'lucide-react';
import apiClient from '../api/client';

const Notifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await apiClient.get('/notifications');
        setNotifications(response.data);
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
        return <Heart className="w-8 h-8 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-8 h-8 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-8 h-8 text-green-500" />;
      default:
        return <Heart className="w-8 h-8 text-gray-500" />;
    }
  };

  const getMessage = (notification: any) => {
    switch (notification.type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              className={`flex items-center space-x-4 p-4 rounded-xl transition ${
                notification.readAt
                  ? 'bg-white dark:bg-gray-800'
                  : 'bg-blue-50 dark:bg-blue-900/20'
              } border border-gray-200 dark:border-gray-700`}
            >
              <div>{getIcon(notification.type)}</div>

              <Link
                to={`/profile/${notification.fromUserId._id}`}
                className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0"
              >
                {notification.fromUserId.profilePic ? (
                  <img
                    src={notification.fromUserId.profilePic}
                    alt={notification.fromUserId.displayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  notification.fromUserId.displayName[0].toUpperCase()
                )}
              </Link>

              <div className="flex-1">
                <p className="text-gray-900 dark:text-white">
                  <Link
                    to={`/profile/${notification.fromUserId._id}`}
                    className="font-semibold hover:underline"
                  >
                    {notification.fromUserId.displayName}
                  </Link>{' '}
                  {getMessage(notification)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(notification.createdAt)}
                </p>
                {notification.type==='follow' && notification.payload?.pending && (
                  <div className="mt-2 flex gap-2">
                    <button onClick={async ()=>{
                      try { await apiClient.post(`/users/follow-requests/${notification.fromUserId._id}/accept`); setNotifications(prev=> prev.map(n=> n._id===notification._id? { ...n, payload: { accepted: true } } : n)); }
                      catch {}
                    }} className="px-3 py-1 text-sm rounded bg-blue-600 text-white">Accept</button>
                    <button onClick={async ()=>{
                      try { await apiClient.post(`/users/follow-requests/${notification.fromUserId._id}/decline`); setNotifications(prev=> prev.filter(n=> n._id!==notification._id)); }
                      catch {}
                    }} className="px-3 py-1 text-sm rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">Decline</button>
                  </div>
                )}
              </div>

              {notification.postId && notification.postId.media?.[0] && (
                <img
                  src={notification.postId.media[0].thumbnail || notification.postId.media[0].url}
                  alt="Post"
                  className="w-12 h-12 object-cover rounded"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
