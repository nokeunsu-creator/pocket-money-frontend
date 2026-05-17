// 신경망 기반 MCTS (AlphaGo 스타일 PUCT).
// - 정책망(policy): 자식 후보의 prior 확률 (P)
// - 가치망(value): leaf 노드 평가
// - PUCT 선택: Q(s,a) + c_puct * P(s,a) * sqrt(N) / (1 + n)
//
// 기존 휴리스틱 평가(quickMoveScore)도 mix해서 policy 보강.

import {
  isLegalMove, simulateMove, boardToString, getGroup, STAR_POINTS,
} from '../badukEngine.js'
import { quickMoveScore } from '../badukEval.js'
import { makeInputPlanes } from './featurePlanes.js'
import { forward } from './cnn.js'

const C_PUCT = 1.4
const POLICY_TEMP = 1.0
// 신경망 prior와 휴리스틱 prior 혼합 비율
const HEURISTIC_MIX = 0.45

function legalMaskOf(board, size, color, prevBoardStr) {
  const mask = new Float32Array(size * size)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] !== null) continue
      if (isLegalMove(board, r, c, color, size, prevBoardStr)) {
        // 자충/단수 자살수 추가 필터
        const sim = simulateMove(board, r, c, color, size)
        const g = getGroup(sim.board, r, c, size)
        if (g.liberties === 0) continue
        if (g.liberties === 1 && sim.captured === 0) continue
        mask[r * size + c] = 1
      }
    }
  }
  return mask
}

// 휴리스틱 prior: quickMoveScore를 softmax로 정규화한 분포
function heuristicPrior(board, size, color, prevBoardStr, legalMask) {
  const opp = color === 'black' ? 'white' : 'black'
  const HW = size * size
  const scores = new Float32Array(HW)
  let maxS = -Infinity
  for (let p = 0; p < HW; p++) {
    if (!legalMask[p]) { scores[p] = -1e9; continue }
    const r = Math.floor(p / size), c = p % size
    const sim = simulateMove(board, r, c, color, size)
    const sg = getGroup(sim.board, r, c, size)
    let s = quickMoveScore(board, size, r, c, color, sim.captured, sg.liberties)
    // 상대 단수 만드는 수 보너스
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && sim.board[nr][nc] === opp) {
        const eg = getGroup(sim.board, nr, nc, size)
        if (eg.liberties === 1) s += eg.stones.length * 6
      }
    }
    scores[p] = s
    if (s > maxS) maxS = s
  }
  // softmax (scale 작게)
  let sum = 0
  const out = new Float32Array(HW)
  for (let p = 0; p < HW; p++) {
    if (!legalMask[p]) continue
    const v = Math.exp((scores[p] - maxS) / 8)
    out[p] = v; sum += v
  }
  if (sum > 0) for (let p = 0; p < HW; p++) out[p] /= sum
  return out
}

function mixPolicy(nn, heur, size) {
  const HW = size * size
  const out = new Float32Array(HW)
  let sum = 0
  for (let p = 0; p < HW; p++) {
    out[p] = (1 - HEURISTIC_MIX) * nn[p] + HEURISTIC_MIX * heur[p]
    sum += out[p]
  }
  if (sum > 0) for (let p = 0; p < HW; p++) out[p] /= sum
  return out
}

// MCTS 노드
class Node {
  constructor(parent, prior) {
    this.parent = parent
    this.children = new Map() // move "r,c" → Node
    this.N = 0
    this.W = 0  // 부모 관점 누적 가치
    this.P = prior // 부모가 이 노드로 가는 prior
    this.value = 0 // leaf 평가
    this.expanded = false
  }

  Q() {
    return this.N === 0 ? 0 : this.W / this.N
  }

  selectChild() {
    let bestKey = null, bestScore = -Infinity
    const sqrtN = Math.sqrt(this.N + 1)
    for (const [key, child] of this.children) {
      const q = child.Q()
      const u = C_PUCT * child.P * sqrtN / (1 + child.N)
      // 자식의 Q는 자식 관점이므로 부호 반전
      const score = -q + u
      if (score > bestScore) { bestScore = score; bestKey = key }
    }
    return bestKey
  }
}

