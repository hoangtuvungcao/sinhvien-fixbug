import React, { useState } from 'react';
import {
  Coffee,
  Crosshair,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { GAME_ASSETS, UPGRADE_SKILLS } from '../data/gameData';
import { GameScreenState, HudSnapshot, SkillId, StyleRank } from '../types/game';

interface GameHudProps {
  hud: HudSnapshot;
  screenState: GameScreenState;
  cameraZoom: number;
  isMuted: boolean;
  bgmVolume: number;
  sfxVolume: number;
  onChangeCameraZoom: (next: number) => void;
  onToggleMute: () => void;
  onChangeBgmVolume: (val: number) => void;
  onChangeSfxVolume: (val: number) => void;
  onPauseToggle: () => void;
  onQuitToTitle: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const STYLE_COLORS: Record<StyleRank, string> = {
  D: 'border-slate-300 bg-slate-100 text-slate-700',
  C: 'border-sky-300 bg-sky-50 text-sky-700',
  B: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  A: 'border-cyan-400 bg-cyan-50 text-cyan-800',
  S: 'border-amber-400 bg-amber-50 text-amber-800',
  SS: 'border-amber-500 bg-gradient-to-b from-amber-100 to-yellow-200 text-amber-950',
};

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  screenState,
  cameraZoom,
  isMuted,
  bgmVolume,
  sfxVolume,
  onChangeCameraZoom,
  onToggleMute,
  onChangeBgmVolume,
  onChangeSfxVolume,
  onPauseToggle,
  onQuitToTitle,
}) => {
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [bossImgFailed, setBossImgFailed] = useState(false);

  const hpPct = hud.maxHp > 0 ? Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100)) : 0;
  const xpPct = hud.nextXp > 0 ? Math.max(0, Math.min(100, (hud.xp / hud.nextXp) * 100)) : 0;
  const hpDanger = hpPct <= 30;
  const hotZone = hud.weaponHeat >= 65 && !hud.isOverheated;

  const activeSkillEntries = (Object.keys(hud.skills) as SkillId[])
    .filter((id) => hud.skills[id] > 0)
    .map((id) => ({ def: UPGRADE_SKILLS[id], lv: hud.skills[id] }));

  const triggerDashFromButton = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
  };

  const triggerShockwaveFromButton = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }));
  };

  const triggerVentFromButton = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }));
  };

  const triggerUltFromButton = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
  };

  const stepZoom = (delta: number) => {
    const next = Math.max(0.65, Math.min(1.4, Number((cameraZoom + delta).toFixed(2))));
    onChangeCameraZoom(next);
  };

  const playerLeftPct = Math.max(4, Math.min(96, (hud.playerNormX * 0.5 + 0.5) * 100));
  const playerTopPct = Math.max(4, Math.min(96, (hud.playerNormZ * 0.5 + 0.5) * 100));

  return (
    <>
      {/* Top Unobtrusive Light HUD Bar */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-col gap-1.5 px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Style Rank + HP + Wave */}
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-slate-200/95 bg-white/92 backdrop-blur-sm px-2.5 py-1.5 shadow-md sm:gap-3 sm:px-3.5 sm:py-2">
            <div
              title="Hạng phong cách chiến đấu (D → SS)"
              className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl border font-display text-sm font-black leading-none ${STYLE_COLORS[hud.styleRank]}`}
            >
              <span>{hud.styleRank}</span>
              <span className="mt-0.5 text-[8px] font-semibold opacity-75">RANK</span>
            </div>

            <div className="min-w-[104px] sm:min-w-[164px]">
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-bold sm:text-xs">
                <span className={hpDanger ? 'text-rose-600' : 'text-sky-700'}>
                  {hpDanger ? 'Nguy hiểm' : `Đợt ${hud.wave}/${hud.totalWaves}`}
                </span>
                <span className="font-mono-num text-slate-800">
                  {hud.hp}/{hud.maxHp}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full transition-all duration-150 ${
                    hpDanger ? 'bg-rose-500' : 'bg-gradient-to-r from-sky-500 to-amber-500'
                  }`}
                  style={{ width: `${hpPct}%` }}
                />
              </div>
            </div>

            <div className="hidden h-7 w-px bg-slate-200 md:block" />

            <div className="hidden items-center gap-2.5 text-xs font-medium text-slate-600 md:flex">
              <span className="max-w-[200px] truncate">{hud.waveLabel}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-mono-num font-bold text-amber-700">{formatTime(hud.elapsedSeconds)}</span>
            </div>
          </div>

          {/* Right: Score + Zoom + Audio Settings + Pause */}
          <div className="pointer-events-auto relative flex items-center gap-1.5 rounded-2xl border border-slate-200/95 bg-white/92 backdrop-blur-sm px-2.5 py-1.5 shadow-md sm:gap-2 sm:px-3">
            {hud.combo >= 2 && (
              <div className="border-r border-slate-200 pr-2 text-right">
                <div className="text-[10px] font-semibold text-amber-700">Combo</div>
                <div className="font-mono-num text-xs font-extrabold text-amber-600 sm:text-sm">
                  x{hud.combo}
                </div>
              </div>
            )}

            <div className="px-1 text-right sm:px-1.5">
              <div className="text-[10px] font-medium text-slate-500 sm:text-[11px]">Điểm · Bug</div>
              <div className="font-mono-num text-xs font-extrabold text-sky-700 sm:text-sm">
                {hud.score.toLocaleString('vi-VN')} · {hud.kills}
              </div>
            </div>

            <div className="hidden items-center rounded-xl border border-slate-200 bg-slate-50 sm:flex">
              <button
                type="button"
                onClick={() => stepZoom(-0.1)}
                title="Thu gần camera (Cuộn chuột)"
                aria-label="Thu gần camera"
                className="inline-flex h-8 w-7 items-center justify-center text-slate-600 hover:text-amber-700"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <span className="font-mono-num px-1 text-[10px] font-semibold text-slate-600">
                {Math.round(cameraZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => stepZoom(0.1)}
                title="Đẩy cao camera (Cuộn chuột)"
                aria-label="Đẩy cao camera"
                className="inline-flex h-8 w-7 items-center justify-center text-slate-600 hover:text-amber-700"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSettingsMenuOpen((prev) => !prev)}
              aria-label="Âm thanh và thu phóng"
              title="Âm thanh & Góc thu phóng"
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-400 hover:text-amber-700 transition-colors shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onPauseToggle}
              aria-label={screenState === 'PAUSED' ? 'Tiếp tục' : 'Tạm dừng'}
              className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-800 hover:border-sky-400 hover:text-sky-700 transition-colors whitespace-nowrap shrink-0 sm:px-2.5"
            >
              {screenState === 'PAUSED' ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{screenState === 'PAUSED' ? 'Tiếp tục' : 'Tạm dừng'}</span>
            </button>

            {settingsMenuOpen && (
              <div className="absolute right-0 top-11 z-30 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Âm thanh &amp; Camera</span>
                  <button
                    type="button"
                    onClick={onToggleMute}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-amber-400"
                  >
                    {isMuted ? (
                      <>
                        <VolumeX className="h-3.5 w-3.5 text-rose-600" />
                        <span>Bật tiếng</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-3.5 w-3.5 text-amber-600" />
                        <span>Tắt tiếng</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-3 text-xs text-slate-600">
                  <label className="block">
                    <div className="mb-1 flex justify-between font-medium">
                      <span>Nhạc nền</span>
                      <span className="font-mono-num">{Math.round(bgmVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(bgmVolume * 100)}
                      onChange={(e) => onChangeBgmVolume(Number(e.target.value) / 100)}
                      className="w-full accent-amber-500"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1 flex justify-between font-medium">
                      <span>Hiệu ứng</span>
                      <span className="font-mono-num">{Math.round(sfxVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(sfxVolume * 100)}
                      onChange={(e) => onChangeSfxVolume(Number(e.target.value) / 100)}
                      className="w-full accent-sky-600"
                    />
                  </label>

                  <label className="block border-t border-slate-200 pt-2.5">
                    <div className="mb-1 flex justify-between font-medium">
                      <span>Thu phóng góc 3D</span>
                      <span className="font-mono-num">{Math.round(cameraZoom * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={65}
                      max={140}
                      step={5}
                      value={Math.round(cameraZoom * 100)}
                      onChange={(e) => onChangeCameraZoom(Number(e.target.value) / 100)}
                      className="w-full accent-amber-500"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compact Mobile-Only XP & Weapon Heat Strip */}
        <div className="pointer-events-none flex items-center justify-between gap-2.5 rounded-xl border border-slate-200/95 bg-white/92 backdrop-blur-sm px-3 py-1 text-[11px] shadow-sm sm:hidden">
          <span className="font-display font-bold text-amber-700 whitespace-nowrap shrink-0">
            Cấp {hud.level}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-150"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <span
            className={`font-mono-num whitespace-nowrap shrink-0 ${
              hud.isOverheated
                ? 'text-rose-600 font-bold'
                : hotZone
                  ? 'text-amber-700 font-bold'
                  : 'text-slate-600'
            }`}
          >
            Nhiệt {hud.weaponHeat}%
          </span>
          <span className="font-mono-num font-semibold text-slate-600 whitespace-nowrap shrink-0">
            {formatTime(hud.elapsedSeconds)}
          </span>
        </div>
      </header>

      {/* Live Tactical Minimap Radar (140x140 Arena) */}
      <aside
        aria-label="Radar chiến thuật đấu trường"
        className="pointer-events-none fixed right-3 top-23 z-15 sm:right-6 sm:top-18"
      >
        <div className="relative h-22 w-22 overflow-hidden rounded-2xl border border-slate-300 bg-white/90 backdrop-blur-sm shadow-md sm:h-28 sm:w-28">
          <div className="absolute inset-x-0 top-1/2 h-px bg-sky-500/20" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-sky-500/20" />
          <div className="absolute inset-3 rounded-full border border-sky-500/20" />

          {hud.radarBlips.map((b, idx) => {
            const left = Math.max(4, Math.min(96, (b.nx * 0.5 + 0.5) * 100));
            const top = Math.max(4, Math.min(96, (b.nz * 0.5 + 0.5) * 100));
            let cls = 'h-1.5 w-1.5 bg-rose-500 rounded-full';
            if (b.kind === 'beaconReady') cls = 'h-2 w-2 bg-amber-500 rounded-sm shadow-xs';
            else if (b.kind === 'beaconCool') cls = 'h-1.5 w-1.5 bg-sky-400/70 rounded-sm';
            else if (b.kind === 'crate') cls = 'h-1.5 w-1.5 bg-emerald-500 rounded-sm';
            else if (b.kind === 'elite') cls = 'h-2 w-2 bg-orange-500 rotate-45';
            else if (b.kind === 'boss') cls = 'h-3 w-3 bg-rose-600 border border-amber-400 rounded-full animate-pulse';

            return (
              <span
                key={idx}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${cls}`}
                style={{ left: `${left}%`, top: `${top}%` }}
              />
            );
          })}

          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${playerLeftPct}%`,
              top: `${playerTopPct}%`,
              transform: `translate(-50%, -50%) rotate(${Math.PI - hud.playerAimAngle}rad)`,
            }}
          >
            <div className="h-0 w-0 border-x-[4px] border-b-[8px] border-x-transparent border-b-sky-600" />
          </div>

          <span className="font-mono-num absolute bottom-1 left-1.5 text-[8px] font-bold text-slate-500">
            {hud.arenaHalfSize * 2}m
          </span>
        </div>
      </aside>

      {/* Boss Segmented 3-Phase Health Bar, Active Buffs & Quote Banner */}
      <div className="pointer-events-none fixed inset-x-0 top-22 z-10 flex flex-col items-center gap-2 px-3 pt-1 sm:top-16 sm:px-4 sm:pt-2">
        {(hud.activeBuffs.coffeeTimer > 0 || hud.activeBuffs.ctrlZTimer > 0) && (
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold sm:gap-3 sm:text-xs">
            {hud.activeBuffs.coffeeTimer > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/95 px-2.5 py-1 text-amber-800 shadow-sm sm:px-3">
                <Coffee className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>Cà Phê Ban Mê · {hud.activeBuffs.coffeeTimer}s</span>
              </div>
            )}
            {hud.activeBuffs.ctrlZTimer > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50/95 px-2.5 py-1 text-sky-800 shadow-sm sm:px-3">
                <RotateCcw className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                <span>Ctrl+Z Đóng Băng · {hud.activeBuffs.ctrlZTimer}s</span>
              </div>
            )}
          </div>
        )}

        {hud.activeBoss && (
          <div className="w-full max-w-md rounded-2xl border border-rose-300 bg-white/95 backdrop-blur-sm px-3.5 py-2 shadow-lg sm:max-w-lg sm:px-4 sm:py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-rose-300 bg-rose-50">
                {!bossImgFailed ? (
                  <img
                    src={GAME_ASSETS.bossDeadlineEmblem}
                    alt={hud.activeBoss.name}
                    referrerPolicy="no-referrer"
                    onError={() => setBossImgFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Shield className="h-5 w-5 text-rose-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-xs font-extrabold">
                  <span className="truncate text-rose-700">{hud.activeBoss.name}</span>
                  <span className="font-mono-num text-rose-800 shrink-0">
                    {hud.activeBoss.hp}/{hud.activeBoss.maxHp}
                  </span>
                </div>
                <div className="relative mt-1 h-2.5 w-full overflow-hidden rounded-full bg-rose-100">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 transition-all duration-150"
                    style={{
                      width: `${Math.max(0, Math.min(100, (hud.activeBoss.hp / hud.activeBoss.maxHp) * 100))}%`,
                    }}
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-[35%] w-0.5 bg-white/90" />
                  <div className="pointer-events-none absolute inset-y-0 left-[65%] w-0.5 bg-white/90" />
                </div>
              </div>
            </div>
          </div>
        )}

        {hud.bannerMessage && (
          <div className="max-w-xl rounded-xl border border-amber-300 bg-amber-50/95 px-4 py-1.5 text-center text-xs font-semibold text-amber-900 shadow-md sm:px-5 sm:py-2 sm:text-sm">
            {hud.bannerMessage}
          </div>
        )}
      </div>

      {/* PC Two-Handed Bottom Light Console Deck */}
      <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-10 hidden flex-col items-center gap-2 px-4 pb-3 sm:flex">
        <div className="pointer-events-auto flex items-center gap-3.5 rounded-2xl border border-slate-200/95 bg-white/92 backdrop-blur-sm px-4 py-2.5 shadow-xl">
          {/* Left: XP, Level, Heat & Passive Skills */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-36 shrink-0 lg:w-44">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-display font-extrabold text-amber-700">Cấp {hud.level}</span>
                <span className="font-mono-num text-[11px] font-semibold text-slate-500">
                  {hud.xp}/{hud.nextXp} XP
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-150"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px]">
                <span
                  className={
                    hud.isOverheated
                      ? 'font-bold text-rose-600'
                      : hud.ventBuffActive
                        ? 'font-bold text-amber-700'
                        : hotZone
                          ? 'font-bold text-orange-600'
                          : 'font-medium text-slate-500'
                  }
                >
                  {hud.isOverheated
                    ? 'QUÁ NHIỆT! BẤM R'
                    : hud.ventBuffActive
                      ? 'XẢ HOÀN HẢO +30%'
                      : hotZone
                        ? 'VÙNG NÓNG +24% DMG'
                        : 'Nhiệt súng'}
                </span>
                <span className="font-mono-num font-bold text-slate-700">{hud.weaponHeat}%</span>
              </div>
              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full transition-all duration-75 ${
                    hud.isOverheated
                      ? 'bg-rose-500'
                      : hotZone
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                        : 'bg-sky-500'
                  }`}
                  style={{ width: `${hud.weaponHeat}%` }}
                />
              </div>
            </div>

            {activeSkillEntries.length > 0 && (
              <div className="hidden xl:flex flex-wrap max-w-[205px] items-center gap-1 border-l border-slate-200 pl-3">
                {activeSkillEntries.map(({ def, lv }) => (
                  <div
                    key={def.id}
                    title={`${def.name} (Cấp ${lv}/${def.maxLevel})`}
                    className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: def.accentColor }}
                    />
                    <span className="max-w-[52px] truncate">{def.name.split(' ').slice(0, 2).join(' ')}</span>
                    <span className="font-mono-num font-bold text-amber-700">{lv}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Center-Right: Ergonomic Two-Handed Skill Cards */}
          <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3.5">
            {/* Left-Hand Skills (Space / Q / R / E) */}
            <div className="flex items-center gap-2">
              {/* Dash (Space / K) */}
              <button
                type="button"
                onClick={triggerDashFromButton}
                title="Lướt Phím Tốc Độ (Space / Shift / K) — Bất tử 0.32s & húc văng Bug"
                className={`relative flex h-15 w-[68px] flex-col items-center justify-center overflow-hidden rounded-xl border-2 px-1 transition-all active:scale-95 ${
                  hud.dashReadyRatio >= 1
                    ? 'border-sky-400 bg-sky-50 text-sky-900 shadow-sm hover:bg-sky-100'
                    : 'border-slate-200 bg-slate-100 text-slate-400'
                }`}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 bg-sky-400/20 transition-all duration-100"
                  style={{ height: `${Math.round(hud.dashReadyRatio * 100)}%` }}
                />
                <span className="relative z-10 rounded border border-sky-200 bg-white px-1.5 py-0.5 text-[9px] font-extrabold text-sky-700">
                  Space · K
                </span>
                <Zap className="relative z-10 h-4 w-4 my-0.5 text-sky-600" />
                <span className="relative z-10 text-[10px] font-extrabold leading-none">
                  {hud.dashReadyRatio >= 1 ? 'Lướt' : `${Math.round(hud.dashReadyRatio * 100)}%`}
                </span>
              </button>

              {/* Katana Shockwave Parry (Q / RMB / L) */}
              <button
                type="button"
                onClick={triggerShockwaveFromButton}
                disabled={hud.shockwaveReadyRatio < 1}
                title="Chém Xung Katana (Q / Chuột phải / L) — Chém Bug & phản đạn thành tia Vàng truy kích"
                className={`relative flex h-15 w-[68px] flex-col items-center justify-center overflow-hidden rounded-xl border-2 px-1 transition-all active:scale-95 ${
                  hud.shockwaveReadyRatio >= 1
                    ? 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-950 shadow-sm hover:bg-fuchsia-100'
                    : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 bg-fuchsia-400/20 transition-all duration-100"
                  style={{ height: `${Math.round(hud.shockwaveReadyRatio * 100)}%` }}
                />
                <span className="relative z-10 rounded border border-fuchsia-200 bg-white px-1.5 py-0.5 text-[9px] font-extrabold text-fuchsia-700">
                  Q · L
                </span>
                <Swords className="relative z-10 h-4 w-4 my-0.5 text-fuchsia-600" />
                <span className="relative z-10 text-[10px] font-extrabold leading-none">
                  {hud.shockwaveReadyRatio >= 1 ? 'Xung' : `${Math.round(hud.shockwaveReadyRatio * 100)}%`}
                </span>
              </button>

              {/* Perfect Heat Vent (R / U) */}
              <button
                type="button"
                onClick={triggerVentFromButton}
                disabled={hud.weaponHeat < 35 && !hud.isOverheated}
                title="Xả Nhiệt Sóng Lửa (R / U khi Nhiệt >= 35%) — Ở 65%+ kích hoạt Xả Hoàn Hảo (+30% tốc bắn)"
                className={`relative flex h-15 w-[68px] flex-col items-center justify-center overflow-hidden rounded-xl border-2 px-1 transition-all active:scale-95 ${
                  hud.isOverheated
                    ? 'border-rose-400 bg-rose-50 text-rose-800 shadow-sm animate-pulse'
                    : hotZone
                      ? 'border-orange-400 bg-orange-50 text-orange-900 shadow-sm'
                      : hud.weaponHeat >= 35
                        ? 'border-orange-300 bg-orange-50/75 text-orange-800 hover:bg-orange-100'
                        : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 bg-orange-400/20 transition-all duration-75"
                  style={{ height: `${hud.weaponHeat}%` }}
                />
                <span className="relative z-10 rounded border border-orange-200 bg-white px-1.5 py-0.5 text-[9px] font-extrabold text-orange-700">
                  R · U
                </span>
                <Flame className="relative z-10 h-4 w-4 my-0.5 text-orange-600" />
                <span className="relative z-10 text-[10px] font-extrabold leading-none">
                  {hotZone ? 'Xả MAX' : 'Xả Nhiệt'}
                </span>
              </button>

              {/* Ultimate Dã Quỳ Storm (E / O) */}
              <button
                type="button"
                onClick={triggerUltFromButton}
                disabled={hud.ultCharge < 100}
                title="Tuyệt Chiêu Bão Hoa Dã Quỳ (E / O) — Quét sạch đạn Bug, giáng sấm vàng & hồi +20 HP"
                className={`relative flex h-15 w-[74px] flex-col items-center justify-center overflow-hidden rounded-xl border-2 px-1.5 transition-all active:scale-95 ${
                  hud.ultCharge >= 100
                    ? 'border-amber-500 bg-gradient-to-b from-amber-300 to-yellow-400 text-slate-950 shadow-md hover:brightness-105'
                    : 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                }`}
              >
                {hud.ultCharge < 100 && (
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 bg-amber-400/25 transition-all duration-150"
                    style={{ height: `${hud.ultCharge}%` }}
                  />
                )}
                <span className="relative z-10 rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[9px] font-extrabold text-amber-800">
                  E · O
                </span>
                <Sparkles
                  className={`relative z-10 h-4 w-4 my-0.5 ${
                    hud.ultCharge >= 100 ? 'text-slate-950' : 'text-amber-600'
                  }`}
                />
                <span className="relative z-10 font-mono-num text-[10px] font-extrabold leading-none">
                  {hud.ultCharge >= 100 ? 'BÃO HOA!' : `${hud.ultCharge}%`}
                </span>
              </button>
            </div>

            <div className="h-10 w-px bg-slate-200" />

            {/* Right-Hand Primary Fire Card (LMB / J) */}
            <div
              title="Tay phải: Giữ Chuột Trái hoặc phím J để bắn đạn Code"
              className={`relative flex h-15 w-[76px] flex-col items-center justify-center overflow-hidden rounded-xl border-2 px-1 transition-all ${
                hud.isOverheated
                  ? 'border-rose-400 bg-rose-50 text-rose-700'
                  : hud.isFiring
                    ? 'border-amber-400 bg-gradient-to-b from-amber-100 to-sky-100 text-amber-950 shadow-sm scale-[1.03]'
                    : 'border-sky-300 bg-sky-50 text-sky-900'
              }`}
            >
              <span className="rounded border border-sky-200 bg-white px-1.5 py-0.5 text-[9px] font-extrabold text-sky-700">
                Chuột · J
              </span>
              <Crosshair className="h-4 w-4 my-0.5 text-sky-600" />
              <span className="text-[10px] font-extrabold leading-none">Bắn</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Clean Light Pause Overlay */}
      {screenState === 'PAUSED' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
            <h2 className="font-display text-2xl font-extrabold text-slate-900">Tạm dừng trận đấu</h2>
            <p className="mt-2 text-sm text-slate-600">
              {hud.waveLabel} · Điểm{' '}
              <span className="font-mono-num font-bold text-sky-700">
                {hud.score.toLocaleString('vi-VN')}
              </span>
            </p>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-left text-xs text-slate-700 space-y-1">
              <div className="font-bold text-amber-700">Thao tác 2 tay trên PC / Laptop:</div>
              <div>• Tay trái: WASD di chuyển · Space Lướt · Q Xung · R Xả · E Bão Hoa</div>
              <div>• Tay phải: Chuột Trái Bắn · Chuột Phải Xung (hoặc phím J / K / L / U / O)</div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={onPauseToggle}
                className="w-full rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-600 transition-colors"
              >
                Tiếp tục chiến đấu
              </button>
              <button
                type="button"
                onClick={onQuitToTitle}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Về màn hình chính
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
