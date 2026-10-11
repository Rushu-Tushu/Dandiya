import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api, getAssetUrl } from '../lib/api';
import { Profile, DanceLevel, LookingFor } from '../types';
import { ProfileCard } from '../components/profile/ProfileCard';
import { Compass, Filter, Sparkles, MessageCircle, MapPin, X } from 'lucide-react';
import confetti from 'canvas-confetti';

const POPULAR_CITIES = ['Ahmedabad', 'Mumbai', 'Pune', 'Vadodara', 'Surat', 'Rajkot', 'Bengaluru'];

export const DiscoveryPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile: currentProfile } = useAuthStore();

  const [city, setCity] = useState(currentProfile?.city || 'Ahmedabad');
  const [danceLevel, setDanceLevel] = useState<string>('');
  const [lookingFor, setLookingFor] = useState<string>('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  // Mutual match celebration modal state
  const [matchedPartner, setMatchedPartner] = useState<{
    profile: Profile;
    conversationId: string;
  } | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.discover({
        city,
        danceLevel: danceLevel || undefined,
        lookingFor: lookingFor || undefined,
      });
      setProfiles(data?.profiles || []);

      // Also fetch outgoing requests to mark sent
      const out = await api.getOutgoingRequests();
      const sentSet = new Set<string>();
      (out?.requests || []).forEach((r) => sentSet.add(r.toUserId));
      setSentRequests(sentSet);
    } catch (err) {
      console.error('Failed to load discovery profiles:', err);
    } finally {
      setLoading(false);
    }
  }, [city, danceLevel, lookingFor]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleSendRequest = async (targetUserId: string) => {
    try {
      const res = await api.sendRequest(targetUserId);

      // Check if instant mutual match occurred!
      if ((res as any).matchId && (res as any).conversationId) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#8B0036', '#D81B60', '#FF4081', '#F59E0B'],
        });

        const targetP = profiles.find((p) => p.userId === targetUserId);
        if (targetP) {
          setMatchedPartner({
            profile: targetP,
            conversationId: (res as any).conversationId,
          });
        }
      } else {
        setSentRequests((prev) => new Set(prev).add(targetUserId));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send Dandiya request');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-[#8B0036] text-xs font-semibold uppercase tracking-wider mb-2">
            <Compass className="w-4 h-4 text-[#D81B60]" />
            Live Partner Discovery
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-serif text-gray-900">
            Find Your Dandiya Partner
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Showing people looking for a dance partner in{' '}
            <strong className="text-[#8B0036]">{city}</strong>
          </p>
        </div>

        {/* City Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {POPULAR_CITIES.map((c) => (
            <button
              key={c}
              onClick={() => setCity(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                city.toLowerCase() === c.toLowerCase()
                  ? 'bg-[#8B0036] text-white shadow-xs font-semibold'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-pink-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/90 backdrop-blur-md border border-pink-100/80 shadow-sm mb-10 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2 text-gray-500 font-semibold uppercase tracking-wider">
          <Filter className="w-4 h-4 text-[#8B0036]" />
          <span>Filters:</span>
        </div>

        {/* Custom City Input */}
        <div className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-2.5 py-1.5 bg-white">
          <MapPin className="w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Change city..."
            className="w-28 text-xs focus:outline-none text-gray-800"
          />
        </div>

        {/* Dance Level Selector */}
        <select
          value={danceLevel}
          onChange={(e) => setDanceLevel(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-700 focus:outline-none"
        >
          <option value="">All Dance Levels</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Pro">Pro</option>
        </select>

        {/* Looking For Selector */}
        <select
          value={lookingFor}
          onChange={(e) => setLookingFor(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-700 focus:outline-none"
        >
          <option value="">Looking for: Anyone</option>
          <option value="Partner">Partner</option>
          <option value="Friends">Friends</option>
          <option value="Group">Group</option>
        </select>

        {(danceLevel || lookingFor) && (
          <button
            onClick={() => {
              setDanceLevel('');
              setLookingFor('');
            }}
            className="text-[#8B0036] hover:underline font-semibold ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Profile Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-96 rounded-3xl bg-white/60 animate-pulse border border-pink-100/50"
            />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-20 bg-white/70 backdrop-blur-md rounded-3xl border border-pink-100 max-w-lg mx-auto p-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-pink-50 flex items-center justify-center text-[#8B0036]">
            <Sparkles className="w-8 h-8 text-[#D81B60]" />
          </div>
          <h3 className="text-xl font-bold font-serif text-gray-900">
            No dancers found in {city} yet
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Be the pioneer! Try selecting another nearby city like Ahmedabad, Mumbai, or Pune, or invite your friends.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {profiles.map((p) => (
            <ProfileCard
              key={p.userId}
              profile={p}
              isRequested={sentRequests.has(p.userId)}
              onRequestSend={handleSendRequest}
              onBlocked={fetchProfiles}
            />
          ))}
        </div>
      )}

      {/* Mutual Match Celebration Modal */}
      {matchedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-pink-200 p-8 text-center space-y-6">
            <button
              onClick={() => setMatchedPartner(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-5xl">🎉</div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-gray-900">
                You matched!
              </h2>
              <p className="text-sm text-gray-600 font-medium">
                &ldquo;You both want someone to play Dandiya with.&rdquo;
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 py-2">
              <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-[#8B0036] to-[#D81B60]">
                <img
                  src={
                    getAssetUrl(matchedPartner.profile.photoUrl) ||
                    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                      matchedPartner.profile.firstName
                    )}`
                  }
                  alt={matchedPartner.profile.firstName}
                  className="w-full h-full object-cover rounded-full bg-white"
                />
              </div>
            </div>

            <p className="text-xs text-gray-500">
              {matchedPartner.profile.firstName} is in {matchedPartner.profile.city} (
              {matchedPartner.profile.danceLevel} dancer). Private encrypted chat is now open!
            </p>

            <div className="pt-2">
              <button
                onClick={() => navigate(`/chat/${matchedPartner.conversationId}`)}
                className="w-full py-3.5 rounded-2xl font-semibold text-base btn-festive-primary text-white shadow-xl flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Start Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
