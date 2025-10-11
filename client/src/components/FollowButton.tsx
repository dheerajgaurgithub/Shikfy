import React from 'react';
import apiClient from '../api/client';

interface Props {
  targetId: string;
  className?: string;
  compact?: boolean;
}

const FollowButton: React.FC<Props> = ({ targetId, className = '', compact = false }) => {
  const [following, setFollowing] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const r = await apiClient.get(`/users/${targetId}/following-status`);
        if (mounted) setFollowing(!!r.data?.following);
      } catch {
        if (mounted) setFollowing(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [targetId]);

  const toggle = async () => {
    if (following === null || loading) return;
    setLoading(true);
    try {
      if (!following) await apiClient.post(`/users/${targetId}/follow`);
      else await apiClient.delete(`/users/${targetId}/follow`);
      setFollowing(!following);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (following === null) {
    return <div className={compact ? 'w-16 h-7' : 'w-20 h-8'} />;
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={
        `${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs'} rounded-full font-semibold ` +
        `${following ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' : 'bg-blue-600 text-white'} ` +
        `${loading ? 'opacity-70 cursor-not-allowed' : ''} ` +
        className
      }
    >
      {loading ? '...' : following ? 'Unfollow' : 'Follow'}
    </button>
  );
};

export default FollowButton;
