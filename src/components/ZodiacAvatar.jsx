// 12띠 캐릭터 — 직접 그린 SVG에 조명 필터를 씌워 말랑한 3D 클레이 느낌으로 표현
// branch: 0 쥐 ~ 11 돼지 / stem: 연간(배경색 = 띠 색깔) / mood: 1(걱정) ~ 5(신남)
import { createContext, useContext, useId } from 'react';

const BG = [
  ['#EAF3FD', '#BFD9F5'], ['#EAF3FD', '#BFD9F5'], ['#FFF0EE', '#F8C4BC'], ['#FFF0EE', '#F8C4BC'],
  ['#FFF8E1', '#F6DC93'], ['#FFF8E1', '#F6DC93'], ['#F7F8FA', '#D5D9E0'], ['#F7F8FA', '#D5D9E0'],
  ['#EDEFF4', '#B9C0CF'], ['#EDEFF4', '#B9C0CF'],
];
const INK = '#26262b';
const Mood = createContext(3);

/** 점수 → 표정 단계 */
export const moodOf = (score) => (score >= 80 ? 5 : score >= 68 ? 4 : score >= 55 ? 3 : score >= 45 ? 2 : 1);
export const MOOD_LABEL = ['', '조심', '그럭저럭', '무난', '좋음', '최고'];

