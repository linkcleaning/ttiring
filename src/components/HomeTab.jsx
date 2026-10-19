import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Coins, Heart, HeartPulse, Lightbulb,
  Download, PencilLine, Share2, Sparkles, X,
} from 'lucide-react';
import { computeFortune } from '../lib/saju.js';
import { EVENT_INFO, buildReading, shareText } from '../lib/fortune.js';
import { shareCard } from '../lib/shareCard.js';
import { unlockAudio } from '../lib/sound.js';
import ZodiacAvatar, { moodOf } from './ZodiacAvatar.jsx';
import DrawMachine from './DrawMachine.jsx';
import Hexagram from './Hexagram.jsx';
import { Card, FunNotice, Term } from './ui.jsx';
import PersonBar from './PersonBar.jsx';
import { personLabel } from '../lib/people.js';
import { scoreTone } from './MonthCalendar.jsx';

const CAT = {
  사업: { icon: Briefcase, label: '커리어운', color: '#2F4FB5' },
  재물: { icon: Coins, label: '금전운', color: '#C98A12' },
  애정: { icon: Heart, label: '연애운', color: '#E4573F' },
  건강: { icon: HeartPulse, label: '건강운', color: '#2E8B57' },
};
const ORDER = ['사업', '재물', '애정', '건강'];
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const ymd = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

