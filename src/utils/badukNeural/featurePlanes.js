// 신경망 입력용 feature plane 변환
// AlphaGo / KataGo 스타일: 보드 상태 → 다채널 입력 텐서
//
// 채널 구성 (총 11 채널):
//   0: 내 돌 (1.0 if my color, else 0)
//   1: 상대 돌
//   2: 빈 칸
//   3: 내 그룹 활로=1
//   4: 내 그룹 활로=2 (단수 위험)
//   5: 내 그룹 활로>=3
//   6: 상대 그룹 활로=1 (잡을 기회)
//   7: 상대 그룹 활로=2
//   8: 마지막 수 (1, 그 외 0)
//   9: 가장자리 (변/귀 가중치)
//  10: 색 표시 (1.0 if 흑 차례 else 0)

import { getGroup } from '../badukEngine.js'

const NUM_PLANES = 11

export function getNumPlanes() {
  return NUM_PLANES
}

// board: 2D ('black' | 'white' | null), color: 둘 차례
// 결과: Float32Array, shape = [11, size, size] (NCHW flattened)
export function makeInputPlanes(board, size, color, lastMove = null) {
  const my = color
  const opp = color === 'black' ? 'white' : 'black'
  const plane = (i) => i * size * size
  const idx = (i, r, c) => plane(i) + r * size + c
  const arr = new Float32Array(NUM_PLANES * size * size)

  // 그룹 활로 캐시 (셀별 group key)
  const groupLib = new Map() // key "r,c" → liberties
  function libAt(r, c) {
    if (board[r][c] === null) return 0
    const k = `${r},${c}`
    if (groupLib.has(k)) return groupLib.get(k)
    const g = getGroup(board, r, c, size)
    const lib = g.liberties
    for (const [sr, sc] of g.stones) groupLib.set(`${sr},${sc}`, lib)
    return lib
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = board[r][c]
      if (v === my) {
        arr[idx(0, r, c)] = 1
        const lib = libAt(r, c)
        if (lib === 1) arr[idx(3, r, c)] = 1
        else if (lib === 2) arr[idx(4, r, c)] = 1
        else arr[idx(5, r, c)] = 1
      } else if (v === opp) {
        arr[idx(1, r, c)] = 1
        const lib = libAt(r, c)
        if (lib === 1) arr[idx(6, r, c)] = 1
        else if (lib === 2) arr[idx(7, r, c)] = 1
      } else {
        arr[idx(2, r, c)] = 1
      }

      // 가장자리/귀 가중치 (0~1)
      const dr = Math.min(r, size - 1 - r)
      const dc = Math.min(c, size - 1 - c)
      const edgeDist = Math.min(dr, dc)
      arr[idx(9, r, c)] = edgeDist <= 2 ? (3 - edgeDist) / 3 : 0
    }
  }

  if (lastMove) {
    const [lr, lc] = lastMove
    if (lr >= 0 && lr < size && lc >= 0 && lc < size) {
      arr[idx(8, lr, lc)] = 1
    }
  }

  // 색 표시 plane (전체 채움)
  const colorVal = color === 'black' ? 1 : 0
  for (let i = 0; i < size * size; i++) {
    arr[plane(10) + i] = colorVal
  }

  return arr
}
