/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CELL_SIZE } from './worldGrid.ts';
import { WorldTile } from './types.ts';

// Shared materials for optimal performance & batching
const materialsCache = new Map<string, THREE.Material>();

function getOrCreateMaterial(
  key: string,
  createFn: () => THREE.Material
): THREE.Material {
  let mat = materialsCache.get(key);
  if (!mat) {
    mat = createFn();
    materialsCache.set(key, mat);
  }
  return mat;
}

// Procedural Contact Shadow
function createContactShadow(radius: number = 1.8, opacity: number = 0.35): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
  geo.rotateX(-Math.PI / 2);
  const mat = getOrCreateMaterial(`shadow_${radius}_${opacity}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 64, 64);
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
    grad.addColorStop(0.5, `rgba(0, 0, 0, ${opacity * 0.4})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    return new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.02;
  mesh.renderOrder = 2;
  return mesh;
}

/**
 * 1. Procedural Home (10+ distinct parts)
 */
export function createHomeGroup(tile: WorldTile): THREE.Group {
  const group = new THREE.Group();
  group.name = `home_${tile.x}_${tile.z}`;

  const colors = [
    { wall: 0xdfd3c3, roof: 0xa94438, trim: 0x4a3933 }, // Cozy Red Cottage
    { wall: 0x8a9a86, roof: 0x334237, trim: 0x2b2b2b }, // Forest Green Villa
    { wall: 0xdde6ed, roof: 0x27374d, trim: 0x1e2022 }, // Nordic Blue Modern
    { wall: 0xe8d5b7, roof: 0x936a46, trim: 0x5a3e2b }, // Sunny Meadow House
  ];
  const colorScheme = colors[Math.abs(tile.x * 7 + tile.z * 13) % colors.length];

  // 1. Foundation Plinth
  const foundationGeo = new THREE.BoxGeometry(3.2, 0.3, 3.0);
  const foundationMat = getOrCreateMaterial('stone_foundation', () =>
    new THREE.MeshStandardMaterial({ color: 0x6e6e6e, roughness: 0.85, metalness: 0.1 })
  );
  const foundation = new THREE.Mesh(foundationGeo, foundationMat);
  foundation.position.y = 0.15;
  foundation.castShadow = true;
  foundation.receiveShadow = true;
  group.add(foundation);

  // 2. Main Wall Body
  const wallGeo = new THREE.BoxGeometry(2.9, 1.8, 2.7);
  const wallMat = getOrCreateMaterial(`home_wall_${colorScheme.wall}`, () =>
    new THREE.MeshStandardMaterial({ color: colorScheme.wall, roughness: 0.7, metalness: 0.05 })
  );
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.y = 1.2;
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  // 3. Pitched Gabled Roof (composed of slanted panels)
  const roofHeight = 1.2;
  const roofGeo = new THREE.ConeGeometry(2.3, roofHeight, 4);
  roofGeo.rotateY(Math.PI / 4);
  const roofMat = getOrCreateMaterial(`home_roof_${colorScheme.roof}`, () =>
    new THREE.MeshStandardMaterial({ color: colorScheme.roof, roughness: 0.45, metalness: 0.15 })
  );
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 2.1 + roofHeight / 2;
  roof.scale.set(1.0, 1.0, 0.9);
  roof.castShadow = true;
  group.add(roof);

  // 4. Overhanging Eaves Trim
  const trimGeo = new THREE.BoxGeometry(3.1, 0.1, 2.9);
  const trimMat = getOrCreateMaterial(`home_trim_${colorScheme.trim}`, () =>
    new THREE.MeshStandardMaterial({ color: colorScheme.trim, roughness: 0.6 })
  );
  const trim = new THREE.Mesh(trimGeo, trimMat);
  trim.position.y = 2.15;
  group.add(trim);

  // 5. Chimney Stack & Cap
  const chimneyGeo = new THREE.BoxGeometry(0.4, 1.5, 0.4);
  const chimneyMat = getOrCreateMaterial('chimney_brick', () =>
    new THREE.MeshStandardMaterial({ color: 0x8b3a2b, roughness: 0.9 })
  );
  const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
  chimney.position.set(0.8, 2.4, -0.6);
  chimney.castShadow = true;
  group.add(chimney);

  const chimneyCapGeo = new THREE.BoxGeometry(0.5, 0.08, 0.5);
  const chimneyCap = new THREE.Mesh(chimneyCapGeo, trimMat);
  chimneyCap.position.set(0.8, 3.15, -0.6);
  group.add(chimneyCap);

  // 6. Recessed Wooden Front Door
  const doorGeo = new THREE.BoxGeometry(0.55, 1.1, 0.06);
  const doorMat = getOrCreateMaterial('home_door', () =>
    new THREE.MeshStandardMaterial({ color: 0x5a331a, roughness: 0.5 })
  );
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, 0.85, 1.36);
  group.add(door);

  // 7. Porch Awning & Step
  const stepGeo = new THREE.BoxGeometry(0.9, 0.12, 0.4);
  const step = new THREE.Mesh(stepGeo, foundationMat);
  step.position.set(0, 0.06, 1.55);
  group.add(step);

  const awningGeo = new THREE.BoxGeometry(0.8, 0.08, 0.4);
  const awning = new THREE.Mesh(awningGeo, trimMat);
  awning.position.set(0, 1.5, 1.55);
  group.add(awning);

  // 8. Glowing Windows (with warm emissive material for night!)
  const windowGeo = new THREE.PlaneGeometry(0.45, 0.55);
  const windowMat = getOrCreateMaterial('window_glow', () =>
    new THREE.MeshStandardMaterial({
      color: 0xffe28a,
      emissive: 0xffbe3b,
      emissiveIntensity: 0.75,
      roughness: 0.2,
      metalness: 0.1,
    })
  );

  // Front Windows
  const winFrontL = new THREE.Mesh(windowGeo, windowMat);
  winFrontL.position.set(-0.8, 1.25, 1.36);
  group.add(winFrontL);

  const winFrontR = new THREE.Mesh(windowGeo, windowMat);
  winFrontR.position.set(0.8, 1.25, 1.36);
  group.add(winFrontR);

  // Side Windows
  const winSideL = new THREE.Mesh(windowGeo, windowMat);
  winSideL.rotation.y = Math.PI / 2;
  winSideL.position.set(1.46, 1.25, 0);
  group.add(winSideL);

  const winSideR = new THREE.Mesh(windowGeo, windowMat);
  winSideR.rotation.y = -Math.PI / 2;
  winSideR.position.set(-1.46, 1.25, 0);
  group.add(winSideR);

  // 9. Flower box / picket fence accents
  const fenceGeo = new THREE.BoxGeometry(0.8, 0.35, 0.04);
  const fenceMat = getOrCreateMaterial('fence_white', () =>
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
  );
  const fenceL = new THREE.Mesh(fenceGeo, fenceMat);
  fenceL.position.set(-0.9, 0.2, 1.6);
  group.add(fenceL);

  const fenceR = new THREE.Mesh(fenceGeo, fenceMat);
  fenceR.position.set(0.9, 0.2, 1.6);
  group.add(fenceR);

  // 10. Contact Shadow
  group.add(createContactShadow(2.2, 0.35));

  group.rotation.y = (tile.rotation * Math.PI) / 180;
  return group;
}

