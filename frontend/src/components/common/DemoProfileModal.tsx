import React from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DemoProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileName: string;
  cityName: string;
}

export const DemoProfileModal: React.FC<DemoProfileModalProps> = ({
  isOpen,
  onClose,
  profileName,
  cityName,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#1A0B15] rounded-3xl p-6 shadow-2xl border border-pink-100 dark:border-pink-900/40 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800/40 flex items-center justify-center text-[#D81B60] mb-4">
          <Sparkles className="w-6 h-6" />
        </div>

        <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-pink-100 dark:bg-pink-950/70 text-[#8B0036] dark:text-pink-300 mb-2">
          Demo Profile
        </div>

        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2 font-serif">
          {profileName} is an illustrative profile
        </h3>

        <p className="text-xs text-gray-600 dark:text-gray-300 mb-5 leading-relaxed">
          To help you experience how Dandiya +1 looks when populated, this profile demonstrates
          what Navratri dancers look like in <strong>{cityName}</strong>.
          <br /><br />
          Demo profiles are unstaffed and cannot receive requests or initiate chat. Look for eligible real members in your city to send genuine connection requests!
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Got it, thanks
          </button>
          <button
            onClick={() => {
              onClose();
              navigate('/discover');
            }}
            className="flex-1 py-2.5 px-4 rounded-2xl btn-festive-primary text-white text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <span>Explore Dancers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
