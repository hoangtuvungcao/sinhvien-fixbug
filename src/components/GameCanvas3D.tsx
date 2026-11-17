import React, { useEffect, useRef, useState } from 'react';
import { Crosshair, Flame, Sparkles, Swords, Zap } from 'lucide-react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { soundEngine } from '../audio/soundEngine';
import {
  FUNNY_COMBAT_BARKS,
  TEACHER_ULTIMATE_QUOTES,
  TRIBUTE_BEACON_MEMORIES,
  UPGRADE_SKILLS,
  WAVE_CONFIGS,
} from '../data/gameData';
import { KenneyPack, loadKenneyPack } from '../engine/kenneyAssets';
import {
  ARENA_HALF_SIZE,
  ArenaObstacle,
  BossVisualRefs,
  HeroVisualRefs,
  SharedVisualAssets,
  createArenaEnvironment,
  createEnemyMesh,
  createPowerUpMesh,
  createSharedVisualAssets,
  createStudentHeroMesh,
  createSupplyCrateMesh,
  disposeObject3D,
} from '../engine/threeModels';
import {
  EnemyArchetype,
  GameScreenState,
  HudSnapshot,
  MatchSummary,
  PowerUpType,
  RadarBlip,
  SkillId,
  StyleRank,
} from '../types/game';

interface GameCanvas3DProps {
  screenState: GameScreenState;
  cameraZoom: number;
  runSeed: number;
  pendingSkillChoice: SkillId | null;
  onConsumeSkillChoice: () => void;
  onCameraZoomChange: (nextZoom: number) => void;
  onHudUpdate: (hud: HudSnapshot) => void;
  onTriggerLevelUp: (choices: SkillId[], skills: Record<SkillId, number>) => void;
  onPauseToggle: () => void;
  onMatchEnd: (summary: MatchSummary) => void;
}

interface Enemy3D {
  id: number;
  type: EnemyArchetype;
  name: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  xpValue: number;
  scoreValue: number;
  hitFlash: number;
  isFlashing?: boolean;
  knockX: number;
  knockZ: number;
  stateTimer: number;
  isElite?: boolean;
  isBoss?: boolean;
  bossPhase?: number;
  attackCycle?: number;
  isChargingDash?: boolean;
  dashTargetX?: number;
  dashTargetZ?: number;
  telegraphLine?: THREE.Mesh;
  laserAngle?: number;
  laserTimer?: number;
  laserMesh?: THREE.Mesh;
  laserMesh2?: THREE.Mesh;
  mesh: THREE.Group;
  bossRefs: BossVisualRefs;
}

interface Projectile3D {
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  damage: number;
  fromPlayer: boolean;
  pierce: number;
  hitIds: Set<number>;
  life: number;
  isCrit?: boolean;
  mesh: THREE.Mesh;
}

interface XpGem3D {
  x: number;
  z: number;
  vx: number;
  vz: number;
  value: number;
  isGold: boolean;
  phase: number;
  mesh: THREE.Mesh;
}

interface PowerUp3D {
  x: number;
  z: number;
  type: PowerUpType;
  life: number;
  mesh: THREE.Group;
}

interface Hazard3D {
  x: number;
  z: number;
  radius: number;
  life: number;
  maxLife: number;
  type: 'slow' | 'meteor' | 'nova' | 'shock';
  triggered?: boolean;
  mesh: THREE.Mesh;
  innerRing?: THREE.Mesh;
  boulder?: THREE.Mesh;
  beam?: THREE.Mesh;
}

interface SupplyCrate3D {
  id: number;
  x: number;
  z: number;
  hp: number;
  hitFlash: number;
  mesh: THREE.Group;
}

interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  kind: 'spark' | 'petal' | 'ring' | 'dome' | 'pillar';
  mesh: THREE.Mesh;
}

