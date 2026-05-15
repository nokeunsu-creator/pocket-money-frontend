// 바둑 등급 시스템 (30급 ~ 1급 + 1단 ~ 9단, 총 39단계)
// strength: 0(최약, 30급) ~ 38(최강, 9단) 정수
// 내부 비교/저장은 strength로, 표시는 label로 한다.

export const RANK_COUNT = 39

// strength → 등급 객체
export function getRank(strength) {
  const s = clamp(strength, 0, RANK_COUNT - 1)
  if (s < 30) {
    // 0 → 30급, 29 → 1급
    const kyu = 30 - s
    return { strength: s, type: 'kyu', value: kyu, label: `${kyu}급` }
  }
  // 30 → 1단, 38 → 9단
  const dan = s - 29
  return { strength: s, type: 'dan', value: dan, label: `${dan}단` }
}

// type+value → strength
export function rankFromTypeValue(type, value) {
  if (type === 'kyu') return 30 - value
  return 29 + value
}

// 전체 등급 목록 (약 → 강)
export function getAllRanks() {
  return Array.from({ length: RANK_COUNT }, (_, i) => getRank(i))
}

// 급/단으로 분리된 목록
export function getKyuRanks() {
  // 30급(가장 약함) → 1급 순서
  return Array.from({ length: 30 }, (_, i) => getRank(i))
}

export function getDanRanks() {
  // 1단 → 9단 순서
  return Array.from({ length: 9 }, (_, i) => getRank(30 + i))
}

// ============================================================
// 전략 매핑 (티어 + 서브 레벨)
// ============================================================
// tier: AI 전략 종류 ('random' | 'capture' | 'territory' | 'advanced'
//                    | 'lookahead1' | 'lookahead2' | 'deep')
// subLevel: 0~1 사이 (0=티어 안에서 가장 약함, 1=가장 강함)
//   - random/capture 티어에서는 mistakeRate 조정
//   - 그 외 티어에서는 후보 풀 크기 조정

const TIER_RANGES = [
  { tier: 'random',     min: 0,  max: 9  }, // 30~21급 (10)
  { tier: 'capture',    min: 10, max: 17 }, // 20~13급 (8)
  { tier: 'territory',  min: 18, max: 23 }, // 12~7급 (6)
  { tier: 'advanced',   min: 24, max: 29 }, // 6~1급 (6)
  { tier: 'lookahead1', min: 30, max: 32 }, // 1~3단 (3)
  { tier: 'lookahead2', min: 33, max: 35 }, // 4~6단 (3)
  { tier: 'deep',       min: 36, max: 38 }, // 7~9단 (3)
]

// 단 등급 탐색 옵션 테이블 (보드 크기별로 비슷한 체감 되도록)
// strength → { maxDepth, candidateLimit, timeBudgetMs }
// 9x9는 단순하므로 같은 깊이로도 강함, 19x19는 후보 많이/깊이 얕게
// candidate는 8~12로 유지 (분기 폭발 방지), 강도는 depth와 budget으로 차별화
// 단 등급 강화 (2026-05-15): 실제 사람 1단은 25급을 압도해야 함.
// 1단도 충분히 깊이 보도록 4초+로 상향. 9단은 최대 10초.
// MCTS는 budget >= 2000ms에서만 활성 (badukEngine.js 게이트).
const SEARCH_OPTIONS = {
  9: {
    30: { maxDepth: 5, candidateLimit: 12, timeBudgetMs: 4000 },   // 1단
    31: { maxDepth: 6, candidateLimit: 12, timeBudgetMs: 5000 },   // 2단
    32: { maxDepth: 6, candidateLimit: 14, timeBudgetMs: 6000 },   // 3단
    33: { maxDepth: 7, candidateLimit: 12, timeBudgetMs: 7000 },   // 4단
    34: { maxDepth: 7, candidateLimit: 14, timeBudgetMs: 8000 },   // 5단
    35: { maxDepth: 8, candidateLimit: 12, timeBudgetMs: 9000 },   // 6단
    36: { maxDepth: 8, candidateLimit: 14, timeBudgetMs: 10000, useMcts: true },  // 7단
    37: { maxDepth: 9, candidateLimit: 14, timeBudgetMs: 10000, useMcts: true },  // 8단
    38: { maxDepth: 10, candidateLimit: 16, timeBudgetMs: 10000, useMcts: true }, // 9단
  },
  13: {
    30: { maxDepth: 4, candidateLimit: 12, timeBudgetMs: 4000 },
    31: { maxDepth: 5, candidateLimit: 12, timeBudgetMs: 5000 },
    32: { maxDepth: 5, candidateLimit: 14, timeBudgetMs: 6000 },
    33: { maxDepth: 6, candidateLimit: 12, timeBudgetMs: 7000 },
    34: { maxDepth: 6, candidateLimit: 14, timeBudgetMs: 8000 },
    35: { maxDepth: 7, candidateLimit: 12, timeBudgetMs: 9000 },
    36: { maxDepth: 7, candidateLimit: 14, timeBudgetMs: 10000, useMcts: true },
    37: { maxDepth: 8, candidateLimit: 14, timeBudgetMs: 10000, useMcts: true },
    38: { maxDepth: 8, candidateLimit: 16, timeBudgetMs: 10000, useMcts: true },
  },
  19: {
    30: { maxDepth: 3, candidateLimit: 14, timeBudgetMs: 4000 },
    31: { maxDepth: 4, candidateLimit: 12, timeBudgetMs: 5000 },
    32: { maxDepth: 4, candidateLimit: 14, timeBudgetMs: 6000 },
    33: { maxDepth: 5, candidateLimit: 14, timeBudgetMs: 7000 },
    34: { maxDepth: 5, candidateLimit: 14, timeBudgetMs: 8000 },
    35: { maxDepth: 6, candidateLimit: 14, timeBudgetMs: 9000 },
    36: { maxDepth: 6, candidateLimit: 14, timeBudgetMs: 10000, useMcts: true },
    37: { maxDepth: 7, candidateLimit: 14, timeBudgetMs: 10000, useMcts: true },
    38: { maxDepth: 7, candidateLimit: 16, timeBudgetMs: 10000, useMcts: true },
  },
}

