import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getAssetUrl } from '../lib/api';
import { Match } from '../types';
import { Heart, MessageCircle, MoreVertical, Flame, MapPin, Sparkles } from 'lucide-react';
import { BlockModal } from '../components/common/BlockModal';
import { ReportModal } from '../components/common/ReportModal';

export const MatchesPage: React.FC = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // Safety modal states
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      api.trackEvent({ eventType: 'page_view', route: '/matches' });
      const res = await api.getMatches();
      setMatches(res?.matches || []);
    } catch (err) {
      console.error('Failed to load matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const handleUnmatch = async (matchId: string) => {
    if (confirm('Are you sure you want to unmatch? The private chat will be closed.')) {
      try {
        await api.unmatch(matchId);
        fetchMatches();
      } catch (err: any) {
        alert(err.message || 'Failed to unmatch');
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 text-primary text-xs font-semibold uppercase tracking-wider mb-2 border border-pink-500/20">
          <Heart className="w-4 h-4 text-[#D81B60]" />
          Mutual Connections
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold font-display text-foreground">
          Your Dandiya Matches
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-hand text-base">
          You both accepted each other&apos;s requests. Private encrypted chat is active.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-card/60 animate-pulse border border-border" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-20 bg-card/70 backdrop-blur-md rounded-3xl border border-border max-w-md mx-auto p-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-pink-500/10 flex items-center justify-center text-primary">
            <Heart className="w-8 h-8 text-[#D81B60]" />
          </div>
          <h3 className="text-xl font-bold font-serif text-foreground">No mutual matches yet</h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            When someone accepts your Dandiya request or you accept theirs, they will appear here!
          </p>
          <div className="pt-2">
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl btn-festive-primary text-white text-xs font-semibold shadow-md cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Discover Dancers
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => {
            const p = match.otherProfile;
            if (!p) return null;
            return (
              <div
                key={match.id}
                className="relative p-6 rounded-3xl festive-glass-card border border-border flex flex-col justify-between space-y-4 hover:-translate-y-1 transition-transform"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="relative">
                      <img
                        src={
                          getAssetUrl(p.photoUrl) ||
                          `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                            p.firstName
                          )}`
                        }
                        alt={p.firstName}
                        className="w-20 h-20 rounded-full object-cover border-2 border-primary bg-card"
                      />
                    </div>

                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveMenuId(activeMenuId === match.id ? null : match.id)
                        }
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted cursor-pointer"
                        aria-label="Options"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {activeMenuId === match.id && (
                        <div
                          className="absolute right-0 mt-1 w-36 bg-popover text-popover-foreground rounded-xl shadow-lg border border-border py-1.5 z-20"
                          onMouseLeave={() => setActiveMenuId(null)}
                        >
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              handleUnmatch(match.id);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
                          >
                            Unmatch
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setSelectedUser({ id: p.userId, name: p.firstName });
                              setShowReportModal(true);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
                          >
                            Report User
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setSelectedUser({ id: p.userId, name: p.firstName });
                              setShowBlockModal(true);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer"
                          >
                            Block User
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-bold font-serif text-foreground">
                      {p.firstName}, {p.age}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 text-[#D81B60]" />
                      <span>{p.city}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-300/30 flex items-center gap-1 font-medium">
                      <Flame className="w-3 h-3 text-amber-500" />
                      {p.danceLevel}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-500/10 text-primary border border-pink-200/30 font-medium">
                      {p.lookingFor}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground italic pt-3 line-clamp-2">
                    &ldquo;{p.bio || 'Matched to play Dandiya together!'}&rdquo;
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (match.conversationId) {
                        navigate(`/chat/${match.conversationId}`);
                      } else {
                        navigate('/chat');
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-xl text-white text-xs font-semibold btn-festive-primary shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Start Chat
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedUser && (
        <>
          <BlockModal
            isOpen={showBlockModal}
            onClose={() => {
              setShowBlockModal(false);
              setSelectedUser(null);
            }}
            targetUserId={selectedUser.id}
            targetUserName={selectedUser.name}
            onBlocked={fetchMatches}
          />
          <ReportModal
            isOpen={showReportModal}
            onClose={() => {
              setShowReportModal(false);
              setSelectedUser(null);
            }}
            targetUserId={selectedUser.id}
            targetUserName={selectedUser.name}
          />
        </>
      )}
    </div>
  );
};
