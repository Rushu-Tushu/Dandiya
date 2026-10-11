import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { DandiyaIcon } from '../common/DandiyaIcon';
import { getAssetUrl } from '../../lib/api';
import { Menu, X, LogOut, User, MessageCircle, Heart, Compass, Bell } from 'lucide-react';

interface NavbarProps {
  incomingCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ incomingCount = 0 }) => {
  const { isAuthenticated, profile, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-pink-100/60 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B0036] via-[#D81B60] to-[#F59E0B] p-1.5 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <DandiyaIcon className="w-full h-full text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold font-serif tracking-tight text-gray-900 group-hover:text-[#8B0036] transition-colors">
                Dandiya <span className="text-[#D81B60]">+1</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#8B0036] font-semibold -mt-1 hidden sm:block">
                Navratri Matchmaking
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  to="/discover"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/discover')
                      ? 'bg-pink-50 text-[#8B0036] font-semibold'
                      : 'text-gray-700 hover:text-[#8B0036] hover:bg-pink-50/50'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  Discover
                </Link>

                <Link
                  to="/requests"
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/requests')
                      ? 'bg-pink-50 text-[#8B0036] font-semibold'
                      : 'text-gray-700 hover:text-[#8B0036] hover:bg-pink-50/50'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  Requests
                  {incomingCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#D81B60] text-white rounded-full leading-none">
                      {incomingCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/matches"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/matches')
                      ? 'bg-pink-50 text-[#8B0036] font-semibold'
                      : 'text-gray-700 hover:text-[#8B0036] hover:bg-pink-50/50'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  Matches
                </Link>

                <Link
                  to="/chat"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/chat')
                      ? 'bg-pink-50 text-[#8B0036] font-semibold'
                      : 'text-gray-700 hover:text-[#8B0036] hover:bg-pink-50/50'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat
                </Link>

                <div className="h-5 w-px bg-gray-200 mx-2" />

                <Link
                  to="/profile"
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-pink-50/60 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full p-0.5 bg-gradient-to-tr from-[#8B0036] to-[#FF4081]">
                    <img
                      src={
                        getAssetUrl(profile?.photoUrl) ||
                        `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                          profile?.firstName || 'User'
                        )}`
                      }
                      alt={profile?.firstName || 'Profile'}
                      className="w-full h-full object-cover rounded-full bg-white"
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{profile?.firstName || 'My Profile'}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <a
                  href="#how-it-works"
                  className="px-3.5 py-2 text-sm font-medium text-gray-600 hover:text-[#8B0036] transition-colors"
                >
                  How It Works
                </a>
                <a
                  href="#privacy"
                  className="px-3.5 py-2 text-sm font-medium text-gray-600 hover:text-[#8B0036] transition-colors"
                >
                  Private Chat
                </a>

                <div className="h-5 w-px bg-gray-200 mx-2" />

                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-[#8B0036] hover:text-[#D81B60] transition-colors"
                >
                  Sign In
                </Link>

                <Link
                  to="/register"
                  className="px-5 py-2 rounded-xl text-sm font-semibold btn-festive-primary text-white shadow-sm"
                >
                  Join Dandiya +1
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && incomingCount > 0 && (
              <Link to="/requests" className="p-2 text-[#D81B60] relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D81B60]" />
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-pink-100 bg-white/95 backdrop-blur-md px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-pink-50/50 mb-3">
                <img
                  src={
                    getAssetUrl(profile?.photoUrl) ||
                    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                      profile?.firstName || 'User'
                    )}`
                  }
                  alt={profile?.firstName}
                  className="w-10 h-10 rounded-full object-cover border border-pink-200"
                />
                <div>
                  <p className="font-bold text-gray-900">{profile?.firstName}</p>
                  <p className="text-xs text-gray-500">📍 {profile?.city}</p>
                </div>
              </div>

              <Link
                to="/discover"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-800 hover:bg-pink-50"
              >
                <Compass className="w-4 h-4 text-[#8B0036]" />
                Discover Partners
              </Link>

              <Link
                to="/requests"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-gray-800 hover:bg-pink-50"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-[#8B0036]" />
                  <span>Dandiya Requests</span>
                </div>
                {incomingCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-[#D81B60] text-white rounded-full">
                    {incomingCount}
                  </span>
                )}
              </Link>

              <Link
                to="/matches"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-800 hover:bg-pink-50"
              >
                <Heart className="w-4 h-4 text-[#8B0036]" />
                Mutual Matches
              </Link>

              <Link
                to="/chat"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-800 hover:bg-pink-50"
              >
                <MessageCircle className="w-4 h-4 text-[#8B0036]" />
                Private Chats
              </Link>

              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-800 hover:bg-pink-50"
              >
                <User className="w-4 h-4 text-[#8B0036]" />
                Edit Profile
              </Link>

              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            </>
          ) : (
            <>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-pink-50"
              >
                How It Works
              </a>
              <a
                href="#privacy"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-pink-50"
              >
                Private Chat (E2EE)
              </a>
              <div className="pt-3 space-y-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full py-2.5 text-center text-sm font-semibold text-[#8B0036] border border-pink-200 rounded-xl hover:bg-pink-50"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full py-2.5 text-center text-sm font-semibold btn-festive-primary text-white rounded-xl shadow-md"
                >
                  Find My Dandiya +1
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
};
