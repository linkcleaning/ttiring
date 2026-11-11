import { useMemo, useState } from 'react';
import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { PURPOSES, explainDay, monthPicks } from '../lib/taegil.js';
import { Card, Sheet, scoreTone } from './ui.jsx';
import { eul } from '../lib/josa.js';

const W = ['일', '월', '화', '수', '목', '금', '토'];
const KEY = 'ttiring.taegil.purpose';

/** 하루 칸 */
function DayCell({ day, onPick }) {
  if (!day) return <div />;
  const strong = day.fit === 'good' && day.score >= 65;
  const weak = day.fit === 'bad' || day.score <= 42;
  return (
    <button type="button" onClick={() => onPick(day)}
      className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-[13px] leading-none transition
        ${day.past ? 'opacity-35' : ''}
        ${strong ? 'bg-[#E7EFFE] font-bold text-[#2563EB]'
    : weak ? 'bg-[#FDE8E6] text-[#C23B26]' : 'bg-bg text-sub'}
        ${day.isToday ? 'ring-2 ring-ink' : ''}`}>
      <span>{day.d}</span>
      <span className="mt-0.5 text-[9.5px] opacity-70">{day.star.key}</span>
      {day.son && <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-[#D97706]" aria-hidden="true" />}
    </button>
  );
}

export default function TaegilCard({ profile, delay = 0 }) {
  const now = new Date();
  const [offset, setOffset] = useState(0); // 0 = 이번 달
  const [purposeKey, setPurposeKey] = useState(() => {
    try { return localStorage.getItem(KEY) || '계약'; } catch { return '계약'; }
  });
  const [picked, setPicked] = useState(null);

  const { year, month } = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, [offset, now.getFullYear(), now.getMonth()]);

  const r = useMemo(() => {
    try { return monthPicks(profile, year, month, purposeKey); } catch { return null; }
  }, [profile, year, month, purposeKey]);

  const choose = (k) => {
    setPurposeKey(k);
    try { localStorage.setItem(KEY, k); } catch { /* 저장 불가 */ }
  };

  if (!r) return null;

  // 달력 칸 채우기
  const first = new Date(year, month - 1, 1).getDay();
  const cells = [...Array(first).fill(null), ...r.days];

  return (
    <>
      <Card title="이달의 좋은 날"
        right={<span className="text-[12px] text-sub">건제십이신 × 내 운세</span>} delay={delay}>

        <div className="no-scrollbar -mx-5 mb-4 flex gap-2 overflow-x-auto px-5" role="tablist" aria-label="무엇을 할 날인지">
          {PURPOSES.map((p) => {
            const on = p.key === purposeKey;
            return (
              <button key={p.key} type="button" role="tab" aria-selected={on} onClick={() => choose(p.key)}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-[13px] ${
                  on ? 'border-ink bg-ink font-bold text-white' : 'border-line text-sub'}`}>
                {p.label}
              </button>
            );
          })}
        </div>

        {/* 고른 날 */}
        <ul className="space-y-2">
          {r.best.map((day) => {
            const tone = scoreTone(day.score);
            return (
              <li key={day.d}>
                <button type="button" onClick={() => setPicked(day)}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left"
                  style={{ background: tone.bg }}>
                  <span className="text-[17px] font-extrabold tabular-nums" style={{ color: tone.fg }}>
                    {month}/{day.d}
                  </span>
                  <span className="text-[13px] text-sub">({W[day.weekday]})</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    {day.son && <span className="rounded-full bg-[#FDF1DE] px-2 py-0.5 text-[11px] font-semibold text-[#B7791F]">손 없는 날</span>}
                    <span className="rounded-full bg-card px-2 py-0.5 text-[11.5px] font-semibold text-sub">{day.star.key}일</span>
                    <span className="text-[15px] font-bold tabular-nums" style={{ color: tone.fg }}>{day.score}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 px-1 text-[13.5px] leading-[1.7] text-sub">
          피할 날은 {r.worst.map((x) => `${month}/${x.d}(${x.star.key}일)`).join(', ')}이에요.
        </p>

        {/* 달력 */}
        <div className="mt-4 border-t border-line pt-4">
          <div className="mb-2.5 flex items-center justify-center gap-3">
            <button type="button" onClick={() => setOffset((o) => o - 1)} aria-label="전달"
              disabled={offset <= -1} className="rounded-full p-1.5 text-sub disabled:opacity-25">
              <ChevronLeft size={17} />
            </button>
            <span className="text-[14px] font-bold tabular-nums">{year}년 {month}월</span>
            <button type="button" onClick={() => setOffset((o) => o + 1)} aria-label="다음달"
              disabled={offset >= 2} className="rounded-full p-1.5 text-sub disabled:opacity-25">
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10.5px] text-faint">
            {W.map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => (
              <DayCell key={day ? day.d : `b${idx}`} day={day} onPick={setPicked} />
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-faint">
            칸 아래 글자가 그날의 건제십이신이에요. 파란 칸이 {r.purpose.hint}에 맞는 날, 붉은 칸이 피할 날입니다.
            날짜를 누르면 이유가 나와요.
          </p>
        </div>
      </Card>

      <Sheet open={!!picked} onClose={() => setPicked(null)} label="그날 풀이">
        {picked && (() => {
          const e = explainDay(picked, r.purpose);
          const tone = scoreTone(picked.score);
          return (
            <div className="pb-2">
              <div className="flex items-center gap-2">
                <CalendarCheck size={18} style={{ color: tone.fg }} aria-hidden="true" />
                <h3 className="text-[18px] font-bold">{month}월 {picked.d}일 ({W[picked.weekday]})</h3>
                <span className="ml-auto text-[18px] font-extrabold tabular-nums" style={{ color: tone.fg }}>{picked.score}</span>
              </div>
              <p className="mt-3 text-[15px] font-semibold">{e.head}</p>
              <p className="mt-2 text-[15px] leading-[1.8] text-[#3a3a42]">{e.body}</p>
              <div className="mt-4 rounded-2xl bg-bg px-4 py-3">
                <p className="text-[12px] font-semibold text-sub">{eul(r.purpose.label)} 이렇게 봅니다</p>
                <p className="mt-1.5 text-[13.5px] leading-[1.7] text-sub">{r.purpose.why}</p>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-faint">
                옛 책마다 날짜별로 ‘무엇에 좋다’는 내용이 조금씩 달라요. 띠링은 여러 책이 함께 말하는
                글자 뜻(성=이룸, 개=엶, 수=거둠, 제=덜어냄, 정=정함, 파=깨짐, 폐=닫음)에서만 가져왔고,
                갈리는 대목은 쓰지 않았습니다.
              </p>
            </div>
          );
        })()}
      </Sheet>
    </>
  );
}
