import React, { useEffect, useState } from 'react';
import { Award, Cpu, Play, Presentation, Sparkles, X } from 'lucide-react';
import {
  CONTEST_RUBRIC_CRITERIA,
  JURY_QA_ITEMS,
  STAGE_DEMO_TIMELINE,
  TECH_OWNERSHIP_ROWS,
} from '../data/gameData';

interface ContestDossierModalProps {
  onClose: () => void;
  onLaunchBossRush: () => void;
}

type DossierTab = 'rubric' | 'tech' | 'demo';

export const ContestDossierModal: React.FC<ContestDossierModalProps> = ({
  onClose,
  onLaunchBossRush,
}) => {
  const [tab, setTab] = useState<DossierTab>('rubric');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const totalPoints = CONTEST_RUBRIC_CRITERIA.reduce((sum, item) => sum + item.maxPoints, 0);

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-sm p-3 sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-wide text-amber-700 uppercase">
              CODE THE THANKS 2026 · Chung kết 19/11/2026 · 18:00–20:30
            </div>
            <h2 className="mt-0.5 truncate font-display text-lg font-extrabold text-slate-900 sm:text-xl">
              Hồ Sơ Chấm Điểm &amp; Trình Diễn Sân Khấu (Đ01–Đ08)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Hồ Sơ 2026"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-400 hover:text-amber-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab('rubric')}
              className={`inline-flex min-h-[38px] items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                tab === 'rubric'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-700 hover:text-slate-900'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              <span>Tiêu Chí BGK ({totalPoints}đ)</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('tech')}
              className={`inline-flex min-h-[38px] items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                tab === 'tech'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-700 hover:text-slate-900'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              <span>Làm Chủ Công Nghệ (Nhóm vs AI)</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('demo')}
              className={`inline-flex min-h-[38px] items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                tab === 'demo'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-700 hover:text-slate-900'
              }`}
            >
              <Presentation className="h-3.5 w-3.5" />
              <span>Demo 4 Phút &amp; Q&amp;A 2 Phút</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onLaunchBossRush}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:brightness-105 transition-all whitespace-nowrap shrink-0"
          >
            <Play className="h-3.5 w-3.5 fill-white" />
            <span>Bắt Đầu Chơi Ngay</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {tab === 'rubric' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/75 px-4 py-3 text-xs text-slate-700">
                <span>
                  Phiếu chấm điểm chính thức gồm <strong className="text-amber-800">5 tiêu chí · 100 điểm</strong> (không cộng điểm Facebook/sticker vào điểm chuyên môn).
                </span>
                <span className="font-mono-num font-bold text-sky-700">
                  Ưu tiên đồng điểm: Sáng tạo → Tri ân
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {CONTEST_RUBRIC_CRITERIA.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/75 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-display text-base font-bold text-slate-900">
                        {item.title}
                      </h3>
                      <span className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-0.5 font-mono-num text-xs font-bold text-amber-800">
                        Tối đa {item.maxPoints}đ
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs font-bold text-sky-700">
                      {item.highlight}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      {item.evidence}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'tech' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-sky-200 bg-sky-50/75 p-4 text-xs leading-relaxed text-slate-700">
                <div className="mb-1 flex items-center gap-2 font-display text-sm font-bold text-sky-800">
                  <Sparkles className="h-4 w-4 text-sky-600" />
                  <span>Kiến trúc Thuần Client 100% Static (Sẵn sàng Deploy Vercel)</span>
                </div>
                Toàn bộ engine 3D (Three.js + UnrealBloomPass + SkeletonUtils), âm thanh Web Audio API Synthesizer và xuất Thiệp Tri Ân .PNG chạy trực tiếp trên trình duyệt, không phụ thuộc API AI runtime hay backend trả phí.
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {TECH_OWNERSHIP_ROWS.map((row) => (
                  <div
                    key={row.module}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/75 p-4"
                  >
                    <h3 className="font-display text-base font-bold text-amber-800">
                      {row.module}
                    </h3>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
                      <div className="text-[11px] font-bold text-emerald-800 uppercase">
                        Phần nhóm tự làm
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-700">
                        {row.teamWork}
                      </p>
                    </div>
                    <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3">
                      <div className="text-[11px] font-bold text-sky-800 uppercase">
                        Phần AI hỗ trợ
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-700">
                        {row.aiAssist}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'demo' && (
            <div className="space-y-5">
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Kịch bản Demo Trực Tiếp 4 Phút Trên Sân Khấu
                  </h3>
                  <button
                    type="button"
                    onClick={onLaunchBossRush}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-600 transition-colors"
                  >
                    <Play className="h-3.5 w-3.5 fill-white" />
                    <span>Chơi Demo Ngay</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {STAGE_DEMO_TIMELINE.map((step) => (
                    <div
                      key={step.time}
                      className="rounded-2xl border border-slate-200 bg-slate-50/75 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-num text-xs font-bold text-amber-700">
                          {step.time}
                        </span>
                        <span className="text-xs font-bold text-sky-700">
                          {step.phase}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">
                        {step.action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-display text-base font-bold text-slate-900">
                  Gợi ý Trả Lời Ban Giám Khảo (2 Phút Phản Biện)
                </h3>
                <div className="space-y-3">
                  {JURY_QA_ITEMS.map((qa, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 bg-slate-50/75 p-4"
                    >
                      <div className="font-display text-sm font-bold text-amber-800">
                        Hỏi: {qa.q}
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                        <strong className="text-sky-700">Đáp:</strong> {qa.a}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
