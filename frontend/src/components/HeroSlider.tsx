import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FALLBACK_IMAGE } from '../utils/config';

interface Slide {
  url: string;
  title?: string;
  link?: string;
  enabled?: boolean;
}

interface HeroSliderProps {
  slides: Slide[];
  interval?: number; // ms, default 5000
}

const HeroSlider: React.FC<HeroSliderProps> = ({ slides, interval = 5000 }) => {
  const activeSlides = slides.filter(s => s.enabled !== false);
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent(prev => (prev + 1) % activeSlides.length);
  }, [activeSlides.length]);

  const prev = () => {
    setCurrent(prev => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [next, activeSlides.length, interval]);

  if (!activeSlides.length) return null;

  const slide = activeSlides[current];
  const content = (
    <div className="relative w-full bg-gray-900 overflow-hidden" style={{ height: 'clamp(200px, 45vw, 520px)' }}>
      <img
        src={slide.url}
        alt={slide.title || `Slide ${current + 1}`}
        className="w-full h-full object-contain"
        onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
      />
      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

      {/* Title */}
      {slide.title && (
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-8 sm:pb-14">
          <p className="text-white text-lg sm:text-2xl md:text-4xl font-bold drop-shadow-lg max-w-3xl line-clamp-2">{slide.title}</p>
        </div>
      )}

      {/* Navigation arrows */}
      {activeSlides.length > 1 && (
        <>
          <button
            onClick={e => { e.preventDefault(); prev(); }}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-11 sm:h-11 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" />
          </button>
          <button
            onClick={e => { e.preventDefault(); next(); }}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-11 sm:h-11 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" />
          </button>
        </>
      )}

      {/* Dots — centered at bottom */}
      {activeSlides.length > 1 && (
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-10">
          {activeSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={e => { e.preventDefault(); setCurrent(idx); }}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 ${idx === current ? 'bg-white w-5 sm:w-7' : 'bg-white/50 w-2 sm:w-2.5'}`}
            />
          ))}
        </div>
      )}
    </div>
  );

  return slide.link ? (
    <Link to={slide.link} className="block">{content}</Link>
  ) : (
    <div>{content}</div>
  );
};

export default HeroSlider;
