/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WorldTile, ToolType, WorldStats } from './types.ts';

export const CELL_SIZE = 4; // 4 meters per grid cell
export const WORLD_RADIUS = 30; // -30 to +30 cells (61x61 grid = ~240m x 240m)

export class WorldGridManager {
  private tiles: Map<string, WorldTile> = new Map();
  private undoStack: Array<{ action: 'add' | 'remove' | 'modify'; prevTile?: WorldTile; newTile?: WorldTile }> = [];
  private redoStack: Array<{ action: 'add' | 'remove' | 'modify'; prevTile?: WorldTile; newTile?: WorldTile }> = [];

  constructor() {
    this.tiles = new Map();
  }

  public getKey(x: number, z: number): string {
    return `${x},${z}`;
  }

  public getTile(x: number, z: number): WorldTile | undefined {
    return this.tiles.get(this.getKey(x, z));
  }

  public getAllTiles(): WorldTile[] {
    return Array.from(this.tiles.values());
  }

  public clear(): void {
    this.tiles.clear();
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Determine cardinal neighbor connectivity for a given type (e.g. road or river)
   */
  public getNeighborMask(x: number, z: number, targetType: ToolType): {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
    count: number;
  } {
    const north = this.getTile(x, z - 1);
    const south = this.getTile(x, z + 1);
    const east = this.getTile(x + 1, z);
    const west = this.getTile(x - 1, z);

    const isMatch = (t?: WorldTile) => {
      if (!t) return false;
      if (t.type === targetType) return true;
      // Roads connect to bridges
      if (targetType === 'road' && t.metadata?.isBridge) return true;
      return false;
    };

    const nMatch = isMatch(north);
    const sMatch = isMatch(south);
    const eMatch = isMatch(east);
    const wMatch = isMatch(west);

    const count = (nMatch ? 1 : 0) + (sMatch ? 1 : 0) + (eMatch ? 1 : 0) + (wMatch ? 1 : 0);

    return {
      north: nMatch,
      south: sMatch,
      east: eMatch,
      west: wMatch,
      count,
    };
  }

  /**
   * Place an object at (x, z) with conflict resolution, stacking, and bridging
   */
  public place(
    x: number,
    z: number,
    type: ToolType,
    variant: string = 'default',
    rotation: number = 0
  ): { tile: WorldTile; affectedTiles: WorldTile[] } | null {
    if (type === 'demolish') {
      const removed = this.remove(x, z);
      return removed ? { tile: removed, affectedTiles: this.getAffectedNeighbors(x, z) } : null;
    }

    const key = this.getKey(x, z);
    const existing = this.tiles.get(key);

    let newTile: WorldTile;

    // RULE 1: Stacking Buildings - if placing a building on an existing building, stack height!
    if (existing && existing.type === 'building' && type === 'building') {
      const updatedHeight = Math.min(12, existing.height + 1);
      newTile = {
        ...existing,
        height: updatedHeight,
        variant: variant || existing.variant,
      };
      this.undoStack.push({ action: 'modify', prevTile: { ...existing }, newTile: { ...newTile } });
      this.redoStack = [];
      this.tiles.set(key, newTile);
      return { tile: newTile, affectedTiles: [] };
    }

    // RULE 2: Road over River creates a Bridge!
    if (existing && existing.type === 'river' && type === 'road') {
      newTile = {
        x,
        z,
        type: 'road',
        variant,
        rotation,
        height: 1,
        id: `bridge-${x}-${z}-${Date.now()}`,
        createdAt: Date.now(),
        metadata: {
          isBridge: true,
        },
      };
      this.undoStack.push({ action: 'modify', prevTile: { ...existing }, newTile: { ...newTile } });
      this.redoStack = [];
      this.tiles.set(key, newTile);
      const affected = this.updateConnectivityForCellAndNeighbors(x, z);
      return { tile: newTile, affectedTiles: affected };
    }

    // RULE 3: Light attachment - lights can be placed on empty ground or attached to corners
    newTile = {
      x,
      z,
      type,
      variant,
      rotation,
      height: type === 'building' ? 1 : 1,
      id: `${type}-${x}-${z}-${Date.now()}`,
      createdAt: Date.now(),
      metadata: {},
    };

    if (existing) {
      this.undoStack.push({ action: 'modify', prevTile: { ...existing }, newTile: { ...newTile } });
    } else {
      this.undoStack.push({ action: 'add', newTile: { ...newTile } });
    }
    this.redoStack = [];
    this.tiles.set(key, newTile);

    const affected = this.updateConnectivityForCellAndNeighbors(x, z);
    return { tile: newTile, affectedTiles: affected };
  }

  public remove(x: number, z: number): WorldTile | null {
    const key = this.getKey(x, z);
    const existing = this.tiles.get(key);
    if (!existing) return null;

    // If building has multiple floors, decrement floor first
    if (existing.type === 'building' && existing.height > 1) {
      const updated: WorldTile = {
        ...existing,
        height: existing.height - 1,
      };
      this.undoStack.push({ action: 'modify', prevTile: { ...existing }, newTile: { ...updated } });
      this.redoStack = [];
      this.tiles.set(key, updated);
      return updated;
    }

    this.undoStack.push({ action: 'remove', prevTile: { ...existing } });
    this.redoStack = [];
    this.tiles.delete(key);
    this.updateConnectivityForCellAndNeighbors(x, z);
    return existing;
  }

  private getAffectedNeighbors(x: number, z: number): WorldTile[] {
    const coords = [
      [x, z - 1],
      [x, z + 1],
      [x + 1, z],
      [x - 1, z],
    ];
    const res: WorldTile[] = [];
    for (const [nx, nz] of coords) {
      const tile = this.getTile(nx, nz);
      if (tile) res.push(tile);
    }
    return res;
  }

  /**
   * Recalculate road and river connectivity for (x, z) and its 4 neighbors
   */
  public updateConnectivityForCellAndNeighbors(x: number, z: number): WorldTile[] {
    const targets = [
      [x, z],
      [x, z - 1],
      [x, z + 1],
      [x + 1, z],
      [x - 1, z],
    ];

    const affected: WorldTile[] = [];

    for (const [tx, tz] of targets) {
      const tile = this.getTile(tx, tz);
      if (!tile) continue;

      if (tile.type === 'road' || tile.type === 'river') {
        const mask = this.getNeighborMask(tx, tz, tile.type);
        tile.metadata = {
          ...tile.metadata,
          connectedNeighbors: {
            north: mask.north,
            south: mask.south,
            east: mask.east,
            west: mask.west,
          },
        };
        affected.push(tile);
      }
    }

    return affected;
  }

  public undo(): WorldTile | null {
    const item = this.undoStack.pop();
    if (!item) return null;

    this.redoStack.push(item);

    if (item.action === 'add' && item.newTile) {
      this.tiles.delete(this.getKey(item.newTile.x, item.newTile.z));
      this.updateConnectivityForCellAndNeighbors(item.newTile.x, item.newTile.z);
      return null;
    } else if (item.action === 'remove' && item.prevTile) {
      this.tiles.set(this.getKey(item.prevTile.x, item.prevTile.z), item.prevTile);
      this.updateConnectivityForCellAndNeighbors(item.prevTile.x, item.prevTile.z);
      return item.prevTile;
    } else if (item.action === 'modify' && item.prevTile) {
      this.tiles.set(this.getKey(item.prevTile.x, item.prevTile.z), item.prevTile);
      this.updateConnectivityForCellAndNeighbors(item.prevTile.x, item.prevTile.z);
      return item.prevTile;
    }
    return null;
  }

  public redo(): WorldTile | null {
    const item = this.redoStack.pop();
    if (!item) return null;

    this.undoStack.push(item);

    if (item.action === 'add' && item.newTile) {
      this.tiles.set(this.getKey(item.newTile.x, item.newTile.z), item.newTile);
      this.updateConnectivityForCellAndNeighbors(item.newTile.x, item.newTile.z);
      return item.newTile;
    } else if (item.action === 'remove' && item.prevTile) {
      this.tiles.delete(this.getKey(item.prevTile.x, item.prevTile.z));
      this.updateConnectivityForCellAndNeighbors(item.prevTile.x, item.prevTile.z);
      return null;
    } else if (item.action === 'modify' && item.newTile) {
      this.tiles.set(this.getKey(item.newTile.x, item.newTile.z), item.newTile);
      this.updateConnectivityForCellAndNeighbors(item.newTile.x, item.newTile.z);
      return item.newTile;
    }
    return null;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getStats(): WorldStats {
    let homes = 0;
    let rivers = 0;
    let buildings = 0;
    let totalFloors = 0;
    let roads = 0;
    let lights = 0;

    for (const tile of this.tiles.values()) {
      switch (tile.type) {
        case 'home':
          homes++;
          break;
        case 'river':
          rivers++;
          break;
        case 'building':
          buildings++;
          totalFloors += tile.height;
          break;
        case 'road':
          roads++;
          break;
        case 'light':
          lights++;
          break;
      }
    }

    const population = homes * 4 + totalFloors * 18;

    return {
      homes,
      rivers,
      buildings,
      totalFloors,
      roads,
      lights,
      population,
    };
  }

  public serialize(): string {
    return JSON.stringify(Array.from(this.tiles.values()));
  }

  public deserialize(json: string): void {
    try {
      const arr = JSON.parse(json) as WorldTile[];
      this.tiles.clear();
      for (const t of arr) {
        this.tiles.set(this.getKey(t.x, t.z), t);
      }
      this.undoStack = [];
      this.redoStack = [];
      // Recompute all connectivity
      for (const t of this.tiles.values()) {
        if (t.type === 'road' || t.type === 'river') {
          this.updateConnectivityForCellAndNeighbors(t.x, t.z);
        }
      }
    } catch (e) {
      console.error('Failed to deserialize world data', e);
    }
  }
}
