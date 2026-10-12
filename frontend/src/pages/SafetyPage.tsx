import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import {
  Lock,
  MapPin,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { DandiyaIcon } from '../components/common/DandiyaIcon';

export const SafetyPage: React.FC = () => {
  useEffect(() => {
    api.trackEvent({ eventType: 'page_view', route: '/safety' });
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10 space-y-12">
      {/* Header Banner */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="w-3.5 h-3.5 text-[#D81B60]" />
          Festival Trust &amp; Safety
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold font-display text-foreground leading-tight">
          Safe, Respectful &amp; Secure
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground font-hand text-xl leading-relaxed">
          Dandiya +1 is built for genuine people looking for a dance partner during Navratri. Here is how we ensure your safety both online and on the dance floor.
        </p>
      </div>

      {/* Modern Bento Trust Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1 */}
        <div className="bento-card p-8 space-y-4 group">
          <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-primary shadow-xs">
            <MapPin className="w-6 h-6 text-[#D81B60]" />
          </div>
          <h3 className="text-xl font-bold font-serif text-foreground">
            Zero GPS Exposure (City-Level Only)
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-light">
            We intentionally never collect, store, or expose exact GPS coordinates. Your profile only reveals your city name (e.g. Pune, Ahmedabad). Your home address, neighborhood, and live coordinates are never exposed.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Exact location is completely shielded</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bento-card p-8 space-y-4 group">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold font-serif text-foreground">
            End-to-End Encrypted Private Chat
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-light">
            1-to-1 conversations are encrypted directly on your browser using native Web Crypto (ECDH + AES-256-GCM). Even our backend servers and database only see opaque ciphertext.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Zero server plaintext storage guarantee</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bento-card p-8 space-y-4 group">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 shadow-xs">
            <EyeOff className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold font-serif text-foreground">
            Mutual Consent Unlocks Chat
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-light">
            No stranger can send you unsolicited messages. A chat room only unlocks once both you and the other dancer mutually exchange and accept Dandiya requests.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Anti-spam &amp; unsolicited messaging protection</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bento-card p-8 space-y-4 group">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold font-serif text-foreground">
            One-Tap Instant Block &amp; Report
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-light">
            You maintain complete control. Blocking a user instantly breaks any match, removes the chat, and hides your profile from their discovery feed permanently.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Immediate isolation with active moderation hooks</span>
          </div>
        </div>
      </div>

      {/* In-Person Meeting Safety Guide */}
      <div className="p-8 sm:p-10 rounded-3xl bento-card border border-border shadow-xl space-y-6 bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B0036] to-[#D81B60] p-1.5 flex items-center justify-center text-white shrink-0">
            <DandiyaIcon className="w-full h-full" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-serif text-foreground">
              Navratri Festival Meetup Etiquette
            </h2>
            <p className="text-xs text-muted-foreground">Best practices when meeting your Dandiya +1 in person</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-foreground font-light">
          <div className="p-4 rounded-2xl bg-background border border-border shadow-xs flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              1
            </div>
            <div>
              <p className="font-semibold text-foreground mb-0.5">Meet at Public Arenas Only</p>
              <p className="text-xs text-muted-foreground">
                Always meet inside well-lit official festival grounds, club venues, or college auditoriums near crowded gates.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-background border border-border shadow-xs flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              2
            </div>
            <div>
              <p className="font-semibold text-foreground mb-0.5">Tell a Friend or Family Member</p>
              <p className="text-xs text-muted-foreground">
                Inform a friend about which festival venue you are visiting and your plans for the night.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-background border border-border shadow-xs flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              3
            </div>
            <div>
              <p className="font-semibold text-foreground mb-0.5">Arrange Your Own Transport</p>
              <p className="text-xs text-muted-foreground">
                Ensure you have your own ride to and from the venue, whether via your vehicle, cab, or metro.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-background border border-border shadow-xs flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              4
            </div>
            <div>
              <p className="font-semibold text-foreground mb-0.5">Trust Your Intuition</p>
              <p className="text-xs text-muted-foreground">
                If someone acts inappropriately or makes you uncomfortable, you have the full right to leave, unmatch, and block immediately.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Emergency helpline: In case of any immediate assistance at the venue, contact local ground security or police helpline <strong>112</strong>.
          </p>

          <Link
            to="/discover"
            className="px-6 py-2.5 rounded-xl font-semibold text-xs btn-festive-primary text-white shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <span>Back to Discovery</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