// 한 번 시뮬레이션 (selection → expansion → backup)
function simulate(root, rootState, weights, size, komi) {
  // 1) Selection
  let node = root
  const path = [node]
  const state = {
    board: rootState.board.map(row => [...row]),
    color: rootState.color,
    prevBoardStr: rootState.prevBoardStr,
  }
  while (node.expanded && node.children.size > 0) {
    const key = node.selectChild()
    if (key === null) break
    const child = node.children.get(key)
    if (key === 'pass') {
      state.prevBoardStr = boardToString(state.board)
      state.color = state.color === 'black' ? 'white' : 'black'
    } else {
      const [r, c] = key.split(',').map(Number)
      const after = simulateMove(state.board, r, c, state.color, size)
      state.prevBoardStr = boardToString(state.board)
      state.board = after.board
      state.color = state.color === 'black' ? 'white' : 'black'
    }
    node = child
    path.push(node)
  }

  // 2) Expansion + Evaluation
  let leafValue
  if (!node.expanded) {
    const mask = legalMaskOf(state.board, size, state.color, state.prevBoardStr)
    const input = makeInputPlanes(state.board, size, state.color, null)
    const { policy, pass, value } = forward(input, weights, size, mask)
    const heur = heuristicPrior(state.board, size, state.color, state.prevBoardStr, mask)
    const mixed = mixPolicy(policy, heur, size)

    const HW = size * size
    let hasLegal = false
    for (let p = 0; p < HW; p++) {
      if (mask[p] && mixed[p] > 1e-6) {
        const r = Math.floor(p / size), c = p % size
        node.children.set(`${r},${c}`, new Node(node, mixed[p]))
        hasLegal = true
      }
    }
    // 패스 옵션 (legal move 거의 없을 때만 무게)
    if (!hasLegal || pass > 0.05) {
      node.children.set('pass', new Node(node, Math.max(pass, hasLegal ? 0.001 : 0.5)))
    }
    node.expanded = true
    node.value = value
    leafValue = value
  } else {
    // 더 이상 확장 불가 - 자체 가치 사용
    leafValue = node.value
  }

  // 3) Backup. state.color는 leaf 다음 둘 차례.
  //    leafValue는 그 차례 관점 가치.
  let v = leafValue
  for (let i = path.length - 1; i >= 0; i--) {
    const n = path[i]
    n.N += 1
    n.W += v
    v = -v // 한 단계 위로 올라가면 차례가 반대
  }
}

// 최상위 진입점
export function neuralSearch({ board, size, color, prevBoardStr, komi }, weights, options) {
  const sims = options.simulations ?? 100
  const timeBudgetMs = options.timeBudgetMs ?? 1500
  const startTime = Date.now()

  const rootState = { board, color, prevBoardStr }
  const root = new Node(null, 1.0)
  // root 확장
  const mask = legalMaskOf(board, size, color, prevBoardStr)
  const HW = size * size
  let legalCount = 0
  for (let p = 0; p < HW; p++) if (mask[p]) legalCount++
  if (legalCount === 0) return null

  const input = makeInputPlanes(board, size, color, null)
  const { policy, pass, value } = forward(input, weights, size, mask)
  const heur = heuristicPrior(board, size, color, prevBoardStr, mask)
  const mixed = mixPolicy(policy, heur, size)
  for (let p = 0; p < HW; p++) {
    if (mask[p] && mixed[p] > 1e-6) {
      const r = Math.floor(p / size), c = p % size
      root.children.set(`${r},${c}`, new Node(root, mixed[p]))
    }
  }
  if (pass > 0.1) root.children.set('pass', new Node(root, pass))
  root.expanded = true
  root.value = value

  let count = 0
  while (count < sims && Date.now() - startTime < timeBudgetMs) {
    simulate(root, rootState, weights, size, komi)
    count++
  }

  // 최다 방문 자식 선택
  let bestKey = null, bestN = -1
  for (const [key, child] of root.children) {
    if (child.N > bestN) { bestN = child.N; bestKey = key }
  }
  if (bestKey === null) return null
  if (bestKey === 'pass') return null // null = pass
  const [r, c] = bestKey.split(',').map(Number)
  return [r, c]
}
