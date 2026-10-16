/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { WorldGridManager, CELL_SIZE, WORLD_RADIUS } from './worldGrid.ts';
import { ToolType, TimeOfDay, CameraMode } from './types.ts';
import {
  createHomeGroup,
  createRiverGroup,
  createBuildingGroup,
  createRoadGroup,
  createLightGroup,
  createCarGroup,
} from './proceduralModels.ts';
import { ParticleSystem } from './particleSystem.ts';
import { TrafficSystem } from './trafficSystem.ts';
import { soundEngine } from './audio.ts';

export class WorldRenderer {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public gridManager: WorldGridManager;

  private container: HTMLDivElement;
  private particleSystem: ParticleSystem;
  private trafficSystem: TrafficSystem;

  // Lighting
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private ambientLight: THREE.AmbientLight;

  // Environment
  private stars: THREE.Points | null = null;
  private skyMesh: THREE.Mesh | null = null;
  private groundMesh: THREE.Mesh;
  private gridHelper: THREE.GridHelper;

  // Mesh mapping by tile ID
  private tileMeshes: Map<string, THREE.Group> = new Map();

  // Interaction & Raycasting
  private raycaster: THREE.Raycaster;
  private mousePos: THREE.Vector2;
  private hoveredCell: { x: number; z: number } | null = null;
  private ghostGroup: THREE.Group;
  private currentTool: ToolType = 'home';
  private currentVariant: string = 'default';
  private currentRotation: number = 0;

  // Camera Controls
  private cameraMode: CameraMode = 'god';
  private targetLookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private currentLookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private cameraDistance: number = 32;
  private cameraAzimuth: number = Math.PI / 4;
  private cameraElevation: number = Math.PI / 4;
  private isMouseDown: boolean = false;
  private isPanning: boolean = false;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;

  // Animation & Loop
  private animFrameId: number = 0;
  private clock: THREE.Clock;
  private isTitleTour: boolean = true;
  private timeOfDay: TimeOfDay = 'day';
  private dayProgress: number = 0.25; // 0 = midnight, 0.25 = noon, 0.5 = sunset
  private isAutoDayCycle: boolean = false;

  // Drive Mode
  private isDriveMode: boolean = false;
  private playerCar: THREE.Group | null = null;
  private carPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private carAngle: number = 0;
  private carSpeed: number = 0;
  private carKeys = { forward: false, backward: false, left: false, right: false };

  // Callbacks
  private onStatsChanged?: () => void;
  private onDriveSpeedChanged?: (speed: number) => void;
  private onDriveModeChanged?: (isDriving: boolean) => void;

  constructor(
    container: HTMLDivElement,
    gridManager: WorldGridManager,
    callbacks?: {
      onStatsChanged?: () => void;
      onDriveSpeedChanged?: (speed: number) => void;
      onDriveModeChanged?: (isDriving: boolean) => void;
    }
  ) {
    this.container = container;
    this.gridManager = gridManager;
    this.onStatsChanged = callbacks?.onStatsChanged;
    this.onDriveSpeedChanged = callbacks?.onDriveSpeedChanged;
    this.onDriveModeChanged = callbacks?.onDriveModeChanged;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500);
    this.camera.position.set(24, 22, 24);
    this.camera.lookAt(0, 0, 0);

