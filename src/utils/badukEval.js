// 바둑 보드 평가 함수 (alpha-beta leaf용)
// - Bouzy-style 영향력 맵 → 집 추정
// - 두 눈 판정으로 그룹 사활 인식
// - 빈삼각/우형 페널티, 호구/뻗음 가점
// - 약한 돌 (활로 적고 두께 부족) 페널티

import { getGroup } from './badukEngine.js'

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]]
const DIAGS = [[-1, -1], [-1, 1], [1, -1], [1, 1]]

// 영향력 맵 (Bouzy 5-4 단순화). 감쇠 0.9로 두터움 강화.
export function computeInfluence(board, size, color) {
  const opp = color === 'black' ? 'white' : 'black'
  let inf = Array.from({ length: size }, () => Array(size).fill(0))

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === color) inf[r][c] = 64
      else if (board[r][c] === opp) inf[r][c] = -64
    }
  }

  for (let iter = 0; iter < 5; iter++) {
    const next = inf.map(row => [...row])
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] !== null) continue
        let sum = 0
        let count = 0
        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            sum += inf[nr][nc]
            count++
          }
        }
        next[r][c] = sum / Math.max(count, 1) * 0.9
      }
    }
    inf = next
  }
  return inf
}

export function estimateTerritory(board, size, color, inf) {
  let myTerritory = 0
  let oppTerritory = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] !== null) continue
      if (inf[r][c] >= 8) myTerritory++
      else if (inf[r][c] <= -8) oppTerritory++
    }
  }
  return { myTerritory, oppTerritory }
}

// 그룹이 가진 "눈 후보" 빈칸 세기.
// 그룹에 인접한 빈칸 중, 그룹과 인접한 다른 색 돌이 없고
// 사방이 (가장자리 포함) 모두 같은 색 또는 보드 밖인 빈칸을 1눈으로 본다.
// 두 개 이상의 분리된 눈 → 사실상 살아있음.
function countEyes(board, size, color, group) {
  const stoneSet = new Set(group.stones.map(([r, c]) => `${r},${c}`))
  const eyeCandidates = new Set()
  for (const [sr, sc] of group.stones) {
    for (const [dr, dc] of DIRS) {
      const nr = sr + dr, nc = sc + dc
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
      if (board[nr][nc] !== null) continue
      eyeCandidates.add(`${nr},${nc}`)
    }
  }

  const eyes = []
  for (const key of eyeCandidates) {
    const [r, c] = key.split(',').map(Number)
    // 4방향이 모두 우리 그룹의 돌 OR 같은 색 OR 보드 밖
    let isEye = true
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
      if (board[nr][nc] !== color) { isEye = false; break }
    }
    if (!isEye) continue
    // 대각선 중 3개 이상이 우리 색이거나 가장자리 → 진짜 눈
    let myDiag = 0, oppDiag = 0, edgeDiag = 0
    for (const [dr, dc] of DIAGS) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) edgeDiag++
      else if (board[nr][nc] === color) myDiag++
      else if (board[nr][nc] !== null) oppDiag++
    }
    // 코너(가장자리 대각 2): 상대 대각 0 필요
    // 변(가장자리 대각 1): 상대 대각 0
    // 중앙: 상대 대각 ≤ 1
    if (edgeDiag >= 1 && oppDiag === 0) eyes.push([r, c])
    else if (edgeDiag === 0 && oppDiag <= 1 && myDiag >= 3) eyes.push([r, c])
  }
  return eyes.length
}

// 모양 점수: 빈삼각/우형 페널티, 호구/뻗음 가점
function shapeScore(board, size, color, r, c) {
  // r,c 자체는 우리 돌
  // 빈삼각: 같은 색 두 돌이 ㄱ자, 대각선 빈칸
  let score = 0
  for (const [dr, dc] of DIAGS) {
    const r1 = r + dr, c1 = c
    const r2 = r, c2 = c + dc
    if (r1 < 0 || r1 >= size || c1 < 0 || c1 >= size) continue
    if (r2 < 0 || r2 >= size || c2 < 0 || c2 >= size) continue
    if (board[r1][c1] !== color || board[r2][c2] !== color) continue
    const dr2 = r + dr, dc2 = c + dc
    if (dr2 >= 0 && dr2 < size && dc2 >= 0 && dc2 < size) {
      if (board[dr2][dc2] === null) score -= 3 // 빈삼각
    }
  }
  return score
}

