import React, { useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';

const InstagramIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const TwitterIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);
import { AboutSection } from '../components/AboutSection';
import { FeaturedVideoSection } from '../components/FeaturedVideoSection';
import { PhilosophySection } from '../components/PhilosophySection';
import { ServicesSection } from '../components/ServicesSection';
import { MicroLearningFeed } from '../components/MicroLearningFeed';

export const Index: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isFadingOut = useRef(false);

  // Vanilla JS smooth crossfade loop logic via requestAnimationFrame (no CSS transitions)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animFrameId: number;

    const animateOpacity = (
      startVal: number,
      targetVal: number,
      duration: number,
      onComplete?: () => void
    ) => {
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentOpacity = startVal + (targetVal - startVal) * progress;

        if (video) {
          video.style.opacity = currentOpacity.toString();
        }

        if (progress < 1) {
          animFrameId = requestAnimationFrame(step);
        } else if (onComplete) {
          onComplete();
        }
      };

      animFrameId = requestAnimationFrame(step);
    };

    const handleCanPlay = () => {
      video.play().catch(() => {});
      animateOpacity(0, 1, 500);
    };

    const handleTimeUpdate = () => {
      if (video.duration && !isFadingOut.current) {
        const remaining = video.duration - video.currentTime;
        if (remaining <= 0.55) {
          isFadingOut.current = true;
          const currentOp = parseFloat(video.style.opacity || '1');
          animateOpacity(currentOp, 0, 500);
        }
      }
    };

    const handleEnded = () => {
      if (video) {
        video.style.opacity = '0';
      }
      setTimeout(() => {
        if (video) {
          video.currentTime = 0;
          isFadingOut.current = false;
          video.play().catch(() => {});
          animateOpacity(0, 1, 500);
        }
      }, 100);
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    // Initial check if already ready
    if (video.readyState >= 3) {
      handleCanPlay();
    }

    return () => {
      cancelAnimationFrame(animFrameId);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);


  return (
    <div className="bg-black text-white min-h-screen selection:bg-white/20 selection:text-white">
      {/* ========================================================== */}
      {/* SECTION 1 -- HERO (Full Viewport)                          */}
      {/* ========================================================== */}
      <section className="min-h-screen overflow-hidden relative flex flex-col justify-between">
        {/* Background Video */}
        <video
          ref={videoRef}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a.mp4"
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover object-bottom pointer-events-none transition-opacity duration-1000"
        />

        {/* Ambient Dark Scrim */}
        <div className="absolute inset-0 bg-black/35 pointer-events-none" />

        {/* Navbar (relative z-20, px-6 py-6) */}
        <header className="relative z-20 px-6 py-4 md:py-6">
          <nav className="liquid-glass rounded-full max-w-5xl mx-auto px-6 py-3 flex items-center justify-between border border-white/10">
            {/* Left: Globe + Brand + Nav Links */}
            <div className="flex items-center">
              <a href="#" className="flex items-center gap-2 text-white group">
                <Globe className="w-6 h-6 text-white group-hover:rotate-45 transition-transform duration-500" />
                <span className="font-semibold text-lg tracking-tight">ScrollWise</span>
              </a>

              {/* Desktop Nav Links */}
              <div className="hidden md:flex items-center gap-8 ml-8">
                <a href="#feed" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                  Features
                </a>
                <a href="#feed" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                  ML Engine
                </a>
                <a href="#about" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                  About
                </a>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-4">
              <a
                href="#feed"
                className="text-white text-sm font-medium hover:text-white/80 transition-colors"
              >
                Sign Up
              </a>
              <a
                href="#feed"
                className="liquid-glass rounded-full px-6 py-2 text-white text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Login
              </a>
            </div>
          </nav>
        </header>

        {/* Hero Content (relative z-10, flex-1 flex flex-col items-center justify-center, px-6 py-8 text-center) */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-6 text-center -translate-y-2 md:-translate-y-6">
          {/* Main Headline */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-white tracking-tight whitespace-nowrap font-instrument">
            Know it then <em className="italic">all</em>.
          </h1>

          {/* Subtitle */}
          <p className="text-white/80 text-sm md:text-base leading-relaxed px-4 max-w-xl mx-auto my-6">
            Stay updated with the latest news and insights. Replace passive doomscrolling with 30-second mental models distilled from seminal non-fiction.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="#feed"
              className="bg-white text-black rounded-full px-8 py-3 text-sm font-semibold hover:bg-white/90 transition-all shadow-lg shadow-white/10"
            >
              Explore Feed
            </a>
            <a
              href="#about"
              className="liquid-glass rounded-full px-8 py-3 text-white text-sm font-medium hover:bg-white/10 transition-colors inline-block border border-white/10"
            >
              Read our manifesto
            </a>
          </div>
        </div>

        {/* Social Icons Footer (relative z-10, flex justify-center gap-4 pb-12) */}
        <div className="relative z-10 flex justify-center gap-4 pb-12">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/10 transition-all border border-white/10"
          >
            <InstagramIcon className="w-5 h-5" />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Twitter"
            className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/10 transition-all border border-white/10"
          >
            <TwitterIcon className="w-5 h-5" />
          </a>
          <a
            href="https://scrollwise.edu"
            target="_blank"
            rel="noreferrer"
            aria-label="Website"
            className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/10 transition-all border border-white/10"
          >
            <Globe className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* ========================================================== */}
      {/* SECTION 2 -- ABOUT SECTION                                 */}
      {/* ========================================================== */}
      <AboutSection />

      {/* ========================================================== */}
      {/* SECTION 3 -- FEATURED VIDEO                                */}
      {/* ========================================================== */}
      <FeaturedVideoSection />

      {/* ========================================================== */}
      {/* SECTION 4 -- PHILOSOPHY / INNOVATION x VISION              */}
      {/* ========================================================== */}
      <PhilosophySection />

      {/* ========================================================== */}
      {/* SECTION 5 -- SERVICES / WHAT WE DO                         */}
      {/* ========================================================== */}
      <ServicesSection />

      {/* ========================================================== */}
      {/* SECTION 6 -- INTERACTIVE SCROLLWISE ML FEED & FLIP-CARDS   */}
      {/* ========================================================== */}
      <MicroLearningFeed />

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6 bg-black text-center text-xs text-white/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white tracking-tight">ScrollWise</span>
            <span>— Academic Micro-Learning & SVD Recommender</span>
          </div>
          <p>© {new Date().getFullYear()} ScrollWise. Designed for University CSE & Behavioral Learning.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
