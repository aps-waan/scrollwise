import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export const FeaturedVideoSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="bg-black pt-6 md:pt-10 pb-20 md:pb-32 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl overflow-hidden aspect-video relative group border border-white/10 shadow-2xl"
        >
          {/* Featured Video */}
          <video
            className="w-full h-full object-cover"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4"
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

          {/* Bottom Overlay Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6 z-10">
            {/* Left Glass Card */}
            <div className="liquid-glass rounded-2xl p-6 md:p-8 max-w-md">
              <p className="text-white/50 text-xs tracking-widest uppercase mb-3 font-semibold">
                Our Approach
              </p>
              <p className="text-white text-sm md:text-base leading-relaxed">
                We believe in the power of curiosity-driven exploration. Every project starts
                with a question, and every answer opens a new door to innovation.
              </p>
            </div>

            {/* Right Button */}
            <div>
              <motion.a
                href="#feed"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="liquid-glass rounded-full px-8 py-3 text-white text-sm font-medium inline-block hover:bg-white/10 transition-colors"
              >
                Explore more
              </motion.a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedVideoSection;