/**
 * 2. Procedural River & Bridge (dynamic water channel, rocks, bridge auto-construct)
 */
export function createRiverGroup(tile: WorldTile): THREE.Group {
  const group = new THREE.Group();
  group.name = `river_${tile.x}_${tile.z}`;

  const isBridge = tile.metadata?.isBridge || false;
  const conn = tile.metadata?.connectedNeighbors || {
    north: false,
    south: false,
    east: false,
    west: false,
  };

  // 1. Water Channel Basin
  const waterGeo = new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE, 8, 8);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = getOrCreateMaterial('river_water', () =>
    new THREE.MeshStandardMaterial({
      color: 0x1b72a6,
      emissive: 0x0f4066,
      emissiveIntensity: 0.3,
      roughness: 0.12,
      metalness: 0.2,
      transparent: true,
      opacity: 0.9,
    })
  );
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = 0.03; // slightly sunken
  water.receiveShadow = true;
  group.add(water);

  // 2. River Bed / Banks (subtle sandy/pebble borders)
  const bankGeo = new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE);
  bankGeo.rotateX(-Math.PI / 2);
  const bankMat = getOrCreateMaterial('river_bank', () =>
    new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.95,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const bank = new THREE.Mesh(bankGeo, bankMat);
  bank.position.y = 0.02;
  group.add(bank);

  // 3. River Stones & Reeds
  const stoneGeo = new THREE.DodecahedronGeometry(0.2, 0);
  const stoneMat = getOrCreateMaterial('river_stone', () =>
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 })
  );
  const stone1 = new THREE.Mesh(stoneGeo, stoneMat);
  stone1.position.set(1.4, 0.1, -1.2);
  stone1.scale.set(1, 0.6, 1.2);
  group.add(stone1);

  const stone2 = new THREE.Mesh(stoneGeo, stoneMat);
  stone2.position.set(-1.3, 0.1, 1.1);
  stone2.scale.set(0.8, 0.5, 0.9);
  group.add(stone2);

  // 4. If Bridge: Construct Stone / Wooden Arch Bridge
  if (isBridge) {
    const bridgeSpanGeo = new THREE.BoxGeometry(CELL_SIZE, 0.25, 2.4);
    const bridgeMat = getOrCreateMaterial('bridge_stone', () =>
      new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.75 })
    );
    const bridgeSpan = new THREE.Mesh(bridgeSpanGeo, bridgeMat);
    bridgeSpan.position.y = 0.35;
    bridgeSpan.castShadow = true;
    bridgeSpan.receiveShadow = true;
    group.add(bridgeSpan);

    // Bridge Asphalt Deck
    const deckGeo = new THREE.PlaneGeometry(CELL_SIZE, 2.2);
    deckGeo.rotateX(-Math.PI / 2);
    const roadMat = getOrCreateMaterial('road_asphalt', () =>
      new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.85 })
    );
    const deck = new THREE.Mesh(deckGeo, roadMat);
    deck.position.y = 0.49;
    group.add(deck);

    // Railings on both sides
    const railGeo = new THREE.BoxGeometry(CELL_SIZE, 0.4, 0.12);
    const railMat = getOrCreateMaterial('bridge_rail', () =>
      new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.6, metalness: 0.3 })
    );
    const railNorth = new THREE.Mesh(railGeo, railMat);
    railNorth.position.set(0, 0.65, 1.15);
    group.add(railNorth);

    const railSouth = new THREE.Mesh(railGeo, railMat);
    railSouth.position.set(0, 0.65, -1.15);
    group.add(railSouth);
  }

  return group;
}

