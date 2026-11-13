import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { featuredYear, newYearFortune } from '../lib/sinnyeon.js';
import { Card, Term, scoreTone } from './ui.jsx';

/** 신년운세: 총운 · 분야별 · 열두 달 흐름 */
export default function SinnyeonCard({ profile, delay = 0 }) {
  const year = featuredYear();
  const r = useMemo(() => {
    try { return newYearFortune(profile, year); } catch { return null; }
  }, [profile, year]);
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(null);
  if (!r) return null;

  const tone = scoreTone(r.total);
  const max = Math.max(...r.months.map((x) => x.score));
  const min = Math.min(...r.months.map((x) => x.score));
  const sel = r.months.find((x) => x.m === pick) || null;
  const bestSet = new Set(r.best.map((x) => x.m));
  const worstSet = new Set(r.worst.map((x) => x.m));

  return (
    <Card title={`${year} 신년운세`} delay={delay}
      right={<span className="text-[12px] text-sub">{r.yearName} · {r.animal}의 해</span>}>
      <div className="flex items-center gap-4">
        <div className="flex h-[78px] w-[78px] shrink-0 flex-col items-center justify-center rounded-[22px]" style={{ background: tone.bg }}>
          <span className="text-[28px] font-extrabold leading-none tabular-nums" style={{ color: tone.fg }}>{r.total}</span>
          <span className="mt-1 text-[12px] font-bold" style={{ color: tone.fg }}>{r.grade}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[17px] font-bold leading-snug">{r.theme}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-bg px-2.5 py-1 text-[12px] font-semibold text-sub">
              올해는 <Term name={r.god}>{r.god}</Term>의 해
            </span>
            {r.samjae && (
              <span className="rounded-full bg-[#FDF1DE] px-2.5 py-1 text-[12px] font-semibold text-[#B7791F]">{r.samjae}</span>
            )}
          </div>
        </div>
      </div>

      {/* 분야별 */}
      <div className="mt-4 grid grid-cols-4 gap-1.5">
        {r.areas.map((a) => {
          const t = scoreTone(a.score);
          return (
            <div key={a.key} className="rounded-2xl py-2.5 text-center" style={{ background: t.bg }}>
              <p className="text-[11.5px] text-sub">{a.key}운</p>
              <p className="mt-0.5 text-[17px] font-extrabold tabular-nums" style={{ color: t.fg }}>{a.score}</p>
            </div>
          );
        })}
      </div>

      {/* 열두 달 흐름 */}
      <div className="mt-5">
        <p className="mb-2 text-[13px] font-semibold text-sub">열두 달 흐름 <span className="font-normal text-faint">· 달을 눌러 보세요</span></p>
        <div className="flex h-[112px] items-end gap-[5px]" role="list" aria-label="월별 운세 점수">
          {r.months.map((x) => {
            const h = 22 + ((x.score - min) / Math.max(1, max - min)) * 70;
            const color = bestSet.has(x.m) ? '#2563EB' : worstSet.has(x.m) ? '#DC3B2F' : '#CFC8B8';
            const on = pick === x.m;
            return (
              <button key={x.m} type="button" role="listitem" onClick={() => setPick(on ? null : x.m)}
                aria-label={`${x.m}월 ${x.score}점, ${x.line}`}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className={`text-[10px] tabular-nums ${on ? 'font-bold text-ink' : 'text-faint'}`}>{x.score}</span>
                <span className="flex w-full flex-1 items-end">
                  <span className={`block w-full rounded-t-[6px] transition-all ${on ? 'ring-2 ring-ink ring-offset-1' : ''}`}
                    style={{ height: `${h}%`, background: color }} />
                </span>
                <span className={`text-[10.5px] ${on ? 'font-bold text-ink' : 'text-sub'}`}>{x.m}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 min-h-[44px] rounded-2xl bg-bg px-4 py-2.5 text-[13.5px] leading-[1.6] text-sub">
          {sel
            ? <><b className="text-ink">{sel.m}월 · {sel.line}</b> ({sel.score}점) — 이달은 <Term name={sel.god}>{sel.god}</Term> 기운이 들어와요.</>
            : <>파란 달은 힘이 붙는 {r.best.map((x) => `${x.m}월`).join('·')}, 붉은 달은 조심할 {r.worst.map((x) => `${x.m}월`).join('·')}이에요.</>}
        </p>
      </div>

      {/* 풀이 */}
      <p className="mt-4 text-[15px] leading-[1.8] text-[#3a3a42]">{r.paragraphs[0]}</p>
      {open && r.paragraphs.slice(1).map((t) => (
        <p key={t.slice(0, 12)} className="mt-3 text-[15px] leading-[1.8] text-[#3a3a42]">{t}</p>
      ))}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="mt-3.5 flex w-full items-center justify-center gap-1 rounded-2xl bg-bg py-3 text-[14px] font-semibold text-sub">
        {open ? '접기' : `${year}년 풀이 더 보기`}
        <ChevronDown size={16} className={open ? 'rotate-180' : ''} aria-hidden="true" />
      </button>
    </Card>
  );
}
