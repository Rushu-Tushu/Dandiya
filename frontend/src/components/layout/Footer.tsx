import React from 'react';
import { Link } from 'react-router-dom';
import { DandiyaIcon } from '../common/DandiyaIcon';
import { ShieldCheck, Heart, Sparkles, Lock, ArrowUp, Users } from 'lucide-react';

export const Footer: React.FC = () => {
  // Eye-pleasing slow and subtle smooth scroll to top
  const handleScrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    const startPosition = window.pageYOffset;
    if (startPosition === 0) return;

    const duration = 1200; // 1.2s smooth slow easing
    let start: number | null = null;

    // Smooth cubic ease-in-out curve
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeInOutCubic(progress);

      window.scrollTo(0, startPosition * (1 - ease));

      if (elapsed < duration) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  };

  return (
    <footer className="relative mt-24 text-white overflow-hidden">
      {/* Full-width Dandiya Celebration Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url('/assets/footer-bg.jpg')` }}
      />

      {/* Controlled dark & festive gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-[#620024]/80 backdrop-blur-[3px]" />

      {/* Content Container */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 z-10">
        {/* Main CTA Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold uppercase tracking-wider text-pink-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Navratri 2026 Companion
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight text-white drop-shadow-md leading-[1.15]">
            Still looking for your <span className="text-[#FF4081]">Dandiya +1?</span>
          </h2>

          <p className="text-base text-gray-200 font-hand text-xl leading-relaxed max-w-lg mx-auto">
            Sync beats. Make memories. Find someone genuine to dance Dandiya and Garba with in your city tonight.
          </p>

          <div className="pt-2">
            <button
              onClick={handleScrollToTop}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-semibold btn-festive-primary text-white shadow-2xl hover:scale-105 transition-all cursor-pointer group"
            >
              <span>Find Your Match</span>
              <ArrowUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Modern Bento Containers: 3 Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12 border-y border-white/10 mb-12">
          {/* Card 1 */}
          <div className="relative group rounded-3xl p-6 bg-gradient-to-b from-white/12 to-white/5 backdrop-blur-xl border border-white/15 hover:border-pink-400/40 shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-pink-500/20 transition-all" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8B0036] to-[#FF4081] p-0.5 flex items-center justify-center shadow-lg mb-4">
              <div className="w-full h-full bg-black/40 rounded-[14px] flex items-center justify-center">
                <Lock className="w-5 h-5 text-pink-200" />
              </div>
            </div>
            <h4 className="text-lg font-bold text-white font-serif tracking-wide mb-1.5">
              Encrypted Chats
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed font-light">
              End-to-end encrypted directly on your device. Chat freely, coordinate your venue, and know your conversations stay 100% private.
            </p>
          </div>

          {/* Card 2 */}
          <div className="relative group rounded-3xl p-6 bg-gradient-to-b from-white/12 to-white/5 backdrop-blur-xl border border-white/15 hover:border-purple-400/40 shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/20 transition-all" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#9333EA] to-[#D81B60] p-0.5 flex items-center justify-center shadow-lg mb-4">
              <div className="w-full h-full bg-black/40 rounded-[14px] flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-200" />
              </div>
            </div>
            <h4 className="text-lg font-bold text-white font-serif tracking-wide mb-1.5">
              Real Dance Partners
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed font-light">
              Zero swiping algorithms, zero fake scores. Browse real people in your city who genuinely want a dance partner for Navratri.
            </p>
          </div>

          {/* Card 3 */}
          <div className="relative group rounded-3xl p-6 bg-gradient-to-b from-white/12 to-white/5 backdrop-blur-xl border border-white/15 hover:border-emerald-400/40 shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#22C55E] to-[#3B82F6] p-0.5 flex items-center justify-center shadow-lg mb-4">
              <div className="w-full h-full bg-black/40 rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-200" />
              </div>
            </div>
            <h4 className="text-lg font-bold text-white font-serif tracking-wide mb-1.5">
              Safe &amp; Respectful
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed font-light">
              City-level privacy only with zero GPS exposure. Mutual request acceptance required before chat. Instant block and report tools.
            </p>
          </div>
        </div>

        {/* Bottom Bar with Creator Credit & Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-gray-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B0036] via-[#D81B60] to-[#F59E0B] p-1 flex items-center justify-center">
              <DandiyaIcon className="w-full h-full text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-base text-white">Dandiya +1</span>
              <span className="block text-[11px] text-gray-400">Seasonal Navratri Companion</span>
            </div>
          </div>

          {/* Center: Creator Credit */}
          <div className="text-center font-medium">
            Made with <Heart className="w-3.5 h-3.5 inline text-rose-400 fill-rose-400 mx-0.5" /> for Navratri by{' '}
            <a
              href="https://x.com/Rushu_Tushu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-300 hover:text-white font-semibold underline underline-offset-4 transition-colors"
            >
              @Rushu_Tushu
            </a>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link to="/safety" className="hover:text-pink-300 transition-colors">
              Safety Guidelines
            </Link>
            <span className="text-gray-500">•</span>
            <span>Navratri 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
