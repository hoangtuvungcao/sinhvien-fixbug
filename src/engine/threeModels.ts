import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EnemyArchetype, PowerUpType } from '../types/game';
import { KenneyPack, instantiateKenneyModel } from './kenneyAssets';

export const ARENA_HALF_SIZE = 70;

export interface ArenaObstacle {
  x: number;
  z: number;
  radius: number;
}

export interface SharedVisualAssets {
  glyphSemicolon: THREE.CanvasTexture;
  glyphInfinity: THREE.CanvasTexture;
  glyph404: THREE.CanvasTexture;
  glyphGit: THREE.CanvasTexture;
  clockDialTex: THREE.CanvasTexture;
  unitPlaneGeo: THREE.PlaneGeometry;
  shadowMat: THREE.MeshBasicMaterial;
  crystalGemMatGold: THREE.MeshStandardMaterial;
  crystalGemMatCyan: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export interface HeroVisualRefs {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  mixer?: THREE.AnimationMixer;
  idleAction?: THREE.AnimationAction;
  runAction?: THREE.AnimationAction;
  shootAction?: THREE.AnimationAction;
  leftLeg?: THREE.Group;
  rightLeg?: THREE.Group;
  leftArm?: THREE.Group;
  rightArm?: THREE.Group;
  scarf: THREE.Object3D;
  tassel: THREE.Mesh;
  leftBlaster: THREE.Group;
  rightBlaster: THREE.Group;
  muzzleLeft: THREE.Group;
  muzzleRight: THREE.Group;
  thrusterLeft: THREE.Mesh;
  thrusterRight: THREE.Mesh;
  heroLight: THREE.PointLight;
  ultReadyHalo: THREE.Mesh;
  shieldGroup: THREE.Group;
  shieldMeshes: THREE.Mesh[];
  auraGroup: THREE.Group;
  auraRing: THREE.Mesh;
  auraPetals: THREE.Group;
}

export interface HitFlashMaterial {
  mat: THREE.MeshStandardMaterial | THREE.MeshToonMaterial;
  baseEmissive: number;
  baseIntensity: number;
}

export interface BossVisualRefs {
  mixer?: THREE.AnimationMixer;
  walkAction?: THREE.AnimationAction;
  outerRing?: THREE.Object3D;
  innerRing?: THREE.Object3D;
  hourHand?: THREE.Object3D;
  minuteHand?: THREE.Object3D;
  coreMesh?: THREE.Mesh;
  orbitGroup?: THREE.Group;
  limbs?: THREE.Object3D[];
  bodyGroup?: THREE.Object3D;
  hitMaterials: HitFlashMaterial[];
}

export function disposeObject3D(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (
      mesh.geometry &&
      !mesh.geometry.userData?.sharedKenneyGeo &&
      !mesh.geometry.userData?.sharedGeo
    ) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (m && !m.userData?.sharedKenneyMat && !m.userData?.sharedMat) {
          m.dispose();
        }
      }
    }
  });
}

function createSkyDomeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep cyber night sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#020617');
  grad.addColorStop(0.35, '#060d1f');
  grad.addColorStop(0.65, '#0b152d');
  grad.addColorStop(0.85, '#111827');
  grad.addColorStop(1, '#090e1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle Golden Dã Quỳ Aurora / Dawn Glow along horizon
  const horizonGlow = ctx.createRadialGradient(512, 380, 20, 512, 380, 480);
  horizonGlow.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
  horizonGlow.addColorStop(0.35, 'rgba(14, 165, 233, 0.12)');
  horizonGlow.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = horizonGlow;
  ctx.fillRect(0, 0, 1024, 512);

  // Distant Cyber Constellations / Highland Stars
  for (let i = 0; i < 90; i++) {
    const cx = (i * 197 + 43) % 1024;
    const cy = 20 + ((i * 53) % 260);
    const r = i % 4 === 0 ? 1.6 : 0.9;
    const isGold = i % 5 === 0;
    ctx.fillStyle = isGold ? 'rgba(253, 224, 71, 0.85)' : 'rgba(186, 230, 253, 0.75)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Highland Mountain Silhouettes at distant base
  ctx.fillStyle = '#070c18';
  ctx.beginPath();
  ctx.moveTo(0, 512);
  const peaks = [420, 385, 405, 365, 395, 375, 410, 368, 398, 380, 412, 388, 420];
  for (let i = 0; i < peaks.length; i++) {
    const px = (i / (peaks.length - 1)) * 1024;
    ctx.lineTo(px, peaks[i]);
  }
  ctx.lineTo(1024, 512);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCyberGroundTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Deep dark cyber-slate base (eliminates white-out fog glare)
  ctx.fillStyle = '#0b1120';
  ctx.fillRect(0, 0, size, size);

  const tile = 256;
  for (let gx = 0; gx < size; gx += tile) {
    for (let gy = 0; gy < size; gy += tile) {
      // Sleek beveled panel with subtle cyber depth
      const g = ctx.createLinearGradient(gx, gy, gx + tile, gy + tile);
      g.addColorStop(0, '#0f172a');
      g.addColorStop(0.5, '#0d1527');
      g.addColorStop(1, '#080d1a');
      ctx.fillStyle = g;
      ctx.fillRect(gx + 4, gy + 4, tile - 8, tile - 8);

      // Inner tech groove accent
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.18)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(gx + 16, gy + 16, tile - 32, tile - 32);

      // Cyber micro-circuit corner marks
      ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.fillRect(gx + 18, gy + 18, 6, 2);
      ctx.fillRect(gx + 18, gy + 18, 2, 6);
      ctx.fillRect(gx + tile - 24, gy + 18, 6, 2);
      ctx.fillRect(gx + tile - 20, gy + 18, 2, 6);
    }
  }

  // Major neon grid lines (Cyan & Amber)
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i <= size; i += tile) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  // Sub-grid lines (Subtle slate)
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
  ctx.lineWidth = 1.2;
  for (let i = 128; i < size; i += tile) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  // Golden Dã Quỳ junction nodes at intersections
  for (let x = 0; x <= size; x += tile) {
    for (let y = 0; y <= size; y += tile) {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.85)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x + tile / 2, y + tile / 2, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.7)';
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(34, 34);
  tex.anisotropy = maxAniso;
  return tex;
}

function createGlyphBadgeTexture(
  glyph: string,
  bgColor: string,
  fgColor: string,
  maxAniso: number,
): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = fgColor;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = fgColor;
  ctx.font =
    glyph.length >= 3
      ? '800 36px "JetBrains Mono", monospace'
      : '800 48px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, 64, 66);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createClockDialTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#180611';
  ctx.fillRect(0, 0, size, size);

  ctx.translate(size / 2, size / 2);
  ctx.strokeStyle = '#e11d48';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(0, 0, 114, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 4;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 86, Math.sin(a) * 86);
    ctx.lineTo(Math.cos(a) * 108, Math.sin(a) * 108);
    ctx.stroke();
  }

  ctx.fillStyle = '#fecdd3';
  ctx.font = '800 44px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('23:59', 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  g.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  g.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSharedVisualAssets(
  contactShadowTex: THREE.CanvasTexture,
  maxAniso: number,
): SharedVisualAssets {
  const glyphSemicolon = createGlyphBadgeTexture(';', '#1f0812', '#eab308', maxAniso);
  const glyphInfinity = createGlyphBadgeTexture('∞', '#150d26', '#22d3ee', maxAniso);
  const glyph404 = createGlyphBadgeTexture('404', '#260814', '#fecdd3', maxAniso);
  const glyphGit = createGlyphBadgeTexture('GIT', '#231107', '#fdba74', maxAniso);
  const clockDialTex = createClockDialTexture(maxAniso);

  const unitPlaneGeo = new THREE.PlaneGeometry(1, 1);
  unitPlaneGeo.userData.sharedGeo = true;

  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.68,
  });
  shadowMat.userData.sharedMat = true;

  const crystalGemMatGold = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    emissive: 0xd97706,
    emissiveIntensity: 0.62,
    roughness: 0.25,
  });
  crystalGemMatGold.userData.sharedMat = true;

  const crystalGemMatCyan = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: 0x0284c7,
    emissiveIntensity: 0.58,
    roughness: 0.25,
  });
  crystalGemMatCyan.userData.sharedMat = true;

  return {
    glyphSemicolon,
    glyphInfinity,
    glyph404,
    glyphGit,
    clockDialTex,
    unitPlaneGeo,
    shadowMat,
    crystalGemMatGold,
    crystalGemMatCyan,
    dispose: () => {
      glyphSemicolon.dispose();
      glyphInfinity.dispose();
      glyph404.dispose();
      glyphGit.dispose();
      clockDialTex.dispose();
      unitPlaneGeo.dispose();
      shadowMat.dispose();
      crystalGemMatGold.dispose();
      crystalGemMatCyan.dispose();
    },
  };
}

