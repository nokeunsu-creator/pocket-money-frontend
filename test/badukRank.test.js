// badukRank.js 단위 테스트 — node frontend/test/badukRank.test.js
import assert from 'node:assert/strict'
import {
  RANK_COUNT,
  getRank,
  rankFromTypeValue,
  getAllRanks,
  getKyuRanks,
  getDanRanks,
  rankToStrategy,
  getRankDescription,
  getHandicap,
  getHandicapStones,
  getKomi,
  getRankColor,
  getAiDelay,
} from '../src/utils/badukRank.js'

let passed = 0
let failed = 0
const fail = []

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    fail.push({ name, error: e.message })
    console.log(`  ✗ ${name}\n    ${e.message}`)
  }
}

function section(title) {
  console.log(`\n[${title}]`)
}

// =========================================
section('등급 개수 및 라벨')
// =========================================

test('RANK_COUNT === 40 (급 30 + 단 9 + 최강 1)', () => {
  assert.equal(RANK_COUNT, 40)
})

test('전체 등급 40개 반환', () => {
  assert.equal(getAllRanks().length, 40)
})

test('급은 30개, 단은 9개', () => {
  assert.equal(getKyuRanks().length, 30)
  assert.equal(getDanRanks().length, 9)
})

test('strength 0 → 30급', () => {
  const r = getRank(0)
  assert.equal(r.type, 'kyu')
  assert.equal(r.value, 30)
  assert.equal(r.label, '30급')
})

test('strength 29 → 1급', () => {
  const r = getRank(29)
  assert.equal(r.type, 'kyu')
  assert.equal(r.value, 1)
  assert.equal(r.label, '1급')
})

test('strength 30 → 1단', () => {
  const r = getRank(30)
  assert.equal(r.type, 'dan')
  assert.equal(r.value, 1)
  assert.equal(r.label, '1단')
})

test('strength 38 → 9단', () => {
  const r = getRank(38)
  assert.equal(r.type, 'dan')
  assert.equal(r.value, 9)
  assert.equal(r.label, '9단')
})

test('rankFromTypeValue 라운드트립', () => {
  for (let i = 0; i < RANK_COUNT; i++) {
    const r = getRank(i)
    assert.equal(rankFromTypeValue(r.type, r.value), i, `strength ${i}`)
  }
})

test('모든 라벨 고유', () => {
  const labels = new Set(getAllRanks().map(r => r.label))
  assert.equal(labels.size, 40)
})

// =========================================
section('전략 매핑')
// =========================================

test('각 strength에 정확히 하나의 티어 매핑', () => {
  const seen = new Set()
  for (let i = 0; i < RANK_COUNT; i++) {
    const s = rankToStrategy(i)
    assert.ok(s.tier, `strength ${i} no tier`)
    seen.add(s.tier)
  }
  assert.equal(seen.size, 8, '티어가 8개여야 함 (random, capture, territory, advanced, lookahead1, lookahead2, deep, master)')
})

test('티어 경계: 30~21급 → random', () => {
  for (let s = 0; s <= 9; s++) {
    assert.equal(rankToStrategy(s).tier, 'random', `strength ${s}`)
  }
})

test('티어 경계: 20~13급 → capture', () => {
  for (let s = 10; s <= 17; s++) {
    assert.equal(rankToStrategy(s).tier, 'capture', `strength ${s}`)
  }
})

test('티어 경계: 12~7급 → territory', () => {
  for (let s = 18; s <= 23; s++) {
    assert.equal(rankToStrategy(s).tier, 'territory', `strength ${s}`)
  }
})

test('티어 경계: 6~1급 → advanced', () => {
  for (let s = 24; s <= 29; s++) {
    assert.equal(rankToStrategy(s).tier, 'advanced', `strength ${s}`)
  }
})

test('티어 경계: 1~3단 → lookahead1', () => {
  for (let s = 30; s <= 32; s++) {
    assert.equal(rankToStrategy(s).tier, 'lookahead1', `strength ${s}`)
  }
})

test('티어 경계: 4~6단 → lookahead2', () => {
  for (let s = 33; s <= 35; s++) {
    assert.equal(rankToStrategy(s).tier, 'lookahead2', `strength ${s}`)
  }
})

test('티어 경계: 7~9단 → deep', () => {
  for (let s = 36; s <= 38; s++) {
    assert.equal(rankToStrategy(s).tier, 'deep', `strength ${s}`)
  }
})

test('subLevel은 0~1 범위', () => {
  for (let i = 0; i < RANK_COUNT; i++) {
    const s = rankToStrategy(i)
    assert.ok(s.subLevel >= 0 && s.subLevel <= 1, `strength ${i}: subLevel ${s.subLevel}`)
  }
})

test('티어 안에서 subLevel은 단조 증가', () => {
  // 각 티어 안에서 strength가 늘면 subLevel도 증가(또는 같음)
  let prevTier = null
  let prevSub = -1
  for (let i = 0; i < RANK_COUNT; i++) {
    const s = rankToStrategy(i)
    if (s.tier !== prevTier) {
      prevTier = s.tier
      prevSub = s.subLevel
      continue
    }
    assert.ok(s.subLevel >= prevSub, `${i}: ${s.subLevel} < ${prevSub}`)
    prevSub = s.subLevel
  }
})

