import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Heart, MessageCircle, Users, Sparkles, Shield, Globe, PlayCircle, Bell, Image, Group, Send, Twitter, Instagram, Linkedin, ArrowRight, Zap } from 'lucide-react';
import darkLogo from '../darklogo.png';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 overflow-x-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-slate-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-2 group">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-pink-600 rounded-lg blur opacity-0 group-hover:opacity-75 transition duration-500"></div>
                <img src={darkLogo} alt="Shikfy" className="relative w-7 h-7 sm:w-8 sm:h-8 object-contain" />
              </div>
              <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Shikfy
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to="/login"
                className="px-3 sm:px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors text-sm sm:text-base"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 text-sm sm:text-base"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 pt-8 sm:pt-16 lg:pt-20 pb-12 sm:pb-20 lg:pb-32">
        
        {/* 1. Hero Section */}
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center mb-16 sm:mb-24">
          <div className="space-y-4 sm:space-y-6">
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black text-gray-900 dark:text-white leading-tight">
              Connect, Chat, and
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-pulse">
                Share Moments Instantly
              </span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-400 max-w-xl leading-relaxed">
              Your new favorite social media platform. Fast, friendly, and privacy-first. Where every moment matters.
            </p>
            <div className="flex flex-wrap gap-3 sm:gap-4 pt-2">
              <Link 
                to="/signup" 
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 group text-sm sm:text-base"
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform" /> 
                Sign Up Free
              </Link>
              <a 
                href="#features" 
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white font-semibold hover:border-blue-600 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-lg text-sm sm:text-base group"
              >
                <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" /> 
                Explore
              </a>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative hidden md:block">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-pink-600/20 rounded-3xl blur-3xl"></div>
            <div className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 border-2 border-gray-200 dark:border-slate-700 backdrop-blur-xl shadow-2xl">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex-shrink-0 shadow-lg" />
                <div className="flex-1 space-y-2 sm:space-y-3">
                  <Bubble side="left" text="Hey! Have you tried Shikfy yet? 😄" />
                  <Bubble side="left" text="Stories + chat + reels in one place!" />
                </div>
              </div>
              <div className="flex items-start gap-3 sm:gap-4 mt-4 sm:mt-6 justify-end">
                <div className="flex-1 space-y-2 sm:space-y-3 text-right">
                  <Bubble side="right" text="Just joined! UI is super clean ✨" />
                  <Bubble side="right" text="Let's create a story!" />
                </div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500 flex-shrink-0 shadow-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Features Showcase */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-16 sm:mb-24">
          <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500">
            <div className="font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2 text-lg sm:text-xl">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              Real-time Chat
            </div>
            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
              <MockMsg who="A" text="Hi! 👋" />
              <MockMsg who="B" text="Hello!" right />
              <MockMsg who="A" text="Wanna see my new story?" />
              <MockMsg who="B" text="Yes! Also, call later? 📞" right />
            </div>
            <MiniDemo />
          </div>

          <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-purple-400 dark:hover:border-purple-500">
            <div className="font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2 text-lg sm:text-xl">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              Why You'll Love It
            </div>
            <ul className="grid sm:grid-cols-2 gap-2 sm:gap-3 text-gray-700 dark:text-gray-300 text-sm sm:text-base">
              <li className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition"><Heart className="w-4 h-4 sm:w-5 sm:h-5 text-pink-500 flex-shrink-0" /> Reactions & replies</li>
              <li className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition"><Image className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" /> Stories & reels</li>
              <li className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition"><Group className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" /> Friends & groups</li>
              <li className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition"><Bell className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" /> Notifications</li>
              <li className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition"><Shield className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" /> Privacy controls</li>
              <li className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition"><Camera className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 flex-shrink-0" /> Creative tools</li>
            </ul>
          </div>
        </div>

        {/* 3. Features Grid */}
        <div id="features" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-16 sm:mb-20">
          <FeatureCard
            icon={<Heart className="w-6 h-6 sm:w-7 sm:h-7 text-pink-500" />}
            title="Share Moments"
            description="Post photos, videos, and stories that capture your life's best moments"
          />
          <FeatureCard
            icon={<Camera className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" />}
            title="Create Reels"
            description="Express yourself with short, engaging videos that showcase your creativity"
          />
          <FeatureCard
            icon={<MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-green-500" />}
            title="Connect"
            description="Chat with friends, join communities, and build meaningful connections"
          />
          <FeatureCard
            icon={<Users className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500" />}
            title="Follow Creators"
            description="Discover and follow your favorite creators from around the world"
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-500" />}
            title="AI-Powered"
            description="Smart features like auto-captions, hashtag suggestions, and more"
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6 sm:w-7 sm:h-7 text-red-500" />}
            title="Privacy First"
            description="Advanced privacy controls to manage who sees your content"
          />
        </div>

        {/* 4. Social Proof */}
        <div className="relative mb-16 sm:mb-20">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl sm:rounded-3xl blur-2xl opacity-50"></div>
          <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 text-center text-white shadow-2xl border border-white/20">
            <Globe className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 animate-bounce" />
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2 sm:mb-3">Loved by Creators</h2>
            <p className="text-base sm:text-lg opacity-90 mb-6 sm:mb-8">Join 50k+ users sharing their world every day</p>
            <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <Quote text="The best stories editor I've used." who="Aanya • Designer" />
              <Quote text="Chat feels instant and fun." who="Vihaan • Creator" />
              <Quote text="Privacy defaults done right." who="Sara • Engineer" />
            </div>
            <Link 
              to="/signup" 
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-600 font-bold rounded-full hover:bg-gray-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 text-sm sm:text-base group"
            >
              Create Your Account
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* 5. Footer */}
      <footer className="bg-gray-50 dark:bg-slate-800 border-t-2 border-gray-200 dark:border-slate-700 py-8 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
            
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3 sm:mb-4 group">
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-pink-600 rounded-lg blur opacity-0 group-hover:opacity-75 transition duration-500"></div>
                  <img src={darkLogo} alt="Shikfy" className="relative w-6 h-6 sm:w-7 sm:h-7 object-contain" />
                </div>
                <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Shikfy</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base mb-3 sm:mb-4">Share your world, connect your story.</p>
              <div className="flex gap-3 text-gray-600 dark:text-gray-400">
                <a href="https://instagram.com" aria-label="Instagram" className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg hover:text-blue-600 dark:hover:text-blue-400 transition"><Instagram className="w-5 h-5" /></a>
                <a href="https://twitter.com" aria-label="Twitter" className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg hover:text-blue-600 dark:hover:text-blue-400 transition"><Twitter className="w-5 h-5" /></a>
                <a href="https://linkedin.com" aria-label="LinkedIn" className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg hover:text-blue-600 dark:hover:text-blue-400 transition"><Linkedin className="w-5 h-5" /></a>
              </div>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 text-sm sm:text-base">Company</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                <li><Link to="/about" className="hover:text-blue-600 dark:hover:text-blue-400 transition font-medium">About Us</Link></li>
                <li><Link to="/careers" className="hover:text-blue-600 dark:hover:text-blue-400 transition font-medium">Careers</Link></li>
                <li><Link to="/press" className="hover:text-blue-600 dark:hover:text-blue-400 transition font-medium">Press</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 text-sm sm:text-base">Support</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                <li><Link to="/help" className="hover:text-blue-600 dark:hover:text-blue-400 transition font-medium">Help Center</Link></li>
                <li><Link to="/safety" className="hover:text-blue-600 dark:hover:text-blue-400 transition font-medium">Safety</Link></li>
                <li><Link to="/guidelines" className="hover:text-blue-600 dark:hover:text-blue-400 transition font-medium">Guidelines</Link></li>
              </ul>
            </div>

            {/* Legal & Newsletter */}
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 text-sm sm:text-base">Legal</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm mb-4 sm:mb-6">
                <li><Link to="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition font-medium">Terms</Link></li>
                <li><Link to="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition font-medium">Privacy</Link></li>
                <li><Link to="/cookies" className="hover:text-blue-600 dark:hover:text-blue-400 transition font-medium">Cookies</Link></li>
              </ul>
              <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <input placeholder="Email" className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 transition text-xs sm:text-sm" />
                <button className="px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm"><Send className="w-4 h-4" /></button>
              </form>
            </div>
          </div>

          <div className="text-center text-gray-600 dark:text-gray-400 pt-6 sm:pt-8 border-t-2 border-gray-200 dark:border-slate-700 text-xs sm:text-sm">
            &copy; 2025 Shikfy. All rights reserved. Built with ❤️ for creators.
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
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 transform border-2 border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 group">
      <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg w-fit mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base leading-relaxed">{description}</p>
    </div>
  );
};

