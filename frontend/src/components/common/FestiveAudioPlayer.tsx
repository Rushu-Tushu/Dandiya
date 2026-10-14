import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, Volume1, VolumeX, Sparkles } from 'lucide-react';

interface FestiveAudioPlayerProps {
  className?: string;
}

export const FestiveAudioPlayer: React.FC<FestiveAudioPlayerProps> = ({ className = '' }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.5); // Start at medium level (50%)
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSliderOpen, setIsSliderOpen] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize audio element with continuous loop and 50% medium volume
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = true;
    audio.volume = isMuted ? 0 : volume;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      // Guarantee seamless continuous loop
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [volume, isMuted]);

  // Keep audio volume synchronized
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Toggle Play / Turn Off
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    setHasInteracted(true);

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // If volume was 0 or muted, restore to medium level
      if (volume <= 0.05 || isMuted) {
        setVolume(0.5);
        setIsMuted(false);
        audio.volume = 0.5;
      }
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('Playback prevented by browser policy, user interaction required:', err);
      }
    }
  }, [isPlaying, volume, isMuted]);

  // Handle clicking or dragging along the vertical volume line
  const updateVolumeFromPointer = useCallback((clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    // Height is from top to bottom; 0 at bottom, 1 at top
    const relativeY = rect.bottom - clientY;
    const clampedY = Math.max(0, Math.min(rect.height, relativeY));
    const newVolume = Math.round((clampedY / rect.height) * 100) / 100;

    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }

    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      // If paused when dragging volume up, start playing seamlessly
      if (audioRef.current.paused && newVolume > 0) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateVolumeFromPointer(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateVolumeFromPointer(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  // Hover triggers for vertical slider with smooth exit buffer
  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsSliderOpen(true);
  };

  const handleMouseLeave = () => {
    if (isDragging) return;
    closeTimeoutRef.current = setTimeout(() => {
      setIsSliderOpen(false);
    }, 400);
  };

  // Quick mute toggle
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMuted || volume === 0) {
      setIsMuted(false);
      const restored = volume === 0 ? 0.5 : volume;
      setVolume(restored);
      if (audioRef.current) {
        audioRef.current.volume = restored;
      }
    } else {
      setIsMuted(true);
      if (audioRef.current) {
        audioRef.current.volume = 0;
      }
    }
  };

  const displayVolume = isMuted ? 0 : volume;
  const volumePercentage = Math.round(displayVolume * 100);

  // Determine speaker icon based on state
  const renderSpeakerIcon = (sizeClass = 'w-5 h-5') => {
    if (!isPlaying || isMuted || displayVolume === 0) {
      return <VolumeX className={sizeClass} />;
    }
    if (displayVolume < 0.5) {
      return <Volume1 className={sizeClass} />;
    }
    return <Volume2 className={sizeClass} />;
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 sm:bottom-8 sm:right-8 flex flex-col items-center select-none ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Hidden Audio Element configured with continuous loop and fallback sources */}
      <audio
        ref={audioRef}
        preload="auto"
        loop
        src="/festive-music.mp3"
      >
        <source src="/festive-music.mp3" type="audio/mpeg" />
        <source src="/Dandiya%20plus%20website%20song.mp3" type="audio/mpeg" />
        <source src="/Dandiya plus website song.mp3" type="audio/mpeg" />
      </audio>

      {/* =========================================================
          VERTICAL VOLUME SLIDER POPUP (Reveals above speaker icon)
          ========================================================= */}
      <div
        className={`absolute bottom-full mb-3 flex flex-col items-center p-3 rounded-2xl bg-[#1A0914]/95 backdrop-blur-xl border border-pink-500/30 shadow-2xl shadow-pink-950/60 transition-all duration-300 transform origin-bottom ${
          isSliderOpen || isDragging
            ? 'opacity-100 scale-100 pointer-events-auto translate-y-0'
            : 'opacity-0 scale-90 pointer-events-none translate-y-2'
        }`}
        style={{ width: '56px' }}
      >
        {/* Percentage Label */}
        <span className="text-[11px] font-bold font-mono text-pink-300/90 mb-2">
          {volumePercentage}%
        </span>

        {/* Interactive Vertical Line Track */}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative w-7 h-28 flex items-center justify-center cursor-pointer group touch-none py-1"
          title="Drag up or down to adjust volume"
        >
          {/* Vertical Track Background Line */}
          <div className="w-1.5 h-full bg-pink-950/90 rounded-full relative overflow-hidden border border-pink-500/20">
            {/* Filled Level Line (from bottom up) */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#8B0036] via-[#D81B60] to-[#FF4081] rounded-full transition-all duration-75"
              style={{ height: `${displayVolume * 100}%` }}
            />
          </div>

          {/* Draggable Glowing Thumb Handle on the Vertical Line */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-md shadow-pink-500/80 border-2 border-[#D81B60] transition-transform duration-75 hover:scale-125 pointer-events-none flex items-center justify-center"
            style={{
              bottom: `calc(${displayVolume * 100}% - 8px)`,
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#D81B60]" />
          </div>
        </div>

        {/* Mute/Max Quick Toggle at bottom of slider */}
        <button
          onClick={toggleMute}
          className="mt-2 p-1.5 rounded-lg text-pink-300 hover:text-white hover:bg-pink-500/20 transition-colors cursor-pointer"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {renderSpeakerIcon('w-4 h-4')}
        </button>
      </div>

      {/* =========================================================
          MAIN SPEAKER ON / MUTE ICON BUTTON
          ========================================================= */}
      <div className="relative group">
        {/* Subtle pulsating halo when playing */}
        {isPlaying && (
          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-pink-600/40 via-pink-500/30 to-amber-500/30 blur-md animate-pulse -z-10" />
        )}

        {/* Initial invitation banner for first-time visitors */}
        {!hasInteracted && !isPlaying && (
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#1A0914]/95 border border-pink-500/40 text-xs text-pink-200 font-medium whitespace-nowrap shadow-xl pointer-events-none hidden sm:flex items-center gap-1.5 animate-bounce">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Play Festival Music</span>
          </div>
        )}

        {/* Speaker Button */}
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Turn music off' : 'Turn music on'}
          className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer shadow-xl ${
            isPlaying
              ? 'bg-gradient-to-tr from-[#8B0036] via-[#D81B60] to-[#FF4081] text-white border border-pink-300/40 shadow-pink-600/40 scale-105 ring-2 ring-pink-500/50 ring-offset-2 ring-offset-[#0D050B]'
              : 'bg-[#1A0914]/90 text-pink-200/80 hover:text-white hover:bg-[#250D1D] border border-pink-500/30 hover:border-pink-500/60 shadow-black/60'
          }`}
          title={
            isPlaying
              ? `Garba Music Playing (${volumePercentage}%) • Click to turn off`
              : 'Turn Festival Music On (Loops continuously)'
          }
        >
          <div className="flex items-center justify-center gap-1">
            {renderSpeakerIcon('w-5 h-5 sm:w-6 sm:h-6')}

            {/* Dancing Equalizer Bars when music is active */}
            {isPlaying && !isMuted && (
              <div className="flex items-end gap-0.5 h-4 ml-0.5" aria-hidden="true">
                <span className="w-0.5 bg-white/90 rounded-full animate-eq-1" />
                <span className="w-0.5 bg-white/90 rounded-full animate-eq-2" />
                <span className="w-0.5 bg-white/90 rounded-full animate-eq-3" />
              </div>
            )}
          </div>
        </button>

        {/* Tooltip on Hover */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-card/95 border border-border text-[11px] text-foreground font-medium whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 hidden sm:block">
          {isPlaying
            ? `Click to turn off • Vol: ${volumePercentage}%`
            : 'Play Festival Music (Loop)'}
        </div>
      </div>
    </div>
  );
};