export function createArenaEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean,
  kenney?: KenneyPack | null,
): {
  contactShadowTex: THREE.CanvasTexture;
  perimeterRing: THREE.Mesh;
  scanRing: THREE.Mesh;
  centerSeal: THREE.Group;
  cornerCrystals: THREE.Object3D[];
  holoPlanets: THREE.Object3D[];
  beaconPads: THREE.Mesh[];
  beacons: ArenaObstacle[];
  fireflies: THREE.Points;
  aimReticle: THREE.Group;
  targetLockReticle: THREE.Group;
  obstacles: ArenaObstacle[];
} {
  scene.background = new THREE.Color(0x0a0f1d);
  // Linear fog: starts at 55 units, fades to 170. Zero fog in combat area!
  scene.fog = new THREE.Fog(0x0a0f1d, 55, 170);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const skyTex = createSkyDomeTexture();
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(240, 32, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }),
  );
  scene.add(skyDome);

  // High-contrast Cyberpunk 3-point lighting
  const hemi = new THREE.HemisphereLight(0x38bdf8, 0x1e1b4b, 0.85);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.45);
  keyLight.position.set(34, 58, 30);
  if (!isSoftwareGl) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 165;
    const d = 66;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0006;
    keyLight.shadow.normalBias = 0.025;
  }
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xf59e0b, 0.75);
  rimLight.position.set(-40, 26, -38);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0x0284c7, 0.45);
  fillLight.position.set(-28, 22, 36);
  scene.add(fillLight);

  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  // Vast 140x140 Cyberpunk Neon Courtyard
  const groundTex = createCyberGroundTexture(maxAniso);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(380, 380),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.65, metalness: 0.15 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = !isSoftwareGl;
  scene.add(ground);

  // Raised Cyber Arena Platform Border Frame
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.45,
    roughness: 0.4,
  });
  const neonEdgeMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  const borderSides = [
    { x: 0, z: -ARENA_HALF_SIZE - 0.8, w: ARENA_HALF_SIZE * 2 + 2.4, d: 1.5 },
    { x: 0, z: ARENA_HALF_SIZE + 0.8, w: ARENA_HALF_SIZE * 2 + 2.4, d: 1.5 },
    { x: -ARENA_HALF_SIZE - 0.8, z: 0, w: 1.5, d: ARENA_HALF_SIZE * 2 + 2.4 },
    { x: ARENA_HALF_SIZE + 0.8, z: 0, w: 1.5, d: ARENA_HALF_SIZE * 2 + 2.4 },
  ];
  for (const s of borderSides) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(s.w, 0.85, s.d), wallMat);
    curb.position.set(s.x, 0.42, s.z);
    scene.add(curb);

    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(s.w > s.d ? s.w - 0.8 : 0.16, 0.14, s.d > s.w ? s.d - 0.8 : 0.16),
      neonEdgeMat,
    );
    strip.position.set(s.x, 0.9, s.z);
    scene.add(strip);
  }

  // Center ĐHTN Stage Pedestal & Court Seal
  const stageDais = new THREE.Mesh(
    new THREE.CylinderGeometry(7.2, 7.9, 0.12, 8),
    new THREE.MeshStandardMaterial({
      color: 0x111827,
      emissive: 0x0369a1,
      emissiveIntensity: 0.24,
      metalness: 0.55,
      roughness: 0.42,
    }),
  );
  stageDais.position.y = 0.05;
  stageDais.receiveShadow = !isSoftwareGl;
  scene.add(stageDais);

  const centerSeal = new THREE.Group();
  centerSeal.position.y = 0.12;
  const ring1 = new THREE.Mesh(
    new THREE.RingGeometry(7.3, 7.65, 48),
    new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring1.rotation.x = -Math.PI / 2;
  centerSeal.add(ring1);

  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(4.2, 4.48, 8),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = 0.01;
  centerSeal.add(ring2);
  scene.add(centerSeal);

  const scanRing = new THREE.Mesh(
    new THREE.RingGeometry(0.96, 1.0, 48),
    new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  scanRing.rotation.x = -Math.PI / 2;
  scanRing.position.y = 0.04;
  scene.add(scanRing);

  const perimeterRing = new THREE.Mesh(
    new THREE.RingGeometry(ARENA_HALF_SIZE * 1.18, ARENA_HALF_SIZE * 1.2, 72),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  perimeterRing.rotation.x = -Math.PI / 2;
  perimeterRing.position.y = 0.035;
  scene.add(perimeterRing);

  // Diagonal Golden Conduit Lanes connecting Center Stage to the 4 Holo-Tables (±28, ±28)
  const laneGeo = new THREE.PlaneGeometry(0.42, 34);
  const laneMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (const ang of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
    const lane = new THREE.Mesh(laneGeo, laneMat);
    lane.rotation.x = -Math.PI / 2;
    lane.rotation.z = -ang;
    lane.position.set(Math.sin(ang) * 18.5, 0.03, Math.cos(ang) * 18.5);
    scene.add(lane);
  }

  const obstacles: ArenaObstacle[] = [];
  const beacons: ArenaObstacle[] = [];
  const holoPlanets: THREE.Object3D[] = [];
  const beaconPads: THREE.Mesh[] = [];

  // 4 Interactive "Điểm Ký Ức Tri Ân 20/11" Holo-Tables (±28, ±28) with Dais, Columns & Flower Planters
  const holoCoords: Array<[number, number]> = [
    [-28, -28],
    [28, -28],
    [-28, 28],
    [28, 28],
  ];
  for (const [hx, hz] of holoCoords) {
    const dais = new THREE.Mesh(
      new THREE.CylinderGeometry(2.35, 2.75, 0.18, 8),
      new THREE.MeshStandardMaterial({
        color: 0x11182b,
        emissive: 0x0e7490,
        emissiveIntensity: 0.24,
        metalness: 0.72,
        roughness: 0.34,
      }),
    );
    dais.position.set(hx, 0.09, hz);
    dais.receiveShadow = !isSoftwareGl;
    scene.add(dais);

    const pad = new THREE.Mesh(
      new THREE.RingGeometry(2.75, 3.3, 28),
      new THREE.MeshBasicMaterial({
        color: 0xeab308,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(hx, 0.05, hz);
    scene.add(pad);
    beaconPads.push(pad);

    if (kenney?.holoTable) {
      const table = instantiateKenneyModel(kenney.holoTable, 3.1, {
        fitBy: 'maxDim',
        emissiveHex: 0x06b6d4,
        emissiveIntensity: 0.18,
      });
      table.position.set(hx, 0.18, hz);
      scene.add(table);
      holoPlanets.push(table);
    }

    if (kenney?.trophy) {
      const trophy = instantiateKenneyModel(kenney.trophy, 1.35, {
        fitBy: 'height',
        shareMaterial: true,
        castShadow: false,
      });
      trophy.position.set(hx, 1.55, hz);
      scene.add(trophy);
      holoPlanets.push(trophy);
    }

    const flSrc = kenney?.flowerA ?? kenney?.flowerB;
    if (flSrc) {
      for (const [ox, oz] of [
        [1.75, 1.75],
        [-1.75, -1.75],
      ]) {
        const fl = instantiateKenneyModel(flSrc, 0.95, {
          fitBy: 'height',
          tintHex: 0xfacc15,
          tintAmount: 0.35,
          emissiveHex: 0xd97706,
          emissiveIntensity: 0.22,
          castShadow: false,
          shareMaterial: true,
        });
        fl.position.set(hx + ox, 0.1, hz + oz);
        scene.add(fl);
      }
    }

    const beaconObs = { x: hx, z: hz, radius: 2.25 };
    beacons.push(beaconObs);
    obstacles.push(beaconObs);
  }

  // 4 Mid-Arena Tactical Cyber-Lab Server Clusters (±46, 0) and (0, ±46)
  const midLabClusters = [
    { x: 0, z: -46, ry: 0 },
    { x: 0, z: 46, ry: Math.PI },
    { x: -46, z: 0, ry: Math.PI / 2 },
    { x: 46, z: 0, ry: -Math.PI / 2 },
  ];
  for (const cl of midLabClusters) {
    const clusterGroup = new THREE.Group();
    clusterGroup.position.set(cl.x, 0, cl.z);
    clusterGroup.rotation.y = cl.ry;

    const basePad = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.95, 0.2, 6),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0x0369a1,
        emissiveIntensity: 0.2,
        metalness: 0.75,
        roughness: 0.32,
      }),
    );
    basePad.position.y = 0.1;
    clusterGroup.add(basePad);

    if (kenney?.computerWide) {
      const comp = instantiateKenneyModel(kenney.computerWide, 3.2, {
        fitBy: 'maxDim',
        shareMaterial: true,
      });
      comp.position.set(0, 0.2, 0.35);
      clusterGroup.add(comp);
    }
    if (kenney?.displayWall) {
      const wall = instantiateKenneyModel(kenney.displayWall, 3.3, {
        fitBy: 'maxDim',
        shareMaterial: true,
      });
      wall.position.set(0, 0.2, -1.15);
      clusterGroup.add(wall);
    }
    if (kenney?.barrier) {
      const bar = instantiateKenneyModel(kenney.barrier, 2.4, {
        fitBy: 'maxDim',
        shareMaterial: true,
      });
      bar.position.set(0, 0.2, 1.55);
      clusterGroup.add(bar);
    }
    if (kenney?.column) {
      for (const sx of [-2.1, 2.1]) {
        const col = instantiateKenneyModel(kenney.column, 3.6, {
          fitBy: 'height',
          shareMaterial: true,
        });
        col.position.set(sx, 0.15, -0.4);
        clusterGroup.add(col);
      }
    }
    scene.add(clusterGroup);
    obstacles.push({ x: cl.x, z: cl.z, radius: 2.55 });
  }

  // 4 Outer Tactical Highland Barricade Outposts (±48, ±22) / (±22, ±48) for cover across 140x140 arena
  const outposts = [
    { x: -48, z: -22, ry: 0.4 },
    { x: 48, z: 22, ry: -0.4 },
    { x: -22, z: 48, ry: 1.1 },
    { x: 22, z: -48, ry: -1.1 },
  ];
  for (const op of outposts) {
    const g = new THREE.Group();
    g.position.set(op.x, 0, op.z);
    g.rotation.y = op.ry;
    if (kenney?.rockLarge) {
      const rock = instantiateKenneyModel(kenney.rockLarge, 3.1, {
        fitBy: 'maxDim',
        shareMaterial: true,
      });
      rock.position.set(-0.6, 0, -0.4);
      g.add(rock);
    }
    if (kenney?.barrier) {
      const bar = instantiateKenneyModel(kenney.barrier, 2.5, {
        fitBy: 'maxDim',
        shareMaterial: true,
      });
      bar.position.set(0.8, 0, 0.7);
      g.add(bar);
    }
    scene.add(g);
    obstacles.push({ x: op.x, z: op.z, radius: 2.15 });
  }

  // Kenney Sci-Fi Computer Lab Booths & Display Walls framing the 4 cardinal edges of the 140x140 Arena
  const labEdgeStations = [
    { x: -18, z: -ARENA_HALF_SIZE + 2.2, ry: 0, kind: 'compSys' },
    { x: 18, z: -ARENA_HALF_SIZE + 2.2, ry: 0, kind: 'compWide' },
    { x: 0, z: -ARENA_HALF_SIZE + 2.0, ry: 0, kind: 'display' },
    { x: -18, z: ARENA_HALF_SIZE - 2.2, ry: Math.PI, kind: 'compWide' },
    { x: 18, z: ARENA_HALF_SIZE - 2.2, ry: Math.PI, kind: 'compSys' },
    { x: 0, z: ARENA_HALF_SIZE - 2.0, ry: Math.PI, kind: 'display' },
    { x: -ARENA_HALF_SIZE + 2.2, z: -18, ry: Math.PI / 2, kind: 'compSys' },
    { x: -ARENA_HALF_SIZE + 2.2, z: 18, ry: Math.PI / 2, kind: 'display' },
    { x: ARENA_HALF_SIZE - 2.2, z: -18, ry: -Math.PI / 2, kind: 'display' },
    { x: ARENA_HALF_SIZE - 2.2, z: 18, ry: -Math.PI / 2, kind: 'compWide' },
  ];
  for (const st of labEdgeStations) {
    const src =
      st.kind === 'compSys'
        ? kenney?.computerSystem
        : st.kind === 'compWide'
          ? kenney?.computerWide
          : kenney?.displayWall;
    if (src) {
      const m = instantiateKenneyModel(src, st.kind === 'display' ? 3.9 : 2.9, {
        fitBy: 'maxDim',
        shareMaterial: true,
        castShadow: false,
      });
      m.position.set(st.x, 0, st.z);
      m.rotation.y = st.ry;
      scene.add(m);
    }
  }

  // Kenney Space Station Barriers along outer perimeter segments
  if (kenney?.barrier) {
    const barrierSpots = [
      [-40, -ARENA_HALF_SIZE + 1.5, 0],
      [40, -ARENA_HALF_SIZE + 1.5, 0],
      [-40, ARENA_HALF_SIZE - 1.5, Math.PI],
      [40, ARENA_HALF_SIZE - 1.5, Math.PI],
      [-ARENA_HALF_SIZE + 1.5, -40, Math.PI / 2],
      [-ARENA_HALF_SIZE + 1.5, 40, Math.PI / 2],
      [ARENA_HALF_SIZE - 1.5, -40, -Math.PI / 2],
      [ARENA_HALF_SIZE - 1.5, 40, -Math.PI / 2],
    ];
    for (const [bx, bz, ry] of barrierSpots) {
      const bar = instantiateKenneyModel(kenney.barrier, 2.8, {
        fitBy: 'maxDim',
        shareMaterial: true,
        castShadow: false,
      });
      bar.position.set(bx, 0, bz);
      bar.rotation.y = ry;
      scene.add(bar);
    }
  }

  // 4 Tall Corner Cyber Campus Pylons with Levitating Kenney Dã Quỳ Crystals
  const cornerCrystals: THREE.Object3D[] = [];
  const pylonCoords = [
    [-ARENA_HALF_SIZE - 1.8, -ARENA_HALF_SIZE - 1.8],
    [ARENA_HALF_SIZE + 1.8, -ARENA_HALF_SIZE - 1.8],
    [-ARENA_HALF_SIZE - 1.8, ARENA_HALF_SIZE + 1.8],
    [ARENA_HALF_SIZE + 1.8, ARENA_HALF_SIZE + 1.8],
  ];
  for (const [px, pz] of pylonCoords) {
    const pylon = new THREE.Group();
    pylon.position.set(px, 0, pz);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 2.1, 1.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.72, roughness: 0.34 }),
    );
    base.position.y = 0.8;
    pylon.add(base);

    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 1.15, 7.0, 6),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0x0369a1,
        emissiveIntensity: 0.35,
        metalness: 0.8,
        roughness: 0.28,
      }),
    );
    spire.position.y = 4.3;
    pylon.add(spire);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.09, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x0891b2 }),
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 7.2;
    pylon.add(halo);

    let crystalObj: THREE.Object3D;
    if (kenney?.crystal) {
      crystalObj = instantiateKenneyModel(kenney.crystal, 2.7, {
        fitBy: 'height',
        tintHex: 0xfacc15,
        tintAmount: 0.35,
        emissiveHex: 0xd97706,
        emissiveIntensity: 0.55,
        castShadow: false,
      });
    } else {
      crystalObj = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.9, 0),
        new THREE.MeshStandardMaterial({
          color: 0xeab308,
          emissive: 0xd97706,
          emissiveIntensity: 0.65,
        }),
      );
    }
    crystalObj.position.y = 8.4;
    pylon.add(crystalObj);
    cornerCrystals.push(crystalObj);

    scene.add(pylon);
  }

  // Surrounding ĐHTN Cyber Campus Skyline (Kenney City Buildings + Highland Pine Forest & Basalt Cliffs)
  const perimeterCount = 72;
  for (let i = 0; i < perimeterCount; i++) {
    const a = (i / perimeterCount) * Math.PI * 2 + (i % 3) * 0.03;
    const dist = ARENA_HALF_SIZE + 5.8 + (i % 5) * 4.8;
    const nx = Math.cos(a) * dist;
    const nz = Math.sin(a) * dist;

    if (i % 5 === 0 && (kenney?.buildingA || kenney?.buildingB)) {
      const bSrc = i % 10 === 0 ? kenney.buildingA ?? kenney.buildingB : kenney.buildingB ?? kenney.buildingA;
      if (bSrc) {
        const bldg = instantiateKenneyModel(bSrc, 11 + (i % 3) * 3.5, {
          fitBy: 'height',
          shareMaterial: true,
          castShadow: false,
        });
        bldg.position.set(nx, 0, nz);
        bldg.rotation.y = -a + Math.PI / 2;
        scene.add(bldg);
      }
    } else if (i % 2 === 0 && kenney?.treePine) {
      const tree = instantiateKenneyModel(kenney.treePine, 7.2 + (i % 3) * 1.6, {
        fitBy: 'height',
        shareMaterial: true,
        castShadow: false,
      });
      tree.position.set(nx, 0, nz);
      tree.rotation.y = a;
      scene.add(tree);
    } else if (kenney?.rockTall && i % 4 === 1) {
      const rock = instantiateKenneyModel(kenney.rockTall, 5.2 + (i % 3), {
        fitBy: 'height',
        shareMaterial: true,
        castShadow: false,
      });
      rock.position.set(nx, 0, nz);
      rock.rotation.y = a;
      scene.add(rock);
    } else if (kenney?.rockLarge) {
      const rock = instantiateKenneyModel(kenney.rockLarge, 3.4 + (i % 2), {
        fitBy: 'maxDim',
        shareMaterial: true,
        castShadow: false,
      });
      rock.position.set(nx, 0, nz);
      rock.rotation.y = a;
      scene.add(rock);
    }
  }

  // Sculpted Kenney Yellow Wildflowers (Hoa Dã Quỳ) ringing the Arena Perimeter
  if (kenney?.flowerA || kenney?.flowerB) {
    for (let i = 0; i < 84; i++) {
      const a = (i / 84) * Math.PI * 2;
      const dist = ARENA_HALF_SIZE + 2.3 + (i % 3) * 1.3;
      const src = i % 2 === 0 ? kenney.flowerA ?? kenney.flowerB : kenney.flowerB ?? kenney.flowerA;
      if (!src) continue;
      const fl = instantiateKenneyModel(src, 1.5 + (i % 3) * 0.25, {
        fitBy: 'height',
        tintHex: 0xfacc15,
        tintAmount: 0.3,
        emissiveHex: 0xd97706,
        emissiveIntensity: 0.2,
        shareMaterial: true,
        castShadow: false,
      });
      fl.position.set(Math.cos(a) * dist, 0, Math.sin(a) * dist);
      fl.rotation.y = a;
      scene.add(fl);
    }
  }

  // Subtle Floating Golden Fireflies across the 140x140 Arena (non-glaring opacity)
  const fireflyCount = 240;
  const fPositions = new Float32Array(fireflyCount * 3);
  const fColors = new Float32Array(fireflyCount * 3);
  for (let i = 0; i < fireflyCount; i++) {
    fPositions[i * 3] = (Math.random() - 0.5) * 155;
    fPositions[i * 3 + 1] = 0.8 + Math.random() * 14;
    fPositions[i * 3 + 2] = (Math.random() - 0.5) * 155;
    const isGold = i % 3 !== 0;
    fColors[i * 3] = isGold ? 0.92 : 0.06;
    fColors[i * 3 + 1] = isGold ? 0.74 : 0.65;
    fColors[i * 3 + 2] = isGold ? 0.12 : 0.82;
  }
  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute('position', new THREE.BufferAttribute(fPositions, 3));
  fGeo.setAttribute('color', new THREE.BufferAttribute(fColors, 3));
  const fireflies = new THREE.Points(
    fGeo,
    new THREE.PointsMaterial({
      size: 0.34,
      vertexColors: true,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    }),
  );
  scene.add(fireflies);

  // Ground Targeting Aim Reticle (Cursor Aim)
  const aimReticle = new THREE.Group();
  const rOuter = new THREE.Mesh(
    new THREE.RingGeometry(0.68, 0.86, 24),
    new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  rOuter.rotation.x = -Math.PI / 2;
  rOuter.position.y = 0.07;
  aimReticle.add(rOuter);

  const rInner = new THREE.Mesh(
    new THREE.RingGeometry(0.24, 0.34, 4),
    new THREE.MeshBasicMaterial({
      color: 0xeab308,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  rInner.rotation.x = -Math.PI / 2;
  rInner.position.y = 0.08;
  aimReticle.add(rInner);
  scene.add(aimReticle);

  // Auto-Aim Target Lock Ring beneath targeted enemy
  const targetLockReticle = new THREE.Group();
  const tlOuter = new THREE.Mesh(
    new THREE.RingGeometry(1.05, 1.24, 6),
    new THREE.MeshBasicMaterial({
      color: 0xeab308,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  tlOuter.rotation.x = -Math.PI / 2;
  tlOuter.position.y = 0.07;
  targetLockReticle.add(tlOuter);
  targetLockReticle.visible = false;
  scene.add(targetLockReticle);

  return {
    contactShadowTex: createContactShadowTexture(),
    perimeterRing,
    scanRing,
    centerSeal,
    cornerCrystals,
    holoPlanets,
    beaconPads,
    beacons,
    fireflies,
    aimReticle,
    targetLockReticle,
    obstacles,
  };
}

function createStarburstMuzzle(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.18), mat);
  const p2 = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.18), mat);
  p2.rotation.z = Math.PI / 2;
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xfef08a }),
  );
  g.add(p1, p2, core);
  g.visible = false;
  return g;
}

