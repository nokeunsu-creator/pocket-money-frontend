// Monte Carlo Tree Search (MCTS) for Go
// - UCB1 selection
// - Heavy playout (quickMoveScore 상위 후보 중 가중 랜덤)
// - Leaf evaluation: evaluatePosition (tanh 정규화)
// - 시간 예산 안에 가능한 많은 시뮬레이션 수행
//
// 일반 MCTS와 차이점:
//   - 끝까지 playout 안 함 (rollout depth 제한 + 평가 함수로 종료)
//   - 평가 함수가 정확해서 hybrid가 효율적

import {
  isLegalMove,
  simulateMove,
  boardToString,
  getGroup,
  STAR_POINTS,
} from './badukEngine.js'
import { evaluatePosition, quickMoveScore } from './badukEval.js'

const UCB_C = 1.4
const ROLLOUT_DEPTH = 20

function getMctsCandidates(board, size) {
  const hasStones = []
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (board[r][c] !== null) hasStones.push([r, c])

  if (hasStones.length === 0) {
    return STAR_POINTS[size] || [[Math.floor(size / 2), Math.floor(size / 2)]]
  }

  const radius = 2
  const set = new Set()
  for (const [sr, sc] of hasStones) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const nr = sr + dr, nc = sc + dc
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null) {
          set.add(`${nr},${nc}`)
        }
      }
    }
  }
  return Array.from(set).map(s => s.split(',').map(Number))
}

// 후보를 정렬해 상위 N개만 (분기 폭발 방지)
function orderAndPrune(board, size, color, prevBoardStr, candidates, limit) {
  const opp = color === 'black' ? 'white' : 'black'
  const scored = []
  for (const [r, c] of candidates) {
    if (!isLegalMove(board, r, c, color, size, prevBoardStr)) continue
    const result = simulateMove(board, r, c, color, size)
    const selfGroup = getGroup(result.board, r, c, size)
    if (selfGroup.liberties === 0) continue
    if (selfGroup.liberties === 1 && result.captured === 0) continue
    let score = quickMoveScore(board, size, r, c, color, result.captured, selfGroup.liberties)
    if (result.captured >= 3) score += result.captured * 20
    // 상대 그룹 단수 만드는 수 가점
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
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

// MCTS 노드
class MctsNode {
  constructor(state, parent, move) {
    this.state = state  // { board, color, prevBoardStr }
    this.parent = parent
    this.move = move    // 이 노드로 오게 한 수 [r, c]
    this.children = []
    this.visits = 0
    this.totalValue = 0 // rootColor 관점에서의 누적 평가
    this.untriedMoves = null // lazy 초기화
  }

  expand(size, candidateLimit) {
    if (this.untriedMoves === null) {
      const cands = getMctsCandidates(this.state.board, size)
      this.untriedMoves = orderAndPrune(
        this.state.board, size, this.state.color, this.state.prevBoardStr,
        cands, candidateLimit,
      )
    }
  }

  ucb1Select(c = UCB_C) {
    if (this.children.length === 0) return null
    let best = null
    let bestScore = -Infinity
    const logN = Math.log(Math.max(1, this.visits))
    for (const child of this.children) {
      if (child.visits === 0) return child
      // rootColor 관점 평균값. 부모와 자식이 다른 color면 부호 반전
      const childAvg = child.totalValue / child.visits
      // 부모가 둔 후 child의 state.color는 반대. 부모가 max라면 child도 max(rootColor 관점).
      const exploit = childAvg
      const explore = c * Math.sqrt(logN / child.visits)
      const score = exploit + explore
      if (score > bestScore) {
        bestScore = score
        best = child
      }
    }
    return best
  }
}

// rollout: 현재 보드에서 평가 함수로 종료할 때까지 (제한된 깊이만큼) 진행
// heavy: 단순 랜덤 아님. quickMoveScore 상위 4개 중 가중 선택.
function rollout(state, size, rootColor, komi, prevBoardStr) {
  let board = state.board
  let color = state.color
  let prev = state.prevBoardStr
  let passes = 0

  for (let d = 0; d < ROLLOUT_DEPTH; d++) {
    const cands = getMctsCandidates(board, size)
    const moves = orderAndPrune(board, size, color, prev, cands, 6)
    if (moves.length === 0) {
      passes++
      if (passes >= 2) break
      color = color === 'black' ? 'white' : 'black'
      continue
    }
    passes = 0
    // 상위 후보 중 softmax-like 가중 랜덤 선택 (heavy playout)
    const idx = Math.min(moves.length - 1, Math.floor(Math.random() * Math.random() * moves.length))
    const [r, c] = moves[idx]
    const after = simulateMove(board, r, c, color, size)
    prev = boardToString(board)
    board = after.board
    color = color === 'black' ? 'white' : 'black'
  }

  // 평가는 rootColor 관점
  return evaluatePosition(board, size, rootColor, komi)
}

// 값 정규화: 평가 점수 → [-1, 1]
function normalizeValue(rawEval) {
  return Math.tanh(rawEval / 25)
}

// MCTS 메인
export function searchMctsMove({ board, size, color, prevBoardStr, komi = 6.5 }, options) {
  const startTime = Date.now()
  const timeBudgetMs = options.timeBudgetMs ?? 5000
  const candidateLimit = options.candidateLimit ?? 12

  const root = new MctsNode({ board, color, prevBoardStr }, null, null)
  root.expand(size, candidateLimit)

  if (root.untriedMoves.length === 0) return null
  if (root.untriedMoves.length === 1) return root.untriedMoves[0]

  let simulations = 0
  const maxSimulations = 50000 // 안전 상한

  while (Date.now() - startTime < timeBudgetMs && simulations < maxSimulations) {
    // 1. Selection
    let node = root
    while (node.untriedMoves !== null && node.untriedMoves.length === 0 && node.children.length > 0) {
      const next = node.ucb1Select()
      if (!next) break
      node = next
      node.expand(size, candidateLimit)
    }

    // 2. Expansion
    if (node.untriedMoves && node.untriedMoves.length > 0) {
      // untriedMoves에서 하나 꺼내서 자식 추가
      const move = node.untriedMoves.shift()
      const after = simulateMove(node.state.board, move[0], move[1], node.state.color, size)
      const childState = {
        board: after.board,
        color: node.state.color === 'black' ? 'white' : 'black',
        prevBoardStr: boardToString(node.state.board),
      }
      const child = new MctsNode(childState, node, move)
      node.children.push(child)
      node = child
    }

    // 3. Simulation
    const rawValue = rollout(node.state, size, color, komi, node.state.prevBoardStr)
    const value = normalizeValue(rawValue)

    // 4. Backpropagation (rootColor 관점이므로 부호 변환 없이 전파)
    let cur = node
    while (cur !== null) {
      cur.visits++
      cur.totalValue += value
      cur = cur.parent
    }

    simulations++
  }

  // 최다 방문 자식 선택 (가장 안정적인 PV)
  if (root.children.length === 0) return root.untriedMoves[0] || null
  let bestChild = root.children[0]
  for (const child of root.children) {
    if (child.visits > bestChild.visits) bestChild = child
  }
  return bestChild.move
}
