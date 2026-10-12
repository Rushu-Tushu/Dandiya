import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DandiyaIcon } from '../common/DandiyaIcon';
import { Sparkles } from 'lucide-react';

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  activeTab: 'login' | 'register';
}

const CAROUSEL_SLIDES = [
  {
    image: '/assets/auth_slide_1.jpg',
    title: 'Sync Beats. Make Memories.',
    subtitle: 'Find someone genuine to laugh and dance with under the festival lights.',
    venue: 'Royal Heritage Ground, Pune',
  },
  {
    image: '/assets/auth_slide_2.jpg',
    title: 'Dance to the Rhythm of Navratri',
    subtitle: 'Dodhiyu, 3-Taali, and non-stop Garba circles waiting for you.',
    venue: 'GMDC Celebration Ground, Ahmedabad',
  },
  {
    image: '/assets/hero-bg.jpg',
    title: 'Your Festive Companion',
    subtitle: 'Zero swiping games. Just mutual requests and private encrypted chat.',
    venue: 'United Way Garba, Vadodara',
  },
];

export const AuthSplitLayout: React.FC<AuthSplitLayoutProps> = ({ children, activeTab }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0D050B] text-gray-100 relative z-10">
      {/* LEFT COLUMN: Form Container */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-y-auto bg-[#160812] border-r border-border">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B0036] via-[#D81B60] to-[#F59E0B] p-1.5 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <DandiyaIcon className="w-full h-full text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold font-display tracking-tight text-foreground group-hover:text-primary transition-colors">
                Dandiya <span className="text-primary">+1</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-primary font-semibold -mt-1">
                Navratri Matchmaking
              </span>
            </div>
          </Link>

          {/* Switch Tab Links */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-xl text-xs font-semibold border border-border">
            <Link
              to="/login"
              className={`px-3 py-1.5 rounded-lg font-hand text-sm transition-all ${
                activeTab === 'login'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className={`px-3 py-1.5 rounded-lg font-hand text-sm transition-all ${
                activeTab === 'register'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Join
            </Link>
          </div>
        </div>

        {/* Dynamic Form Content */}
        <div className="max-w-md w-full mx-auto my-auto py-4">{children}</div>

        {/* Footer Note */}
        <div className="text-center text-xs text-muted-foreground mt-8 pt-4 border-t border-border">
          Encrypted client-side with native Web Crypto • Navratri 2026
        </div>
      </div>

      {/* RIGHT COLUMN: Eye-Pleasing Dandiya Image Carousel */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gray-950 overflow-hidden min-h-screen">
        {CAROUSEL_SLIDES.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover object-center filter brightness-[0.88]"
              />

              {/* Gradient Dark/Festive Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-[#620024]/40" />

              {/* Floating Caption Card */}
              <div className="absolute bottom-12 left-12 right-12 p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 text-white space-y-3 shadow-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-semibold uppercase tracking-wider text-pink-200">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  {slide.venue}
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold font-festive text-white drop-shadow-sm">
                  {slide.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-200 font-light leading-relaxed">
                  {slide.subtitle}
                </p>

                {/* Progress Indicator Dots */}
                <div className="flex items-center gap-2 pt-2">
                  {CAROUSEL_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        i === currentSlide ? 'w-8 bg-[#FF4081]' : 'w-2 bg-white/40 hover:bg-white/70'
                      }`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
