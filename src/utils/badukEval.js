// 바둑 보드 평가 함수 (alpha-beta leaf용)
// - Bouzy-style 영향력 맵 → 집 추정
// - 그룹별 활로/사활 가점
// - 모든 함수는 색깔(color = 'black' | 'white') 관점에서 점수 반환

import { getGroup } from './badukEngine.js'

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]]

// 영향력 맵 계산 (Bouzy 5-4 단순화 버전)
// - 돌이 있는 칸: +64 (자기) / -64 (상대)
// - 빈 칸: 4방향 이웃 영향력 평균 * 감쇠
// - 반복 5회 후 임계값 |inf| >= 8 → 그쪽 집으로 분류
export function computeInfluence(board, size, color) {
  const opp = color === 'black' ? 'white' : 'black'
  let inf = Array.from({ length: size }, () => Array(size).fill(0))

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === color) inf[r][c] = 64
      else if (board[r][c] === opp) inf[r][c] = -64
    }
  }

  // 5번 반복 확산
  for (let iter = 0; iter < 4; iter++) {
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
        next[r][c] = sum / Math.max(count, 1) * 0.85
      }
    }
    inf = next
  }
  return inf
}

// 영향력 맵에서 집(예상 영토) 계산
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

// 그룹 안전도: 변동성 줄이기 위해 가중치 완화
// 활로 1: 단수 (다음 수에 잡힐 수 있음)
// 활로 2: 약간 위험
function groupSafetyScore(liberties, stones) {
  if (liberties === 0) return -stones.length * 12 // 자살 영역
  if (liberties === 1) return -stones.length * 5  // 단수
  if (liberties === 2) return -stones.length * 1
  return Math.min(liberties, 6) * 0.5
}

// 그룹별 점수: 내 그룹은 안전도 +, 상대 그룹은 안전도 - 부호 반대
function evaluateGroups(board, size, color) {
  const opp = color === 'black' ? 'white' : 'black'
  const visited = new Set()
  let myScore = 0
  let oppScore = 0
  let myStones = 0
  let oppStones = 0

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = board[r][c]
      if (!cell) continue
      const key = `${r},${c}`
      if (visited.has(key)) continue
      const group = getGroup(board, r, c, size)
      group.stones.forEach(([sr, sc]) => visited.add(`${sr},${sc}`))
      if (cell === color) {
        myScore += groupSafetyScore(group.liberties, group.stones)
        myStones += group.stones.length
      } else {
        oppScore += groupSafetyScore(group.liberties, group.stones)
        oppStones += group.stones.length
      }
    }
  }
  return { myScore, oppScore, myStones, oppStones }
}

// 전체 평가: 점수 = 내 집 + 내 돌 - 상대 집 - 상대 돌 + 그룹 안전도 - 덤
// 가중치는 실제 게임 결과에 가깝게 조정
export function evaluatePosition(board, size, color, komi = 6.5) {
  const inf = computeInfluence(board, size, color)
  const { myTerritory, oppTerritory } = estimateTerritory(board, size, color, inf)
  const { myScore, oppScore, myStones, oppStones } = evaluateGroups(board, size, color)

  // 백이면 덤을 받음
  const komiBonus = color === 'white' ? komi : -komi

  // 영토 가중치 ↑, 그룹 안전도 가중치 ↓ (변동성 완화)
  return (
    (myTerritory - oppTerritory) * 1.5
    + (myStones - oppStones) * 1.0
    + (myScore - oppScore) * 0.6
    + komiBonus
  )
}

// 빠른 move scoring (move ordering용)
// 잡기 = 매우 큼, 살리기 = 큼, 큰 점 = 중간, 영향력 변화 = 작음
export function quickMoveScore(board, size, r, c, color, captured, selfLibs) {
  let score = 0
  score += captured * 80
  if (selfLibs >= 4) score += 6
  else if (selfLibs === 3) score += 3
  else if (selfLibs === 2) score -= 5
  else if (selfLibs === 1) score -= 40  // 자기 단수
  // 가장자리 회피
  if (r === 0 || r === size - 1 || c === 0 || c === size - 1) score -= 4
  // 중앙 선호
  const center = (size - 1) / 2
  const distFromCenter = Math.abs(r - center) + Math.abs(c - center)
  score -= distFromCenter * 0.3
  return score
}