export function createStudentHeroMesh(
  contactShadowTex: THREE.CanvasTexture,
  kenney?: KenneyPack | null,
): HeroVisualRefs {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 2.8),
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  root.add(shadow);

  // Calibrated Hero PointLight (highlights nearby floor & bugs without glaring out colors)
  const heroLight = new THREE.PointLight(0x38bdf8, 1.45, 14, 1.5);
  heroLight.position.set(0, 2.5, 0.4);
  root.add(heroLight);

  let mixer: THREE.AnimationMixer | undefined;
  let idleAction: THREE.AnimationAction | undefined;
  let runAction: THREE.AnimationAction | undefined;
  let shootAction: THREE.AnimationAction | undefined;
  let leftLeg: THREE.Group | undefined;
  let rightLeg: THREE.Group | undefined;
  let leftArm: THREE.Group | undefined;
  let rightArm: THREE.Group | undefined;

  // Wibu Cyber-Shoujo Heroine: Kenney character-female-b (blonde anime twin-buns) + Toon Cel-Shading & Ink Outline
  const heroModelSrc = kenney?.heroFemale ?? kenney?.heroScene;
  const heroClips =
    kenney?.heroFemale && kenney.heroFemaleAnimations.length > 0
      ? kenney.heroFemaleAnimations
      : (kenney?.heroAnimations ?? []);

  if (heroModelSrc) {
    const kenneyHero = instantiateKenneyModel(heroModelSrc, 2.35, {
      skinned: true,
      fitBy: 'height',
      toon: true,
      outlineColor: 0x0b1026,
      outlineWorldThickness: 0.044,
      emissiveHex: 0x0369a1,
      emissiveIntensity: 0.08,
    });
    bodyPivot.add(kenneyHero);

    if (heroClips.length > 0) {
      mixer = new THREE.AnimationMixer(kenneyHero);
      const findClip = (name: string) => heroClips.find((c) => c.name === name);
      const idleClip = findClip('idle') ?? heroClips[0];
      const runClip = findClip('sprint') ?? findClip('walk');
      const shootClip = findClip('holding-both-shoot') ?? findClip('holding-both');

      if (idleClip) {
        idleAction = mixer.clipAction(idleClip);
        idleAction.play();
      }
      if (runClip) {
        runAction = mixer.clipAction(runClip);
      }
      if (shootClip) {
        shootAction = mixer.clipAction(shootClip);
      }
    }
  } else {
    const makeLeg = (xOff: number) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(xOff, 0.56, 0);
      const thigh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.13, 0.24, 6, 8),
        new THREE.MeshToonMaterial({ color: 0x1e293b }),
      );
      thigh.position.y = -0.18;
      legGroup.add(thigh);
      const boot = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.22, 0.42),
        new THREE.MeshToonMaterial({ color: 0x0f172a }),
      );
      boot.position.set(0, -0.44, 0.06);
      legGroup.add(boot);
      return legGroup;
    };
    leftLeg = makeLeg(-0.22);
    rightLeg = makeLeg(0.22);
    bodyPivot.add(leftLeg);
    bodyPivot.add(rightLeg);

    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.5, 0.88, 8),
      new THREE.MeshToonMaterial({ color: 0x111827 }),
    );
    torso.position.y = 1.02;
    bodyPivot.add(torso);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 16, 14),
      new THREE.MeshToonMaterial({ color: 0xf1f5f9 }),
    );
    head.position.y = 1.72;
    bodyPivot.add(head);
  }

  // Cyber Neko-Ear Headphones (Signature Wibu Anime Silhouette framing the twin-buns)
  const headsetGroup = new THREE.Group();
  headsetGroup.position.set(0, 2.02, 0.02);
  const headband = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.055, 8, 20, Math.PI),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x0891b2,
      emissiveIntensity: 0.35,
      metalness: 0.72,
      roughness: 0.28,
    }),
  );
  headsetGroup.add(headband);

  const nekoEarMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.62,
    roughness: 0.25,
  });
  const nekoInnerMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xd97706,
    emissiveIntensity: 0.55,
  });
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 4), nekoEarMat);
    ear.position.set(side * 0.44, 0.44, 0.04);
    ear.rotation.z = -side * 0.42;
    ear.rotation.y = Math.PI / 4;
    headsetGroup.add(ear);

    const earInner = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 4), nekoInnerMat);
    earInner.position.set(side * 0.44, 0.43, 0.08);
    earInner.rotation.z = -side * 0.42;
    earInner.rotation.y = Math.PI / 4;
    headsetGroup.add(earInner);
  }
  bodyPivot.add(headsetGroup);

  // Jaunty Side-Mounted ĐHTN Mini Graduation Cap + Golden Tassel
  const capBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.05, 0.56),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x1e293b,
      emissiveIntensity: 0.15,
      roughness: 0.35,
      metalness: 0.65,
    }),
  );
  capBoard.position.set(-0.22, 2.48, -0.02);
  capBoard.rotation.set(-0.08, Math.PI / 4, 0.22);
  bodyPivot.add(capBoard);

  const tassel = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.34, 6),
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.55,
    }),
  );
  tassel.position.set(-0.48, 2.34, 0.1);
  bodyPivot.add(tassel);

  // Flowing Golden-Cyan Anime Twin-Ribbon Scarf
  const scarf = new THREE.Group();
  const ribbonMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xd97706,
    emissiveIntensity: 0.4,
    roughness: 0.35,
  });
  const ribbonTrimMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.45,
    roughness: 0.35,
  });
  const scarfMain = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 1.05), ribbonMat);
  scarfMain.position.set(-0.14, 0, -0.35);
  scarfMain.rotation.y = 0.18;
  scarf.add(scarfMain);
  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.96), ribbonTrimMat);
  scarfTail.position.set(0.16, -0.04, -0.32);
  scarfTail.rotation.y = -0.22;
  scarf.add(scarfTail);
  scarf.position.set(0, 1.48, -0.34);
  bodyPivot.add(scarf);

  // Cyber-Deck Backpack + Dã Quỳ Katana (Kenney weapon-sword.glb) + Twin Cyan Thrusters
  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.62, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.38, metalness: 0.7 }),
  );
  backpack.position.set(0, 1.15, -0.38);
  backpack.castShadow = true;
  bodyPivot.add(backpack);

  const packRgb = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.1, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.65,
    }),
  );
  packRgb.position.set(0, 1.3, -0.52);
  bodyPivot.add(packRgb);

  if (kenney?.weaponSword) {
    const katana = instantiateKenneyModel(kenney.weaponSword, 1.85, {
      fitBy: 'height',
      toon: true,
      outlineColor: 0x1e1b4b,
      outlineWorldThickness: 0.032,
      tintHex: 0xfacc15,
      tintAmount: 0.32,
      emissiveHex: 0xd97706,
      emissiveIntensity: 0.32,
      castShadow: false,
    });
    katana.position.set(0.28, 0.98, -0.56);
    katana.rotation.set(0.15, 0.12, -0.58);
    bodyPivot.add(katana);
  }

  const thrusterMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.85,
    roughness: 0.25,
  });
  const thrusterLeft = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.44, 8), thrusterMat);
  thrusterLeft.rotation.x = Math.PI;
  thrusterLeft.position.set(-0.16, 0.66, -0.44);
  bodyPivot.add(thrusterLeft);

  const thrusterRight = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.44, 8), thrusterMat);
  thrusterRight.rotation.x = Math.PI;
  thrusterRight.position.set(0.16, 0.66, -0.44);
  bodyPivot.add(thrusterRight);

  // Dual Kenney Blaster-Repeaters with Anime Toon Shading + Outlines
  const makeBlaster = (side: -1 | 1) => {
    const blaster = new THREE.Group();
    blaster.position.set(side * 0.58, 1.15, 0.38);

    const gunSrc = kenney?.blasterRepeater ?? kenney?.blaster;
    if (gunSrc) {
      const gun = instantiateKenneyModel(gunSrc, 0.98, {
        fitBy: 'maxDim',
        toon: true,
        outlineColor: 0x082f49,
        outlineWorldThickness: 0.028,
        emissiveHex: 0x0891b2,
        emissiveIntensity: 0.1,
        castShadow: false,
      });
      gun.position.y = -0.14;
      blaster.add(gun);
    } else {
      const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.14, 0.68),
        new THREE.MeshToonMaterial({ color: 0x0f172a }),
      );
      blaster.add(chassis);
    }

    const muzzle = createStarburstMuzzle();
    muzzle.position.set(0, 0.04, 0.54);
    blaster.add(muzzle);

    bodyPivot.add(blaster);
    return { blaster, muzzle };
  };

  const leftGun = makeBlaster(-1);
  const rightGun = makeBlaster(1);

  const ultReadyHalo = new THREE.Mesh(
    new THREE.TorusGeometry(1.12, 0.05, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.72 }),
  );
  ultReadyHalo.rotation.x = Math.PI / 2;
  ultReadyHalo.position.y = 2.62;
  ultReadyHalo.visible = false;
  root.add(ultReadyHalo);

  const shieldGroup = new THREE.Group();
  shieldGroup.position.y = 1.06;
  root.add(shieldGroup);
  const shieldMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const sm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.11, 6),
      new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x0284c7,
        emissiveIntensity: 0.55,
        transparent: true,
        opacity: 0.82,
        roughness: 0.25,
        metalness: 0.65,
      }),
    );
    sm.rotation.x = Math.PI / 2;
    sm.visible = false;
    shieldGroup.add(sm);
    shieldMeshes.push(sm);
  }

  // Mahou-Shoujo Magic Circle Ground Aura (Octagram seal + Dã Quỳ petals)
  const auraGroup = new THREE.Group();
  auraGroup.visible = false;
  root.add(auraGroup);

  const auraRing = new THREE.Mesh(
    new THREE.RingGeometry(0.92, 1.0, 48),
    new THREE.MeshBasicMaterial({
      color: 0xeab308,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.06;
  auraGroup.add(auraRing);

  const magicSquare = new THREE.Mesh(
    new THREE.RingGeometry(0.76, 0.81, 4),
    new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  magicSquare.rotation.x = -Math.PI / 2;
  magicSquare.position.y = 0.065;
  auraGroup.add(magicSquare);

  const auraPetals = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const petal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xeab308 : 0x38bdf8 }),
    );
    petal.position.set(Math.cos(a) * 0.96, 0.24, Math.sin(a) * 0.96);
    auraPetals.add(petal);
  }
  auraGroup.add(auraPetals);

  return {
    root,
    bodyPivot,
    mixer,
    idleAction,
    runAction,
    shootAction,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    scarf,
    tassel,
    leftBlaster: leftGun.blaster,
    rightBlaster: rightGun.blaster,
    muzzleLeft: leftGun.muzzle,
    muzzleRight: rightGun.muzzle,
    thrusterLeft,
    thrusterRight,
    heroLight,
    ultReadyHalo,
    shieldGroup,
    shieldMeshes,
    auraGroup,
    auraRing,
    auraPetals,
  };
}