    // 2. Renderer with PBR settings
    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = !isHeadless;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 3. Studio Environment Map
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // fallback
    }

    // 4. Fog & Background
    this.scene.background = new THREE.Color(0xa7c5eb);
    this.scene.fog = new THREE.FogExp2(0xa7c5eb, 0.008);

    // 5. Lighting Rig
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xfff5e4, 0x475569, 0.85);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff3d1, 2.0);
    this.dirLight.position.set(40, 60, 30);
    this.dirLight.castShadow = !isHeadless;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 150;
    this.dirLight.shadow.camera.left = -40;
    this.dirLight.shadow.camera.right = 40;
    this.dirLight.shadow.camera.top = 40;
    this.dirLight.shadow.camera.bottom = -40;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // 6. Terrain Meadow
    const groundGeo = new THREE.PlaneGeometry(300, 300, 32, 32);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x487346,
      roughness: 0.9,
      metalness: 0.05,
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.receiveShadow = !isHeadless;
    this.scene.add(this.groundMesh);

    // 7. Subtle Grid Decal
    this.gridHelper = new THREE.GridHelper(
      CELL_SIZE * (WORLD_RADIUS * 2),
      WORLD_RADIUS * 2,
      0x689b65,
      0x578254
    );
    this.gridHelper.position.y = 0.01;
    this.scene.add(this.gridHelper);

    // 8. Starfield for Night
    this.createStarfield();

    // 9. Particle & Traffic Systems
    this.particleSystem = new ParticleSystem(this.scene);
    this.trafficSystem = new TrafficSystem(this.scene, this.gridManager);

    // 10. Ghost / Preview Hologram
    this.ghostGroup = new THREE.Group();
    this.scene.add(this.ghostGroup);
    this.updateGhostModel();

    // 11. Raycaster
    this.raycaster = new THREE.Raycaster();
    this.mousePos = new THREE.Vector2(-999, -999);

    // 12. Clock & Setup Listeners
    this.clock = new THREE.Clock();
    this.setupEventListeners();

    // 13. Pre-warm shaders
    this.renderer.compile(this.scene, this.camera);

    // 14. Start Game Loop
    this.startLoop();
  }

  private createStarfield() {
    const starCount = 600;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 240 + Math.random() * 40;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 15; // upper hemisphere
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      transparent: true,
      opacity: 0,
    });
    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);
  }

  private updateGhostModel() {
    // Clear previous ghost
    while (this.ghostGroup.children.length > 0) {
      this.ghostGroup.remove(this.ghostGroup.children[0]);
    }

    if (this.currentTool === 'demolish') {
      // Red outline box
      const geo = new THREE.BoxGeometry(CELL_SIZE * 0.9, 0.4, CELL_SIZE * 0.9);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        wireframe: true,
      });
      const box = new THREE.Mesh(geo, mat);
      box.position.y = 0.2;
      this.ghostGroup.add(box);
      return;
    }

    const dummyTile = {
      x: 0,
      z: 0,
      type: this.currentTool,
      variant: this.currentVariant,
      rotation: this.currentRotation,
      height: 1,
      id: 'ghost',
      createdAt: 0,
    };

    let model: THREE.Group;
    switch (this.currentTool) {
      case 'home':
        model = createHomeGroup(dummyTile);
        break;
      case 'river':
        model = createRiverGroup(dummyTile);
        break;
      case 'building':
        model = createBuildingGroup(dummyTile);
        break;
      case 'road':
        model = createRoadGroup(dummyTile);
        break;
      case 'light':
        model = createLightGroup(dummyTile);
        break;
      default:
        return;
    }

    // Apply translucent holographic styling to ghost
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.5,
          wireframe: false,
        });
      }
    });

    this.ghostGroup.add(model);
    this.ghostGroup.rotation.y = (this.currentRotation * Math.PI) / 180;
  }

  public setTool(tool: ToolType, variant: string = 'default') {
    this.currentTool = tool;
    this.currentVariant = variant;
    this.updateGhostModel();
  }

  public rotateTool() {
    this.currentRotation = (this.currentRotation + 90) % 360;
    this.updateGhostModel();
  }

  public setTimeOfDay(time: TimeOfDay) {
    this.timeOfDay = time;
    if (time === 'day') {
      this.dayProgress = 0.25;
      this.scene.background = new THREE.Color(0xa7c5eb);
      if (this.scene.fog) this.scene.fog.color = new THREE.Color(0xa7c5eb);
      this.dirLight.color.setHex(0xfff3d1);
      this.dirLight.intensity = 2.0;
      this.ambientLight.intensity = 0.45;
      if (this.stars) (this.stars.material as THREE.PointsMaterial).opacity = 0;
    } else if (time === 'sunset') {
      this.dayProgress = 0.5;
      this.scene.background = new THREE.Color(0xfd7e48);
      if (this.scene.fog) this.scene.fog.color = new THREE.Color(0xfd7e48);
      this.dirLight.color.setHex(0xffaa5e);
      this.dirLight.intensity = 1.4;
      this.ambientLight.intensity = 0.35;
      if (this.stars) (this.stars.material as THREE.PointsMaterial).opacity = 0.3;
    } else if (time === 'night') {
      this.dayProgress = 0.0;
      this.scene.background = new THREE.Color(0x0a1122);
      if (this.scene.fog) this.scene.fog.color = new THREE.Color(0x0a1122);
      this.dirLight.color.setHex(0x385586);
      this.dirLight.intensity = 0.4;
      this.ambientLight.intensity = 0.2;
      if (this.stars) (this.stars.material as THREE.PointsMaterial).opacity = 0.95;
    }
  }

  public toggleDayNight(): TimeOfDay {
    if (this.timeOfDay === 'day') this.setTimeOfDay('sunset');
    else if (this.timeOfDay === 'sunset') this.setTimeOfDay('night');
    else this.setTimeOfDay('day');
    return this.timeOfDay;
  }

  public triggerFireworks() {
    soundEngine.playFirework();
    const colors = [0xff2255, 0x22c55e, 0x3b82f6, 0xfacc15, 0xa855f7, 0x06b6d4];

    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        const fx = (Math.random() - 0.5) * 40;
        const fy = 16 + Math.random() * 14;
        const fz = (Math.random() - 0.5) * 40;
        const col = colors[Math.floor(Math.random() * colors.length)];
        this.particleSystem.emitBurst(fx, fy, fz, 80, col, 7, -5, 1.2);
      }, i * 350);
    }
  }

  public triggerDisco() {
    // Flash street lamps and buildings with disco colors
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const hue = (step * 0.15) % 1;
      const color = new THREE.Color().setHSL(hue, 1, 0.5);

      this.scene.traverse((obj) => {
        if (obj instanceof THREE.PointLight) {
          obj.color.copy(color);
        }
      });

      if (step > 25) {
        clearInterval(interval);
        // restore warm light
        this.scene.traverse((obj) => {
          if (obj instanceof THREE.PointLight) {
            obj.color.setHex(0xffbe3b);
          }
        });
      }
    }, 120);
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
    this.isTitleTour = false;

    if (mode === 'drive') {
      this.startDriveMode();
      return;
    } else {
      if (this.isDriveMode) this.exitDriveMode();
    }

    if (mode === 'isometric') {
      this.cameraAzimuth = Math.PI / 4;
      this.cameraElevation = Math.atan(1 / Math.sqrt(2));
      this.cameraDistance = 42;
    } else if (mode === 'topdown') {
      this.cameraAzimuth = 0;
      this.cameraElevation = Math.PI / 2 - 0.05;
      this.cameraDistance = 48;
    } else if (mode === 'street') {
      this.cameraElevation = 0.2;
      this.cameraDistance = 14;
    } else if (mode === 'god') {
      this.cameraElevation = Math.PI / 4;
      this.cameraDistance = 32;
    }
  }

  public startDriveMode() {
    this.isDriveMode = true;
    this.cameraMode = 'drive';

    if (!this.playerCar) {
      this.playerCar = createCarGroup(0, true);
      this.scene.add(this.playerCar);
    }

    // Spawn on a road if available, else at origin
    const roads = this.gridManager.getAllTiles().filter((t) => t.type === 'road');
    if (roads.length > 0) {
      this.carPos.set(roads[0].x * CELL_SIZE, 0.0, roads[0].z * CELL_SIZE);
    } else {
      this.carPos.set(0, 0.0, 0);
    }

    this.carSpeed = 0;
    this.carAngle = 0;
    this.playerCar.position.copy(this.carPos);
    this.playerCar.visible = true;
    soundEngine.startEngine();
    this.onDriveModeChanged?.(true);
  }

  public exitDriveMode() {
    this.isDriveMode = false;
    soundEngine.stopEngine();
    if (this.playerCar) {
      this.playerCar.visible = false;
    }
    this.setCameraMode('god');
    this.onDriveModeChanged?.(false);
  }

  public getIsDriveMode(): boolean {
    return this.isDriveMode;
  }

  public startPlayingFromTitle() {
    this.isTitleTour = false;
    document.body.dataset.state = 'playing';
    this.setCameraMode('god');
  }

  /**
   * Rebuild or update visual mesh for a tile
   */
  public syncTile(tile: WorldTile) {
    const key = this.gridManager.getKey(tile.x, tile.z);
    const existing = this.tileMeshes.get(key);

    if (existing) {
      this.scene.remove(existing);
      this.tileMeshes.delete(key);
    }

    let group: THREE.Group;
    switch (tile.type) {
      case 'home':
        group = createHomeGroup(tile);
        break;
      case 'river':
        group = createRiverGroup(tile);
        break;
      case 'building':
        group = createBuildingGroup(tile);
        break;
      case 'road':
        group = createRoadGroup(tile);
        break;
      case 'light':
        group = createLightGroup(tile);
        break;
      default:
        return;
    }

    group.position.set(tile.x * CELL_SIZE, 0, tile.z * CELL_SIZE);
    this.scene.add(group);
    this.tileMeshes.set(key, group);
  }

  public removeTileMesh(x: number, z: number) {
    const key = this.gridManager.getKey(x, z);
    const existing = this.tileMeshes.get(key);
    if (existing) {
      this.scene.remove(existing);
      this.tileMeshes.delete(key);
    }
  }

  public syncAllTiles() {
    // Clear all existing meshes
    for (const mesh of this.tileMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.tileMeshes.clear();

    const all = this.gridManager.getAllTiles();
    for (const t of all) {
      this.syncTile(t);
    }
  }

  public handlePlaceAtHovered() {
    if (!this.hoveredCell) return;
    const { x, z } = this.hoveredCell;

    if (this.currentTool === 'demolish') {
      const removed = this.gridManager.remove(x, z);
      if (removed) {
        soundEngine.playPlace('demolish');
        this.particleSystem.emitBurst(
          x * CELL_SIZE,
          0.5,
          z * CELL_SIZE,
          30,
          0x94a3b8,
          3.5,
          -6,
          0.7
        );
        if (removed.height && removed.height > 1) {
          // Re-render building at lower height
          this.syncTile(this.gridManager.getTile(x, z)!);
        } else {
          this.removeTileMesh(x, z);
        }
        // Sync affected neighbors (roads, rivers)
        this.syncAffectedNeighbors(x, z);
        this.onStatsChanged?.();
      }
      return;
    }

    const res = this.gridManager.place(
      x,
      z,
      this.currentTool,
      this.currentVariant,
      this.currentRotation
    );

    if (res) {
      soundEngine.playPlace(this.currentTool);

      // Dust burst on place
      this.particleSystem.emitBurst(
        x * CELL_SIZE,
        0.4,
        z * CELL_SIZE,
        20,
        0xfde047,
        2.5,
        -5,
        0.5
      );

      this.syncTile(res.tile);
      for (const aff of res.affectedTiles) {
        this.syncTile(aff);
      }
      this.onStatsChanged?.();
    }
  }

  private syncAffectedNeighbors(x: number, z: number) {
    const coords = [
      [x, z - 1],
      [x, z + 1],
      [x + 1, z],
      [x - 1, z],
    ];
    for (const [nx, nz] of coords) {
      const tile = this.gridManager.getTile(nx, nz);
      if (tile) this.syncTile(tile);
    }
  }

  public undo() {
    this.gridManager.undo();
    this.syncAllTiles();
    this.onStatsChanged?.();
  }

  public redo() {
    this.gridManager.redo();
    this.syncAllTiles();
    this.onStatsChanged?.();
  }

  public clearWorld() {
    this.gridManager.clear();
    this.trafficSystem.clear();
    this.syncAllTiles();
    this.onStatsChanged?.();
  }

  private setupEventListeners() {
    const el = this.renderer.domElement;

    el.addEventListener('pointermove', (e) => {
      const rect = el.getBoundingClientRect();
      this.mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mousePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.isMouseDown) {
        const dx = e.clientX - this.prevMouseX;
        const dy = e.clientY - this.prevMouseY;

        if (this.isPanning) {
          // Pan target
          const right = new THREE.Vector3();
          this.camera.getWorldDirection(right);
          right.cross(this.camera.up).normalize();

          const forward = new THREE.Vector3();
          forward.crossVectors(this.camera.up, right).normalize();

          this.targetLookAt.addScaledVector(right, -dx * 0.05);
          this.targetLookAt.addScaledVector(forward, dy * 0.05);
        } else {
          // Rotate orbit
          this.cameraAzimuth -= dx * 0.008;
          this.cameraElevation = Math.max(
            0.1,
            Math.min(Math.PI / 2 - 0.02, this.cameraElevation + dy * 0.008)
          );
        }
      }

      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    });

    el.addEventListener('pointerdown', (e) => {
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
      this.isMouseDown = true;
      this.isPanning = e.button === 2 || e.shiftKey; // Right click or shift to pan

      if (e.button === 0 && !e.shiftKey && !this.isDriveMode) {
        this.handlePlaceAtHovered();
      }
    });

    window.addEventListener('pointerup', () => {
      this.isMouseDown = false;
      this.isPanning = false;
    });

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault(); // disable browser menu on canvas
    });

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(8, Math.min(90, this.cameraDistance + e.deltaY * 0.03));
    }, { passive: false });

    // Keyboard handlers
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR' && !e.ctrlKey) {
        this.rotateTool();
      }
      if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        if (e.shiftKey) this.redo();
        else this.undo();
      }
      if (e.code === 'KeyY' && (e.ctrlKey || e.metaKey)) {
        this.redo();
      }
      if (e.code === 'KeyV') {
        if (this.isDriveMode) this.exitDriveMode();
        else this.startDriveMode();
      }
      if (e.code === 'KeyT') {
        this.toggleDayNight();
      }

      // Quick numbers 1 to 5 for tools
      if (e.code === 'Digit1') this.setTool('home');
      if (e.code === 'Digit2') this.setTool('river');
      if (e.code === 'Digit3') this.setTool('building');
      if (e.code === 'Digit4') this.setTool('road');
      if (e.code === 'Digit5') this.setTool('light');
      if (e.code === 'KeyX') this.setTool('demolish');

      // Drive controls
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.carKeys.forward = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.carKeys.backward = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.carKeys.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.carKeys.right = true;
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.carKeys.forward = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.carKeys.backward = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.carKeys.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.carKeys.right = false;
    });

    // Clear keys on window blur
    window.addEventListener('blur', () => {
      this.isMouseDown = false;
      this.carKeys.forward = false;
      this.carKeys.backward = false;
      this.carKeys.left = false;
      this.carKeys.right = false;
    });

    // Resize
    window.addEventListener('resize', () => {
      if (!this.container) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  private startLoop() {
    const tick = () => {
      this.animFrameId = requestAnimationFrame(tick);
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);

      this.update(dt);
      this.render();
    };
    tick();
  }

  private update(dt: number) {
    // 1. Title Screen live camera tour
    if (this.isTitleTour) {
      this.cameraAzimuth += dt * 0.15;
      this.cameraElevation = 0.45 + Math.sin(this.clock.getElapsedTime() * 0.3) * 0.1;
      this.cameraDistance = 38;
      this.targetLookAt.set(0, 0, 0);
    }

    // 2. Drive Mode Physics
    if (this.isDriveMode && this.playerCar) {
      const maxSpeed = 16;
      const accel = 18;
      const decel = 12;

      if (this.carKeys.forward) {
        this.carSpeed = Math.min(maxSpeed, this.carSpeed + accel * dt);
      } else if (this.carKeys.backward) {
        this.carSpeed = Math.max(-maxSpeed * 0.5, this.carSpeed - accel * dt);
      } else {
        if (this.carSpeed > 0) this.carSpeed = Math.max(0, this.carSpeed - decel * dt);
        else if (this.carSpeed < 0) this.carSpeed = Math.min(0, this.carSpeed + decel * dt);
      }

      if (Math.abs(this.carSpeed) > 0.1) {
        const turnSpeed = 2.8 * (this.carSpeed / maxSpeed);
        if (this.carKeys.left) this.carAngle += turnSpeed * dt;
        if (this.carKeys.right) this.carAngle -= turnSpeed * dt;
      }

      // Move car
      this.carPos.x += Math.cos(this.carAngle) * this.carSpeed * dt;
      this.carPos.z += -Math.sin(this.carAngle) * this.carSpeed * dt;

      this.playerCar.position.set(this.carPos.x, 0.1, this.carPos.z);
      this.playerCar.rotation.y = this.carAngle + Math.PI / 2;

      // Update audio engine
      soundEngine.updateEngine(this.carSpeed / maxSpeed);
      this.onDriveSpeedChanged?.(Math.round(Math.abs(this.carSpeed * 5)));

      // Drive Cam follow
      const camOffsetDist = 8;
      const camHeight = 3.8;
      const targetCamX = this.carPos.x - Math.cos(this.carAngle) * camOffsetDist;
      const targetCamZ = this.carPos.z + Math.sin(this.carAngle) * camOffsetDist;

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 8, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, camHeight, 8, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 8, dt);

      this.targetLookAt.set(this.carPos.x, 1.2, this.carPos.z);
      this.camera.lookAt(this.targetLookAt);
    } else {
      // Normal Orbit Camera interpolation
      this.currentLookAt.lerp(this.targetLookAt, 1 - Math.exp(-8 * dt));

      const cx =
        this.currentLookAt.x +
        this.cameraDistance * Math.sin(this.cameraAzimuth) * Math.cos(this.cameraElevation);
      const cy =
        this.currentLookAt.y + this.cameraDistance * Math.sin(this.cameraElevation);
      const cz =
        this.currentLookAt.z +
        this.cameraDistance * Math.cos(this.cameraAzimuth) * Math.cos(this.cameraElevation);

      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(this.currentLookAt);
    }

    // 3. Raycast cursor to ground for ghost preview
    if (!this.isDriveMode && !this.isTitleTour) {
      this.raycaster.setFromCamera(this.mousePos, this.camera);
      const hits = this.raycaster.intersectObject(this.groundMesh);
      if (hits.length > 0) {
        const p = hits[0].point;
        const gx = Math.round(p.x / CELL_SIZE);
        const gz = Math.round(p.z / CELL_SIZE);

        this.hoveredCell = { x: gx, z: gz };

        // Position ghost
        const existingTile = this.gridManager.getTile(gx, gz);
        const ghostY = existingTile && existingTile.type === 'building' && this.currentTool === 'building'
          ? existingTile.height * 1.6
          : 0;

        this.ghostGroup.position.set(gx * CELL_SIZE, ghostY, gz * CELL_SIZE);
        this.ghostGroup.visible = true;
      } else {
        this.ghostGroup.visible = false;
        this.hoveredCell = null;
      }
    } else {
      this.ghostGroup.visible = false;
    }

    // 4. Update Particle & Traffic Systems
    this.particleSystem.update(dt);
    this.trafficSystem.update(dt);
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    cancelAnimationFrame(this.animFrameId);
    this.particleSystem.dispose();
    this.trafficSystem.clear();
    this.renderer.dispose();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
