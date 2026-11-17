import React, { useEffect, useRef, useState } from 'react';
import { Award, CheckCircle2, Download, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { GAME_ASSETS, PRESET_TRIBUTE_MESSAGES, UPGRADE_SKILLS } from '../data/gameData';
import { HighScoreRecord, MatchSummary, SkillId } from '../types/game';

interface TributeStudioModalProps {
  summary: MatchSummary;
  highScores: HighScoreRecord[];
  currentRecordId: string | null;
  onSaveRecord: (playerName: string, teamCode?: string) => void;
  onPlayAgain: () => void;
  onBackToTitle: () => void;
}

type StudioTab = 'card' | 'leaderboard';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m} phút ${s} giây`;
}

function formatCompactDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push('');
      continue;
    }
    const words = trimmed.split(/\s+/);
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export const TributeStudioModal: React.FC<TributeStudioModalProps> = ({
  summary,
  highScores,
  currentRecordId,
  onSaveRecord,
  onPlayAgain,
  onBackToTitle,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('card');
  const [teamCode, setTeamCode] = useState('Đ01');
  const [studentName, setStudentName] = useState('Sinh viên CNTT ĐHTN');
  const [teacherName, setTeacherName] = useState('Quý Thầy Cô Khoa CNTT');
  const [message, setMessage] = useState(PRESET_TRIBUTE_MESSAGES[0]);
  const [savedNotice, setSavedNotice] = useState(false);
  const [crestFailed, setCrestFailed] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const acquiredSkills = (Object.keys(summary.skills) as SkillId[])
    .filter((id) => summary.skills[id] > 0)
    .map((id) => ({ def: UPGRADE_SKILLS[id], lv: summary.skills[id] }));

  useEffect(() => {
    setSavedNotice(false);
  }, [studentName, teamCode]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 1280;
    const h = 800;
    canvas.width = w;
    canvas.height = h;

    const drawCard = (crestImg: HTMLImageElement | null) => {
      // Warm sunlit ivory parchment gradient
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#fffdf7');
      bg.addColorStop(0.55, '#fef9eb');
      bg.addColorStop(1, '#f0f9ff');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Gentle engineering blueprint grid watermark
      ctx.strokeStyle = 'rgba(2, 132, 199, 0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Soft warm corner sunbeams
      const glow = ctx.createRadialGradient(w - 190, 175, 20, w - 190, 175, 320);
      glow.addColorStop(0, 'rgba(251, 191, 36, 0.2)');
      glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Ceremonial double border
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 4;
      ctx.strokeRect(26, 26, w - 52, h - 52);
      ctx.strokeStyle = 'rgba(2, 132, 199, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(38, 38, w - 76, h - 76);

      // Decorative petals
      for (let i = 0; i < 22; i++) {
        const px = 72 + ((i * 183) % (w - 144));
        const py = 64 + ((i * 107) % (h - 128));
        ctx.beginPath();
        ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(14, 165, 233, 0.2)';
        ctx.fill();
      }

      // Crest image on top-right with crisp gold frame
      const crestX = w - 278;
      const crestY = 74;
      const crestSize = 204;
      if (crestImg) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(crestX, crestY, crestSize, crestSize, 24);
        ctx.clip();
        ctx.drawImage(crestImg, crestX, crestY, crestSize, crestSize);
        ctx.restore();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(crestX, crestY, crestSize, crestSize, 24);
        ctx.stroke();
      }

      const cleanTeam = teamCode.trim() || 'Đ01';
      const cleanStudent = studentName.trim() || 'Sinh viên CNTT ĐHTN';
      const cleanTeacher = teacherName.trim() || 'Quý Thầy Cô Khoa CNTT';
      const cleanMsg = message.trim() || PRESET_TRIBUTE_MESSAGES[0];

      // Event pill banner
      ctx.fillStyle = '#0369a1';
      ctx.font = '700 17px "JetBrains Mono", monospace';
      ctx.fillText(
        `NGÀY NHÀ GIÁO VIỆT NAM 20/11 · CODE THE THANKS 2026 · MÃ ĐỘI ${cleanTeam}`,
        72,
        96,
      );

      // Main Card Heading
      ctx.fillStyle = '#b45309';
      ctx.font = '800 44px "Outfit", sans-serif';
      ctx.fillText('THIỆP TRI ÂN KỸ SƯ TƯƠNG LAI', 72, 150);

      // Subtitle Unit
      ctx.fillStyle = '#475569';
      ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Khoa Công Nghệ Thông Tin · Trường Đại học Tây Nguyên', 72, 182);

      // Recipient line wrapped safely so it never overlaps the crest
      const leftColMaxW = crestX - 102;
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 26px "Outfit", sans-serif';
      const teacherLines = wrapLines(ctx, `Kính gửi: ${cleanTeacher}`, leftColMaxW);
      let cursorY = 232;
      for (const tLine of teacherLines.slice(0, 2)) {
        ctx.fillText(tLine, 72, cursorY);
        cursorY += 34;
      }

      // Tribute message box — auto-scales font if long so ZERO text is clipped!
      const msgTopY = Math.max(276, cursorY + 8);
      const msgMaxWidth = w - 376; // keeps right edge clear of crest
      const msgBottomLimit = 492;

      let msgFontSize = 22;
      let msgLineHeight = 33;
      let msgLines: string[] = [];
      for (const candidateSize of [22, 20, 18, 16]) {
        ctx.font = `500 ${candidateSize}px "Plus Jakarta Sans", sans-serif`;
        const wrapped = wrapLines(ctx, cleanMsg, msgMaxWidth);
        const lh = Math.round(candidateSize * 1.48);
        if (msgTopY + wrapped.length * lh <= msgBottomLimit || candidateSize === 16) {
          msgFontSize = candidateSize;
          msgLineHeight = lh;
          msgLines = wrapped;
          break;
        }
      }

      ctx.fillStyle = '#1e293b';
      ctx.font = `500 ${msgFontSize}px "Plus Jakarta Sans", sans-serif`;
      let msgY = msgTopY;
      for (const lineText of msgLines) {
        if (msgY > msgBottomLimit) break;
        ctx.fillText(lineText, 72, msgY);
        msgY += msgLineHeight;
      }

      // Sender signature & 20/11 stamp
      const sigY = Math.min(524, Math.max(msgY + 14, 432));
      ctx.fillStyle = '#0369a1';
      ctx.font = '700 19px "Outfit", sans-serif';
      ctx.fillText(`Trân trọng kính tặng — ${cleanStudent} (${cleanTeam}) · 20/11/2026`, 72, sigY);

      // Achievement & Skills Footer Card (Zero truncation)
      const boxY = 556;
      const boxH = 164;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(68, boxY, w - 136, boxH, 18);
      ctx.fill();
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.38)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Top 3 stats columns
      const topStats = [
        {
          label: 'XẾP HẠNG & DANH HIỆU',
          val: `Hạng ${summary.rank} · ${summary.funnyTitle}`,
          color: '#b45309',
        },
        {
          label: 'ĐIỂM · COMBO · BUG FIX',
          val: `${summary.score.toLocaleString('vi-VN')}đ · x${summary.maxCombo} · ${summary.kills} Bug`,
          color: '#0369a1',
        },
        {
          label: 'THỜI GIAN · TIẾN ĐỘ',
          val: `${formatCompactDuration(summary.elapsedSeconds)} · Đợt ${summary.waveReached}/5 · Cấp ${summary.levelReached}`,
          color: '#0f172a',
        },
      ];

      const colW = (w - 176) / 3;
      topStats.forEach((item, idx) => {
        const sx = 92 + idx * colW;
        ctx.fillStyle = '#64748b';
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.fillText(item.label, sx, boxY + 32);
        ctx.fillStyle = item.color;
        ctx.font = '700 19px "Outfit", sans-serif';
        const wrappedVal = wrapLines(ctx, item.val, colW - 18);
        wrappedVal.slice(0, 2).forEach((l, li) => {
          ctx.fillText(l, sx, boxY + 58 + li * 23);
        });
      });

      // Divider inside footer card for Acquired Skills
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(92, boxY + 102);
      ctx.lineTo(w - 92, boxY + 102);
      ctx.stroke();

      const skillsSummaryText =
        acquiredSkills.length > 0
          ? acquiredSkills.map((s) => `${s.def.name} (Lv.${s.lv})`).join(' · ')
          : 'Khởi đầu cơ bản';
      ctx.fillStyle = '#64748b';
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillText('BÍ KÍP THẦY CÔ ĐÃ LĨNH HỘI:', 92, boxY + 126);
      ctx.fillStyle = '#1e293b';
      ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
      const skillLines = wrapLines(ctx, skillsSummaryText, w - 410);
      skillLines.slice(0, 2).forEach((sl, si) => {
        ctx.fillText(sl, 316, boxY + 126 + si * 20);
      });

      // Bottom Stamp
      ctx.fillStyle = '#64748b';
      ctx.font = '600 13px "JetBrains Mono", monospace';
      ctx.fillText(
        `Dã Quỳ Cyber-Lab 3D · Chung kết CODE THE THANKS 2026 (19/11/2026) · Mã đội ${cleanTeam}`,
        72,
        754,
      );
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => drawCard(img);
    img.onerror = () => drawCard(null);
    img.src = GAME_ASSETS.tributeSunflowerCrest;
  }, [acquiredSkills, message, studentName, summary, teacherName, teamCode]);

  const handleDownloadPng = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    const cleanTeam = (teamCode.trim() || 'D01').replace(/\s+/g, '-');
    a.download = `thiep-tri-an-20-11-${cleanTeam}.png`;
    a.click();
  };

  const handleSaveScore = () => {
    onSaveRecord(studentName.trim() || 'Sinh viên CNTT ĐHTN', teamCode.trim() || 'Đ01');
    setSavedNotice(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/35 backdrop-blur-sm p-3 sm:p-6">
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-8">
        {/* Top Outcome Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-amber-300 bg-amber-50">
              {!crestFailed ? (
                <img
                  src={
                    summary.victory
                      ? GAME_ASSETS.tributeSunflowerCrest
                      : GAME_ASSETS.bossDeadlineEmblem
                  }
                  alt="Biểu tượng kết quả trận đấu"
                  referrerPolicy="no-referrer"
                  onError={() => setCrestFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Trophy className="h-7 w-7 text-amber-600" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-amber-700">
                {summary.funnyTitle} ·{' '}
                {summary.victory
                  ? 'Commit Thành Công Trước 23:59'
                  : `Dừng Bước Ở Đợt ${summary.waveReached}/5`}
              </div>
              <h2 className="font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {summary.victory
                  ? 'Chiến Thắng Vinh Quang 20/11!'
                  : 'Deadline Khá Căng · Thử Lại Nhé!'}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onPlayAgain}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-amber-500/20 hover:bg-amber-600 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Chơi lại</span>
            </button>
            <button
              type="button"
              onClick={onBackToTitle}
              className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Về trang chủ
            </button>
          </div>
        </div>

        {/* Telemetry Row */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5">
            <div className="text-xs font-medium text-slate-600">Xếp hạng · Combo Max</div>
            <div className="mt-1 font-display text-2xl font-extrabold text-amber-700">
              {summary.rank} · x{summary.maxCombo}
            </div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-3.5">
            <div className="text-xs font-medium text-slate-600">Điểm số</div>
            <div className="mt-1 font-mono-num text-2xl font-extrabold text-sky-700">
              {summary.score.toLocaleString('vi-VN')}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-xs font-medium text-slate-600">Bug đã sửa</div>
            <div className="mt-1 font-mono-num text-2xl font-extrabold text-slate-900">
              {summary.kills}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-xs font-medium text-slate-600">Thời gian sinh tồn</div>
            <div className="mt-1 font-mono-num text-lg font-extrabold text-slate-800">
              {formatDuration(summary.elapsedSeconds)}
            </div>
          </div>
        </div>

        {/* Acquired Bí Kíp Thầy Cô Build Summary */}
        {acquiredSkills.length > 0 && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Bí Kíp Thầy Cô Đã Lĩnh Hội</span>
              <span className="font-mono-num font-semibold text-slate-500">
                Cấp độ {summary.levelReached}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {acquiredSkills.map(({ def, lv }) => (
                <div
                  key={def.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: def.accentColor }}
                    />
                    <span className="truncate font-semibold text-slate-800">{def.name}</span>
                  </div>
                  <span className="font-mono-num font-bold text-amber-700 shrink-0">
                    Cấp {lv}/{def.maxLevel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Switcher: Thiệp Tri Ân 20/11 vs Bảng Xếp Hạng */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('card')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors sm:text-sm ${
                activeTab === 'card'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Thiệp Tri Ân 20/11</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors sm:text-sm ${
                activeTab === 'leaderboard'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Award className="h-4 w-4" />
              <span>Bảng Xếp Hạng ({highScores.length})</span>
            </button>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Trận này đã tự động ghi danh vào Bảng Xếp Hạng</span>
          </span>
        </div>

        {/* Tab 1: 20/11 Tribute Card Studio */}
        {activeTab === 'card' && (
          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-5">
              <div className="grid grid-cols-3 gap-3">
                <label className="col-span-1 block text-xs text-slate-700">
                  <span className="mb-1 block font-semibold text-slate-600">Mã đội 2026</span>
                  <select
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm font-bold text-amber-700 focus:border-amber-500 focus:outline-none"
                  >
                    {['Đ01', 'Đ02', 'Đ03', 'Đ04', 'Đ05', 'Đ06', 'Đ07', 'Đ08'].map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="col-span-2 block text-xs text-slate-700">
                  <span className="mb-1 block font-semibold text-slate-600">Tên của bạn / Lớp</span>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    maxLength={40}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </label>
              </div>

              <label className="block text-xs text-slate-700">
                <span className="mb-1 block font-semibold text-slate-600">Kính tặng Thầy / Cô</span>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  maxLength={54}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </label>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Lời chúc 20/11</span>
                  <div className="flex gap-1.5">
                    {PRESET_TRIBUTE_MESSAGES.map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setMessage(preset)}
                        className="rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:border-amber-500 hover:text-amber-700"
                      >
                        Mẫu {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={280}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-600/20 hover:bg-sky-700 transition-colors whitespace-nowrap"
                >
                  <Download className="h-4 w-4" />
                  <span>Tải ảnh Thiệp (.PNG)</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveScore}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap ${
                    savedNotice
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <Award className="h-4 w-4" />
                  <span>{savedNotice ? 'Đã cập nhật BXH!' : 'Cập nhật tên lên BXH'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-center lg:col-span-7">
              <div className="overflow-hidden rounded-2xl border-2 border-amber-300/80 bg-[#fffdf7] shadow-xl">
                <canvas ref={previewCanvasRef} className="block h-auto w-full" />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Live Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="mt-5">
            {highScores.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Chưa có kỷ lục nào trên thiết bị này.
              </div>
            ) : (
              <div className="space-y-2.5">
                {highScores.map((entry, idx) => {
                  const isCurrent = currentRecordId && entry.id === currentRecordId;
                  return (
                    <div
                      key={entry.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
                        isCurrent
                          ? 'border-amber-400 bg-amber-50/80 shadow-sm'
                          : 'border-slate-200 bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
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
                          <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono-num text-[11px] font-bold text-amber-800">
                            {entry.teamCode}
                          </span>
                        )}
                        <span className="truncate font-bold text-slate-900">{entry.playerName}</span>
                        {isCurrent && (
                          <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            Vừa đấu
                          </span>
                        )}
                        <span
                          className={`text-xs font-semibold ${
                            entry.victory ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {entry.victory ? 'Thắng Boss' : 'Thử sức'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="font-mono-num text-slate-600">{entry.kills} Bug</span>
                        {typeof entry.elapsedSeconds === 'number' && (
                          <span className="font-mono-num text-slate-500">
                            {formatCompactDuration(entry.elapsedSeconds)}
                          </span>
                        )}
                        <span className="font-mono-num text-sm font-extrabold text-sky-700">
                          {entry.score.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
