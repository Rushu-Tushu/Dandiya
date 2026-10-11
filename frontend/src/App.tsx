import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { api } from './lib/api';
import { AmbientBlobs } from './components/common/AmbientBlobs';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { RequestsPage } from './pages/RequestsPage';
import { MatchesPage } from './pages/MatchesPage';
import { ChatPage } from './pages/ChatPage';
import { ProfileEditPage } from './pages/ProfileEditPage';
import { SafetyPage } from './pages/SafetyPage';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-[#8B0036] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Layout with conditional footer
const AppLayout: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const [incomingCount, setIncomingCount] = useState(0);

  // Poll incoming count for notification badge if logged in
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchIncoming = async () => {
      try {
        const res = await api.getIncomingRequests();
        setIncomingCount(res.requests.length);
      } catch {
        // ignore
      }
    };
    fetchIncoming();
    const interval = setInterval(fetchIncoming, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, location.pathname]);

  const isChatRoute = location.pathname.startsWith('/chat');

  return (
    <div className="min-h-screen flex flex-col relative bg-white text-gray-900 selection:bg-pink-100 selection:text-maroon">
      {/* Ambient background soft blobs */}
      <AmbientBlobs />

      {/* Navbar */}
      <Navbar incomingCount={incomingCount} />

      {/* Main Content View */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/safety" element={<SafetyPage />} />

          {/* Authenticated routes */}
          <Route
            path="/discover"
            element={
              <ProtectedRoute>
                <DiscoveryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests"
            element={
              <ProtectedRoute>
                <RequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches"
            element={
              <ProtectedRoute>
                <MatchesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:id"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileEditPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Show celebratory footer on pages other than active full-screen chat */}
      {!isChatRoute && <Footer />}
    </div>
  );
};

export const App: React.FC = () => {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <Router>
      <AppLayout />
    </Router>
  );
};

export default App;
