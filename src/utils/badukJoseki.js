// 바둑 정석/포석 데이터베이스
// - 보드 좌표는 코너 기준 (좌상 코너에서 시작)
// - 4코너 회전/반사로 8가지 변환 매칭
// - 각 코너 영역에서 패턴이 일치하면 다음 수 반환
//
// 패턴 정의:
//   { stones: [[r, c, color], ...], next: [r, c, color] }
//   - stones: 매치되어야 할 돌들 (코너 기준 0..N 좌표)
//   - next: 우리(AI)가 둘 다음 수
//   - color는 'black' | 'white'로 절대 색 지정

import { boardToString } from './badukEngine.js'

// 화점 위치 (코너 기준)
const HOSHI = { 9: [2, 2], 13: [3, 3], 19: [3, 3] }
const SAN_SAN = { 9: [1, 1], 13: [2, 2], 19: [2, 2] }
// 소목 (소목)
const KOMOKU = { 9: [[2, 1], [1, 2]], 13: [[3, 2], [2, 3]], 19: [[3, 2], [2, 3]] }

// 패턴 풀 (코너 좌표계, 좌상 코너 기준)
// 9x9는 작아서 정석보단 빠른 점령. 19x19는 화점 정석.
const JOSEKI_PATTERNS = {
  19: [
    // === 화점(4-4) 정석 ===
    // 흑 화점 → 백 3-3 침입 (가장 흔한 침입)
    {
      stones: [[3, 3, 'black'], [2, 2, 'white']],
      next: [2, 3, 'black'],
      desc: '화점 3-3 침입 막기(아래)',
    },
    {
      stones: [[3, 3, 'black'], [2, 2, 'white'], [2, 3, 'black']],
      next: [3, 2, 'white'],
      desc: '3-3 침입 뻗음',
    },
    {
      stones: [[3, 3, 'black'], [2, 2, 'white'], [2, 3, 'black'], [3, 2, 'white']],
      next: [1, 3, 'black'],
      desc: '3-3 후속 막기',
    },
    {
      stones: [[3, 3, 'black'], [2, 2, 'white'], [2, 3, 'black'], [3, 2, 'white'], [1, 3, 'black']],
      next: [4, 2, 'white'],
      desc: '3-3 침입 백 뻗기',
    },
    {
      stones: [[3, 3, 'black'], [2, 2, 'white'], [3, 2, 'black']],
      next: [2, 3, 'white'],
      desc: '3-3 침입 옆 막기',
    },
    {
      stones: [[3, 3, 'black'], [2, 2, 'white'], [3, 2, 'black'], [2, 3, 'white']],
      next: [3, 1, 'black'],
      desc: '3-3 침입 옆 막기 후',
    },

    // 화점 → 한칸낮은걸침(3-5) → 마늘모 받음
    {
      stones: [[3, 3, 'black'], [5, 2, 'white']],
      next: [3, 2, 'black'],
      desc: '한칸낮은걸침 마늘모(아래)',
    },
    {
      stones: [[3, 3, 'black'], [2, 5, 'white']],
      next: [2, 3, 'black'],
      desc: '한칸낮은걸침 마늘모(옆)',
    },
    {
      stones: [[3, 3, 'black'], [5, 2, 'white'], [3, 2, 'black']],
      next: [4, 4, 'white'],
      desc: '걸침 후 백 한칸뜀',
    },
    // 화점 → 두칸낮은걸침(3-6)
    {
      stones: [[3, 3, 'black'], [6, 2, 'white']],
      next: [4, 4, 'black'],
      desc: '두칸낮은걸침 마늘모',
    },
    // 화점 → 한칸높은걸침(2-5)
    {
      stones: [[3, 3, 'black'], [5, 3, 'white']],
      next: [3, 4, 'black'],
      desc: '한칸높은걸침 받음',
    },

    // === 화점 굳힘(布石) ===
    // 한칸 굳힘 — 화점 + 마늘모 (강함)
    {
      stones: [[3, 3, 'black'], [5, 4, 'black']],
      next: [3, 9, 'black'],
      desc: '화점 한칸 굳힘 → 변 벌림',
    },
    // 두칸 굳힘 — 화점 + 한칸 거리
    {
      stones: [[3, 3, 'black'], [5, 3, 'black']],
      next: [3, 9, 'black'],
      desc: '화점 두칸 굳힘 → 변',
    },

    // === 소목(3-4) 정석 ===
    // 흑 소목 → 백 한칸걸침 → 흑 마늘모
    {
      stones: [[3, 2, 'black'], [5, 3, 'white']],
      next: [3, 4, 'black'],
      desc: '소목 한칸걸침 마늘모',
    },
    {
      stones: [[2, 3, 'black'], [3, 5, 'white']],
      next: [4, 3, 'black'],
      desc: '소목 한칸걸침 반대 마늘모',
    },
    // 소목 + 한칸걸침 후 → 백 두칸 벌림
    {
      stones: [[3, 2, 'black'], [5, 3, 'white'], [3, 4, 'black']],
      next: [5, 5, 'white'],
      desc: '한칸걸침 후 백 한칸뜀',
    },
    // 소목 → 백 한칸높은걸침(2-5)
    {
      stones: [[3, 2, 'black'], [5, 2, 'white']],
      next: [4, 3, 'black'],
      desc: '소목 한칸낮은걸침 응수',
    },
    // 소목 → 두칸걸침(5-3)
    {
      stones: [[3, 2, 'black'], [5, 4, 'white']],
      next: [4, 3, 'black'],
      desc: '소목 두칸높은걸침 받음',
    },

    // === 소목 굳힘 ===
    // 눈목자 굳힘
    {
      stones: [[3, 2, 'black'], [5, 4, 'black']],
      next: [3, 9, 'black'],
      desc: '소목 눈목자 굳힘 → 변',
    },
    // 한칸 굳힘
    {
      stones: [[3, 2, 'black'], [5, 2, 'black']],
      next: [3, 9, 'black'],
      desc: '소목 한칸 굳힘 → 변',
    },
    // 마늘모 굳힘
    {
      stones: [[3, 2, 'black'], [4, 3, 'black']],
      next: [3, 9, 'black'],
      desc: '소목 마늘모 굳힘 → 변',
    },

    // === 백 화점 정석(우리 색 = 백) ===
    {
      stones: [[3, 3, 'white'], [2, 2, 'black']],
      next: [2, 3, 'white'],
      desc: '백 화점 3-3 침입 막기',
    },
    {
      stones: [[3, 3, 'white'], [2, 2, 'black'], [2, 3, 'white']],
      next: [3, 2, 'black'],
      desc: '백 화점 3-3 침입 뻗음',
    },
    {
      stones: [[3, 3, 'white'], [5, 2, 'black']],
      next: [3, 2, 'white'],
      desc: '백 화점 걸침 받음',
    },
    {
      stones: [[3, 3, 'white'], [5, 3, 'black']],
      next: [3, 4, 'white'],
      desc: '백 화점 한칸높은걸침 받음',
    },

    // 백 소목 정석
    {
      stones: [[3, 2, 'white'], [5, 3, 'black']],
      next: [3, 4, 'white'],
      desc: '백 소목 한칸걸침 마늘모',
    },
    {
      stones: [[2, 3, 'white'], [3, 5, 'black']],
      next: [4, 3, 'white'],
      desc: '백 소목 한칸걸침 반대',
    },

    // 백 굳힘
    {
      stones: [[3, 3, 'white'], [5, 4, 'white']],
      next: [3, 9, 'white'],
      desc: '백 화점 한칸 굳힘 → 변',
    },
    {
      stones: [[3, 2, 'white'], [5, 4, 'white']],
      next: [3, 9, 'white'],
      desc: '백 소목 눈목자 굳힘 → 변',
    },
  ],
  13: [
    // 13x13 화점(3-3 기준) 정석
    {
      stones: [[3, 3, 'black'], [2, 2, 'white']],
      next: [2, 3, 'black'],
      desc: '13: 3-3 침입 막기',
    },
    {
      stones: [[3, 3, 'black'], [2, 2, 'white'], [2, 3, 'black']],
      next: [3, 2, 'white'],
      desc: '13: 3-3 침입 뻗음',
    },
    {
      stones: [[3, 3, 'black'], [5, 2, 'white']],
      next: [3, 2, 'black'],
      desc: '13: 한칸낮은걸침 마늘모',
    },
    {
      stones: [[3, 3, 'black'], [2, 5, 'white']],
      next: [2, 3, 'black'],
      desc: '13: 한칸낮은걸침 옆',
    },
    {
      stones: [[3, 3, 'black'], [5, 3, 'white']],
      next: [3, 4, 'black'],
      desc: '13: 한칸높은걸침 받음',
    },
    // 13x13 굳힘
    {
      stones: [[3, 3, 'black'], [5, 4, 'black']],
      next: [3, 6, 'black'],
      desc: '13: 화점 한칸 굳힘 → 변',
    },
    // 백 색 정석
    {
      stones: [[3, 3, 'white'], [2, 2, 'black']],
      next: [2, 3, 'white'],
      desc: '13: 백 3-3 침입 막기',
    },
    {
      stones: [[3, 3, 'white'], [5, 2, 'black']],
      next: [3, 2, 'white'],
      desc: '13: 백 걸침 받음',
    },
  ],
  9: [
    // 9x9 화점(2-2) 정석
    {
      stones: [[2, 2, 'black'], [1, 1, 'white']],
      next: [1, 2, 'black'],
      desc: '9: 3-3 침입 막기',
    },
    {
      stones: [[2, 2, 'black'], [1, 1, 'white'], [1, 2, 'black']],
      next: [2, 1, 'white'],
      desc: '9: 3-3 침입 뻗음',
    },
    {
      stones: [[2, 2, 'black'], [4, 2, 'white']],
      next: [3, 2, 'black'],
      desc: '9: 옆 침입 막기',
    },
    {
      stones: [[2, 2, 'black'], [2, 4, 'white']],
      next: [2, 3, 'black'],
      desc: '9: 옆 침입 막기(반대)',
    },
    // 9x9 백 정석
    {
      stones: [[2, 2, 'white'], [1, 1, 'black']],
      next: [1, 2, 'white'],
      desc: '9: 백 3-3 침입 막기',
    },
    {
      stones: [[2, 2, 'white'], [4, 2, 'black']],
      next: [3, 2, 'white'],
      desc: '9: 백 옆 막기',
    },
  ],
}

