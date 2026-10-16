/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Home,
  Waves,
  Building2,
  Route,
  Lightbulb,
  Shovel,
  RotateCw,
  Car,
  Sparkles,
  PartyPopper,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ToolType } from '../game/types.ts';

interface BuilderDockProps {
  currentTool: ToolType;
  currentRotation: number;
  onSelectTool: (tool: ToolType) => void;
  onRotate: () => void;
  onToggleDrive: () => void;
  onFireworks: () => void;
  onDisco: () => void;
}

export const BuilderDock: React.FC<BuilderDockProps> = ({
  currentTool,
  currentRotation,
  onSelectTool,
  onRotate,
  onToggleDrive,
  onFireworks,
  onDisco,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const coreTools: Array<{
    id: ToolType;
    label: string;
    num: string;
    icon: React.ReactNode;
    color: string;
    activeBorder: string;
    activeBg: string;
    description: string;
  }> = [
    {
      id: 'home',
      label: 'Home',
      num: '1',
      icon: <Home className="w-5 h-5" />,
      color: 'text-rose-400',
      activeBorder: 'border-rose-500',
      activeBg: 'bg-rose-500/20 text-rose-300',
      description: 'Cozy houses with gardens & chimneys',
    },
    {
      id: 'river',
      label: 'River',
      num: '2',
      icon: <Waves className="w-5 h-5" />,
      color: 'text-sky-400',
      activeBorder: 'border-sky-500',
      activeBg: 'bg-sky-500/20 text-sky-300',
      description: 'Flowing water channels & auto-bridges',
    },
    {
      id: 'building',
      label: 'Building',
      num: '3',
      icon: <Building2 className="w-5 h-5" />,
      color: 'text-purple-400',
      activeBorder: 'border-purple-500',
      activeBg: 'bg-purple-500/20 text-purple-300',
      description: 'Stackable skyscrapers & towers',
    },
    {
      id: 'road',
      label: 'Road',
      num: '4',
      icon: <Route className="w-5 h-5" />,
      color: 'text-amber-400',
      activeBorder: 'border-amber-500',
      activeBg: 'bg-amber-500/20 text-amber-300',
      description: 'Connected roads with live traffic',
    },
    {
      id: 'light',
      label: 'Light',
      num: '5',
      icon: <Lightbulb className="w-5 h-5" />,
      color: 'text-yellow-300',
      activeBorder: 'border-yellow-400',
      activeBg: 'bg-yellow-400/20 text-yellow-200',
      description: 'Illuminated streetlights & night glow',
    },
  ];

  return (
    <div
      className="fixed z-40 transition-transform duration-300 pointer-events-none"
      style={{
        bottom: '16px',
        left: '50%',
        transform: `translateX(-50%) translateY(${isCollapsed ? 'calc(100% - 32px)' : '0'})`,
        maxWidth: 'min(960px, 96vw)',
        width: '100%',
      }}
    >
      <div className="flex flex-col items-center">
        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 bg-slate-900/95 border border-slate-700/80 rounded-t-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer shadow-md mb-[-1px]"
          title="Toggle HUD Display (H)"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Show Builder Tools</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {/* Main Dock Container */}
        <div className="w-full pointer-events-auto bg-slate-900/95 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3">
          {/* 5 Core Options */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full md:w-auto">
            {coreTools.map((tool) => {
              const isActive = currentTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => onSelectTool(tool.id)}
                  className={`flex flex-col items-center justify-center py-2 px-2 sm:px-4 rounded-xl border transition-all cursor-pointer relative ${
                    isActive
                      ? `${tool.activeBorder} ${tool.activeBg} font-bold shadow-lg scale-102`
                      : 'border-slate-800 bg-slate-800/70 text-slate-300 hover:bg-slate-700/80 hover:text-white'
                  }`}
                  title={`${tool.label} (${tool.num}): ${tool.description}`}
                >
                  <span className="absolute top-1 right-1.5 text-[9px] font-mono text-slate-400 font-semibold">
                    {tool.num}
                  </span>
                  <div className={`mb-1 ${isActive ? tool.color : 'text-slate-300'}`}>
                    {tool.icon}
                  </div>
                  <span className="text-xs tracking-tight">{tool.label}</span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="hidden md:block h-10 w-px bg-slate-700/80"></div>

          {/* Secondary Actions & Crazy Modes */}
          <div className="grid grid-cols-5 gap-1.5 w-full md:flex md:w-auto md:items-center md:gap-2">
            {/* Rotate Button */}
            <button
              onClick={onRotate}
              className="flex flex-col md:flex-row items-center justify-center gap-1 px-2 md:px-3 py-1.5 md:py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
              title="Rotate orientation by 90° (R)"
            >
              <RotateCw className="w-4 h-4 text-sky-400" />
              <span className="text-[10px] md:text-xs">{currentRotation}°</span>
            </button>

            {/* Demolish / Bulldozer */}
            <button
              onClick={() => onSelectTool('demolish')}
              className={`flex flex-col md:flex-row items-center justify-center gap-1 px-2 md:px-3 py-1.5 md:py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                currentTool === 'demolish'
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold shadow-md'
                  : 'bg-slate-800/80 hover:bg-rose-950/40 border-slate-700 text-slate-300 hover:text-rose-400'
              }`}
              title="Bulldozer / Remove Objects (X)"
            >
              <Shovel className="w-4 h-4" />
              <span className="text-[10px] md:text-xs">Demolish</span>
            </button>

            {/* Crazy Drive Mode */}
            <button
              onClick={onToggleDrive}
              className="flex flex-col md:flex-row items-center justify-center gap-1 px-2 md:px-3.5 py-1.5 md:py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-900/30 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              title="Drive your sports car through your creation! (V)"
            >
              <Car className="w-4 h-4" />
              <span className="text-[10px] md:text-xs">Drive</span>
            </button>

            {/* Fireworks */}
            <button
              onClick={onFireworks}
              className="flex flex-col md:flex-row items-center justify-center gap-1 px-2 md:px-2.5 py-1.5 md:py-2 rounded-xl bg-slate-800/80 hover:bg-amber-950/40 border border-slate-700 text-amber-300 hover:text-amber-200 text-xs font-semibold transition-colors cursor-pointer"
              title="Launch celebratory fireworks over your world!"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] md:text-xs">Sparks</span>
            </button>

            {/* Disco Party */}
            <button
              onClick={onDisco}
              className="flex flex-col md:flex-row items-center justify-center gap-1 px-2 md:px-2.5 py-1.5 md:py-2 rounded-xl bg-slate-800/80 hover:bg-purple-950/40 border border-slate-700 text-purple-300 hover:text-purple-200 text-xs font-semibold transition-colors cursor-pointer"
              title="Trigger RGB Disco Party on all lights & windows!"
            >
              <PartyPopper className="w-4 h-4 text-purple-400" />
              <span className="text-[10px] md:text-xs">Disco</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
