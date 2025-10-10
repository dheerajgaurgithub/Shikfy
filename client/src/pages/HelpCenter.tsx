import React from 'react';
import { Link } from 'react-router-dom';

const HelpCenter: React.FC = () => (
  <div className="max-w-5xl mx-auto px-4 py-12">
    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Help Center</h1>
    <p className="text-gray-700 dark:text-gray-300 mb-6">Find answers to common questions and learn how to use Shikfy.</p>
    <div className="grid md:grid-cols-2 gap-6">
      <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="font-semibold text-gray-900 dark:text-white mb-2">Stories & Reels</div>
        <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1 text-sm">
          <li>Creating multi-slide stories with text and stickers</li>
          <li>Who can view my story?</li>
          <li>How to add polls and reactions</li>
        </ul>
      </div>
      <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="font-semibold text-gray-900 dark:text-white mb-2">Messaging</div>
        <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1 text-sm">
          <li>Message requests, Primary/General folders</li>
          <li>Sending media and voice notes</li>
          <li>Audio/Video calls</li>
        </ul>
      </div>
    </div>
    <div className="mt-8 text-sm text-gray-600 dark:text-gray-400">Need more help? Contact <Link to="/support" className="text-blue-600">support@shikfy.app</Link></div>
  </div>
);

export default HelpCenter;
