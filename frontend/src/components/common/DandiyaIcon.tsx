import React from 'react';

interface DandiyaIconProps {
  className?: string;
  size?: number;
}

export const DandiyaIcon: React.FC<DandiyaIconProps> = ({ className = 'w-6 h-6', size }) => {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id="stickA" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D81B60" />
          <stop offset="100%" stopColor="#8B0036" />
        </linearGradient>
        <linearGradient id="stickB" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D81B60" />
        </linearGradient>
      </defs>
      {/* Stick 1 */}
      <line x1="14" y1="50" x2="50" y2="14" stroke="url(#stickA)" strokeWidth="6" strokeLinecap="round" />
      {/* Stick 2 */}
      <line x1="14" y1="14" x2="50" y2="50" stroke="url(#stickB)" strokeWidth="6" strokeLinecap="round" />
      {/* Decorative center ring */}
      <circle cx="32" cy="32" r="5" fill="#FBBF24" />
      {/* Festive bells / tassels */}
      <circle cx="16" cy="16" r="3" fill="#EC4899" />
      <circle cx="48" cy="16" r="3" fill="#3B82F6" />
      <circle cx="16" cy="48" r="3" fill="#22C55E" />
      <circle cx="48" cy="48" r="3" fill="#9333EA" />
    </svg>
  );
};
