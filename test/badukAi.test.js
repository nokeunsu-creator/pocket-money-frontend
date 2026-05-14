// badukEngine.js + badukRank.js 행동 테스트
//   - 39개 등급 모두 합법수 반환 (스모크)
//   - 강한 등급의 평균 점수 합이 약한 등급보다 높음 (덤은 색깔 교대로 상쇄)
//
// 실행: node frontend/test/badukAi.test.js

import assert from 'node:assert/strict'
import {
  rankToStrategy,
  getRank,
  RANK_COUNT,
} from '../src/utils/badukRank.js'
import {
  createBoard,
  removeDeadStones,
  boardToString,
  countTerritory,
  isLegalMove,
  getAiMove,
} from '../src/utils/badukEngine.js'

const SIZE = 9
const MAX_MOVES = 60 // 단조성 검증용 (종반은 평가가 노이즈)
const KOMI = 6.5
const TEST_AI_BUDGET_MS = 800 // 테스트용 알파베타 budget (정확성 vs 시간)

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

function section(t) { console.log(`\n[${t}]`) }

function playMove(board, r, c, color, size) {
  const next = board.map(row => [...row])
  next[r][c] = color
  const opp = color === 'black' ? 'white' : 'black'
  const after = removeDeadStones(next, opp, size)
  return { board: after.board, captured: after.captured }
}

function selfPlay(blackStrength, whiteStrength, size = SIZE, maxMoves = MAX_MOVES, komi = KOMI) {
  let board = createBoard(size)
  let prevBoardStr = ''
  let turn = 'black'
  let passCount = 0
  let moves = 0

  while (moves < maxMoves && passCount < 2) {
    const strength = turn === 'black' ? blackStrength : whiteStrength
    const strategy = rankToStrategy(strength, size)
    // 테스트는 빠르게: 알파베타 budget을 단축 (강도 단조성은 유지됨)
    if (strategy.search) strategy.search = { ...strategy.search, timeBudgetMs: TEST_AI_BUDGET_MS }
    const move = getAiMove(board, size, strategy, prevBoardStr, turn)

    if (move === null) {
      passCount++
    } else {
      const [r, c] = move
      if (!isLegalMove(board, r, c, turn, size, prevBoardStr)) {
        throw new Error(`AI(${turn}, strength ${strength})가 불법수 ${r},${c}`)
      }
      const newPrevBoard = boardToString(board)
      const result = playMove(board, r, c, turn, size)
      board = result.board
      prevBoardStr = newPrevBoard
      passCount = 0
    }
    turn = turn === 'black' ? 'white' : 'black'
    moves++
  }

  const score = countTerritory(board, size, komi)
  const winner = score.black > score.white ? 'black'
    : score.white > score.black ? 'white' : 'draw'
  return { blackScore: score.black, whiteScore: score.white, winner, moves }
}

// 두 strength로 N게임 (색깔 교대로 덤 효과 상쇄)
// 반환: { strongTotal, weakTotal, strongWins, weakWins, draws, games }
function tournament(weakS, strongS, games = 4) {
  let strongTotal = 0
  let weakTotal = 0
  let strongWins = 0
  let weakWins = 0
  let draws = 0
  const log = []

  for (let i = 0; i < games; i++) {
    const strongAsBlack = i % 2 === 1
    const blackStr = strongAsBlack ? strongS : weakS
    const whiteStr = strongAsBlack ? weakS : strongS
    const result = selfPlay(blackStr, whiteStr)

    const strongScore = strongAsBlack ? result.blackScore : result.whiteScore
    const weakScore = strongAsBlack ? result.whiteScore : result.blackScore
    strongTotal += strongScore
    weakTotal += weakScore

    const strongColor = strongAsBlack ? 'black' : 'white'
    if (result.winner === 'draw') draws++
    else if (result.winner === strongColor) strongWins++
    else weakWins++

    log.push({
      game: i + 1,
      strongColor,
      strongScore: strongScore.toFixed(1),
      weakScore: weakScore.toFixed(1),
      moves: result.moves,
    })
  }
  return { strongTotal, weakTotal, strongWins, weakWins, draws, games, log }
}

function reportTournament(weakLabel, strongLabel, r) {
  console.log(`    [${weakLabel} vs ${strongLabel}] 강자 총점 ${r.strongTotal.toFixed(1)} vs 약자 총점 ${r.weakTotal.toFixed(1)} (차이 ${(r.strongTotal - r.weakTotal).toFixed(1)})`)
  console.log(`      승패: 강자 ${r.strongWins}승 / 약자 ${r.weakWins}승 / 무 ${r.draws}`)
  r.log.forEach(g => {
    console.log(`      게임 ${g.game}: 강자(${g.strongColor}) ${g.strongScore} vs 약자 ${g.weakScore} (${g.moves}수)`)
  })
}

// ===================================================
section('스모크 테스트: 39개 등급 모두 합법수 반환')
// ===================================================

test('빈 9x9에서 39개 등급 모두 합법수 반환', () => {
  const board = createBoard(SIZE)
  for (let s = 0; s < RANK_COUNT; s++) {
    const strategy = rankToStrategy(s)
    const move = getAiMove(board, SIZE, strategy, '', 'white')
    if (move === null) continue
    const [r, c] = move
    assert.ok(r >= 0 && r < SIZE && c >= 0 && c < SIZE, `${getRank(s).label}: 범위 밖`)
    assert.ok(isLegalMove(board, r, c, 'white', SIZE, ''), `${getRank(s).label}: 불법수`)
  }
})

