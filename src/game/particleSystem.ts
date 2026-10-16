/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

const MAX_PARTICLES = 1200;

export class ParticleSystem {
  public mesh: THREE.InstancedMesh;
  private dummy: THREE.Object3D;

  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private lives: Float32Array;
  private maxLives: Float32Array;
  private scales: Float32Array;
  private nextIdx: number = 0;

  constructor(scene: THREE.Scene) {
    const geo = new THREE.DodecahedronGeometry(0.08, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, MAX_PARTICLES);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    this.dummy = new THREE.Object3D();

    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.velocities = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.lives = new Float32Array(MAX_PARTICLES);
    this.maxLives = new Float32Array(MAX_PARTICLES);
    this.scales = new Float32Array(MAX_PARTICLES);

    // Initialize all off-screen
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.dummy.position.set(0, -9999, 0);
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, new THREE.Color(1, 1, 1));
      this.lives[i] = 0;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  public emitBurst(
    x: number,
    y: number,
    z: number,
    count: number = 24,
    colorHex: number = 0xffe28a,
    speed: number = 4,
    gravity: number = -6,
    lifeTime: number = 0.8
  ) {
    const col = new THREE.Color(colorHex);

    for (let i = 0; i < count; i++) {
      const idx = this.nextIdx;
      this.nextIdx = (this.nextIdx + 1) % MAX_PARTICLES;

      const pIdx = idx * 3;
      this.positions[pIdx] = x;
      this.positions[pIdx + 1] = y;
      this.positions[pIdx + 2] = z;

      // Random spherical velocity
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const v = speed * (0.4 + Math.random() * 0.6);

      this.velocities[pIdx] = Math.sin(phi) * Math.cos(theta) * v;
      this.velocities[pIdx + 1] = Math.cos(phi) * v + 1.5; // slight upward bias
      this.velocities[pIdx + 2] = Math.sin(phi) * Math.sin(theta) * v;

      this.colors[pIdx] = col.r;
      this.colors[pIdx + 1] = col.g;
      this.colors[pIdx + 2] = col.b;

      this.lives[idx] = lifeTime;
      this.maxLives[idx] = lifeTime;
      this.scales[idx] = 0.6 + Math.random() * 0.8;

      if (this.mesh.instanceColor) {
        this.mesh.setColorAt(idx, col);
      }
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  public update(dt: number) {
    let hasActive = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.lives[i] <= 0) continue;

      hasActive = true;
      this.lives[i] -= dt;

      const pIdx = i * 3;
      if (this.lives[i] <= 0) {
        // Hide
        this.dummy.position.set(0, -9999, 0);
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
      } else {
        // Physics integration
        this.velocities[pIdx + 1] -= 9.8 * dt * 0.6; // gravity
        this.positions[pIdx] += this.velocities[pIdx] * dt;
        this.positions[pIdx + 1] += this.velocities[pIdx + 1] * dt;
        this.positions[pIdx + 2] += this.velocities[pIdx + 2] * dt;

        // Ground bounce
        if (this.positions[pIdx + 1] < 0.05) {
          this.positions[pIdx + 1] = 0.05;
          this.velocities[pIdx + 1] *= -0.4;
          this.velocities[pIdx] *= 0.8;
          this.velocities[pIdx + 2] *= 0.8;
        }

        const progress = this.lives[i] / this.maxLives[i];
        const currentScale = this.scales[i] * progress;

        this.dummy.position.set(
          this.positions[pIdx],
          this.positions[pIdx + 1],
          this.positions[pIdx + 2]
        );
        this.dummy.scale.set(currentScale, currentScale, currentScale);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
      }
    }

    if (hasActive) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  public dispose() {
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((m) => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }
}
