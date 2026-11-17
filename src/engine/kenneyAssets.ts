import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export interface KenneyPack {
  heroScene: THREE.Group | null;
  heroAnimations: THREE.AnimationClip[];
  heroFemale: THREE.Group | null;
  heroFemaleAnimations: THREE.AnimationClip[];
  charAlien: THREE.Group | null;
  charAlienAnimations: THREE.AnimationClip[];
  charZombie: THREE.Group | null;
  charZombieAnimations: THREE.AnimationClip[];
  charRobot: THREE.Group | null;
  charRobotAnimations: THREE.AnimationClip[];
  charRaider: THREE.Group | null;
  charRaiderAnimations: THREE.AnimationClip[];
  charKnight: THREE.Group | null;
  charKnightAnimations: THREE.AnimationClip[];
  charGhost: THREE.Group | null;
  charGhostAnimations: THREE.AnimationClip[];
  charSkeleton: THREE.Group | null;
  charSkeletonAnimations: THREE.AnimationClip[];
  charKeeper: THREE.Group | null;
  charKeeperAnimations: THREE.AnimationClip[];
  charVampire: THREE.Group | null;
  charVampireAnimations: THREE.AnimationClip[];
  weaponSword: THREE.Group | null;
  weaponSpear: THREE.Group | null;
  shieldRound: THREE.Group | null;
  blaster: THREE.Group | null;
  blasterRepeater: THREE.Group | null;
  enemyFlying: THREE.Group | null;
  characterSoldier: THREE.Group | null;
  characterSoldierAnimations: THREE.AnimationClip[];
  platCharacter: THREE.Group | null;
  platCharacterAnimations: THREE.AnimationClip[];
  column: THREE.Group | null;
  trophy: THREE.Group | null;
  buildingA: THREE.Group | null;
  buildingB: THREE.Group | null;
  ufoA: THREE.Group | null;
  ufoB: THREE.Group | null;
  ufoC: THREE.Group | null;
  ufoD: THREE.Group | null;
  alien: THREE.Group | null;
  craftBoss: THREE.Group | null;
  computerSystem: THREE.Group | null;
  computerWide: THREE.Group | null;
  displayWall: THREE.Group | null;
  barrier: THREE.Group | null;
  holoTable: THREE.Group | null;
  crate: THREE.Group | null;
  crystal: THREE.Group | null;
  flowerA: THREE.Group | null;
  flowerB: THREE.Group | null;
  treePine: THREE.Group | null;
  rockLarge: THREE.Group | null;
  rockTall: THREE.Group | null;
  loadedCount: number;
}

