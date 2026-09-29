"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { HomeSlider } from "@prisma/client";

interface HeroSliderProps {
  sliders: HomeSlider[];
  schoolName: string;
}

const FALLBACK_SLIDES = [
  { imageUrl: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&q=80", title: "Welcome to Our School" },
  { imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600&q=80", title: "Excellence in Education" },
  { imageUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1600&q=80", title: "Building Future Leaders" },
];

export default function HeroSlider({ sliders, schoolName }: HeroSliderProps) {
  const slides = sliders.length > 0 ? sliders : FALLBACK_SLIDES.map((s, i) => ({ ...s, id: i, order: i, isActive: true }));
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => setCurrent((p) => (p + 1) % slides.length), [slides.length]);
  const prev = () => setCurrent((p) => (p - 1 + slides.length) % slides.length);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, isPaused, slides.length]);

  return (
    <section
      className="relative w-full h-[480px] sm:h-[560px] lg:h-[640px] overflow-hidden bg-[#1a365d]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides */}
      {slides.map((slide, idx) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${idx === current ? "opacity-100" : "opacity-0"}`}
        >
          <Image
            src={slide.imageUrl}
            alt={slide.title ?? schoolName}
            fill
            className="object-cover"
            priority={idx === 0}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a365d]/80 via-[#1a365d]/40 to-transparent" />
        </div>
      ))}

      {/* Text overlay */}
      <div className="relative z-10 h-full flex flex-col justify-center px-8 sm:px-16 lg:px-24 max-w-3xl">
        <span className="inline-block bg-sky-400/20 border border-sky-400/40 text-sky-200 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4 w-fit backdrop-blur-sm">
          স্বাগতম
        </span>
        <h1 className="text-white text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight drop-shadow-lg">
          {slides[current]?.title ?? schoolName}
        </h1>
        <p className="mt-4 text-sky-100 text-base sm:text-lg max-w-lg leading-relaxed">
          জ্ঞান, মূল্যবোধ ও দক্ষতার সমন্বয়ে আলোকিত মানুষ গড়ার প্রতিষ্ঠান
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/about"
            className="bg-white text-[#1a365d] font-semibold px-6 py-2.5 rounded-lg hover:bg-sky-50 transition-colors text-sm shadow-lg"
          >
            আমাদের সম্পর্কে জানুন
          </a>
          <a
            href="/admission"
            className="bg-sky-500 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-sky-600 transition-colors text-sm shadow-lg"
          >
            ভর্তি তথ্য
          </a>
        </div>
      </div>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`rounded-full transition-all duration-300 ${idx === current ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/50 hover:bg-white/80"}`}
              aria-label={`স্লাইড ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Arrow controls */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
            aria-label="পূর্ববর্তী"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
            aria-label="পরবর্তী"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </section>
  );
}