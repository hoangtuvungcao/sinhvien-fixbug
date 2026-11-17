export type GameScreenState =
  | 'TITLE'
  | 'PLAYING'
  | 'LEVEL_UP'
  | 'PAUSED'
  | 'VICTORY'
  | 'GAME_OVER';

export type CameraPreset = 'cinematic' | 'topdown';
export type StartMode = 'normal' | 'bossRush';
export type DifficultyMode = 'casual' | 'standard' | 'nightmare';
export type BloomLevel = 'soft' | 'off';
export type StyleRank = 'D' | 'C' | 'B' | 'A' | 'S' | 'SS';

export type SkillId =
  | 'forLoop'
  | 'tryCatch'
  | 'banMeCoffee'
  | 'binarySearch'
  | 'mentorAdvice'
  | 'sunflowerAura';

export interface UpgradeSkillDefinition {
  id: SkillId;
  name: string;
  teacherTag: string;
  maxLevel: number;
  accentColor: string;
  descriptions: string[];
}

export type EnemyArchetype =
  | 'syntax'
  | 'nullPtr'
  | 'loop'
  | 'memLeak'
  | 'conflict'
  | 'miniBoss404'
  | 'bossDeadline';

export type PowerUpType = 'coffeeBoost' | 'teacherUsb' | 'ctrlZ';

export interface RadarBlip {
  /** Normalized arena coordinate [-1, 1] */
  nx: number;
  nz: number;
  kind: 'enemy' | 'elite' | 'boss' | 'beaconReady' | 'beaconCool' | 'crate';
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  xp: number;
  nextXp: number;
  level: number;
  ultCharge: number;
  dashReadyRatio: number;
  shockwaveReadyRatio: number;
  weaponHeat: number;
  isOverheated: boolean;
  isFiring: boolean;
  ventBuffActive: boolean;
  styleRank: StyleRank;
  wave: number;
  totalWaves: number;
  waveLabel: string;
  waveTimeLeft: number;
  score: number;
  kills: number;
  combo: number;
  maxCombo: number;
  elapsedSeconds: number;
  arenaHalfSize: number;
  playerNormX: number;
  playerNormZ: number;
  playerAimAngle: number;
  radarBlips: RadarBlip[];
  skills: Record<SkillId, number>;
  activeBuffs: {
    coffeeTimer: number;
    ctrlZTimer: number;
  };
  activeBoss: {
    name: string;
    subtitle: string;
    hp: number;
    maxHp: number;
    phase: number;
  } | null;
  bannerMessage: string | null;
}

export interface MatchSummary {
  victory: boolean;
  score: number;
  kills: number;
  maxCombo: number;
  elapsedSeconds: number;
  levelReached: number;
  waveReached: number;
  difficulty: DifficultyMode;
  skills: Record<SkillId, number>;
  rank: 'S+' | 'S' | 'A' | 'B' | 'C';
  funnyTitle: string;
}

export interface HighScoreRecord {
  id: string;
  playerName: string;
  teamCode?: string;
  rank?: string;
  score: number;
  kills: number;
  elapsedSeconds?: number;
  victory: boolean;
  dateLabel: string;
}