// =========================================
section('핸디캡(접바둑)')
// =========================================

test('급(strength 0~27)에서는 핸디캡 0', () => {
  for (let s = 0; s <= 27; s++) {
    for (const sz of [9, 13, 19]) {
      assert.equal(getHandicap(s, sz), 0, `strength ${s}, size ${sz}`)
    }
  }
})

test('1~2급은 약자라 핸디캡 없음', () => {
  // 28(2급), 29(1급)도 핸디캡 0
  assert.equal(getHandicap(28, 19), 0)
  assert.equal(getHandicap(29, 19), 0)
})

test('핸디캡 제거: 모든 등급 핸디캡 0', () => {
  // 2026-05-16: 사용자 요청으로 단(段)도 핸디캡 제거
  for (let s = 0; s < RANK_COUNT; s++) {
    for (const sz of [9, 13, 19]) {
      assert.equal(getHandicap(s, sz), 0, `strength ${s}, size ${sz}`)
    }
  }
})

test('strength가 클수록 핸디캡은 비감소 (19x19)', () => {
  let prev = -1
  for (let s = 0; s < RANK_COUNT; s++) {
    const h = getHandicap(s, 19)
    assert.ok(h >= prev, `strength ${s}: handicap ${h} < prev ${prev}`)
    prev = h
  }
})

test('9x9 핸디캡은 최대 5점', () => {
  for (let s = 0; s < RANK_COUNT; s++) {
    assert.ok(getHandicap(s, 9) <= 5, `strength ${s}`)
  }
})

test('13x13/19x19 핸디캡은 최대 9점', () => {
  for (let s = 0; s < RANK_COUNT; s++) {
    assert.ok(getHandicap(s, 13) <= 9)
    assert.ok(getHandicap(s, 19) <= 9)
  }
})

test('9단(38)도 핸디캡 0 (핸디캡 제거)', () => {
  assert.equal(getHandicap(38, 9), 0)
  assert.equal(getHandicap(38, 19), 0)
})

test('핸디캡 좌표는 모두 보드 안', () => {
  for (let s = 0; s < RANK_COUNT; s++) {
    for (const sz of [9, 13, 19]) {
      const stones = getHandicapStones(s, sz)
      for (const [r, c] of stones) {
        assert.ok(r >= 0 && r < sz && c >= 0 && c < sz, `strength ${s}, size ${sz}, stone (${r},${c})`)
      }
      // 중복 좌표 없음
      const set = new Set(stones.map(([r, c]) => `${r},${c}`))
      assert.equal(set.size, stones.length, `중복 좌표: strength ${s}, size ${sz}`)
    }
  }
})

test('핸디캡 좌표 개수는 getHandicap()와 일치', () => {
  for (let s = 0; s < RANK_COUNT; s++) {
    for (const sz of [9, 13, 19]) {
      assert.equal(getHandicapStones(s, sz).length, getHandicap(s, sz),
        `strength ${s}, size ${sz}`)
    }
  }
})

test('komi: 모든 등급 핸디캡 0 → komi 6.5', () => {
  // 2026-05-16: 핸디캡 제거 — 모든 등급(급+단) 핸디캡 0이므로 komi 6.5
  for (let s = 0; s < RANK_COUNT; s++) {
    assert.equal(getKomi(s, 19), 6.5, `strength ${s}, 19`)
    assert.equal(getKomi(s, 9), 6.5, `strength ${s}, 9`)
  }
})

// =========================================
section('시각화 헬퍼')
// =========================================

test('getRankColor: 모든 등급에서 hsl 형식 반환', () => {
  for (let s = 0; s < RANK_COUNT; s++) {
    const c = getRankColor(s)
    assert.match(c, /^hsl\(/, `strength ${s}: ${c}`)
  }
})

test('getRankColor: 40개 색상이 모두 다름', () => {
  const colors = new Set()
  for (let s = 0; s < RANK_COUNT; s++) colors.add(getRankColor(s))
  assert.equal(colors.size, 40)
})

test('getAiDelay: 강한 등급일수록 사고시간이 길다', () => {
  let prev = 0
  for (let s = 0; s < RANK_COUNT; s++) {
    const d = getAiDelay(s)
    assert.ok(d >= prev, `strength ${s}: delay ${d} < prev ${prev}`)
    prev = d
  }
})

test('getRankDescription: 빈 문자열 아님', () => {
  for (let s = 0; s < RANK_COUNT; s++) {
    const d = getRankDescription(s)
    assert.ok(d.length > 0, `strength ${s}`)
  }
})

test('getRankDescription: 단(段) 등급도 접바둑 없음 (핸디캡 제거)', () => {
  // 2026-05-16: 핸디캡 제거로 단 등급에도 "접바둑" 문구 없음
  for (let s = 30; s <= 38; s++) {
    const d = getRankDescription(s)
    assert.ok(!/접바둑/.test(d), `strength ${s}: 접바둑 문구가 남아있음: ${d}`)
  }
})

// =========================================
console.log(`\n결과: ${passed} 통과, ${failed} 실패`)
if (failed > 0) {
  console.log('\n실패한 테스트:')
  fail.forEach(f => console.log(`  - ${f.name}: ${f.error}`))
  process.exit(1)
}
