import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Explore from './pages/Explore';
import Reels from './pages/Reels';
import Notifications from './pages/Notifications';
import Saved from './pages/Saved';
import PostDetail from './pages/PostDetail';
import ReelDetail from './pages/ReelDetail';
import Settings from './pages/Settings';
import Chats from './pages/Chats';
import Followers from './pages/Followers';
import Following from './pages/Following';
import Hubs from './pages/Hubs';
import HubDetail from './pages/HubDetail';
import Suggestions from './pages/Suggestions';
import About from './pages/About';
import Careers from './pages/Careers';
import Press from './pages/Press';
import HelpCenter from './pages/HelpCenter';
import Safety from './pages/Safety';
import Guidelines from './pages/Guidelines';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Cookies from './pages/Cookies';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminPosts from './pages/admin/Posts';
import AdminReels from './pages/admin/Reels';
import AdminReports from './pages/admin/Reports';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return user ? <Navigate to="/home" /> : <>{children}</>;
};

function App() {
  const ProfileRedirect = () => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" />;
    return <Navigate to={`/profile/${user.id}`} />;
  };
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/landing" element={<Landing />} />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <Signup />
                </PublicRoute>
              }
            />
            <Route
              path="/"
              element={
                <PublicRoute>
                  <Landing />
                </PublicRoute>
              }
            />
            <Route
              path="/home"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <ProfileRedirect />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile/:id"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route
              path="/explore"
              element={
                <PrivateRoute>
                  <Explore />
                </PrivateRoute>
              }
            />
            <Route
              path="/post/:id"
              element={
                <PrivateRoute>
                  <PostDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/reels"
              element={
                <PrivateRoute>
                  <Reels />
                </PrivateRoute>
              }
            />
            <Route
              path="/reel/:id"
              element={
                <PrivateRoute>
                  <ReelDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <PrivateRoute>
                  <Notifications />
                </PrivateRoute>
              }
            />
            <Route
              path="/saved"
              element={
                <PrivateRoute>
                  <Saved />
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              }
            />
            <Route
              path="/chats"
              element={
                <PrivateRoute>
                  <Chats />
                </PrivateRoute>
              }
            />
            <Route path="/profile/:id/followers" element={<PrivateRoute><Followers /></PrivateRoute>} />
            <Route path="/profile/:id/following" element={<PrivateRoute><Following /></PrivateRoute>} />
            <Route path="/h" element={<PrivateRoute><Hubs /></PrivateRoute>} />
            <Route path="/h/:slug" element={<PrivateRoute><HubDetail /></PrivateRoute>} />
            <Route path="/suggestions" element={<PrivateRoute><Suggestions /></PrivateRoute>} />
            <Route
              path="/chat"
              element={<Navigate to="/chats" />}
            />
            {/* Public content pages */}
            <Route path="/about" element={<PublicRoute><About /></PublicRoute>} />
            <Route path="/careers" element={<PublicRoute><Careers /></PublicRoute>} />
            <Route path="/press" element={<PublicRoute><Press /></PublicRoute>} />
            <Route path="/help" element={<PublicRoute><HelpCenter /></PublicRoute>} />
            <Route path="/safety" element={<PublicRoute><Safety /></PublicRoute>} />
            <Route path="/guidelines" element={<PublicRoute><Guidelines /></PublicRoute>} />
            <Route path="/terms" element={<PublicRoute><Terms /></PublicRoute>} />
            <Route path="/privacy" element={<PublicRoute><Privacy /></PublicRoute>} />
            <Route path="/cookies" element={<PublicRoute><Cookies /></PublicRoute>} />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <AdminLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="posts" element={<AdminPosts />} />
              <Route path="reels" element={<AdminReels />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="audit" element={<div className="text-gray-500 p-4">Audit coming soon</div>} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
export default App;
