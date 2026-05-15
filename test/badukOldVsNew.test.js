// 수정 전 1단이 수정 후 어느 등급과 비슷한 강도인지 측정
// 실행: node frontend/test/badukOldVsNew.test.js

import { rankToStrategy } from '../src/utils/badukRank.js'
import {
  createBoard, removeDeadStones, boardToString,
  countTerritory, isLegalMove, getAiMove,
} from '../src/utils/badukEngine.js'

const SIZE = 9
const MAX_MOVES = 60
const KOMI = 6.5

// 수정 전 1단 설정 (2026-05-14 시점)
const OLD_DAN1 = {
  tier: 'lookahead1',
  subLevel: 0,
  strength: 30,
  search: { maxDepth: 3, candidateLimit: 10, timeBudgetMs: 1000 },
}

function playMove(board, r, c, color, size) {
  const next = board.map(row => [...row])
  next[r][c] = color
  const opp = color === 'black' ? 'white' : 'black'
  const after = removeDeadStones(next, opp, size)
  return { board: after.board }
}

function getStrategy(label) {
  if (label === 'old1단') return OLD_DAN1
  // 새 등급 (strength)
  return rankToStrategy(label, SIZE)
}

function selfPlay(blackLabel, whiteLabel) {
  let board = createBoard(SIZE)
  let prevBoardStr = ''
  let turn = 'black'
  let passes = 0
  let moves = 0
  while (moves < MAX_MOVES && passes < 2) {
    const strategy = turn === 'black' ? getStrategy(blackLabel) : getStrategy(whiteLabel)
    const move = getAiMove(board, SIZE, strategy, prevBoardStr, turn)
    if (move === null) { passes++ }
    else {
      const [r, c] = move
      if (!isLegalMove(board, r, c, turn, SIZE, prevBoardStr)) {
        throw new Error(`불법수: ${turn} ${r},${c}`)
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
  return { blackScore: score.black, whiteScore: score.white }
}

function match(oldLabel, newLabel) {
  let diff = 0
  for (let i = 0; i < 2; i++) {
    const oldAsBlack = i === 0
    const r = oldAsBlack
      ? selfPlay(oldLabel, newLabel)
      : selfPlay(newLabel, oldLabel)
    const oldScore = oldAsBlack ? r.blackScore : r.whiteScore
    const newScore = oldAsBlack ? r.whiteScore : r.blackScore
    diff += (newScore - oldScore)  // 양수면 new가 이김
    console.log(`    ${newLabel}vs${oldLabel} (new=${oldAsBlack ? 'W' : 'B'}): new ${newScore.toFixed(1)} - old ${oldScore.toFixed(1)} = ${(newScore - oldScore).toFixed(1)}`)
  }
  return diff
}

console.log('[수정 전 1단 vs 수정 후 각 등급 — 2 게임 평균 점수차]\n')

// 새 등급 중 어느 게 옛 1단과 비슷한지 찾기
// 새 등급별로 테스트: 새 등급이 이기면 양수, 옛 1단이 이기면 음수
const newRanks = [
  { label: 18, name: '12급' },
  { label: 21, name: '9급' },
  { label: 24, name: '6급' },
  { label: 27, name: '3급' },
  { label: 29, name: '1급' },
  { label: 30, name: '새 1단' },
  { label: 32, name: '새 3단' },
]

const results = []
for (const rank of newRanks) {
  console.log(`\n  ${rank.name} (strength ${rank.label}) vs 옛 1단:`)
  const diff = match('old1단', rank.label)
  console.log(`    ▶ 합산 점수차: ${diff.toFixed(1)} ${diff > 0 ? '(새 우세)' : diff < 0 ? '(옛 우세)' : '(동률)'}`)
  results.push({ ...rank, diff })
}

console.log('\n[결과 요약]')
console.log('새 등급             합산 점수차')
results.forEach(r => {
  const bar = r.diff > 0 ? '🟢' : (r.diff < 0 ? '🔴' : '⚪')
  console.log(`  ${r.name.padEnd(8)} (str${r.label})  ${r.diff.toFixed(1).padStart(6)}  ${bar}`)
})

// 옛 1단과 가장 비슷한 (점수차 절대값 최소) 새 등급 찾기
const closest = [...results].sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff))[0]
console.log(`\n👉 옛 1단 ≈ 새 ${closest.name} (점수차 ${closest.diff.toFixed(1)})`)
