import React, { useState, useRef, useEffect } from 'react';
import { Smile, Search, Sparkles, Heart, Hand, PartyPopper } from 'lucide-react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Festive & Dandiya',
    icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" />,
    emojis: ['🪘', '✨', '🎉', '🪔', '🎊', '🔥', '💃', '🕺', '🥳', '🌟', '💫', '🎶', '🥁', '🎆', '🎇'],
  },
  {
    name: 'Smiles & Reactions',
    icon: <Smile className="w-3.5 h-3.5 text-pink-500" />,
    emojis: ['😊', '😄', '😍', '🥰', '🤩', '😎', '🤗', '😂', '🤣', '😉', '😋', '😇', '🙌', '👏', '🙏'],
  },
  {
    name: 'Love & Hearts',
    icon: <Heart className="w-3.5 h-3.5 text-rose-500" />,
    emojis: ['💖', '❤️', '💕', '💗', '💓', '💞', '💘', '🤍', '💛', '🧡', '💜', '💙', '💚', '💐', '🌹'],
  },
  {
    name: 'Hands & Gestures',
    icon: <Hand className="w-3.5 h-3.5 text-orange-500" />,
    emojis: ['👍', '✌️', '👋', '🤝', '👌', '🤙', '👊', '🤞', '🫶', '🙋‍♂️', '🙋‍♀️', '🙇‍♂️', '🙇‍♀️', '💪', '🤌'],
  },
  {
    name: 'Party & Celebration',
    icon: <PartyPopper className="w-3.5 h-3.5 text-purple-500" />,
    emojis: ['🎈', '🎁', '🍰', '🧁', '🍦', '🍩', '🍫', '🍿', '🥤', '🧋', '🍵', '☕', '🥨', '🍕', '🌮'],
  },
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const allEmojis = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
  const displayedEmojis = search.trim()
    ? allEmojis // In a minimal search, allow easy fast clicking
    : EMOJI_CATEGORIES[activeCategory].emojis;

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-14 right-2 sm:right-6 w-72 sm:w-80 rounded-3xl bg-white dark:bg-[#1A0B15] shadow-2xl border border-pink-100 dark:border-pink-900/40 p-3 z-50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
      role="dialog"
      aria-label="Emoji picker"
    >
      {/* Category Tabs */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-gray-800">
        {EMOJI_CATEGORIES.map((cat, idx) => (
          <button
            key={cat.name}
            type="button"
            onClick={() => {
              setActiveCategory(idx);
              setSearch('');
            }}
            title={cat.name}
            className={`p-1.5 rounded-xl transition-colors ${
              activeCategory === idx && !search
                ? 'bg-pink-100 dark:bg-pink-950/70 text-[#8B0036] dark:text-pink-300'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative mb-2">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter emojis..."
          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-pink-500 text-gray-800 dark:text-gray-100 placeholder-gray-400"
        />
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5 max-h-48 overflow-y-auto p-1">
        {displayedEmojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            onClick={() => {
              onSelect(emoji);
            }}
            className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-pink-50 dark:hover:bg-pink-950/50 hover:scale-115 active:scale-95 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