export function rankToStrategy(strength, boardSize) {
  const s = clamp(strength, 0, RANK_COUNT - 1)
  const range = TIER_RANGES.find(r => s >= r.min && s <= r.max)
  const sub = range.min === range.max ? 1 : (s - range.min) / (range.max - range.min)
  const strategy = { tier: range.tier, subLevel: sub, strength: s }
  // 단(段) 등급은 알파베타 탐색 사용. boardSize 미지정 시 9x9 기본 적용.
  if (s >= 30) {
    const sizeKey = boardSize && SEARCH_OPTIONS[boardSize] ? boardSize : 9
    const opts = SEARCH_OPTIONS[sizeKey][s]
    if (opts) strategy.search = opts
  }
  return strategy
}

// 티어별 사람이 읽을 수 있는 설명
const TIER_DESC = {
  random:     '아무 데나 두는 입문 단계',
  capture:    '돌 잡기와 살리기 위주',
  territory:  '집(영토)을 신경 쓰기 시작',
  advanced:   '연결과 모양을 고려',
  lookahead1: '한 수 앞을 내다봄',
  lookahead2: '두 수 앞을 내다봄',
  deep:       '정석과 깊은 수읽기',
}

export function getRankDescription(strength) {
  const strategy = rankToStrategy(strength)
  const handicap9 = getHandicap(strength, 9)
  const handicap19 = getHandicap(strength, 19)
  const base = TIER_DESC[strategy.tier]
  if (handicap19 > 0 || handicap9 > 0) {
    const h = handicap19 > 0 ? handicap19 : handicap9
    return `${base} · 접바둑 ${h}점 받음`
  }
  return base
}

// ============================================================
// 핸디캡(접바둑)
// ============================================================
// strength가 클수록(AI가 강할수록) 플레이어(흑)가 받는 미리 놓은 돌 수가 늘어남.

// strength → 기본 핸디캡 수 (보드 크기 제한 적용 전)
const HANDICAP_TABLE = (() => {
  const t = new Array(RANK_COUNT).fill(0)
  // 1단(30)~9단(38)
  t[30] = 2; t[31] = 2; t[32] = 3; t[33] = 3
  t[34] = 4; t[35] = 5; t[36] = 6; t[37] = 7
  t[38] = 9
  return t
})()

const MAX_HANDICAP_BY_SIZE = { 9: 5, 13: 9, 19: 9 }

export function getHandicap(strength, boardSize) {
  const s = clamp(strength, 0, RANK_COUNT - 1)
  const max = MAX_HANDICAP_BY_SIZE[boardSize] ?? 9
  return Math.min(HANDICAP_TABLE[s], max)
}

// 핸디캡 돌이 놓일 좌표 목록 (보드 크기별, 1~9점 순서)
// 표준 순서: 우상 → 좌하 → 좌상 → 우하 → 천원 → 좌중 → 우중 → 상중 → 하중
const HANDICAP_ORDER = {
  9: [
    [2, 6], [6, 2], [2, 2], [6, 6], [4, 4],
  ],
  13: [
    [3, 9], [9, 3], [3, 3], [9, 9], [6, 6],
    [6, 3], [6, 9], [3, 6], [9, 6],
  ],
  19: [
    [3, 15], [15, 3], [3, 3], [15, 15], [9, 9],
    [9, 3], [9, 15], [3, 9], [15, 9],
  ],
}

export function getHandicapStones(strength, boardSize) {
  const n = getHandicap(strength, boardSize)
  const order = HANDICAP_ORDER[boardSize] || []
  return order.slice(0, n)
}

// 핸디캡이 있을 때 백 덤은 줄임 (관행: 0.5)
export function getKomi(strength, boardSize) {
  return getHandicap(strength, boardSize) > 0 ? 0.5 : 6.5
}

// ============================================================
// 시각화 헬퍼
// ============================================================

// 무지개 그라데이션: 약함(연두) → 강함(진보라)
export function getRankColor(strength) {
  const s = clamp(strength, 0, RANK_COUNT - 1)
  // hue: 100(green) → 280(purple)
  const t = s / (RANK_COUNT - 1)
  const hue = 100 + (280 - 100) * t
  const sat = 60 + 10 * t
  const light = 50 - 10 * t
  return `hsl(${hue}, ${sat}%, ${light}%)`
}

// AI 생각 시간 (ms) - 단(段) 등급은 자체 timeBudgetMs가 추가로 더해진다
export function getAiDelay(strength) {
  const strategy = rankToStrategy(strength)
  if (strategy.tier === 'random') return 250
  if (strategy.tier === 'capture') return 350
  if (strategy.tier === 'territory') return 450
  if (strategy.tier === 'advanced') return 550
  if (strategy.tier === 'lookahead1') return 700
  if (strategy.tier === 'lookahead2') return 900
  return 1100 // deep
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}
