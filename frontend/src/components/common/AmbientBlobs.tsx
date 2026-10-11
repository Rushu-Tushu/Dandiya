import React from 'react';

export const AmbientBlobs: React.FC = () => {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {/* Top Left: Maroon soft blob */}
      <div className="absolute -top-32 -left-32 w-96 h-96 sm:w-[520px] sm:h-[520px] rounded-full ambient-blob-maroon opacity-70" />

      {/* Top Right: Pink vibrant drop */}
      <div className="absolute -top-20 -right-20 w-80 h-80 sm:w-[480px] sm:h-[480px] rounded-full ambient-blob-pink opacity-60" />

      {/* Center Left: Purple ambient shape */}
      <div className="absolute top-[35%] -left-28 w-72 h-72 sm:w-[420px] sm:h-[420px] rounded-full ambient-blob-purple opacity-50" />

      {/* Center Right: Sky Blue festive bubble */}
      <div className="absolute top-[50%] -right-24 w-80 h-80 sm:w-[450px] sm:h-[450px] rounded-full ambient-blob-blue opacity-40" />

      {/* Bottom Center: Festive Green soft glow */}
      <div className="absolute bottom-10 left-[20%] w-72 h-72 sm:w-[400px] sm:h-[400px] rounded-full ambient-blob-green opacity-45" />

      {/* Bottom Right: Maroon / Pink overlay */}
      <div className="absolute -bottom-20 right-[10%] w-96 h-96 sm:w-[460px] sm:h-[460px] rounded-full ambient-blob-maroon opacity-40" />
    </div>
  );
};
