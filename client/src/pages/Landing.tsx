import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Heart, MessageCircle, Users, Sparkles, Shield, Globe, PlayCircle, Lock, Bell, Image, Group, Send, Twitter, Instagram, Linkedin } from 'lucide-react';

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
        {/* 1. Hero */}
        <div className="grid md:grid-cols-2 gap-10 items-center mb-24">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight">
              Connect, Chat, and
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Share Moments Instantly
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-xl">
              Your new favorite social media platform. Fast, friendly, and privacy-first.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link to="/signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition shadow-lg">
                <Sparkles className="w-5 h-5" /> Sign Up Free
              </Link>
              <a href="#features" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:border-blue-600 transition">
                <PlayCircle className="w-5 h-5" /> Explore Features
              </a>
            </div>
          </div>
          <div className="relative">
            {/* Avatars chatting */}
            <div className="relative rounded-3xl p-6 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
                <div className="flex-1 space-y-3">
                  <Bubble side="left" text="Hey! Have you tried Shikfy yet? 😄" />
                  <Bubble side="left" text="Stories + chat + reels in one place!" />
                </div>
              </div>
              <div className="flex items-start gap-4 mt-6 justify-end">
                <div className="flex-1 space-y-3 text-right">
                  <Bubble side="right" text="Just joined! The UI is super clean ✨" />
                  <Bubble side="right" text="Let’s create a story!" />
                </div>
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500" />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Chat Feature Showcase + mini demo */}
        <div className="grid md:grid-cols-2 gap-8 mb-24">
          <div className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><MessageCircle className="w-5 h-5"/> Real-time Chat</div>
            <div className="space-y-2">
              <MockMsg who="A" text="Hi! 👋" />
              <MockMsg who="B" text="Hello!" right />
              <MockMsg who="A" text="Wanna see my new story?" />
              <MockMsg who="B" text="Yes! Also, call later? 📞" right />
            </div>
            {/* mini live demo */}
            <MiniDemo />
          </div>
          <div className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5"/> Why you’ll love it</div>
            <ul className="grid sm:grid-cols-2 gap-3 text-gray-700 dark:text-gray-300">
              <li className="flex items-center gap-2"><Heart className="w-4 h-4 text-pink-500"/> Reactions & replies</li>
              <li className="flex items-center gap-2"><Image className="w-4 h-4 text-blue-500"/> Stories & reels</li>
              <li className="flex items-center gap-2"><Group className="w-4 h-4 text-orange-500"/> Friends & groups</li>
              <li className="flex items-center gap-2"><Bell className="w-4 h-4 text-green-500"/> Instant notifications</li>
              <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-red-500"/> Privacy controls</li>
              <li className="flex items-center gap-2"><Camera className="w-4 h-4 text-purple-500"/> Creative tools</li>
            </ul>
          </div>
        </div>

        {/* 3. Features grid */}
        <div id="features" className="grid md:grid-cols-3 gap-8 mb-20">
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
        {/* 4. Social proof */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white shadow-2xl mb-20">
          <Globe className="w-16 h-16 mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-2">Loved by creators</h2>
          <p className="text-lg opacity-90 mb-6">Join 50k+ users sharing their world.</p>
          <div className="flex flex-wrap justify-center gap-4 text-blue-50">
            <Quote text="The best stories editor I’ve used." who="Aanya • Designer" />
            <Quote text="Chat feels instant and fun." who="Vihaan • Creator" />
            <Quote text="Privacy defaults done right." who="Sara • Engineer" />
          </div>
          <Link to="/signup" className="mt-8 inline-block px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-full hover:bg-gray-100 transition shadow-xl">
            Create Your Account
          </Link>
        </div>
      </div>

      {/* 5. Footer */}
      <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Camera className="w-6 h-6 text-blue-600" />
                <span className="text-lg font-bold text-gray-900 dark:text-white">Shikfy</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">Share your world, connect your story.</p>
              <div className="flex gap-3 mt-3 text-gray-600 dark:text-gray-300">
                <a href="https://instagram.com" aria-label="Instagram" className="hover:text-blue-600"><Instagram className="w-5 h-5"/></a>
                <a href="https://twitter.com" aria-label="Twitter" className="hover:text-blue-600"><Twitter className="w-5 h-5"/></a>
                <a href="https://linkedin.com" aria-label="LinkedIn" className="hover:text-blue-600"><Linkedin className="w-5 h-5"/></a>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Company</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li><Link to="/about" className="hover:text-blue-600">About Us</Link></li>
                <li><Link to="/careers" className="hover:text-blue-600">Careers</Link></li>
                <li><Link to="/press" className="hover:text-blue-600">Press</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Support</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li><Link to="/help" className="hover:text-blue-600">Help Center</Link></li>
                <li><Link to="/safety" className="hover:text-blue-600">Safety</Link></li>
                <li><Link to="/guidelines" className="hover:text-blue-600">Guidelines</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li><Link to="/terms" className="hover:text-blue-600">Terms</Link></li>
                <li><Link to="/privacy" className="hover:text-blue-600">Privacy</Link></li>
                <li><Link to="/cookies" className="hover:text-blue-600">Cookies</Link></li>
              </ul>
              <form className="mt-4 flex gap-2" onSubmit={(e)=> e.preventDefault()}>
                <input placeholder="Email for updates" className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
                <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Subscribe</button>
              </form>
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

const Bubble = ({ side, text }: { side: 'left'|'right'; text: string }) => (
  <div className={`inline-block px-4 py-2 rounded-2xl text-sm shadow ${side==='left' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white' : 'bg-blue-600 text-white'} animate-[fadeIn_.4s_ease]`}>
    {text}
  </div>
);

const MockMsg = ({ who, text, right }: { who: 'A'|'B'; text: string; right?: boolean }) => (
  <div className={`flex ${right? 'justify-end':''}`}>
    {!right && <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 mr-2"/>}
    <div className={`max-w-[70%] ${right? 'bg-blue-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'} px-3 py-2 rounded-2xl`}>{text}</div>
    {right && <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500 ml-2"/>}
  </div>
);

const Quote = ({ text, who }: { text: string; who: string }) => (
  <div className="bg-white/10 rounded-xl px-4 py-3">
    <div className="text-sm">“{text}”</div>
    <div className="text-xs opacity-80 mt-1">{who}</div>
  </div>
);

const MiniDemo: React.FC = () => {
  const [msgs, setMsgs] = React.useState<string[]>(["Type a message and see a mock reply…"]);
  const [val, setVal] = React.useState('');
  const send = () => {
    if (!val.trim()) return;
    setMsgs((m)=> [val.trim(), ...m]);
    setVal('');
    setTimeout(()=> setMsgs((m)=> ["Got it! 🚀", ...m]), 600);
  };
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2">
        <input value={val} onChange={(e)=> setVal(e.target.value)} onKeyDown={(e)=> e.key==='Enter' && send()} placeholder="Say hi…" className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"/>
        <button onClick={send} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"><Send className="w-4 h-4"/></button>
      </div>
      <div className="mt-3 space-y-2">
        {msgs.slice(0,3).map((t,i)=> <div key={i} className="text-sm text-gray-700 dark:text-gray-300">{t}</div>)}
      </div>
    </div>
  );
};

export default Landing;
