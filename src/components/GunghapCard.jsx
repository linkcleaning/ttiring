import { useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { gunghap } from '../lib/gunghap.js';
import { eun } from '../lib/josa.js';
import { personLabel, personYear } from '../lib/people.js';
import ZodiacAvatar from './ZodiacAvatar.jsx';
import { Card, scoreTone } from './ui.jsx';

/** 두 겹(타고난 사이 / 오늘의 호흡)을 나란히 보여 주는 막대 */
function Bars({ base, today }) {
  const row = (label, v, hint) => (
    <div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[12px] text-sub">{label}</span>
        <span className="text-[14px] font-bold tabular-nums">{v}</span>
        <span className="ml-auto text-[11px] text-faint">{hint}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg">
        <div className="h-full rounded-full bg-ink/70" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
  return (
    <div className="mt-4 grid gap-3 border-t border-line pt-4">
      {row('타고난 사이', base, '평생 그대로')}
      {row('오늘의 호흡', today, '날마다 달라져요')}
    </div>
  );
}

export default function GunghapCard({ people, activeId, profile, date, onAddPerson, delay = 0 }) {
  const others = useMemo(() => people.filter((p) => p.id !== activeId), [people, activeId]);

  // 오늘 점수가 높은 사람부터 (매일 순서가 바뀌는 것도 들여다볼 이유가 돼요)
  const list = useMemo(() => {
    const out = [];
    for (const p of others) {
      try { out.push({ p, g: gunghap(profile, p, date) }); } catch { /* 생년월일이 이상한 사람은 건너뜁니다 */ }
    }
    return out.sort((x, y) => y.g.total - x.g.total);
  }, [others, profile, date]);

  const [pickId, setPickId] = useState(null);
  const sel = list.find((x) => x.p.id === pickId) || list[0];

  if (others.length === 0) {
    return (
      <Card title="오늘의 궁합" right={<span className="text-[12px] text-sub">일진으로 매일 바뀌어요</span>} delay={delay}>
        <div className="rounded-2xl bg-bg px-4 py-5 text-center">
          <Users size={22} className="mx-auto text-faint" aria-hidden="true" />
          <p className="mt-2.5 text-[14.5px] leading-[1.7] text-sub">
            가족이나 동료를 한 명 넣어 두면,<br />그 사람과 오늘 얼마나 맞는지 매일 알려 드려요.
          </p>
          <button type="button" onClick={onAddPerson}
            className="mx-auto mt-3.5 flex items-center gap-1 rounded-full bg-ink px-4 py-2 text-[13.5px] font-semibold text-white">
            <Plus size={15} strokeWidth={3} aria-hidden="true" /> 사람 추가
          </button>
        </div>
      </Card>
    );
  }

  if (!sel) return null;
  const { g } = sel;
  const tone = scoreTone(g.total);

  return (
    <Card title="오늘의 궁합" right={<span className="text-[12px] text-sub">일진으로 매일 바뀌어요</span>} delay={delay}>
      {list.length > 1 && (
        <div className="no-scrollbar -mx-5 mb-4 flex gap-2 overflow-x-auto px-5" role="tablist" aria-label="궁합을 볼 사람">
          {list.map(({ p, g: gg }) => {
            const on = p.id === sel.p.id;
            const y = personYear(p);
            return (
              <button key={p.id} type="button" role="tab" aria-selected={on} onClick={() => setPickId(p.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 ${
                  on ? 'border-ink bg-ink/5' : 'border-line'}`}>
                <ZodiacAvatar branch={y.branch} stem={y.stem} size={26} mood={on ? 4 : 3}
                  className={on ? '' : 'opacity-60'} title={personLabel(p)} />
                <span className={`max-w-[84px] truncate text-[13px] ${on ? 'font-bold' : 'text-sub'}`}>{personLabel(p)}</span>
                <span className="text-[13px] font-bold tabular-nums" style={{ color: on ? tone.fg : undefined }}>{gg.total}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5" style={{ background: tone.bg }}>
        <div className="text-center">
          <p className="text-[26px] font-extrabold leading-none tabular-nums" style={{ color: tone.fg }}>{g.total}</p>
          <p className="mt-1 text-[11px] text-sub">점</p>
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-bold" style={{ color: tone.fg }}>{g.modeLabel}</p>
          <p className="mt-0.5 text-[13.5px] leading-[1.6] text-[#3a3a42]">{g.summary}</p>
        </div>
      </div>

      <p className="mt-4 text-[15px] leading-[1.8] text-[#3a3a42]">{g.todayText}</p>

      <Bars base={g.base} today={g.today} />

      <div className="mt-4 space-y-2.5 border-t border-line pt-4">
        <div className="rounded-2xl bg-bg px-4 py-3">
          <p className="text-[12px] font-semibold text-sub">타고난 사이</p>
          <p className="mt-1 text-[14.5px] font-bold">{g.god.label}</p>
          <p className="mt-1 text-[14px] leading-[1.7] text-sub">{g.god.text}</p>
          <p className="mt-2 text-[12.5px] leading-[1.6] text-faint">
            반대로 {g.bName} 쪽에서 보면 {eun(g.aName)} ‘{g.godBack.label}’예요.
          </p>
        </div>
        <p className="px-1 text-[14px] leading-[1.75] text-sub">{g.dayLine}</p>
        <p className="px-1 text-[14px] leading-[1.75] text-sub">{g.yearLine}</p>
      </div>
    </Card>
  );
}
