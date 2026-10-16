/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ToolType = 'home' | 'river' | 'building' | 'road' | 'light' | 'demolish';

export type HouseVariant = 'cottage' | 'modern' | 'manor';
export type BuildingVariant = 'glass_highrise' | 'cyber_tower' | 'brick_commercial';
export type RoadVariant = 'asphalt' | 'cobblestone' | 'highway';
export type RiverVariant = 'clear_water' | 'crystal_blue' | 'mystic_teal';
export type LightVariant = 'warm_lantern' | 'cyber_neon' | 'modern_led';

export interface WorldTile {
  x: number; // grid coordinate X
  z: number; // grid coordinate Z
  type: ToolType;
  variant?: string;
  rotation: number; // 0, 90, 180, 270 (in degrees)
  height: number; // For buildings: number of floors (1..10)
  id: string;
  createdAt: number;
  metadata?: {
    isBridge?: boolean;
    connectedNeighbors?: {
      north: boolean;
      south: boolean;
      east: boolean;
      west: boolean;
    };
  };
}

export type TimeOfDay = 'day' | 'sunset' | 'night';
export type CameraMode = 'god' | 'isometric' | 'topdown' | 'street' | 'drive';

export interface WorldStats {
  homes: number;
  rivers: number;
  buildings: number;
  totalFloors: number;
  roads: number;
  lights: number;
  population: number;
}