// 그룹 안전도: 활로 + 눈 + 크기 종합
function groupSafetyScore(board, size, color, group) {
  const { liberties, stones } = group
  const stoneCount = stones.length
  if (liberties === 0) return -stoneCount * 15

  // 두 눈 인식 — 살아있으면 큰 보너스
  const eyes = countEyes(board, size, color, group)
  if (eyes >= 2) return stoneCount * 0.5 + 8

  let base = 0
  if (liberties === 1) base = -stoneCount * 6
  else if (liberties === 2) base = -stoneCount * 1.5
  else base = Math.min(liberties, 6) * 0.6

  // 눈 1개 있으면 사활 가능성 — 활로 ≥3이면 가점
  if (eyes === 1 && liberties >= 3) base += 2

  // 큰 그룹일수록 활로 부족 시 위험 가중
  if (liberties <= 2 && stoneCount >= 4) base -= stoneCount * 0.5

  return base
}

// 약한 돌 감지: 활로 ≤2이면서 주변 두께 부족
function weakStonePenalty(board, size, color, group) {
  if (group.liberties > 2) return 0
  // 주변 5x5에서 같은 색 돌 개수 (자기 그룹 제외)
  const groupSet = new Set(group.stones.map(([r, c]) => `${r},${c}`))
  let surrounding = 0
  for (const [sr, sc] of group.stones) {
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const nr = sr + dr, nc = sc + dc
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
        if (board[nr][nc] !== color) continue
        if (groupSet.has(`${nr},${nc}`)) continue
        surrounding++
      }
    }
  }
  // 활로 2 + 주변 0: 위험. 활로 2 + 주변 ≥3: 안전한 편
  if (surrounding < 3) return -(3 - surrounding) * 2
  return 0
}

function evaluateGroups(board, size, color) {
  const opp = color === 'black' ? 'white' : 'black'
  const visited = new Set()
  let myScore = 0
  let oppScore = 0
  let myStones = 0
  let oppStones = 0
  let myShape = 0
  let oppShape = 0

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = board[r][c]
      if (!cell) continue
      const key = `${r},${c}`
      if (visited.has(key)) continue
      const group = getGroup(board, r, c, size)
      group.stones.forEach(([sr, sc]) => visited.add(`${sr},${sc}`))

      if (cell === color) {
        myScore += groupSafetyScore(board, size, color, group)
        myScore += weakStonePenalty(board, size, color, group)
        myStones += group.stones.length
        // 모양은 그룹 첫 돌에서만 (전체 평가 시 분산 효과)
        myShape += shapeScore(board, size, color, r, c)
      } else {
        oppScore += groupSafetyScore(board, size, opp, group)
        oppScore += weakStonePenalty(board, size, opp, group)
        oppStones += group.stones.length
        oppShape += shapeScore(board, size, opp, r, c)
      }
    }
  }
  return { myScore, oppScore, myStones, oppStones, myShape, oppShape }
}

// 전체 평가: 영토 + 돌수 + 그룹 안전도 + 모양 - 덤
export function evaluatePosition(board, size, color, komi = 6.5) {
  const inf = computeInfluence(board, size, color)
  const { myTerritory, oppTerritory } = estimateTerritory(board, size, color, inf)
  const { myScore, oppScore, myStones, oppStones, myShape, oppShape } = evaluateGroups(board, size, color)

  const komiBonus = color === 'white' ? komi : -komi

  return (
    (myTerritory - oppTerritory) * 1.5
    + (myStones - oppStones) * 1.0
    + (myScore - oppScore) * 0.7
    + (myShape - oppShape) * 0.5
    + komiBonus
  )
}

// 빠른 move scoring (move ordering용)
export function quickMoveScore(board, size, r, c, color, captured, selfLibs) {
  let score = 0
  score += captured * 80
  if (selfLibs >= 4) score += 6
  else if (selfLibs === 3) score += 3
  else if (selfLibs === 2) score -= 5
  else if (selfLibs === 1) score -= 40
  // 가장자리 회피
  if (r === 0 || r === size - 1 || c === 0 || c === size - 1) score -= 4
  // 1-1, 2-2 같은 너무 구석은 추가 페널티
  if ((r <= 1 || r >= size - 2) && (c <= 1 || c >= size - 2) && size >= 13) score -= 2
  // 중앙 선호 (보드 작을수록 강하게)
  const center = (size - 1) / 2
  const distFromCenter = Math.abs(r - center) + Math.abs(c - center)
  const centerWeight = size <= 9 ? 0.5 : 0.3
  score -= distFromCenter * centerWeight
  return score
}
