// 실제 게임 budget으로 단 등급 강도 검증 (긴 테스트, 별도 실행)
// 실행: node frontend/test/badukAiStrength.test.js
// 약 3~5분 소요 — 짧은 budget 테스트(badukAi.test.js)와 다르게 실제 게임 환경에서 검증

import assert from 'node:assert/strict'
import { rankToStrategy } from '../src/utils/badukRank.js'
import {
  createBoard,
  removeDeadStones,
  boardToString,
  countTerritory,
  isLegalMove,
  getAiMove,
} from '../src/utils/badukEngine.js'

const SIZE = 9
const MAX_MOVES = 80
const KOMI = 6.5

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

function playMove(board, r, c, color, size) {
  const next = board.map(row => [...row])
  next[r][c] = color
  const opp = color === 'black' ? 'white' : 'black'
  const after = removeDeadStones(next, opp, size)
  return { board: after.board, captured: after.captured }
}

// 실제 strategy의 timeBudgetMs를 그대로 사용 (override 안 함)
function selfPlay(blackS, whiteS) {
  let board = createBoard(SIZE)
  let prevBoardStr = ''
  let turn = 'black'
  let passes = 0
  let moves = 0
  while (moves < MAX_MOVES && passes < 2) {
    const strength = turn === 'black' ? blackS : whiteS
    const strategy = rankToStrategy(strength, SIZE)
    const move = getAiMove(board, SIZE, strategy, prevBoardStr, turn)
    if (move === null) { passes++ } else {
      const [r, c] = move
      if (!isLegalMove(board, r, c, turn, SIZE, prevBoardStr)) {
        throw new Error(`불법수: ${strength} ${r},${c}`)
      }
      const newPrev = boardToString(board)
      const result = playMove(board, r, c, turn, SIZE)
      board = result.board
      prevBoardStr = newPrev
      passes = 0
    }
    turn = turn === 'black' ? 'white' : 'black'
    moves++
  }
  const score = countTerritory(board, SIZE, KOMI)
  return { blackScore: score.black, whiteScore: score.white, moves }
}

// 2게임 (색 교대), 점수 차 평균
function quickMatch(weakS, strongS) {
  console.log(`  ⌛ ${weakS} vs ${strongS} 진행 중...`)
  let diff = 0
  for (let i = 0; i < 2; i++) {
    const strongAsBlack = i === 0
    const r = strongAsBlack
      ? selfPlay(strongS, weakS)
      : selfPlay(weakS, strongS)
    const strongScore = strongAsBlack ? r.blackScore : r.whiteScore
    const weakScore = strongAsBlack ? r.whiteScore : r.blackScore
    diff += (strongScore - weakScore)
    console.log(`    게임 ${i + 1} (강자 ${strongAsBlack ? 'B' : 'W'}): ${strongScore.toFixed(1)} vs ${weakScore.toFixed(1)}`)
  }
  return diff
}

console.log('[실제 게임 budget으로 강도 검증 — 시간 오래 걸림]\n')

test('1단(30) → 5단(34): 깊이 차이 우위 (실제 budget)', () => {
  const diff = quickMatch(30, 34)
  console.log(`    누적 차이: ${diff.toFixed(1)}`)
  assert.ok(diff > 0, `5단이 1단에 우세해야 하는데 ${diff.toFixed(1)}`)
})

test('5단(34) → 9단(38): MCTS 우위 (실제 budget)', () => {
  const diff = quickMatch(34, 38)
  console.log(`    누적 차이: ${diff.toFixed(1)}`)
  assert.ok(diff > 0, `9단(MCTS)이 5단에 우세해야 하는데 ${diff.toFixed(1)}`)
})

test('1단(30) → 9단(38): 큰 격차 (실제 budget)', () => {
  const diff = quickMatch(30, 38)
  console.log(`    누적 차이: ${diff.toFixed(1)}`)
  assert.ok(diff > 5, `9단이 1단에 큰 우세 기대했는데 ${diff.toFixed(1)}`)
})

console.log(`\n결과: ${passed} 통과, ${failed} 실패`)
if (failed > 0) {
  fail.forEach(f => console.log(`  - ${f.name}: ${f.error}`))
  process.exit(1)
}