/**
 * 3. Procedural Skyscraper / Building (Stackable without conflict, multi-floor)
 */
export function createBuildingGroup(tile: WorldTile): THREE.Group {
  const group = new THREE.Group();
  group.name = `building_${tile.x}_${tile.z}`;

  const floorHeight = 1.6;
  const floors = Math.max(1, tile.height);
  const width = 3.2;
  const depth = 3.2;

  const styleVariants = [
    { glass: 0x38bdf8, frame: 0x1e293b, glow: 0x93c5fd }, // Azure Cyber Tower
    { glass: 0x34d399, frame: 0x064e3b, glow: 0x6ee7b7 }, // Emerald Highrise
    { glass: 0xfbbf24, frame: 0x451a03, glow: 0xfef08a }, // Amber Plaza
    { glass: 0xa855f7, frame: 0x2e1065, glow: 0xd8b4fe }, // Neon Purple Spire
  ];
  const style = styleVariants[Math.abs(tile.x * 5 + tile.z * 11) % styleVariants.length];

  // Base Foundation
  const baseGeo = new THREE.BoxGeometry(width + 0.3, 0.3, depth + 0.3);
  const baseMat = getOrCreateMaterial('building_concrete_base', () =>
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8, metalness: 0.2 })
  );
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.15;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Construct each floor
  for (let f = 0; f < floors; f++) {
    const floorY = 0.3 + f * floorHeight;

    // Floor Plate Slab
    const slabGeo = new THREE.BoxGeometry(width + 0.1, 0.12, depth + 0.1);
    const slabMat = getOrCreateMaterial(`slab_${style.frame}`, () =>
      new THREE.MeshStandardMaterial({ color: style.frame, roughness: 0.6, metalness: 0.4 })
    );
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.y = floorY + 0.06;
    group.add(slab);

    // Floor Core / Columns
    const coreGeo = new THREE.BoxGeometry(width * 0.95, floorHeight - 0.12, depth * 0.95);
    const glassMat = getOrCreateMaterial(`glass_${style.glass}`, () =>
      new THREE.MeshStandardMaterial({
        color: style.glass,
        roughness: 0.15,
        metalness: 0.7,
        transparent: true,
        opacity: 0.85,
      })
    );
    const core = new THREE.Mesh(coreGeo, glassMat);
    core.position.y = floorY + floorHeight / 2;
    core.castShadow = true;
    group.add(core);

    // Illuminated Floor Windows / Offices
    const winGeo = new THREE.PlaneGeometry(width * 0.8, floorHeight * 0.6);
    const litMat = getOrCreateMaterial(`office_lit_${style.glow}`, () =>
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: style.glow,
        emissiveIntensity: 0.6,
        roughness: 0.3,
      })
    );

    // 4 Window Panes per floor
    const winN = new THREE.Mesh(winGeo, litMat);
    winN.position.set(0, floorY + floorHeight / 2, depth / 2 + 0.01);
    group.add(winN);

    const winS = new THREE.Mesh(winGeo, litMat);
    winS.rotation.y = Math.PI;
    winS.position.set(0, floorY + floorHeight / 2, -depth / 2 - 0.01);
    group.add(winS);

    const winE = new THREE.Mesh(winGeo, litMat);
    winE.rotation.y = Math.PI / 2;
    winE.position.set(width / 2 + 0.01, floorY + floorHeight / 2, 0);
    group.add(winE);

    const winW = new THREE.Mesh(winGeo, litMat);
    winW.rotation.y = -Math.PI / 2;
    winW.position.set(-width / 2 - 0.01, floorY + floorHeight / 2, 0);
    group.add(winW);

    // Corner mullions / vertical ribs
    const colGeo = new THREE.BoxGeometry(0.18, floorHeight, 0.18);
    const offsets = [
      [-width / 2, depth / 2],
      [width / 2, depth / 2],
      [-width / 2, -depth / 2],
      [width / 2, -depth / 2],
    ];
    for (const [cx, cz] of offsets) {
      const col = new THREE.Mesh(colGeo, slabMat);
      col.position.set(cx, floorY + floorHeight / 2, cz);
      group.add(col);
    }
  }

  // Rooftop Features (Antenna Spire, Beacon, HVAC Penthouse)
  const roofTopY = 0.3 + floors * floorHeight;

  // Roof parapet
  const roofSlabGeo = new THREE.BoxGeometry(width + 0.2, 0.2, depth + 0.2);
  const roofSlab = new THREE.Mesh(roofSlabGeo, baseMat);
  roofSlab.position.y = roofTopY + 0.1;
  group.add(roofSlab);

  // HVAC Unit
  const hvacGeo = new THREE.BoxGeometry(1.0, 0.5, 0.8);
  const hvacMat = getOrCreateMaterial('hvac_metal', () =>
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.6 })
  );
  const hvac = new THREE.Mesh(hvacGeo, hvacMat);
  hvac.position.set(-0.6, roofTopY + 0.45, -0.5);
  group.add(hvac);

  // Communications Antenna Spire
  const antennaGeo = new THREE.CylinderGeometry(0.04, 0.08, 1.8, 8);
  const antennaMat = getOrCreateMaterial('antenna_metal', () =>
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 })
  );
  const antenna = new THREE.Mesh(antennaGeo, antennaMat);
  antenna.position.set(0.6, roofTopY + 1.1, 0.5);
  group.add(antenna);

  // Blinking Red Aircraft Beacon on Top of Antenna
  const beaconGeo = new THREE.SphereGeometry(0.1, 12, 12);
  const beaconMat = getOrCreateMaterial('aircraft_beacon', () =>
    new THREE.MeshStandardMaterial({
      color: 0xff0044,
      emissive: 0xff0033,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    })
  );
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.set(0.6, roofTopY + 2.05, 0.5);
  group.add(beacon);

  // Contact Shadow
  group.add(createContactShadow(2.4, 0.45));

  group.rotation.y = (tile.rotation * Math.PI) / 180;
  return group;
}