const MODEL_PATHS = {
  hero: '/assets/models/mini-characters/hero.glb',
  heroFemale: '/assets/models/mini-characters/character-female-b.glb',
  charAlien: '/assets/models/mini-characters/character-alien.glb',
  charZombie: '/assets/models/mini-characters/character-zombie.glb',
  charRobot: '/assets/models/mini-characters/character-robot.glb',
  charRaider: '/assets/models/mini-characters/character-raider.glb',
  charKnight: '/assets/models/mini-characters/character-knight.glb',
  charGhost: '/assets/models/graveyard/character-ghost.glb',
  charSkeleton: '/assets/models/graveyard/character-skeleton.glb',
  charKeeper: '/assets/models/graveyard/character-keeper.glb',
  charVampire: '/assets/models/graveyard/character-vampire.glb',
  weaponSword: '/assets/models/mini-characters/weapon-sword.glb',
  weaponSpear: '/assets/models/mini-characters/weapon-spear.glb',
  shieldRound: '/assets/models/mini-characters/shield-round.glb',
  blaster: '/assets/models/blaster/blaster.glb',
  blasterRepeater: '/assets/models/fps/blaster-repeater.glb',
  enemyFlying: '/assets/models/fps/enemy-flying.glb',
  characterSoldier: '/assets/models/arena/character-soldier.glb',
  platCharacter: '/assets/models/plat/character.glb',
  column: '/assets/models/arena/column.glb',
  trophy: '/assets/models/arena/trophy.glb',
  buildingA: '/assets/models/city/building-small-a.glb',
  buildingB: '/assets/models/city/building-small-b.glb',
  ufoA: '/assets/models/tower-defense/ufo-a.glb',
  ufoB: '/assets/models/tower-defense/ufo-b.glb',
  ufoC: '/assets/models/tower-defense/ufo-c.glb',
  ufoD: '/assets/models/tower-defense/ufo-d.glb',
  crystal: '/assets/models/tower-defense/crystal.glb',
  computerSystem: '/assets/models/space-station/computer-system.glb',
  computerWide: '/assets/models/space-station/computer-wide.glb',
  displayWall: '/assets/models/space-station/display-wall.glb',
  barrier: '/assets/models/space-station/barrier.glb',
  holoTable: '/assets/models/space-station/holo-table.glb',
  crate: '/assets/models/space-station/crate.glb',
  alien: '/assets/models/space/alien.glb',
  craftBoss: '/assets/models/space/craft-boss.glb',
  flowerA: '/assets/models/nature/flower-a.glb',
  flowerB: '/assets/models/nature/flower-b.glb',
  treePine: '/assets/models/nature/tree-pine.glb',
  rockLarge: '/assets/models/nature/rock-large.glb',
  rockTall: '/assets/models/nature/rock-tall.glb',
} as const;

let cachedPromise: Promise<KenneyPack> | null = null;
let cachedToonGradient: THREE.DataTexture | null = null;
const cachedOutlineMaterials = new Map<string, THREE.MeshLambertMaterial>();

