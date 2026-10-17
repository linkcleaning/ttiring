import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { computeFortune } from '../lib/saju.js';
import { EVENT_INFO, buildReading, eventOf } from '../lib/fortune.js';
import ZodiacAvatar, { MOOD_LABEL, moodOf } from './ZodiacAvatar.jsx';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const CAT_LABEL = { 재물: '금전운', 애정: '연애운', 건강: '건강운', 사업: '커리어운' };

/** 점수대별 색: 80점 이상 파랑, 60~79 주황, 60 미만 빨강 */
export const scoreTone = (s) =>
  s >= 80 ? { fg: '#2563EB', bg: '#E7EFFE' } : s >= 60 ? { fg: '#D97706', bg: '#FDF1DE' } : { fg: '#DC3B2F', bg: '#FDE8E6' };

export default function MonthCalendar({ input, zodiac, onOpenDay }) {
  const now = new Date();
  const [offset, setOffset] = useState(0);
  const [picked, setPicked] = useState(now.getDate());

  const year = new Date(now.getFullYear(), now.getMonth() + offset, 1).getFullYear();
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1).getMonth(); // 0~11
  const isThisMonth = offset === 0;

  const days = useMemo(() => {
    const last = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: last }, (_, i) => {
      const r = computeFortune(input, new Date(year, month, i + 1));
      return { d: i + 1, r, score: r.scores.total, ev: eventOf(r) };
    });
  }, [input, year, month]);

  const lead = new Date(year, month, 1).getDay();
  const sel = days[Math.min(picked, days.length) - 1];
  const reading = useMemo(() => buildReading(sel.r), [sel]);
  const sorted = [...reading.items].sort((a, b) => b.score - a.score);
  const selTone = scoreTone(sel.score);

  const move = (n) => {
    setOffset((o) => Math.max(-12, Math.min(12, o + n)));
    setPicked(offset + n === 0 ? now.getDate() : 1);
  };

  return (
    <section aria-label="이번 달 운세 달력" className="reveal rounded-[22px] border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} aria-label="이전 달" className="rounded-full p-1.5 text-sub">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-[17px] font-bold">{year}년 {month + 1}월 운세 달력</h2>
        <button type="button" onClick={() => move(1)} aria-label="다음 달" className="rounded-full p-1.5 text-sub">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEK.map((w, i) => (
          <span key={w} className={`pb-1 text-[12px] ${i === 0 ? 'text-[#DC3B2F]' : 'text-sub'}`}>{w}</span>
        ))}
        {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
        {days.map(({ d, score, ev }) => {
          const tone = scoreTone(score);
          const isToday = isThisMonth && d === now.getDate();
          const isPicked = d === picked;
          return (
            <button key={d} type="button" onClick={() => setPicked(d)}
              aria-label={`${month + 1}월 ${d}일 ${score}점`} aria-pressed={isPicked}
              className={`flex flex-col items-center rounded-xl py-1 transition-colors
                ${isPicked ? 'bg-bg ring-[1.5px] ring-ink' : ''}`}>
              <span className={`text-[11px] leading-none ${isToday ? 'font-extrabold text-ink' : 'text-sub'}`}>
                {isToday ? '오늘' : d}
              </span>
              <span className="relative my-0.5">
                <ZodiacAvatar branch={zodiac.branch} stem={zodiac.stem} size={34} mood={moodOf(score)} />
                {ev && (
                  <span className="absolute -right-2 -top-1.5 text-[13px] leading-none drop-shadow" aria-label={EVENT_INFO[ev].label}>
                    {EVENT_INFO[ev].icon}
                  </span>
                )}
              </span>
              <span className="rounded-full px-1.5 text-[11px] font-bold leading-[16px] tabular-nums"
                style={{ color: tone.fg, background: tone.bg }}>
                {score}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex justify-center gap-3 text-[11px] text-sub">
        {[['80점 이상', 80], ['60~79점', 60], ['60점 미만', 0]].map(([label, s]) => (
          <span key={label} className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: scoreTone(s).bg, outline: `1px solid ${scoreTone(s).fg}` }} />
            {label}
          </span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-sub">
        {Object.values(EVENT_INFO).map((e) => (
          <span key={e.label}>{e.icon} {e.label}</span>
        ))}
      </div>

      {/* 선택한 날 */}
      <div className="mt-4 flex gap-3 rounded-2xl bg-bg p-3.5" aria-live="polite">
        <ZodiacAvatar branch={zodiac.branch} stem={zodiac.stem} size={64} mood={moodOf(sel.score)} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="text-[14px] font-bold">{month + 1}월 {sel.d}일</p>
            <span className="text-[13px] text-sub">{MOOD_LABEL[moodOf(sel.score)]}</span>
            <span className="ml-auto rounded-full px-2 text-[15px] font-extrabold tabular-nums"
              style={{ color: selTone.fg, background: selTone.bg }}>{sel.score}점</span>
          </div>
          <p className="mt-1 text-[14px] font-medium leading-[1.55]">{reading.summary}</p>
          <p className="mt-1.5 text-[12px] text-sub">
            좋은 운 {CAT_LABEL[sorted[0].key]} {sorted[0].score}, 조심 {CAT_LABEL[sorted[3].key]} {sorted[3].score}, 행운의 컬러 {reading.lucky.color}
          </p>
          {sel.ev && (
            <p className="mt-2 rounded-lg bg-card px-2.5 py-1.5 text-[12.5px]">
              {EVENT_INFO[sel.ev].icon} <b>{EVENT_INFO[sel.ev].label}</b> {EVENT_INFO[sel.ev].desc}이에요.
            </p>
          )}
          {onOpenDay && (
            <button type="button"
              onClick={() => onOpenDay(Math.round((new Date(year, month, sel.d) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000))}
              className="mt-2.5 w-full rounded-xl bg-ink py-2.5 text-[14px] font-semibold text-white">
              이 날 운세 자세히 보기
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
