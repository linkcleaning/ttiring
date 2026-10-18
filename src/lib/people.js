// 여러 사람(나 + 가족·친구·지인)의 사주를 저장하고 바꿔 가며 보기
import { ANIMALS, natalChart } from './saju.js';
import { STEM_COLOR } from './fortune.js';

export const RELATIONS = ['가족', '연인', '친구', '직장', '기타'];

export const newId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** 예전 버전(한 사람만 저장)에서 넘어온 자료를 목록 형태로 바꿔요 */
export function migrateProfile(old) {
  if (!old) return [];
  return [{ ...old, id: 'me', relation: '나' }];
}

/** 띠 계산 (실패해도 앱이 멈추지 않게) */
export function personYear(p) {
  try {
    return natalChart(p).pillars.year;
  } catch {
    return { stem: 0, branch: 0 };
  }
}

export const personLabel = (p) => p.name?.trim() || `${STEM_COLOR[personYear(p).stem]} ${ANIMALS[personYear(p).branch]}띠`;

export const birthLabel = (p) => {
  const pad = (n) => String(n).padStart(2, '0');
  const cal = p.calendar === 'lunar' ? `음력${p.leap ? ' 윤달' : ''}` : '양력';
  return `${p.year}.${pad(p.month)}.${pad(p.day)} (${cal})`;
};
