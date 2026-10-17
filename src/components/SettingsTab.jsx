import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { ANIMALS, HOURS } from '../lib/saju.js';
import { STEM_COLOR } from '../lib/fortune.js';
import { GLOSSARY } from '../lib/glossary.js';
import { fourPillars, lunarToSolar } from '../lib/saju.js';
import ZodiacAvatar from './ZodiacAvatar.jsx';
import { FunNotice, Sheet } from './ui.jsx';

const pad = (n) => String(n).padStart(2, '0');
const GROUPS = [
  ['기본', ['본원', '천간', '지지', '지장간', '공망', '대운', '오행', '진태양시', '야자시']],
  ['균형', ['신강', '신약', '용신', '희신', '기신', '조후', '천간합']],
  ['십성', ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인']],
  ['12운성', ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양']],
  ['12신살', ['겁살', '재살', '천살', '지살', '연살', '월살', '망신', '장성', '반안', '역마', '육해', '화개']],
];

function Row({ label, value, onClick, danger }) {
  return (
    <button type="button" onClick={onClick}
      className="flex w-full items-center justify-between border-b border-line px-5 py-[17px] text-left last:border-b-0">
      <span className={`text-[16px] ${danger ? 'text-[#E0455A]' : ''}`}>{label}</span>
      <span className="flex items-center gap-1 text-[15px] text-sub">{value}<ChevronRight size={18} className="text-faint" /></span>
    </button>
  );
}
function Toggle({ label, on, onChange }) {
  return (
    <label className="flex w-full cursor-pointer items-center justify-between border-b border-line px-5 py-[15px] last:border-b-0">
      <span className="text-[16px]">{label}</span>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className={`relative h-[30px] w-[50px] rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ink ${on ? 'bg-ink' : 'bg-line'}`}>
        <span className={`absolute top-[3px] h-6 w-6 rounded-full bg-white shadow transition-[left] ${on ? 'left-[23px]' : 'left-[3px]'}`} />
      </span>
    </label>
  );
}
const Group = ({ title, children }) => (
  <section>
    {title && <p className="mb-2 mt-5 px-1 text-[13px] text-sub">{title}</p>}
    <div className="overflow-hidden rounded-[20px] bg-card">{children}</div>
  </section>
);

export default function SettingsTab({ profile, settings, setSettings, onEdit, onReset, openTerm, onUpdateProfile }) {
  const [sheet, setSheet] = useState(null);
  const solar = profile.calendar === 'lunar' ? lunarToSolar(profile.year, profile.month, profile.day, profile.leap) : profile;
  const y = fourPillars(solar.year, solar.month, solar.day, null).year;

  return (
    <div className="pb-8 pt-1">
      <button type="button" onClick={onEdit} className="flex w-full items-center gap-4 rounded-[20px] bg-card p-5 text-left">
        <ZodiacAvatar branch={y.branch} stem={y.stem} size={60} mood={4} title={`${ANIMALS[y.branch]}띠`} />
        <div className="min-w-0 flex-1">
          <p className="text-[18px] font-bold">{profile.name || `${STEM_COLOR[y.stem]} ${ANIMALS[y.branch]}띠님`}</p>
          <p className="mt-0.5 text-[14px] text-sub">
            {profile.year}.{pad(profile.month)}.{pad(profile.day)} ({profile.calendar === 'lunar' ? '음력' : '양력'})
            {profile.hour !== null && profile.hour !== undefined ? `, ${HOURS[profile.hour].label}` : ', 시간 모름'}{profile.city ? `, ${profile.city}` : ''}
          </p>
        </div>
        <ChevronRight size={20} className="text-faint" />
      </button>

      <Group title="내 사주">
        <Row label="내 정보 수정" onClick={onEdit} />
        <Row label="최근 고민" value={(profile.concerns || []).join(', ') || '없음'} onClick={onEdit} />
        <Toggle label="야자시 적용 (밤 11시대 출생)" on={!!profile.yajasi} onChange={(v) => onUpdateProfile({ ...profile, yajasi: v })} />
      </Group>

      <Group title="앱 설정">
        <Toggle label="소리 효과" on={settings.sound} onChange={(v) => setSettings({ ...settings, sound: v })} />
        <Toggle label="진동" on={settings.vibrate} onChange={(v) => setSettings({ ...settings, vibrate: v })} />
        <Toggle label="큰 글씨" on={settings.bigText} onChange={(v) => setSettings({ ...settings, bigText: v })} />
      </Group>

      <Group title="지원">
        <Row label="사주 기초 용어 보기" onClick={() => setSheet('terms')} />
        <Row label="운세는 어떻게 계산하나요?" onClick={() => setSheet('how')} />
        <Row label="운세를 볼 때 기억해 주세요" onClick={() => setSheet('fun')} />
        <Row label="앱 정보" value="v5.0" onClick={() => setSheet('about')} />
      </Group>

      <Group>
        <Row label="모든 정보 지우고 처음부터" danger onClick={() => setSheet('reset')} />
      </Group>

      <Sheet open={sheet === 'terms'} onClose={() => setSheet(null)} label="사주 기초 용어">
        <h2 className="text-[19px] font-bold">사주 기초 용어</h2>
        {GROUPS.map(([g, terms]) => (
          <div key={g} className="mt-4">
            <p className="mb-2 text-[13px] font-semibold text-sub">{g}</p>
            <div className="flex flex-wrap gap-2">
              {terms.map((t) => (
                <button key={t} type="button" onClick={() => { setSheet(null); openTerm(t); }}
                  className="rounded-full border border-line px-3.5 py-2 text-[14px]">
                  {t} <span className="text-faint">{GLOSSARY[t].hanja}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </Sheet>

      <Sheet open={sheet === 'how'} onClose={() => setSheet(null)} label="계산 방법">
        <h2 className="text-[19px] font-bold">운세는 이렇게 계산해요</h2>
        <ul className="mt-3 space-y-3 text-[14.5px] leading-[1.7] text-[#3a3a42]">
          <li><b>정확한 여덟 글자</b>: 연주·월주는 천문 계산으로 구한 실제 절입 시각으로 가르고, 시주는 태어난 도시의 경도와 당시 표준시·서머타임을 반영한 진태양시로 정해요.</li>
          <li><b>명리 70%</b>: 여덟 글자의 힘을 재서 신강·신약을 판단하고, 균형에 필요한 오행(용신)과 부담되는 오행(기신)을 정해요. 그날의 일진·이번 달·올해 기운이 용신인지 기신인지, 내 지지와 합·충·형·원진을 이루는지, 12운성·공망·천간합까지 따져 점수를 내요.</li>
          <li><b>당사주 15%, 주역 15%</b>: 오늘의 별과 오늘의 괘를 보조 지표로 더해요.</li>
          <li>무작위 요소는 없어요. 같은 사람, 같은 날이면 언제 봐도 같은 결과예요.</li>
          <li>다만 계산이 정확하다고 해서 운세가 맞는다는 뜻은 아니에요. 재미로만 봐 주세요.</li>
        </ul>
      </Sheet>

      <Sheet open={sheet === 'fun'} onClose={() => setSheet(null)} label="운세 이용 안내">
        <h2 className="text-[19px] font-bold">운세를 볼 때 기억해 주세요</h2>
        <ul className="mt-3 space-y-2.5 text-[14.5px] leading-[1.7] text-[#3a3a42]">
          <li>운세는 옛 계산법을 바탕으로 한 재미있는 이야기예요. 과학적으로 증명된 예측이 아니에요.</li>
          <li>점수가 낮은 날도 실제로 나쁜 일이 생긴다는 뜻이 아니에요. 조금 더 차분하게 보내자는 정도로 받아들여 주세요.</li>
          <li>건강, 돈, 진로, 관계처럼 중요한 결정은 운세 대신 전문가 상담과 내 판단으로 내려 주세요.</li>
          <li>운세 때문에 마음이 무겁다면 잠시 앱을 쉬어도 괜찮아요. 내 하루는 내가 만들어 가는 거니까요.</li>
        </ul>
        <button type="button" onClick={() => setSheet(null)} className="mt-5 w-full rounded-2xl bg-ink py-4 text-[16px] font-semibold text-white">알겠어요</button>
      </Sheet>

      <Sheet open={sheet === 'about'} onClose={() => setSheet(null)} label="앱 정보">
        <h2 className="text-[19px] font-bold">띠링</h2>
        <p className="mt-1 text-[14px] text-sub">띠링! 오늘 내 띠의 운세가 도착했어요</p>
        <p className="mt-2 text-[14.5px] leading-[1.7] text-sub">
          입력한 정보는 이 기기 안에만 저장되고 어디로도 보내지 않아요.
        </p>
        <div className="mt-4"><FunNotice /></div>
      </Sheet>

      <Sheet open={sheet === 'reset'} onClose={() => setSheet(null)} label="정보 지우기">
        <h2 className="text-[19px] font-bold">모든 정보를 지울까요?</h2>
        <p className="mt-2 text-[14.5px] leading-[1.7] text-sub">이 기기에 저장된 생일과 설정이 모두 지워지고 처음 화면으로 돌아가요.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setSheet(null)} className="rounded-2xl bg-bg py-4 text-[16px] font-semibold">취소</button>
          <button type="button" onClick={onReset} className="rounded-2xl bg-[#E0455A] py-4 text-[16px] font-semibold text-white">지우기</button>
        </div>
      </Sheet>
    </div>
  );
}
