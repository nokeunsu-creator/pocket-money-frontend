// 바둑 보드 평가 함수 (alpha-beta leaf용)
// - Bouzy-style 영향력 맵 → 집 추정
// - 두 눈 판정으로 그룹 사활 인식
// - 빈삼각/우형 페널티, 호구/뻗음 가점
// - 약한 돌 (활로 적고 두께 부족) 페널티
// - 국지 패턴 라이브러리 (badukPatterns)로 응수 보너스/페널티

import { getGroup } from './badukEngine.js'
import { getPatternBonus } from './badukPatterns.js'

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]]
const DIAGS = [[-1, -1], [-1, 1], [1, -1], [1, 1]]

// 영향력 맵 (Bouzy 5-4 단순화). 감쇠 0.9로 두터움 강화.
// 2026-05-16: iter 5 → 8회로 늘려 영향력이 더 멀리 전파됨 (특히 19x19에서 큰 효과).
export function computeInfluence(board, size, color) {
  const opp = color === 'black' ? 'white' : 'black'
  let inf = Array.from({ length: size }, () => Array(size).fill(0))

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === color) inf[r][c] = 64
      else if (board[r][c] === opp) inf[r][c] = -64
    }
  }

  for (let iter = 0; iter < 8; iter++) {
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
  // 빈칸 비율로 게임 단계 추정 - 종반엔 임계값 낮춰서 더 정확
  let empty = 0
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (board[r][c] === null) empty++
  const totalCells = size * size
  const emptyRatio = empty / totalCells
  // 초반: |inf|>=8, 중반: 6, 종반: 4
  const threshold = emptyRatio > 0.6 ? 8 : (emptyRatio > 0.3 ? 6 : 4)

  let myTerritory = 0
  let oppTerritory = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] !== null) continue
      if (inf[r][c] >= threshold) myTerritory++
      else if (inf[r][c] <= -threshold) oppTerritory++
    }
  }
  return { myTerritory, oppTerritory }
}

// 그룹이 가진 "진짜 눈" 세기 (거짓 눈 제외).
// - 4방향 모두 같은 색
// - 대각선: 코너/변에서 상대 0, 중앙에서 상대 ≤ 1 + 자기 색 3개 이상
// - 거짓 눈 (false eye): 대각선 상대 돌 있으면 의심, 추가로 인접 그룹이 분리된 경우 더 보수적
function countEyes(board, size, color, group) {
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
    // 4방향이 모두 우리 색이어야 함
    let isEye = true
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
      if (board[nr][nc] !== color) { isEye = false; break }
    }
    if (!isEye) continue

    // 대각선 분석
    let myDiag = 0, oppDiag = 0, edgeDiag = 0
    for (const [dr, dc] of DIAGS) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) edgeDiag++
      else if (board[nr][nc] === color) myDiag++
      else if (board[nr][nc] !== null) oppDiag++
    }

    // 거짓 눈 패턴 1: 코너/변에서 상대 대각 1개 이상 = 거짓 눈
    if (edgeDiag >= 1 && oppDiag >= 1) continue
    // 거짓 눈 패턴 2: 중앙에서 상대 대각 2개 이상 = 거짓 눈
    if (edgeDiag === 0 && oppDiag >= 2) continue
    // 거짓 눈 패턴 3: 중앙에서 자기 색 대각 3개 미만 + 상대 1개 = 의심 (제외)
    if (edgeDiag === 0 && oppDiag === 1 && myDiag < 3) continue

    eyes.push([r, c])
  }
  return eyes.length
}

// 모양 점수: 빈삼각/우형 페널티 + 호구/뻗음/마늘모/한칸뜀 보너스
// 2026-05-16: 호구(虎口) 명시적 가점 추가 — ㄱ자 자기색 + 대각 자기색
function shapeScore(board, size, color, r, c) {
  let score = 0

  // 빈삼각: ㄱ자 같은 색 두 돌 + 대각선 빈칸 (자기 모양 우형)
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

  // *** 호구(虎口) 가점: ㄱ자 자기색 두 돌 + 대각선 자기색 (단단한 모양)
  // 빈삼각과 동일 패턴이지만 대각이 자기색 → 매우 단단한 연결
  for (const [dr, dc] of DIAGS) {
    const r1 = r + dr, c1 = c
    const r2 = r, c2 = c + dc
    const dr2 = r + dr, dc2 = c + dc
    if (r1 < 0 || r1 >= size || c1 < 0 || c1 >= size) continue
    if (r2 < 0 || r2 >= size || c2 < 0 || c2 >= size) continue
    if (dr2 < 0 || dr2 >= size || dc2 < 0 || dc2 >= size) continue
    if (board[r1][c1] === color && board[r2][c2] === color && board[dr2][dc2] === color) {
      score += 2 // 호구 (강한 연결)
    }
  }

  // 호구 (이쪽으로 두면 단수 만들 수 있는 형태): r,c 주변 같은 색 2개가 ㄱ자
  // 단순화: 인접 4방향 중 2개에 같은 색
  let sameAdj = 0
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
    if (board[nr][nc] === color) sameAdj++
  }
  // 인접 같은 색 2개 = 연결 단단 (호구 비슷)
  if (sameAdj === 2) score += 1
  if (sameAdj === 3) score += 2

  // 한칸뜀: 직선 2칸 거리에 같은 색
  for (const [dr, dc] of DIRS) {
    const nr = r + 2 * dr, nc = c + 2 * dc
    const mr = r + dr, mc = c + dc
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
    if (mr < 0 || mr >= size || mc < 0 || mc >= size) continue
    // 한 칸 띄어 같은 색 + 사이 빈칸
    if (board[nr][nc] === color && board[mr][mc] === null) score += 0.8
  }

  // 마늘모 (대각선 거리 1)
  for (const [dr, dc] of DIAGS) {
    const nr = r + dr, nc = c + dc
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
    if (board[nr][nc] === color) score += 0.6
  }

  return score
}