/**
 * 4. Procedural Road (Connected asphalt ribbons, lane markings, curbs)
 */
export function createRoadGroup(tile: WorldTile): THREE.Group {
  const group = new THREE.Group();
  group.name = `road_${tile.x}_${tile.z}`;

  const conn = tile.metadata?.connectedNeighbors || {
    north: false,
    south: false,
    east: false,
    west: false,
  };

  // 1. Asphalt Road Bed
  const roadGeo = new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE);
  roadGeo.rotateX(-Math.PI / 2);
  const roadMat = getOrCreateMaterial('road_asphalt', () =>
    new THREE.MeshStandardMaterial({ color: 0x1e242c, roughness: 0.88, metalness: 0.05 })
  );
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.position.y = 0.02;
  road.receiveShadow = true;
  group.add(road);

  // 2. Concrete Sidewalk Curbs on non-connected edges
  const curbMat = getOrCreateMaterial('curb_concrete', () =>
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 })
  );

  const curbHeight = 0.08;
  const curbWidth = 0.4;

  if (!conn.north) {
    const curbN = new THREE.Mesh(new THREE.BoxGeometry(CELL_SIZE, curbHeight, curbWidth), curbMat);
    curbN.position.set(0, curbHeight / 2 + 0.02, -CELL_SIZE / 2 + curbWidth / 2);
    group.add(curbN);
  }
  if (!conn.south) {
    const curbS = new THREE.Mesh(new THREE.BoxGeometry(CELL_SIZE, curbHeight, curbWidth), curbMat);
    curbS.position.set(0, curbHeight / 2 + 0.02, CELL_SIZE / 2 - curbWidth / 2);
    group.add(curbS);
  }
  if (!conn.east) {
    const curbE = new THREE.Mesh(new THREE.BoxGeometry(curbWidth, curbHeight, CELL_SIZE), curbMat);
    curbE.position.set(CELL_SIZE / 2 - curbWidth / 2, curbHeight / 2 + 0.02, 0);
    group.add(curbE);
  }
  if (!conn.west) {
    const curbW = new THREE.Mesh(new THREE.BoxGeometry(curbWidth, curbHeight, CELL_SIZE), curbMat);
    curbW.position.set(-CELL_SIZE / 2 + curbWidth / 2, curbHeight / 2 + 0.02, 0);
    group.add(curbW);
  }

  // 3. Yellow / White Lane Divider Markings (Offset Y >= 0.035 to eliminate Z-fighting)
  const lineMat = getOrCreateMaterial('road_marking_yellow', () =>
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, polygonOffset: true, polygonOffsetFactor: -1 })
  );

  // Check connection alignment
  const isVertical = conn.north || conn.south;
  const isHorizontal = conn.east || conn.west;

  if (isVertical && !isHorizontal) {
    // Straight North-South dashed line
    const dash1 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.2), lineMat);
    dash1.rotateX(-Math.PI / 2);
    dash1.position.set(0, 0.035, -1.0);
    group.add(dash1);

    const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.2), lineMat);
    dash2.rotateX(-Math.PI / 2);
    dash2.position.set(0, 0.035, 1.0);
    group.add(dash2);
  } else if (isHorizontal && !isVertical) {
    // Straight East-West dashed line
    const dash1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.12), lineMat);
    dash1.rotateX(-Math.PI / 2);
    dash1.position.set(-1.0, 0.035, 0);
    group.add(dash1);

    const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.12), lineMat);
    dash2.rotateX(-Math.PI / 2);
    dash2.position.set(1.0, 0.035, 0);
    group.add(dash2);
  } else {
    // Intersection / Corner Center Node
    const centerDot = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), lineMat);
    centerDot.rotateX(-Math.PI / 2);
    centerDot.position.set(0, 0.035, 0);
    group.add(centerDot);
  }

  return group;
}

