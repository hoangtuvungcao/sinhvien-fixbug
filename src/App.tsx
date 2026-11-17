/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { GameCanvas3D } from './components/GameCanvas3D';
import { GameHud } from './components/GameHud';
import { LevelUpModal } from './components/LevelUpModal';
import { TitleScreen } from './components/TitleScreen';
import { TributeStudioModal } from './components/TributeStudioModal';
import {
  GameScreenState,
  HighScoreRecord,
  HudSnapshot,
  MatchSummary,
  SkillId,
} from './types/game';
import { loadAudioPrefs, loadHighScores, saveAudioPrefs, saveHighScore } from './utils/storage';

const INITIAL_HUD: HudSnapshot = {
  hp: 120,
  maxHp: 120,
  xp: 0,
  nextXp: 42,
  level: 1,
  ultCharge: 40,
  dashReadyRatio: 1,
  shockwaveReadyRatio: 1,
  weaponHeat: 0,
  isOverheated: false,
  isFiring: false,
  ventBuffActive: false,
  styleRank: 'C',
  arenaHalfSize: 70,
  playerNormX: 0,
  playerNormZ: 0,
  playerAimAngle: 0,
  radarBlips: [],
  wave: 1,
  totalWaves: 5,
  waveLabel: 'Đợt 1 · Quên Chấm Phẩy Phòng Lab',
  waveTimeLeft: 18,
  score: 0,
  kills: 0,
  combo: 0,
  maxCombo: 0,
  elapsedSeconds: 0,
  skills: {
    forLoop: 1,
    tryCatch: 0,
    banMeCoffee: 0,
    binarySearch: 0,
    mentorAdvice: 0,
    sunflowerAura: 0,
  },
  activeBuffs: {
    coffeeTimer: 0,
    ctrlZTimer: 0,
  },
  activeBoss: null,
  bannerMessage: null,
};

