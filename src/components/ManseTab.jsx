import { useEffect, useMemo, useRef } from 'react';
import { BRANCHES, BRANCHES_KO, ELEMENTS, STEMS, STEMS_KO, STEM_EL, BRANCH_EL, manseryeok } from '../lib/saju.js';
import { STEM_COLOR } from '../lib/fortune.js';
import { ilju } from '../lib/personality.js';
import ZodiacAvatar from './ZodiacAvatar.jsx';
import { EL_STYLE } from './SlotBoard.jsx';
import { Card, FunNotice, Term } from './ui.jsx';
import { ANIMALS } from '../lib/saju.js';

const COL_LABEL = { hour: ['시주', '말년운'], day: ['일주', '장년운'], month: ['월주', '청년운'], year: ['년주', '초년운'] };
const EL_NAME = ['나무', '불', '흙', '쇠', '물'];

function Tile({ ko, hanja, el }) {
  const st = EL_STYLE[el];
  return (
    <div className="flex aspect-[5/6] flex-col items-center justify-center rounded-2xl" style={{ background: st.bg, color: st.fg }}>
      <span className="font-hand text-[40px] leading-[0.85]">{ko}</span>
      <span className="mt-1 font-brush text-[12px]">{hanja}</span>
    </div>
  );
}
const Chip = ({ name }) => (
  <Term name={name} className="block w-full rounded-lg border border-line bg-bg py-1.5 text-center text-[13px] font-medium no-underline">
    {name}
  </Term>
);