function registerFlashMat(
  hitMaterials: HitFlashMaterial[],
  mat: THREE.MeshStandardMaterial | THREE.MeshToonMaterial,
): THREE.MeshStandardMaterial | THREE.MeshToonMaterial {
  hitMaterials.push({
    mat,
    baseEmissive: mat.emissive ? mat.emissive.getHex() : 0x000000,
    baseIntensity: mat.emissiveIntensity ?? 0,
  });
  return mat;
}

function registerModelHitMaterials(root: THREE.Object3D, hitMaterials: HitFlashMaterial[]): void {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m || m.userData?.isAnimeOutline || m.userData?.sharedKenneyMat) continue;
      const std = m as THREE.MeshStandardMaterial | THREE.MeshToonMaterial;
      if (std && std.emissive) {
        registerFlashMat(hitMaterials, std);
      }
    }
  });
}

function attachCharacterAnimation(
  model: THREE.Group,
  clips: THREE.AnimationClip[],
  preferredNames: string[],
  bossRefs: BossVisualRefs,
  timeScale = 1.0,
): void {
  if (!clips || clips.length === 0) return;
  const mixer = new THREE.AnimationMixer(model);
  let clip: THREE.AnimationClip | undefined;
  for (const name of preferredNames) {
    clip = clips.find((c) => c.name === name);
    if (clip) break;
  }
  clip = clip ?? clips[0];
  if (clip) {
    const action = mixer.clipAction(clip);
    action.timeScale = timeScale;
    action.play();
    action.time = Math.random() * Math.max(0.1, clip.duration);
    bossRefs.mixer = mixer;
    bossRefs.walkAction = action;
  }
}