// 좌표 변환: 코너 기준 (r, c) → 보드 절대 좌표 (R, C)
// corner: 0=좌상, 1=우상, 2=좌하, 3=우하
// flip: 대각선 반사 여부 (true면 r,c 스왑)
function transformPoint(r, c, size, corner, flip) {
  let ar, ac
  if (flip) { ar = c; ac = r } else { ar = r; ac = c }
  switch (corner) {
    case 0: return [ar, ac]              // 좌상
    case 1: return [ar, size - 1 - ac]   // 우상
    case 2: return [size - 1 - ar, ac]   // 좌하
    case 3: return [size - 1 - ar, size - 1 - ac] // 우하
  }
}

// 패턴이 보드의 특정 코너/변환에 매치되는지 확인
function patternMatches(pattern, board, size, corner, flip) {
  for (const [r, c, color] of pattern.stones) {
    const [ar, ac] = transformPoint(r, c, size, corner, flip)
    if (ar < 0 || ar >= size || ac < 0 || ac >= size) return false
    if (board[ar][ac] !== color) return false
  }
  // 다음 수 자리는 비어있어야 함
  const [nr, nc, _] = pattern.next
  const [anr, anc] = transformPoint(nr, nc, size, corner, flip)
  if (anr < 0 || anr >= size || anc < 0 || anc >= size) return false
  if (board[anr][anc] !== null) return false
  return true
}

