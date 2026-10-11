import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { DandiyaIcon } from '../components/common/DandiyaIcon';
import { ProfileCard } from '../components/profile/ProfileCard';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Lock,
  HeartHandshake,
  Music,
  Users,
  Compass,
  CheckCircle2,
  XCircle,
  Flame,
  MessageCircle,
  Clock,
  Heart,
} from 'lucide-react';
import { Profile } from '../types';

// Authentic Pinterest Indian no-face aesthetic Garba profiles
const PREVIEW_PROFILES: Profile[] = [
  {
    id: 'p-1',
    userId: 'mock-1',
    firstName: 'Riya',
    age: 22,
    city: 'Pune',
    sex: 'F',
    danceLevel: 'Intermediate',
    lookingFor: 'Partner',
    bio: 'Here for the music, lights and good vibes! Looking for someone who can keep up with the 3-taali Garba rhythm.',
    photoUrl: '/assets/sample_riya.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-2',
    userId: 'mock-2',
    firstName: 'Arjun',
    age: 24,
    city: 'Ahmedabad',
    sex: 'M',
    danceLevel: 'Pro',
    lookingFor: 'Group',
    bio: 'Dodhiyu and Sanedo enthusiast. We have a crew of 4 hitting GMDC ground, looking for 2 more dancers to join our circle!',
    photoUrl: '/assets/sample_arjun.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-3',
    userId: 'mock-3',
    firstName: 'Tanvi',
    age: 21,
    city: 'Vadodara',
    sex: 'F',
    danceLevel: 'Beginner',
    lookingFor: 'Friends',
    bio: 'First time playing Dandiya in Vadodara! Looking for patient friends to dance with and teach me the basic steps.',
    photoUrl: '/assets/sample_tanvi.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="relative overflow-hidden">
      {/* ==================================================
          1. HERO SECTION
          ================================================== */}
      <section className="relative min-h-[85vh] lg:min-h-[90vh] flex items-center justify-center pt-8 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left z-10">
            {/* Festival Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-50 border border-pink-200/80 shadow-xs text-xs sm:text-sm font-semibold text-[#8B0036]">
              <Sparkles className="w-4 h-4 text-[#D81B60]" />
              <span>Navratri 2026 is Here</span>
            </div>

            {/* Headline with Rozha One / DM Serif Display */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold font-festive tracking-tight text-gray-900 leading-[1.08]">
              Single this <br />
              <span className="text-shimmer-festive">Navratri?</span>
            </h1>

            {/* Supporting Subtitle */}
            <p className="text-xl sm:text-2xl font-serif text-gray-700 font-normal">
              Find someone to dance with.
            </p>

            <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Don’t sit out while the dhol beats echo across your city. Connect with verified people in your city who also need a Garba or Dandiya partner. Mutual requests, zero swiping pressure, and private encrypted chat.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                to={isAuthenticated ? '/discover' : '/register'}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-semibold btn-festive-primary text-white flex items-center justify-center gap-2.5 shadow-xl hover:scale-105 transition-transform"
              >
                <span>Find My Dandiya Partner</span>
                <ArrowRight className="w-5 h-5" />
              </Link>

              <a
                href="#how-it-works"
                className="w-full sm:w-auto px-6 py-4 rounded-2xl text-base font-semibold btn-festive-secondary flex items-center justify-center gap-2"
              >
                See How It Works
              </a>
            </div>

            {/* Micro Highlights */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-3 text-xs font-medium text-gray-500">
              <span className="flex items-center gap-1.5">
                <Music className="w-4 h-4 text-[#D81B60]" /> Beginner to Pro Dancers
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-[#8B0036]" /> Encrypted 1-to-1 Chat
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#22C55E]" /> Verified City Matches
              </span>
            </div>
          </div>

          {/* Right Visual Asset Column */}
          <div className="lg:col-span-5 relative z-10">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="absolute -inset-4 bg-gradient-to-r from-pink-400/20 via-purple-400/20 to-amber-400/20 rounded-3xl blur-2xl -z-10" />

              {/* Venue Showcase Card */}
              <div className="relative rounded-3xl overflow-hidden border-2 border-white/80 shadow-2xl bg-white group">
                <img
                  src="/assets/hero-bg.jpg"
                  alt="Navratri Garba Night Celebration with fairy lights"
                  className="w-full h-80 sm:h-96 object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />

                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-white/60 shadow-lg flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#8B0036] to-[#D81B60] p-2 flex items-center justify-center shrink-0">
                    <DandiyaIcon className="w-full h-full text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 font-serif">Tonight at the Festival Arena</h3>
                    <p className="text-xs text-[#D81B60] font-medium">Over 240 dancers matched in your city</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          2. HOW IT WORKS (MODERN BENTO GRID)
          ================================================== */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-50 text-[#8B0036] text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#D81B60]" />
              Simple &amp; Respectful Flow
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold font-festive text-gray-900">
              How Dandiya +1 Works
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              No endless questionnaires or toxic swiping mechanics. Just four easy steps to get you on the dance floor.
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1 (Span 2) */}
            <div className="md:col-span-2 bento-card p-8 flex flex-col justify-between group">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#8B0036] font-serif font-bold text-lg flex items-center justify-center border border-rose-200 mb-3">
                    01
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold font-serif text-gray-900">
                    Create Your Profile in 90 Seconds
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-md">
                    Select your city, state your dance level, choose what you’re looking for, and add one profile photo. No personality tests required.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-pink-50 text-xs font-semibold text-[#8B0036] flex items-center gap-1.5 shrink-0">
                  <Clock className="w-3.5 h-3.5" /> 90 seconds
                </span>
              </div>

              {/* Visual Micro-Preview in Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-50/60 via-purple-50/40 to-white border border-pink-100/80 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-[#8B0036] to-[#D81B60] shrink-0">
                  <img
                    src="/assets/sample_riya.jpg"
                    alt="Sample dancer avatar"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm text-gray-900 font-serif">Riya Patel, 22</p>
                  <p className="text-xs text-gray-500">📍 Pune • 🔥 Intermediate • ❤️ Looking for Partner</p>
                  <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-r from-[#8B0036] to-[#FF4081]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 2 (Span 1) */}
            <div className="bento-card p-8 flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#9333EA] font-serif font-bold text-lg flex items-center justify-center border border-purple-200 mb-3">
                  02
                </div>
                <h3 className="text-xl font-bold font-serif text-gray-900 mb-2">
                  Filter Your City Vibe
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-6">
                  Browse compatible people in your city. Filter by beginner, intermediate, or pro so you always match with dancers at your pace.
                </p>
              </div>

              {/* Interactive Mock Pills */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <span className="flex-1 text-center py-2 px-3 rounded-xl bg-pink-50 border border-pink-200 text-[#8B0036] font-semibold text-xs flex items-center justify-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-[#D81B60]" /> Intermediate
                  </span>
                  <span className="flex-1 text-center py-2 px-3 rounded-xl bg-white border border-gray-200 text-gray-600 text-xs flex items-center justify-center gap-1">
                    Pro
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="flex-1 text-center py-1.5 px-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium text-xs flex items-center justify-center gap-1">
                    <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> Partner
                  </span>
                  <span className="flex-1 text-center py-1.5 px-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-medium text-xs flex items-center justify-center gap-1">
                    <Users className="w-3 h-3 text-blue-500" /> Group
                  </span>
                </div>
              </div>
            </div>

            {/* Bento Card 3 (Span 1) */}
            <div className="bento-card p-8 flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 font-serif font-bold text-lg flex items-center justify-center border border-amber-200 mb-3">
                  03
                </div>
                <h3 className="text-xl font-bold font-serif text-gray-900 mb-2">
                  Mutual Match Guarantee
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-6">
                  Send a Dandiya request. The chat only unlocks once the recipient accepts. Neither party can be spammed without mutual consent.
                </p>
              </div>

              {/* Match Visual Badge */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white shadow-xs flex items-center justify-center font-bold text-xs text-gray-800">
                    You
                  </div>
                  <DandiyaIcon className="w-6 h-6 text-[#8B0036]" />
                  <div className="w-8 h-8 rounded-full bg-white shadow-xs flex items-center justify-center font-bold text-xs text-gray-800">
                    Partner
                  </div>
                </div>
                <p className="text-[11px] font-semibold text-amber-900">
                  🎉 Both Accept = Match Active
                </p>
              </div>
            </div>

            {/* Bento Card 4 (Span 2) */}
            <div className="md:col-span-2 bento-card p-8 flex flex-col justify-between group">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 font-serif font-bold text-lg flex items-center justify-center border border-emerald-200 mb-3">
                    04
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold font-serif text-gray-900">
                    Private Encrypted Chat &amp; Dance
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-md">
                    Coordinate which Garba ground or club arena to meet at. All messages are encrypted right on your phone so your privacy is 100% protected.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-xs font-semibold text-emerald-800 flex items-center gap-1.5 shrink-0">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" /> End-to-End Encrypted
                </span>
              </div>

              {/* Chat Simulation Preview */}
              <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-2 text-xs">
                <div className="flex justify-start">
                  <span className="bg-gray-100 text-gray-800 py-1.5 px-3 rounded-2xl rounded-bl-xs">
                    Hey! Heading to YMCA ground tonight around 8 PM? 🪘
                  </span>
                </div>
                <div className="flex justify-end">
                  <span className="btn-festive-primary text-white py-1.5 px-3 rounded-2xl rounded-br-xs font-medium">
                    Yes! Got our dandiya sticks ready. See you near Gate 2! ✨
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          3. LIVE DISCOVERY PREVIEW (Aesthetic Pinterest Indian No-Face)
          ================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative z-10 bg-gradient-to-b from-transparent via-pink-50/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D81B60] uppercase tracking-wider mb-2">
                <Compass className="w-4 h-4" /> Live Discovery
              </div>
              <h2 className="text-3xl sm:text-5xl font-bold font-festive text-gray-900">
                People Looking for a +1 Right Now
              </h2>
            </div>
            <Link
              to={isAuthenticated ? '/discover' : '/register'}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#8B0036] hover:text-[#D81B60] group"
            >
              Browse All Profiles in Your City{' '}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PREVIEW_PROFILES.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onRequestSend={async () => {
                  if (!isAuthenticated) {
                    window.location.href = '/register';
                  }
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================
          4. "NOT A DATING APP" PREMIUM SHOWCASE
          ================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto rounded-3xl bento-card p-8 sm:p-14 border border-pink-200/80 shadow-2xl relative overflow-hidden bg-white/95">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-pink-200/30 via-purple-200/20 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-pink-50 border border-pink-200 flex items-center justify-center text-[#8B0036] shadow-sm">
              <HeartHandshake className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-pink-50 border border-pink-200 text-xs font-bold uppercase tracking-wider text-[#8B0036]">
              Authentic Festival Spirit
            </div>

            <h2 className="text-3xl sm:text-5xl font-bold font-festive text-gray-900 leading-tight">
              &ldquo;Not a dating app. Just someone to dance with.&rdquo;
            </h2>

            <p className="text-base sm:text-lg text-gray-600 leading-relaxed font-light">
              Dandiya Raas is a celebration of rhythm, colors, and collective joy. You shouldn’t have to suffer through awkward dating app expectations, superficial swipes, or toxic ghosting just to find someone who loves Garba as much as you do.
            </p>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-left">
              <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-500" /> Typical Dating Apps
                </p>
                <ul className="text-xs text-gray-600 space-y-1.5">
                  <li>• High pressure romantic expectations</li>
                  <li>• Endless swiping and algorithmic games</li>
                  <li>• Unsolicited spam from strangers</li>
                  <li>• Exact location tracking vulnerabilities</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Dandiya +1
                </p>
                <ul className="text-xs text-gray-600 space-y-1.5">
                  <li>• Focused purely on finding a dance partner</li>
                  <li>• Zero swiping; browse directly by dance level</li>
                  <li>• Mutual acceptance required before any chat</li>
                  <li>• City-level privacy only; no GPS tracking</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          5. MODERN ENCRYPTED CHAT ASSURANCE SECTION (NO CODE BOX)
          ================================================== */}
      <section id="privacy" className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto rounded-3xl bento-card p-8 sm:p-12 border border-pink-100/90 shadow-xl bg-gradient-to-br from-white via-white/95 to-pink-50/40">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5 text-emerald-600" /> 100% End-to-End Encrypted
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold font-festive text-gray-900 leading-tight">
                Private, Safe &amp; Completely Confidential
              </h2>

              <p className="text-sm sm:text-base text-gray-600 leading-relaxed font-light">
                Feel completely free to chat. Your private 1-to-1 conversations are automatically encrypted on your device before they are sent.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-xs flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-50 text-[#8B0036] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Zero Server Plaintext</h4>
                    <p className="text-[11px] text-gray-500">We never see your messages</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-xs flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#9333EA] flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Chat Freely</h4>
                    <p className="text-[11px] text-gray-500">Coordinate grounds &amp; timing</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Visual Graphic */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-gradient-to-tr from-[#8B0036]/10 via-[#D81B60]/10 to-[#F59E0B]/10 p-4 flex items-center justify-center">
                <div className="w-48 h-48 rounded-full bg-white shadow-xl border border-pink-100 flex flex-col items-center justify-center p-6 text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#8B0036] to-[#D81B60] text-white flex items-center justify-center shadow-lg">
                    <Lock className="w-7 h-7" />
                  </div>
                  <span className="font-festive font-bold text-base text-gray-900">Encrypted</span>
                  <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    ✓ Protected on Device
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
