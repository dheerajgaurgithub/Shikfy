import React from 'react';

const Privacy: React.FC = () => (
  <div className="max-w-5xl mx-auto px-4 py-12 prose dark:prose-invert">
    <h1>Privacy Policy</h1>
    <p>Your privacy matters. This policy explains what we collect and why.</p>
    <h2>Data We Collect</h2>
    <ul>
      <li>Account data (username, email), profile info you choose to share.</li>
      <li>Content you upload (posts, stories, messages metadata).</li>
      <li>Usage data to improve performance and safety.</li>
    </ul>
    <h2>How We Use Data</h2>
    <ul>
      <li>Provide core features (feeds, messaging, stories, calls).</li>
      <li>Secure the platform and prevent abuse.</li>
      <li>Improve product experience and reliability.</li>
    </ul>
    <p>Contact: privacy@shikfy.app</p>
  </div>
);

export default Privacy;