// 그룹 안전도: 활로 + 눈 + 크기 종합
// 2026-05-16: 살아있는 큰 그룹에 두께(thickness) 보너스 추가 — 외세 발휘
function groupSafetyScore(board, size, color, group) {
  const { liberties, stones } = group
  const stoneCount = stones.length
  if (liberties === 0) return -stoneCount * 15

  // 두 눈 인식 — 살아있으면 큰 보너스 + 두께 가점
  const eyes = countEyes(board, size, color, group)
  if (eyes >= 2) {
    // 두께 보너스: 살아있고 크고 활로 많은 그룹 = 외세 발휘
    const thickness = stoneCount >= 5 && liberties >= 5
      ? Math.min(stoneCount * 0.3, 6)
      : 0
    return stoneCount * 0.5 + 8 + thickness
  }

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
// 게임 단계 고려: 빈칸 비율로 초/중/종반 추정
// 2026-05-16: 자기 단수 만드는 수 페널티 -40 → -55 (자기 돌 단수 약점 ↓)
export function quickMoveScore(board, size, r, c, color, captured, selfLibs) {
  let score = 0
  score += captured * 80
  if (selfLibs >= 4) score += 6
  else if (selfLibs === 3) score += 3
  else if (selfLibs === 2) score -= 8
  else if (selfLibs === 1) score -= 55

  // 인접 분석 (자기/상대 4방향)
  const opp = color === 'black' ? 'white' : 'black'
  let myAdj = 0, oppAdj = 0
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
    if (board[nr][nc] === color) myAdj++
    else if (board[nr][nc] === opp) oppAdj++
  }

  // *** 자기 집(영토) 채우기 강한 페널티 ***
  // 인접 4방향 모두 자기 색이고 상대 없음 = 확정된 자기 집을 메우는 자살수
  // 잡기/단수 회피가 아닌 경우에만 적용
  if (myAdj >= 3 && oppAdj === 0 && captured === 0) {
    score -= 50
  }

  // 빈칸 비율로 게임 단계 추정
  let empty = 0
  for (let rr = 0; rr < size; rr++)
    for (let cc = 0; cc < size; cc++)
      if (board[rr][cc] === null) empty++
  const totalCells = size * size
  const emptyRatio = empty / totalCells
  const isOpening = emptyRatio > 0.7

  // 1선 회피 (초반엔 더 강하게)
  const onFirstLine = r === 0 || r === size - 1 || c === 0 || c === size - 1
  if (onFirstLine) score -= isOpening ? 18 : 6
  const onSecondLine = (r === 1 || r === size - 2 || c === 1 || c === size - 2) && !onFirstLine
  if (onSecondLine && isOpening) score -= 4

  // 상대 영향권 깊이 침입 페널티 (인접 + 2칸 거리 상대 돌 카운트)
  let oppNearby = 0
  let myNearby = 0
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
      const dist = Math.abs(dr) + Math.abs(dc)
      const weight = dist === 1 ? 3 : (dist === 2 ? 1 : 0.5)
      if (board[nr][nc] === opp) oppNearby += weight
      else if (board[nr][nc] === color) myNearby += weight
    }
  }
  if (oppNearby >= 6 && myNearby <= 1) score -= 25

  // 중앙 선호
  const center = (size - 1) / 2
  const distFromCenter = Math.abs(r - center) + Math.abs(c - center)
  const centerWeight = size <= 9 ? 0.5 : 0.3
  score -= distFromCenter * centerWeight

  // 2026-05-16: 국지 모양 패턴 라이브러리 가산
  score += getPatternBonus(board, size, r, c, color)

  return score
}
