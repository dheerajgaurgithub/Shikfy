import React from 'react';

const Careers: React.FC = () => (
  <div className="max-w-5xl mx-auto px-4 py-12">
    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Careers</h1>
    <p className="text-gray-700 dark:text-gray-300 mb-6">We're building the next-generation social platform. Join a product-driven team shipping fast.</p>
    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">Open roles</h2>
    <ul className="space-y-4">
      <li className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="font-semibold text-gray-900 dark:text-white">Frontend Engineer (React + Vite)</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Build creator tools, chat UX, and high-performance feeds.</div>
      </li>
      <li className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="font-semibold text-gray-900 dark:text-white">Backend Engineer (Node + MongoDB)</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Design real-time APIs, WebRTC signaling, and scalable data models.</div>
      </li>
    </ul>
    <div className="mt-8 text-gray-700 dark:text-gray-300">Email your profile and links to careers@shikfy.app</div>
  </div>
);

export default Careers;
