import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

export const ServicesSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const services = [
    {
      videoUrl:
        'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4',
      tag: 'Strategy',
      title: 'Research & Insight',
      description:
        'We dig deep into data, culture, and human behavior to surface the insights that drive meaningful, lasting change.',
    },
    {
      videoUrl:
        'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4',
      tag: 'Craft',
      title: 'Design & Execution',
      description:
        'From concept to launch, we obsess over every detail to deliver experiences that feel effortless and look extraordinary.',
    },
  ];

  return (
    <section ref={ref} className="bg-black py-28 md:py-40 px-6 overflow-hidden relative">
      {/* Subtle radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02)_0%,transparent_60%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header Row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-end justify-between mb-12 md:mb-16"
        >
          <h2 className="text-3xl md:text-5xl text-white tracking-tight">What we do</h2>
          <span className="text-white/40 text-sm tracking-widest uppercase hidden md:inline font-medium">
            Our services
          </span>
        </motion.div>

        {/* Two-card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{
                duration: 0.8,
                delay: index * 0.15,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="liquid-glass rounded-3xl overflow-hidden group border border-white/10"
            >
              {/* Card Video Area */}
              <div className="aspect-video overflow-hidden relative">
                <video
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  src={service.videoUrl}
                  muted
                  autoPlay
                  loop
                  playsInline
                  preload="auto"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Card Body */}
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="uppercase tracking-widest text-white/40 text-xs font-semibold">
                    {service.tag}
                  </span>
                  <div className="liquid-glass rounded-full p-2 text-white/80 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-white text-xl md:text-2xl mb-3 tracking-tight font-semibold">
                  {service.title}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">{service.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
