import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Heart, MessageCircle, Users, Sparkles, Shield, Globe } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Camera className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">
                Shikfy
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 transition"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full hover:from-blue-700 hover:to-blue-800 transition shadow-lg hover:shadow-xl"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center space-y-8 mb-20">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white leading-tight">
            Share Your World,
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
              Connect Your Story
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Join millions sharing moments, creating reels, and building connections on the most
            vibrant social platform.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
            <Link
              to="/signup"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-pink-600 text-white text-lg font-semibold rounded-full hover:from-blue-700 hover:to-pink-700 transition shadow-2xl hover:shadow-pink-500/50 hover:scale-105 transform"
            >
              Get Started
            </Link>
            <Link
              to="/explore"
              className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold rounded-full border-2 border-gray-300 dark:border-gray-700 hover:border-blue-600 dark:hover:border-blue-600 transition hover:scale-105 transform"
            >
              Explore
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <FeatureCard
            icon={<Heart className="w-8 h-8 text-pink-500" />}
            title="Share Moments"
            description="Post photos, videos, and stories that capture your life's best moments"
          />
          <FeatureCard
            icon={<Camera className="w-8 h-8 text-blue-500" />}
            title="Create Reels"
            description="Express yourself with short, engaging videos that showcase your creativity"
          />
          <FeatureCard
            icon={<MessageCircle className="w-8 h-8 text-green-500" />}
            title="Connect"
            description="Chat with friends, join communities, and build meaningful connections"
          />
          <FeatureCard
            icon={<Users className="w-8 h-8 text-orange-500" />}
            title="Follow Creators"
            description="Discover and follow your favorite creators from around the world"
          />
          <FeatureCard
            icon={<Sparkles className="w-8 h-8 text-yellow-500" />}
            title="AI-Powered"
            description="Smart features like auto-captions, hashtag suggestions, and more"
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8 text-red-500" />}
            title="Privacy First"
            description="Advanced privacy controls to manage who sees your content"
          />
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-pink-600 rounded-3xl p-12 text-center text-white shadow-2xl">
          <Globe className="w-16 h-16 mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-4">Join Our Global Community</h2>
          <p className="text-xl mb-8 opacity-90">
            Connect with millions of users worldwide. Share, discover, and grow together.
          </p>
          <Link
            to="/signup"
            className="inline-block px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-full hover:bg-gray-100 transition shadow-xl hover:scale-105 transform"
          >
            Create Your Account
          </Link>
        </div>
      </div>

      <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Camera className="w-6 h-6 text-blue-600" />
                <span className="text-lg font-bold text-gray-900 dark:text-white">Shikfy</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Share your world, connect your story.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Company</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>About Us</li>
                <li>Careers</li>
                <li>Press</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Support</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>Help Center</li>
                <li>Safety</li>
                <li>Guidelines</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>Terms</li>
                <li>Privacy</li>
                <li>Cookies</li>
              </ul>
            </div>
          </div>
          <div className="text-center text-gray-600 dark:text-gray-400 pt-8 border-t border-gray-200 dark:border-gray-700">
            &copy; 2025 Shikfy. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all hover:scale-105 transform border border-gray-200 dark:border-gray-700">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
};

export default Landing;
