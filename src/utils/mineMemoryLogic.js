// 망각의 지뢰 — 순수 게임 로직 (Local / Online 양쪽에서 공유)
// UI/렌더 코드 없음. 모든 함수는 결정론적이며 테스트 가능.

export const SIZE = 11
export const MINES_PER_PLAYER = 15
export const TREASURE_POINTS = [10, 15, 20]
export const MINE_PENALTY = -5
export const MINE_FORBID_SIZE = 2  // 출발 코너 안쪽 2×2 (4칸) 지뢰 금지
// 원작 룰: 지뢰 밟으면 "출발지 주변 3칸(인접 8방향 중 in-bounds, 코너에선 3개)" 중 1칸으로 강제 이동

// P1=k1(우상), P2=a11(좌하)
export const START = { 1: [0, 10], 2: [10, 0] }
export const TREASURES = [[0, 0], [5, 5], [10, 10]] // a1, f6, k11

export const COLOR_P1 = '#3A7BD5'
export const COLOR_P2 = '#E63946'
export const COLOR_DEALER = '#7E57C2'
export const COLOR_TREASURE = '#F4A41B'

export function key(r, c) { return r * SIZE + c }
export function unkey(k) { return [Math.floor(k / SIZE), k % SIZE] }
export function toId(r, c) { return String.fromCharCode(97 + c) + (r + 1) }
export function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE }
export function isTreasureCell(r, c) { return TREASURES.some(([tr, tc]) => tr === r && tc === c) }
export function isStartCell(r, c) { return (r === 0 && c === 10) || (r === 10 && c === 0) }

// 출발 코너에서 안쪽으로 N×N 사각 영역 (출발 포함)
// P1(k1, 우상): rows 0..N-1, cols (SIZE-N)..(SIZE-1)
// P2(a11, 좌하): rows (SIZE-N)..(SIZE-1), cols 0..N-1
export function isInOwnCornerQuadrant(player, r, c, size) {
  if (player === 1) {
    return r >= 0 && r < size && c >= SIZE - size && c < SIZE
  }
  return r >= SIZE - size && r < SIZE && c >= 0 && c < size
}

export function isMinePlacementAllowed(r, c) {
  if (!inBounds(r, c)) return false
  if (isTreasureCell(r, c)) return false
  if (isInOwnCornerQuadrant(1, r, c, MINE_FORBID_SIZE)) return false
  if (isInOwnCornerQuadrant(2, r, c, MINE_FORBID_SIZE)) return false
  return true
}

export const DIRS_8 = [
  [-1, -1], [-1, 0], [-1, 1],
  [ 0, -1],          [ 0, 1],
  [ 1, -1], [ 1, 0], [ 1, 1],
]

// 원작 룰: 점수 계산은 "주변 인접한 8칸" (착지 칸 제외)
export const ADJ_8 = DIRS_8

export function rollDie() { return 1 + Math.floor(Math.random() * 6) }

// 지뢰가 설치된 칸의 개수 (양 플레이어 합집합) — 원작 룰상 공개 정보
export function countMineCells(mines) {
  const merged = new Set()
  for (const k of mines[1]) merged.add(k)
  for (const k of mines[2]) merged.add(k)
  return merged.size
}

// 원작 룰: 지뢰 밟은 후 "출발지 주변 3칸 중 1칸으로 강제 이동"
// 코너 시작이라 인접 8방향 중 in-bounds는 3칸뿐. 상대 말 칸 제외.
export function getTeleportTargets(player, oppK) {
  const [sr, sc] = START[player]
  const cells = new Set()
  for (const [dr, dc] of DIRS_8) {
    const r = sr + dr, c = sc + dc
    if (!inBounds(r, c)) continue
    const k = key(r, c)
    if (k === oppK) continue
    cells.add(k)
  }
  return cells
}

export const MINE_SETUP_SECONDS = 600  // 원작: 10분 (지뢰 배치 제한)

// 이동 가능 칸 (Set<number>)
export function getMovableCells({ pieces, pendingTeleport }, player) {
  const myK = pieces[player]
  const oppK = pieces[player === 1 ? 2 : 1]
  if (pendingTeleport === player) {
    // 원작: 출발지 인접 3칸 강제 이동
    return getTeleportTargets(player, oppK)
  }
  const cells = new Set()
  const [mr, mc] = unkey(myK)
  for (const [dr, dc] of DIRS_8) {
    const nr = mr + dr, nc = mc + dc
    if (!inBounds(nr, nc)) continue
    const k = key(nr, nc)
    if (k === oppK) continue
    cells.add(k)
  }
  return cells
}

