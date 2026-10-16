/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Gauge, LogOut } from 'lucide-react';

interface DriveHUDProps {
  speed: number;
  onExit: () => void;
}

export const DriveHUD: React.FC<DriveHUDProps> = ({ speed, onExit }) => {
  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex flex-col justify-between p-6">
      {/* Top Banner */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 bg-slate-900/90 border border-emerald-500/50 px-4 py-2 rounded-xl text-emerald-400 font-bold text-sm tracking-wider">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <span>EXPLORING WORLD · VEHICLE CRUISE</span>
        </div>

        <button
          onClick={onExit}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-900/30 transition-transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Drive Mode (V)</span>
        </button>
      </div>

      {/* Bottom Center Speedometer & Controls */}
      <div className="self-center flex flex-col items-center gap-3">
        {/* Speedometer Gauge */}
        <div className="flex items-baseline gap-2 bg-slate-900/90 border border-slate-700/80 px-6 py-3 rounded-2xl shadow-2xl">
          <Gauge className="w-5 h-5 text-emerald-400 self-center" />
          <span className="font-mono tabular-nums text-4xl font-extrabold text-white">
            {speed}
          </span>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            KM/H
          </span>
        </div>

        {/* Driving controls hint */}
        <div className="flex items-center gap-4 text-xs text-slate-300 bg-slate-900/80 px-4 py-1.5 rounded-xl border border-slate-800">
          <span><strong className="text-emerald-400">W / ↑</strong> Accel</span>
          <span><strong className="text-emerald-400">S / ↓</strong> Brake/Reverse</span>
          <span><strong className="text-emerald-400">A / D / ← / →</strong> Steer</span>
          <span><strong className="text-emerald-400">V</strong> Exit</span>
        </div>
      </div>
    </div>
  );
};
