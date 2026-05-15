// 알파베타 탐색 (단 등급 AI 핵심)
// - Iterative deepening
// - Move ordering: 잡기 > 살리기 > 사다리 > 영향력 점수
// - Killer move heuristic (depth별 cutoff 만든 수 우선)
// - History heuristic (좋은 결과를 낸 수의 score boost)
// - Aspiration window (좁은 윈도우로 빠른 cutoff)
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

// 합법수 + move ordering (Killer + History 추가)
function orderMoves(board, size, color, prevBoardStr, candidates, limit, ctx, depth) {
  const opp = color === 'black' ? 'white' : 'black'
  const killers = ctx?.killers?.[depth] || []
  const history = ctx?.history || null
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
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && result.board[nr][nc] === opp) {
        const eg = getGroup(result.board, nr, nc, size)
        if (eg.liberties === 1) score += eg.stones.length * 8
        else if (eg.liberties === 2) score += eg.stones.length * 2
      }
    }
    // Killer move 보너스 (같은 depth에서 cutoff 만든 수)
    for (const k of killers) {
      if (k && k[0] === r && k[1] === c) { score += 50; break }
    }
    // History heuristic (누적된 cutoff 빈도)
    if (history) {
      const key = `${color}:${r},${c}`
      score += (history[key] || 0) * 0.5
    }
    scored.push({ r, c, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(m => [m.r, m.c])
}

// Quiescence search: depth 0에 도달했을 때 잡기/단수가 발생하면 추가 탐색
// 안정된 위치까지 가서 평가 — 갑작스러운 큰 변화 방지
function quiescence(state, alpha, beta, isMax, ctx, qDepth) {
  const { size, komi, rootColor, timeLimit, startTime } = ctx
  if (Date.now() - startTime > timeLimit) {
    ctx.timedOut = true
    return evaluatePosition(state.board, size, rootColor, komi)
  }
  // qDepth 한도 (보통 3 정도로 충분)
  if (qDepth >= 4) return evaluatePosition(state.board, size, rootColor, komi)

  // Stand-pat: 두지 않을 때의 평가
  const standPat = evaluatePosition(state.board, size, rootColor, komi)
  if (isMax) {
    if (standPat >= beta) return beta
    if (standPat > alpha) alpha = standPat
  } else {
    if (standPat <= alpha) return alpha
    if (standPat < beta) beta = standPat
  }

  // 잡기 + 단수 만드는 수만 추가 탐색 (강한 가지치기)
  const opp = state.color === 'black' ? 'white' : 'black'
  const candidates = getSearchCandidates(state.board, size, false)
  const tacticalMoves = []
  for (const [r, c] of candidates) {
    if (!isLegalMove(state.board, r, c, state.color, size, state.prevBoardStr)) continue
    const result = simulateMove(state.board, r, c, state.color, size)
    if (result.captured > 0) {
      tacticalMoves.push({ r, c, score: result.captured * 100 })
      continue
    }
    // 상대 단수 만드는 수
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && result.board[nr][nc] === opp) {
        const eg = getGroup(result.board, nr, nc, size)
        if (eg.liberties === 1 && eg.stones.length >= 2) {
          tacticalMoves.push({ r, c, score: eg.stones.length * 10 })
          break
        }
      }
    }
  }
  if (tacticalMoves.length === 0) return standPat
  tacticalMoves.sort((a, b) => b.score - a.score)

  // 상위 4개만 시도 (분기 폭발 방지)
  for (const { r, c } of tacticalMoves.slice(0, 4)) {
    const after = simulateMove(state.board, r, c, state.color, size)
    const nextState = {
      board: after.board,
      color: state.color === 'black' ? 'white' : 'black',
      prevBoardStr: boardToString(state.board),
    }
    const val = quiescence(nextState, alpha, beta, !isMax, ctx, qDepth + 1)
    if (isMax) {
      if (val >= beta) return beta
      if (val > alpha) alpha = val
    } else {
      if (val <= alpha) return alpha
      if (val < beta) beta = val
    }
  }
  return isMax ? alpha : beta
}