interface FloatingLabel {
  wx: number;
  wy: number;
  wz: number;
  text: string;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

const _projVec = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _mouseWorld = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _camLook = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const GameCanvas3D: React.FC<GameCanvas3DProps> = ({
  screenState,
  cameraZoom,
  runSeed,
  pendingSkillChoice,
  onConsumeSkillChoice,
  onCameraZoomChange,
  onHudUpdate,
  onTriggerLevelUp,
  onPauseToggle,
  onMatchEnd,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const screenRef = useRef<GameScreenState>(screenState);
  const cameraZoomRef = useRef<number>(cameraZoom);
  const onCameraZoomChangeRef = useRef(onCameraZoomChange);

  screenRef.current = screenState;
  cameraZoomRef.current = cameraZoom;
  onCameraZoomChangeRef.current = onCameraZoomChange;

  const [webglError, setWebglError] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [joyVisual, setJoyVisual] = useState<{ active: boolean; knobX: number; knobY: number }>({
    active: false,
    knobX: 0,
    knobY: 0,
  });
  const [touchCooldowns, setTouchCooldowns] = useState<{
    dashReady: number;
    shockReady: number;
    ultCharge: number;
    heat: number;
    overheated: boolean;
    isFiring: boolean;
    ventBuff: boolean;
  }>({
    dashReady: 1,
    shockReady: 1,
    ultCharge: 40,
    heat: 0,
    overheated: false,
    isFiring: false,
    ventBuff: false,
  });
  const [edgeFx, setEdgeFx] = useState<{ damageFlash: number; coffee: boolean; ctrlZ: boolean }>({
    damageFlash: 0,
    coffee: false,
    ctrlZ: false,
  });

  const touchJoyRef = useRef<{
    active: boolean;
    id: number | null;
    ox: number;
    oy: number;
    dx: number;
    dy: number;
  }>({
    active: false,
    id: null,
    ox: 0,
    oy: 0,
    dx: 0,
    dy: 0,
  });

  const mobileFireRef = useRef<boolean>(false);
  const mobileAimDragRef = useRef<boolean>(false);
  const mobileFireTouchRef = useRef<{ id: number | null; ox: number; oy: number }>({
    id: null,
    ox: 0,
    oy: 0,
  });
  const triggerDashRef = useRef<() => void>(() => {});
  const triggerShockwaveRef = useRef<() => void>(() => {});
  const triggerUltRef = useRef<() => void>(() => {});
  const triggerVentRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkTouch =
        'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
      setIsTouchDevice(checkTouch);
    }
  }, []);

  useEffect(() => {
    if (screenState === 'PLAYING') return;
    mobileFireRef.current = false;
    mobileAimDragRef.current = false;
    mobileFireTouchRef.current.id = null;
    touchJoyRef.current.active = false;
    touchJoyRef.current.id = null;
    touchJoyRef.current.dx = 0;
    touchJoyRef.current.dy = 0;
    setJoyVisual({ active: false, knobX: 0, knobY: 0 });
    if (worldRef.current) {
      worldRef.current.pointerDown = false;
      worldRef.current.keys.clear();
    }
  }, [screenState]);

  const worldRef = useRef<{
    scene: THREE.Scene;
    contactShadowTex: THREE.CanvasTexture;
    shared: SharedVisualAssets;
    maxAniso: number;
    kenney: KenneyPack | null;
    obstacles: ArenaObstacle[];
    beacons: ArenaObstacle[];
    beaconPads: THREE.Mesh[];
    beaconCooldowns: number[];
    hero: HeroVisualRefs;
    heroMoving: boolean;
    aimReticle: THREE.Group;
    targetLockReticle: THREE.Group;
    scanRing: THREE.Mesh;
    holoPlanets: THREE.Object3D[];
    baseFov: number;
    fovPunch: number;
    ultFlashTimer: number;
    hitstopTimer: number;
    pointerDown: boolean;
    barrelToggle: 0 | 1;
    player: {
      x: number;
      z: number;
      vx: number;
      vz: number;
      radius: number;
      aimAngle: number;
      hp: number;
      maxHp: number;
      xp: number;
      nextXp: number;
      level: number;
      ultCharge: number;
      dashCooldown: number;
      maxDashCooldown: number;
      dashTimer: number;
      dashDirX: number;
      dashDirZ: number;
      shockwaveCooldown: number;
      maxShockwaveCooldown: number;
      invulnTimer: number;
      fireCooldown: number;
      blasterRecoil: number;
      shieldAngle: number;
      skills: Record<SkillId, number>;
    };
    enemies: Enemy3D[];
    projectiles: Projectile3D[];
    xpGems: XpGem3D[];
    powerUps: PowerUp3D[];
    crates: SupplyCrate3D[];
    hazards: Hazard3D[];
    particles: Particle3D[];
    labels: FloatingLabel[];
    keys: Set<string>;
    pointerNdc: { x: number; y: number };
    time: number;
    elapsedSeconds: number;
    waveIndex: number;
    waveTimer: number;
    spawnTimer: number;
    powerUpSpawnTimer: number;
    crateSpawnTimer: number;
    muzzleTimer: number;
    dashGhostTimer: number;
    dashHitIds: Set<number>;
    feverAnnounced: boolean;
    bossSpawnedWaves: Set<number>;
    announcedBossPhase: number;
    score: number;
    kills: number;
    combo: number;
    maxCombo: number;
    comboTimer: number;
    xpCombo: number;
    xpComboTimer: number;
    nextEntityId: number;
    shakeMag: number;
    damageFlash: number;
    coffeeTimer: number;
    ctrlZTimer: number;
    auraDamageTimer: number;
    auraNovaTimer: number;
    puddleTickTimer: number;
    weaponHeat: number;
    isOverheated: boolean;
    overheatTimer: number;
    ventBuffTimer: number;
    stylePoints: number;
    shieldHitTimers: Map<number, number>;
    bannerMessage: string | null;
    bannerTimer: number;
    quoteIndex: number;
    matchEnded: boolean;
  } | null>(null);

  // Reset world on new runSeed
  useEffect(() => {
    const w = worldRef.current;
    if (!w) return;

    w.enemies.forEach((e) => {
      w.scene.remove(e.mesh);
      disposeObject3D(e.mesh);
      if (e.telegraphLine) {
        w.scene.remove(e.telegraphLine);
        disposeObject3D(e.telegraphLine);
      }
      if (e.laserMesh) {
        w.scene.remove(e.laserMesh);
        disposeObject3D(e.laserMesh);
      }
      if (e.laserMesh2) {
        w.scene.remove(e.laserMesh2);
        disposeObject3D(e.laserMesh2);
      }
    });
    w.projectiles.forEach((p) => {
      w.scene.remove(p.mesh);
      disposeObject3D(p.mesh);
    });
    w.xpGems.forEach((g) => {
      w.scene.remove(g.mesh);
      disposeObject3D(g.mesh);
    });
    w.powerUps.forEach((pu) => {
      w.scene.remove(pu.mesh);
      disposeObject3D(pu.mesh);
    });
    w.crates.forEach((cr) => {
      w.scene.remove(cr.mesh);
      disposeObject3D(cr.mesh);
    });
    w.hazards.forEach((hz) => {
      w.scene.remove(hz.mesh);
      disposeObject3D(hz.mesh);
      if (hz.boulder) {
        w.scene.remove(hz.boulder);
        disposeObject3D(hz.boulder);
      }
      if (hz.beam) {
        w.scene.remove(hz.beam);
        disposeObject3D(hz.beam);
      }
    });
    w.particles.forEach((pt) => {
      w.scene.remove(pt.mesh);
      disposeObject3D(pt.mesh);
    });

    w.enemies = [];
    w.projectiles = [];
    w.xpGems = [];
    w.powerUps = [];
    w.crates = [];
    w.hazards = [];
    w.particles = [];
    w.labels = [];

    const startMaxHp = 120;
    w.player = {
      x: 0,
      z: 0,
      vx: 0,
      vz: 0,
      radius: 0.72,
      aimAngle: 0,
      hp: startMaxHp,
      maxHp: startMaxHp,
      xp: 0,
      nextXp: 42,
      level: 1,
      ultCharge: 40,
      dashCooldown: 0,
      maxDashCooldown: 2.1,
      dashTimer: 0,
      dashDirX: 0,
      dashDirZ: -1,
      shockwaveCooldown: 0,
      maxShockwaveCooldown: 4.5,
      invulnTimer: 1.0,
      fireCooldown: 0,
      blasterRecoil: 0,
      shieldAngle: 0,
      skills: {
        forLoop: 1,
        tryCatch: 0,
        banMeCoffee: 0,
        binarySearch: 0,
        mentorAdvice: 0,
        sunflowerAura: 0,
      },
    };
    w.hero.root.position.set(0, 0, 0);
    w.hero.auraGroup.visible = false;
    w.hero.ultReadyHalo.visible = false;
    w.hero.muzzleLeft.visible = false;
    w.hero.muzzleRight.visible = false;
    w.hero.shieldMeshes.forEach((m) => (m.visible = false));
    if (w.heroMoving && w.hero.runAction && w.hero.idleAction) {
      w.hero.idleAction.reset().play();
      w.hero.runAction.crossFadeTo(w.hero.idleAction, 0.15, true);
      w.heroMoving = false;
    }

    w.beaconCooldowns = [0, 0, 0, 0];
    w.time = 0;
    w.elapsedSeconds = 0;
    w.waveIndex = 0;
    w.waveTimer = WAVE_CONFIGS[0].durationSeconds;
    w.spawnTimer = 0.2;
    w.powerUpSpawnTimer = 8;
    w.crateSpawnTimer = 9;
    w.muzzleTimer = 0;
    w.dashGhostTimer = 0;
    w.dashHitIds.clear();
    w.feverAnnounced = false;
    w.bossSpawnedWaves = new Set();
    w.announcedBossPhase = 1;
    w.score = 0;
    w.kills = 0;
    w.combo = 0;
    w.maxCombo = 0;
    w.comboTimer = 0;
    w.xpCombo = 0;
    w.xpComboTimer = 0;
    w.nextEntityId = 1;
    w.shakeMag = 0;
    w.damageFlash = 0;
    w.coffeeTimer = 0;
    w.ctrlZTimer = 0;
    w.auraDamageTimer = 0;
    w.auraNovaTimer = 0;
    w.puddleTickTimer = 0;
    w.weaponHeat = 0;
    w.isOverheated = false;
    w.overheatTimer = 0;
    w.ventBuffTimer = 0;
    w.stylePoints = 15;
    w.ultFlashTimer = 0;
    w.fovPunch = 0;
    w.hitstopTimer = 0;
    w.pointerDown = false;
    w.barrelToggle = 0;
    w.shieldHitTimers.clear();
    w.bannerMessage = 'Đợt 1 · 21:00 Cyber-Lab — Giữ Chuột Trái / nút BẮN để xả đạn, Space Lướt, Q Phản Đạn, R Xả Nhiệt!';
    w.bannerTimer = 4.2;
    w.quoteIndex = 0;
    w.matchEnded = false;
  }, [runSeed]);

  // Apply chosen Roguelite skill upgrade
  useEffect(() => {
    if (!pendingSkillChoice || !worldRef.current) return;
    const w = worldRef.current;
    const p = w.player;
    const def = UPGRADE_SKILLS[pendingSkillChoice];
    const currLv = p.skills[pendingSkillChoice];
    if (currLv < def.maxLevel) {
      p.skills[pendingSkillChoice] = currLv + 1;
      if (pendingSkillChoice === 'mentorAdvice') {
        const hpBonus = 25 + currLv * 5;
        p.maxHp += hpBonus;
        p.hp = Math.min(p.maxHp, p.hp + 35 + currLv * 10);
        if (p.skills.mentorAdvice >= 5) p.hp = p.maxHp;
      }
      if (pendingSkillChoice === 'banMeCoffee') {
        p.maxDashCooldown = Math.max(1.0, 2.1 - p.skills.banMeCoffee * 0.22);
      }
      w.labels.push({
        wx: p.x,
        wy: 2.35,
        wz: p.z,
        text: `+ ${def.name}`,
        color: def.accentColor,
        size: 14,
        life: 1.5,
        maxLife: 1.5,
      });
    }
    onConsumeSkillChoice();
  }, [pendingSkillChoice, onConsumeSkillChoice]);

  useEffect(() => {
    const container = mountRef.current;
    const overlay = overlayRef.current;
    if (!container || !overlay) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const isMobilePerf =
      typeof window !== 'undefined' &&
      (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl && !isMobilePerf,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, isMobilePerf ? 1.35 : 1.5),
    );
    renderer.shadowMap.enabled = !isSoftwareGl && !isMobilePerf;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const initW = container.clientWidth || window.innerWidth;
    const initH = container.clientHeight || window.innerHeight;
    renderer.setSize(initW, initH);
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const scene = new THREE.Scene();
    const initAspect = initW / Math.max(1, initH);
    const initBaseFov = initAspect < 1 ? Math.min(68, 45 / Math.max(0.66, initAspect)) : 45;
    const camera = new THREE.PerspectiveCamera(initBaseFov, initAspect, 0.5, 320);
    camera.position.set(0, 12.6, 15.8);
    camera.lookAt(0, 1.35, 0);

    // Pre-create reusable particle, ring & projectile geometries (zero runtime geometry churn)
    const playerBulletGeo = new THREE.CapsuleGeometry(0.12, 0.52, 4, 8);
    playerBulletGeo.rotateX(Math.PI / 2);
    playerBulletGeo.userData.sharedGeo = true;
    const enemyBulletGeo = new THREE.IcosahedronGeometry(0.29, 0);
    enemyBulletGeo.userData.sharedGeo = true;
    const boulderGeo = new THREE.DodecahedronGeometry(0.85, 0);
    boulderGeo.userData.sharedGeo = true;
    const gemGeo = new THREE.OctahedronGeometry(0.32, 0);
    gemGeo.userData.sharedGeo = true;
    const sparkGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    sparkGeo.userData.sharedGeo = true;
    const petalGeo = new THREE.PlaneGeometry(0.38, 0.18);
    petalGeo.userData.sharedGeo = true;
    const ringGeo = new THREE.RingGeometry(0.4, 0.72, 24);
    ringGeo.userData.sharedGeo = true;
    const domeGeo = new THREE.SphereGeometry(1.2, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
    domeGeo.userData.sharedGeo = true;
    const pillarGeo = new THREE.CylinderGeometry(0.65, 1.5, 18, 16, 1, true);
    pillarGeo.translate(0, 9, 0);
    pillarGeo.userData.sharedGeo = true;
    const meteorBeamGeo = new THREE.CylinderGeometry(0.15, 0.15, 18, 8);
    meteorBeamGeo.translate(0, 9, 0);
    meteorBeamGeo.userData.sharedGeo = true;
    const telegraphStripGeo = new THREE.PlaneGeometry(0.55, 1);
    telegraphStripGeo.translate(0, 0.5, 0);
    telegraphStripGeo.rotateX(-Math.PI / 2);
    telegraphStripGeo.userData.sharedGeo = true;

    // Shared immutable bullet materials (eliminates ~75 material allocations/sec during combat)
    const makeSharedBulletMat = (hex: number) => {
      const m = new THREE.MeshBasicMaterial({ color: hex });
      m.userData.sharedMat = true;
      return m;
    };
    const bulletMatCyan = makeSharedBulletMat(0x06b6d4);
    const bulletMatAmber = makeSharedBulletMat(0xf59e0b);
    const bulletMatGold = makeSharedBulletMat(0xeab308);
    const bulletMatPurple = makeSharedBulletMat(0x9333ea);
    const bulletMatEnemyRed = makeSharedBulletMat(0xe11d48);
    const bulletMatEnemyPink = makeSharedBulletMat(0xf43f5e);
    const bulletMatEnemyOrange = makeSharedBulletMat(0xea580c);
    const telegraphMat = new THREE.MeshBasicMaterial({
      color: 0xe11d48,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    telegraphMat.userData.sharedMat = true;
    const puddleMat = new THREE.MeshBasicMaterial({
      color: 0x9333ea,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    puddleMat.userData.sharedMat = true;

    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    if (!isSoftwareGl) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      // Half-resolution gentle daylight anti-glare bloom
      const bloomScale = 0.5;
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(Math.floor(initW * bloomScale), Math.floor(initH * bloomScale)),
        0.14,
        0.22,
        0.94,
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    }

    const overlayCtx = overlay.getContext('2d');

    const handleResize = () => {
      const cw = container.clientWidth || window.innerWidth;
      const ch = container.clientHeight || window.innerHeight;
      const aspect = cw / Math.max(1, ch);
      camera.aspect = aspect;
      const nextFov = aspect < 1 ? Math.min(68, 45 / Math.max(0.66, aspect)) : 45;
      if (worldRef.current) {
        worldRef.current.baseFov = nextFov;
      }
      camera.fov = nextFov + (worldRef.current?.fovPunch ?? 0);
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
      if (composer && bloomPass) {
        composer.setSize(cw, ch);
        const bs = 0.5;
        bloomPass.resolution.set(Math.floor(cw * bs), Math.floor(ch * bs));
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      overlay.width = Math.floor(cw * dpr);
      overlay.height = Math.floor(ch * dpr);
      if (overlayCtx) overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    let disposed = false;
    let frameId = 0;
    let contactShadowTexRef: THREE.CanvasTexture | null = null;
    let sharedAssetsRef: SharedVisualAssets | null = null;
    let perimeterRingRef: THREE.Mesh | null = null;
    let scanRingRef: THREE.Mesh | null = null;
    let centerSealRef: THREE.Group | null = null;
    let cornerCrystalsRef: THREE.Object3D[] = [];
    let holoPlanetsRef: THREE.Object3D[] = [];
    let firefliesRef: THREE.Points | null = null;

    let maxParticles = isMobilePerf ? 110 : 210;

    const spawnParticles3D = (
      x: number,
      y: number,
      z: number,
      colorHex: number,
      count: number,
      kind: 'spark' | 'petal' = 'spark',
    ) => {
      const w = worldRef.current;
      if (!w || w.particles.length > maxParticles) return;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 3.2 + Math.random() * 8.5;
        const mat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 1,
          side: kind === 'petal' ? THREE.DoubleSide : THREE.FrontSide,
        });
        const mesh = new THREE.Mesh(kind === 'petal' ? petalGeo : sparkGeo, mat);
        mesh.position.set(x, y, z);
        w.scene.add(mesh);
        w.particles.push({
          x,
          y,
          z,
          vx: Math.cos(a) * spd,
          vy: 2.8 + Math.random() * 5.5,
          vz: Math.sin(a) * spd,
          life: kind === 'petal' ? 1.4 : 0.42 + Math.random() * 0.25,
          maxLife: kind === 'petal' ? 1.4 : 0.67,
          kind,
          mesh,
        });
      }
    };

    const spawnRing3D = (x: number, z: number, colorHex: number, maxLife = 0.35) => {
      const w = worldRef.current;
      if (!w) return;
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.08, z);
      w.scene.add(mesh);
      w.particles.push({
        x,
        y: 0.08,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        life: maxLife,
        maxLife,
        kind: 'ring',
        mesh,
      });
    };

    const pushOutOfObstacles = (
      x: number,
      z: number,
      entityRadius: number,
      obstacles: ArenaObstacle[],
    ): { x: number; z: number } => {
      let nx = x;
      let nz = z;
      for (const ob of obstacles) {
        const dx = nx - ob.x;
        const dz = nz - ob.z;
        const minD = ob.radius + entityRadius;
        const d = Math.hypot(dx, dz);
        if (d < minD) {
          if (d < 0.001) {
            nx = ob.x + minD;
          } else {
            nx = ob.x + (dx / d) * minD;
            nz = ob.z + (dz / d) * minD;
          }
        }
      }
      return {
        x: Math.max(-ARENA_HALF_SIZE + 1, Math.min(ARENA_HALF_SIZE - 1, nx)),
        z: Math.max(-ARENA_HALF_SIZE + 1, Math.min(ARENA_HALF_SIZE - 1, nz)),
      };
    };

    const spawnDome3D = (x: number, z: number, colorHex: number, maxLife = 0.68) => {
      const w = worldRef.current;
      if (!w) return;
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(domeGeo, mat);
      mesh.position.set(x, 0.05, z);
      w.scene.add(mesh);
      w.particles.push({
        x,
        y: 0.05,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        life: maxLife,
        maxLife,
        kind: 'dome',
        mesh,
      });
    };

    const spawnPillar3D = (x: number, z: number, colorHex: number, maxLife = 0.85) => {
      const w = worldRef.current;
      if (!w) return;
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.36,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(pillarGeo, mat);
      mesh.position.set(x, 0.05, z);
      w.scene.add(mesh);
      w.particles.push({
        x,
        y: 0.05,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        life: maxLife,
        maxLife,
        kind: 'pillar',
        mesh,
      });
    };

    const getDiffTuning = () => {
      return { hpMult: 1.15, speedMult: 1.12, dmgMult: 1.12, eliteChance: 0.18, scoreMult: 1.0 };
    };

    const computeStyleRank = (pts: number): StyleRank => {
      if (pts >= 92) return 'SS';
      if (pts >= 76) return 'S';
      if (pts >= 58) return 'A';
      if (pts >= 40) return 'B';
      if (pts >= 22) return 'C';
      return 'D';
    };

    const spawnEnemy3D = (
      type: EnemyArchetype,
      customX?: number,
      customZ?: number,
      forceElite?: boolean,
    ) => {
      const w = worldRef.current;
      if (!w) return;
      const dtune = getDiffTuning();
      const waveScale = (1 + w.waveIndex * 0.28) * dtune.hpMult;
      const isBossType = type === 'miniBoss404' || type === 'bossDeadline';
      const isElite =
        !isBossType &&
        (forceElite ?? (w.waveIndex >= 1 && Math.random() < dtune.eliteChance));

      let x = customX ?? 0;
      let z = customZ ?? 0;
      if (customX === undefined || customZ === undefined) {
        const angle = Math.random() * Math.PI * 2;
        const ringDist = 28 + Math.random() * 14;
        const rawX = Math.max(-ARENA_HALF_SIZE + 2, Math.min(ARENA_HALF_SIZE - 2, w.player.x + Math.cos(angle) * ringDist));
        const rawZ = Math.max(-ARENA_HALF_SIZE + 2, Math.min(ARENA_HALF_SIZE - 2, w.player.z + Math.sin(angle) * ringDist));
        const safe = pushOutOfObstacles(rawX, rawZ, 1.5, w.obstacles);
        x = safe.x;
        z = safe.z;
      }

      const { group, bossRefs } = createEnemyMesh(
        type,
        w.shared,
        w.kenney,
        { isElite },
      );
      group.position.set(x, 0, z);
      w.scene.add(group);

      const id = w.nextEntityId++;
      const defs: Record<
        EnemyArchetype,
        {
          name: string;
          radius: number;
          hp: number;
          speed: number;
          damage: number;
          xp: number;
          score: number;
          isBoss?: boolean;
        }
      > = {
        syntax: {
          name: 'Thiếu dấu ;',
          radius: 0.78,
          hp: Math.round(34 * waveScale),
          speed: (6.3 + Math.random() * 1.1) * dtune.speedMult,
          damage: Math.round(12 * dtune.dmgMult),
          xp: 10,
          score: 38,
        },
        nullPtr: {
          name: 'NullPointer',
          radius: 0.92,
          hp: Math.round(52 * waveScale),
          speed: 5.8 * dtune.speedMult,
          damage: Math.round(16 * dtune.dmgMult),
          xp: 15,
          score: 65,
        },
        loop: {
          name: 'while(true)',
          radius: 1.05,
          hp: Math.round(78 * waveScale),
          speed: 4.8 * dtune.speedMult,
          damage: Math.round(15 * dtune.dmgMult),
          xp: 18,
          score: 85,
        },
        memLeak: {
          name: 'Chrome 16GB RAM',
          radius: 1.25,
          hp: Math.round(155 * waveScale),
          speed: 3.6 * dtune.speedMult,
          damage: Math.round(20 * dtune.dmgMult),
          xp: 28,
          score: 130,
        },
        conflict: {
          name: 'Merge Conflict',
          radius: 1.0,
          hp: Math.round(64 * waveScale),
          speed: 5.1 * dtune.speedMult,
          damage: Math.round(15 * dtune.dmgMult),
          xp: 20,
          score: 98,
        },
        miniBoss404: {
          name: '404 · MẤT SLIDE THUYẾT TRÌNH',
          radius: 2.15,
          hp: Math.round(2450 * dtune.hpMult),
          speed: 4.35 * dtune.speedMult,
          damage: Math.round(24 * dtune.dmgMult),
          xp: 140,
          score: 1650,
          isBoss: true,
        },
        bossDeadline: {
          name: 'DEADLINE 23:59 · ĐỒ ÁN TỐI HẬU',
          radius: 3.35,
          hp: Math.round(6500 * dtune.hpMult),
          speed: 3.85 * dtune.speedMult,
          damage: Math.round(28 * dtune.dmgMult),
          xp: 240,
          score: 5200,
          isBoss: true,
        },
      };

      const d = defs[type];
      const eliteHpMult = isElite ? 2.15 : 1;
      const eliteSpeedMult = isElite ? 1.18 : 1;
      const eliteScoreMult = isElite ? 2.2 : 1;
      const finalHp = Math.round(d.hp * eliteHpMult);
      w.enemies.push({
        id,
        type,
        name: isElite ? `${d.name} [Tinh Anh]` : d.name,
        x,
        z,
        vx: 0,
        vz: 0,
        radius: isElite ? d.radius * 1.22 : d.radius,
        hp: finalHp,
        maxHp: finalHp,
        speed: d.speed * eliteSpeedMult,
        damage: Math.round(d.damage * (isElite ? 1.25 : 1)),
        xpValue: Math.round(d.xp * (isElite ? 2 : 1)),
        scoreValue: Math.round(d.score * eliteScoreMult * dtune.scoreMult),
        hitFlash: 0,
        knockX: 0,
        knockZ: 0,
        stateTimer: 1.1 + Math.random() * 0.6,
        isElite,
        isBoss: d.isBoss,
        bossPhase: d.isBoss ? 1 : undefined,
        attackCycle: 0,
        mesh: group,
        bossRefs,
      });
    };

    const spawnPowerUp3D = (x: number, z: number, type?: PowerUpType) => {
      const w = worldRef.current;
      if (!w) return;
      const safe = pushOutOfObstacles(x, z, 1.3, w.obstacles);
      const pool: PowerUpType[] = ['coffeeBoost', 'teacherUsb', 'ctrlZ'];
      const chosen = type ?? pool[Math.floor(Math.random() * pool.length)];
      const mesh = createPowerUpMesh(chosen);
      mesh.position.set(safe.x, 0, safe.z);
      w.scene.add(mesh);
      w.powerUps.push({ x: safe.x, z: safe.z, type: chosen, life: 16, mesh });
    };

    const spawnCrate3D = () => {
      const w = worldRef.current;
      if (!w || w.crates.length >= 3) return;
      const rawX = (Math.random() - 0.5) * (ARENA_HALF_SIZE * 1.45);
      const rawZ = (Math.random() - 0.5) * (ARENA_HALF_SIZE * 1.45);
      const safe = pushOutOfObstacles(rawX, rawZ, 1.4, w.obstacles);
      const mesh = createSupplyCrateMesh(w.kenney);
      mesh.position.set(safe.x, 0, safe.z);
      w.scene.add(mesh);
      w.crates.push({
        id: w.nextEntityId++,
        x: safe.x,
        z: safe.z,
        hp: 40,
        hitFlash: 0,
        mesh,
      });
    };

    const openSupplyCrate = (crateIdx: number) => {
      const w = worldRef.current;
      if (!w) return;
      const cr = w.crates[crateIdx];
      spawnRing3D(cr.x, cr.z, 0xfacc15, 0.5);
      spawnParticles3D(cr.x, 1.0, cr.z, 0xfacc15, 14, 'spark');
      soundEngine.playLevelUp();
      spawnPowerUp3D(cr.x, cr.z);
      for (let g = 0; g < 3; g++) {
        const gMesh = new THREE.Mesh(gemGeo, w.shared.crystalGemMatGold);
        const gx = cr.x + (Math.random() - 0.5) * 1.8;
        const gz = cr.z + (Math.random() - 0.5) * 1.8;
        gMesh.position.set(gx, 0.55, gz);
        w.scene.add(gMesh);
        w.xpGems.push({
          x: gx,
          z: gz,
          vx: (Math.random() - 0.5) * 5,
          vz: (Math.random() - 0.5) * 5,
          value: 14,
          isGold: true,
          phase: Math.random() * Math.PI * 2,
          mesh: gMesh,
        });
      }
      w.labels.push({
        wx: cr.x,
        wy: 2.2,
        wz: cr.z,
        text: 'TIẾP TẾ ĐHTN!',
        color: '#facc15',
        size: 13,
        life: 1.1,
        maxLife: 1.1,
      });
      w.scene.remove(cr.mesh);
      disposeObject3D(cr.mesh);
      w.crates.splice(crateIdx, 1);
    };

    const triggerDash = () => {
      const w = worldRef.current;
      if (!w || screenRef.current !== 'PLAYING') return;
      const p = w.player;
      if (p.dashCooldown > 0 || p.dashTimer > 0) return;

      let dx = 0;
      let dz = 0;
      if (w.keys.has('KeyW') || w.keys.has('ArrowUp')) dz -= 1;
      if (w.keys.has('KeyS') || w.keys.has('ArrowDown')) dz += 1;
      if (w.keys.has('KeyA') || w.keys.has('ArrowLeft')) dx -= 1;
      if (w.keys.has('KeyD') || w.keys.has('ArrowRight')) dx += 1;
      if (touchJoyRef.current.active) {
        dx = touchJoyRef.current.dx;
        dz = touchJoyRef.current.dy;
      }
      const len = Math.hypot(dx, dz);
      if (len > 0.05) {
        p.dashDirX = dx / len;
        p.dashDirZ = dz / len;
      } else {
        p.dashDirX = Math.sin(p.aimAngle);
        p.dashDirZ = Math.cos(p.aimAngle);
      }
      p.dashTimer = 0.18;
      p.invulnTimer = Math.max(p.invulnTimer, 0.32);
      p.dashCooldown = p.maxDashCooldown;
      w.fovPunch = 3.2;
      w.dashHitIds.clear();
      w.dashGhostTimer = 0;
      soundEngine.playDash();
      spawnRing3D(p.x, p.z, 0x06b6d4, 0.42);
      spawnParticles3D(p.x, 0.6, p.z, 0x22d3ee, 10, 'spark');
    };

    const triggerUltimate = () => {
      const w = worldRef.current;
      if (!w || screenRef.current !== 'PLAYING') return;
      const p = w.player;
      if (p.ultCharge < 100) return;

      p.ultCharge = 0;
      p.hp = Math.min(p.maxHp, p.hp + 20);
      p.invulnTimer = Math.max(p.invulnTimer, 1.3);
      w.shakeMag = 0.72;
      w.ultFlashTimer = 1.0;
      w.fovPunch = -5.5;
      soundEngine.playUltimate();

      for (let i = w.projectiles.length - 1; i >= 0; i--) {
        if (!w.projectiles[i].fromPlayer) {
          w.scene.remove(w.projectiles[i].mesh);
          disposeObject3D(w.projectiles[i].mesh);
          w.projectiles.splice(i, 1);
        }
      }

      spawnDome3D(p.x, p.z, 0xfacc15, 0.72);
      spawnRing3D(p.x, p.z, 0xfacc15, 0.76);
      spawnRing3D(p.x, p.z, 0x22d3ee, 0.55);
      spawnParticles3D(p.x, 1.2, p.z, 0xfacc15, 42, 'petal');
      spawnParticles3D(p.x, 1.0, p.z, 0x22d3ee, 16, 'spark');
      w.hitstopTimer = 0.045;

      for (const e of w.enemies) {
        const dmg = e.isBoss ? 340 : 280;
        e.hp -= dmg;
        e.hitFlash = 0.28;
        w.labels.push({
          wx: e.x,
          wy: e.isBoss ? 3.4 : 1.9,
          wz: e.z,
          text: `${dmg}!`,
          color: '#facc15',
          size: 16,
          life: 0.9,
          maxLife: 0.9,
        });
      }

      const quote = TEACHER_ULTIMATE_QUOTES[w.quoteIndex % TEACHER_ULTIMATE_QUOTES.length];
      w.quoteIndex += 1;
      w.bannerMessage = quote;
      w.bannerTimer = 4.2;
    };

    const triggerShockwave = () => {
      const w = worldRef.current;
      if (!w || screenRef.current !== 'PLAYING') return;
      const p = w.player;
      if (p.shockwaveCooldown > 0) return;

      p.shockwaveCooldown = p.maxShockwaveCooldown;
      p.invulnTimer = Math.max(p.invulnTimer, 0.38);
      w.shakeMag = Math.max(w.shakeMag, 0.48);
      w.fovPunch = -2.8;
      w.hitstopTimer = 0.032;
      soundEngine.playShockwave();

      const shockRadius = 8.6;
      spawnRing3D(p.x, p.z, 0xd946ef, 0.4);
      spawnRing3D(p.x, p.z, 0x22d3ee, 0.32);
      spawnRing3D(p.x, p.z, 0xfacc15, 0.24);
      spawnParticles3D(p.x, 0.9, p.z, 0xd946ef, 18, 'spark');
      spawnParticles3D(p.x, 0.9, p.z, 0x22d3ee, 10, 'petal');

      // Parry & convert enemy bullets in blast radius into Golden Homing Counter-Bolts!
      let parriedCount = 0;
      let counterBoltsSpawned = 0;
      for (let i = w.projectiles.length - 1; i >= 0; i--) {
        const pr = w.projectiles[i];
        if (!pr.fromPlayer && Math.hypot(pr.x - p.x, pr.z - p.z) <= shockRadius) {
          parriedCount += 1;
          spawnParticles3D(pr.x, 0.85, pr.z, 0xfacc15, 3, 'spark');

          if (counterBoltsSpawned < 6 && w.enemies.length > 0) {
            let bestTarget: Enemy3D | null = null;
            let bestDist = Infinity;
            for (const cand of w.enemies) {
              const cd = Math.hypot(cand.x - pr.x, cand.z - pr.z);
              if (cd < bestDist) {
                bestDist = cd;
                bestTarget = cand;
              }
            }
            if (bestTarget) {
              counterBoltsSpawned += 1;
              const ang = Math.atan2(bestTarget.x - pr.x, bestTarget.z - pr.z);
              const cMesh = new THREE.Mesh(playerBulletGeo, bulletMatGold);
              cMesh.position.set(pr.x, 1.05, pr.z);
              cMesh.rotation.y = ang;
              cMesh.scale.set(1.45, 1.45, 2.0);
              w.scene.add(cMesh);
              w.projectiles.push({
                x: pr.x,
                z: pr.z,
                vx: Math.sin(ang) * 34,
                vz: Math.cos(ang) * 34,
                radius: 0.45,
                damage: 55 + p.level * 10,
                fromPlayer: true,
                pierce: 2,
                hitIds: new Set(),
                life: 1.5,
                isCrit: true,
                mesh: cMesh,
              });
            }
          }

          w.scene.remove(pr.mesh);
          disposeObject3D(pr.mesh);
          w.projectiles.splice(i, 1);
        }
      }
      if (parriedCount > 0) {
        const ultGain = Math.min(30, parriedCount * 2.8);
        p.ultCharge = Math.min(100, p.ultCharge + ultGain);
        w.score += parriedCount * 35;
        w.stylePoints = Math.min(100, w.stylePoints + Math.min(20, parriedCount * 3.5));
        w.labels.push({
          wx: p.x,
          wy: 2.55,
          wz: p.z,
          text: `PHẢN KIẾM ${parriedCount} ĐẠN! +${Math.round(ultGain)}%`,
          color: '#e879f9',
          size: 13,
          life: 0.95,
          maxLife: 0.95,
        });
      }

      const shockDmg = 72 + p.level * 14 + p.skills.mentorAdvice * 12;
      for (const e of w.enemies) {
        const dx = e.x - p.x;
        const dz = e.z - p.z;
        const d = Math.hypot(dx, dz) || 0.1;
        if (d <= shockRadius + e.radius) {
          e.hp -= shockDmg;
          e.hitFlash = 0.14;
          const kb = e.isBoss ? 2.2 : 14.5;
          e.knockX += (dx / d) * kb;
          e.knockZ += (dz / d) * kb;
          w.labels.push({
            wx: e.x,
            wy: e.isBoss ? 3.2 : 1.9,
            wz: e.z,
            text: `${shockDmg}!`,
            color: '#e879f9',
            size: 15,
            life: 0.65,
            maxLife: 0.65,
          });
        }
      }

      for (let ci = w.crates.length - 1; ci >= 0; ci--) {
        const cr = w.crates[ci];
        if (Math.hypot(cr.x - p.x, cr.z - p.z) <= shockRadius) {
          openSupplyCrate(ci);
        }
      }
    };

    const triggerPerfectVent = () => {
      const w = worldRef.current;
      if (!w || screenRef.current !== 'PLAYING') return;
      const p = w.player;
      if (w.weaponHeat < 35 && !w.isOverheated) return;

      const hotBonus = w.weaponHeat >= 65 && !w.isOverheated;
      w.weaponHeat = 0;
      w.isOverheated = false;
      w.overheatTimer = 0;
      if (hotBonus) {
        w.ventBuffTimer = 3.8;
        w.stylePoints = Math.min(100, w.stylePoints + 12);
      }
      w.hitstopTimer = 0.025;
      w.shakeMag = Math.max(w.shakeMag, 0.36);
      soundEngine.playShockwave();
      spawnRing3D(p.x, p.z, hotBonus ? 0xf97316 : 0x38bdf8, 0.38);
      spawnParticles3D(p.x, 1.0, p.z, hotBonus ? 0xfacc15 : 0x38bdf8, 16, 'spark');

      const ventRadius = hotBonus ? 7.2 : 5.2;
      const ventDmg = (hotBonus ? 62 : 34) + p.level * 9;
      for (const e of w.enemies) {
        const dx = e.x - p.x;
        const dz = e.z - p.z;
        const d = Math.hypot(dx, dz) || 0.1;
        if (d <= ventRadius + e.radius) {
          e.hp -= ventDmg;
          e.hitFlash = 0.12;
          const kb = e.isBoss ? 1.5 : 11;
          e.knockX += (dx / d) * kb;
          e.knockZ += (dz / d) * kb;
        }
      }
      w.labels.push({
        wx: p.x,
        wy: 2.35,
        wz: p.z,
        text: hotBonus ? 'XẢ HOÀN HẢO · +30% TỐC BẮN!' : 'XẢ NHIỆT!',
        color: hotBonus ? '#fb923c' : '#38bdf8',
        size: 13,
        life: 1.05,
        maxLife: 1.05,
      });
    };

    triggerDashRef.current = triggerDash;
    triggerShockwaveRef.current = triggerShockwave;
    triggerUltRef.current = triggerUltimate;
    triggerVentRef.current = triggerPerfectVent;

    const onKeyDown = (e: KeyboardEvent) => {
      soundEngine.unlock();
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (screenRef.current === 'PLAYING' || screenRef.current === 'PAUSED') {
          onPauseToggle();
          return;
        }
      }
      const w = worldRef.current;
      if (!w) return;
      w.keys.add(e.code);
      if ((e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'KeyK') && screenRef.current === 'PLAYING') {
        e.preventDefault();
        triggerDash();
      }
      if ((e.code === 'KeyQ' || e.code === 'KeyL') && screenRef.current === 'PLAYING') {
        e.preventDefault();
        triggerShockwave();
      }
      if ((e.code === 'KeyE' || e.code === 'KeyO') && screenRef.current === 'PLAYING') {
        e.preventDefault();
        triggerUltimate();
      }
      if ((e.code === 'KeyR' || e.code === 'KeyU') && screenRef.current === 'PLAYING') {
        e.preventDefault();
        triggerPerfectVent();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      worldRef.current?.keys.delete(e.code);
    };

    const onPointerMove = (e: PointerEvent) => {
      const w = worldRef.current;
      if (!w) return;
      const rect = renderer.domElement.getBoundingClientRect();
      w.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      w.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerUpGlobal = () => {
      if (worldRef.current) worldRef.current.pointerDown = false;
      mobileFireRef.current = false;
      mobileAimDragRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (screenRef.current !== 'PLAYING') return;
      const next = Math.max(0.65, Math.min(1.4, cameraZoomRef.current + (e.deltaY > 0 ? 0.08 : -0.08)));
      onCameraZoomChangeRef.current(Number(next.toFixed(2)));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUpGlobal);
    window.addEventListener('blur', onPointerUpGlobal);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

    const pickLevelChoices = (skills: Record<SkillId, number>): SkillId[] => {
      const available = (Object.keys(UPGRADE_SKILLS) as SkillId[]).filter(
        (id) => skills[id] < UPGRADE_SKILLS[id].maxLevel,
      );
      return [...available].sort(() => Math.random() - 0.5).slice(0, 3);
    };

    const buildSummary = (victory: boolean): MatchSummary => {
      const w = worldRef.current!;
      const score = w.score;
      let rank: MatchSummary['rank'] = 'C';
      if (victory && score >= 14000) rank = 'S+';
      else if (victory && score >= 9000) rank = 'S';
      else if (victory || score >= 5500) rank = 'A';
      else if (score >= 2800) rank = 'B';

      const funnyTitle = victory
        ? rank === 'S+'
          ? 'Thánh Debug Bất Tử ĐHTN'
          : 'Chiến Thần Nộp Đồ Án Trước 23:59'
        : w.kills >= 45
          ? 'Chiến Binh Cà Phê Ban Mê'
          : 'Sinh Viên Quên Git Push';

      return {
        victory,
        score,
        kills: w.kills,
        maxCombo: w.maxCombo,
        elapsedSeconds: Math.round(w.elapsedSeconds),
        levelReached: w.player.level,
        waveReached: w.waveIndex + 1,
        difficulty: 'standard',
        skills: { ...w.player.skills },
        rank,
        funnyTitle,
      };
    };

    const stepSimulation = (dt: number) => {
      const w = worldRef.current;
      if (!w || w.matchEnded) return;
      const p = w.player;

      w.time += dt;
      w.elapsedSeconds += dt;
      w.shakeMag = Math.max(0, w.shakeMag - dt * 2.6);
      w.damageFlash = Math.max(0, w.damageFlash - dt * 2.5);
      w.coffeeTimer = Math.max(0, w.coffeeTimer - dt);
      w.ctrlZTimer = Math.max(0, w.ctrlZTimer - dt);
      w.ultFlashTimer = Math.max(0, w.ultFlashTimer - dt * 1.45);
      w.fovPunch = THREE.MathUtils.damp(w.fovPunch, 0, 7.5, dt);

      if (w.hitstopTimer > 0) {
        w.hitstopTimer = Math.max(0, w.hitstopTimer - dt);
        return;
      }

      if (w.comboTimer > 0) {
        w.comboTimer -= dt;
        if (w.comboTimer <= 0) {
          w.combo = 0;
          w.feverAnnounced = false;
        }
      }
      if (w.combo >= 15 && !w.feverAnnounced) {
        w.feverAnnounced = true;
        w.bannerMessage = 'XUẤT THẦN COMBO x15+ · Bắn nhanh thêm 20%!';
        w.bannerTimer = 2.6;
      }
      if (w.xpComboTimer > 0) {
        w.xpComboTimer -= dt;
        if (w.xpComboTimer <= 0) w.xpCombo = 0;
      }
      if (w.bannerTimer > 0) {
        w.bannerTimer -= dt;
        if (w.bannerTimer <= 0) w.bannerMessage = null;
      }

      if (perimeterRingRef) perimeterRingRef.rotation.z = w.time * 0.12;
      if (centerSealRef) centerSealRef.rotation.y = w.time * 0.22;
      if (firefliesRef) firefliesRef.rotation.y = w.time * 0.03;
      if (scanRingRef) {
        const scanCycle = (w.time * 0.34) % 1;
        const scanScale = 2 + scanCycle * (ARENA_HALF_SIZE * 1.3);
        scanRingRef.scale.setScalar(scanScale);
        (scanRingRef.material as THREE.MeshBasicMaterial).opacity = (1 - scanCycle) * 0.28;
      }
      holoPlanetsRef.forEach((hp, idx) => {
        hp.rotation.y = w.time * 0.4 + idx * 0.75;
      });
      cornerCrystalsRef.forEach((cr, idx) => {
        cr.rotation.y = w.time * 1.4 + idx;
        cr.position.y = 7.4 + Math.sin(w.time * 2.2 + idx) * 0.35;
      });

      const cw = WAVE_CONFIGS[w.waveIndex];
      const hasBossAlive = w.enemies.some((e) => e.isBoss);

      if (cw.bossType && !w.bossSpawnedWaves.has(cw.wave)) {
        w.bossSpawnedWaves.add(cw.wave);
        spawnEnemy3D(cw.bossType, 0, -ARENA_HALF_SIZE + 8.5);
        soundEngine.playBossWarning();
        soundEngine.setMood('BOSS');
        w.shakeMag = 0.55;
        w.bannerMessage =
          cw.bossType === 'bossDeadline'
            ? 'CẢNH BÁO · BOSS DEADLINE 23:59 ĐÃ THỨC TỈNH!'
            : 'CẢNH BÁO · MINI-BOSS 404 MẤT SLIDE THUYẾT TRÌNH!';
        w.bannerTimer = 4.2;
      }

      if (!cw.bossType) {
        w.waveTimer -= dt;
        if (w.waveTimer <= 0 && w.waveIndex < WAVE_CONFIGS.length - 1) {
          w.waveIndex += 1;
          const nw = WAVE_CONFIGS[w.waveIndex];
          w.waveTimer = nw.durationSeconds;
          w.bannerMessage = nw.label;
          w.bannerTimer = 3.6;
        }
      } else if (cw.bossType === 'miniBoss404' && !hasBossAlive && w.bossSpawnedWaves.has(cw.wave)) {
        if (w.waveIndex < WAVE_CONFIGS.length - 1) {
          w.waveIndex += 1;
          const nw = WAVE_CONFIGS[w.waveIndex];
          w.waveTimer = nw.durationSeconds;
          w.bannerMessage = nw.label;
          w.bannerTimer = 3.6;
          soundEngine.setMood('COMBAT');
        }
      }

      const dtune = getDiffTuning();
      w.ventBuffTimer = Math.max(0, w.ventBuffTimer - dt);
      w.stylePoints = Math.max(10, w.stylePoints - dt * 2.2);

      w.spawnTimer -= dt;
      if (w.spawnTimer <= 0 && w.enemies.length < 56) {
        w.spawnTimer = cw.spawnInterval;
        const pool = cw.allowedTypes;
        spawnEnemy3D(pool[Math.floor(Math.random() * pool.length)]);
      }

      w.powerUpSpawnTimer -= dt;
      if (w.powerUpSpawnTimer <= 0 && w.powerUps.length < 4) {
        w.powerUpSpawnTimer = 14.5;
        spawnPowerUp3D(
          (Math.random() - 0.5) * (ARENA_HALF_SIZE * 1.45),
          (Math.random() - 0.5) * (ARENA_HALF_SIZE * 1.45),
        );
      }

      w.crateSpawnTimer -= dt;
      if (w.crateSpawnTimer <= 0) {
        w.crateSpawnTimer = 16;
        spawnCrate3D();
      }

      let inSlowZone = false;
      for (const hz of w.hazards) {
        if (hz.type === 'slow' && Math.hypot(p.x - hz.x, p.z - hz.z) < hz.radius) {
          inSlowZone = true;
          break;
        }
      }
      if (inSlowZone) {
        w.puddleTickTimer -= dt;
        if (w.puddleTickTimer <= 0 && p.invulnTimer <= 0) {
          w.puddleTickTimer = 0.65;
          const tickDmg = Math.round(6 * dtune.dmgMult);
          p.hp -= tickDmg;
          w.damageFlash = Math.max(w.damageFlash, 0.45);
          w.stylePoints = Math.max(0, w.stylePoints - 6);
          soundEngine.playPlayerDamage();
          w.labels.push({
            wx: p.x,
            wy: 2.0,
            wz: p.z,
            text: `-${tickDmg} RAM!`,
            color: '#c084fc',
            size: 13,
            life: 0.65,
            maxLife: 0.65,
          });
        }
      } else {
        w.puddleTickTimer = 0.15;
      }

      const coffeeSpeedMult = w.coffeeTimer > 0 ? 1.38 : 1;
      const moveSpeed = 11.4 * (1 + p.skills.banMeCoffee * 0.09) * coffeeSpeedMult * (inSlowZone ? 0.58 : 1);

      p.dashCooldown = Math.max(0, p.dashCooldown - dt);
      p.shockwaveCooldown = Math.max(0, p.shockwaveCooldown - dt);
      p.invulnTimer = Math.max(0, p.invulnTimer - dt);
      p.blasterRecoil = Math.max(0, p.blasterRecoil - dt * 6.5);
      w.muzzleTimer = Math.max(0, w.muzzleTimer - dt);
      p.shieldAngle += dt * (2.6 + p.skills.tryCatch * 0.45);

      if (p.dashTimer > 0) {
        p.dashTimer -= dt;
        p.vx = p.dashDirX * 32;
        p.vz = p.dashDirZ * 32;
        w.dashGhostTimer -= dt;
        if (w.dashGhostTimer <= 0) {
          w.dashGhostTimer = 0.032;
          spawnParticles3D(p.x, 0.85, p.z, 0x22d3ee, 3, 'spark');
          spawnRing3D(p.x, p.z, 0x22d3ee, 0.24);
        }
        // Dash Strike Shockwave hits enemies along dash path
        for (const e of w.enemies) {
          if (!w.dashHitIds.has(e.id) && Math.hypot(e.x - p.x, e.z - p.z) < e.radius + p.radius + 1.5) {
            w.dashHitIds.add(e.id);
            const dashDmg = 48 + p.level * 6;
            e.hp -= dashDmg;
            e.hitFlash = 0.12;
            const kDist = Math.hypot(e.x - p.x, e.z - p.z) || 1;
            e.knockX += ((e.x - p.x) / kDist) * 10;
            e.knockZ += ((e.z - p.z) / kDist) * 10;
            soundEngine.playHit(true);
            spawnParticles3D(e.x, 0.9, e.z, 0x22d3ee, 5, 'spark');
            w.labels.push({
              wx: e.x,
              wy: 2.0,
              wz: e.z,
              text: `${dashDmg}!`,
              color: '#22d3ee',
              size: 14,
              life: 0.6,
              maxLife: 0.6,
            });
          }
        }
      } else {
        let mx = 0;
        let mz = 0;
        if (w.keys.has('KeyW') || w.keys.has('ArrowUp')) mz -= 1;
        if (w.keys.has('KeyS') || w.keys.has('ArrowDown')) mz += 1;
        if (w.keys.has('KeyA') || w.keys.has('ArrowLeft')) mx -= 1;
        if (w.keys.has('KeyD') || w.keys.has('ArrowRight')) mx += 1;
        if (touchJoyRef.current.active) {
          mx += touchJoyRef.current.dx;
          mz += touchJoyRef.current.dy;
        }
        const mLen = Math.hypot(mx, mz);
        if (mLen > 0.05) {
          p.vx = THREE.MathUtils.damp(p.vx, (mx / mLen) * moveSpeed, 17, dt);
          p.vz = THREE.MathUtils.damp(p.vz, (mz / mLen) * moveSpeed, 17, dt);
        } else {
          p.vx = THREE.MathUtils.damp(p.vx, 0, 14, dt);
          p.vz = THREE.MathUtils.damp(p.vz, 0, 14, dt);
        }
      }

      const nextPlayer = pushOutOfObstacles(
        p.x + p.vx * dt,
        p.z + p.vz * dt,
        p.radius,
        w.obstacles,
      );
      p.x = nextPlayer.x;
      p.z = nextPlayer.z;

      // Update & Trigger 4 Holo-Table "Điểm Ký Ức Tri Ân 20/11" Beacons (separate from terrain pillars)
      w.beacons.forEach((ob, bIdx) => {
        w.beaconCooldowns[bIdx] = Math.max(0, (w.beaconCooldowns[bIdx] ?? 0) - dt);
        const pad = w.beaconPads[bIdx];
        const ready = w.beaconCooldowns[bIdx] <= 0;
        if (pad) {
          const mat = pad.material as THREE.MeshBasicMaterial;
          if (ready) {
            mat.color.setHex(0xeab308);
            mat.opacity = 0.45 + Math.sin(w.time * 4.5 + bIdx) * 0.16;
            pad.scale.setScalar(1 + Math.sin(w.time * 4 + bIdx) * 0.05);
          } else {
            mat.color.setHex(0x0284c7);
            mat.opacity = 0.14;
            pad.scale.setScalar(1);
          }
        }
        if (ready && Math.hypot(p.x - ob.x, p.z - ob.z) < ob.radius + p.radius + 1.2) {
          w.beaconCooldowns[bIdx] = 26;
          p.hp = Math.min(p.maxHp, p.hp + 12);
          p.ultCharge = Math.min(100, p.ultCharge + 16);
          w.score += 180;
          w.stylePoints = Math.min(100, w.stylePoints + 8);
          soundEngine.playBeacon();
          spawnRing3D(ob.x, ob.z, 0xeab308, 0.45);
          spawnParticles3D(ob.x, 1.4, ob.z, 0xeab308, 10, 'petal');
          w.labels.push({
            wx: ob.x,
            wy: 2.6,
            wz: ob.z,
            text: '+12 HP · KÝ ỨC 20/11!',
            color: '#facc15',
            size: 14,
            life: 1.35,
            maxLife: 1.35,
          });
          w.bannerMessage = TRIBUTE_BEACON_MEMORIES[bIdx % TRIBUTE_BEACON_MEMORIES.length];
          w.bannerTimer = 3.8;
          for (const e of w.enemies) {
            const edx = e.x - ob.x;
            const edz = e.z - ob.z;
            const ed = Math.hypot(edx, edz) || 0.1;
            if (ed < 6.5 && !e.isBoss) {
              e.knockX += (edx / ed) * 11;
              e.knockZ += (edz / ed) * 11;
              e.hp -= 40;
              e.hitFlash = 0.12;
            }
          }
        }
      });

      // Interactive crates collision with player
      for (let ci = w.crates.length - 1; ci >= 0; ci--) {
        const cr = w.crates[ci];
        cr.mesh.rotation.y += dt * 1.4;
        cr.mesh.position.y = Math.sin(w.time * 3 + ci) * 0.14;
        if (Math.hypot(p.x - cr.x, p.z - cr.z) < p.radius + 1.05) {
          openSupplyCrate(ci);
        }
      }

      // Pure Manual Aiming & Ground Reticle (No Auto-Aim!)
      w.targetLockReticle.visible = false;
      let reticleX = p.x + Math.sin(p.aimAngle) * 6.8;
      let reticleZ = p.z + Math.cos(p.aimAngle) * 6.8;
      if (isTouchDevice) {
        // If left thumb moves and right thumb isn't actively dragging aim, orient naturally along movement
        if (touchJoyRef.current.active && !mobileAimDragRef.current) {
          const jLen = Math.hypot(touchJoyRef.current.dx, touchJoyRef.current.dy);
          if (jLen > 0.15) {
            p.aimAngle = Math.atan2(touchJoyRef.current.dx, touchJoyRef.current.dy);
          }
        }
        reticleX = p.x + Math.sin(p.aimAngle) * 6.8;
        reticleZ = p.z + Math.cos(p.aimAngle) * 6.8;
        w.aimReticle.visible = true;
      } else {
        _pointerNdc.set(w.pointerNdc.x, w.pointerNdc.y);
        _raycaster.setFromCamera(_pointerNdc, camera);
        if (_raycaster.ray.intersectPlane(_groundPlane, _mouseWorld)) {
          p.aimAngle = Math.atan2(_mouseWorld.x - p.x, _mouseWorld.z - p.z);
          reticleX = _mouseWorld.x;
          reticleZ = _mouseWorld.z;
          w.aimReticle.visible = true;
        } else {
          w.aimReticle.visible = false;
        }
      }
      w.aimReticle.position.set(reticleX, 0, reticleZ);
      w.aimReticle.rotation.y = w.time * 2.5;

      // Sync Hero 3D Articulation (Skeletal AnimationMixer + Fallbacks + Dynamic Light)
      w.hero.root.position.set(p.x, 0, p.z);
      w.hero.bodyPivot.rotation.y = p.aimAngle;
      const moveSpdNow = Math.hypot(p.vx, p.vz);
      const isMovingNow = moveSpdNow > 0.85;
      const tiltMag = Math.min(0.26, moveSpdNow * 0.016);
      w.hero.bodyPivot.rotation.x = THREE.MathUtils.damp(
        w.hero.bodyPivot.rotation.x,
        tiltMag * 0.65,
        10,
        dt,
      );

      if (w.hero.mixer) {
        if (w.hero.idleAction && w.hero.runAction) {
          if (isMovingNow !== w.heroMoving) {
            w.heroMoving = isMovingNow;
            if (isMovingNow) {
              w.hero.runAction.reset().play();
              w.hero.idleAction.crossFadeTo(w.hero.runAction, 0.16, true);
            } else {
              w.hero.idleAction.reset().play();
              w.hero.runAction.crossFadeTo(w.hero.idleAction, 0.18, true);
            }
          }
          if (isMovingNow) {
            w.hero.runAction.timeScale = p.dashTimer > 0 ? 1.95 : w.coffeeTimer > 0 ? 1.5 : 1.15;
          }
        }
        w.hero.mixer.update(dt);
      } else {
        w.hero.bodyPivot.position.y = Math.sin(w.time * (moveSpdNow > 1 ? 12 : 4)) * 0.06;
      }

      if (w.hero.leftLeg && w.hero.rightLeg) {
        const stride = isMovingNow ? Math.sin(w.time * 16) * 0.55 : 0;
        w.hero.leftLeg.rotation.x = stride;
        w.hero.rightLeg.rotation.x = -stride;
      }
      w.hero.scarf.rotation.x = 0.25 + Math.sin(w.time * 10) * (moveSpdNow > 1 ? 0.25 : 0.06);
      w.hero.tassel.rotation.z = Math.sin(w.time * 7) * 0.2;

      const recoilZ = 0.36 - p.blasterRecoil * 0.18;
      w.hero.leftBlaster.position.z = recoilZ - (w.barrelToggle === 0 ? p.blasterRecoil * 0.08 : 0);
      w.hero.rightBlaster.position.z = recoilZ - (w.barrelToggle === 1 ? p.blasterRecoil * 0.08 : 0);
      if (w.hero.leftArm && w.hero.rightArm) {
        w.hero.leftArm.rotation.x = -p.blasterRecoil * 0.18;
        w.hero.rightArm.rotation.x = -p.blasterRecoil * 0.18;
      }
      w.hero.muzzleLeft.visible = w.muzzleTimer > 0 && w.barrelToggle === 0;
      w.hero.muzzleRight.visible = w.muzzleTimer > 0 && w.barrelToggle === 1;
      if (w.muzzleTimer > 0) {
        const spin = w.time * 38;
        w.hero.muzzleLeft.rotation.z = spin;
        w.hero.muzzleRight.rotation.z = -spin;
      }

      // Dynamic Hero PointLight (calibrated anti-glare intensity)
      if (w.ultFlashTimer > 0) {
        w.hero.heroLight.color.setHex(0xeab308);
        w.hero.heroLight.intensity = 1.8 + w.ultFlashTimer * 4.2;
        w.hero.heroLight.distance = 15 + w.ultFlashTimer * 12;
      } else if (w.muzzleTimer > 0) {
        w.hero.heroLight.color.setHex(0xfde68a);
        w.hero.heroLight.intensity = 2.2;
        w.hero.heroLight.distance = 14;
      } else if (w.coffeeTimer > 0) {
        w.hero.heroLight.color.setHex(0xf59e0b);
        w.hero.heroLight.intensity = 1.8;
        w.hero.heroLight.distance = 14;
      } else {
        w.hero.heroLight.color.setHex(0x38bdf8);
        w.hero.heroLight.intensity = 1.45;
        w.hero.heroLight.distance = 13;
      }

      const tScale = p.dashTimer > 0 ? 1.95 : 0.85 + Math.sin(w.time * 18) * 0.18;
      w.hero.thrusterLeft.scale.set(1, tScale, 1);
      w.hero.thrusterRight.scale.set(1, tScale, 1);
      w.hero.root.visible = !(p.invulnTimer > 0 && Math.floor(w.time * 24) % 2 === 0);

      w.hero.ultReadyHalo.visible = p.ultCharge >= 100;
      if (w.hero.ultReadyHalo.visible) {
        w.hero.ultReadyHalo.rotation.z = w.time * 2.2;
      }

      const shieldCount = p.skills.tryCatch > 0 ? p.skills.tryCatch + 1 : 0;
      const orbitR = 2.4 + p.skills.tryCatch * 0.18;
      for (let i = 0; i < w.hero.shieldMeshes.length; i++) {
        const sm = w.hero.shieldMeshes[i];
        if (i < shieldCount) {
          sm.visible = true;
          const a = p.shieldAngle + (i / shieldCount) * Math.PI * 2;
          sm.position.set(Math.sin(a) * orbitR, 0, Math.cos(a) * orbitR);
          sm.rotation.z = a;
        } else {
          sm.visible = false;
        }
      }

      if (p.skills.sunflowerAura > 0) {
        w.hero.auraGroup.visible = true;
        const auraR = 3.6 + p.skills.sunflowerAura * 0.85;
        w.hero.auraRing.scale.set(auraR, auraR, 1);
        w.hero.auraPetals.scale.set(auraR, 1, auraR);
        w.hero.auraPetals.rotation.y = w.time * 1.1;

        w.auraDamageTimer -= dt;
        if (w.auraDamageTimer <= 0) {
          w.auraDamageTimer = 0.4;
          const burnDmg = 10 + p.skills.sunflowerAura * 6;
          for (const e of w.enemies) {
            if (Math.hypot(e.x - p.x, e.z - p.z) <= auraR + e.radius) {
              e.hp -= burnDmg;
              e.hitFlash = 0.08;
              w.labels.push({
                wx: e.x,
                wy: 1.6,
                wz: e.z,
                text: `${burnDmg}`,
                color: '#facc15',
                size: 11,
                life: 0.45,
                maxLife: 0.45,
              });
            }
          }
        }
        if (p.skills.sunflowerAura >= 4) {
          w.auraNovaTimer -= dt;
          if (w.auraNovaTimer <= 0) {
            w.auraNovaTimer = 4.5;
            spawnRing3D(p.x, p.z, 0xfacc15, 0.45);
            for (const e of w.enemies) {
              const d = Math.hypot(e.x - p.x, e.z - p.z);
              if (d < auraR * 1.3 && !e.isBoss && d > 0.1) {
                e.x += ((e.x - p.x) / d) * 2.5;
                e.z += ((e.z - p.z) / d) * 2.5;
              }
            }
          }
        }
      } else {
        w.hero.auraGroup.visible = false;
      }

      if (shieldCount > 0) {
        for (const [eid, t] of w.shieldHitTimers.entries()) {
          if (t - dt <= 0) w.shieldHitTimers.delete(eid);
          else w.shieldHitTimers.set(eid, t - dt);
        }
        for (let i = 0; i < shieldCount; i++) {
          const a = p.shieldAngle + (i / shieldCount) * Math.PI * 2;
          const sx = p.x + Math.sin(a) * orbitR;
          const sz = p.z + Math.cos(a) * orbitR;

          for (let j = w.projectiles.length - 1; j >= 0; j--) {
            const proj = w.projectiles[j];
            if (!proj.fromPlayer && Math.hypot(proj.x - sx, proj.z - sz) < 0.78 + proj.radius) {
              spawnParticles3D(proj.x, 0.7, proj.z, 0x38bdf8, 4, 'spark');
              w.scene.remove(proj.mesh);
              disposeObject3D(proj.mesh);
              w.projectiles.splice(j, 1);
            }
          }

          for (const e of w.enemies) {
            if (!w.shieldHitTimers.has(e.id) && Math.hypot(e.x - sx, e.z - sz) < 0.78 + e.radius) {
              const sDmg = 20 + p.skills.tryCatch * 9;
              e.hp -= sDmg;
              e.hitFlash = 0.1;
              w.shieldHitTimers.set(e.id, 0.35);
              soundEngine.playHit(false);
              w.labels.push({
                wx: e.x,
                wy: 1.8,
                wz: e.z,
                text: `${sDmg}`,
                color: '#38bdf8',
                size: 12,
                life: 0.5,
                maxLife: 0.5,
              });
            }
          }
        }
      }

      // Weapon Heat & Manual Hold-to-Fire Overdrive (LMB / J / Mobile Hold BẮN, R = Perfect Vent!)
      const isFiringInput = w.pointerDown || w.keys.has('KeyJ') || mobileFireRef.current;
      if (w.isOverheated) {
        w.overheatTimer -= dt;
        w.weaponHeat = Math.max(0, (w.overheatTimer / 1.45) * 100);
        if (w.overheatTimer <= 0) {
          w.isOverheated = false;
          w.weaponHeat = 0;
        }
      } else if (!isFiringInput) {
        w.weaponHeat = Math.max(0, w.weaponHeat - dt * 28);
      } else {
        w.weaponHeat = Math.max(0, w.weaponHeat - dt * 4);
      }

      const coffeeFireMult = w.coffeeTimer > 0 ? 1.65 : 1;
      const feverMult = w.combo >= 15 ? 1.2 : 1;
      const overdriveMult = isFiringInput ? 1.32 : 1;
      const ventFireMult = w.ventBuffTimer > 0 ? 1.3 : 1;
      const fireInterval = Math.max(
        0.072,
        0.21 / ((1 + p.skills.banMeCoffee * 0.2) * coffeeFireMult * feverMult * overdriveMult * ventFireMult),
      );
      p.fireCooldown -= dt;
      if (!w.isOverheated && p.fireCooldown <= 0 && isFiringInput) {
        p.fireCooldown = fireInterval;
        p.blasterRecoil = 1;
        w.muzzleTimer = 0.055;
        w.barrelToggle = w.barrelToggle === 0 ? 1 : 0;

        w.weaponHeat = Math.min(100, w.weaponHeat + 3.35);
        if (w.weaponHeat >= 100) {
          w.isOverheated = true;
          w.overheatTimer = 1.45;
          w.labels.push({
            wx: p.x,
            wy: 2.35,
            wz: p.z,
            text: 'QUÁ NHIỆT! ẤN R XẢ!',
            color: '#fb7185',
            size: 13,
            life: 1.0,
            maxLife: 1.0,
          });
        }

        const barrelSide = w.barrelToggle === 0 ? -0.58 : 0.58;
        const cosA = Math.cos(p.aimAngle);
        const sinA = Math.sin(p.aimAngle);
        const muzzleX = p.x + sinA * 0.95 + cosA * barrelSide;
        const muzzleZ = p.z + cosA * 0.95 - sinA * barrelSide;

        const streamCount = 1 + p.skills.forLoop;
        const spread = Math.min(0.75, 0.13 * (streamCount - 1));
        const pierceCount = 1 + p.skills.binarySearch;
        const projSpeed = 33 * (1 + p.skills.forLoop * 0.08);
        const styleRankNow = computeStyleRank(w.stylePoints);
        const styleCritBonus = styleRankNow === 'SS' ? 0.1 : styleRankNow === 'S' ? 0.06 : 0;
        const hotDmgMult = w.weaponHeat >= 65 || w.ventBuffTimer > 0 ? 1.24 : 1;
        const critChance =
          0.14 +
          p.skills.mentorAdvice * 0.07 +
          p.skills.binarySearch * 0.04 +
          styleCritBonus +
          (w.ventBuffTimer > 0 ? 0.12 : 0.06);
        const baseDmg =
          (25 + p.skills.forLoop * 5 + p.skills.mentorAdvice * 6 + p.skills.binarySearch * 5) * hotDmgMult;

        for (let i = 0; i < streamCount; i++) {
          const off = streamCount === 1 ? 0 : -spread / 2 + (i / (streamCount - 1)) * spread;
          const ang = p.aimAngle + off;
          const isCrit = Math.random() < critChance;
          const dmg = Math.round(baseDmg * (isCrit ? (p.skills.mentorAdvice >= 3 ? 2.2 : 1.75) : 1));
          const bMat = isCrit
            ? bulletMatGold
            : p.skills.binarySearch > 0
              ? bulletMatPurple
              : w.ventBuffTimer > 0
                ? bulletMatAmber
                : bulletMatCyan;
          const bMesh = new THREE.Mesh(playerBulletGeo, bMat);
          bMesh.position.set(muzzleX, 1.05, muzzleZ);
          bMesh.rotation.y = ang;
          bMesh.scale.set(isCrit ? 1.38 : 1.05, isCrit ? 1.38 : 1.05, 1.85);
          w.scene.add(bMesh);
          w.projectiles.push({
            x: bMesh.position.x,
            z: bMesh.position.z,
            vx: Math.sin(ang) * projSpeed,
            vz: Math.cos(ang) * projSpeed,
            radius: 0.36 + p.skills.binarySearch * 0.05,
            damage: dmg,
            fromPlayer: true,
            pierce: pierceCount,
            hitIds: new Set(),
            life: 1.45,
            isCrit,
            mesh: bMesh,
          });
        }
        soundEngine.playShoot(true);
      }

      for (let i = w.powerUps.length - 1; i >= 0; i--) {
        const pu = w.powerUps[i];
        pu.life -= dt;
        pu.mesh.rotation.y += dt * 2.4;
        pu.mesh.position.y = Math.sin(w.time * 4 + i) * 0.18;

        if (Math.hypot(p.x - pu.x, p.z - pu.z) < p.radius + 1.15) {
          soundEngine.playLevelUp();
          spawnRing3D(pu.x, pu.z, 0xeab308, 0.42);
          if (pu.type === 'coffeeBoost') {
            w.coffeeTimer = 7;
            w.bannerMessage = 'NẠP CAFFEINE BAN MÊ · Bắn & chạy siêu tốc 7s!';
            w.bannerTimer = 3.2;
          } else if (pu.type === 'teacherUsb') {
            p.hp = Math.min(p.maxHp, p.hp + 25);
            for (let j = w.projectiles.length - 1; j >= 0; j--) {
              if (!w.projectiles[j].fromPlayer) {
                w.scene.remove(w.projectiles[j].mesh);
                disposeObject3D(w.projectiles[j].mesh);
                w.projectiles.splice(j, 1);
              }
            }
            w.bannerMessage = 'USB CỨU HỘ CỦA THẦY · Hồi +25 HP & xóa đạn Bug!';
            w.bannerTimer = 3.2;
          } else {
            w.ctrlZTimer = 3.0;
            w.bannerMessage = 'PHÍM TẮT CTRL+Z THẦN THÁNH · Đóng băng Bug 3s!';
            w.bannerTimer = 3.2;
          }
          w.scene.remove(pu.mesh);
          disposeObject3D(pu.mesh);
          w.powerUps.splice(i, 1);
          continue;
        }
        if (pu.life <= 0) {
          w.scene.remove(pu.mesh);
          disposeObject3D(pu.mesh);
          w.powerUps.splice(i, 1);
        }
      }

      for (let i = w.hazards.length - 1; i >= 0; i--) {
        const hz = w.hazards[i];
        hz.life -= dt;
        if (hz.type === 'meteor') {
          const prog = 1 - Math.max(0, hz.life / hz.maxLife);
          hz.mesh.scale.setScalar(0.5 + prog * 0.5);
          if (hz.beam) {
            (hz.beam.material as THREE.MeshBasicMaterial).opacity = 0.18 + prog * 0.55;
            hz.beam.scale.set(1 + prog * 0.8, 1, 1 + prog * 0.8);
          }
          if (hz.boulder) {
            const by = Math.max(0.5, (1 - prog) * 18);
            hz.boulder.position.y = by;
            hz.boulder.rotation.x += dt * 5;
            hz.boulder.rotation.z += dt * 4;
            if (Math.random() < 0.45) {
              spawnParticles3D(hz.x, by, hz.z, 0xf97316, 1, 'spark');
            }
          }
          if (hz.life <= 0 && !hz.triggered) {
            hz.triggered = true;
            w.shakeMag = Math.max(w.shakeMag, 0.42);
            spawnRing3D(hz.x, hz.z, 0xf43f5e, 0.52);
            spawnParticles3D(hz.x, 0.8, hz.z, 0xf43f5e, 18, 'spark');
            if (p.invulnTimer <= 0 && Math.hypot(p.x - hz.x, p.z - hz.z) < hz.radius) {
              const dmg = Math.round((p.skills.mentorAdvice >= 4 ? 21 : 25) * dtune.dmgMult);
              p.hp -= dmg;
              p.invulnTimer = 0.45;
              w.shakeMag = 0.48;
              w.damageFlash = 1;
              w.stylePoints = Math.max(0, w.stylePoints - 22);
              soundEngine.playPlayerDamage();
              w.labels.push({
                wx: p.x,
                wy: 2.1,
                wz: p.z,
                text: `-${dmg} HP`,
                color: '#f43f5e',
                size: 14,
                life: 0.75,
                maxLife: 0.75,
              });
            }
          }
        } else if (hz.type === 'shock') {
          const prog = 1 - Math.max(0, hz.life / hz.maxLife);
          if (hz.innerRing) {
            hz.innerRing.scale.setScalar(0.15 + prog * 0.85);
            (hz.innerRing.material as THREE.MeshBasicMaterial).opacity = 0.25 + prog * 0.45;
          }
          if (hz.life <= 0 && !hz.triggered) {
            hz.triggered = true;
            spawnRing3D(hz.x, hz.z, 0xd946ef, 0.42);
            spawnParticles3D(hz.x, 0.65, hz.z, 0xf43f5e, 10, 'spark');
            if (p.invulnTimer <= 0 && Math.hypot(p.x - hz.x, p.z - hz.z) < hz.radius) {
              const dmg = Math.round(16 * dtune.dmgMult);
              p.hp -= dmg;
              p.invulnTimer = 0.42;
              w.shakeMag = 0.38;
              w.damageFlash = 0.85;
              w.stylePoints = Math.max(0, w.stylePoints - 18);
              soundEngine.playPlayerDamage();
              w.labels.push({
                wx: p.x,
                wy: 2.1,
                wz: p.z,
                text: `-${dmg} RAM!`,
                color: '#f43f5e',
                size: 14,
                life: 0.75,
                maxLife: 0.75,
              });
            }
          }
        }
        if (hz.life <= 0) {
          w.scene.remove(hz.mesh);
          disposeObject3D(hz.mesh);
          if (hz.innerRing) {
            w.scene.remove(hz.innerRing);
            disposeObject3D(hz.innerRing);
          }
          if (hz.boulder) {
            w.scene.remove(hz.boulder);
            disposeObject3D(hz.boulder);
          }
          if (hz.beam) {
            w.scene.remove(hz.beam);
            disposeObject3D(hz.beam);
          }
          w.hazards.splice(i, 1);
        }
      }

      for (let i = w.projectiles.length - 1; i >= 0; i--) {
        const proj = w.projectiles[i];
        proj.x += proj.vx * dt;
        proj.z += proj.vz * dt;
        proj.life -= dt;
        proj.mesh.position.set(proj.x, 1.0, proj.z);
        if (!proj.fromPlayer) {
          proj.mesh.rotation.x += dt * 7;
          proj.mesh.rotation.y += dt * 7;
        }

        if (
          proj.life <= 0 ||
          Math.abs(proj.x) > ARENA_HALF_SIZE + 5 ||
          Math.abs(proj.z) > ARENA_HALF_SIZE + 5
        ) {
          w.scene.remove(proj.mesh);
          disposeObject3D(proj.mesh);
          w.projectiles.splice(i, 1);
          continue;
        }

        if (proj.fromPlayer) {
          let removed = false;
          // Check hits on interactive supply crates
          for (let ci = w.crates.length - 1; ci >= 0; ci--) {
            const cr = w.crates[ci];
            if (Math.hypot(proj.x - cr.x, proj.z - cr.z) <= proj.radius + 0.95) {
              cr.hp -= proj.damage;
              spawnParticles3D(proj.x, 0.9, proj.z, 0xfacc15, 4, 'spark');
              if (cr.hp <= 0) openSupplyCrate(ci);
              w.scene.remove(proj.mesh);
              disposeObject3D(proj.mesh);
              w.projectiles.splice(i, 1);
              removed = true;
              break;
            }
          }
          if (removed) continue;

          for (const e of w.enemies) {
            if (proj.hitIds.has(e.id)) continue;
            if (Math.hypot(proj.x - e.x, proj.z - e.z) <= proj.radius + e.radius) {
              proj.hitIds.add(e.id);
              e.hp -= proj.damage;
              e.hitFlash = 0.085;
              const pSpd = Math.hypot(proj.vx, proj.vz) || 1;
              const knockForce = e.isBoss ? 0.5 : 4.2;
              e.knockX += (proj.vx / pSpd) * knockForce;
              e.knockZ += (proj.vz / pSpd) * knockForce;
              soundEngine.playHit(proj.isCrit);
              spawnParticles3D(
                proj.x,
                1.0,
                proj.z,
                proj.isCrit ? 0xeab308 : 0x06b6d4,
                proj.isCrit ? 5 : 3,
                'spark',
              );
              if (proj.isCrit) {
                spawnRing3D(proj.x, proj.z, 0xeab308, 0.2);
              }
              w.labels.push({
                wx: e.x,
                wy: e.isBoss ? 3.2 : 1.75,
                wz: e.z,
                text: proj.isCrit ? `${proj.damage}!` : `${proj.damage}`,
                color: proj.isCrit ? '#facc15' : '#e0f2fe',
                size: proj.isCrit ? 15 : 12,
                life: 0.55,
                maxLife: 0.55,
              });
              proj.pierce -= 1;
              if (proj.pierce <= 0) {
                w.scene.remove(proj.mesh);
                disposeObject3D(proj.mesh);
                w.projectiles.splice(i, 1);
                removed = true;
                break;
              }
            }
          }
          if (removed) continue;
        } else {
          if (p.invulnTimer <= 0 && Math.hypot(proj.x - p.x, proj.z - p.z) <= proj.radius + p.radius) {
            const dmgReduction = p.skills.mentorAdvice >= 4 ? 0.85 : 1;
            const dmg = Math.round(proj.damage * dmgReduction);
            p.hp -= dmg;
            p.invulnTimer = 0.45;
            w.shakeMag = 0.42;
            w.damageFlash = 1;
            w.stylePoints = Math.max(0, w.stylePoints - 22);
            soundEngine.playPlayerDamage();
            spawnParticles3D(p.x, 0.9, p.z, 0xe11d48, 6, 'spark');
            w.labels.push({
              wx: p.x,
              wy: 2.1,
              wz: p.z,
              text: `-${dmg} HP`,
              color: '#fb7185',
              size: 14,
              life: 0.75,
              maxLife: 0.75,
            });
            w.scene.remove(proj.mesh);
            disposeObject3D(proj.mesh);
            w.projectiles.splice(i, 1);
          }
        }
      }

      for (let i = w.enemies.length - 1; i >= 0; i--) {
        const e = w.enemies[i];
        e.hitFlash = Math.max(0, e.hitFlash - dt);

        if (e.hp <= 0) {
          w.kills += 1;
          w.combo += 1;
          w.maxCombo = Math.max(w.maxCombo, w.combo);
          w.comboTimer = 2.6;
          w.stylePoints = Math.min(100, w.stylePoints + (e.isBoss ? 25 : e.isElite ? 9 : 3.2));
          const comboMult = 1 + Math.min(1.5, w.combo * 0.04);
          w.score += Math.round(e.scoreValue * comboMult);
          p.ultCharge = Math.min(100, p.ultCharge + (e.isBoss ? 35 : e.isElite ? 6 : 3.2 + p.skills.banMeCoffee * 0.45));
          soundEngine.playKill(Boolean(e.isBoss), w.combo);

          spawnParticles3D(
            e.x,
            0.9,
            e.z,
            e.isBoss ? 0xeab308 : 0xe11d48,
            e.isBoss ? 24 : 8,
            e.isBoss ? 'petal' : 'spark',
          );
          spawnRing3D(e.x, e.z, e.isBoss ? 0xfacc15 : 0xf43f5e, e.isBoss ? 0.68 : 0.36);
          if (e.isBoss) {
            spawnPillar3D(e.x, e.z, 0xfacc15, 0.9);
            spawnParticles3D(e.x, 1.5, e.z, 0x22d3ee, 20, 'spark');
            w.fovPunch = -4.5;
            w.hitstopTimer = 0.05;
          }

          if (!e.isBoss && w.kills % 9 === 0) {
            const bark = FUNNY_COMBAT_BARKS[Math.floor(Math.random() * FUNNY_COMBAT_BARKS.length)];
            w.labels.push({
              wx: e.x,
              wy: 2.1,
              wz: e.z,
              text: bark,
              color: '#fde047',
              size: 13,
              life: 1.35,
              maxLife: 1.35,
            });
          }

          if (e.type === 'loop') {
            spawnEnemy3D('syntax', e.x - 1.2, e.z);
            spawnEnemy3D('syntax', e.x + 1.2, e.z);
          } else if (e.type === 'memLeak') {
            const puddle = new THREE.Mesh(
              new THREE.CircleGeometry(2.5, 24),
              puddleMat,
            );
            puddle.rotation.x = -Math.PI / 2;
            puddle.position.set(e.x, 0.04, e.z);
            w.scene.add(puddle);
            w.hazards.push({
              x: e.x,
              z: e.z,
              radius: 2.5,
              life: 4.2,
              maxLife: 4.2,
              type: 'slow',
              mesh: puddle,
            });
          }

          const gemCount = e.isBoss ? 10 : e.xpValue >= 20 ? 2 : 1;
          for (let g = 0; g < gemCount; g++) {
            const isGold = e.isBoss || e.xpValue >= 18;
            const gMesh = new THREE.Mesh(
              gemGeo,
              isGold ? w.shared.crystalGemMatGold : w.shared.crystalGemMatCyan,
            );
            const gx = e.x + (Math.random() - 0.5) * 1.4;
            const gz = e.z + (Math.random() - 0.5) * 1.4;
            gMesh.position.set(gx, 0.55, gz);
            w.scene.add(gMesh);
            w.xpGems.push({
              x: gx,
              z: gz,
              vx: (Math.random() - 0.5) * 4,
              vz: (Math.random() - 0.5) * 4,
              value: Math.ceil(e.xpValue / gemCount),
              isGold,
              phase: Math.random() * Math.PI * 2,
              mesh: gMesh,
            });
          }

          const wasFinalBoss = e.type === 'bossDeadline';
          if (e.telegraphLine) {
            w.scene.remove(e.telegraphLine);
            disposeObject3D(e.telegraphLine);
          }
          if (e.laserMesh) {
            w.scene.remove(e.laserMesh);
            disposeObject3D(e.laserMesh);
          }
          if (e.laserMesh2) {
            w.scene.remove(e.laserMesh2);
            disposeObject3D(e.laserMesh2);
          }
          w.scene.remove(e.mesh);
          disposeObject3D(e.mesh);
          w.enemies.splice(i, 1);

          if (wasFinalBoss && !w.matchEnded) {
            w.matchEnded = true;
            w.score += Math.round(p.hp * 15);
            soundEngine.playVictory();
            soundEngine.setMood('CALM');
            onMatchEnd(buildSummary(true));
            return;
          }
          continue;
        }

        const frozen = w.ctrlZTimer > 0 && !e.isBoss && !e.isElite;
        if (frozen) {
          e.mesh.position.set(e.x, 0, e.z);
          continue;
        }
        const ctrlZEliteSlow = w.ctrlZTimer > 0 && e.isElite ? 0.35 : 1;

        if (e.hitFlash > 0) {
          e.mesh.scale.set(1.16, 0.88, 1.16);
        } else {
          e.mesh.scale.x = THREE.MathUtils.damp(e.mesh.scale.x, 1, 18, dt);
          e.mesh.scale.y = THREE.MathUtils.damp(e.mesh.scale.y, 1, 18, dt);
          e.mesh.scale.z = THREE.MathUtils.damp(e.mesh.scale.z, 1, 18, dt);
        }
        if (e.hitFlash > 0 && !e.isFlashing) {
          e.isFlashing = true;
          for (const hm of e.bossRefs.hitMaterials) {
            hm.mat.emissive.setHex(0xfde68a);
            hm.mat.emissiveIntensity = 0.68;
          }
        } else if (e.hitFlash <= 0 && e.isFlashing) {
          e.isFlashing = false;
          for (const hm of e.bossRefs.hitMaterials) {
            hm.mat.emissive.setHex(hm.baseEmissive);
            hm.mat.emissiveIntensity = hm.baseIntensity;
          }
        }
        if (e.bossRefs.mixer) {
          e.bossRefs.mixer.update(dt * ctrlZEliteSlow);
        }
        if (e.bossRefs.outerRing) e.bossRefs.outerRing.rotation.z += dt * 1.4;
        if (e.bossRefs.innerRing) e.bossRefs.innerRing.rotation.z -= dt * 1.9;
        if (e.bossRefs.orbitGroup) e.bossRefs.orbitGroup.rotation.y += dt * 1.8;
        if (e.bossRefs.hourHand) e.bossRefs.hourHand.rotation.y += dt * 0.9;
        if (e.bossRefs.minuteHand) e.bossRefs.minuteHand.rotation.y += dt * 2.8;
        if (e.bossRefs.coreMesh) {
          e.bossRefs.coreMesh.rotation.y += dt * 1.6;
          e.bossRefs.coreMesh.rotation.x += dt * 0.9;
        }
        if (e.bossRefs.limbs && e.bossRefs.limbs.length > 0) {
          e.bossRefs.limbs.forEach((limb, idx) => {
            limb.rotation.x = Math.sin(w.time * 14 + idx * 1.6) * 0.32;
          });
        }

        const dx = p.x - e.x;
        const dz = p.z - e.z;
        const dist = Math.hypot(dx, dz) || 1;
        const dirX = dx / dist;
        const dirZ = dz / dist;
        const auraSlow =
          (p.skills.sunflowerAura >= 3 && dist < 3.6 + p.skills.sunflowerAura * 0.85 ? 0.72 : 1) *
          ctrlZEliteSlow;

        if (e.type === 'syntax') {
          e.stateTimer -= dt * ctrlZEliteSlow;
          if (e.isChargingDash) {
            if (e.stateTimer <= 0) {
              e.isChargingDash = false;
              e.stateTimer = 1.95;
            }
          } else {
            e.vx = dirX * e.speed * auraSlow;
            e.vz = dirZ * e.speed * auraSlow;
            if (e.stateTimer <= 0 && dist < 12) {
              e.isChargingDash = true;
              e.stateTimer = 0.28;
              e.vx = dirX * 18.5;
              e.vz = dirZ * 18.5;
              if (w.waveIndex >= 1 || e.isElite) {
                const ang = Math.atan2(dx, dz);
                const bMesh = new THREE.Mesh(enemyBulletGeo, bulletMatEnemyRed);
                bMesh.position.set(e.x, 0.82, e.z);
                bMesh.scale.setScalar(0.82);
                w.scene.add(bMesh);
                w.projectiles.push({
                  x: e.x,
                  z: e.z,
                  vx: Math.sin(ang) * 12,
                  vz: Math.cos(ang) * 12,
                  radius: 0.28,
                  damage: Math.round(11 * dtune.dmgMult),
                  fromPlayer: false,
                  pierce: 1,
                  hitIds: new Set(),
                  life: 2.6,
                  mesh: bMesh,
                });
              }
            }
          }
          e.mesh.rotation.y = Math.atan2(dirX, dirZ);
        } else if (e.type === 'nullPtr') {
          e.stateTimer -= dt * ctrlZEliteSlow;
          if (!e.isChargingDash && e.stateTimer <= 0 && dist < 20) {
            e.isChargingDash = true;
            e.stateTimer = 0.36;
            e.dashTargetX = p.x + p.vx * 0.22;
            e.dashTargetZ = p.z + p.vz * 0.22;
            const tDx = (e.dashTargetX ?? p.x) - e.x;
            const tDz = (e.dashTargetZ ?? p.z) - e.z;
            const tLen = Math.max(1, Math.hypot(tDx, tDz));
            const strip = new THREE.Mesh(telegraphStripGeo, telegraphMat);
            strip.position.set(e.x, 0.08, e.z);
            strip.rotation.y = Math.atan2(tDx, tDz);
            strip.scale.set(1.35, 1, tLen);
            w.scene.add(strip);
            e.telegraphLine = strip;
          } else if (e.isChargingDash) {
            if (e.stateTimer <= 0) {
              if (e.telegraphLine) {
                w.scene.remove(e.telegraphLine);
                disposeObject3D(e.telegraphLine);
                e.telegraphLine = undefined;
              }
              const tx = (e.dashTargetX ?? p.x) - e.x;
              const tz = (e.dashTargetZ ?? p.z) - e.z;
              const tl = Math.hypot(tx, tz) || 1;
              e.vx = (tx / tl) * 29;
              e.vz = (tz / tl) * 29;
              const bAng = Math.atan2(tx, tz);
              const bMesh = new THREE.Mesh(enemyBulletGeo, bulletMatEnemyPink);
              bMesh.position.set(e.x, 0.9, e.z);
              w.scene.add(bMesh);
              w.projectiles.push({
                x: e.x,
                z: e.z,
                vx: Math.sin(bAng) * 14,
                vz: Math.cos(bAng) * 14,
                radius: 0.32,
                damage: Math.round(14 * dtune.dmgMult),
                fromPlayer: false,
                pierce: 1,
                hitIds: new Set(),
                life: 2.8,
                mesh: bMesh,
              });
              e.isChargingDash = false;
              e.stateTimer = 1.25;
            } else {
              e.vx *= 0.85;
              e.vz *= 0.85;
            }
          } else {
            e.vx = dirX * e.speed * auraSlow;
            e.vz = dirZ * e.speed * auraSlow;
          }
          e.mesh.rotation.y = Math.atan2(dirX, dirZ);
        } else if (e.type === 'loop') {
          if (dist > 11) {
            e.vx = dirX * e.speed * auraSlow;
            e.vz = dirZ * e.speed * auraSlow;
          } else if (dist < 6) {
            e.vx = -dirX * e.speed * 0.7 * auraSlow;
            e.vz = -dirZ * e.speed * 0.7 * auraSlow;
          } else {
            e.vx = dirZ * e.speed * 0.75 * auraSlow;
            e.vz = -dirX * e.speed * 0.75 * auraSlow;
          }
          e.stateTimer -= dt * ctrlZEliteSlow;
          if (e.stateTimer <= 0) {
            e.stateTimer = e.isElite ? 1.35 : 1.65;
            const ang = Math.atan2(dx, dz);
            const fanOffsets = e.isElite ? [-0.26, 0, 0.26] : [-0.15, 0.15];
            for (const off of fanOffsets) {
              const bMesh = new THREE.Mesh(enemyBulletGeo, bulletMatPurple);
              bMesh.position.set(e.x, 0.9, e.z);
              w.scene.add(bMesh);
              w.projectiles.push({
                x: e.x,
                z: e.z,
                vx: Math.sin(ang + off) * 11.5,
                vz: Math.cos(ang + off) * 11.5,
                radius: 0.34,
                damage: Math.round(13 * dtune.dmgMult),
                fromPlayer: false,
                pierce: 1,
                hitIds: new Set(),
                life: 3.1,
                mesh: bMesh,
              });
            }
          }
          e.mesh.rotation.y = Math.atan2(dirX, dirZ);
        } else if (e.type === 'memLeak') {
          e.vx = dirX * e.speed * auraSlow;
          e.vz = dirZ * e.speed * auraSlow;
          e.stateTimer -= dt * ctrlZEliteSlow;
          if (e.stateTimer <= 0 && dist < 15.5) {
            e.stateTimer = e.isElite ? 1.95 : 2.45;
            const sx = Math.max(-ARENA_HALF_SIZE + 3, Math.min(ARENA_HALF_SIZE - 3, p.x + p.vx * 0.18));
            const sz = Math.max(-ARENA_HALF_SIZE + 3, Math.min(ARENA_HALF_SIZE - 3, p.z + p.vz * 0.18));
            const outerRing = new THREE.Mesh(
              new THREE.RingGeometry(2.85, 3.2, 28),
              new THREE.MeshBasicMaterial({
                color: 0xe11d48,
                transparent: true,
                opacity: 0.65,
                side: THREE.DoubleSide,
                depthWrite: false,
              }),
            );
            outerRing.rotation.x = -Math.PI / 2;
            outerRing.position.set(sx, 0.06, sz);
            w.scene.add(outerRing);

            const innerFill = new THREE.Mesh(
              new THREE.CircleGeometry(3.0, 28),
              new THREE.MeshBasicMaterial({
                color: 0xd946ef,
                transparent: true,
                opacity: 0.25,
                depthWrite: false,
              }),
            );
            innerFill.rotation.x = -Math.PI / 2;
            innerFill.position.set(sx, 0.05, sz);
            innerFill.scale.setScalar(0.15);
            w.scene.add(innerFill);

            w.hazards.push({
              x: sx,
              z: sz,
              radius: 3.2,
              life: 0.85,
              maxLife: 0.85,
              type: 'shock',
              mesh: outerRing,
              innerRing: innerFill,
            });
          }
          e.mesh.rotation.y = Math.atan2(dirX, dirZ);
        } else if (e.type === 'conflict') {
          if (dist > 13) {
            e.vx = dirX * e.speed * auraSlow;
            e.vz = dirZ * e.speed * auraSlow;
          } else if (dist < 7.5) {
            e.vx = -dirX * e.speed * 0.72 * auraSlow;
            e.vz = -dirZ * e.speed * 0.72 * auraSlow;
          } else {
            e.vx = -dirZ * e.speed * 0.72 * auraSlow;
            e.vz = dirX * e.speed * 0.72 * auraSlow;
          }
          e.stateTimer -= dt * ctrlZEliteSlow;
          if (e.stateTimer <= 0) {
            e.stateTimer = e.isElite ? 1.1 : 1.32;
            const leadT = Math.min(0.6, dist / 14);
            const ang = Math.atan2(dx + p.vx * leadT, dz + p.vz * leadT);
            const offsets = e.isElite || w.waveIndex >= 2 ? [-0.15, 0, 0.15] : [-0.09, 0.09];
            for (const off of offsets) {
              const bMesh = new THREE.Mesh(enemyBulletGeo, bulletMatEnemyOrange);
              bMesh.position.set(e.x, 0.85, e.z);
              w.scene.add(bMesh);
              w.projectiles.push({
                x: e.x,
                z: e.z,
                vx: Math.sin(ang + off) * 14.5,
                vz: Math.cos(ang + off) * 14.5,
                radius: 0.34,
                damage: Math.round(15 * dtune.dmgMult),
                fromPlayer: false,
                pierce: 1,
                hitIds: new Set(),
                life: 3.4,
                mesh: bMesh,
              });
            }
          }
          e.mesh.rotation.y = Math.atan2(dirX, dirZ);
        } else if (e.type === 'miniBoss404') {
          if (e.isChargingDash) {
            e.stateTimer -= dt;
            if (e.telegraphLine && e.stateTimer <= 0.42) {
              // Launch knight charge after brief 0.42s telegraph
              w.scene.remove(e.telegraphLine);
              disposeObject3D(e.telegraphLine);
              e.telegraphLine = undefined;
              const tx = (e.dashTargetX ?? p.x) - e.x;
              const tz = (e.dashTargetZ ?? p.z) - e.z;
              const tl = Math.hypot(tx, tz) || 1;
              e.vx = (tx / tl) * 25;
              e.vz = (tz / tl) * 25;
              const base = Math.atan2(tx, tz);
              for (const off of [-0.36, -0.18, 0, 0.18, 0.36]) {
                const bMesh = new THREE.Mesh(enemyBulletGeo, bulletMatEnemyRed);
                bMesh.position.set(e.x, 0.95, e.z);
                w.scene.add(bMesh);
                w.projectiles.push({
                  x: e.x,
                  z: e.z,
                  vx: Math.sin(base + off) * 14.5,
                  vz: Math.cos(base + off) * 14.5,
                  radius: 0.38,
                  damage: Math.round(18 * dtune.dmgMult),
                  fromPlayer: false,
                  pierce: 1,
                  hitIds: new Set(),
                  life: 3.2,
                  mesh: bMesh,
                });
              }
            }
            if (e.stateTimer <= 0) {
              e.isChargingDash = false;
              e.stateTimer = 0.95;
            }
          } else {
            e.vx = dirX * e.speed * auraSlow;
            e.vz = dirZ * e.speed * auraSlow;
            e.mesh.rotation.y = Math.atan2(dirX, dirZ);
            e.stateTimer -= dt;
            if (e.stateTimer <= 0) {
              e.attackCycle = ((e.attackCycle ?? 0) + 1) % 3;
              if (e.attackCycle === 0) {
                for (let k = 0; k < 14; k++) {
                  const a = (k / 14) * Math.PI * 2 + w.time;
                  const bMesh = new THREE.Mesh(enemyBulletGeo, bulletMatEnemyPink);
                  bMesh.position.set(e.x, 0.95, e.z);
                  w.scene.add(bMesh);
                  w.projectiles.push({
                    x: e.x,
                    z: e.z,
                    vx: Math.sin(a) * 12,
                    vz: Math.cos(a) * 12,
                    radius: 0.36,
                    damage: Math.round(16 * dtune.dmgMult),
                    fromPlayer: false,
                    pierce: 1,
                    hitIds: new Set(),
                    life: 3.6,
                    mesh: bMesh,
                  });
                }
                e.stateTimer = 1.05;
              } else if (e.attackCycle === 1) {
                // Telegraphed Knight Commander Lance Charge + 5-way Fan
                e.dashTargetX = p.x + p.vx * 0.25;
                e.dashTargetZ = p.z + p.vz * 0.25;
                const tDx = e.dashTargetX - e.x;
                const tDz = e.dashTargetZ - e.z;
                const tLen = Math.max(4, Math.hypot(tDx, tDz));
                const strip = new THREE.Mesh(telegraphStripGeo, telegraphMat);
                strip.position.set(e.x, 0.08, e.z);
                strip.rotation.y = Math.atan2(tDx, tDz);
                strip.scale.set(2.2, 1, tLen);
                w.scene.add(strip);
                e.telegraphLine = strip;
                e.vx = 0;
                e.vz = 0;
                e.isChargingDash = true;
                e.stateTimer = 0.84;
              } else {
                // 3 Predictive 404 Meteors + summon backup
                for (let m = 0; m < 3; m++) {
                  const mx = Math.max(-ARENA_HALF_SIZE + 3, Math.min(ARENA_HALF_SIZE - 3, p.x + p.vx * 0.4 + (m - 1) * 3.5));
                  const mz = Math.max(-ARENA_HALF_SIZE + 3, Math.min(ARENA_HALF_SIZE - 3, p.z + p.vz * 0.4 + (Math.random() - 0.5) * 4));
                  const mMesh = new THREE.Mesh(
                    new THREE.RingGeometry(0.3, 2.5, 24),
                    new THREE.MeshBasicMaterial({
                      color: 0xe11d48,
                      transparent: true,
                      opacity: 0.48,
                      side: THREE.DoubleSide,
                      depthWrite: false,
                    }),
                  );
                  mMesh.rotation.x = -Math.PI / 2;
                  mMesh.position.set(mx, 0.06, mz);
                  w.scene.add(mMesh);

                  const boulder = new THREE.Mesh(
                    boulderGeo,
                    new THREE.MeshStandardMaterial({
                      color: 0xe11d48,
                      emissive: 0xf97316,
                      emissiveIntensity: 0.75,
                      roughness: 0.35,
                    }),
                  );
                  boulder.position.set(mx, 18, mz);
                  w.scene.add(boulder);

                  w.hazards.push({
                    x: mx,
                    z: mz,
                    radius: 2.5,
                    life: 1.05,
                    maxLife: 1.05,
                    type: 'meteor',
                    mesh: mMesh,
                    boulder,
                  });
                }
                if (w.enemies.length < 28) {
                  spawnEnemy3D('nullPtr', e.x - 2.6, e.z + 1.2);
                }
                e.stateTimer = 1.15;
              }
            }
          }
        } else if (e.type === 'bossDeadline') {
          const hpRatio = e.hp / e.maxHp;
          e.bossPhase = hpRatio < 0.35 ? 3 : hpRatio < 0.65 ? 2 : 1;
          if (e.bossPhase > w.announcedBossPhase) {
            w.announcedBossPhase = e.bossPhase;
            w.bannerMessage =
              e.bossPhase === 2
                ? 'DEADLINE PHA 2 · THẦY HỎI VẤN ĐÁP (Bật tia Laser Chữ Thập!)'
                : 'DEADLINE PHA 3 · 23:58 SẮP ĐÓNG CỔNG NỘP BÀI!';
            w.bannerTimer = 3.8;
            soundEngine.playBossWarning();
          }

          // Boss orbits actively around the player instead of camping center
          const orbitTargetX = Math.max(
            -ARENA_HALF_SIZE + 8,
            Math.min(ARENA_HALF_SIZE - 8, p.x + Math.cos(w.time * 0.55) * 13.5),
          );
          const orbitTargetZ = Math.max(
            -ARENA_HALF_SIZE + 8,
            Math.min(ARENA_HALF_SIZE - 8, p.z + Math.sin(w.time * 0.55) * 13.5),
          );
          const bx = orbitTargetX - e.x;
          const bz = orbitTargetZ - e.z;
          const bDist = Math.hypot(bx, bz) || 1;
          e.vx = (bx / bDist) * e.speed * (e.bossPhase === 3 ? 1.25 : 1.08);
          e.vz = (bz / bDist) * e.speed * (e.bossPhase === 3 ? 1.25 : 1.08);
          e.mesh.rotation.y = Math.atan2(dirX, dirZ);

          if (e.laserTimer !== undefined && e.laserAngle !== undefined) {
            e.laserTimer -= dt;
            if (!e.laserMesh) {
              const beamGeo = new THREE.BoxGeometry(0.65, 0.45, 44);
              beamGeo.translate(0, 0.9, 22);
              e.laserMesh = new THREE.Mesh(
                beamGeo,
                new THREE.MeshBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.38 }),
              );
              w.scene.add(e.laserMesh);
            }
            if ((e.bossPhase ?? 1) >= 2 && !e.laserMesh2) {
              const beamGeo2 = new THREE.BoxGeometry(0.65, 0.45, 44);
              beamGeo2.translate(0, 0.9, 22);
              e.laserMesh2 = new THREE.Mesh(
                beamGeo2,
                new THREE.MeshBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.38 }),
              );
              w.scene.add(e.laserMesh2);
            }
            e.laserMesh.position.set(e.x, 0, e.z);
            e.laserMesh.rotation.y = e.laserAngle;
            if (e.laserMesh2) {
              e.laserMesh2.position.set(e.x, 0, e.z);
              e.laserMesh2.rotation.y = e.laserAngle + Math.PI / 2;
            }

            if (e.laserTimer <= 0.65 && e.laserTimer > 0) {
              (e.laserMesh.material as THREE.MeshBasicMaterial).color.setHex(0xe11d48);
              (e.laserMesh.material as THREE.MeshBasicMaterial).opacity = 0.85;
              if (e.laserMesh2) {
                (e.laserMesh2.material as THREE.MeshBasicMaterial).color.setHex(0xe11d48);
                (e.laserMesh2.material as THREE.MeshBasicMaterial).opacity = 0.85;
              }
              e.laserAngle += dt * (e.bossPhase === 3 ? 0.95 : 0.78);
              const anglesToCheck = e.laserMesh2 ? [e.laserAngle, e.laserAngle + Math.PI / 2] : [e.laserAngle];
              for (const lAng of anglesToCheck) {
                const lx = Math.sin(lAng);
                const lz = Math.cos(lAng);
                const projLen = (p.x - e.x) * lx + (p.z - e.z) * lz;
                if (projLen > 0 && projLen < 44) {
                  const perp = Math.abs((p.x - e.x) * -lz + (p.z - e.z) * lx);
                  if (perp < 0.85 + p.radius && p.invulnTimer <= 0) {
                    const laserDmg = Math.round(22 * dtune.dmgMult);
                    p.hp -= laserDmg;
                    p.invulnTimer = 0.45;
                    w.shakeMag = 0.5;
                    w.damageFlash = 1;
                    w.stylePoints = Math.max(0, w.stylePoints - 22);
                    soundEngine.playPlayerDamage();
                    w.labels.push({
                      wx: p.x,
                      wy: 2.1,
                      wz: p.z,
                      text: `-${laserDmg} HP`,
                      color: '#f43f5e',
                      size: 14,
                      life: 0.75,
                      maxLife: 0.75,
                    });
                    break;
                  }
                }
              }
            } else if (e.laserTimer <= 0) {
              w.scene.remove(e.laserMesh);
              disposeObject3D(e.laserMesh);
              e.laserMesh = undefined;
              if (e.laserMesh2) {
                w.scene.remove(e.laserMesh2);
                disposeObject3D(e.laserMesh2);
                e.laserMesh2 = undefined;
              }
              e.laserTimer = undefined;
              e.laserAngle = undefined;
            }
          }

          e.stateTimer -= dt;
          if (e.stateTimer <= 0) {
            e.attackCycle = ((e.attackCycle ?? 0) + 1) % 4;
            if (e.attackCycle === 0) {
              const spokes = e.bossPhase === 3 ? 22 : e.bossPhase === 2 ? 18 : 16;
              for (let k = 0; k < spokes; k++) {
                const a = (k / spokes) * Math.PI * 2 + w.time * 1.4;
                const bMesh = new THREE.Mesh(enemyBulletGeo, bulletMatEnemyRed);
                bMesh.position.set(e.x, 0.9, e.z);
                w.scene.add(bMesh);
                w.projectiles.push({
                  x: e.x,
                  z: e.z,
                  vx: Math.sin(a) * 12,
                  vz: Math.cos(a) * 12,
                  radius: 0.38,
                  damage: Math.round(16 * dtune.dmgMult),
                  fromPlayer: false,
                  pierce: 1,
                  hitIds: new Set(),
                  life: 4.0,
                  mesh: bMesh,
                });
              }
              e.stateTimer = e.bossPhase === 3 ? 0.85 : 1.05;
            } else if (e.attackCycle === 1) {
              const count = e.bossPhase === 3 ? 6 : e.bossPhase === 2 ? 5 : 4;
              for (let m = 0; m < count; m++) {
                const mx = Math.max(-ARENA_HALF_SIZE + 3, Math.min(ARENA_HALF_SIZE - 3, p.x + p.vx * 0.45 + (Math.random() - 0.5) * 9));
                const mz = Math.max(-ARENA_HALF_SIZE + 3, Math.min(ARENA_HALF_SIZE - 3, p.z + p.vz * 0.45 + (Math.random() - 0.5) * 9));
                const mMesh = new THREE.Mesh(
                  new THREE.RingGeometry(0.3, 2.7, 24),
                  new THREE.MeshBasicMaterial({
                    color: 0xe11d48,
                    transparent: true,
                    opacity: 0.45,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                  }),
                );
                mMesh.rotation.x = -Math.PI / 2;
                mMesh.position.set(mx, 0.06, mz);
                w.scene.add(mMesh);

                const boulder = new THREE.Mesh(
                  boulderGeo,
                  new THREE.MeshStandardMaterial({
                    color: 0xe11d48,
                    emissive: 0xf97316,
                    emissiveIntensity: 0.75,
                    roughness: 0.35,
                  }),
                );
                boulder.position.set(mx, 18, mz);
                w.scene.add(boulder);

                const beam = new THREE.Mesh(
                  meteorBeamGeo,
                  new THREE.MeshBasicMaterial({
                    color: 0xe11d48,
                    transparent: true,
                    opacity: 0.22,
                    depthWrite: false,
                  }),
                );
                beam.position.set(mx, 0.05, mz);
                w.scene.add(beam);

                w.hazards.push({
                  x: mx,
                  z: mz,
                  radius: 2.7,
                  life: 1.05,
                  maxLife: 1.05,
                  type: 'meteor',
                  mesh: mMesh,
                  boulder,
                  beam,
                });
              }
              e.stateTimer = 1.05;
            } else if (e.attackCycle === 2) {
              e.laserAngle = Math.atan2(dx, dz) - 0.45;
              e.laserTimer = 1.55;
              e.stateTimer = 1.35;
            } else {
              const base = Math.atan2(dx, dz);
              for (let s = -3; s <= 3; s++) {
                const bMesh = new THREE.Mesh(enemyBulletGeo, bulletMatEnemyPink);
                bMesh.position.set(e.x, 0.9, e.z);
                w.scene.add(bMesh);
                w.projectiles.push({
                  x: e.x,
                  z: e.z,
                  vx: Math.sin(base + s * 0.14) * 14.5,
                  vz: Math.cos(base + s * 0.14) * 14.5,
                  radius: 0.35,
                  damage: Math.round(16 * dtune.dmgMult),
                  fromPlayer: false,
                  pierce: 1,
                  hitIds: new Set(),
                  life: 3.4,
                  mesh: bMesh,
                });
              }
              if (w.enemies.length < 24) spawnEnemy3D(Math.random() < 0.5 ? 'nullPtr' : 'loop', e.x + 3, e.z);
              e.stateTimer = 1.0;
            }
          }
        } else {
          e.vx = dirX * e.speed * auraSlow;
          e.vz = dirZ * e.speed * auraSlow;
          e.mesh.rotation.y = Math.atan2(dirX, dirZ);
        }

        e.knockX *= Math.pow(0.008, dt);
        e.knockZ *= Math.pow(0.008, dt);
        const nextEnemyPos = pushOutOfObstacles(
          e.x + (e.vx + e.knockX) * dt,
          e.z + (e.vz + e.knockZ) * dt,
          e.radius,
          w.obstacles,
        );
        e.x = nextEnemyPos.x;
        e.z = nextEnemyPos.z;
        e.mesh.position.set(e.x, 0, e.z);

        if (p.invulnTimer <= 0 && Math.hypot(e.x - p.x, e.z - p.z) < e.radius + p.radius - 0.1) {
          const dmgReduction = p.skills.mentorAdvice >= 4 ? 0.85 : 1;
          const dmg = Math.round(e.damage * dmgReduction);
          p.hp -= dmg;
          p.invulnTimer = 0.45;
          w.shakeMag = 0.45;
          w.damageFlash = 1;
          w.stylePoints = Math.max(0, w.stylePoints - 22);
          soundEngine.playPlayerDamage();
          spawnParticles3D(p.x, 0.9, p.z, 0xe11d48, 7, 'spark');
          w.labels.push({
            wx: p.x,
            wy: 2.1,
            wz: p.z,
            text: `-${dmg} HP`,
            color: '#f43f5e',
            size: 14,
            life: 0.75,
            maxLife: 0.75,
          });
        }
      }

      if (p.hp <= 0 && !w.matchEnded) {
        p.hp = 0;
        w.matchEnded = true;
        soundEngine.setMood('CALM');
        onMatchEnd(buildSummary(false));
        return;
      }

      const magnetRange = 4.6 * (1 + p.skills.sunflowerAura * 0.45);
      for (let i = w.xpGems.length - 1; i >= 0; i--) {
        const gem = w.xpGems[i];
        gem.x += gem.vx * dt;
        gem.z += gem.vz * dt;
        gem.vx *= Math.pow(0.02, dt);
        gem.vz *= Math.pow(0.02, dt);

        const gdx = p.x - gem.x;
        const gdz = p.z - gem.z;
        const gDist = Math.hypot(gdx, gdz) || 1;
        if (gDist < magnetRange) {
          const pull = 18 + (1 - gDist / magnetRange) * 14;
          gem.x += (gdx / gDist) * pull * dt;
          gem.z += (gdz / gDist) * pull * dt;
        }
        gem.mesh.position.set(gem.x, 0.55 + Math.sin(w.time * 5 + gem.phase) * 0.15, gem.z);
        gem.mesh.rotation.y += dt * 3;

        if (gDist < p.radius + 0.65) {
          p.xp += gem.value;
          w.score += gem.value * 2;
          p.ultCharge = Math.min(100, p.ultCharge + 1.8);
          w.xpCombo += 1;
          w.xpComboTimer = 1.1;
          soundEngine.playXpPickup(w.xpCombo);
          w.scene.remove(gem.mesh);
          disposeObject3D(gem.mesh);
          w.xpGems.splice(i, 1);

          if (p.xp >= p.nextXp) {
            p.xp -= p.nextXp;
            p.level += 1;
            p.nextXp = Math.round(p.nextXp * 1.32 + 18);
            const choices = pickLevelChoices(p.skills);
            if (choices.length > 0) {
              soundEngine.playLevelUp();
              onTriggerLevelUp(choices, { ...p.skills });
              return;
            } else {
              p.hp = Math.min(p.maxHp, p.hp + 30);
              w.score += 350;
            }
          }
        }
      }

      for (let i = w.particles.length - 1; i >= 0; i--) {
        const pt = w.particles[i];
        pt.life -= dt;
        const ratio = Math.max(0, pt.life / pt.maxLife);
        if (pt.kind === 'ring') {
          const prog = 1 - ratio;
          pt.mesh.scale.setScalar(1 + prog * 5.6);
          (pt.mesh.material as THREE.MeshBasicMaterial).opacity = ratio;
        } else if (pt.kind === 'dome') {
          const prog = 1 - ratio;
          pt.mesh.scale.setScalar(1 + prog * 11.5);
          (pt.mesh.material as THREE.MeshBasicMaterial).opacity = ratio * 0.55;
        } else if (pt.kind === 'pillar') {
          const prog = 1 - ratio;
          pt.mesh.scale.set(1 + prog * 1.4, 0.6 + prog * 1.1, 1 + prog * 1.4);
          (pt.mesh.material as THREE.MeshBasicMaterial).opacity = ratio * 0.72;
        } else {
          pt.vy -= 9.5 * dt;
          pt.x += pt.vx * dt;
          pt.y = Math.max(0.05, pt.y + pt.vy * dt);
          pt.z += pt.vz * dt;
          pt.mesh.position.set(pt.x, pt.y, pt.z);
          pt.mesh.rotation.x += dt * 4;
          pt.mesh.rotation.y += dt * 5;
          (pt.mesh.material as THREE.MeshBasicMaterial).opacity = ratio;
        }
        if (pt.life <= 0) {
          w.scene.remove(pt.mesh);
          disposeObject3D(pt.mesh);
          w.particles.splice(i, 1);
        }
      }

      for (let i = w.labels.length - 1; i >= 0; i--) {
        w.labels[i].wy += dt * 1.6;
        w.labels[i].life -= dt;
        if (w.labels[i].life <= 0) w.labels.splice(i, 1);
      }
    };

    const clock = new THREE.Clock();
    let hudAcc = 0;
    let fpsMonitorAcc = 0;
    let fpsFrameCount = 0;
    let perfDegraded = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(0.05, Math.max(0.001, clock.getDelta()));
      const w = worldRef.current;

      // Rolling adaptive frame-time optimizer (keeps gameplay smooth if GPU is under load)
      if (!isSoftwareGl && !perfDegraded) {
        fpsMonitorAcc += dt;
        fpsFrameCount += 1;
        if (fpsFrameCount >= 45) {
          const avgDt = fpsMonitorAcc / fpsFrameCount;
          if (avgDt > 0.028) {
            perfDegraded = true;
            maxParticles = 85;
            if (renderer.shadowMap.enabled) {
              renderer.shadowMap.autoUpdate = false;
            }
          }
          fpsMonitorAcc = 0;
          fpsFrameCount = 0;
        }
      }

      if (w) {
        if (screenRef.current === 'TITLE') {
          // Live 3D Showcase Orbit around Hero in the Cyber-Lab Courtyard
          w.time += dt;
          w.hero.root.visible = true;
          w.hero.auraGroup.visible = false;
          w.hero.ultReadyHalo.visible = false;
          w.hero.muzzleLeft.visible = false;
          w.hero.muzzleRight.visible = false;
          w.hero.root.position.set(0, 0, 0);
          w.hero.bodyPivot.rotation.y = w.time * 0.35;
          w.hero.bodyPivot.rotation.x = 0;
          if (w.hero.mixer) {
            w.hero.mixer.update(dt);
          } else {
            w.hero.bodyPivot.position.y = Math.sin(w.time * 3) * 0.08;
          }
          w.hero.heroLight.color.setHex(0x38bdf8);
          w.hero.heroLight.intensity = 1.5;
          w.hero.heroLight.distance = 14;
          w.hero.scarf.rotation.x = 0.25 + Math.sin(w.time * 5) * 0.12;
          w.hero.tassel.rotation.z = Math.sin(w.time * 4) * 0.18;
          const tScale = 0.9 + Math.sin(w.time * 12) * 0.15;
          w.hero.thrusterLeft.scale.set(1, tScale, 1);
          w.hero.thrusterRight.scale.set(1, tScale, 1);
          w.aimReticle.visible = false;
          w.targetLockReticle.visible = false;
          if (centerSealRef) centerSealRef.rotation.y = w.time * 0.25;
          if (perimeterRingRef) perimeterRingRef.rotation.z = w.time * 0.1;
          if (firefliesRef) firefliesRef.rotation.y = w.time * 0.04;
          if (scanRingRef) {
            const scanCycle = (w.time * 0.3) % 1;
            scanRingRef.scale.setScalar(2 + scanCycle * (ARENA_HALF_SIZE * 1.25));
            (scanRingRef.material as THREE.MeshBasicMaterial).opacity = (1 - scanCycle) * 0.24;
          }
          holoPlanetsRef.forEach((hp, idx) => {
            hp.rotation.y = w.time * 0.4 + idx * 0.75;
          });
          cornerCrystalsRef.forEach((cr, idx) => {
            cr.rotation.y = w.time * 1.4 + idx;
            cr.position.y = 7.4 + Math.sin(w.time * 2.2 + idx) * 0.35;
          });

          const orbitAngle = w.time * 0.22;
          const orbitRadius = 8.4;
          camera.position.set(
            Math.sin(orbitAngle) * orbitRadius,
            4.6 + Math.sin(w.time * 0.4) * 0.4,
            Math.cos(orbitAngle) * orbitRadius,
          );
          camera.lookAt(0, 1.3, 0);
        } else {
          if (screenRef.current === 'PLAYING') {
            stepSimulation(dt);
          }

          const nextFov = w.baseFov + w.fovPunch;
          if (Math.abs(camera.fov - nextFov) > 0.04) {
            camera.fov = nextFov;
            camera.updateProjectionMatrix();
          }

          const hasBoss = w.enemies.some((e) => e.isBoss);
          const zoom = cameraZoomRef.current;
          const baseCamY = hasBoss ? 15.2 : 12.6;
          const baseCamZ = hasBoss ? 19.2 : 15.8;
          const camOffsetY = baseCamY * zoom;
          const camOffsetZ = baseCamZ * zoom;

          const leadX = Math.sin(w.player.aimAngle) * 1.45;
          const leadZ = Math.cos(w.player.aimAngle) * 1.45;
          const sx = w.shakeMag > 0.02 ? (Math.random() - 0.5) * w.shakeMag : 0;
          const sz = w.shakeMag > 0.02 ? (Math.random() - 0.5) * w.shakeMag : 0;

          _camTarget.set(w.player.x + leadX * 0.45 + sx, camOffsetY, w.player.z + camOffsetZ + leadZ * 0.45 + sz);
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTarget.x, 9, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTarget.y, 9, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTarget.z, 9, dt);

          _camLook.set(w.player.x + leadX * 0.55, 1.35, w.player.z + leadZ * 0.55);
          camera.lookAt(_camLook);
        }

        if (bloomPass) {
          bloomPass.enabled = true;
        }
        if (isSoftwareGl || !composer) {
          renderer.render(scene, camera);
        } else {
          composer.render();
        }

        // Crisp 2D Projected Overlay: Enemy Mini HP Bars, Freeze Tags & Floating Combat Text
        if (overlayCtx) {
          const cw = container.clientWidth || window.innerWidth;
          const ch = container.clientHeight || window.innerHeight;
          overlayCtx.clearRect(0, 0, cw, ch);
          if (screenRef.current === 'TITLE') {
            if (isSoftwareGl) afterDraw(tick);
            else frameId = window.requestAnimationFrame(tick);
            return;
          }

          // Damaged regular enemy mini HP bars & Ctrl+Z Freeze indicator
          for (const e of w.enemies) {
            if (e.isBoss) continue;
            const showHp = e.hp < e.maxHp;
            const showFreeze = w.ctrlZTimer > 0;
            if (!showHp && !showFreeze) continue;

            _projVec.set(e.x, 2.05, e.z).project(camera);
            if (_projVec.z > 1) continue;
            const px = (_projVec.x * 0.5 + 0.5) * cw;
            const py = (-_projVec.y * 0.5 + 0.5) * ch;

            if (showHp) {
              const bw = 34;
              overlayCtx.fillStyle = 'rgba(15, 23, 42, 0.25)';
              overlayCtx.fillRect(px - bw / 2 - 1, py - 1, bw + 2, 6);
              overlayCtx.fillStyle = '#ffffff';
              overlayCtx.fillRect(px - bw / 2, py, bw, 4);
              overlayCtx.fillStyle = '#e11d48';
              overlayCtx.fillRect(px - bw / 2, py, bw * Math.max(0, e.hp / e.maxHp), 4);
            }
            if (showFreeze) {
              overlayCtx.font = '700 10px "JetBrains Mono", monospace';
              overlayCtx.textAlign = 'center';
              overlayCtx.strokeStyle = '#ffffff';
              overlayCtx.lineWidth = 3;
              overlayCtx.strokeText('CTRL+Z', px, py - 4);
              overlayCtx.fillStyle = '#0284c7';
              overlayCtx.fillText('CTRL+Z', px, py - 4);
            }
          }

          for (const lbl of w.labels) {
            _projVec.set(lbl.wx, lbl.wy, lbl.wz).project(camera);
            if (_projVec.z > 1) continue;
            const px = (_projVec.x * 0.5 + 0.5) * cw;
            const py = (-_projVec.y * 0.5 + 0.5) * ch;
            overlayCtx.save();
            overlayCtx.globalAlpha = Math.max(0, lbl.life / lbl.maxLife);
            overlayCtx.font = `700 ${lbl.size}px "JetBrains Mono", monospace`;
            overlayCtx.textAlign = 'center';
            overlayCtx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
            overlayCtx.lineWidth = 3;
            overlayCtx.strokeText(lbl.text, px, py);
            overlayCtx.fillStyle = lbl.color;
            overlayCtx.fillText(lbl.text, px, py);
            overlayCtx.restore();
          }
        }

        hudAcc += dt;
        if (hudAcc >= 0.08) {
          hudAcc = 0;
          const boss = w.enemies.find((e) => e.isBoss);
          const cwCfg = WAVE_CONFIGS[w.waveIndex];
          const dashRatio =
            w.player.dashCooldown <= 0
              ? 1
              : 1 - w.player.dashCooldown / w.player.maxDashCooldown;
          const shockRatio =
            w.player.shockwaveCooldown <= 0
              ? 1
              : 1 - w.player.shockwaveCooldown / w.player.maxShockwaveCooldown;
          const ultPct = Math.floor(w.player.ultCharge);

          const isFiringNow =
            !w.isOverheated && (w.pointerDown || w.keys.has('KeyJ') || mobileFireRef.current);

          setTouchCooldowns({
            dashReady: dashRatio,
            shockReady: shockRatio,
            ultCharge: ultPct,
            heat: Math.round(w.weaponHeat),
            overheated: w.isOverheated,
            isFiring: isFiringNow,
            ventBuff: w.ventBuffTimer > 0,
          });
          setEdgeFx({
            damageFlash: w.damageFlash,
            coffee: w.coffeeTimer > 0,
            ctrlZ: w.ctrlZTimer > 0,
          });

          const radarBlips: RadarBlip[] = [];
          w.beacons.forEach((b, bIdx) => {
            radarBlips.push({
              nx: b.x / ARENA_HALF_SIZE,
              nz: b.z / ARENA_HALF_SIZE,
              kind: (w.beaconCooldowns[bIdx] ?? 0) <= 0 ? 'beaconReady' : 'beaconCool',
            });
          });
          for (const cr of w.crates) {
            radarBlips.push({
              nx: cr.x / ARENA_HALF_SIZE,
              nz: cr.z / ARENA_HALF_SIZE,
              kind: 'crate',
            });
          }
          const sortedEnemies = [...w.enemies]
            .sort((a, b) => {
              if (a.isBoss !== b.isBoss) return a.isBoss ? -1 : 1;
              if (a.isElite !== b.isElite) return a.isElite ? -1 : 1;
              return (
                Math.hypot(a.x - w.player.x, a.z - w.player.z) -
                Math.hypot(b.x - w.player.x, b.z - w.player.z)
              );
            })
            .slice(0, 38);
          for (const e of sortedEnemies) {
            radarBlips.push({
              nx: e.x / ARENA_HALF_SIZE,
              nz: e.z / ARENA_HALF_SIZE,
              kind: e.isBoss ? 'boss' : e.isElite ? 'elite' : 'enemy',
            });
          }

          onHudUpdate({
            hp: Math.max(0, Math.round(w.player.hp)),
            maxHp: w.player.maxHp,
            xp: w.player.xp,
            nextXp: w.player.nextXp,
            level: w.player.level,
            ultCharge: ultPct,
            dashReadyRatio: dashRatio,
            shockwaveReadyRatio: shockRatio,
            weaponHeat: Math.round(w.weaponHeat),
            isOverheated: w.isOverheated,
            isFiring: !w.isOverheated && (w.pointerDown || w.keys.has('KeyJ') || mobileFireRef.current),
            ventBuffActive: w.ventBuffTimer > 0,
            styleRank: computeStyleRank(w.stylePoints),
            arenaHalfSize: ARENA_HALF_SIZE,
            playerNormX: w.player.x / ARENA_HALF_SIZE,
            playerNormZ: w.player.z / ARENA_HALF_SIZE,
            playerAimAngle: w.player.aimAngle,
            radarBlips,
            wave: cwCfg.wave,
            totalWaves: WAVE_CONFIGS.length,
            waveLabel: cwCfg.label,
            waveTimeLeft: Math.max(0, Math.ceil(w.waveTimer)),
            score: w.score,
            kills: w.kills,
            combo: w.combo,
            maxCombo: w.maxCombo,
            elapsedSeconds: Math.floor(w.elapsedSeconds),
            skills: { ...w.player.skills },
            activeBuffs: {
              coffeeTimer: Math.ceil(w.coffeeTimer),
              ctrlZTimer: Math.ceil(w.ctrlZTimer),
            },
            activeBoss: boss
              ? {
                  name: boss.name,
                  subtitle:
                    boss.type === 'bossDeadline'
                      ? `Pha ${boss.bossPhase ?? 1}/3 · Hạn chót nộp đồ án`
                      : 'Cảnh báo cổng kiểm tra giữa kỳ',
                  hp: Math.max(0, Math.round(boss.hp)),
                  maxHp: boss.maxHp,
                  phase: boss.bossPhase ?? 1,
                }
              : null,
            bannerMessage: w.bannerMessage,
          });
        }
      }

      if (isSoftwareGl) afterDraw(tick);
      else frameId = window.requestAnimationFrame(tick);
    };

    // Async bootstrap: load local Kenney CC0 3D kit cleanly, then construct arena + hero and start loop
    (async () => {
      const kenneyPack = await Promise.race([
        loadKenneyPack(),
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 10000)),
      ]);
      if (disposed) return;

      const env = createArenaEnvironment(scene, renderer, isSoftwareGl, kenneyPack);
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      const shared = createSharedVisualAssets(env.contactShadowTex, maxAniso);

      contactShadowTexRef = env.contactShadowTex;
      sharedAssetsRef = shared;
      perimeterRingRef = env.perimeterRing;
      scanRingRef = env.scanRing;
      centerSealRef = env.centerSeal;
      cornerCrystalsRef = env.cornerCrystals;
      holoPlanetsRef = env.holoPlanets;
      firefliesRef = env.fireflies;

      const hero = createStudentHeroMesh(env.contactShadowTex, kenneyPack);
      scene.add(hero.root);

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }

      const cw = container.clientWidth || window.innerWidth;
      const ch = container.clientHeight || window.innerHeight;
      const aspect = cw / Math.max(1, ch);
      const currentBaseFov = aspect < 1 ? Math.min(68, 45 / Math.max(0.66, aspect)) : 45;

      worldRef.current = {
        scene,
        contactShadowTex: env.contactShadowTex,
        shared,
        maxAniso,
        kenney: kenneyPack,
        obstacles: env.obstacles,
        beacons: env.beacons,
        beaconPads: env.beaconPads,
        beaconCooldowns: [0, 0, 0, 0],
        hero,
        heroMoving: false,
        aimReticle: env.aimReticle,
        targetLockReticle: env.targetLockReticle,
        scanRing: env.scanRing,
        holoPlanets: env.holoPlanets,
        baseFov: currentBaseFov,
        fovPunch: 0,
        ultFlashTimer: 0,
        hitstopTimer: 0,
        pointerDown: false,
        barrelToggle: 0,
        player: {
          x: 0,
          z: 0,
          vx: 0,
          vz: 0,
          radius: 0.72,
          aimAngle: 0,
          hp: 120,
          maxHp: 120,
          xp: 0,
          nextXp: 42,
          level: 1,
          ultCharge: 40,
          dashCooldown: 0,
          maxDashCooldown: 2.1,
          dashTimer: 0,
          dashDirX: 0,
          dashDirZ: -1,
          shockwaveCooldown: 0,
          maxShockwaveCooldown: 4.5,
          invulnTimer: 0.9,
          fireCooldown: 0,
          blasterRecoil: 0,
          shieldAngle: 0,
          skills: {
            forLoop: 1,
            tryCatch: 0,
            banMeCoffee: 0,
            binarySearch: 0,
            mentorAdvice: 0,
            sunflowerAura: 0,
          },
        },
        enemies: [],
        projectiles: [],
        xpGems: [],
        powerUps: [],
        crates: [],
        hazards: [],
        particles: [],
        labels: [],
        keys: new Set(),
        pointerNdc: { x: 0, y: 0 },
        time: 0,
        elapsedSeconds: 0,
        waveIndex: 0,
        waveTimer: WAVE_CONFIGS[0].durationSeconds,
        spawnTimer: 0.25,
        powerUpSpawnTimer: 8,
        crateSpawnTimer: 9,
        muzzleTimer: 0,
        dashGhostTimer: 0,
        dashHitIds: new Set(),
        feverAnnounced: false,
        bossSpawnedWaves: new Set(),
        announcedBossPhase: 1,
        score: 0,
        kills: 0,
        combo: 0,
        maxCombo: 0,
        comboTimer: 0,
        xpCombo: 0,
        xpComboTimer: 0,
        nextEntityId: 1,
        shakeMag: 0,
        damageFlash: 0,
        coffeeTimer: 0,
        ctrlZTimer: 0,
        auraDamageTimer: 0,
        auraNovaTimer: 0,
        puddleTickTimer: 0,
        weaponHeat: 0,
        isOverheated: false,
        overheatTimer: 0,
        ventBuffTimer: 0,
        stylePoints: 15,
        shieldHitTimers: new Map(),
        bannerMessage: 'Đợt 1 · 21:00 Cyber-Lab — Giữ Chuột trái / BẮN để chiến đấu, Space Lướt, Q Phản Đạn, R Xả Nhiệt!',
        bannerTimer: 4.0,
        quoteIndex: 0,
        matchEnded: false,
      };

      clock.getDelta();
      if (isSoftwareGl) afterDraw(tick);
      else frameId = window.requestAnimationFrame(tick);
    })();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUpGlobal);
      window.removeEventListener('blur', onPointerUpGlobal);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

      disposeObject3D(scene);
      sharedAssetsRef?.dispose();
      contactShadowTexRef?.dispose();
      playerBulletGeo.dispose();
      enemyBulletGeo.dispose();
      boulderGeo.dispose();
      gemGeo.dispose();
      sparkGeo.dispose();
      petalGeo.dispose();
      ringGeo.dispose();
      domeGeo.dispose();
      pillarGeo.dispose();
      meteorBeamGeo.dispose();
      telegraphStripGeo.dispose();
      bulletMatCyan.dispose();
      bulletMatAmber.dispose();
      bulletMatGold.dispose();
      bulletMatPurple.dispose();
      bulletMatEnemyRed.dispose();
      bulletMatEnemyPink.dispose();
      bulletMatEnemyOrange.dispose();
      telegraphMat.dispose();
      puddleMat.dispose();
      composer?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      worldRef.current = null;
    };
  }, [onHudUpdate, onMatchEnd, onPauseToggle, onTriggerLevelUp]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.changedTouches[0];
    if (!t) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    touchJoyRef.current = {
      active: true,
      id: t.identifier,
      ox: cx,
      oy: cy,
      dx: 0,
      dy: 0,
    };
    setJoyVisual({ active: true, knobX: 0, knobY: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const joy = touchJoyRef.current;
    if (!joy.active) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joy.id) {
        const vx = t.clientX - joy.ox;
        const vy = t.clientY - joy.oy;
        const maxR = 40;
        const d = Math.hypot(vx, vy) || 1;
        const clamped = Math.min(d, maxR);
        const kx = (vx / d) * clamped;
        const ky = (vy / d) * clamped;
        joy.dx = kx / maxR;
        joy.dy = ky / maxR;
        setJoyVisual({ active: true, knobX: kx, knobY: ky });
      }
    }
  };

  const handleTouchEnd = () => {
    touchJoyRef.current.active = false;
    touchJoyRef.current.dx = 0;
    touchJoyRef.current.dy = 0;
    setJoyVisual({ active: false, knobX: 0, knobY: 0 });
  };

  if (webglError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#f6f8fc] p-6 text-center text-slate-900">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <h2 className="font-display text-xl font-extrabold text-amber-700">
            Trình duyệt chưa bật tăng tốc 3D WebGL
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Vui lòng bật Hardware Acceleration trong trình duyệt để trải nghiệm đấu trường 3D Three.js.
          </p>
        </div>
      </div>
    );
  }

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const w = worldRef.current;
    if (!w || screenRef.current !== 'PLAYING') return;
    const t = e.touches[0];
    if (!t) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((t.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((t.clientY - rect.top) / rect.height) * 2 + 1;
    w.pointerNdc.x = nx;
    w.pointerNdc.y = ny;
    const dx = t.clientX - (rect.left + rect.width / 2);
    const dy = t.clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) > 8) {
      mobileAimDragRef.current = true;
      w.player.aimAngle = Math.atan2(dx, dy);
    }
  };

  const handleCanvasTouchEnd = () => {
    mobileAimDragRef.current = false;
  };

  const handleFireBtnTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    soundEngine.unlock();
    const t = e.changedTouches[0];
    if (t) {
      mobileFireTouchRef.current = { id: t.identifier, ox: t.clientX, oy: t.clientY };
    }
    mobileFireRef.current = true;
  };

  const handleFireBtnTouchMove = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const w = worldRef.current;
    if (!w) return;
    const anchor = mobileFireTouchRef.current;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === anchor.id) {
        const dx = t.clientX - anchor.ox;
        const dy = t.clientY - anchor.oy;
        if (Math.hypot(dx, dy) > 6) {
          mobileAimDragRef.current = true;
          w.player.aimAngle = Math.atan2(dx, dy);
        }
      }
    }
  };

  const handleFireBtnTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    mobileFireRef.current = false;
    mobileAimDragRef.current = false;
    mobileFireTouchRef.current.id = null;
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    soundEngine.unlock();
    const w = worldRef.current;
    if (!w || screenRef.current !== 'PLAYING') return;
    if (e.button === 2) {
      e.preventDefault();
      triggerShockwaveRef.current();
      return;
    }
    if (e.button === 0 && e.pointerType !== 'touch') {
      const rect = e.currentTarget.getBoundingClientRect();
      w.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      w.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      w.pointerDown = true;
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      {/* Isolated WebGL mount container */}
      <div
        ref={mountRef}
        onPointerDown={handleCanvasPointerDown}
        onContextMenu={(e) => e.preventDefault()}
        onTouchStart={handleCanvasTouchMove}
        onTouchMove={handleCanvasTouchMove}
        onTouchEnd={handleCanvasTouchEnd}
        onTouchCancel={handleCanvasTouchEnd}
        className="h-full w-full cursor-crosshair touch-none"
      />

      {/* Projected 2D Damage Numbers, Mini HP Bars & Funny Combat Barks */}
      <canvas
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      />

      {/* Screen-edge atmospheric feedback overlays */}
      {edgeFx.damageFlash > 0.05 && (
        <div
          className="pointer-events-none absolute inset-0 z-10 border-4 border-rose-500/70"
          style={{
            opacity: edgeFx.damageFlash * 0.8,
            boxShadow: 'inset 0 0 65px rgba(244, 63, 94, 0.55)',
          }}
        />
      )}
      {edgeFx.coffee && (
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{ boxShadow: 'inset 0 0 48px rgba(245, 158, 11, 0.25)' }}
        />
      )}
      {edgeFx.ctrlZ && (
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{ boxShadow: 'inset 0 0 56px rgba(6, 182, 212, 0.28)' }}
        />
      )}

      {/* Ergonomic Two-Thumb Mobile Controls: Left Joystick + Right Spacious MOBA Arc */}
      {isTouchDevice && screenState === 'PLAYING' && (
        <>
          <div
            onTouchStart={(e) => {
              e.stopPropagation();
              handleTouchStart(e);
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
              handleTouchMove(e);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              handleTouchEnd();
            }}
            onTouchCancel={(e) => {
              e.stopPropagation();
              handleTouchEnd();
            }}
            aria-label="Cần điều khiển di chuyển"
            className={`fixed bottom-5 left-5 z-20 flex h-30 w-30 items-center justify-center rounded-full border-2 shadow-lg touch-none transition-colors ${
              joyVisual.active
                ? 'border-amber-500 bg-white/90'
                : 'border-sky-400/80 bg-white/80'
            }`}
          >
            <div
              className="h-12 w-12 rounded-full border-2 border-amber-500 bg-sky-200/80 shadow-md"
              style={{
                transform: `translate(${joyVisual.knobX}px, ${joyVisual.knobY}px)`,
              }}
            />
          </div>

          {/* Spacious Right-Thumb MOBA Skill Arc (Light Theme) */}
          <div className="pointer-events-none fixed bottom-4 right-4 z-20 h-52 w-56">
            {/* BÃO E — Golden Dã Quỳ (Top-Right) */}
            <button
              type="button"
              onTouchStart={(e) => {
                e.stopPropagation();
                soundEngine.unlock();
                triggerUltRef.current();
              }}
              onClick={(e) => {
                e.stopPropagation();
                triggerUltRef.current();
              }}
              disabled={touchCooldowns.ultCharge < 100}
              className={`pointer-events-auto absolute top-0 right-1 flex h-[66px] w-[66px] flex-col items-center justify-center overflow-hidden rounded-full border-2 shadow-md active:scale-90 transition-all touch-none ${
                touchCooldowns.ultCharge >= 100
                  ? 'border-amber-500 bg-gradient-to-br from-amber-300 to-yellow-400 text-slate-950 shadow-amber-400/40'
                  : 'border-amber-300 bg-white/90 text-amber-800'
              }`}
            >
              {touchCooldowns.ultCharge < 100 && (
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 bg-amber-300/35"
                  style={{ height: `${touchCooldowns.ultCharge}%` }}
                />
              )}
              <Sparkles className="relative h-4 w-4" />
              <span className="relative text-[10px] font-extrabold leading-tight">BÃO E</span>
              <span className="font-mono-num relative text-[9px] font-bold">{touchCooldowns.ultCharge}%</span>
            </button>

            {/* XẢ NHIỆT — Orange-Red Heat Vent (Top-Mid) */}
            <button
              type="button"
              onTouchStart={(e) => {
                e.stopPropagation();
                soundEngine.unlock();
                triggerVentRef.current();
              }}
              onClick={(e) => {
                e.stopPropagation();
                triggerVentRef.current();
              }}
              disabled={touchCooldowns.heat < 35 && !touchCooldowns.overheated}
              className={`pointer-events-auto absolute top-4 right-[84px] flex h-[58px] w-[58px] flex-col items-center justify-center overflow-hidden rounded-full border-2 shadow-md active:scale-90 transition-all touch-none ${
                touchCooldowns.overheated
                  ? 'border-rose-500 bg-rose-100 text-rose-800 animate-pulse'
                  : touchCooldowns.heat >= 35
                    ? 'border-orange-400 bg-orange-50 text-orange-800'
                    : 'border-slate-300 bg-white/85 text-slate-400'
              }`}
            >
              <Flame className="h-4 w-4" />
              <span className="text-[9px] font-extrabold leading-tight">XẢ</span>
              <span className="font-mono-num text-[9px] font-bold">{touchCooldowns.heat}%</span>
            </button>

            {/* CHÉM XUNG KATANA — Violet-Magenta Parry (Mid-Left) */}
            <button
              type="button"
              onTouchStart={(e) => {
                e.stopPropagation();
                soundEngine.unlock();
                triggerShockwaveRef.current();
              }}
              onClick={(e) => {
                e.stopPropagation();
                triggerShockwaveRef.current();
              }}
              className={`pointer-events-auto absolute top-[68px] left-2 flex h-[62px] w-[62px] flex-col items-center justify-center overflow-hidden rounded-full border-2 shadow-md active:scale-90 transition-all touch-none ${
                touchCooldowns.shockReady >= 1
                  ? 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-900'
                  : 'border-fuchsia-200 bg-white/90 text-fuchsia-700/75'
              }`}
            >
              {touchCooldowns.shockReady < 1 && (
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 bg-fuchsia-300/35"
                  style={{ height: `${Math.round(touchCooldowns.shockReady * 100)}%` }}
                />
              )}
              <Swords className="relative h-4 w-4" />
              <span className="relative text-[10px] font-extrabold leading-tight">XUNG</span>
              <span className="font-mono-num relative text-[9px]">
                {Math.round(touchCooldowns.shockReady * 100)}%
              </span>
            </button>

            {/* LƯỚT — Electric Sky Dash (Bottom-Left) */}
            <button
              type="button"
              onTouchStart={(e) => {
                e.stopPropagation();
                soundEngine.unlock();
                triggerDashRef.current();
              }}
              onClick={(e) => {
                e.stopPropagation();
                triggerDashRef.current();
              }}
              className={`pointer-events-auto absolute bottom-1 left-[42px] flex h-[62px] w-[62px] flex-col items-center justify-center overflow-hidden rounded-full border-2 shadow-md active:scale-90 transition-all touch-none ${
                touchCooldowns.dashReady >= 1
                  ? 'border-sky-400 bg-sky-50 text-sky-900'
                  : 'border-sky-200 bg-white/90 text-sky-700/75'
              }`}
            >
              {touchCooldowns.dashReady < 1 && (
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 bg-sky-300/35"
                  style={{ height: `${Math.round(touchCooldowns.dashReady * 100)}%` }}
                />
              )}
              <Zap className="relative h-4 w-4" />
              <span className="relative text-[10px] font-extrabold leading-tight">LƯỚT</span>
              <span className="font-mono-num relative text-[9px]">
                {Math.round(touchCooldowns.dashReady * 100)}%
              </span>
            </button>

            {/* BẮN / OVERDRIVE — Giant Hold-to-Fire & Drag-to-Aim Anchor (Bottom-Right) */}
            <button
              type="button"
              onTouchStart={handleFireBtnTouchStart}
              onTouchMove={handleFireBtnTouchMove}
              onTouchEnd={handleFireBtnTouchEnd}
              onTouchCancel={handleFireBtnTouchEnd}
              onMouseDown={() => {
                soundEngine.unlock();
                mobileFireRef.current = true;
              }}
              onMouseUp={() => {
                mobileFireRef.current = false;
              }}
              onMouseLeave={() => {
                mobileFireRef.current = false;
              }}
              className={`pointer-events-auto absolute bottom-0 right-0 flex h-[88px] w-[88px] flex-col items-center justify-center rounded-full border-[3px] shadow-lg active:scale-95 transition-all touch-none ${
                touchCooldowns.overheated
                  ? 'border-rose-500 bg-rose-100 text-rose-800'
                  : touchCooldowns.isFiring
                    ? 'border-amber-500 bg-gradient-to-br from-amber-300 to-orange-400 text-slate-950'
                    : touchCooldowns.ventBuff
                      ? 'border-amber-400 bg-amber-50 text-amber-900'
                      : 'border-sky-400 bg-white/92 text-sky-900'
              }`}
            >
              <Crosshair className="h-6 w-6" />
              <span className="text-xs font-black tracking-wide">BẮN</span>
              <span className="font-mono-num text-[9px] font-bold opacity-90">
                {touchCooldowns.overheated ? 'NÓNG!' : `${touchCooldowns.heat}%`}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