export default function App() {
  const [screenState, setScreenState] = useState<GameScreenState>('TITLE');
  const [cameraZoom, setCameraZoom] = useState<number>(1);
  const [runSeed, setRunSeed] = useState<number>(1);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);

  const [levelUpData, setLevelUpData] = useState<{
    choices: SkillId[];
    skills: Record<SkillId, number>;
  } | null>(null);
  const [pendingSkillChoice, setPendingSkillChoice] = useState<SkillId | null>(null);
  const [matchSummary, setMatchSummary] = useState<MatchSummary | null>(null);
  const [matchRecordId, setMatchRecordId] = useState<string | null>(null);
  const [highScores, setHighScores] = useState<HighScoreRecord[]>(() => loadHighScores());
  const [audioPrefs, setAudioPrefs] = useState(() => loadAudioPrefs());

  useEffect(() => {
    soundEngine.setMuted(audioPrefs.muted);
    soundEngine.setBgmVolume(audioPrefs.bgmVolume);
    soundEngine.setSfxVolume(audioPrefs.sfxVolume);
    saveAudioPrefs(audioPrefs);
  }, [audioPrefs]);

  useEffect(() => {
    soundEngine.bindAutoUnlock('CALM');
    return () => {
      soundEngine.setMood('OFF');
    };
  }, []);

  const handleToggleMute = useCallback(() => {
    soundEngine.unlock();
    setAudioPrefs((prev) => {
      const nextMuted = !prev.muted;
      soundEngine.setMuted(nextMuted);
      if (!nextMuted) {
        if (screenState === 'TITLE') {
          soundEngine.setMood('CALM');
        }
        window.setTimeout(() => soundEngine.playLevelUp(), 40);
      }
      return { ...prev, muted: nextMuted };
    });
  }, [screenState]);

  const handleStartGame = useCallback(() => {
    soundEngine.unlock();
    soundEngine.setMood('COMBAT');
    setHud(INITIAL_HUD);
    setLevelUpData(null);
    setPendingSkillChoice(null);
    setMatchSummary(null);
    setMatchRecordId(null);
    setRunSeed((prev) => prev + 1);
    setScreenState('PLAYING');
  }, []);

  const handleTriggerLevelUp = useCallback(
    (choices: SkillId[], skills: Record<SkillId, number>) => {
      setLevelUpData({ choices, skills });
      setScreenState('LEVEL_UP');
    },
    [],
  );

  const handleSelectSkill = useCallback((skillId: SkillId) => {
    setPendingSkillChoice(skillId);
    setLevelUpData(null);
    setScreenState('PLAYING');
  }, []);

  const handleConsumeSkillChoice = useCallback(() => {
    setPendingSkillChoice(null);
  }, []);

  const hasBossRef = useRef(false);
  hasBossRef.current = Boolean(hud.activeBoss);

  const handlePauseToggle = useCallback(() => {
    setScreenState((prev) => {
      if (prev === 'PLAYING') {
        soundEngine.setMood('CALM');
        return 'PAUSED';
      }
      if (prev === 'PAUSED') {
        soundEngine.setMood(hasBossRef.current ? 'BOSS' : 'COMBAT');
        return 'PLAYING';
      }
      return prev;
    });
  }, []);

  const handleMatchEnd = useCallback((summary: MatchSummary) => {
    const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date();
    const autoEntry: HighScoreRecord = {
      id: newId,
      playerName: 'Sinh viên CNTT ĐHTN',
      teamCode: 'Đ01',
      rank: summary.rank,
      score: summary.score,
      kills: summary.kills,
      elapsedSeconds: summary.elapsedSeconds,
      victory: summary.victory,
      dateLabel: `${now.getDate()}/${now.getMonth() + 1}`,
    };
    setMatchRecordId(newId);
    setHighScores(saveHighScore(autoEntry));
    setMatchSummary(summary);
    setScreenState(summary.victory ? 'VICTORY' : 'GAME_OVER');
  }, []);

  const handleSaveRecord = useCallback(
    (playerName: string, teamCode?: string) => {
      if (!matchSummary) return;
      const now = new Date();
      const recordId = matchRecordId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setMatchRecordId(recordId);
      const entry: HighScoreRecord = {
        id: recordId,
        playerName,
        teamCode: teamCode || 'Đ01',
        rank: matchSummary.rank,
        score: matchSummary.score,
        kills: matchSummary.kills,
        elapsedSeconds: matchSummary.elapsedSeconds,
        victory: matchSummary.victory,
        dateLabel: `${now.getDate()}/${now.getMonth() + 1}`,
      };
      setHighScores(saveHighScore(entry));
    },
    [matchRecordId, matchSummary],
  );

  const handleQuitToTitle = useCallback(() => {
    soundEngine.setMood('CALM');
    setLevelUpData(null);
    setMatchSummary(null);
    setMatchRecordId(null);
    setScreenState('TITLE');
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#f6f8fc]">
      <GameCanvas3D
        screenState={screenState}
        cameraZoom={cameraZoom}
        runSeed={runSeed}
        pendingSkillChoice={pendingSkillChoice}
        onConsumeSkillChoice={handleConsumeSkillChoice}
        onCameraZoomChange={setCameraZoom}
        onHudUpdate={setHud}
        onTriggerLevelUp={handleTriggerLevelUp}
        onPauseToggle={handlePauseToggle}
        onMatchEnd={handleMatchEnd}
      />

      {screenState === 'TITLE' && (
        <TitleScreen
          isMuted={audioPrefs.muted}
          highScores={highScores}
          onToggleMute={handleToggleMute}
          onStartGame={handleStartGame}
        />
      )}

      {screenState !== 'TITLE' && (
        <GameHud
          hud={hud}
          screenState={screenState}
          cameraZoom={cameraZoom}
          isMuted={audioPrefs.muted}
          bgmVolume={audioPrefs.bgmVolume}
          sfxVolume={audioPrefs.sfxVolume}
          onChangeCameraZoom={setCameraZoom}
          onToggleMute={handleToggleMute}
          onChangeBgmVolume={(val) => setAudioPrefs((prev) => ({ ...prev, bgmVolume: val }))}
          onChangeSfxVolume={(val) => setAudioPrefs((prev) => ({ ...prev, sfxVolume: val }))}
          onPauseToggle={handlePauseToggle}
          onQuitToTitle={handleQuitToTitle}
        />
      )}

      {screenState === 'LEVEL_UP' && levelUpData && (
        <LevelUpModal
          choices={levelUpData.choices}
          currentSkills={levelUpData.skills}
          level={hud.level}
          onSelectSkill={handleSelectSkill}
        />
      )}

      {(screenState === 'VICTORY' || screenState === 'GAME_OVER') && matchSummary && (
        <TributeStudioModal
          summary={matchSummary}
          highScores={highScores}
          currentRecordId={matchRecordId}
          onSaveRecord={handleSaveRecord}
          onPlayAgain={handleStartGame}
          onBackToTitle={handleQuitToTitle}
        />
      )}
    </div>
  );
}