// 정석 매칭 — 우리 색(color)에 맞는 다음 수가 있으면 반환
// 코너별로 4(corner) × 2(flip) = 8개 변환을 모두 시도
// 매치된 패턴 중 stones 개수가 가장 많은 것 우선 (더 구체적인 정석)
export function getJosekiMove(board, size, color) {
  const patterns = JOSEKI_PATTERNS[size]
  if (!patterns) return null

  const matches = []
  for (const pattern of patterns) {
    if (pattern.next[2] !== color) continue
    for (let corner = 0; corner < 4; corner++) {
      for (let flip = 0; flip < 2; flip++) {
        if (patternMatches(pattern, board, size, corner, flip === 1)) {
          const [nr, nc] = transformPoint(pattern.next[0], pattern.next[1], size, corner, flip === 1)
          matches.push({
            r: nr, c: nc,
            specificity: pattern.stones.length,
            desc: pattern.desc,
          })
        }
      }
    }
  }
  if (matches.length === 0) return null
  matches.sort((a, b) => b.specificity - a.specificity)
  return [matches[0].r, matches[0].c]
}

// 빈 보드 또는 초반 포석: 코너 점령 우선
// 비어있는 코너 중 자기 색이 없는 쪽으로 화점/3-3 선택
export function getOpeningMove(board, size, color) {
  const stoneCount = countStones(board, size)
  if (size === 19 && stoneCount >= 16) return null
  if (size === 13 && stoneCount >= 8) return null
  if (size === 9 && stoneCount >= 4) return null

  const hoshi = HOSHI[size]
  if (!hoshi) return null

  // 각 코너의 점유 상태 확인 (코너 영역 5x5 안에 돌 있는지)
  const cornerRadius = size === 19 ? 4 : (size === 13 ? 3 : 2)
  const corners = []
  for (let corner = 0; corner < 4; corner++) {
    const [cr, cc] = transformPoint(hoshi[0], hoshi[1], size, corner, false)
    let myStones = 0
    let oppStones = 0
    for (let dr = -cornerRadius; dr <= cornerRadius; dr++) {
      for (let dc = -cornerRadius; dc <= cornerRadius; dc++) {
        const nr = cr + dr, nc = cc + dc
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
        if (board[nr][nc] === color) myStones++
        else if (board[nr][nc] !== null) oppStones++
      }
    }
    corners.push({ corner, cr, cc, myStones, oppStones, occupied: board[cr][cc] !== null })
  }

  // 1순위: 자기 돌 없고 상대 돌도 없는 빈 코너의 화점
  const emptyCorners = corners.filter(c => c.myStones === 0 && c.oppStones === 0 && !c.occupied)
  if (emptyCorners.length > 0) {
    const pick = emptyCorners[Math.floor(Math.random() * emptyCorners.length)]
    return [pick.cr, pick.cc]
  }

  return null
}

function countStones(board, size) {
  let n = 0
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (board[r][c] !== null) n++
  return n
}