export function createEnemyMesh(
  type: EnemyArchetype,
  shared: SharedVisualAssets,
  kenney?: KenneyPack | null,
  options?: { isElite?: boolean },
): { group: THREE.Group; bossRefs: BossVisualRefs } {
  const group = new THREE.Group();
  const hitMaterials: HitFlashMaterial[] = [];
  const bossRefs: BossVisualRefs = { hitMaterials, limbs: [] };
  const isElite = Boolean(options?.isElite);

  const shadowScale =
    type === 'bossDeadline' ? 8.2 : type === 'miniBoss404' ? 4.8 : isElite ? 3.1 : 2.4;
  const shadow = new THREE.Mesh(shared.unitPlaneGeo, shared.shadowMat);
  shadow.scale.set(shadowScale, shadowScale, 1);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  group.add(shadow);

  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);
  bossRefs.bodyGroup = bodyGroup;

  if (isElite && type !== 'miniBoss404' && type !== 'bossDeadline') {
    const eliteRing = new THREE.Mesh(
      new THREE.RingGeometry(1.18, 1.4, 24),
      new THREE.MeshBasicMaterial({
        color: 0xeab308,
        transparent: true,
        opacity: 0.68,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    eliteRing.rotation.x = -Math.PI / 2;
    eliteRing.position.y = 0.04;
    group.add(eliteRing);
    bodyGroup.scale.setScalar(1.26);
  }

  if (type === 'syntax') {
    // Kenney character-zombie.glb (2AM Zombie Coder) + Toon Cel-Shading & Oni Horn
    const src = kenney?.charZombie ?? kenney?.charSkeleton;
    const clips = kenney?.charZombie ? kenney.charZombieAnimations : (kenney?.charSkeletonAnimations ?? []);
    if (src) {
      const zombie = instantiateKenneyModel(src, 2.05, {
        skinned: Boolean(kenney?.charZombie),
        fitBy: 'height',
        toon: true,
        outlineColor: 0x260614,
        outlineWorldThickness: 0.042,
        emissiveHex: 0x881337,
        emissiveIntensity: 0.08,
      });
      bodyGroup.add(zombie);
      registerModelHitMaterials(zombie, hitMaterials);
      attachCharacterAnimation(zombie, clips, ['sprint', 'walk', 'idle'], bossRefs, 1.25);
    } else {
      const shell = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.62, 1),
        registerFlashMat(hitMaterials, new THREE.MeshToonMaterial({ color: 0xe11d48 })),
      );
      shell.position.y = 0.68;
      bodyGroup.add(shell);
    }

    // Little anime crimson Oni Horn accent
    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.34, 6),
      new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xe11d48,
        emissiveIntensity: 0.5,
      }),
    );
    horn.position.set(0, 2.05, 0.16);
    horn.rotation.x = 0.3;
    bodyGroup.add(horn);

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: shared.glyphSemicolon, transparent: true }),
    );
    sprite.scale.set(0.58, 0.58, 1);
    sprite.position.y = 2.58;
    bodyGroup.add(sprite);
  } else if (type === 'nullPtr') {
    // Kenney Graveyard Ghost (character-ghost.glb) + Anime Spectral Halo & Glowing Crimson Eyes
    if (kenney?.charGhost) {
      const ghost = instantiateKenneyModel(kenney.charGhost, 2.1, {
        skinned: false,
        fitBy: 'height',
        toon: true,
        outlineColor: 0x881337,
        outlineWorldThickness: 0.045,
        tintHex: 0xfecdd3,
        tintAmount: 0.22,
        emissiveHex: 0x9f1239,
        emissiveIntensity: 0.18,
      });
      ghost.position.y = 0.25;
      bodyGroup.add(ghost);
      registerModelHitMaterials(ghost, hitMaterials);
      attachCharacterAnimation(ghost, kenney.charGhostAnimations, ['sprint', 'walk', 'idle'], bossRefs, 1.35);
    } else {
      const hull = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 1.9, 6),
        registerFlashMat(hitMaterials, new THREE.MeshToonMaterial({ color: 0x0f172a })),
      );
      hull.rotation.x = Math.PI / 2;
      hull.position.y = 0.95;
      bodyGroup.add(hull);
    }

    const phantomRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.04, 8, 20),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.72 }),
    );
    phantomRing.position.set(0, 1.55, -0.35);
    bodyGroup.add(phantomRing);
    bossRefs.outerRing = phantomRing;
  } else if (type === 'loop') {
    // Kenney Mini-Character Cyber-Alien (character-alien.glb) + Orbiting Anime Runes & ∞ Badge
    if (kenney?.charAlien) {
      const alien = instantiateKenneyModel(kenney.charAlien, 2.15, {
        skinned: true,
        fitBy: 'height',
        toon: true,
        outlineColor: 0x2e1065,
        outlineWorldThickness: 0.044,
        emissiveHex: 0x6b21a8,
        emissiveIntensity: 0.09,
      });
      bodyGroup.add(alien);
      registerModelHitMaterials(alien, hitMaterials);
      attachCharacterAnimation(alien, kenney.charAlienAnimations, ['sprint', 'walk', 'idle'], bossRefs, 1.2);
    }

    const orbitGroup = new THREE.Group();
    orbitGroup.position.y = 1.25;
    for (let i = 0; i < 2; i++) {
      const a = i * Math.PI;
      const rune = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.18, 0),
        new THREE.MeshStandardMaterial({
          color: 0xc084fc,
          emissive: 0x9333ea,
          emissiveIntensity: 0.55,
        }),
      );
      rune.position.set(Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15);
      orbitGroup.add(rune);
    }
    bodyGroup.add(orbitGroup);
    bossRefs.orbitGroup = orbitGroup;

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: shared.glyphInfinity, transparent: true }),
    );
    sprite.scale.set(0.68, 0.68, 1);
    sprite.position.y = 2.65;
    bodyGroup.add(sprite);
  } else if (type === 'memLeak') {
    // Kenney Heavy Chibi-Mecha Robot (character-robot.glb) + Shield & Glowing RAM Core
    if (kenney?.charRobot) {
      const mech = instantiateKenneyModel(kenney.charRobot, 2.85, {
        skinned: true,
        fitBy: 'height',
        toon: true,
        outlineColor: 0x1e1b4b,
        outlineWorldThickness: 0.05,
        tintHex: 0xa855f7,
        tintAmount: 0.2,
        emissiveHex: 0x581c87,
        emissiveIntensity: 0.1,
      });
      bodyGroup.add(mech);
      registerModelHitMaterials(mech, hitMaterials);
      attachCharacterAnimation(mech, kenney.charRobotAnimations, ['walk', 'sprint', 'idle'], bossRefs, 0.92);
    } else {
      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.35, 1.4),
        registerFlashMat(hitMaterials, new THREE.MeshToonMaterial({ color: 0x4c1d95 })),
      );
      torso.position.y = 0.9;
      bodyGroup.add(torso);
    }

    if (kenney?.shieldRound) {
      const shield = instantiateKenneyModel(kenney.shieldRound, 1.15, {
        fitBy: 'maxDim',
        toon: true,
        outlineColor: 0x1e1b4b,
        outlineWorldThickness: 0.032,
        tintHex: 0x7e22ce,
        tintAmount: 0.35,
        castShadow: false,
      });
      shield.position.set(-0.82, 1.35, 0.55);
      shield.rotation.y = -0.35;
      bodyGroup.add(shield);
      registerModelHitMaterials(shield, hitMaterials);
    }

    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.06, 8, 18),
      new THREE.MeshBasicMaterial({ color: 0xa855f7 }),
    );
    coreRing.position.set(0, 1.45, -0.58);
    bodyGroup.add(coreRing);
    bossRefs.innerRing = coreRing;
  } else if (type === 'conflict') {
    // Kenney Raider Rogue Ranger (character-raider.glb) wielding Blaster-Repeater + GIT Badge
    if (kenney?.charRaider) {
      const raider = instantiateKenneyModel(kenney.charRaider, 2.2, {
        skinned: true,
        fitBy: 'height',
        toon: true,
        outlineColor: 0x431407,
        outlineWorldThickness: 0.044,
        emissiveHex: 0x9a3412,
        emissiveIntensity: 0.08,
      });
      bodyGroup.add(raider);
      registerModelHitMaterials(raider, hitMaterials);
      attachCharacterAnimation(
        raider,
        kenney.charRaiderAnimations,
        ['holding-right-shoot', 'sprint', 'walk'],
        bossRefs,
        1.1,
      );
    }

    const gunSrc = kenney?.blasterRepeater ?? kenney?.weaponSpear;
    if (gunSrc) {
      const gun = instantiateKenneyModel(gunSrc, 1.05, {
        fitBy: 'maxDim',
        toon: true,
        outlineColor: 0x431407,
        outlineWorldThickness: 0.028,
        tintHex: 0xf97316,
        tintAmount: 0.25,
        castShadow: false,
      });
      gun.position.set(0.55, 1.15, 0.5);
      bodyGroup.add(gun);
    }

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: shared.glyphGit, transparent: true }),
    );
    sprite.scale.set(0.68, 0.68, 1);
    sprite.position.y = 2.65;
    bodyGroup.add(sprite);
  } else if (type === 'miniBoss404') {
    // Ground crimson boss threat ring
    const floorRing = new THREE.Mesh(
      new THREE.RingGeometry(2.35, 2.75, 32),
      new THREE.MeshBasicMaterial({
        color: 0xe11d48,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0.05;
    group.add(floorRing);

    // Wibu Dark Cyber-Paladin: Kenney character-knight.glb (4.2m) + Spear + Shield + Anime Chakra Seal
    const bossSrc = kenney?.charKnight ?? kenney?.charKeeper ?? kenney?.characterSoldier;
    const bossClips = kenney?.charKnight
      ? kenney.charKnightAnimations
      : kenney?.charKeeper
        ? kenney.charKeeperAnimations
        : (kenney?.characterSoldierAnimations ?? []);

    if (bossSrc) {
      const bossKnight = instantiateKenneyModel(bossSrc, 4.25, {
        skinned: Boolean(kenney?.charKnight || kenney?.characterSoldier),
        fitBy: 'height',
        toon: true,
        outlineColor: 0x4c0519,
        outlineWorldThickness: 0.058,
        tintHex: 0xf43f5e,
        tintAmount: 0.2,
        emissiveHex: 0x881337,
        emissiveIntensity: 0.14,
      });
      bodyGroup.add(bossKnight);
      registerModelHitMaterials(bossKnight, hitMaterials);
      attachCharacterAnimation(bossKnight, bossClips, ['sprint', 'walk', 'idle'], bossRefs, 1.05);
    }

    // Giant Kenney Holy-Bug Lance + Round Aegis Shield
    if (kenney?.weaponSpear) {
      const spear = instantiateKenneyModel(kenney.weaponSpear, 4.4, {
        fitBy: 'height',
        toon: true,
        outlineColor: 0x4c0519,
        outlineWorldThickness: 0.042,
        tintHex: 0xf43f5e,
        tintAmount: 0.35,
        emissiveHex: 0xe11d48,
        emissiveIntensity: 0.3,
        castShadow: false,
      });
      spear.position.set(1.38, 1.35, 0.85);
      spear.rotation.x = 0.85;
      bodyGroup.add(spear);
      registerModelHitMaterials(spear, hitMaterials);
    }
    if (kenney?.shieldRound) {
      const shield = instantiateKenneyModel(kenney.shieldRound, 1.9, {
        fitBy: 'maxDim',
        toon: true,
        outlineColor: 0x4c0519,
        outlineWorldThickness: 0.04,
        tintHex: 0x9f1239,
        tintAmount: 0.35,
        castShadow: false,
      });
      shield.position.set(-1.32, 1.9, 0.65);
      shield.rotation.y = -0.4;
      bodyGroup.add(shield);
      registerModelHitMaterials(shield, hitMaterials);
    }

    // Upright Anime Chakra Halo Wheel behind shoulders
    const backHalo = new THREE.Mesh(
      new THREE.TorusGeometry(2.15, 0.08, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.72 }),
    );
    backHalo.position.set(0, 2.7, -0.95);
    bodyGroup.add(backHalo);
    bossRefs.outerRing = backHalo;

    // 2 Orbiting Kenney Graveyard Ghost Shikigami Spirits
    const orbitGroup = new THREE.Group();
    orbitGroup.position.y = 2.45;
    const escortSrc = kenney?.charGhost ?? kenney?.enemyFlying;
    for (let i = 0; i < 2; i++) {
      const a = i * Math.PI;
      if (escortSrc) {
        const pod = instantiateKenneyModel(escortSrc, 1.45, {
          fitBy: 'height',
          toon: true,
          outlineColor: 0x881337,
          outlineWorldThickness: 0.036,
          tintHex: 0xfb7185,
          tintAmount: 0.3,
          castShadow: false,
        });
        registerModelHitMaterials(pod, hitMaterials);
        pod.position.set(Math.cos(a) * 3.15, 0, Math.sin(a) * 3.15);
        pod.rotation.y = -a;
        orbitGroup.add(pod);
      }
    }
    bodyGroup.add(orbitGroup);
    bossRefs.orbitGroup = orbitGroup;

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: shared.glyph404, transparent: true }),
    );
    sprite.scale.set(1.55, 1.55, 1);
    sprite.position.y = 5.15;
    bodyGroup.add(sprite);
  } else if (type === 'bossDeadline') {
    // Ground Demon-Overlord Summoning Magic Circle
    const floorRing = new THREE.Mesh(
      new THREE.RingGeometry(3.6, 4.2, 40),
      new THREE.MeshBasicMaterial({
        color: 0xe11d48,
        transparent: true,
        opacity: 0.62,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0.06;
    group.add(floorRing);

    const floorHex = new THREE.Mesh(
      new THREE.RingGeometry(2.85, 3.05, 6),
      new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.52,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    floorHex.rotation.x = -Math.PI / 2;
    floorHex.position.y = 0.07;
    group.add(floorHex);

    // Towering Anime Demon-Overlord Boss: Kenney character-vampire.glb (6.0m tall!)
    if (kenney?.charVampire) {
      const overlord = instantiateKenneyModel(kenney.charVampire, 6.0, {
        skinned: false,
        fitBy: 'height',
        toon: true,
        outlineColor: 0x3b0416,
        outlineWorldThickness: 0.068,
        emissiveHex: 0x6b0724,
        emissiveIntensity: 0.14,
      });
      bodyGroup.add(overlord);
      registerModelHitMaterials(overlord, hitMaterials);
      attachCharacterAnimation(
        overlord,
        kenney.charVampireAnimations,
        ['sprint', 'walk', 'idle'],
        bossRefs,
        0.95,
      );
    } else if (kenney?.craftBoss) {
      const crestShip = instantiateKenneyModel(kenney.craftBoss, 7.2, {
        fitBy: 'maxDim',
        toon: true,
        outlineColor: 0x3b0416,
        outlineWorldThickness: 0.065,
      });
      crestShip.position.y = 0.9;
      bodyGroup.add(crestShip);
      registerModelHitMaterials(crestShip, hitMaterials);
    }

    // 6-Winged Cyber-Demon Mecha Blade Wings (limbs -> animates cleanly in GameCanvas3D!)
    const wingBladeMat = new THREE.MeshStandardMaterial({
      color: 0x180914,
      emissive: 0xe11d48,
      emissiveIntensity: 0.58,
      metalness: 0.65,
      roughness: 0.25,
    });
    const wingGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.52,
      roughness: 0.28,
    });
    for (const side of [-1, 1]) {
      for (let tier = 0; tier < 3; tier++) {
        const wingPivot = new THREE.Group();
        wingPivot.position.set(side * 1.15, 3.85 - tier * 0.65, -1.2);
        wingPivot.rotation.z = side * (-0.38 - tier * 0.28);
        wingPivot.rotation.y = side * 0.28;

        const bladeLen = 3.2 - tier * 0.45;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(bladeLen, 0.26, 0.1), wingBladeMat);
        blade.position.x = side * (bladeLen * 0.5);
        wingPivot.add(blade);

        const edge = new THREE.Mesh(new THREE.BoxGeometry(bladeLen * 0.88, 0.08, 0.13), wingGoldMat);
        edge.position.set(side * (bladeLen * 0.5), 0.15, 0);
        wingPivot.add(edge);

        bodyGroup.add(wingPivot);
        bossRefs.limbs?.push(wingPivot);
      }
    }

    // Dual Floating Giant Kenney Demon Katanas flanking Overlord's shoulders
    if (kenney?.weaponSword) {
      for (const side of [-1, 1]) {
        const demonSword = instantiateKenneyModel(kenney.weaponSword, 3.6, {
          fitBy: 'height',
          toon: true,
          outlineColor: 0x4c0519,
          outlineWorldThickness: 0.045,
          tintHex: 0xf43f5e,
          tintAmount: 0.42,
          emissiveHex: 0xe11d48,
          emissiveIntensity: 0.42,
          castShadow: false,
        });
        demonSword.position.set(side * 2.55, 2.35, 0.35);
        demonSword.rotation.set(0.32, 0, side * -0.25);
        bodyGroup.add(demonSword);
        registerModelHitMaterials(demonSword, hitMaterials);
      }
    }

    // Upright Rotating Crimson-Gold Anime Chakra Wheel behind Boss Deadline
    const outerWheel = new THREE.Mesh(
      new THREE.TorusGeometry(3.45, 0.11, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xe11d48, transparent: true, opacity: 0.78 }),
    );
    outerWheel.position.set(0, 3.7, -1.55);
    bodyGroup.add(outerWheel);
    bossRefs.outerRing = outerWheel;

    const innerWheel = new THREE.Mesh(
      new THREE.TorusGeometry(2.45, 0.08, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.75 }),
    );
    innerWheel.position.set(0, 3.7, -1.48);
    bodyGroup.add(innerWheel);
    bossRefs.innerRing = innerWheel;

    // Floating 23:59 Doom Clock Crown Halo cleanly above Overlord's head (y = 6.75)
    const dial = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.75, 0.12, 24),
      new THREE.MeshStandardMaterial({
        map: shared.clockDialTex,
        emissiveMap: shared.clockDialTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.55,
        roughness: 0.35,
      }),
    );
    dial.position.y = 6.75;
    bodyGroup.add(dial);

    // 4 Orbiting Anime Shikigami: Kenney Grim Keepers (charKeeper) + Crimson Crystals
    const orbitGroup = new THREE.Group();
    orbitGroup.position.y = 2.6;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      let node: THREE.Object3D;
      const shikigamiSrc = kenney?.charKeeper ?? kenney?.charGhost;
      if (i % 2 === 0 && shikigamiSrc) {
        node = instantiateKenneyModel(shikigamiSrc, 1.95, {
          fitBy: 'height',
          toon: true,
          outlineColor: 0x4c0519,
          outlineWorldThickness: 0.038,
          tintHex: 0xfb7185,
          tintAmount: 0.25,
          castShadow: false,
        });
        registerModelHitMaterials(node, hitMaterials);
      } else if (kenney?.crystal) {
        node = instantiateKenneyModel(kenney.crystal, 1.65, {
          fitBy: 'height',
          toon: true,
          outlineColor: 0x4c0519,
          outlineWorldThickness: 0.035,
          tintHex: 0xf43f5e,
          tintAmount: 0.35,
          emissiveHex: 0xbe123c,
          emissiveIntensity: 0.45,
          castShadow: false,
        });
        registerModelHitMaterials(node, hitMaterials);
      } else {
        node = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.48, 0),
          registerFlashMat(hitMaterials, new THREE.MeshToonMaterial({ color: 0xfb7185 })),
        );
      }
      node.position.set(Math.cos(a) * 5.05, 0, Math.sin(a) * 5.05);
      node.rotation.y = -a;
      orbitGroup.add(node);
    }
    bodyGroup.add(orbitGroup);
    bossRefs.orbitGroup = orbitGroup;

    const hourHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.14, 1.25),
      new THREE.MeshStandardMaterial({ color: 0xeab308, emissive: 0xd97706, emissiveIntensity: 0.6 }),
    );
    hourHand.position.set(0, 6.88, 0.48);
    const hourPivot = new THREE.Group();
    hourPivot.add(hourHand);
    bodyGroup.add(hourPivot);
    bossRefs.hourHand = hourPivot;

    const minuteHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 1.65),
      new THREE.MeshStandardMaterial({ color: 0xfb7185, emissive: 0xe11d48, emissiveIntensity: 0.65 }),
    );
    minuteHand.position.set(0, 6.92, 0.66);
    const minPivot = new THREE.Group();
    minPivot.add(minuteHand);
    bodyGroup.add(minPivot);
    bossRefs.minuteHand = minPivot;
  }

  return { group, bossRefs };
}