// 알파베타 본체
function alphabeta(state, depth, alpha, beta, isMax, ctx) {
  const { size, komi, rootColor, candidateLimit, timeLimit, startTime, tt } = ctx
  if (Date.now() - startTime > timeLimit) {
    ctx.timedOut = true
    return evaluatePosition(state.board, size, rootColor, komi)
  }
  if (depth === 0) {
    // Quiescence로 잡기/단수 위치는 추가 탐색
    return quiescence(state, alpha, beta, isMax, ctx, 0)
  }

  const boardKey = boardToString(state.board) + '|' + state.color + '|' + depth
  if (tt.has(boardKey)) return tt.get(boardKey)

  const currentColor = state.color
  const candidates = getSearchCandidates(state.board, size, true)
  const ordered = orderMoves(state.board, size, currentColor, state.prevBoardStr, candidates, candidateLimit, ctx, depth)

  if (ordered.length === 0) {
    const val = evaluatePosition(state.board, size, rootColor, komi)
    tt.set(boardKey, val)
    return val
  }

  let best = isMax ? -Infinity : Infinity
  let bestMove = null
  for (const [r, c] of ordered) {
    const after = simulateMove(state.board, r, c, currentColor, size)
    const nextState = {
      board: after.board,
      color: currentColor === 'black' ? 'white' : 'black',
      prevBoardStr: boardToString(state.board),
    }
    const val = alphabeta(nextState, depth - 1, alpha, beta, !isMax, ctx)
    if (isMax) {
      if (val > best) { best = val; bestMove = [r, c] }
      if (best > alpha) alpha = best
    } else {
      if (val < best) { best = val; bestMove = [r, c] }
      if (best < beta) beta = best
    }
    if (beta <= alpha) {
      // Cutoff 발생 — Killer + History 업데이트
      recordCutoff(ctx, depth, r, c, currentColor)
      break
    }
  }

  tt.set(boardKey, best)
  return best
}

function recordCutoff(ctx, depth, r, c, color) {
  if (!ctx.killers[depth]) ctx.killers[depth] = []
  const killers = ctx.killers[depth]
  // 중복이면 무시
  if (killers.some(k => k && k[0] === r && k[1] === c)) {
    // 이미 있으면 history만 업데이트
  } else {
    // 최대 2개 유지 (FIFO)
    killers.unshift([r, c])
    if (killers.length > 2) killers.length = 2
  }
  const key = `${color}:${r},${c}`
  ctx.history[key] = (ctx.history[key] || 0) + depth * depth
}

// 메인 진입점: 최선 수 탐색 (Aspiration window 포함)
export function searchBestMove({ board, size, color, prevBoardStr, komi = 6.5 }, options) {
  const startTime = Date.now()
  const tt = new Map()
  const maxDepth = options.maxDepth ?? 3
  const candidateLimit = options.candidateLimit ?? 12
  const timeBudgetMs = options.timeBudgetMs ?? 2000

  const candidates = getSearchCandidates(board, size, true)
  const ctx0 = { killers: {}, history: {} }
  const rootMoves = orderMoves(board, size, color, prevBoardStr, candidates, candidateLimit * 2, ctx0, maxDepth)
  if (rootMoves.length === 0) return null

  const ctx = {
    size, komi, rootColor: color, candidateLimit,
    timeLimit: timeBudgetMs, startTime, tt, timedOut: false,
    killers: {}, history: {},
  }

  let bestMove = rootMoves[0]
  let bestScore = -Infinity
  let prevScore = null

  // Iterative deepening + Aspiration window
  for (let depth = 1; depth <= maxDepth; depth++) {
    if (Date.now() - startTime > timeBudgetMs * 0.85) break

    let alpha, beta
    if (prevScore !== null && depth >= 3) {
      // Aspiration: 이전 점수 ±5 좁은 윈도우로 시도
      alpha = prevScore - 5
      beta = prevScore + 5
    } else {
      alpha = -Infinity
      beta = Infinity
    }

    const tryDepth = (a, b) => {
      let localBest = -Infinity
      let localMove = rootMoves[0]
      let localAlpha = a
      for (const [r, c] of rootMoves) {
        if (Date.now() - startTime > timeBudgetMs) break
        const after = simulateMove(board, r, c, color, size)
        const nextState = {
          board: after.board,
          color: color === 'black' ? 'white' : 'black',
          prevBoardStr: boardToString(board),
        }
        const val = alphabeta(nextState, depth - 1, localAlpha, b, false, ctx)
        if (val > localBest) {
          localBest = val
          localMove = [r, c]
        }
        if (val > localAlpha) localAlpha = val
      }
      return { localBest, localMove }
    }

    let { localBest, localMove } = tryDepth(alpha, beta)

    // Aspiration window fail: 풀 윈도우로 재시도
    if (alpha !== -Infinity && (localBest <= alpha || localBest >= beta)) {
      if (Date.now() - startTime <= timeBudgetMs) {
        const retry = tryDepth(-Infinity, Infinity)
        localBest = retry.localBest
        localMove = retry.localMove
      }
    }

    if (!ctx.timedOut || depth === 1) {
      bestMove = localMove
      bestScore = localBest
      prevScore = localBest
    }
    if (ctx.timedOut) break
  }

  return bestMove
}
