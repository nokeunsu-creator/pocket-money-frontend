// "AI 바둑" 전용 강화 등급 매핑.
// 기존 badukRank.js의 39단계(30급~9단) 구조는 그대로 유지하되,
// 같은 라벨에서 실제 강도가 명확히 높도록 보정한다.
//
// 제약: 사용자 요청으로 한 수당 생각 시간은 3초 이하 유지 (모바일 체감 속도 우선).
// 시간이 묶여 있으므로 강도 향상은 아래 레버로 달성:
//   1) candidateLimit ↑ (기존 10~12 → 14~18) — 같은 시간에 더 넓게 탐색
//   2) maxDepth ↑ (기존 5~11 → 6~13, 9x9 기준) — 수읽기 깊이
//   3) 4~1급도 lookahead(수읽기) 티어로 승격 (기존엔 'advanced' 휴리스틱만)
//   4) 5급 이하 휴리스틱 티어는 mistakeRate가 이미 강함 — 그대로 유지

import {
  RANK_COUNT,
  getRank,
  getKyuRanks,
  getDanRanks,
  rankFromTypeValue,
} from './badukRank.js'

export { RANK_COUNT, getRank, getKyuRanks, getDanRanks, rankFromTypeValue }

// 티어 매핑 (강화판: 4~1급도 lookahead1로 승격)
const TIER_RANGES_STRONG = [
  { tier: 'random',     min: 0,  max: 9  }, // 30~21급
  { tier: 'capture',    min: 10, max: 17 }, // 20~13급
  { tier: 'territory',  min: 18, max: 23 }, // 12~7급
  { tier: 'advanced',   min: 24, max: 25 }, // 6~5급
  { tier: 'lookahead1', min: 26, max: 32 }, // 4급~3단
  { tier: 'lookahead2', min: 33, max: 35 }, // 4~6단
  { tier: 'deep',       min: 36, max: 38 }, // 7~9단
]

// 단(段) + 강한 급(4~1급) 탐색 옵션 (강화판)
// 시간 예산 캡: 3000ms 미만 (사용자 요청)
// 강도 보강은 candidateLimit 확대로 달성
const SEARCH_OPTIONS_STRONG = {
  9: {
    // 4~1급 (lookahead1) — 기존엔 휴리스틱이라 약했음. 이제 진짜 수읽기.
    26: { maxDepth: 4,  candidateLimit: 13, timeBudgetMs: 1200, useMcts: false }, // 4급
    27: { maxDepth: 5,  candidateLimit: 13, timeBudgetMs: 1400, useMcts: false }, // 3급
    28: { maxDepth: 5,  candidateLimit: 14, timeBudgetMs: 1600, useMcts: false }, // 2급
    29: { maxDepth: 6,  candidateLimit: 14, timeBudgetMs: 1800, useMcts: false }, // 1급
    // 단(段)
    30: { maxDepth: 7,  candidateLimit: 15, timeBudgetMs: 2000, useMcts: true  }, // 1단
    31: { maxDepth: 8,  candidateLimit: 15, timeBudgetMs: 2200, useMcts: true  }, // 2단
    32: { maxDepth: 9,  candidateLimit: 15, timeBudgetMs: 2400, useMcts: true  }, // 3단
    33: { maxDepth: 9,  candidateLimit: 16, timeBudgetMs: 2500, useMcts: true  }, // 4단
    34: { maxDepth: 10, candidateLimit: 16, timeBudgetMs: 2700, useMcts: true  }, // 5단
    35: { maxDepth: 10, candidateLimit: 17, timeBudgetMs: 2800, useMcts: true  }, // 6단
    36: { maxDepth: 11, candidateLimit: 17, timeBudgetMs: 2900, useMcts: true  }, // 7단
    37: { maxDepth: 12, candidateLimit: 18, timeBudgetMs: 2950, useMcts: true  }, // 8단
    38: { maxDepth: 13, candidateLimit: 18, timeBudgetMs: 2950, useMcts: true  }, // 9단
  },
  13: {
    26: { maxDepth: 3,  candidateLimit: 13, timeBudgetMs: 1200, useMcts: false },
    27: { maxDepth: 4,  candidateLimit: 13, timeBudgetMs: 1400, useMcts: false },
    28: { maxDepth: 4,  candidateLimit: 14, timeBudgetMs: 1600, useMcts: false },
    29: { maxDepth: 5,  candidateLimit: 14, timeBudgetMs: 1800, useMcts: false },
    30: { maxDepth: 5,  candidateLimit: 15, timeBudgetMs: 2000, useMcts: true  },
    31: { maxDepth: 6,  candidateLimit: 15, timeBudgetMs: 2200, useMcts: true  },
    32: { maxDepth: 7,  candidateLimit: 15, timeBudgetMs: 2400, useMcts: true  },
    33: { maxDepth: 7,  candidateLimit: 16, timeBudgetMs: 2500, useMcts: true  },
    34: { maxDepth: 8,  candidateLimit: 16, timeBudgetMs: 2700, useMcts: true  },
    35: { maxDepth: 8,  candidateLimit: 17, timeBudgetMs: 2800, useMcts: true  },
    36: { maxDepth: 9,  candidateLimit: 17, timeBudgetMs: 2900, useMcts: true  },
    37: { maxDepth: 9,  candidateLimit: 18, timeBudgetMs: 2950, useMcts: true  },
    38: { maxDepth: 10, candidateLimit: 18, timeBudgetMs: 2950, useMcts: true  },
  },
  19: {
    26: { maxDepth: 3,  candidateLimit: 13, timeBudgetMs: 1200, useMcts: false },
    27: { maxDepth: 3,  candidateLimit: 13, timeBudgetMs: 1400, useMcts: false },
    28: { maxDepth: 3,  candidateLimit: 14, timeBudgetMs: 1600, useMcts: false },
    29: { maxDepth: 4,  candidateLimit: 14, timeBudgetMs: 1800, useMcts: false },
    30: { maxDepth: 4,  candidateLimit: 15, timeBudgetMs: 2000, useMcts: true  },
    31: { maxDepth: 5,  candidateLimit: 15, timeBudgetMs: 2200, useMcts: true  },
    32: { maxDepth: 5,  candidateLimit: 15, timeBudgetMs: 2400, useMcts: true  },
    33: { maxDepth: 6,  candidateLimit: 16, timeBudgetMs: 2500, useMcts: true  },
    34: { maxDepth: 6,  candidateLimit: 16, timeBudgetMs: 2700, useMcts: true  },
    35: { maxDepth: 7,  candidateLimit: 17, timeBudgetMs: 2800, useMcts: true  },
    36: { maxDepth: 7,  candidateLimit: 17, timeBudgetMs: 2900, useMcts: true  },
    37: { maxDepth: 8,  candidateLimit: 18, timeBudgetMs: 2950, useMcts: true  },
    38: { maxDepth: 8,  candidateLimit: 18, timeBudgetMs: 2950, useMcts: true  },
  },
}

