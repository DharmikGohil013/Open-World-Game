/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WorldGridManager, CELL_SIZE } from './worldGrid.ts';
import { createCarGroup } from './proceduralModels.ts';

interface TrafficCar {
  group: THREE.Group;
  currentCell: { x: number; z: number };
  targetCell: { x: number; z: number };
  progress: number;
  speed: number;
  colorIdx: number;
}

export class TrafficSystem {
  private cars: TrafficCar[] = [];
  private scene: THREE.Scene;
  private gridManager: WorldGridManager;
  private maxCars: number = 8;
  private spawnCooldown: number = 0;

  constructor(scene: THREE.Scene, gridManager: WorldGridManager) {
    this.scene = scene;
    this.gridManager = gridManager;
  }

  public update(dt: number) {
    const roadTiles = this.gridManager.getAllTiles().filter((t) => t.type === 'road');

    // If roads exist and fewer cars than desired, spawn periodically
    this.spawnCooldown -= dt;
    if (roadTiles.length >= 2 && this.cars.length < Math.min(this.maxCars, roadTiles.length) && this.spawnCooldown <= 0) {
      this.spawnCar(roadTiles);
      this.spawnCooldown = 2.0;
    }

    // Update each car along the road network
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i];

      // Check if current or target road tile still exists
      const currTile = this.gridManager.getTile(car.currentCell.x, car.currentCell.z);
      const targTile = this.gridManager.getTile(car.targetCell.x, car.targetCell.z);

      if (!currTile || currTile.type !== 'road' || !targTile || targTile.type !== 'road') {
        // Despawn car if road was deleted
        this.scene.remove(car.group);
        this.cars.splice(i, 1);
        continue;
      }

      car.progress += car.speed * dt;

      const startX = car.currentCell.x * CELL_SIZE;
      const startZ = car.currentCell.z * CELL_SIZE;
      const endX = car.targetCell.x * CELL_SIZE;
      const endZ = car.targetCell.z * CELL_SIZE;

      // Position interpolation
      const posX = THREE.MathUtils.lerp(startX, endX, car.progress);
      const posZ = THREE.MathUtils.lerp(startZ, endZ, car.progress);
      const posY = currTile.metadata?.isBridge || targTile.metadata?.isBridge ? 0.5 : 0.05;

      car.group.position.set(posX, posY, posZ);

      // Rotation towards target
      const angle = Math.atan2(endZ - startZ, endX - startX);
      car.group.rotation.y = -angle + Math.PI / 2;

      // When reached destination, choose next connected road neighbor
      if (car.progress >= 1.0) {
        car.progress = 0;
        car.currentCell = { ...car.targetCell };

        const nextNeighbors = this.getConnectedRoadNeighbors(car.targetCell.x, car.targetCell.z, car.currentCell);
        if (nextNeighbors.length > 0) {
          const next = nextNeighbors[Math.floor(Math.random() * nextNeighbors.length)];
          car.targetCell = next;
        } else {
          // Dead end: reverse direction or despawn
          this.scene.remove(car.group);
          this.cars.splice(i, 1);
        }
      }
    }
  }

  private getConnectedRoadNeighbors(
    x: number,
    z: number,
    prev?: { x: number; z: number }
  ): Array<{ x: number; z: number }> {
    const candidates = [
      { x, z: z - 1 },
      { x, z: z + 1 },
      { x: x + 1, z },
      { x: x - 1, z },
    ];

    const valid: Array<{ x: number; z: number }> = [];
    for (const c of candidates) {
      if (prev && c.x === prev.x && c.z === prev.z && candidates.length > 1) {
        // Avoid immediate U-turn if other choices exist
        continue;
      }
      const tile = this.gridManager.getTile(c.x, c.z);
      if (tile && tile.type === 'road') {
        valid.push(c);
      }
    }

    if (valid.length === 0 && prev) {
      // Allow U-turn if dead-end
      const tile = this.gridManager.getTile(prev.x, prev.z);
      if (tile && tile.type === 'road') valid.push(prev);
    }

    return valid;
  }

  private spawnCar(roadTiles: Array<{ x: number; z: number }>) {
    const startTile = roadTiles[Math.floor(Math.random() * roadTiles.length)];
    const neighbors = this.getConnectedRoadNeighbors(startTile.x, startTile.z);
    if (neighbors.length === 0) return;

    const targetTile = neighbors[Math.floor(Math.random() * neighbors.length)];
    const colorIdx = this.cars.length;
    const carGroup = createCarGroup(colorIdx, false);
    carGroup.scale.set(0.65, 0.65, 0.65);

    this.scene.add(carGroup);

    this.cars.push({
      group: carGroup,
      currentCell: { x: startTile.x, z: startTile.z },
      targetCell: { x: targetTile.x, z: targetTile.z },
      progress: 0,
      speed: 0.35 + Math.random() * 0.25,
      colorIdx,
    });
  }

  public clear() {
    for (const car of this.cars) {
      this.scene.remove(car.group);
    }
    this.cars = [];
  }
}
