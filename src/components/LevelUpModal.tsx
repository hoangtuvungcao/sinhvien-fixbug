import React, { useEffect, useState } from 'react';
import { BookOpen, Coffee, Cpu, Flower2, Lock, Repeat, Shield, Sparkles } from 'lucide-react';
import { UPGRADE_SKILLS } from '../data/gameData';
import { SkillId } from '../types/game';

interface LevelUpModalProps {
  choices: SkillId[];
  currentSkills: Record<SkillId, number>;
  level: number;
  onSelectSkill: (id: SkillId) => void;
}

const UNLOCK_DELAY_MS = 950;

function getReadableAccent(hex: string): string {
  if (hex.toLowerCase() === '#facc15') return '#b45309';
  if (hex.toLowerCase() === '#38bdf8') return '#0284c7';
  if (hex.toLowerCase() === '#06b6d4') return '#0e7490';
  return hex;
}

function renderSkillIcon(id: SkillId, color: string) {
  const props = { className: 'h-7 w-7', style: { color } };
  switch (id) {
    case 'forLoop':
      return <Repeat {...props} />;
    case 'tryCatch':
      return <Shield {...props} />;
    case 'banMeCoffee':
      return <Coffee {...props} />;
    case 'binarySearch':
      return <Cpu {...props} />;
    case 'mentorAdvice':
      return <BookOpen {...props} />;
    case 'sunflowerAura':
      return <Flower2 {...props} />;
  }
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  choices,
  currentSkills,
  level,
  onSelectSkill,
}) => {
  const [remainingMs, setRemainingMs] = useState<number>(UNLOCK_DELAY_MS);
  const isReady = remainingMs <= 0;

  useEffect(() => {
    setRemainingMs(UNLOCK_DELAY_MS);
    const openedAt = performance.now();
    const intervalId = window.setInterval(() => {
      const elapsed = performance.now() - openedAt;
      const left = Math.max(0, UNLOCK_DELAY_MS - elapsed);
      setRemainingMs(left);
      if (left <= 0) {
        window.clearInterval(intervalId);
      }
    }, 50);
    return () => window.clearInterval(intervalId);
  }, [choices, level]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isReady || e.repeat) return;
      if (e.key === '1' && choices[0]) onSelectSkill(choices[0]);
      if (e.key === '2' && choices[1]) onSelectSkill(choices[1]);
      if (e.key === '3' && choices[2]) onSelectSkill(choices[2]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choices, isReady, onSelectSkill]);

  const unlockProgressPct = Math.min(
    100,
    Math.max(0, ((UNLOCK_DELAY_MS - remainingMs) / UNLOCK_DELAY_MS) * 100),
  );

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 backdrop-blur-sm p-3 sm:p-5"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-amber-300 bg-gradient-to-b from-[#fffef9] to-[#f8fafc] p-5 shadow-2xl sm:p-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-extrabold tracking-wide text-amber-800">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>THĂNG CẤP TRI THỨC · CẤP {level}</span>
          </div>
          <h2 className="mt-2.5 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Chọn Bí Kíp Thầy Cô Truyền Thụ
          </h2>
          {!isReady ? (
            <div className="mx-auto mt-2.5 max-w-sm">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-700">
                <Lock className="h-3.5 w-3.5" />
                <span>
                  Chống bấm nhầm khi combat... ({(remainingMs / 1000).toFixed(1)}s)
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-sky-500 transition-[width] duration-75"
                  style={{ width: `${unlockProgressPct}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-1.5 text-xs text-slate-600 sm:text-sm">
              Đọc kỹ rồi chạm thẻ để kích hoạt hoặc bấm phím{' '}
              <span className="font-mono-num font-bold text-amber-700">1</span> ·{' '}
              <span className="font-mono-num font-bold text-amber-700">2</span> ·{' '}
              <span className="font-mono-num font-bold text-amber-700">3</span>
            </p>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {choices.map((skillId, idx) => {
            const def = UPGRADE_SKILLS[skillId];
            const readableColor = getReadableAccent(def.accentColor);
            const currLv = currentSkills[skillId];
            const nextLv = currLv + 1;
            const isNew = currLv === 0;
            const isMax = nextLv >= def.maxLevel;
            const desc = def.descriptions[Math.min(currLv, def.descriptions.length - 1)];

            return (
              <button
                key={skillId}
                type="button"
                disabled={!isReady}
                onClick={() => {
                  if (!isReady) return;
                  onSelectSkill(skillId);
                }}
                style={{
                  borderColor: `${readableColor}55`,
                }}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 bg-white p-5 text-left shadow-md transition-all duration-150 ${
                  isReady
                    ? 'cursor-pointer hover:-translate-y-1.5 hover:shadow-xl hover:bg-amber-50/30 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-amber-500'
                    : 'cursor-wait opacity-85'
                }`}
              >
                {/* Top Colored Energy Strip */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-1.5"
                  style={{
                    background: `linear-gradient(90deg, ${readableColor}, #f59e0b)`,
                  }}
                />
                {/* Soft Top Radial Accent */}
                <div
                  className="pointer-events-none absolute -top-10 right-0 h-32 w-32 rounded-full opacity-15 blur-2xl transition-opacity group-hover:opacity-25"
                  style={{ backgroundColor: readableColor }}
                />

                <div>
                  {/* Icon Medallion + Rarity Badge */}
                  <div className="flex items-start justify-between gap-2 pt-1">
                    <div
                      className="flex h-13 w-13 items-center justify-center rounded-2xl border-2 shadow-xs transition-transform group-hover:scale-105"
                      style={{
                        borderColor: `${readableColor}66`,
                        background: `radial-gradient(circle at center, ${readableColor}18, #ffffff)`,
                      }}
                    >
                      {renderSkillIcon(skillId, readableColor)}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className="rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase"
                        style={{
                          backgroundColor: isMax
                            ? '#fef3c7'
                            : isNew
                              ? '#e0f2fe'
                              : '#f1f5f9',
                          color: isMax ? '#b45309' : isNew ? '#0369a1' : '#334155',
                        }}
                      >
                        {isMax ? 'Tối Thượng MAX' : isNew ? 'Chiêu Mới' : `Cấp ${nextLv}`}
                      </span>

                      {/* Level Progress Pips */}
                      <div className="flex items-center gap-1 pt-0.5">
                        {Array.from({ length: def.maxLevel }).map((_, pipIdx) => {
                          const filled = pipIdx < nextLv;
                          const isNextPip = pipIdx === currLv;
                          return (
                            <span
                              key={pipIdx}
                              className={`h-1.5 w-3.5 rounded-sm transition-all ${
                                isNextPip ? 'animate-pulse scale-110' : ''
                              }`}
                              style={{
                                backgroundColor: filled ? readableColor : '#e2e8f0',
                                boxShadow: isNextPip ? `0 0 6px ${readableColor}88` : undefined,
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Skill Name & Teacher Dedication */}
                  <h3 className="mt-4 font-display text-lg font-extrabold text-slate-900 transition-colors group-hover:text-amber-800">
                    {def.name}
                  </h3>
                  <div
                    className="mt-0.5 text-xs font-bold"
                    style={{ color: readableColor }}
                  >
                    {def.teacherTag}
                  </div>

                  {/* Highlighted Effect Box */}
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/90 p-3">
                    <p className="text-xs leading-relaxed text-slate-700 sm:text-[13px]">{desc}</p>
                  </div>
                </div>

                {/* Footer Action & Keycap */}
                <div className="mt-4 flex items-center justify-between pt-1">
                  <span
                    className="text-xs font-bold tracking-wide transition-colors"
                    style={{ color: readableColor }}
                  >
                    Nhận Bí Kíp →
                  </span>
                  <span className="font-mono-num rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 group-hover:border-amber-400 group-hover:text-amber-800">
                    Phím {idx + 1}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
