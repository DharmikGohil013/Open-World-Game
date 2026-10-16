/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Sparkles, ArrowRight, Compass, ShieldCheck } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between p-6 md:p-12 pointer-events-auto"
      style={{
        background: 'radial-gradient(circle at 50% 35%, rgba(11, 16, 27, 0.2) 0%, rgba(11, 16, 27, 0.85) 80%, rgba(11, 16, 27, 0.95) 100%)',
      }}
    >
      {/* Top Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest text-amber-400/90 font-bold">
              3D Sandbox Simulation
            </span>
            <p className="text-xs text-slate-400">Pure Creative Freedom · Zero Restrictions</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400/90 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-4 h-4" />
          <span>Interactive Open World</span>
        </div>
      </div>

      {/* Hero Title Lockup & Negative-Space Composition */}
      <div className="max-w-xl my-auto">
        {/* Bespoke Inline SVG Title Lockup */}
        <div className="mb-4">
          <svg className="w-full max-w-md h-16" viewBox="0 0 400 64" fill="none">
            <text
              x="0"
              y="48"
              fill="url(#titleGradient)"
              fontSize="44"
              fontWeight="900"
              letterSpacing="1"
              fontFamily="Outfit, sans-serif"
            >
              INFINITE WORLD
            </text>
            <defs>
              <linearGradient id="titleGradient" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f8fafc" />
                <stop offset="0.6" stopColor="#38bdf8" />
                <stop offset="1" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
          </svg>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wider text-amber-400 uppercase mt-1">
            <Sparkles className="w-4 h-4" />
            <span>Open Canvas Architect</span>
          </div>
        </div>

        <p className="text-slate-300 text-base md:text-lg leading-relaxed mb-8">
          A blank living world awaits. Craft seamless rivers, paved highways with autonomous traffic, cozy residential homes, towering skyscrapers, and glowing streetlights without any conflicts or limits.
        </p>

        {/* Primary CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <button
            data-start="true"
            onClick={onStart}
            className="flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-lg shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <span>Start Creating</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <span className="text-xs text-slate-400 text-center sm:text-left">
            Press <kbd className="px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-xs">Enter</kbd> or <kbd className="px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-xs">Space</kbd>
          </span>
        </div>
      </div>

      {/* Control Hint Line at Bottom Safe Margin */}
      <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-4">
        <span><strong className="text-slate-200">Click</strong> Place Tile</span>
        <span><strong className="text-slate-200">1-5</strong> Select Core Tools</span>
        <span><strong className="text-slate-200">R</strong> Rotate Object</span>
        <span><strong className="text-slate-200">Stack</strong> Build Skyscrapers</span>
        <span><strong className="text-slate-200">V</strong> Drive Vehicle</span>
        <span><strong className="text-slate-200">T</strong> Day / Night</span>
        <span><strong className="text-slate-200">Z</strong> Undo</span>
      </div>
    </div>
  );
};
