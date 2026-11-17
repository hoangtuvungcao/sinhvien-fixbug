import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  Bug,
  ClipboardCheck,
  Coffee,
  Gamepad2,
  Play,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { ENEMY_CODEX, GAME_ASSETS, POWERUP_CODEX, UPGRADE_SKILLS } from '../data/gameData';
import { HighScoreRecord, SkillId } from '../types/game';
import { ContestDossierModal } from './ContestDossierModal';

interface TitleScreenProps {
  isMuted: boolean;
  highScores: HighScoreRecord[];
  onToggleMute: () => void;
  onStartGame: () => void;
}

type CodexTab = 'enemies' | 'skills' | 'powerups';

function formatCompactTime(sec?: number): string {
  if (typeof sec !== 'number') return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  isMuted,
  highScores,
  onToggleMute,
  onStartGame,
}) => {
  const [crestImgFailed, setCrestImgFailed] = useState(false);
  const [codexOpen, setCodexOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [codexTab, setCodexTab] = useState<CodexTab>('enemies');

  useEffect(() => {
    if (!codexOpen && !leaderboardOpen && !dossierOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCodexOpen(false);
        setLeaderboardOpen(false);
        setDossierOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [codexOpen, leaderboardOpen, dossierOpen]);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between overflow-y-auto text-slate-900">
      {/* Gentle sunlit ivory edge scrim over live daylight 3D Campus */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-r from-[#fffdf8]/95 via-[#f8fafc]/72 to-white/15" />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-t from-[#fffdf8]/90 via-transparent to-white/60" />

      {/* Minimal Top Bar */}
      <header className="relative z-10 flex items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-6">
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-amber-400/80 bg-white shadow-sm">
            {!crestImgFailed ? (
              <img
                src={GAME_ASSETS.tributeSunflowerCrest}
                alt="Huy hiệu Dã Quỳ"
                referrerPolicy="no-referrer"
                onError={() => setCrestImgFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <Sparkles className="h-5 w-5 text-amber-600" />
            )}
          </div>
          <div>
            <div className="font-display text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
              Dã Quỳ Cyber-Lab 3D
            </div>
            <div className="text-[11px] font-semibold text-amber-700">
              CODE THE THANKS 2026 · Khoa CNTT Đại học Tây Nguyên
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setDossierOpen(true)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-amber-300 bg-white/95 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-sm hover:border-amber-400 hover:bg-amber-50 transition-colors whitespace-nowrap shrink-0"
          >
            <ClipboardCheck className="h-4 w-4 text-amber-600" />
            <span className="hidden sm:inline">Hồ Sơ 2026</span>
          </button>
          <button
            type="button"
            onClick={() => setLeaderboardOpen(true)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-sky-300 bg-white/95 px-3 py-1.5 text-xs font-bold text-sky-900 shadow-sm hover:border-sky-400 hover:bg-sky-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Award className="h-4 w-4 text-amber-600" />
            <span>Bảng Xếp Hạng</span>
            {highScores.length > 0 && (
              <span className="font-mono-num rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-extrabold text-sky-800">
                {highScores.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4 text-rose-600" />
            ) : (
              <Volume2 className="h-4 w-4 text-amber-600" />
            )}
            <span className="hidden md:inline">{isMuted ? 'Tắt tiếng' : 'Âm thanh'}</span>
          </button>
        </div>
      </header>

      {/* Clean Hero Content — Single Mode, Single 3D View, Pure Two Action Buttons */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-end px-4 pb-8 pt-10 sm:items-center sm:px-8 sm:py-8">
        <div className="pointer-events-auto w-full max-w-xl">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-sky-700">
            <span>Đấu Trường 140×140m</span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span className="text-amber-700">Góc Nhìn Anime 3D Ban Ngày Dịu Mắt</span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span className="text-emerald-700">Tri Ân 20/11</span>
          </div>

          <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem] [text-wrap:balance]">
            Giải Cứu Đồ Án{' '}
            <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-sky-600 bg-clip-text text-transparent">
              Hoa Dã Quỳ 3D
            </span>
          </h1>

          <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-700 sm:text-base">
            Tự tay ngắm bắn, lướt né mưa đạn và phản kiếm hạ Boss Deadline 23:59 để viết Thiệp Tri Ân gửi Thầy Cô Khoa CNTT.
          </p>

          {/* Strictly Two Clean Primary Actions: Bắt Đầu + Bách Khoa */}
          <div className="mt-7 flex flex-wrap items-center gap-3.5">
            <button
              type="button"
              onClick={onStartGame}
              className="inline-flex min-h-[54px] items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 px-8 py-3.5 font-display text-base font-extrabold text-slate-950 shadow-lg shadow-amber-500/25 hover:brightness-105 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 sm:text-lg"
            >
              <Play className="h-5 w-5 fill-slate-950" />
              <span>Bắt Đầu</span>
            </button>

            <button
              type="button"
              onClick={() => setCodexOpen(true)}
              className="inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-2xl border-2 border-sky-300 bg-white/95 px-6 py-3.5 font-display text-base font-bold text-sky-900 shadow-md hover:border-sky-400 hover:bg-sky-50 active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
            >
              <BookOpen className="h-5 w-5 text-sky-600" />
              <span>Bách Khoa</span>
            </button>
          </div>
        </div>
      </main>

      {/* Clean Bottom Two-Handed Controls Legend */}
      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/90 bg-white/90 backdrop-blur-sm px-4 py-3 text-xs text-slate-700 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5">
            <Gamepad2 className="h-3.5 w-3.5 text-sky-600" />
            <span>
              <strong className="text-slate-900">Tay trái:</strong> WASD · Space Lướt · Q Xung · R Xả Nhiệt · E Bão Hoa
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>
              <strong className="text-slate-900">Tay phải:</strong> Chuột Trái bắn · Chuột Phải Xung (hoặc J/K/L/U/O)
            </span>
          </span>
        </div>
        <span className="font-semibold text-amber-700">Mobile: 2 ngón trái/phải tối ưu sẵn</span>
      </footer>

      {dossierOpen && (
        <ContestDossierModal
          onClose={() => setDossierOpen(false)}
          onLaunchBossRush={() => {
            setDossierOpen(false);
            onStartGame();
          }}
        />
      )}

      {/* Leaderboard Modal (Bảng Xếp Hạng ĐHTN) */}
      {leaderboardOpen && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-sm p-3 sm:p-6">
          <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2 font-display text-lg font-extrabold text-amber-700">
                <Award className="h-5 w-5" />
                <span>Bảng Xếp Hạng Kỷ Lục ĐHTN</span>
              </div>
              <button
                type="button"
                onClick={() => setLeaderboardOpen(false)}
                aria-label="Đóng Bảng Xếp Hạng"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-400 hover:text-amber-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              {highScores.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Chưa có kỷ lục nào trên thiết bị này. Mọi trận đấu hoàn thành sẽ tự động lưu lên Bảng Xếp Hạng!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {highScores.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/75 px-4 py-3 text-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`font-mono-num flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${
                            idx === 0
                              ? 'bg-amber-400 text-amber-950'
                              : idx === 1
                                ? 'bg-slate-300 text-slate-800'
                                : idx === 2
                                  ? 'bg-orange-200 text-orange-900'
                                  : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        {entry.teamCode && (
                          <span className="rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-mono-num text-[11px] font-bold text-amber-800">
                            {entry.teamCode}
                          </span>
                        )}
                        <span className="truncate font-bold text-slate-900">{entry.playerName}</span>
                        <span
                          className={`text-xs font-semibold ${
                            entry.victory ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {entry.victory ? 'Thắng Boss' : 'Thử sức'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs shrink-0">
                        <span className="font-mono-num text-slate-500">{entry.kills} Bug</span>
                        {typeof entry.elapsedSeconds === 'number' && (
                          <span className="font-mono-num text-slate-500">
                            {formatCompactTime(entry.elapsedSeconds)}
                          </span>
                        )}
                        <span className="font-mono-num text-sm font-extrabold text-sky-700">
                          {entry.score.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bách Khoa Bug & Bí Kíp Codex Modal */}
      {codexOpen && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-sm p-3 sm:p-6">
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-display text-lg font-extrabold text-slate-900 sm:text-xl">
                  Bách Khoa Bug, Bí Kíp &amp; Vật Phẩm
                </h2>
                <p className="text-xs text-slate-500">
                  Hồ sơ kỹ thuật đấu trường Dã Quỳ Cyber-Lab 3D
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCodexOpen(false)}
                aria-label="Đóng Bách Khoa"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-400 hover:text-amber-700 transition-colors shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setCodexTab('enemies')}
                className={`inline-flex min-h-[38px] items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                  codexTab === 'enemies'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900'
                }`}
              >
                <Bug className="h-3.5 w-3.5" />
                <span>Bug &amp; Boss ({ENEMY_CODEX.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setCodexTab('skills')}
                className={`inline-flex min-h-[38px] items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                  codexTab === 'skills'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Bí Kíp Thầy Cô (6)</span>
              </button>
              <button
                type="button"
                onClick={() => setCodexTab('powerups')}
                className={`inline-flex min-h-[38px] items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                  codexTab === 'powerups'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900'
                }`}
              >
                <Coffee className="h-3.5 w-3.5" />
                <span>Vật Phẩm Hỗ Trợ ({POWERUP_CODEX.length})</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {codexTab === 'enemies' && (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {ENEMY_CODEX.map((enemy) => (
                    <div
                      key={enemy.type}
                      className="rounded-2xl border border-slate-200 bg-slate-50/75 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: enemy.color }}
                          />
                          <h3 className="truncate font-display text-base font-bold text-slate-900">
                            {enemy.name}
                          </h3>
                        </div>
                        <span className="text-[11px] font-bold text-amber-700 shrink-0">
                          {enemy.role}
                        </span>
                      </div>
                      <p className="mt-2.5 text-xs leading-relaxed text-slate-600">{enemy.lore}</p>
                    </div>
                  ))}
                </div>
              )}

              {codexTab === 'skills' && (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {(Object.keys(UPGRADE_SKILLS) as SkillId[]).map((id) => {
                    const sk = UPGRADE_SKILLS[id];
                    return (
                      <div
                        key={sk.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/75 p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: sk.accentColor }}
                            />
                            <h3 className="truncate font-display text-base font-bold text-slate-900">
                              {sk.name}
                            </h3>
                          </div>
                          <span className="font-mono-num text-[11px] font-bold text-sky-700 shrink-0">
                            Tối đa Cấp {sk.maxLevel}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] font-semibold text-amber-700">{sk.teacherTag}</div>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                          {sk.descriptions[0]}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {codexTab === 'powerups' && (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  {POWERUP_CODEX.map((item) => (
                    <div
                      key={item.type}
                      className="rounded-2xl border border-slate-200 bg-slate-50/75 p-4"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <h3 className="font-display text-base font-bold text-slate-900">{item.name}</h3>
                      </div>
                      <p className="mt-2.5 text-xs leading-relaxed text-slate-600">{item.effect}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
