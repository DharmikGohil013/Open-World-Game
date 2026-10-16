/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WorldGridManager } from './game/worldGrid.ts';
import { WorldRenderer } from './game/worldRenderer.ts';
import { ToolType, TimeOfDay, CameraMode, WorldStats } from './game/types.ts';
import { soundEngine } from './game/audio.ts';
import { TitleScreen } from './components/TitleScreen.tsx';
import { TopStatusBar } from './components/TopStatusBar.tsx';
import { BuilderDock } from './components/BuilderDock.tsx';
import { DriveHUD } from './components/DriveHUD.tsx';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<WorldRenderer | null>(null);
  const gridManagerRef = useRef<WorldGridManager>(new WorldGridManager());

  // Game UI State
  const [gameState, setGameState] = useState<'title' | 'playing'>('title');
  const [currentTool, setCurrentTool] = useState<ToolType>('home');
  const [currentRotation, setCurrentRotation] = useState<number>(0);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [cameraMode, setCameraMode] = useState<CameraMode>('god');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDriving, setIsDriving] = useState<boolean>(false);
  const [carSpeed, setCarSpeed] = useState<number>(0);

  const [stats, setStats] = useState<WorldStats>({
    homes: 0,
    rivers: 0,
    buildings: 0,
    totalFloors: 0,
    roads: 0,
    lights: 0,
    population: 0,
  });

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const refreshStats = useCallback(() => {
    if (gridManagerRef.current) {
      setStats(gridManagerRef.current.getStats());
      setCanUndo(gridManagerRef.current.canUndo());
      setCanRedo(gridManagerRef.current.canRedo());
    }
  }, []);

  // Initialize Three.js Engine once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    // Check autostart query param
    const urlParams = new URLSearchParams(window.location.search);
    const autostart = urlParams.get('autostart') === '1';

    const renderer = new WorldRenderer(canvasMountRef.current, gridManagerRef.current, {
      onStatsChanged: refreshStats,
      onDriveSpeedChanged: (speed) => setCarSpeed(speed),
      onDriveModeChanged: (driving) => {
        setIsDriving(driving);
        setCameraMode(driving ? 'drive' : 'god');
      },
    });

    rendererRef.current = renderer;

    if (autostart) {
      renderer.startPlayingFromTitle();
      setGameState('playing');
    } else {
      document.body.dataset.state = 'title';
    }

    refreshStats();

    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [refreshStats]);

  const handleStartGame = () => {
    setGameState('playing');
    if (rendererRef.current) {
      rendererRef.current.startPlayingFromTitle();
    }
  };

  const handleSelectTool = (tool: ToolType) => {
    setCurrentTool(tool);
    if (rendererRef.current) {
      rendererRef.current.setTool(tool);
    }
  };

  const handleRotate = () => {
    const nextRot = (currentRotation + 90) % 360;
    setCurrentRotation(nextRot);
    if (rendererRef.current) {
      rendererRef.current.rotateTool();
    }
  };

  const handleToggleTime = () => {
    if (rendererRef.current) {
      const newTime = rendererRef.current.toggleDayNight();
      setTimeOfDay(newTime);
    }
  };

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleSetCameraMode = (mode: CameraMode) => {
    setCameraMode(mode);
    if (rendererRef.current) {
      rendererRef.current.setCameraMode(mode);
      setIsDriving(rendererRef.current.getIsDriveMode());
    }
  };

  const handleToggleDrive = () => {
    if (rendererRef.current) {
      if (isDriving) {
        rendererRef.current.exitDriveMode();
        setIsDriving(false);
        setCameraMode('god');
      } else {
        rendererRef.current.startDriveMode();
        setIsDriving(true);
        setCameraMode('drive');
      }
    }
  };

  const handleFireworks = () => {
    if (rendererRef.current) {
      rendererRef.current.triggerFireworks();
    }
  };

  const handleDisco = () => {
    if (rendererRef.current) {
      rendererRef.current.triggerDisco();
    }
  };

  const handleUndo = () => {
    if (rendererRef.current) {
      rendererRef.current.undo();
      refreshStats();
    }
  };

  const handleRedo = () => {
    if (rendererRef.current) {
      rendererRef.current.redo();
      refreshStats();
    }
  };

  const handleClear = () => {
    if (rendererRef.current) {
      rendererRef.current.clearWorld();
      refreshStats();
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-950 font-sans">
      {/* Isolated Three.js Canvas Container */}
      <div
        ref={canvasMountRef}
        data-testid="threejs-canvas-container"
        className="absolute inset-0 w-full h-full z-0 cursor-crosshair"
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && <TitleScreen onStart={handleStartGame} />}

      {/* In-Game HUD Overlays */}
      {gameState === 'playing' && (
        <>
          {/* Top Status & Controls Bar */}
          <TopStatusBar
            stats={stats}
            timeOfDay={timeOfDay}
            cameraMode={cameraMode}
            isMuted={isMuted}
            canUndo={canUndo}
            canRedo={canRedo}
            onToggleTime={handleToggleTime}
            onToggleMute={handleToggleMute}
            onSetCameraMode={handleSetCameraMode}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClear={handleClear}
          />

          {/* If in Drive Mode, render Drive HUD */}
          {isDriving ? (
            <DriveHUD speed={carSpeed} onExit={handleToggleDrive} />
          ) : (
            /* Builder Dock at Bottom Center */
            <BuilderDock
              currentTool={currentTool}
              currentRotation={currentRotation}
              onSelectTool={handleSelectTool}
              onRotate={handleRotate}
              onToggleDrive={handleToggleDrive}
              onFireworks={handleFireworks}
              onDisco={handleDisco}
            />
          )}
        </>
      )}
    </div>
  );
}
