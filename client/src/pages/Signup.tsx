import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const passwordStrength = password.length >= 6 ? 'good' : password.length >= 3 ? 'weak' : 'none';
  const isFormValid = username && displayName && email && password.length >= 6 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      await signup(username, email, password, displayName);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 flex items-center justify-center p-3 sm:p-4">
      {/* Background blur elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 border-2 border-gray-200 dark:border-slate-700 backdrop-blur-xl">
          
          {/* Logo Section */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-pink-600 rounded-lg blur opacity-0 group-hover:opacity-75 transition duration-500"></div>
              <Camera className="relative w-8 h-8 sm:w-10 sm:h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Shikfy
            </span>
          </div>

          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2">
              Create Your Account
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Join thousands of creators sharing their moments
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 rounded-lg sm:rounded-xl flex items-start gap-2 sm:gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            
            {/* Username */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="@yourname"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all text-sm sm:text-base font-medium hover:border-blue-400 dark:hover:border-blue-500"
                required
              />
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Name"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all text-sm sm:text-base font-medium hover:border-blue-400 dark:hover:border-blue-500"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all text-sm sm:text-base font-medium hover:border-blue-400 dark:hover:border-blue-500"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 bg-gray-50 dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all text-sm sm:text-base font-medium hover:border-blue-400 dark:hover:border-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 sm:h-2 bg-gray-300 dark:bg-slate-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        passwordStrength === 'good'
                          ? 'w-full bg-green-500'
                          : passwordStrength === 'weak'
                          ? 'w-1/2 bg-yellow-500'
                          : 'w-1/4 bg-red-500'
                      }`}
                    ></div>
                  </div>
                  <span className={`text-xs font-semibold ${
                    passwordStrength === 'good'
                      ? 'text-green-600 dark:text-green-400'
                      : passwordStrength === 'weak'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {passwordStrength === 'good' ? 'Strong' : passwordStrength === 'weak' ? 'Weak' : 'Too short'}
                  </span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid}
              className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold rounded-lg sm:rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 text-sm sm:text-base flex items-center justify-center gap-2 mt-6 group"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating account...
                </>
              ) : (
                <>
                  Sign Up
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 sm:my-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gray-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-2 sm:px-3 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-medium">
                Already have an account?
              </span>
            </div>
          </div>

          {/* Login Link */}
          <Link
            to="/login"
            className="w-full block text-center py-2.5 sm:py-3 bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 border-2 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white font-bold rounded-lg sm:rounded-xl transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500 text-sm sm:text-base group"
          >
            <span className="flex items-center justify-center gap-2">
              Log in here
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          {/* Back to Home */}
          <div className="mt-4 sm:mt-6 text-center">
            <Link
              to="/"
              className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors underline decoration-dotted underline-offset-2"
            >
              ← Back to home
            </Link>
          </div>
        </div>

        {/* Trust Badge */}
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Your data is secure and private
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;