function useCountUp(target, ms = 800) {
  const [v, setV] = useState(target);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function CategoryCard({ item, delay }) {
  const [open, setOpen] = useState(false);
  const meta = CAT[item.key];
  const Icon = meta.icon;
  return (
    <section className="reveal rounded-[22px] border border-line bg-card" style={{ animationDelay: `${delay}ms` }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full p-5 text-left">
        <div className="flex items-center gap-2">
          <Icon size={17} strokeWidth={2.2} style={{ color: meta.color }} aria-hidden="true" />
          <h3 className="text-[16px] font-bold">{meta.label}</h3>
          <span className="ml-auto text-[17px] font-bold tabular-nums">{item.score}</span>
          <ChevronDown size={18} className={`text-faint transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-bg">
          <div className="h-full rounded-full" style={{ width: `${item.score}%`, background: meta.color }} />
        </div>
        <p className="mt-2.5 text-[14.5px] leading-[1.7] text-sub">{item.text}</p>
      </button>
      {open && (
        <div className="fade-in space-y-2 px-5 pb-5">
          <div className="rounded-2xl bg-bg px-4 py-3">
            <p className="text-[12px] font-semibold text-sub">왜 그럴까요?</p>
            <p className="mt-1 text-[14.5px] leading-[1.65]">{item.reason}</p>
          </div>
          <div className="rounded-2xl bg-[#FFF6E5] px-4 py-3">
            <p className="flex items-center gap-1 text-[12px] font-semibold text-[#B7791F]"><Lightbulb size={13} /> 이렇게 해 보세요</p>
            <p className="mt-1 text-[14.5px] leading-[1.65]">{item.tip}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default function HomeTab({ profile, soundOn, people, activeId, onSelectPerson, onAddPerson, onEditPerson, drawnDate, onDrawn, dateOffset, setDateOffset, onOpenCalendar, toast }) {
  const date = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    return d;
  }, [dateOffset]);
  const r = useMemo(() => computeFortune(profile, date), [profile, date]);
  const reading = useMemo(() => buildReading(r, profile.concerns || []), [r, profile.concerns]);
  const isToday = dateOffset === 0;
  const needDraw = isToday && drawnDate !== ymd(new Date());
  const [runId, setRunId] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const score = useCountUp(r.scores.total);
  const tone = scoreTone(r.scores.total);
  const name = profile.name?.trim();
  const isMe = profile.id === 'me';
  const avatarRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const items = ORDER.map((k) => reading.items.find((i) => i.key === k));
  const ev = reading.event && EVENT_INFO[reading.event];

  const draw = () => {
    if (soundOn) unlockAudio();
    setSpinning(true);
    setRunId((n) => n + 1);
  };

  const saveImage = async () => {
    setSaving(true);
    const out = await shareCard(
      { result: r, reading, name, avatarEl: avatarRef.current?.querySelector('svg') },
      shareText(r, reading),
    );
    setSaving(false);
    if (out === 'saved') toast('운세 카드를 저장했어요');
    else if (out === 'failed') toast('이미지를 만들지 못했어요');
  };

  const share = async () => {
    const text = shareText(r, reading);
    try {
      if (navigator.share) { await navigator.share({ title: '띠링', text, url: location.origin }); return; }
      await navigator.clipboard.writeText(`${text}\n${location.origin}`);
      toast('운세를 복사했어요. 카톡에 붙여넣어 보내세요');
    } catch (e) {
      if (e?.name !== 'AbortError') toast('보내지 못했어요. 다시 시도해 주세요');
    }
  };

  return (
    <div className="pb-6">
      <div className="mt-1">
        <PersonBar people={people} activeId={activeId} onSelect={onSelectPerson} onAdd={onAddPerson} />
      </div>

      {/* 인사 */}
      <div className="mt-3 flex items-center gap-3">
        <span ref={avatarRef} className="shrink-0">
          <ZodiacAvatar branch={r.pillars.year.branch} stem={r.pillars.year.stem} size={54}
            mood={needDraw ? 3 : moodOf(r.scores.total)} className={spinning ? 'wiggle' : 'bob'} title={`${reading.zodiacName}띠`} />
        </span>
        <p className="min-w-0 flex-1 text-[15px] leading-snug">
          <span className="text-sub">{reading.ilju} </span>
          {isMe ? (
            <><b>{name ? `${name}님` : `${reading.zodiacName}띠님`}</b> 반가워요.</>
          ) : (
            <><b>{personLabel(profile)}님</b>의 운세예요. <span className="text-sub">({profile.relation})</span></>
          )}
        </p>
        <button type="button" onClick={onEditPerson} aria-label="정보 수정"
          className="rounded-xl border border-line bg-card p-2.5 text-sub"><PencilLine size={18} /></button>
        <button type="button" onClick={onOpenCalendar} aria-label="운세 달력"
          className="rounded-xl border border-line bg-card p-2.5 text-ink">
          <CalendarDays size={20} />
        </button>
      </div>

      {/* 날짜 이동 */}
      <div className="my-4 flex items-center justify-between">
        <button type="button" onClick={() => setDateOffset((o) => o - 1)} aria-label="전날" className="rounded-full p-2 text-sub">
          <ChevronLeft size={22} />
        </button>
        <div className="text-center">
          <p className="text-[16px] font-bold">
            {date.getFullYear()}년 {date.getMonth() + 1}월 {date.getDate()}일 {WEEK[date.getDay()]}요일
          </p>
          <p className="mt-0.5 text-[13px] text-sub">{reading.ganzhiLine}</p>
          {!isToday && (
            <button type="button" onClick={() => setDateOffset(0)} className="mt-1 rounded-full bg-ink px-3 py-0.5 text-[12px] text-white">오늘로</button>
          )}
        </div>
        <button type="button" onClick={() => setDateOffset((o) => o + 1)} aria-label="다음날" className="rounded-full p-2 text-sub">
          <ChevronRight size={22} />
        </button>
      </div>

      {(needDraw || spinning) ? (
        <Card title={isMe ? '오늘의 운세 뽑기' : `${personLabel(profile)}님 운세 뽑기`} right={<span className="text-[12px] text-sub">일진·당사주·주역</span>}>
          <DrawMachine result={r} runId={runId} soundOn={soundOn}
            onDone={() => { setTimeout(() => { setSpinning(false); onDrawn(); }, 500); }} />
          <button type="button" onClick={draw} disabled={spinning}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-[17px] font-bold text-white disabled:bg-[#55555e]">
            <Sparkles size={19} /> {spinning ? '뽑고 있어요…' : '오늘 운세 뽑기'}
          </button>
          <p className="mt-2 text-center text-[12px] text-faint">하루에 한 번, 같은 날엔 같은 결과가 나와요. 재미로만 봐 주세요!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* 총운 */}
          <section className="reveal flex items-stretch gap-4 rounded-[22px] border-[1.5px] border-ink bg-card p-5">
            <div className="shrink-0">
              <p className="text-[13px] text-sub">{isToday ? '오늘의 총운' : '이날의 총운'}</p>
              <p className="mt-1 text-[52px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">{score}</p>
              <span className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-[12px] font-bold"
                style={{ color: tone.fg, background: tone.bg }}>{reading.grade.label}</span>
            </div>
            <div className="w-px bg-line" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[13px] text-sub">총운 한마디</p>
              <p className="mt-1.5 text-[16px] font-semibold leading-[1.55]">{reading.summary}</p>
              {ev && (
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-[12px] font-semibold">
                  {ev.icon} {ev.label}
                </p>
              )}
            </div>
          </section>

          <dl className="reveal grid grid-cols-3 gap-2 text-center">
            {[['일진', r.scores.myeong, `${reading.ganzhiLine.split(' ')[2]} 기준`], ['당사주', r.scores.dang, r.star.name], ['주역', r.scores.juyeok, r.iching.changed.ko]].map(([k, v, sub]) => (
              <div key={k} className="rounded-2xl border border-line bg-card px-2 py-3">
                <dt className="text-[12px] text-sub">{k}</dt>
                <dd className="text-[20px] font-bold tabular-nums">{v}</dd>
                <dd className="truncate text-[11px] text-faint">{sub}</dd>
              </div>
            ))}
          </dl>

          <Card title="오늘 운세의 근거" right={<span className="text-[12px] text-sub">내 사주 × 오늘 일진</span>} delay={60}>
            <ul className="space-y-2.5">
              {r.basis.slice(0, 5).map((n, i) => (
                <li key={`${i}-${n.text}`} className="flex gap-2.5">
                  <span className={`mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white
                    ${n.v > 0.5 ? 'bg-[#2563EB]' : n.v < -0.5 ? 'bg-[#DC3B2F]' : 'bg-faint'}`}>
                    {n.v > 0.5 ? '+' : n.v < -0.5 ? '−' : '·'}
                  </span>
                  <p className="text-[14.5px] leading-[1.6]">{n.text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 rounded-xl bg-bg px-3 py-2 text-[12.5px] leading-relaxed text-sub">
              내 사주는 <Term name={r.analysis.strong ? '신강' : '신약'} className="font-semibold text-ink">{r.analysis.label}</Term>,{' '}
              <Term name="용신" className="font-semibold text-ink">용신</Term>은 {['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'][r.analysis.yongsin]}이에요.
              이 기운이 들어오는 날 점수가 올라가요.
            </p>
          </Card>

          {reading.concernTips.length > 0 && (
            <Card title="내 고민 운세" right={<span className="text-[12px] text-sub">고른 고민 {reading.concernTips.length}개</span>} delay={80}>
              <ul className="space-y-3">
                {reading.concernTips.map((c) => {
                  const ct = scoreTone(c.score);
                  return (
                    <li key={c.key} className="flex gap-3">
                      <span className="mt-0.5 h-fit shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold" style={{ color: ct.fg, background: ct.bg }}>
                        {c.key}
                      </span>
                      <p className="text-[14.5px] leading-[1.6]">{c.text}</p>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {items.map((it, i) => <CategoryCard key={it.key} item={it} delay={140 + i * 60} />)}

          <Card delay={380}>
            <div className="grid grid-cols-2 divide-x divide-line text-center">
              <div>
                <p className="text-[12px] text-sub">행운의 컬러</p>
                <p className="mt-1 flex items-center justify-center gap-1.5 text-[17px] font-bold">
                  <span className="h-3.5 w-3.5 rounded-full border border-line" style={{ background: reading.lucky.colorHex }} />
                  {reading.lucky.color}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-sub">행운의 아이템</p>
                <p className="mt-1 text-[17px] font-bold">{reading.lucky.item}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4">
              {[['행운의 숫자', reading.lucky.number], ['좋은 방향', reading.lucky.direction], ['행운의 음식', reading.lucky.food], ['좋은 시간', reading.lucky.time]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-bg px-3 py-2.5">
                  <dt className="text-[11px] text-sub">{k}</dt>
                  <dd className="mt-0.5 text-[14px] font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="요즘 당신의 마음" delay={420}>
            <p className="text-[15.5px] leading-[1.8] text-[#3a3a42]">{reading.empathy}</p>
          </Card>

          <Card title="오늘의 괘와 당사주" right={<span className="text-[12px] text-sub">{reading.godLabel}의 날</span>} delay={460}>
            <div className="mb-4 flex items-end justify-center gap-7 rounded-2xl bg-bg py-4">
              <Hexagram hex={reading.hexagram.base} moving={reading.hexagram.moving} title="타고난 괘" delay={500} faded />
              <span className="pb-12 text-faint" aria-hidden="true">›</span>
              <Hexagram hex={reading.hexagram.changed} moving={reading.hexagram.moving} title="오늘의 괘" delay={800} />
            </div>
            <p className="text-[15px] leading-[1.75] text-[#3a3a42]">{reading.headline}</p>
            <p className="mt-3 text-[12px] leading-relaxed text-faint">
              타고난 괘는 생년월일 숫자로, 붉은 효는 오늘 날짜로 정해져요. 바뀐 괘가 오늘의 괘예요.
            </p>
          </Card>

          <Card title="오늘 피할 것" delay={500}>
            <ul className="mb-3 flex flex-wrap gap-2">
              {reading.avoid.map((a) => (
                <li key={a} className="flex items-center gap-1 rounded-full bg-[#FDECE9] px-3 py-1.5 text-[13px] font-medium text-[#C23B26]">
                  <X size={13} strokeWidth={3} aria-hidden="true" /> {a}
                </li>
              ))}
            </ul>
            <p className="text-[14.5px] leading-[1.7] text-sub">{reading.caution}</p>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={saveImage} disabled={saving}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-line bg-card py-4 text-[15.5px] font-semibold disabled:text-faint">
              <Download size={17} aria-hidden="true" /> {saving ? '만드는 중…' : '이미지로 저장'}
            </button>
            <button type="button" onClick={share}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-ink py-4 text-[15.5px] font-semibold text-white">
              <Share2 size={17} aria-hidden="true" /> 친구에게 보내기
            </button>
          </div>
          <FunNotice />
        </div>
      )}
    </div>
  );
}