const Bubble = ({ side, text }: { side: 'left' | 'right'; text: string }) => (
  <div className={`inline-block px-3 sm:px-4 py-2 sm:py-3 rounded-2xl text-xs sm:text-sm shadow-md font-medium ${side === 'left' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white' : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'} animate-fadeIn`}>
    {text}
  </div>
);

const MockMsg = ({ who, text, right }: { who: 'A' | 'B'; text: string; right?: boolean }) => (
  <div className={`flex ${right ? 'justify-end' : ''}`}>
    {!right && <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 mr-2 flex-shrink-0" />}
    <div className={`max-w-[70%] ${right ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white'} px-3 py-2 sm:px-4 sm:py-3 rounded-2xl text-xs sm:text-sm font-medium shadow-md`}>{text}</div>
    {right && <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500 ml-2 flex-shrink-0" />}
  </div>
);

const Quote = ({ text, who }: { text: string; who: string }) => (
  <div className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl px-3 sm:px-4 py-3 sm:py-4 transition-all hover:scale-105 duration-300 border border-white/20">
    <div className="text-xs sm:text-sm font-medium">"{text}"</div>
    <div className="text-xs opacity-80 mt-1 sm:mt-2">{who}</div>
  </div>
);

const MiniDemo: React.FC = () => {
  const [msgs, setMsgs] = React.useState<string[]>(["Type a message and see a mock reply…"]);
  const [val, setVal] = React.useState('');
  const send = () => {
    if (!val.trim()) return;
    setMsgs((m) => [val.trim(), ...m]);
    setVal('');
    setTimeout(() => setMsgs((m) => ["Got it! 🚀", ...m]), 600);
  };
  return (
    <div className="mt-4 sm:mt-6">
      <div className="flex items-center gap-2">
        <input 
          value={val} 
          onChange={(e) => setVal(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && send()} 
          placeholder="Say hi…" 
          className="flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border-2 border-gray-300 dark:border-slate-600 focus:border-blue-500 transition text-xs sm:text-sm"
        />
        <button 
          onClick={send} 
          className="px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all hover:scale-110 active:scale-95 shadow-md hover:shadow-lg"
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
      <div className="mt-3 sm:mt-4 space-y-1 sm:space-y-2">
        {msgs.slice(0, 3).map((t, i) => <div key={i} className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">{t}</div>)}
      </div>
    </div>
  );
};

export default Landing;