export function createPowerUpMesh(type: PowerUpType): THREE.Group {
  const g = new THREE.Group();
  const color = type === 'coffeeBoost' ? 0xd97706 : type === 'teacherUsb' ? 0x10b981 : 0x0891b2;

  const beacon = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1.08, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.65, side: THREE.DoubleSide }),
  );
  beacon.rotation.x = -Math.PI / 2;
  beacon.position.y = 0.05;
  g.add(beacon);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.05, 8, 24),
    new THREE.MeshBasicMaterial({ color }),
  );
  halo.position.y = 1.02;
  g.add(halo);

  if (type === 'coffeeBoost') {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.3, 0.92, 12),
      new THREE.MeshStandardMaterial({ color: 0x78350f, emissive: 0xd97706, emissiveIntensity: 0.35 }),
    );
    cup.position.y = 0.88;
    g.add(cup);

    const lid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.14, 12),
      new THREE.MeshStandardMaterial({ color: 0xeab308, emissive: 0xd97706, emissiveIntensity: 0.45 }),
    );
    lid.position.y = 1.36;
    g.add(lid);
  } else if (type === 'teacherUsb') {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.88, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.45 }),
    );
    body.position.y = 0.88;
    g.add(body);
    const tip = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.32, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 }),
    );
    tip.position.y = 1.44;
    g.add(tip);
  } else {
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.58, 0.78),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.48 }),
    );
    cube.position.y = 0.92;
    g.add(cube);
  }

  return g;
}

export function createSupplyCrateMesh(kenney?: KenneyPack | null): THREE.Group {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.05, 1.28, 24),
    new THREE.MeshBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.65, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  g.add(ring);

  if (kenney?.crate) {
    const crate = instantiateKenneyModel(kenney.crate, 1.85, {
      fitBy: 'maxDim',
      emissiveHex: 0xd97706,
      emissiveIntensity: 0.12,
    });
    g.add(crate);
  } else {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0xd97706, emissiveIntensity: 0.35 }),
    );
    crate.position.y = 0.72;
    g.add(crate);
  }

  return g;
}