/**
 * 5. Procedural Light (Cast-iron lamp pole, glowing lantern bulb, dynamic PointLight)
 */
export function createLightGroup(tile: WorldTile): THREE.Group {
  const group = new THREE.Group();
  group.name = `light_${tile.x}_${tile.z}`;

  const poleHeight = 2.4;

  // 1. Cast-iron Ground Base
  const baseGeo = new THREE.CylinderGeometry(0.25, 0.35, 0.25, 12);
  const ironMat = getOrCreateMaterial('lamp_cast_iron', () =>
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 })
  );
  const base = new THREE.Mesh(baseGeo, ironMat);
  base.position.y = 0.125;
  base.castShadow = true;
  group.add(base);

  // 2. Vertical Tapered Pole
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.1, poleHeight, 12);
  const pole = new THREE.Mesh(poleGeo, ironMat);
  pole.position.y = poleHeight / 2 + 0.25;
  pole.castShadow = true;
  group.add(pole);

  // 3. Ornate Curved Arm Bracket
  const armGeo = new THREE.TorusGeometry(0.35, 0.04, 8, 16, Math.PI);
  armGeo.rotateZ(-Math.PI / 2);
  const arm = new THREE.Mesh(armGeo, ironMat);
  arm.position.set(0.35, poleHeight + 0.2, 0);
  group.add(arm);

  // 4. Lantern Housing & Crown
  const lanternCapGeo = new THREE.ConeGeometry(0.32, 0.25, 6);
  const lanternCap = new THREE.Mesh(lanternCapGeo, ironMat);
  lanternCap.position.set(0.7, poleHeight + 0.45, 0);
  group.add(lanternCap);

  // 5. Glowing Bulb Core (Emissive)
  const bulbGeo = new THREE.SphereGeometry(0.18, 16, 16);
  const bulbMat = getOrCreateMaterial('lamp_bulb_glowing', () =>
    new THREE.MeshStandardMaterial({
      color: 0xfff0b3,
      emissive: 0xffbe3b,
      emissiveIntensity: 1.5,
      roughness: 0.1,
    })
  );
  const bulb = new THREE.Mesh(bulbGeo, bulbMat);
  bulb.position.set(0.7, poleHeight + 0.25, 0);
  group.add(bulb);

  // 6. Dynamic Three.js PointLight
  // Warm golden street lighting (3000K, range 16m, intensity 2.5)
  const pointLight = new THREE.PointLight(0xffbe3b, 2.8, 16, 1.8);
  pointLight.position.set(0.7, poleHeight + 0.25, 0);
  pointLight.castShadow = false; // keep fast in software renderer
  group.add(pointLight);

  // 7. Light pool reflection on ground
  const lightPoolGeo = new THREE.CircleGeometry(1.6, 24);
  lightPoolGeo.rotateX(-Math.PI / 2);
  const lightPoolMat = getOrCreateMaterial('light_pool_glow', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 190, 59, 0.35)');
    grad.addColorStop(0.5, 'rgba(255, 190, 59, 0.15)');
    grad.addColorStop(1, 'rgba(255, 190, 59, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    return new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
  });
  const lightPool = new THREE.Mesh(lightPoolGeo, lightPoolMat);
  lightPool.position.set(0.7, 0.02, 0);
  group.add(lightPool);

  // 8. Contact Shadow at base
  group.add(createContactShadow(0.6, 0.4));

  group.rotation.y = (tile.rotation * Math.PI) / 180;
  return group;
}