export function rankToStrategyStrong(strength, boardSize) {
  const s = clamp(strength, 0, RANK_COUNT - 1)
  const range = TIER_RANGES_STRONG.find(r => s >= r.min && s <= r.max)
  const sub = range.min === range.max ? 1 : (s - range.min) / (range.max - range.min)
  const strategy = { tier: range.tier, subLevel: sub, strength: s }
  if (s >= 26) {
    const sizeKey = boardSize && SEARCH_OPTIONS_STRONG[boardSize] ? boardSize : 9
    const opts = SEARCH_OPTIONS_STRONG[sizeKey][s]
    if (opts) strategy.search = opts
  }
  return strategy
}

const TIER_DESC_STRONG = {
  random:     '아무 데나 두는 입문 단계',
  capture:    '돌 잡기와 살리기 위주',
  territory:  '집(영토)을 신경 쓰기 시작',
  advanced:   '연결과 모양을 고려',
  lookahead1: '수읽기 — 신중하게 둠',
  lookahead2: '깊은 수읽기 + 정석',
  deep:       '정석과 깊은 수읽기 (최강)',
}

export function getRankDescriptionStrong(strength) {
  const strategy = rankToStrategyStrong(strength)
  return TIER_DESC_STRONG[strategy.tier]
}

// 핸디캡 없음(접바둑 0점) — 강도로 등급 차이를 표현
export function getHandicapStrong() { return 0 }
export function getHandicapStonesStrong() { return [] }
export function getKomiStrong() { return 6.5 }

// 시각화: 강화판은 색조를 조금 더 진하게
export function getRankColorStrong(strength) {
  const s = clamp(strength, 0, RANK_COUNT - 1)
  const t = s / (RANK_COUNT - 1)
  const hue = 100 + (290 - 100) * t
  const sat = 65 + 10 * t
  const light = 45 - 8 * t
  return `hsl(${hue}, ${sat}%, ${light}%)`
}

// AI 표시용 짧은 delay (실 계산은 worker budget 내에서 처리)
export function getAiDelayStrong(strength) {
  const strategy = rankToStrategyStrong(strength)
  if (strategy.tier === 'random') return 200
  if (strategy.tier === 'capture') return 300
  if (strategy.tier === 'territory') return 350
  if (strategy.tier === 'advanced') return 400
  return 400 // lookahead 이상은 worker budget이 주된 시간
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}
