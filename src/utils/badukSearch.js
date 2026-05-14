// 알파베타 탐색 (단 등급 AI 핵심)
// - Iterative deepening
// - Move ordering: 잡기 > 살리기 > 사다리 > 영향력 점수
// - Transposition table (보드 문자열 키)
// - 시간 제한으로 깊이 자동 조정

import {
  isLegalMove,
  simulateMove,
  boardToString,
  getGroup,
  STAR_POINTS,
  canEscapeLadder,
} from './badukEngine.js'
import { evaluatePosition, quickMoveScore } from './badukEval.js'

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]]
const BIG_POINTS = {
  9: [[2, 2], [2, 6], [6, 2], [6, 6], [4, 4]],
  13: [[3, 3], [3, 9], [9, 3], [9, 9], [6, 6], [3, 6], [6, 3], [6, 9], [9, 6]],
  19: [[3, 3], [3, 15], [15, 3], [15, 15], [9, 9], [3, 9], [9, 3], [9, 15], [15, 9]],
}

function getSearchCandidates(board, size, includeBig) {
  const hasStones = []
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (board[r][c] !== null) hasStones.push([r, c])

  if (hasStones.length === 0) {
    const stars = STAR_POINTS[size] || []
    return stars.length > 0 ? stars : [[Math.floor(size / 2), Math.floor(size / 2)]]
  }

  const radius = size <= 9 ? 2 : 2
  const candidates = new Set()
  for (const [sr, sc] of hasStones) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const nr = sr + dr, nc = sc + dc
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null) {
          candidates.add(`${nr},${nc}`)
        }
      }
    }
  }
  if (includeBig && hasStones.length <= 12) {
    for (const [br, bc] of BIG_POINTS[size] || []) {
      if (board[br][bc] === null) candidates.add(`${br},${bc}`)
    }
  }
  return Array.from(candidates).map(s => s.split(',').map(Number))
}

// 합법수 + move ordering된 후보 목록
function orderMoves(board, size, color, prevBoardStr, candidates, limit) {
  const opp = color === 'black' ? 'white' : 'black'
  const scored = []
  for (const [r, c] of candidates) {
    if (!isLegalMove(board, r, c, color, size, prevBoardStr)) continue
    const result = simulateMove(board, r, c, color, size)
    const selfGroup = getGroup(result.board, r, c, size)
    // 자기 단수 만드는 수 skip
    if (selfGroup.liberties === 0) continue
    if (selfGroup.liberties === 1 && result.captured === 0) continue
    let score = quickMoveScore(board, size, r, c, color, result.captured, selfGroup.liberties)
    if (result.captured >= 3) score += result.captured * 20
    // 상대 그룹을 단수로 만드는 수 가점
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && result.board[nr][nc] === opp) {
        const eg = getGroup(result.board, nr, nc, size)
        if (eg.liberties === 1) score += eg.stones.length * 8
        else if (eg.liberties === 2) score += eg.stones.length * 2
      }
    }
    scored.push({ r, c, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(m => [m.r, m.c])
}

// 패스가 유리한지 (게임 종반 판단)
function shouldPass(board, size, color, komi) {
  // 모든 칸이 거의 차거나 큰 변화 없을 때만 패스 고려
  let empty = 0
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (board[r][c] === null) empty++
  if (empty > size) return false
  // 현재 평가가 충분히 유리하면 패스
  const score = evaluatePosition(board, size, color, komi)
  return score > 15
}

// 알파베타 본체
function alphabeta(state, depth, alpha, beta, isMax, ctx) {
  const { size, prevBoardStr, komi, rootColor, candidateLimit, timeLimit, startTime, tt } = ctx
  if (Date.now() - startTime > timeLimit) {
    ctx.timedOut = true
    return evaluatePosition(state.board, size, rootColor, komi)
  }
  if (depth === 0) {
    return evaluatePosition(state.board, size, rootColor, komi)
  }

  const boardKey = boardToString(state.board) + '|' + state.color + '|' + depth
  if (tt.has(boardKey)) return tt.get(boardKey)

  const currentColor = state.color
  const candidates = getSearchCandidates(state.board, size, true)
  const ordered = orderMoves(state.board, size, currentColor, state.prevBoardStr, candidates, candidateLimit)

  if (ordered.length === 0) {
    const val = evaluatePosition(state.board, size, rootColor, komi)
    tt.set(boardKey, val)
    return val
  }

  let best = isMax ? -Infinity : Infinity
  for (const [r, c] of ordered) {
    const after = simulateMove(state.board, r, c, currentColor, size)
    const nextState = {
      board: after.board,
      color: currentColor === 'black' ? 'white' : 'black',
      prevBoardStr: boardToString(state.board),
    }
    const val = alphabeta(nextState, depth - 1, alpha, beta, !isMax, ctx)
    if (isMax) {
      if (val > best) best = val
      if (best > alpha) alpha = best
    } else {
      if (val < best) best = val
      if (best < beta) beta = best
    }
    if (beta <= alpha) break
  }

  tt.set(boardKey, best)
  return best
}

// 메인 진입점: 최선 수 탐색
// options: { maxDepth, candidateLimit, timeBudgetMs, komi }
export function searchBestMove({ board, size, color, prevBoardStr, komi = 6.5 }, options) {
  const startTime = Date.now()
  const tt = new Map()
  const maxDepth = options.maxDepth ?? 3
  const candidateLimit = options.candidateLimit ?? 12
  const timeBudgetMs = options.timeBudgetMs ?? 2000

  // 빠른 결정: 잡기 또는 살리기가 있으면 그것부터 우선
  const candidates = getSearchCandidates(board, size, true)
  const rootMoves = orderMoves(board, size, color, prevBoardStr, candidates, candidateLimit * 2)
  if (rootMoves.length === 0) return null

  const ctx = {
    size, komi, rootColor: color, candidateLimit,
    timeLimit: timeBudgetMs, startTime, tt, timedOut: false,
  }

  let bestMove = rootMoves[0]
  let bestScore = -Infinity

  // Iterative deepening: 시간 안에 점점 깊이 늘려가며 best 갱신
  for (let depth = 1; depth <= maxDepth; depth++) {
    if (Date.now() - startTime > timeBudgetMs * 0.85) break
    let localBest = -Infinity
    let localMove = rootMoves[0]
    let alpha = -Infinity
    const beta = Infinity
    for (const [r, c] of rootMoves) {
      if (Date.now() - startTime > timeBudgetMs) break
      const after = simulateMove(board, r, c, color, size)
      const nextState = {
        board: after.board,
        color: color === 'black' ? 'white' : 'black',
        prevBoardStr: boardToString(board),
      }
      const val = alphabeta(nextState, depth - 1, alpha, beta, false, ctx)
      if (val > localBest) {
        localBest = val
        localMove = [r, c]
      }
      if (val > alpha) alpha = val
    }
    if (!ctx.timedOut || depth === 1) {
      bestMove = localMove
      bestScore = localBest
    }
    if (ctx.timedOut) break
  }

  // 빈 보드 패스 회피
  return bestMove
}
