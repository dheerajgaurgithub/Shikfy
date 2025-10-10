import React from 'react';
import { Link } from 'react-router-dom';

const About: React.FC = () => (
  <div className="max-w-5xl mx-auto px-4 py-12">
    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">About Shikfy</h1>
    <p className="text-gray-700 dark:text-gray-300 mb-6">
      Shikfy is a modern social platform to share your moments through posts, reels, and stories.
      We focus on creativity, safety, and real-time connections with a clean, fast experience.
    </p>
    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">What we build</h2>
    <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
      <li>Beautiful stories with overlays, polls, and rich editing tools.</li>
      <li>Real-time chat with media, message requests, and A/V calls.</li>
      <li>Powerful creation tools for reels and posts.</li>
      <li>Privacy-first defaults and transparent controls.</li>
    </ul>
    <div className="mt-10 text-sm text-gray-600 dark:text-gray-400">
      Read more: <Link to="/privacy" className="text-blue-600">Privacy</Link> · <Link to="/terms" className="text-blue-600">Terms</Link>
    </div>
  </div>
);

export default About;
