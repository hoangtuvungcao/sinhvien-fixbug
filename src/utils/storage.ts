import { HighScoreRecord } from '../types/game';

const HIGHSCORE_KEY = 'daquy_cyberlab_highscores_v1';
const AUDIO_PREFS_KEY = 'daquy_cyberlab_audio_v2';

export function loadHighScores(): HighScoreRecord[] {
  try {
    const raw = localStorage.getItem(HIGHSCORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHighScore(entry: HighScoreRecord): HighScoreRecord[] {
  const existing = loadHighScores().filter((item) => item.id !== entry.id);
  const next = [...existing, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  try {
    localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota errors
  }
  return next;
}

export interface AudioPrefs {
  muted: boolean;
  bgmVolume: number;
  sfxVolume: number;
}

export function loadAudioPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem(AUDIO_PREFS_KEY);
    if (!raw) return { muted: false, bgmVolume: 0.55, sfxVolume: 0.85 };
    const parsed = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      muted: Boolean(parsed.muted),
      bgmVolume: typeof parsed.bgmVolume === 'number' ? parsed.bgmVolume : 0.55,
      sfxVolume: typeof parsed.sfxVolume === 'number' ? parsed.sfxVolume : 0.85,
    };
  } catch {
    return { muted: false, bgmVolume: 0.55, sfxVolume: 0.85 };
  }
}

export function saveAudioPrefs(prefs: AudioPrefs): void {
  try {
    localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}
