/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Sun,
  Moon,
  Sunset,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Camera,
  Trash2,
  Users,
  Building2,
  Home,
  Waves,
  Route,
  Lightbulb,
} from 'lucide-react';
import { WorldStats, TimeOfDay, CameraMode } from '../game/types.ts';

interface TopStatusBarProps {
  stats: WorldStats;
  timeOfDay: TimeOfDay;
  cameraMode: CameraMode;
  isMuted: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onToggleTime: () => void;
  onToggleMute: () => void;
  onSetCameraMode: (mode: CameraMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  stats,
  timeOfDay,
  cameraMode,
  isMuted,
  canUndo,
  canRedo,
  onToggleTime,
  onToggleMute,
  onSetCameraMode,
  onUndo,
  onRedo,
  onClear,
}) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 p-3 md:p-4 flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-none">
      {/* Left: World Identity & Population */}
      <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 px-3.5 py-2 rounded-xl pointer-events-auto shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
          <span className="font-bold text-sm tracking-wide text-slate-100">INFINITE CANVAS</span>
        </div>

        <div className="h-4 w-px bg-slate-700"></div>

        <div className="flex items-center gap-1.5 text-xs text-amber-300">
          <Users className="w-3.5 h-3.5" />
          <span className="font-mono tabular-nums font-semibold">{stats.population.toLocaleString()}</span>
          <span className="text-slate-400 text-[10px]">CITIZENS</span>
        </div>
      </div>

      {/* Center: Live Object Count Chips */}
      <div className="hidden lg:flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl pointer-events-auto text-xs shadow-md">
        <div className="flex items-center gap-1 text-rose-400 px-2 py-0.5 rounded">
          <Home className="w-3.5 h-3.5" />
          <span className="font-mono tabular-nums font-bold">{stats.homes}</span>
          <span className="text-[10px] text-slate-400">HOMES</span>
        </div>

        <div className="flex items-center gap-1 text-sky-400 px-2 py-0.5 rounded">
          <Waves className="w-3.5 h-3.5" />
          <span className="font-mono tabular-nums font-bold">{stats.rivers}</span>
          <span className="text-[10px] text-slate-400">RIVERS</span>
        </div>

        <div className="flex items-center gap-1 text-purple-400 px-2 py-0.5 rounded">
          <Building2 className="w-3.5 h-3.5" />
          <span className="font-mono tabular-nums font-bold">{stats.buildings}</span>
          <span className="text-[10px] text-slate-400">TOWERS ({stats.totalFloors}F)</span>
        </div>

        <div className="flex items-center gap-1 text-amber-400 px-2 py-0.5 rounded">
          <Route className="w-3.5 h-3.5" />
          <span className="font-mono tabular-nums font-bold">{stats.roads}</span>
          <span className="text-[10px] text-slate-400">ROADS</span>
        </div>

        <div className="flex items-center gap-1 text-yellow-300 px-2 py-0.5 rounded">
          <Lightbulb className="w-3.5 h-3.5" />
          <span className="font-mono tabular-nums font-bold">{stats.lights}</span>
          <span className="text-[10px] text-slate-400">LIGHTS</span>
        </div>
      </div>

      {/* Right: Quick Utilities Dock */}
      <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 p-1.5 rounded-xl pointer-events-auto shadow-md">
        {/* Camera Views dropdown or buttons */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5">
          <button
            onClick={() => onSetCameraMode('god')}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
              cameraMode === 'god' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
            title="Free Orbit Camera"
          >
            Orbit
          </button>
          <button
            onClick={() => onSetCameraMode('isometric')}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
              cameraMode === 'isometric' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
            title="Isometric Camera"
          >
            Iso
          </button>
          <button
            onClick={() => onSetCameraMode('topdown')}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
              cameraMode === 'topdown' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
            title="Top-down Blueprint"
          >
            Top
          </button>
        </div>

        <div className="h-4 w-px bg-slate-700 mx-1"></div>

        {/* Time of Day Toggle */}
        <button
          onClick={onToggleTime}
          className="p-1.5 rounded-lg text-slate-300 hover:text-amber-400 hover:bg-slate-800 transition-colors"
          title={`Time: ${timeOfDay.toUpperCase()} (T)`}
        >
          {timeOfDay === 'day' && <Sun className="w-4 h-4 text-amber-400" />}
          {timeOfDay === 'sunset' && <Sunset className="w-4 h-4 text-orange-400" />}
          {timeOfDay === 'night' && <Moon className="w-4 h-4 text-indigo-300" />}
        </button>

        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-1.5 rounded-lg transition-colors ${
            canUndo ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-1.5 rounded-lg transition-colors ${
            canRedo ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Audio Mute */}
        <button
          onClick={onToggleMute}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        {/* Clear World */}
        <button
          onClick={onClear}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
          title="Clear World (Reset to Blank)"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
