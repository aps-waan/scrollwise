import React, { useState } from 'react';

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
  height?: number;
  initialFlipped?: boolean;
  onFlip?: (flipped: boolean) => void;
}

/**
 * ReactBits Micro Flip Card Component
 * https://reactbits.dev/micro/flip-card
 * Pure 3D CSS perspective card flip with smooth spring physics
 */
export const FlipCard: React.FC<FlipCardProps> = ({
  front,
  back,
  className = '',
  height = 360,
  initialFlipped = false,
  onFlip,
}) => {
  const [isFlipped, setIsFlipped] = useState(initialFlipped);

  const toggleFlip = () => {
    const nextState = !isFlipped;
    setIsFlipped(nextState);
    if (onFlip) {
      onFlip(nextState);
    }
  };

  return (
    <div
      className={`flip-card-container relative select-none ${className}`}
      style={{
        height: `${height}px`,
        perspective: '1200px',
        cursor: 'pointer',
      }}
      onClick={toggleFlip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleFlip();
        }
      }}
    >
      <div
        className="flip-card-inner w-full h-full relative"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* FRONT FACE */}
        <div
          className="flip-card-front absolute inset-0 w-full h-full rounded-2xl liquid-glass p-6 md:p-8 flex flex-col justify-between"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: 'linear-gradient(145deg, rgba(20, 24, 34, 0.7), rgba(10, 12, 18, 0.9))',
          }}
        >
          {front}
          <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-white/50">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Core Question
            </span>
            <span className="hover:text-white transition-colors">Click to flip ↻</span>
          </div>
        </div>

        {/* BACK FACE */}
        <div
          className="flip-card-back absolute inset-0 w-full h-full rounded-2xl liquid-glass p-6 md:p-8 flex flex-col justify-between"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(145deg, rgba(28, 20, 48, 0.75), rgba(12, 10, 24, 0.9))',
          }}
        >
          {back}
          <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-purple-300/60">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Distilled Mental Model
            </span>
            <span className="hover:text-white transition-colors">Click to flip ↻</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipCard;
