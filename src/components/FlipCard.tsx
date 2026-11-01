import React, { useState, useEffect } from 'react';

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
  height?: number;
  initialFlipped?: boolean;
  onFlip?: (flipped: boolean) => void;
  frontLabel?: string;
  backLabel?: string;
}

/**
 * ReactBits Micro Flip Card Component
 * Enhanced 3D CSS perspective card flip with smooth spring physics
 * Designed for Interactive Book Summary Flashcards
 */
export const FlipCard: React.FC<FlipCardProps> = ({
  front,
  back,
  className = '',
  height = 360,
  initialFlipped = false,
  onFlip,
  frontLabel = 'Summary Concept',
  backLabel = 'Distilled Insight & Takeaway',
}) => {
  const [isFlipped, setIsFlipped] = useState(initialFlipped);

  useEffect(() => {
    setIsFlipped(initialFlipped);
  }, [initialFlipped]);

  const toggleFlip = (e?: React.MouseEvent) => {
    // If the click was on an interactive button/link inside the card, don't flip
    if (e && (e.target as HTMLElement).closest('button, a, input, textarea, select')) {
      return;
    }
    const nextState = !isFlipped;
    setIsFlipped(nextState);
    if (onFlip) {
      onFlip(nextState);
    }
  };

  return (
    <div
      className={`flip-card-container relative select-none cursor-pointer group ${className}`}
      style={{
        height: `${height}px`,
        perspective: '1200px',
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
            background: 'linear-gradient(145deg, rgba(20, 24, 34, 0.75), rgba(10, 12, 18, 0.95))',
          }}
        >
          {front}
          <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-white/50">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {frontLabel}
            </span>
            <span className="group-hover:text-amber-300 transition-colors flex items-center gap-1 font-semibold text-white/70">
              Click card to flip ↻
            </span>
          </div>
        </div>

        {/* BACK FACE */}
        <div
          className="flip-card-back absolute inset-0 w-full h-full rounded-2xl liquid-glass p-6 md:p-8 flex flex-col justify-between"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(145deg, rgba(28, 20, 48, 0.8), rgba(12, 10, 24, 0.95))',
          }}
        >
          {back}
          <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-purple-300/70">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              {backLabel}
            </span>
            <span className="group-hover:text-amber-300 transition-colors flex items-center gap-1 font-semibold text-white/70">
              Click to flip back ↻
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipCard;
