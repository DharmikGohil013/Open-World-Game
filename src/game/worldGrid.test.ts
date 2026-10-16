/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldGridManager } from './worldGrid.ts';

test('WorldGridManager initializes with blank world', () => {
  const manager = new WorldGridManager();
  assert.equal(manager.getAllTiles().length, 0);
  const stats = manager.getStats();
  assert.equal(stats.homes, 0);
  assert.equal(stats.buildings, 0);
  assert.equal(stats.roads, 0);
  assert.equal(stats.rivers, 0);
  assert.equal(stats.lights, 0);
  assert.equal(stats.population, 0);
});

test('WorldGridManager places all 5 core elements without error', () => {
  const manager = new WorldGridManager();
  
  // 1. Home
  const homeResult = manager.place(0, 0, 'home', 'cottage');
  assert.ok(homeResult);
  assert.equal(manager.getTile(0, 0)?.type, 'home');

  // 2. River
  const riverResult = manager.place(1, 0, 'river', 'clear_water');
  assert.ok(riverResult);
  assert.equal(manager.getTile(1, 0)?.type, 'river');

  // 3. Building
  const buildingResult = manager.place(2, 0, 'building', 'glass_highrise');
  assert.ok(buildingResult);
  assert.equal(manager.getTile(2, 0)?.type, 'building');
  assert.equal(manager.getTile(2, 0)?.height, 1);

  // 4. Road
  const roadResult = manager.place(0, 1, 'road', 'asphalt');
  assert.ok(roadResult);
  assert.equal(manager.getTile(0, 1)?.type, 'road');

  // 5. Light
  const lightResult = manager.place(0, 2, 'light', 'warm_lantern');
  assert.ok(lightResult);
  assert.equal(manager.getTile(0, 2)?.type, 'light');

  const stats = manager.getStats();
  assert.equal(stats.homes, 1);
  assert.equal(stats.rivers, 1);
  assert.equal(stats.buildings, 1);
  assert.equal(stats.roads, 1);
  assert.equal(stats.lights, 1);
  assert.equal(stats.population, 4 + 18); // 1 home (4) + 1 floor (18)
});

test('Building stacking increases height seamlessly without conflict', () => {
  const manager = new WorldGridManager();
  manager.place(5, 5, 'building', 'cyber_tower');
  assert.equal(manager.getTile(5, 5)?.height, 1);

  // Stack 2nd floor
  manager.place(5, 5, 'building', 'cyber_tower');
  assert.equal(manager.getTile(5, 5)?.height, 2);

  // Stack 3rd floor
  manager.place(5, 5, 'building', 'cyber_tower');
  assert.equal(manager.getTile(5, 5)?.height, 3);

  const stats = manager.getStats();
  assert.equal(stats.buildings, 1);
  assert.equal(stats.totalFloors, 3);
  assert.equal(stats.population, 3 * 18);
});

test('Road over river automatically converts into bridge', () => {
  const manager = new WorldGridManager();
  // Place river first
  manager.place(10, 10, 'river');
  assert.equal(manager.getTile(10, 10)?.type, 'river');

  // Place road on top of river
  manager.place(10, 10, 'road');
  const bridgeTile = manager.getTile(10, 10);
  assert.equal(bridgeTile?.type, 'road');
  assert.equal(bridgeTile?.metadata?.isBridge, true);
});

test('Road connectivity auto-detects neighbor connections', () => {
  const manager = new WorldGridManager();
  // Create a T-intersection: center at (0, 0), neighbors at (0, -1) North, (0, 1) South, (1, 0) East
  manager.place(0, 0, 'road');
  manager.place(0, -1, 'road');
  manager.place(0, 1, 'road');
  manager.place(1, 0, 'road');

  const centerTile = manager.getTile(0, 0);
  assert.ok(centerTile);
  const conn = centerTile.metadata?.connectedNeighbors;
  assert.ok(conn);
  assert.equal(conn.north, true);
  assert.equal(conn.south, true);
  assert.equal(conn.east, true);
  assert.equal(conn.west, false);
});

test('Undo and Redo stack works predictably', () => {
  const manager = new WorldGridManager();
  assert.equal(manager.canUndo(), false);

  manager.place(3, 3, 'home');
  assert.equal(manager.canUndo(), true);
  assert.equal(manager.getAllTiles().length, 1);

  // Undo placement
  manager.undo();
  assert.equal(manager.getAllTiles().length, 0);
  assert.equal(manager.canRedo(), true);

  // Redo placement
  manager.redo();
  assert.equal(manager.getAllTiles().length, 1);
  assert.equal(manager.getTile(3, 3)?.type, 'home');
});
