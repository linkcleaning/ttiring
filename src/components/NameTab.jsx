import { useMemo, useState } from 'react';
import { ChevronDown, PencilLine, Sparkles } from 'lucide-react';
import { manseryeok } from '../lib/saju.js';
import {
  EL_COLOR, EL_KO, EL_SOUND, fourGyeok, readName,
} from '../lib/seongmyeong.js';
import { Card, FunNotice, Term } from './ui.jsx';
import PersonBar from './PersonBar.jsx';
import { personLabel } from '../lib/people.js';

const KIND_TONE = {
  상생: { fg: '#2563EB', bg: '#E7EFFE' },
  설기: { fg: '#6b7280', bg: '#F1F2F4' },
  비화: { fg: '#B7791F', bg: '#FFF6E5' },
  상극: { fg: '#DC3B2F', bg: '#FDE8E6' },
  피극: { fg: '#DC3B2F', bg: '#FDE8E6' },
};

function Letter({ l, big = false }) {
  const color = l.el === null ? '#b3b3bd' : EL_COLOR[l.el];
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex items-center justify-center rounded-2xl border-[1.5px] font-bold ${big ? 'h-[58px] w-[58px] text-[26px]' : 'h-[46px] w-[46px] text-[20px]'}`}
        style={{ borderColor: color, color }}>
        {l.ch}
      </div>
      <span className="text-[11px] text-sub">{l.cho}</span>
      <span className="text-[11px] font-semibold" style={{ color }}>
        {l.el === null ? '—' : EL_KO[l.el]}
      </span>
    </div>
  );
}

export default function NameTab({ profile, people = [], activeId, onSelectPerson, onAddPerson, onEditPerson }) {
  const [open, setOpen] = useState(false);          // 한자 획수 입력 펼침
  const [sur, setSur] = useState('');
  const [given, setGiven] = useState(['', '']);
  const [guest, setGuest] = useState('');           // 등록 없이 이름만 보는 사람
  const [draft, setDraft] = useState('');

  const ownName = (profile.name || '').trim();
  const isGuest = guest.length > 0;
  const name = isGuest ? guest : ownName;

  const manse = useMemo(() => {
    try { return manseryeok(profile); } catch { return null; }
  }, [profile]);

  const reading = useMemo(() => {
    if (!name) return null;
    // 손님 이름은 생년월일을 모르니 사주 교차 없이 이름만 봅니다
    const ctx = !isGuest && manse ? { analysis: manse.analysis, pillars: manse.pillars } : null;
    return readName(name, ctx);
  }, [name, isGuest, manse]);

  const clearGuest = () => { setGuest(''); setDraft(''); setSur(''); setGiven(['', '']); };
  const submitGuest = (e) => {
    e.preventDefault();
    const v = draft.trim();
    if (!v) return;
    setGuest(v); setSur(''); setGiven(['', '']);
  };

  const gyeok = useMemo(() => {
    const s = Number(sur);
    const g = given.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    return fourGyeok(s, g);
  }, [sur, given]);

  return (
    <div className="pb-6 pt-1">
      {onSelectPerson && (
        <div className="mb-3">
          <PersonBar people={people} activeId={isGuest ? null : (activeId ?? profile.id)}
            onSelect={(id) => { clearGuest(); onSelectPerson(id); }} onAdd={onAddPerson} />
        </div>
      )}

      {/* 등록 없이 이름만 풀어 보기 */}
      <section className="mb-3 rounded-[18px] border border-line bg-card px-4 py-3.5">
        {isGuest ? (
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 text-[14px] leading-snug">
              <b className="font-bold">{guest}</b> 님 이름만 보고 있어요
            </p>
            <button type="button" onClick={clearGuest}
              className="shrink-0 rounded-full bg-bg px-3 py-1.5 text-[13px] font-semibold text-sub">
              {ownName ? '내 이름으로' : '지우기'}
            </button>
          </div>
        ) : (
          <form onSubmit={submitGuest}>
            <p className="text-[13px] leading-snug text-sub">
              생년월일·태어난 시간 없이, <b className="font-semibold text-ink">이름만</b> 넣어도 봐 드려요
            </p>
            <div className="mt-2.5 flex gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 10))}
                placeholder="이름 (예: 김하늘)" aria-label="풀어 볼 이름"
                className="min-w-0 flex-1 rounded-xl bg-bg px-3.5 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-ink" />
              <button type="submit" disabled={!draft.trim()}
                className="shrink-0 rounded-xl bg-ink px-4 py-2.5 text-[15px] font-semibold text-white disabled:opacity-30">
                풀기
              </button>
            </div>
          </form>
        )}
      </section>

      {!name ? (
        <Card className="text-center">
          <h2 className="text-[19px] font-bold">이름이 없어요</h2>
          <p className="mt-2 text-[14.5px] leading-[1.75] text-sub">
            이름 풀이는 한글 이름의 첫소리로 봅니다. 위 칸에 이름만 적어도 바로 볼 수 있고,
            내 이름으로 계속 보시려면 설정에서 넣어 주세요.
          </p>
          <button type="button" onClick={onEditPerson}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-[16px] font-semibold text-white">
            <PencilLine size={18} className="shrink-0" aria-hidden="true" /> 이름 넣기
          </button>
        </Card>
      ) : !reading ? (
        <Card title="이름을 읽지 못했어요">
          <p className="text-[15px] leading-[1.8]">한글 이름이어야 첫소리 오행을 볼 수 있어요. 설정에서 한글로 바꿔 주세요.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* 이름 글자판 */}
          <section className="reveal rounded-[22px] border-[1.5px] border-ink bg-card p-5">
            <p className="text-[13px] text-sub">
              {isGuest ? `${guest}님의 이름` : (profile.id === 'me' ? '내 이름' : `${personLabel(profile)}님의 이름`)} · 발음오행
            </p>
            <div className="mt-3 flex flex-wrap items-start justify-center gap-3">
              {reading.letters.map((l, i) => <Letter key={`${l.ch}-${i}`} l={l} big />)}
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="rounded-full bg-ink px-3 py-1 text-[13px] font-semibold text-white">{reading.flow.grade.label}</span>
              <span className="text-[15px] font-bold tabular-nums">{reading.total}점</span>
            </div>
            <p className="mt-3 text-center text-[14px] leading-[1.7] text-sub">{reading.flow.grade.desc}</p>
          </section>

          <Card title="소리의 흐름" right={<span className="text-[12px] text-sub">상생·상극</span>} delay={40}>
            {reading.flow.pairs.length === 0 ? (
              <p className="text-[14.5px] leading-[1.8] text-[#3a3a42]">
                글자가 하나라 이어지는 흐름은 볼 수 없어요. 대신 그 한 소리가 그대로 이름의 성향이 됩니다.
              </p>
            ) : (
              <div className="space-y-3">
                {reading.flow.pairs.map((p, i) => {
                  const t = KIND_TONE[p.kind];
                  return (
                    <div key={i} className="flex gap-3">
                      <span className="mt-0.5 h-fit shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold"
                        style={{ color: t.fg, background: t.bg }}>
                        {reading.letters[i].ch}→{reading.letters[i + 1].ch} {p.kind}
                      </span>
                      <p className="text-[14.5px] leading-[1.7]">{p.text}</p>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-3 rounded-xl bg-bg px-3 py-2 text-[12.5px] leading-relaxed text-sub">
              첫소리 자음을 오행으로 봅니다. 어금닛소리 ㄱ·ㅋ은 목(木), 혓소리 ㄴ·ㄷ·ㄹ·ㅌ은 화(火),
              목구멍소리 ㅇ·ㅎ은 토(土), 잇소리 ㅅ·ㅈ·ㅊ은 금(金), 입술소리 ㅁ·ㅂ·ㅍ은 수(水)예요.
              목→화→토→금→수→목으로 이어지면 상생, 하나 건너뛰면 상극입니다.
            </p>
          </Card>

          <Card title="이름을 이끄는 기운" delay={80}>
            <p className="text-[15px] leading-[1.85] text-[#3a3a42]">{reading.mainText}</p>
            <dl className="mt-4 space-y-2">
              {EL_KO.map((label, el) => (
                <div key={label} className="flex items-center gap-3">
                  <dt className="w-[52px] shrink-0 text-[13px] font-semibold" style={{ color: EL_COLOR[el] }}>{label}</dt>
                  <dd className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-bg">
                    <div className="h-full rounded-full transition-[width] duration-700"
                      style={{ width: `${Math.min(100, reading.nameCount[el] * 50)}%`, background: EL_COLOR[el] }} />
                  </dd>
                  <dd className="w-[26px] shrink-0 text-right text-[13px] font-bold tabular-nums">{reading.nameCount[el]}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="음양 배열" right={<span className="text-[12px] text-sub">한글 획수</span>} delay={120}>
            <div className="mb-3 flex flex-wrap justify-center gap-2">
              {reading.yinYang.marks.map((m, i) => (
                <span key={i} className={`rounded-xl px-3 py-2 text-[14px] font-semibold ${m.yang ? 'bg-[#FDF1DE] text-[#B7791F]' : 'bg-[#EFF1F6] text-[#4a5568]'}`}>
                  {m.ch} {m.strokes}획 · {m.yang ? '양' : '음'}
                </span>
              ))}
            </div>
            <p className="text-[14.5px] leading-[1.8] text-[#3a3a42]">{reading.yinYang.text}</p>
          </Card>

          {isGuest && (
            <Card title="사주 × 이름" right={<span className="text-[12px] text-sub">생년월일 필요</span>} delay={160}>
              <p className="text-[15px] leading-[1.85] text-[#3a3a42]">
                생년월일을 모르니 사주와 맞춰 보는 풀이는 뺐어요. 위 내용은 이름 소리만 가지고 본 것입니다.
                사주까지 같이 보고 싶으면 위 캐릭터 줄의 <b className="font-semibold">＋ 추가</b>로 등록해 주세요.
              </p>
            </Card>
          )}

          {!isGuest && reading.cross.length > 0 && (
            <Card title="사주 × 이름" right={<span className="text-[12px] text-sub">채워 주는 기운</span>} delay={160}>
              <div className="space-y-3">
                {reading.cross.map((c, i) => (
                  <p key={i} className="text-[15px] leading-[1.85] text-[#3a3a42]">{c}</p>
                ))}
              </div>
            </Card>
          )}

          {/* 한자 획수 (선택) */}
          <section className="reveal rounded-[22px] border border-line bg-card" style={{ animationDelay: '200ms' }}>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full p-5 text-left">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="shrink-0 text-faint" aria-hidden="true" />
                <h2 className="text-[16px] font-bold">한자 획수를 알면 더 자세히</h2>
                <ChevronDown size={18} className={`ml-auto shrink-0 text-faint transition-transform ${open ? 'rotate-180' : ''}`} />
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-faint">
                <Term name="원형이정" className="text-sub">원형이정(元亨利貞)</Term> 4격과 81수리는 한자 획수로 봐요
              </p>
            </button>
            {open && (
              <div className="fade-in px-5 pb-5">
                <div className="grid grid-cols-3 gap-2">
                  {[['성', sur, (v) => setSur(v)],
                    ['이름 1', given[0], (v) => setGiven([v, given[1]])],
                    ['이름 2', given[1], (v) => setGiven([given[0], v])]].map(([label, val, set]) => (
                      <label key={label} className="block">
                        <span className="text-[12px] text-sub">{label} 획수</span>
                        <input value={val} onChange={(e) => set(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                          inputMode="numeric" placeholder="-"
                          className="mt-1 w-full rounded-xl bg-bg px-3 py-2.5 text-center text-[16px] focus:outline-none focus:ring-2 focus:ring-ink" />
                      </label>
                    ))}
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-faint">
                  한자 원래 획수로 넣어 주세요. 부수가 줄어든 글자는 본래 글자 기준이에요 (氵는 水 4획).
                  외자 이름이면 ‘이름 2’는 비워 두세요.
                </p>
                {gyeok ? (
                  <div className="mt-4 space-y-2">
                    {gyeok.map((g) => (
                      <div key={g.key} className="flex items-center gap-3 rounded-2xl bg-bg px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-[14.5px] font-bold">{g.key}({g.hanja})</p>
                          <p className="text-[12px] text-sub">{g.life} · {g.how}</p>
                        </div>
                        <span className="ml-auto shrink-0 text-[16px] font-bold tabular-nums">{g.n}</span>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold
                          ${g.kind === '길' ? 'bg-[#E7EFFE] text-[#2563EB]' : g.kind === '주의' ? 'bg-[#FDE8E6] text-[#DC3B2F]' : 'bg-bg text-sub'}`}>
                          {g.kind}
                        </span>
                      </div>
                    ))}
                    <p className="mt-2 text-[12px] leading-relaxed text-faint">
                      81을 넘는 수는 81로 나눈 나머지로 봅니다. 길흉 분류는 전통 수리성명학에서 길수로 꼽는 수를 따랐어요.
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 rounded-2xl bg-bg px-4 py-3 text-[13.5px] leading-relaxed text-sub">
                    성과 이름 첫 글자 획수를 넣으면 4격이 나와요.
                  </p>
                )}
              </div>
            )}
          </section>

          <Card title="첫소리와 오행" delay={240}>
            <div className="space-y-2">
              {EL_SOUND.map((s) => (
                <div key={s.el} className="flex items-center gap-3">
                  <span className="w-[52px] shrink-0 text-[13px] font-semibold" style={{ color: EL_COLOR[s.el] }}>{EL_KO[s.el]}</span>
                  <span className="w-[72px] shrink-0 text-[13px] text-sub">{s.name}</span>
                  <span className="text-[15px] font-semibold tracking-wide">{s.letters}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-faint">
              ㅇ·ㅎ을 토(土)로 보는 쪽과 금(金)으로 보는 쪽이 갈립니다. 여기서는 훈민정음의 발음 위치를 따라
              목구멍소리를 토(土)로 봤어요. 음양과 획수는 한글 자모 획수 기준이라 유파에 따라 조금씩 달라요.
            </p>
          </Card>

          <FunNotice />
        </div>
      )}
    </div>
  );
}