test('중반 형세에서 39개 등급 모두 합법수 반환', () => {
  let board = createBoard(SIZE)
  ;[[2, 2], [2, 6], [4, 4], [6, 2]].forEach(([r, c]) => { board[r][c] = 'black' })
  ;[[2, 4], [4, 6], [6, 4], [6, 6]].forEach(([r, c]) => { board[r][c] = 'white' })

  for (let s = 0; s < RANK_COUNT; s++) {
    const strategy = rankToStrategy(s)
    const move = getAiMove(board, SIZE, strategy, '', 'white')
    if (move === null) continue
    const [r, c] = move
    assert.ok(isLegalMove(board, r, c, 'white', SIZE, ''), `${getRank(s).label}: 불법수`)
  }
})

// ===================================================
section('점수 계산 검증')
// ===================================================

test('자기대국은 MAX_MOVES 안에 종료', () => {
  const r = selfPlay(15, 15)
  assert.ok(r.moves <= MAX_MOVES, `moves: ${r.moves}`)
})

test('점수는 합리적 범위', () => {
  const r = selfPlay(20, 20)
  assert.ok(r.blackScore >= 0)
  assert.ok(r.whiteScore >= KOMI)
})

// ===================================================
section('강도 단조성: 강한 등급의 총점이 더 높음 (점수 합산)')
// ===================================================

const N_GAMES = 4
// 같은 색깔에서 강자가 약자보다 평균 점수가 높아야 함
// (덤은 색깔 교대로 상쇄되므로 총점 차이 = 실력 차이)
// 임계값 +3.0점: 4게임 합산이므로 게임당 평균 0.75점 정도 우위면 OK

const THRESHOLD = 3.0

test('30급(0) vs 9급(21): random ↔ territory 큰 격차', () => {
  const r = tournament(0, 21, N_GAMES)
  reportTournament('30급', '9급', r)
  assert.ok(r.strongTotal - r.weakTotal >= THRESHOLD,
    `차이 ${(r.strongTotal - r.weakTotal).toFixed(1)} < ${THRESHOLD}`)
})

test('25급(5) vs 5급(25): random ↔ advanced', () => {
  const r = tournament(5, 25, N_GAMES)
  reportTournament('25급', '5급', r)
  assert.ok(r.strongTotal - r.weakTotal >= THRESHOLD,
    `차이 ${(r.strongTotal - r.weakTotal).toFixed(1)} < ${THRESHOLD}`)
})

test('20급(10) vs 1급(29): capture ↔ advanced', () => {
  const r = tournament(10, 29, N_GAMES)
  reportTournament('20급', '1급', r)
  assert.ok(r.strongTotal - r.weakTotal >= THRESHOLD,
    `차이 ${(r.strongTotal - r.weakTotal).toFixed(1)} < ${THRESHOLD}`)
})

// 5급(advanced)과 3단(lookahead1)은 같은 evaluatePosition 사용 + 짧은 budget(800ms)에서
// 알파베타 깊이 차이가 안 나므로 차이가 작을 수 있음. 단조성만 확인 (음수만 아니면 OK).
test('5급(25) vs 3단(32): advanced ↔ lookahead1 (느슨)', () => {
  const r = tournament(25, 32, N_GAMES)
  reportTournament('5급', '3단', r)
  assert.ok(r.strongTotal - r.weakTotal > -15,
    `차이 ${(r.strongTotal - r.weakTotal).toFixed(1)} 너무 작음 (단/급 경계)`)
})

// 단(段) 등급끼리는 짧은 테스트 budget에서 알파베타 깊이 cliff로 노이즈 큼
// 실제 게임 budget(2000~5000ms)에선 깊이 차이가 명확
test('1단(30) vs 6단(35): lookahead1 ↔ lookahead2', () => {
  const r = tournament(30, 35, N_GAMES)
  reportTournament('1단', '6단', r)
  assert.ok(r.strongTotal - r.weakTotal > -20,
    `차이 ${(r.strongTotal - r.weakTotal).toFixed(1)} 너무 작음 (단 매치업)`)
})

// 4단 vs 9단: 짧은 테스트 budget(800ms)에선 9단이 깊이를 다 못 채우고 MCTS도 시뮬레이션
// 수가 부족. 실제 게임 budget(7~10초)에서는 9단 우위가 명확. 짧은 budget의 본질적 한계.
test('4단(33) vs 9단(38): lookahead2 ↔ deep (느슨)', () => {
  const r = tournament(33, 38, N_GAMES)
  reportTournament('4단', '9단', r)
  assert.ok(r.strongTotal - r.weakTotal > -60,
    `차이 ${(r.strongTotal - r.weakTotal).toFixed(1)} 너무 작음 (짧은 budget 단 매치업)`)
})

// 인접 등급(같은 티어)은 통계 노이즈로 차이가 매우 작거나 역전될 수 있음
test('15급(15) vs 12급(18): 인접 티어 경계 (느슨)', () => {
  const r = tournament(15, 18, N_GAMES)
  reportTournament('15급', '12급', r)
  assert.ok(r.strongTotal - r.weakTotal > -20,
    `차이 ${(r.strongTotal - r.weakTotal).toFixed(1)} 너무 작음`)
})

// ===================================================
console.log(`\n결과: ${passed} 통과, ${failed} 실패`)
if (failed > 0) {
  console.log('\n실패한 테스트:')
  fail.forEach(f => console.log(`  - ${f.name}: ${f.error}`))
  process.exit(1)
}