function Eyes({ y = 57, gap = 10 }) {
  const mood = useContext(Mood);
  const L = 50 - gap;
  const R = 50 + gap;
  if (mood >= 4) {
    // 웃는 눈 ^ ^
    return (
      <g fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round">
        <path d={`M${L - 4} ${y + 1.5} q4 -6 8 0`} />
        <path d={`M${R - 4} ${y + 1.5} q4 -6 8 0`} />
      </g>
    );
  }
  if (mood === 2) {
    // 시큰둥한 반쯤 감은 눈
    return (
      <g>
        <ellipse cx={L} cy={y + 0.5} rx="3.4" ry="2.4" fill={INK} />
        <ellipse cx={R} cy={y + 0.5} rx="3.4" ry="2.4" fill={INK} />
        <path d={`M${L - 4.5} ${y - 1.5} h9 M${R - 4.5} ${y - 1.5} h9`} stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g>
      <ellipse cx={L} cy={y} rx="3.6" ry="4.3" fill={INK} />
      <ellipse cx={R} cy={y} rx="3.6" ry="4.3" fill={INK} />
      <circle cx={L + 1.2} cy={y - 1.6} r="1.4" fill="#fff" />
      <circle cx={R + 1.2} cy={y - 1.6} r="1.4" fill="#fff" />
      {mood === 1 && (
        // 걱정 눈썹
        <g stroke={INK} strokeWidth="1.8" strokeLinecap="round">
          <path d={`M${L - 4} ${y - 6} l7 -2.5`} />
          <path d={`M${R + 4} ${y - 6} l-7 -2.5`} />
        </g>
      )}
    </g>
  );
}
const Blush = ({ y = 65, gap = 17 }) => {
  const mood = useContext(Mood);
  if (mood <= 1) return null;
  return (
    <g fill="#FF7F92" opacity={mood >= 4 ? 0.6 : 0.4}>
      <ellipse cx={50 - gap} cy={y} rx="5.2" ry="3.2" />
      <ellipse cx={50 + gap} cy={y} rx="5.2" ry="3.2" />
    </g>
  );
};
const Smile = ({ y = 66 }) => {
  const mood = useContext(Mood);
  if (mood === 5) {
    return (
      <g>
        <path d={`M44.5 ${y - 1} h11 q0 8 -5.5 8 q-5.5 0 -5.5 -8z`} fill="#8E2A35" />
        <path d={`M47 ${y + 4.5} q3 -3 6 0 q-3 2.5 -6 0z`} fill="#FF8D9B" />
      </g>
    );
  }
  const d = {
    4: `M45 ${y} q2.5 3.5 5 0 q2.5 3.5 5 0`,
    3: `M45 ${y} q2.5 3 5 0 q2.5 3 5 0`,
    2: `M46 ${y + 1} h8`,
    1: `M45 ${y + 2} q2.5 -3 5 0 q2.5 -3 5 0`,
  }[mood];
  return <path d={d} fill="none" stroke={INK} strokeWidth="1.9" strokeLinecap="round" />;
};
const Face = ({ fill, rx = 29, ry = 27, cy = 60 }) => (
  <>
    <ellipse cx="50" cy={cy} rx={rx} ry={ry} fill={fill} />
    {/* 반질반질한 하이라이트 */}
    <ellipse cx={50 - rx * 0.38} cy={cy - ry * 0.52} rx={rx * 0.3} ry={ry * 0.16} fill="#fff" opacity=".35"
      transform={`rotate(-28 ${50 - rx * 0.38} ${cy - ry * 0.52})`} />
  </>
);

const ANIMALS = [
  // 0 쥐
  () => (
    <>
      <circle cx="27" cy="36" r="13" fill="#C3C6CF" /><circle cx="27" cy="36" r="7" fill="#F4C6CD" />
      <circle cx="73" cy="36" r="13" fill="#C3C6CF" /><circle cx="73" cy="36" r="7" fill="#F4C6CD" />
      <Face fill="#D2D5DC" />
      <Eyes /><Blush />
      <circle cx="50" cy="63" r="2.6" fill="#F08A9B" />
      <g stroke="#9A9DA8" strokeWidth="1.2" strokeLinecap="round">
        <path d="M30 64 l-10 -2" /><path d="M30 68 l-10 2" /><path d="M70 64 l10 -2" /><path d="M70 68 l10 2" />
      </g>
      <Smile y={67} />
    </>
  ),
  // 1 소
  () => (
    <>
      <path d="M28 38 q-8 -14 -2 -20 q2 10 10 14z" fill="#F5E6C8" />
      <path d="M72 38 q8 -14 2 -20 q-2 10 -10 14z" fill="#F5E6C8" />
      <ellipse cx="20" cy="50" rx="9" ry="5.5" fill="#9C6B47" transform="rotate(-20 20 50)" />
      <ellipse cx="80" cy="50" rx="9" ry="5.5" fill="#9C6B47" transform="rotate(20 80 50)" />
      <Face fill="#B07D57" />
      <ellipse cx="50" cy="70" rx="17" ry="11" fill="#EBCDAE" />
      <Eyes y={53} />
      <circle cx="44" cy="70" r="2" fill="#7A5236" /><circle cx="56" cy="70" r="2" fill="#7A5236" />
      <Blush y={60} gap={20} />
      <Smile y={75} />
    </>
  ),
  // 2 호랑이
  () => (
    <>
      <circle cx="29" cy="36" r="10" fill="#F2A43B" /><circle cx="29" cy="36" r="5" fill="#FFE2B5" />
      <circle cx="71" cy="36" r="10" fill="#F2A43B" /><circle cx="71" cy="36" r="5" fill="#FFE2B5" />
      <Face fill="#F5AE48" />
      <g stroke="#6B4320" strokeWidth="2.6" strokeLinecap="round">
        <path d="M50 35 v7" /><path d="M43 37 l2 5" /><path d="M57 37 l-2 5" />
        <path d="M22 58 h6" /><path d="M23 64 h5" /><path d="M78 58 h-6" /><path d="M77 64 h-5" />
      </g>
      <ellipse cx="50" cy="68" rx="12" ry="8" fill="#FFF3E0" />
      <Eyes /><Blush />
      <path d="M47 63 h6 l-3 3z" fill="#6B4320" />
      <Smile y={68} />
    </>
  ),
  // 3 토끼
  () => (
    <>
      <ellipse cx="38" cy="22" rx="7.5" ry="20" fill="#FFFFFF" stroke="#E2D8CF" strokeWidth="1.5" /><ellipse cx="38" cy="23" rx="3.5" ry="14" fill="#F6C3CB" />
      <ellipse cx="62" cy="22" rx="7.5" ry="20" fill="#FFFFFF" stroke="#E2D8CF" strokeWidth="1.5" /><ellipse cx="62" cy="23" rx="3.5" ry="14" fill="#F6C3CB" />
      <Face fill="#FFFFFF" />
      <ellipse cx="50" cy="60" rx="29" ry="27" fill="none" stroke="#E2D8CF" strokeWidth="1.5" />
      <Eyes /><Blush />
      <path d="M48 63 h4 l-2 2.5z" fill="#F08A9B" />
      <Smile y={67} />
    </>
  ),
  // 4 용
  () => (
    <>
      <path d="M34 38 l-4 -16 l10 12z" fill="#F7D35B" /><path d="M66 38 l4 -16 l-10 12z" fill="#F7D35B" />
      <path d="M42 34 l4 -9 l4 8 l4 -8 l4 9z" fill="#4FA97A" />
      <Face fill="#7DC69D" />
      <ellipse cx="50" cy="69" rx="15" ry="9" fill="#B5E2C6" />
      <circle cx="45" cy="68" r="1.8" fill="#2F7752" /><circle cx="55" cy="68" r="1.8" fill="#2F7752" />
      <Eyes y={55} /><Blush y={62} gap={21} />
      <Smile y={73} />
    </>
  ),
  // 5 뱀
  () => (
    <>
      <Face fill="#9FCB72" rx="30" ry="25" cy="58" />
      <g fill="#7EB255"><circle cx="40" cy="42" r="3" /><circle cx="50" cy="39" r="3" /><circle cx="60" cy="42" r="3" /></g>
      <Eyes y={56} gap={11} /><Blush y={64} gap={19} />
      <path d="M50 70 v7 m0 0 l-3 4 m3 -4 l3 4" stroke="#E8483B" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Smile y={65} />
    </>
  ),
  // 6 말
  () => (
    <>
      <path d="M30 40 l2 -18 l10 14z" fill="#B7743F" /><path d="M70 40 l-2 -18 l-10 14z" fill="#B7743F" />
      <Face fill="#C9864F" rx="27" ry="29" cy="60" />
      <path d="M38 34 q12 -14 24 0 q-4 8 -12 6 q-8 2 -12 -6z" fill="#5C3A20" />
      <ellipse cx="50" cy="72" rx="15" ry="11" fill="#EAC09A" />
      <circle cx="44" cy="72" r="2" fill="#7A4A26" /><circle cx="56" cy="72" r="2" fill="#7A4A26" />
      <Eyes y={54} /><Blush y={61} gap={19} />
      <Smile y={77} />
    </>
  ),
  // 7 양
  () => (
    <>
      <circle cx="22" cy="56" r="8" fill="none" stroke="#C9A779" strokeWidth="5" />
      <circle cx="78" cy="56" r="8" fill="none" stroke="#C9A779" strokeWidth="5" />
      <Face fill="#F7EBDB" rx="25" ry="25" cy="61" />
      <g fill="#FFFFFF" stroke="#E7DCCB" strokeWidth="1.5">
        <circle cx="34" cy="40" r="9" /><circle cx="46" cy="34" r="10" /><circle cx="58" cy="35" r="10" /><circle cx="68" cy="42" r="8" />
      </g>
      <Eyes y={59} gap={9} /><Blush y={67} gap={15} />
      <Smile y={68} />
    </>
  ),
  // 8 원숭이
  () => (
    <>
      <circle cx="21" cy="57" r="9" fill="#A8724A" /><circle cx="21" cy="57" r="5" fill="#F1C9A0" />
      <circle cx="79" cy="57" r="9" fill="#A8724A" /><circle cx="79" cy="57" r="5" fill="#F1C9A0" />
      <Face fill="#A8724A" rx="27" ry="27" />
      <path d="M50 46 q-6 -8 -14 -2 q-6 6 -2 16 q4 12 16 14 q12 -2 16 -14 q4 -10 -2 -16 q-8 -6 -14 2z" fill="#F1C9A0" />
      <Eyes y={56} gap={8} /><Blush y={64} gap={13} />
      <Smile y={67} />
    </>
  ),
  // 9 닭
  () => (
    <>
      <g fill="#E8483B"><circle cx="42" cy="32" r="7" /><circle cx="50" cy="27" r="8" /><circle cx="58" cy="32" r="7" /></g>
      <Face fill="#FFFDF8" />
      <Eyes y={56} /><Blush y={64} />
      <path d="M45 62 h10 l-5 7z" fill="#F7B733" />
      <ellipse cx="50" cy="74" rx="3.5" ry="4.5" fill="#E8483B" />
    </>
  ),
  // 10 개
  () => (
    <>
      <Face fill="#E6B47E" />
      <ellipse cx="23" cy="52" rx="8" ry="16" fill="#A86F3E" transform="rotate(18 23 52)" />
      <ellipse cx="77" cy="52" rx="8" ry="16" fill="#A86F3E" transform="rotate(-18 77 52)" />
      <ellipse cx="50" cy="68" rx="13" ry="9" fill="#FFF4E6" />
      <ellipse cx="50" cy="63" rx="4" ry="3" fill={INK} />
      <Eyes y={54} /><Blush y={63} gap={19} />
      <Smile y={68} />
    </>
  ),
  // 11 돼지
  () => (
    <>
      <path d="M26 42 l2 -16 l12 12z" fill="#F4A6B2" /><path d="M74 42 l-2 -16 l-12 12z" fill="#F4A6B2" />
      <Face fill="#F9C2CA" />
      <ellipse cx="50" cy="67" rx="11" ry="8" fill="#F290A2" />
      <ellipse cx="46" cy="67" rx="2" ry="3" fill="#B85466" /><ellipse cx="54" cy="67" rx="2" ry="3" fill="#B85466" />
      <Eyes y={55} gap={12} /><Blush y={62} gap={21} />
      <Smile y={78} />
    </>
  ),
];

export default function ZodiacAvatar({ branch, stem = 0, size = 48, mood = 3, className = '', title }) {
  const Draw = ANIMALS[branch];
  const id = useId().replace(/:/g, '');
  const [bgLight, bgDark] = BG[stem];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label={title}>
      <defs>
        <radialGradient id={`${id}bg`} cx="35%" cy="28%" r="80%">
          <stop offset="0" stopColor={bgLight} />
          <stop offset="1" stopColor={bgDark} />
        </radialGradient>
        <radialGradient id={`${id}sh`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#000" stopOpacity=".28" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        {/* 클레이 3D: 실루엣을 부풀려 왼쪽 위에서 빛을 비추고, 오른쪽 아래 가장자리에 그늘 */}
        <filter id={`${id}clay`} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
          <feDiffuseLighting in="blur" surfaceScale="6" diffuseConstant="1" lightingColor="#ffffff" result="diff">
            <feDistantLight azimuth="225" elevation="45" />
          </feDiffuseLighting>
          <feComposite in="SourceGraphic" in2="diff" operator="arithmetic" k1="0.75" k2="0.5" k3="0" k4="0" result="lit" />
          <feComposite in="lit" in2="SourceAlpha" operator="in" result="litIn" />
          <feMerge>
            <feMergeNode in="litIn" />
          </feMerge>
        </filter>
        <clipPath id={`${id}clip`}><circle cx="50" cy="50" r="50" /></clipPath>
      </defs>
      <g clipPath={`url(#${id}clip)`}>
        <circle cx="50" cy="50" r="50" fill={`url(#${id}bg)`} />
        <ellipse cx="52" cy="90" rx="30" ry="7" fill={`url(#${id}sh)`} />
        <Mood.Provider value={mood}>
          <g filter={`url(#${id}clay)`}>
            <Draw />
          </g>
        </Mood.Provider>
        {mood === 1 && (
          // 식은땀
          <path d="M80 30 q-5 8 0 11 q5 -3 0 -11z" fill="#8CC8F2" stroke="#5CA8DE" strokeWidth="1" />
        )}
        {mood === 5 && (
          <g fill="#FFC531">
            <path d="M14 22 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
            <path d="M84 16 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z" />
          </g>
        )}
      </g>
    </svg>
  );
}
