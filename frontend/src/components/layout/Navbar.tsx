import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { DandiyaIcon } from '../common/DandiyaIcon';
import { getAssetUrl } from '../../lib/api';
import { Menu, X, LogOut, User, MessageCircle, Heart, Compass, Bell, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  incomingCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ incomingCount = 0 }) => {
  const { isAuthenticated, user, profile, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-card/85 backdrop-blur-md border-b border-border transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B0036] via-[#D81B60] to-[#F59E0B] p-1.5 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <DandiyaIcon className="w-full h-full text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold font-display tracking-tight text-foreground group-hover:text-primary transition-colors">
                Dandiya <span className="text-primary">+1</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-primary font-semibold -mt-1 hidden sm:block">
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
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  Discover
                </Link>

                <Link
                  to="/requests"
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/requests')
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  Matches
                </Link>

                <Link
                  to="/chat"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/chat')
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat
                </Link>

                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive('/admin')
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    Analytics
                  </Link>
                )}

                <div className="h-5 w-px bg-border mx-2" />

                <Link
                  to="/profile"
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-muted transition-colors"
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
                      className="w-full h-full object-cover rounded-full bg-card"
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{profile?.firstName || 'My Profile'}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors cursor-pointer"
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
                  className="px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  How It Works
                </a>
                <a
                  href="#privacy"
                  className="px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  Private Chat
                </a>

                <div className="h-5 w-px bg-border mx-2" />

                <Link
                  to="/login"
                  className="px-4 py-2 font-hand text-base font-semibold text-primary hover:underline transition-colors"
                >
                  Sign In
                </Link>

                <Link
                  to="/register"
                  className="px-5 py-2 rounded-xl font-hand text-base font-semibold btn-festive-primary text-white shadow-sm"
                >
                  Join Dandiya +1
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden items-center gap-1.5">

            {isAuthenticated && incomingCount > 0 && (
              <Link to="/requests" className="p-2 text-[#D81B60] relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D81B60]" />
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-md px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/50 mb-3 border border-border">
                <img
                  src={
                    getAssetUrl(profile?.photoUrl) ||
                    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                      profile?.firstName || 'User'
                    )}`
                  }
                  alt={profile?.firstName}
                  className="w-10 h-10 rounded-full object-cover border border-border"
                />
                <div>
                  <p className="font-bold text-foreground">{profile?.firstName}</p>
                  <p className="text-xs text-muted-foreground">📍 {profile?.city}</p>
                </div>
              </div>

              <Link
                to="/discover"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted"
              >
                <Compass className="w-4 h-4 text-primary" />
                Discover Partners
              </Link>

              <Link
                to="/requests"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-primary" />
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted"
              >
                <Heart className="w-4 h-4 text-primary" />
                Mutual Matches
              </Link>

              <Link
                to="/chat"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted"
              >
                <MessageCircle className="w-4 h-4 text-primary" />
                Private Chats
              </Link>

              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted"
                >
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Admin Analytics
                </Link>
              )}

              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted"
              >
                <User className="w-4 h-4 text-primary" />
                Edit Profile
              </Link>

              <div className="pt-2 border-t border-border">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 cursor-pointer"
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
                className="block px-3 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-muted cursor-pointer"
              >
                How It Works
              </a>
              <a
                href="#privacy"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-muted cursor-pointer"
              >
                Private Chat (E2EE)
              </a>
              <div className="pt-3 space-y-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full py-2.5 text-center font-hand text-base font-semibold text-primary border border-border rounded-xl hover:bg-muted"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full py-2.5 text-center font-hand text-base font-semibold btn-festive-primary text-white rounded-xl shadow-md"
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