// 한 수 진행 — 새 상태 반환 (state는 변경하지 않음)
// state shape: { pieces, mines:{1:Set,2:Set}, scores, scoredCells:Set, treasures, treasureCount, pendingTeleport }
export function resolveMove(state, player, tk) {
  const next = {
    pieces: { ...state.pieces, [player]: tk },
    mines: { 1: new Set(state.mines[1]), 2: new Set(state.mines[2]) },
    scores: { ...state.scores },
    scoredCells: new Set(state.scoredCells),
    treasures: { ...state.treasures },
    treasureCount: state.treasureCount,
    pendingTeleport: null,
    event: null,
  }
  const [tr, tc] = unkey(tk)
  const isTreasureCellKey = (tk in next.treasures)
  const isFreeTreasure = isTreasureCellKey && next.treasures[tk] === null

  if (isFreeTreasure) {
    const order = next.treasureCount
    const pts = TREASURE_POINTS[order]
    next.scores[player] += pts
    next.treasures[tk] = { player, order: order + 1 }
    next.treasureCount = order + 1
    next.event = { type: 'treasure', player, points: pts, order: order + 1, cellId: toId(tr, tc) }
  } else if (isTreasureCellKey) {
    next.event = { type: 'treasure-empty', player, points: 0, cellId: toId(tr, tc) }
  } else if (next.mines[1].has(tk) || next.mines[2].has(tk)) {
    const minesHere = (next.mines[1].has(tk) ? 1 : 0) + (next.mines[2].has(tk) ? 1 : 0)
    next.scores[player] += MINE_PENALTY
    next.mines[1].delete(tk)
    next.mines[2].delete(tk)
    next.pendingTeleport = player
    next.event = { type: 'mine', player, mineCount: minesHere, penalty: MINE_PENALTY, cellId: toId(tr, tc) }
  } else {
    const already = next.scoredCells.has(tk)
    let cellScore = 0
    if (!already) {
      // 원작 룰: 주변 인접한 8칸 (착지 칸 제외) 지뢰 합산
      let count = 0
      for (const [dr, dc] of ADJ_8) {
        const nr = tr + dr, nc = tc + dc
        if (!inBounds(nr, nc)) continue
        const nk = key(nr, nc)
        if (next.mines[1].has(nk)) count++
        if (next.mines[2].has(nk)) count++
      }
      cellScore = count
      next.scoredCells.add(tk)
    }
    next.scores[player] += cellScore
    next.event = { type: 'score', player, points: cellScore, already, cellId: toId(tr, tc) }
  }
  return next
}

export function initialGameState() {
  return {
    pieces: { 1: key(0, 10), 2: key(10, 0) },
    mines: { 1: new Set(), 2: new Set() },
    scores: { 1: 0, 2: 0 },
    scoredCells: new Set(),
    treasures: { [key(0, 0)]: null, [key(5, 5)]: null, [key(10, 10)]: null },
    treasureCount: 0,
    pendingTeleport: null,
  }
}

// ────────────────────────────────────────────────────────────
// Firebase 직렬화 (Set은 array로, treasures 객체 → array 키 문자열로)
export function serializeForWire(state) {
  return {
    pieces: state.pieces,
    mines: { 1: [...state.mines[1]], 2: [...state.mines[2]] },
    scores: state.scores,
    scoredCells: [...state.scoredCells],
    treasures: state.treasures, // 객체 그대로 (키는 숫자 문자열로 자동 변환됨)
    treasureCount: state.treasureCount,
    pendingTeleport: state.pendingTeleport,
  }
}

export function deserializeFromWire(wire) {
  if (!wire) return initialGameState()
  // Firebase 객체 키는 문자열이므로 숫자로 변환
  const treasures = {}
  if (wire.treasures) {
    for (const k of Object.keys(wire.treasures)) {
      treasures[Number(k)] = wire.treasures[k]
    }
  } else {
    treasures[key(0, 0)] = null
    treasures[key(5, 5)] = null
    treasures[key(10, 10)] = null
  }
  return {
    pieces: wire.pieces || { 1: key(0, 10), 2: key(10, 0) },
    mines: {
      1: new Set(wire.mines?.[1] || []),
      2: new Set(wire.mines?.[2] || []),
    },
    scores: wire.scores || { 1: 0, 2: 0 },
    scoredCells: new Set(wire.scoredCells || []),
    treasures,
    treasureCount: wire.treasureCount || 0,
    pendingTeleport: wire.pendingTeleport || null,
  }
}