export function getAnimeToonGradientMap(): THREE.DataTexture {
  if (cachedToonGradient) return cachedToonGradient;
  // 4-band crisp anime cel-shading ramp (shadow -> mid -> bright -> specular pop)
  const steps = [88, 152, 214, 255];
  const data = new Uint8Array(steps.length * 4);
  for (let i = 0; i < steps.length; i++) {
    const v = steps[i];
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  cachedToonGradient = tex;
  return tex;
}

function getAnimeOutlineMaterial(colorHex: number, localThickness: number): THREE.MeshLambertMaterial {
  const quantized = Math.round(localThickness * 1000) / 1000;
  const key = `${colorHex}_${quantized}`;
  const existing = cachedOutlineMaterials.get(key);
  if (existing) return existing;

  const mat = new THREE.MeshLambertMaterial({
    color: 0x000000,
    emissive: colorHex,
    emissiveIntensity: 1.0,
    side: THREE.BackSide,
    fog: true,
  });
  mat.userData.sharedKenneyMat = true;
  mat.userData.isAnimeOutline = true;
  mat.customProgramCacheKey = () => `anime-outline-${quantized.toFixed(4)}`;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
float animeNormLen = length(objectNormal);
if (animeNormLen > 0.0001) {
  transformed += (objectNormal / animeNormLen) * ${quantized.toFixed(4)};
}`,
    );
  };

  cachedOutlineMaterials.set(key, mat);
  return mat;
}

function prepareLoadedScene(root: THREE.Group): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (mesh.geometry) {
        mesh.geometry.userData.sharedKenneyGeo = true;
      }
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (!m) continue;
        m.userData.sharedKenneyMat = true;
        const std = m as THREE.MeshStandardMaterial;
        if (std.map) {
          std.map.colorSpace = THREE.SRGBColorSpace;
          std.map.needsUpdate = true;
        }
        // Keep textures crisp and anti-glare without washed-out bloom reflections
        if (typeof std.envMapIntensity === 'number') {
          std.envMapIntensity = 0.78;
        }
        if (typeof std.roughness === 'number') {
          std.roughness = Math.min(0.84, Math.max(0.32, std.roughness));
        }
        std.needsUpdate = true;
      }
    }
  });
}

export function loadKenneyPack(): Promise<KenneyPack> {
  if (cachedPromise) return cachedPromise;

  const loader = new GLTFLoader();
  const loadOne = async (
    url: string,
  ): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] } | null> => {
    try {
      const gltf = await loader.loadAsync(url);
      prepareLoadedScene(gltf.scene);
      return { scene: gltf.scene, animations: gltf.animations || [] };
    } catch (err) {
      console.warn(`[KenneyPack] Failed to load ${url}:`, err);
      return null;
    }
  };

  cachedPromise = (async () => {
    const entries = await Promise.all([
      loadOne(MODEL_PATHS.hero),
      loadOne(MODEL_PATHS.heroFemale),
      loadOne(MODEL_PATHS.charAlien),
      loadOne(MODEL_PATHS.charZombie),
      loadOne(MODEL_PATHS.charRobot),
      loadOne(MODEL_PATHS.charRaider),
      loadOne(MODEL_PATHS.charKnight),
      loadOne(MODEL_PATHS.charGhost),
      loadOne(MODEL_PATHS.charSkeleton),
      loadOne(MODEL_PATHS.charKeeper),
      loadOne(MODEL_PATHS.charVampire),
      loadOne(MODEL_PATHS.weaponSword),
      loadOne(MODEL_PATHS.weaponSpear),
      loadOne(MODEL_PATHS.shieldRound),
      loadOne(MODEL_PATHS.blaster),
      loadOne(MODEL_PATHS.blasterRepeater),
      loadOne(MODEL_PATHS.enemyFlying),
      loadOne(MODEL_PATHS.characterSoldier),
      loadOne(MODEL_PATHS.platCharacter),
      loadOne(MODEL_PATHS.column),
      loadOne(MODEL_PATHS.trophy),
      loadOne(MODEL_PATHS.buildingA),
      loadOne(MODEL_PATHS.buildingB),
      loadOne(MODEL_PATHS.ufoA),
      loadOne(MODEL_PATHS.ufoB),
      loadOne(MODEL_PATHS.ufoC),
      loadOne(MODEL_PATHS.ufoD),
      loadOne(MODEL_PATHS.alien),
      loadOne(MODEL_PATHS.craftBoss),
      loadOne(MODEL_PATHS.computerSystem),
      loadOne(MODEL_PATHS.computerWide),
      loadOne(MODEL_PATHS.displayWall),
      loadOne(MODEL_PATHS.barrier),
      loadOne(MODEL_PATHS.holoTable),
      loadOne(MODEL_PATHS.crate),
      loadOne(MODEL_PATHS.crystal),
      loadOne(MODEL_PATHS.flowerA),
      loadOne(MODEL_PATHS.flowerB),
      loadOne(MODEL_PATHS.treePine),
      loadOne(MODEL_PATHS.rockLarge),
      loadOne(MODEL_PATHS.rockTall),
    ]);

    const loadedCount = entries.filter(Boolean).length;
    return {
      heroScene: entries[0]?.scene ?? null,
      heroAnimations: entries[0]?.animations ?? [],
      heroFemale: entries[1]?.scene ?? null,
      heroFemaleAnimations: entries[1]?.animations ?? [],
      charAlien: entries[2]?.scene ?? null,
      charAlienAnimations: entries[2]?.animations ?? [],
      charZombie: entries[3]?.scene ?? null,
      charZombieAnimations: entries[3]?.animations ?? [],
      charRobot: entries[4]?.scene ?? null,
      charRobotAnimations: entries[4]?.animations ?? [],
      charRaider: entries[5]?.scene ?? null,
      charRaiderAnimations: entries[5]?.animations ?? [],
      charKnight: entries[6]?.scene ?? null,
      charKnightAnimations: entries[6]?.animations ?? [],
      charGhost: entries[7]?.scene ?? null,
      charGhostAnimations: entries[7]?.animations ?? [],
      charSkeleton: entries[8]?.scene ?? null,
      charSkeletonAnimations: entries[8]?.animations ?? [],
      charKeeper: entries[9]?.scene ?? null,
      charKeeperAnimations: entries[9]?.animations ?? [],
      charVampire: entries[10]?.scene ?? null,
      charVampireAnimations: entries[10]?.animations ?? [],
      weaponSword: entries[11]?.scene ?? null,
      weaponSpear: entries[12]?.scene ?? null,
      shieldRound: entries[13]?.scene ?? null,
      blaster: entries[14]?.scene ?? null,
      blasterRepeater: entries[15]?.scene ?? null,
      enemyFlying: entries[16]?.scene ?? null,
      characterSoldier: entries[17]?.scene ?? null,
      characterSoldierAnimations: entries[17]?.animations ?? [],
      platCharacter: entries[18]?.scene ?? null,
      platCharacterAnimations: entries[18]?.animations ?? [],
      column: entries[19]?.scene ?? null,
      trophy: entries[20]?.scene ?? null,
      buildingA: entries[21]?.scene ?? null,
      buildingB: entries[22]?.scene ?? null,
      ufoA: entries[23]?.scene ?? null,
      ufoB: entries[24]?.scene ?? null,
      ufoC: entries[25]?.scene ?? null,
      ufoD: entries[26]?.scene ?? null,
      alien: entries[27]?.scene ?? null,
      craftBoss: entries[28]?.scene ?? null,
      computerSystem: entries[29]?.scene ?? null,
      computerWide: entries[30]?.scene ?? null,
      displayWall: entries[31]?.scene ?? null,
      barrier: entries[32]?.scene ?? null,
      holoTable: entries[33]?.scene ?? null,
      crate: entries[34]?.scene ?? null,
      crystal: entries[35]?.scene ?? null,
      flowerA: entries[36]?.scene ?? null,
      flowerB: entries[37]?.scene ?? null,
      treePine: entries[38]?.scene ?? null,
      rockLarge: entries[39]?.scene ?? null,
      rockTall: entries[40]?.scene ?? null,
      loadedCount,
    };
  })();

  return cachedPromise;
}

/**
 * Clones a loaded Kenney GLB, normalizes it by height or max bounding dimension,
 * rests its base at y=0, and optionally applies anime cel-shading (MeshToonMaterial)
 * plus a skinned-compatible inverted-hull manga ink outline.
 */
export function instantiateKenneyModel(
  source: THREE.Group,
  targetSize: number,
  options?: {
    skinned?: boolean;
    fitBy?: 'height' | 'maxDim';
    toon?: boolean;
    outlineColor?: number;
    outlineWorldThickness?: number;
    emissiveHex?: number;
    emissiveIntensity?: number;
    tintHex?: number;
    tintAmount?: number;
    centerXZ?: boolean;
    rotationY?: number;
    castShadow?: boolean;
    receiveShadow?: boolean;
    shareMaterial?: boolean;
  },
): THREE.Group {
  const clone = (
    options?.skinned ? SkeletonUtils.clone(source) : source.clone(true)
  ) as THREE.Group;

  const needsCustomMat =
    Boolean(options?.toon) ||
    !options?.shareMaterial ||
    options?.tintHex !== undefined ||
    options?.emissiveHex !== undefined;

  const gradientMap = options?.toon ? getAnimeToonGradientMap() : null;
  const meshesForOutline: THREE.Mesh[] = [];

  clone.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    if (options?.castShadow !== undefined) mesh.castShadow = options.castShadow;
    if (options?.receiveShadow !== undefined) mesh.receiveShadow = options.receiveShadow;
    if (options?.outlineColor !== undefined) {
      meshesForOutline.push(mesh);
    }

    if (needsCustomMat) {
      const convertMat = (orig: THREE.Material): THREE.Material => {
        const std = orig as THREE.MeshStandardMaterial;
        if (options?.toon) {
          const toonMat = new THREE.MeshToonMaterial({
            color: std.color ? std.color.clone() : new THREE.Color(0xffffff),
            map: std.map ?? null,
            gradientMap,
            emissive: std.emissive ? std.emissive.clone() : new THREE.Color(0x000000),
            emissiveIntensity: std.emissiveIntensity ?? 0,
            transparent: std.transparent,
            opacity: std.opacity,
          });
          toonMat.userData.sharedKenneyMat = false;
          if (options?.tintHex !== undefined) {
            toonMat.color.lerp(new THREE.Color(options.tintHex), options.tintAmount ?? 0.25);
          }
          if (options?.emissiveHex !== undefined) {
            toonMat.emissive.setHex(options.emissiveHex);
            toonMat.emissiveIntensity = options.emissiveIntensity ?? 0.12;
          }
          return toonMat;
        }
        const cloned = orig.clone() as THREE.MeshStandardMaterial;
        cloned.userData.sharedKenneyMat = false;
        if (options?.tintHex !== undefined && cloned.color) {
          cloned.color.lerp(new THREE.Color(options.tintHex), options.tintAmount ?? 0.25);
        }
        if (options?.emissiveHex !== undefined && cloned.emissive) {
          cloned.emissive.setHex(options.emissiveHex);
          cloned.emissiveIntensity = options.emissiveIntensity ?? 0.12;
        }
        return cloned;
      };

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(convertMat);
      } else if (mesh.material) {
        mesh.material = convertMat(mesh.material);
      }
    }
  });

  if (options?.rotationY) {
    clone.rotation.y = options.rotationY;
  }

  clone.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(clone);
  const size = new THREE.Vector3();
  box.getSize(size);

  const measure =
    options?.fitBy === 'height'
      ? Math.max(0.001, size.y)
      : Math.max(0.001, size.x, size.y, size.z);
  const s = targetSize / measure;
  clone.scale.multiplyScalar(s);

  clone.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(clone);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);

  if (options?.centerXZ !== false) {
    clone.position.x -= scaledCenter.x;
    clone.position.z -= scaledCenter.z;
  }
  clone.position.y -= scaledBox.min.y;

  // Add anime inverted-hull ink outlines AFTER scaling so world thickness is uniform across unit sizes
  if (options?.outlineColor !== undefined && meshesForOutline.length > 0) {
    const worldThick = options.outlineWorldThickness ?? 0.042;
    const localThick = Math.min(0.035, Math.max(0.006, worldThick / Math.max(0.15, s)));
    const outlineMat = getAnimeOutlineMaterial(options.outlineColor, localThick);
    for (const origMesh of meshesForOutline) {
      const parentObj = origMesh.parent;
      if (!parentObj) continue;
      if ((origMesh as THREE.SkinnedMesh).isSkinnedMesh) {
        const skinned = origMesh as THREE.SkinnedMesh;
        const outlineSkinned = new THREE.SkinnedMesh(skinned.geometry, outlineMat);
        outlineSkinned.name = `${skinned.name || 'mesh'}_outline`;
        outlineSkinned.bind(skinned.skeleton, skinned.bindMatrix);
        outlineSkinned.castShadow = false;
        outlineSkinned.receiveShadow = false;
        outlineSkinned.frustumCulled = false;
        parentObj.add(outlineSkinned);
      } else {
        const outlineMesh = new THREE.Mesh(origMesh.geometry, outlineMat);
        outlineMesh.name = `${origMesh.name || 'mesh'}_outline`;
        outlineMesh.position.copy(origMesh.position);
        outlineMesh.rotation.copy(origMesh.rotation);
        outlineMesh.scale.copy(origMesh.scale);
        outlineMesh.castShadow = false;
        outlineMesh.receiveShadow = false;
        parentObj.add(outlineMesh);
      }
    }
  }

  const wrapper = new THREE.Group();
  wrapper.add(clone);
  return wrapper;
}

