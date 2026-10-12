import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAssetUrl } from '../lib/api';
import { ConnectionRequest, Profile } from '../types';
import { DandiyaIcon } from '../components/common/DandiyaIcon';
import { Bell, Check, X, MapPin, Flame, MessageCircle, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';

export const RequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [incoming, setIncoming] = useState<ConnectionRequest[]>([]);
  const [outgoing, setOutgoing] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Match celebration state
  const [matchedData, setMatchedData] = useState<{
    profile: Profile;
    conversationId: string;
  } | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      api.trackEvent({ eventType: 'page_view', route: '/requests' });
      const [incRes, outRes] = await Promise.all([
        api.getIncomingRequests(),
        api.getOutgoingRequests(),
      ]);
      setIncoming(incRes?.requests || []);
      setOutgoing(outRes?.requests || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAccept = async (req: ConnectionRequest) => {
    try {
      const res = await api.acceptRequest(req.id);

      confetti({
        particleCount: 130,
        spread: 85,
        origin: { y: 0.6 },
        colors: ['#8B0036', '#D81B60', '#FF4081', '#F59E0B'],
      });

      setMatchedData({
        profile: res.otherProfile || req.fromProfile!,
        conversationId: res.conversationId,
      });

      fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to accept request');
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await api.declineRequest(id);
      fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to decline request');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.cancelRequest(id);
      fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel request');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
      {/* Page Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 text-primary text-xs font-semibold uppercase tracking-wider mb-2 border border-pink-500/20">
          <Bell className="w-4 h-4 text-[#D81B60]" />
          Connection Inquiries
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold font-display text-foreground">
          Dandiya Requests
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-hand text-base">
          Review incoming requests to dance together or track your outgoing invitations.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-8">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'incoming'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Incoming
          {incoming.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-[#D81B60] text-white">
              {incoming.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('outgoing')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'outgoing'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Outgoing Sent
          {outgoing.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground font-medium">
              {outgoing.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-card/60 animate-pulse rounded-2xl border border-border" />
          ))}
        </div>
      ) : activeTab === 'incoming' ? (
        incoming.length === 0 ? (
          <div className="text-center py-16 bg-card/70 backdrop-blur-sm rounded-3xl border border-border p-8 space-y-3">
            <Heart className="w-10 h-10 mx-auto text-primary/40" />
            <h3 className="text-lg font-bold font-serif text-foreground">No incoming requests yet</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
              Your profile is visible in discovery. You can also explore dancers in your city and send the first request!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {incoming.map((req) => {
              const p = req.fromProfile;
              if (!p) return null;
              return (
                <div
                  key={req.id}
                  className="p-5 sm:p-6 rounded-3xl festive-glass-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        getAssetUrl(p.photoUrl) ||
                        `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                          p.firstName
                        )}`
                      }
                      alt={p.firstName}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-primary shrink-0 bg-card"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold font-serif text-foreground">
                          {p.firstName}, {p.age}
                        </h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-300/30 flex items-center gap-1 font-medium">
                          <Flame className="w-3 h-3 text-amber-500" />
                          {p.danceLevel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 text-[#D81B60]" />
                        <span>{p.city}</span>
                        <span className="mx-1">•</span>
                        <span>Looking for: {p.lookingFor}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 italic pt-1">
                        &ldquo;{p.bio || 'Wants to play Dandiya with you!'}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => handleDecline(req.id)}
                      className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </button>
                    <button
                      onClick={() => handleAccept(req)}
                      className="px-6 py-2.5 rounded-xl text-white text-xs font-semibold btn-festive-primary shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      Accept Request
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : outgoing.length === 0 ? (
        <div className="text-center py-16 bg-card/70 backdrop-blur-sm rounded-3xl border border-border p-8 space-y-3">
          <DandiyaIcon className="w-10 h-10 mx-auto text-primary/40" />
          <h3 className="text-lg font-bold font-serif text-foreground">No outgoing requests sent</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
            Browse compatible people in your city and send a request to start dancing!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {outgoing.map((req) => {
            const p = req.toProfile;
            return (
              <div
                key={req.id}
                className="p-5 rounded-2xl festive-glass-card border border-border flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={
                      getAssetUrl(p?.photoUrl) ||
                      `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                        p?.firstName || 'User'
                      )}`
                    }
                    alt={p?.firstName || 'User'}
                    className="w-12 h-12 rounded-full object-cover border border-border bg-card"
                  />
                  <div>
                    <h4 className="font-bold text-foreground text-sm">
                      {p?.firstName || 'Dancer'}, {p?.age}
                    </h4>
                    <p className="text-xs text-muted-foreground">📍 {p?.city || 'City'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      req.status === 'ACCEPTED'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300/30'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-300/30'
                    }`}
                  >
                    {req.status === 'ACCEPTED' ? '✓ Accepted' : '⏳ Pending'}
                  </span>

                  {req.status === 'REQUESTED' && (
                    <button
                      onClick={() => handleCancel(req.id)}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mutual Match Celebration Modal */}
      {matchedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95">
          <div className="relative w-full max-w-md bg-card text-card-foreground rounded-3xl shadow-2xl border-2 border-primary/30 p-8 text-center space-y-6">
            <div className="text-5xl">🎉</div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-foreground">
                You matched!
              </h2>
              <p className="text-sm text-muted-foreground font-medium">
                &ldquo;You both want someone to play Dandiya with.&rdquo;
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 py-2">
              <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-[#8B0036] to-[#D81B60]">
                <img
                  src={
                    getAssetUrl(matchedData.profile.photoUrl) ||
                    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                      matchedData.profile.firstName
                    )}`
                  }
                  alt={matchedData.profile.firstName}
                  className="w-full h-full object-cover rounded-full bg-card"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {matchedData.profile.firstName} ({matchedData.profile.danceLevel} dancer in{' '}
              {matchedData.profile.city}) is ready to connect.
            </p>

            <div className="pt-2">
              <button
                onClick={() => navigate(`/chat/${matchedData.conversationId}`)}
                className="w-full py-3.5 rounded-2xl font-semibold text-base btn-festive-primary text-white shadow-xl flex items-center justify-center gap-2 cursor-pointer"
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
