import React, { useState } from 'react';
import { MapPin, MoreVertical, Flame, Users, Heart, Sparkles, Check, Send, Info } from 'lucide-react';
import { Profile } from '../../types';
import { getAssetUrl } from '../../lib/api';
import { DandiyaIcon } from '../common/DandiyaIcon';
import { BlockModal } from '../common/BlockModal';
import { ReportModal } from '../common/ReportModal';
import { DemoProfileModal } from '../common/DemoProfileModal';

interface ProfileCardProps {
  profile: Profile;
  onRequestSend?: (userId: string) => Promise<void>;
  isRequested?: boolean;
  isMatched?: boolean;
  onStartChat?: (userId: string) => void;
  onBlocked?: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onRequestSend,
  isRequested = false,
  isMatched = false,
  onStartChat,
  onBlocked,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [sending, setSending] = useState(false);

  const sexSymbol = profile.sex === 'F' ? '♀' : profile.sex === 'M' ? '♂' : '⚧';

  const handleSend = async () => {
    if (profile.isDemo) {
      setShowDemoModal(true);
      return;
    }
    if (!onRequestSend || isRequested || isMatched || sending) return;
    setSending(true);
    try {
      await onRequestSend(profile.userId);
    } catch (err: any) {
      if (err?.message?.includes('demo') || err?.message?.includes('sample')) {
        setShowDemoModal(true);
      }
    } finally {
      setSending(false);
    }
  };

  const getDanceLevelColor = (level: string) => {
    switch (level) {
      case 'Pro':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200/50 dark:border-purple-800/40';
      case 'Intermediate':
        return 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-200/50 dark:border-amber-800/40';
      default:
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/40';
    }
  };

  const getLookingForBadge = (looking: string) => {
    switch (looking) {
      case 'Partner':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40">
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> Partner
          </span>
        );
      case 'Group':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40">
            <Sparkles className="w-3 h-3 text-blue-500" /> Group
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-pink-500/10 text-pink-700 dark:text-pink-300 border border-pink-200/50 dark:border-pink-800/40">
            <Users className="w-3 h-3 text-pink-500" /> Friends
          </span>
        );
    }
  };

  return (
    <>
      <div className="relative group rounded-3xl p-6 festive-glass-card transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between overflow-hidden border border-border">
        {/* Subtle festive decorative corner */}
        <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-transparent rounded-bl-full pointer-events-none" />

        {/* Top Header: Avatar & Menu */}
        <div>
          <div className="flex items-start justify-between mb-4">
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-[#8B0036] via-[#D81B60] to-[#F59E0B] shadow-md">
                <img
                  src={
                    getAssetUrl(profile.photoUrl) ||
                    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                      profile.firstName + profile.userId
                    )}`
                  }
                  alt={profile.firstName}
                  className="w-full h-full object-cover rounded-full bg-card"
                  loading="lazy"
                />
              </div>
              <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-card shadow-sm flex items-center justify-center text-xs font-bold text-foreground border border-border">
                {sexSymbol}
              </span>
            </div>

            {/* Safety Dropdown Menu & Demo Badge */}
            <div className="flex flex-col items-end gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
                  aria-label="Safety options"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {showMenu && (
                  <div
                    className="absolute right-0 mt-1 w-36 bg-popover text-popover-foreground rounded-xl shadow-lg border border-border py-1.5 z-20"
                    onMouseLeave={() => setShowMenu(false)}
                  >
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowReportModal(true);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs font-medium text-foreground hover:bg-rose-500/10 hover:text-rose-600 flex items-center gap-2"
                    >
                      Report User
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowBlockModal(true);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs font-medium text-destructive hover:bg-destructive/10 flex items-center gap-2"
                    >
                      Block User
                    </button>
                  </div>
                )}
              </div>

              {profile.isDemo && (
                <button
                  type="button"
                  onClick={() => setShowDemoModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30 hover:bg-amber-500/25 transition-colors cursor-pointer"
                  title="Illustrative demo profile for exploration"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Demo Profile</span>
                </button>
              )}
            </div>
          </div>

          {/* Name & Age */}
          <div className="space-y-1 mb-3">
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-xl font-bold font-serif text-foreground tracking-tight">
                {profile.firstName}
                {profile.lastName ? ` ${profile.lastName}` : ''},
              </h3>
              <span className="text-lg font-normal text-muted-foreground">{profile.age}</span>
            </div>

            {/* City */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-[#D81B60]" />
              <span>{profile.city}</span>
            </div>
          </div>

          {/* Badges: Dance Level & Looking For */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getDanceLevelColor(
                profile.danceLevel
              )}`}
            >
              <Flame className="w-3 h-3 text-amber-500" />
              {profile.danceLevel}
            </span>
            {getLookingForBadge(profile.lookingFor)}
          </div>

          {/* Short Bio */}
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-6 italic bg-pink-500/5 p-2.5 rounded-xl border border-pink-500/10">
            &ldquo;{profile.bio || 'Ready for Navratri beats, lights and Garba vibes!'}&rdquo;
          </p>
        </div>

        {/* CTA Button */}
        <div>
          {isMatched ? (
            <button
              onClick={() => onStartChat && onStartChat(profile.userId)}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <DandiyaIcon className="w-4 h-4" />
              Start Chat
            </button>
          ) : isRequested ? (
            <button
              disabled
              className="w-full py-2.5 px-4 rounded-xl font-medium text-sm bg-pink-500/10 text-primary border border-pink-200/40 cursor-default flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 text-emerald-600" />
              Dandiya Request Sent
            </button>
          ) : profile.isDemo ? (
            <button
              onClick={() => setShowDemoModal(true)}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-700/40 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <Info className="w-4 h-4 text-amber-500" />
              Sample Profile Info
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm btn-festive-primary text-white flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {sending ? (
                'Sending...'
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Dandiya Request
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Safety Modals & Demo Modal */}
      <BlockModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        targetUserId={profile.userId}
        targetUserName={profile.firstName}
        onBlocked={onBlocked}
      />
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetUserId={profile.userId}
        targetUserName={profile.firstName}
      />
      <DemoProfileModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        profileName={profile.firstName}
        cityName={profile.city}
      />
    </>
  );
};