/**
 * 6. Procedural Vehicle (Player Car / AI Traffic Car)
 */
export function createCarGroup(colorIndex: number = 0, isPlayerCar: boolean = false): THREE.Group {
  const car = new THREE.Group();

  const carColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899];
  const bodyColor = carColors[colorIndex % carColors.length];

  // 1. Lower Chassis / Body
  const chassisGeo = new THREE.BoxGeometry(1.6, 0.35, 0.85);
  const bodyMat = getOrCreateMaterial(`car_body_${bodyColor}`, () =>
    new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.25, metalness: 0.5 })
  );
  const chassis = new THREE.Mesh(chassisGeo, bodyMat);
  chassis.position.y = 0.32;
  chassis.castShadow = true;
  car.add(chassis);

  // 2. Cabin / Windshield
  const cabinGeo = new THREE.BoxGeometry(0.85, 0.35, 0.72);
  const cabinMat = getOrCreateMaterial('car_glass', () =>
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1, metalness: 0.8 })
  );
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(-0.1, 0.62, 0);
  car.add(cabin);

  // 3. Wheels (4 wheels) - radius 0.2, pos.y 0.2 so wheels touch ground exactly at y=0.0
  const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.14, 12);
  wheelGeo.rotateX(Math.PI / 2);
  const tireMat = getOrCreateMaterial('car_tire', () =>
    new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 })
  );

  const wheelPositions = [
    [-0.5, 0.2, 0.44],
    [0.5, 0.2, 0.44],
    [-0.5, 0.2, -0.44],
    [0.5, 0.2, -0.44],
  ];
  for (const [wx, wy, wz] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.position.set(wx, wy, wz);
    car.add(wheel);
  }

  // 4. Headlights (Glowing)
  const headlightGeo = new THREE.BoxGeometry(0.06, 0.1, 0.15);
  const headlightMat = getOrCreateMaterial('car_headlight', () =>
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.5,
    })
  );
  const hlL = new THREE.Mesh(headlightGeo, headlightMat);
  hlL.position.set(0.75, 0.3, 0.25);
  car.add(hlL);

  const hlR = new THREE.Mesh(headlightGeo, headlightMat);
  hlR.position.set(0.75, 0.3, -0.25);
  car.add(hlR);

  // 5. Taillights (Red)
  const taillightMat = getOrCreateMaterial('car_taillight', () =>
    new THREE.MeshStandardMaterial({
      color: 0xff1133,
      emissive: 0xff1133,
      emissiveIntensity: 1.2,
    })
  );
  const tlL = new THREE.Mesh(headlightGeo, taillightMat);
  tlL.position.set(-0.75, 0.3, 0.25);
  car.add(tlL);

  const tlR = new THREE.Mesh(headlightGeo, taillightMat);
  tlR.position.set(-0.75, 0.3, -0.25);
  car.add(tlR);

  // 6. Spoiler if Player Car
  if (isPlayerCar) {
    const spoilerGeo = new THREE.BoxGeometry(0.15, 0.05, 0.75);
    const spoiler = new THREE.Mesh(spoilerGeo, bodyMat);
    spoiler.position.set(-0.68, 0.55, 0);
    car.add(spoiler);
  }

  // 7. Contact Shadow
  car.add(createContactShadow(0.9, 0.4));

  return car;
}
