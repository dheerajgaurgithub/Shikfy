import React from 'react';
import { Heart, MessageCircle, Bookmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import FollowButton from './FollowButton';

interface ReelFeedCardProps {
  reel: any;
}

const ReelFeedCard: React.FC<ReelFeedCardProps> = ({ reel }) => {
  const author = reel.authorId || {};
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between p-4">
        <Link to={`/profile/${author._id}`} className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 flex items-center justify-center text-white font-bold">
            {author.profilePic ? (
              <img src={author.profilePic} alt={author.displayName} className="w-full h-full rounded-full object-cover" />
            ) : (
              (author.displayName || 'U')?.charAt(0)?.toUpperCase()
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{author.displayName || author.username}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">@{author.username}</p>
          </div>
        </Link>
        {author._id && <FollowButton targetId={author._id} />}
      </div>

      <Link to={`/reel/${reel._id}`} className="block">
        <div className="relative bg-black">
          <video
            src={reel.video?.url}
            poster={reel.video?.thumbnail}
            controls
            className="w-full max-h-[70vh] object-contain"
          />
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Heart className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{reel.likesCount || 0}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{reel.commentsCount || 0}</span>
            </div>
          </div>
          <Bookmark className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </div>
        {reel.caption && (
          <p className="text-gray-900 dark:text-white">
            <span className="font-semibold mr-2">{author.username}</span>
            {reel.caption}
          </p>
        )}
      </div>
    </div>
  );
};

export default ReelFeedCard;