export default function ManseTab({ profile }) {
  const m = useMemo(() => manseryeok(profile), [profile]);
  const curRef = useRef(null);
  useEffect(() => {
    // 페이지는 움직이지 않고 가로 목록만 현재 대운으로 이동
    const el = curRef.current;
    if (el?.parentElement) el.parentElement.scrollLeft = el.offsetLeft - el.parentElement.clientWidth / 2 + el.clientWidth / 2;
  }, [m]);
  if (!m) return <p className="p-6 text-sub">생일 정보를 다시 확인해 주세요.</p>;
  const p = ilju(m.pillars.day);
  const y = m.pillars.year;
  const max = Math.max(...m.elements);
  const most = m.elements.indexOf(max);
  const missing = m.elements.map((c, i) => (c === 0 ? i : -1)).filter((i) => i >= 0);
  const age = new Date().getFullYear() - m.solar.year + 1;
  const curDw = m.daewoon?.list.findLast((d) => d.age <= age);

  return (
    <div className="space-y-3 pb-6">
      {/* 일주 성향 */}
      <section className="reveal rounded-[22px] border border-line bg-card p-5 text-center">
        <ZodiacAvatar branch={y.branch} stem={y.stem} size={84} mood={4} className="bob mx-auto" title={`${ANIMALS[y.branch]}띠`} />
        <p className="mt-3 text-[13px] text-sub">{STEM_COLOR[y.stem]} {ANIMALS[y.branch]}띠, 나의 일주는</p>
        <h2 className="mt-1 text-[22px] font-extrabold">{p.name} · {p.label}</h2>
        <p className="mt-2 text-[17px] font-bold">{p.title}</p>
        <p className="mt-3 rounded-2xl bg-bg px-4 py-3.5 text-left text-[15px] leading-[1.75] text-[#3a3a42]">{p.desc}</p>
        <p className="mt-2 px-1 text-left text-[14px] leading-[1.65] text-sub">{p.inner}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-left">
          <div className="rounded-xl bg-[#E7EFFE] px-3 py-2.5">
            <p className="text-[11px] font-semibold text-[#2563EB]">강점</p>
            <p className="mt-0.5 text-[13.5px]">{p.good}</p>
          </div>
          <div className="rounded-xl bg-[#FDE8E6] px-3 py-2.5">
            <p className="text-[11px] font-semibold text-[#DC3B2F]">주의</p>
            <p className="mt-0.5 text-[13.5px]">{p.care}</p>
          </div>
        </div>
      </section>

      {/* 만세력 표 */}
      <Card title="만세력" right={<span className="text-[12px] text-sub">밑줄 친 용어를 누르면 풀이가 나와요</span>}>
        <div className="grid grid-cols-[38px_repeat(4,1fr)] gap-x-1.5 gap-y-1.5 text-center">
          <span />
          {m.cols.map((c) => (
            <div key={c.key} className="pb-1">
              <p className="text-[13px] font-bold">{COL_LABEL[c.key][0]}</p>
              <p className="text-[10px] text-faint">{COL_LABEL[c.key][1]}</p>
            </div>
          ))}

          <Term name="천간" className="self-center text-[11px] text-sub no-underline">천간</Term>
          {m.cols.map((c) => (c.empty
            ? <div key={c.key} className="flex aspect-[5/6] items-center justify-center rounded-2xl bg-bg text-[13px] text-faint">모름</div>
            : <Tile key={c.key} ko={STEMS_KO[c.stem]} hanja={STEMS[c.stem]} el={STEM_EL[c.stem]} />))}

          <span className="self-center text-[11px] text-sub">십성</span>
          {m.cols.map((c) => (c.empty ? <span key={c.key} /> : <Chip key={c.key} name={c.stemGod} />))}

          <Term name="지지" className="self-center text-[11px] text-sub no-underline">지지</Term>
          {m.cols.map((c) => (c.empty
            ? <div key={c.key} className="flex aspect-[5/6] items-center justify-center rounded-2xl bg-bg text-[13px] text-faint">모름</div>
            : <Tile key={c.key} ko={BRANCHES_KO[c.branch]} hanja={BRANCHES[c.branch]} el={BRANCH_EL[c.branch]} />))}

          <span className="self-center text-[11px] text-sub">십성</span>
          {m.cols.map((c) => (c.empty ? <span key={c.key} /> : <Chip key={c.key} name={c.branchGod} />))}

          <Term name="지장간" className="self-center pt-2 text-[11px] text-sub">지장간</Term>
          {m.cols.map((c) => (
            <span key={c.key} className="pt-2 text-[13px]">{c.empty ? '-' : c.hidden.map((i) => STEMS_KO[i]).join('')}</span>
          ))}

          <span className="self-center text-[11px] text-sub">12운성</span>
          {m.cols.map((c) => (
            <span key={c.key} className="text-[13px]">
              {c.empty ? '-' : <Term name={c.stage} className="font-semibold text-[#2563EB]" />}
            </span>
          ))}

          <span className="self-center text-[11px] text-sub">12신살</span>
          {m.cols.map((c) => (
            <span key={c.key} className="text-[13px]">{c.empty ? '-' : <Term name={c.sinsal} />}</span>
          ))}

          <Term name="공망" className="self-center text-[11px] text-sub">공망</Term>
          {m.cols.map((c) => (
            <span key={c.key} className="text-[12px] text-sub">
              {!c.empty && m.gongmang.includes(c.branch) ? <b className="text-[#DC3B2F]">공망</b> : '-'}
            </span>
          ))}
        </div>
        <p className="mt-4 rounded-xl bg-bg px-3 py-2.5 text-[13px] leading-relaxed text-sub">
          일주 기준 <Term name="공망" className="text-ink">공망</Term>은{' '}
          <b className="text-ink">{m.gongmang.map((b) => `${BRANCHES_KO[b]}(${BRANCHES[b]})`).join(', ')}</b>이에요.
          {m.natal.solarMinutes === null
            ? ' 태어난 시간을 몰라서 시주는 비워 뒀어요.'
            : <> {profile.city || '한국 평균 경도'} 기준 <Term name="진태양시" className="text-ink">진태양시</Term> {String(Math.floor(m.natal.solarMinutes / 60)).padStart(2, '0')}:{String(m.natal.solarMinutes % 60).padStart(2, '0')}로 시주를 정했어요.</>}
        </p>
      </Card>

      {/* 신강·신약과 용신 */}
      <Card title={<Term name={m.analysis.strong ? '신강' : '신약'} className="no-underline">신강·신약과 용신</Term>}
        right={<span className="text-[12px] text-sub">{m.analysis.deukryeong ? '월령을 얻음(득령)' : '월령을 못 얻음(실령)'}</span>}>
        <div className="relative mt-1 h-3 rounded-full bg-gradient-to-r from-[#E3E9F8] via-[#EEF0F3] to-[#FDE6E2]">
          <span className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-ink shadow"
            style={{ left: `${Math.min(96, Math.max(4, m.analysis.ratio * 100))}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-faint"><span>신약</span><span>중화</span><span>신강</span></div>
        <p className="mt-3 text-[15px] font-bold">
          나를 돕는 기운이 {Math.round(m.analysis.ratio * 100)}%라서 <span className="text-[#2563EB]">{m.analysis.label}</span>한 사주예요.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[['용신', m.analysis.yongsin, '#2563EB', '#E7EFFE'], ['희신', m.analysis.heesin, '#2E8B57', '#E3F3EA'], ['기신', m.analysis.gisin, '#DC3B2F', '#FDE8E6']].map(([t, el, fg, bg]) => (
            <div key={t} className="rounded-xl px-2 py-2.5" style={{ background: bg }}>
              <Term name={t} className="text-[12px] font-semibold" >{t}</Term>
              <p className="mt-0.5 text-[17px] font-bold" style={{ color: fg }}>{EL_NAME[el]}({ELEMENTS[el]})</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[14px] leading-[1.7] text-[#3a3a42]">
          {m.analysis.strong
            ? '힘이 넘치는 사주라 힘을 덜어 주고 써 주는 기운이 반가워요.'
            : '힘이 약한 사주라 나를 채워 주고 받쳐 주는 기운이 반가워요.'}
          {m.analysis.johu === 1 && ' 추운 계절에 태어나 따뜻한 화(火) 기운도 함께 필요해요.'}
          {m.analysis.johu === 4 && ' 더운 계절에 태어나 시원한 수(水) 기운도 함께 필요해요.'}
          {' '}그날의 일진에 {EL_NAME[m.analysis.yongsin]} 기운이 들어오면 운세 점수가 올라가요.
        </p>
      </Card>

      {/* 오행 분포 */}
      <Card title={<Term name="오행" className="no-underline">오행 분포</Term>}>
        <ul className="space-y-2.5">
          {m.elements.map((cnt, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="w-12 text-[13px] font-semibold" style={{ color: EL_STYLE[i].fg }}>{EL_NAME[i]}({ELEMENTS[i]})</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-bg">
                <div className="h-full rounded-full" style={{ width: `${(cnt / 8) * 100}%`, background: EL_STYLE[i].fg, opacity: 0.8 }} />
              </div>
              <span className="w-6 text-right text-[13px] font-bold tabular-nums">{cnt}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[14px] leading-[1.7] text-[#3a3a42]">
          {EL_NAME[most]}({ELEMENTS[most]}) 기운이 {max}개로 가장 많아요.
          {missing.length > 0
            ? ` ${missing.map((i) => `${EL_NAME[i]}(${ELEMENTS[i]})`).join(', ')} 기운은 없어서, 그 기운의 색과 방향을 가까이하면 균형이 맞아요.`
            : ' 다섯 기운이 모두 있어서 균형이 좋은 편이에요.'}
        </p>
      </Card>

      {/* 대운 */}
      <Card title={<Term name="대운" className="no-underline">대운 흐름</Term>}
        right={m.daewoon && <span className="text-[12px] text-sub">{m.daewoon.forward ? '순행' : '역행'}, 대운수 {m.daewoon.start} ({m.daewoon.exact.years}년 {m.daewoon.exact.months}개월)</span>}>
        {m.daewoon ? (
          <>
            <div className="no-scrollbar relative -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {m.daewoon.list.map((d) => {
                const on = curDw && d.age === curDw.age;
                return (
                  <div key={d.age} ref={on ? curRef : undefined} className={`flex w-[64px] shrink-0 flex-col items-center rounded-2xl py-2.5 ${on ? 'bg-ink text-white' : 'bg-bg'}`}>
                    <span className={`text-[11px] ${on ? 'text-white/70' : 'text-sub'}`}>{d.age}세</span>
                    <span className="font-hand text-[26px] leading-tight" style={{ color: on ? '#fff' : EL_STYLE[STEM_EL[d.stem]].fg }}>{STEMS_KO[d.stem]}</span>
                    <span className="font-hand text-[26px] leading-tight" style={{ color: on ? '#fff' : EL_STYLE[BRANCH_EL[d.branch]].fg }}>{BRANCHES_KO[d.branch]}</span>
                  </div>
                );
              })}
            </div>
            {curDw && (
              <p className="mt-3 text-[14px] leading-[1.7] text-[#3a3a42]">
                지금은 {curDw.age}세부터 시작된 <b>{STEMS_KO[curDw.stem]}{BRANCHES_KO[curDw.branch]}({STEMS[curDw.stem]}{BRANCHES[curDw.branch]}) 대운</b>이에요.
                10년 동안 이 기운이 삶의 배경색처럼 깔려요.
              </p>
            )}
          </>
        ) : (
          <p className="text-[14px] text-sub">성별을 입력하면 대운을 계산해 드려요. 설정에서 내 정보를 수정해 주세요.</p>
        )}
      </Card>
      <FunNotice />
    </div>
  );
}
