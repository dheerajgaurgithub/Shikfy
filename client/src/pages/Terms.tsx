import React from 'react';

const Terms: React.FC = () => (
  <div className="max-w-5xl mx-auto px-4 py-12 prose dark:prose-invert">
    <h1>Terms of Service</h1>
    <p>Welcome to Shikfy. By using our services, you agree to these terms.</p>
    <h2>Use of Service</h2>
    <ul>
      <li>You must be legally permitted to use the service in your region.</li>
      <li>You are responsible for the content you post and for securing your account.</li>
    </ul>
    <h2>Content & Rights</h2>
    <ul>
      <li>You own your content. You grant Shikfy a license to host and display it as needed to operate the service.</li>
      <li>We may remove content that violates our Guidelines or the law.</li>
    </ul>
    <h2>Limitation of Liability</h2>
    <p>Shikfy is provided “as is” without warranties. To the extent permitted by law, we are not liable for indirect or consequential damages.</p>
    <p>Contact: legal@shikfy.app</p>
  </div>
);

export default Terms;
