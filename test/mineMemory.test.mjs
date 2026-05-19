// 망각의 지뢰 — 게임 로직 회귀 테스트
// 실행: node test/mineMemory.test.mjs
//
// MineMemory.jsx의 핵심 함수들을 인라인 복사해 5가지 시나리오를 검증한다.
// (UI 코드는 제외하고 순수 로직만 발췌)

const SIZE = 11
const MINES_PER_PLAYER = 15
const TREASURE_POINTS = [10, 15, 20]
const MINE_PENALTY = -5
const MINE_FORBID_SIZE = 2

const START = { 1: [0, 10], 2: [10, 0] }
const TREASURES = [[0, 0], [5, 5], [10, 10]]

function key(r, c) { return r * SIZE + c }
function unkey(k) { return [Math.floor(k / SIZE), k % SIZE] }
function toId(r, c) { return String.fromCharCode(97 + c) + (r + 1) }
function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE }
function isTreasureCell(r, c) { return TREASURES.some(([tr, tc]) => tr === r && tc === c) }

function isInOwnCornerQuadrant(player, r, c, size) {
  if (player === 1) {
    return r >= 0 && r < size && c >= SIZE - size && c < SIZE
  }
  return r >= SIZE - size && r < SIZE && c >= 0 && c < size
}

function isMinePlacementAllowed(r, c) {
  if (!inBounds(r, c)) return false
  if (isTreasureCell(r, c)) return false
  if (isInOwnCornerQuadrant(1, r, c, MINE_FORBID_SIZE)) return false
  if (isInOwnCornerQuadrant(2, r, c, MINE_FORBID_SIZE)) return false
  return true
}

const DIRS_8 = [
  [-1, -1], [-1, 0], [-1, 1],
  [ 0, -1],          [ 0, 1],
  [ 1, -1], [ 1, 0], [ 1, 1],
]

// 원작 룰: 인접 점수는 8칸 (착지 칸 제외)
const ADJ_8 = DIRS_8

// 원작 룰: 텔레포트는 출발지 인접 3칸 (코너 시작이라 in-bounds는 3개)
function getTeleportTargets(player, oppK) {
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

function countMineCells(mines) {
  const m = new Set()
  for (const k of mines[1]) m.add(k)
  for (const k of mines[2]) m.add(k)
  return m.size
}

function getMovableCells(state, player) {
  const myK = state.pieces[player]
  const oppK = state.pieces[player === 1 ? 2 : 1]
  if (state.pendingTeleport === player) {
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

// 한 수 진행 — state 복제 후 결과 적용
function resolveMove(state, player, tk) {
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
  const isTreasureCell_ = (tk in next.treasures)
  const isFreeTreasure = isTreasureCell_ && next.treasures[tk] === null

  if (isFreeTreasure) {
    const order = next.treasureCount
    const pts = TREASURE_POINTS[order]
    next.scores[player] += pts
    next.treasures[tk] = { player, order: order + 1 }
    next.treasureCount = order + 1
    next.event = { type: 'treasure', player, points: pts, order: order + 1, cellId: toId(tr, tc) }
  } else if (isTreasureCell_) {
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

// ────────────────────────────────────────────────────────────
let pass = 0
let fail = 0
const failures = []

function assert(name, cond, detail = '') {
  if (cond) {
    pass++
    console.log(`  ✓ ${name}`)
  } else {
    fail++
    failures.push(`${name} :: ${detail}`)
    console.log(`  ✗ ${name} :: ${detail}`)
  }
}

function makeInitialState(p1Mines = [], p2Mines = []) {
  return {
    pieces: { 1: key(0, 10), 2: key(10, 0) },
    mines: { 1: new Set(p1Mines), 2: new Set(p2Mines) },
    scores: { 1: 0, 2: 0 },
    scoredCells: new Set(),
    treasures: { [key(0, 0)]: null, [key(5, 5)]: null, [key(10, 10)]: null },
    treasureCount: 0,
    pendingTeleport: null,
  }
}

// ────────────────────────────────────────────────────────────
// 시나리오 1: 지뢰 배치 제약 검증
console.log('\n[Test 1] 지뢰 배치 제약')
{
  // 보물칸 금지
  assert('a1(보물) 배치 금지', !isMinePlacementAllowed(0, 0))
  assert('f6(보물) 배치 금지', !isMinePlacementAllowed(5, 5))
  assert('k11(보물) 배치 금지', !isMinePlacementAllowed(10, 10))

  // P1 출발 코너 (k1=[0,10]) 2×2: rows 0..1, cols 9..10 → (0,10),(0,9),(1,10),(1,9)
  assert('k1(P1 출발) 배치 금지', !isMinePlacementAllowed(0, 10))
  assert('j1 배치 금지', !isMinePlacementAllowed(0, 9))
  assert('k2 배치 금지', !isMinePlacementAllowed(1, 10))
  assert('j2 배치 금지', !isMinePlacementAllowed(1, 9))
  // 경계 바로 바깥
  assert('i1 배치 가능 (k1 코너 3×3 바깥)', isMinePlacementAllowed(0, 8))
  assert('k3 배치 가능 (k1 코너 3×3 바깥)', isMinePlacementAllowed(2, 10))

  // P2 출발 코너 (a11=[10,0]) 2×2: rows 9..10, cols 0..1
  assert('a11(P2 출발) 배치 금지', !isMinePlacementAllowed(10, 0))
  assert('b11 배치 금지', !isMinePlacementAllowed(10, 1))
  assert('a10 배치 금지', !isMinePlacementAllowed(9, 0))
  assert('b10 배치 금지', !isMinePlacementAllowed(9, 1))
  assert('c11 배치 가능 (a11 코너 3×3 바깥)', isMinePlacementAllowed(10, 2))
  assert('a9 배치 가능 (a11 코너 3×3 바깥)', isMinePlacementAllowed(8, 0))

  // 일반 중앙
  assert('e5 배치 가능', isMinePlacementAllowed(4, 4))
}

// ────────────────────────────────────────────────────────────
// 시나리오 2: 8방향 이동, 상대 말 차단
console.log('\n[Test 2] 이동 가능 칸')
{
  // P1 k1[0,10]에서 출발. 인접 8칸 중 보드 내 칸 = j1[0,9], k2[1,10], j2[1,9] (3칸)
  const s1 = makeInitialState()
  const move1 = getMovableCells(s1, 1)
  assert('P1 k1 → 보드 내 인접 3칸', move1.size === 3, `actual=${move1.size}`)
  assert('P1 → j1(0,9) 이동 가능', move1.has(key(0, 9)))
  assert('P1 → k2(1,10) 이동 가능', move1.has(key(1, 10)))
  assert('P1 → j2(1,9) 이동 가능', move1.has(key(1, 9)))

  // P2 a11[10,0]: 인접 b11, a10, b10 (3칸)
  const move2 = getMovableCells(s1, 2)
  assert('P2 a11 → 보드 내 인접 3칸', move2.size === 3)

  // 중앙에서 8방향
  const s2 = { ...s1, pieces: { 1: key(5, 5), 2: key(0, 0) } } // P1 f6, P2 a1
  const move3 = getMovableCells(s2, 1)
  assert('P1 f6 중앙 → 8방향', move3.size === 8, `actual=${move3.size}`)

  // 상대 말이 있으면 그 칸은 제외
  const s3 = { ...s1, pieces: { 1: key(5, 5), 2: key(5, 6) } } // P1 f6, P2 g6
  const move4 = getMovableCells(s3, 1)
  assert('P1 f6, 상대 g6 → 7칸 (상대칸 제외)', move4.size === 7)
  assert('g6 (상대) 이동 불가', !move4.has(key(5, 6)))
}

// ────────────────────────────────────────────────────────────
// 시나리오 3: 점수 계산 (인접 3×3 지뢰 합산, 같은 칸 중복 방지)
console.log('\n[Test 3] 점수 계산')
{
  // P1 지뢰 e5, e6, e7 (cols 4, rows 4..6은 col=4임에 주의 — [r,c] 표기)
  // 점수 계산할 칸: f6[5,5]. 인접 3×3에 위 3개 지뢰가 모두 포함
  // e5=[4,4], e6=[5,4], e7=[6,4] — 보물칸 f6 인접 → 3개 카운트
  // 단 f6은 보물칸이라 점수 계산 적용 안 됨. 다른 칸 테스트.
  // d6[5,3] 주변: c5[4,2], c6[5,2], c7[6,2], d5[4,3], d7[6,3], e5[4,4], e6[5,4], e7[6,4]
  // 그 중 우리 지뢰 e5, e6, e7 모두 인접 → 3개
  const s = makeInitialState([key(4, 4), key(5, 4), key(6, 4)], [])
  // P1를 d6 옆으로 이동시키려면 멀어서 못 가니, 직접 resolveMove 호출
  // P1이 d6=[5,3]에 이동했다고 가정. 사실 P1 시작 k1[0,10]에서 d6까지 한 수 이동 불가.
  // 직접 pieces를 e6 옆에 미리 두자.
  s.pieces[1] = key(5, 2) // P1 c6 (인접 시작점 시뮬레이션)
  const r1 = resolveMove(s, 1, key(5, 3)) // d6으로 이동
  assert('d6 착지 → 인접 지뢰 3개 점수', r1.event.type === 'score' && r1.event.points === 3, JSON.stringify(r1.event))
  assert('P1 점수 = 3', r1.scores[1] === 3)

  // 같은 칸 두 번째 = 0점
  r1.pieces[2] = key(5, 2) // P2도 c6에 두고
  const r2 = resolveMove(r1, 2, key(5, 3))
  assert('같은 d6 두 번째 착지 → 0점', r2.event.type === 'score' && r2.event.points === 0 && r2.event.already === true)
  assert('P2 점수 = 0', r2.scores[2] === 0)

  // 한 칸에 양쪽 지뢰 2개 = 합산 카운트
  const s2 = makeInitialState([key(5, 5)], [key(5, 5)]) // f6에 양쪽 지뢰 (사실 보물칸이라 실제 게임선 안 됨, 인접 로직만 검증)
  // 인접 점수 검증을 위해 e6[5,4] 착지로 → 인접에 f6 하나만, 양쪽 합 2
  s2.pieces[1] = key(4, 4)
  const r3 = resolveMove(s2, 1, key(5, 4))
  assert('한 칸 양쪽 지뢰 2개 합산 카운트', r3.event.points >= 2, `points=${r3.event.points}`)

  // 지뢰 점유 셀 개수 (양 플레이어 합집합)
  const sCount = makeInitialState(
    [key(3, 3), key(4, 4), key(5, 5)],   // P1 3개
    [key(4, 4), key(6, 6)],              // P2 2개, 그 중 4,4는 중복
  )
  assert('지뢰 점유 셀 개수 = 합집합 크기 (4)', countMineCells(sCount.mines) === 4)
}

// ────────────────────────────────────────────────────────────
// 시나리오 4: 지뢰 밟기 → 패널티, 제거, 텔레포트 활성화
console.log('\n[Test 4] 지뢰 밟기')
{
  // P2 지뢰가 [5,5] 인근... 단 보물칸 아닌 곳. 한 칸 지뢰 e6=[5,4]
  const s = makeInitialState([], [key(5, 4)])
  s.pieces[1] = key(4, 4) // P1 e5
  const r = resolveMove(s, 1, key(5, 4))
  assert('지뢰 밟음 이벤트', r.event.type === 'mine')
  assert('-5점 적용', r.event.penalty === -5 && r.scores[1] === -5)
  assert('지뢰 제거됨', !r.mines[2].has(key(5, 4)))
  assert('텔레포트 대기 활성', r.pendingTeleport === 1)

  // 양쪽 지뢰 같은 칸에 있을 때 모두 제거
  const s2 = makeInitialState([key(5, 4)], [key(5, 4)])
  s2.pieces[1] = key(4, 4)
  const r2 = resolveMove(s2, 1, key(5, 4))
  assert('양쪽 지뢰 2개 모두 제거', !r2.mines[1].has(key(5, 4)) && !r2.mines[2].has(key(5, 4)))
  assert('-5점 (개수 무관 고정)', r2.scores[1] === -5)

  // 원작 룰: 텔레포트는 출발지 인접 3칸 (P1 k1[0,10]의 인접 in-bounds: j1[0,9], k2[1,10], j2[1,9])
  r.pieces[2] = key(10, 0) // P2 a11에 그대로 (P1 텔레포트에 영향 없음)
  const tele = getMovableCells(r, 1)
  assert('텔레포트 영역 3칸 (출발지 인접 in-bounds)', tele.size === 3, `actual=${tele.size}`)
  assert('텔레포트 후보 j1', tele.has(key(0, 9)))
  assert('텔레포트 후보 k2', tele.has(key(1, 10)))
  assert('텔레포트 후보 j2', tele.has(key(1, 9)))

  // 상대 말이 출발지 인접에 있으면 그 칸 제외
  const s3 = makeInitialState([], [key(5, 4)])
  s3.pieces[1] = key(4, 4)
  s3.pieces[2] = key(0, 9) // P2가 P1 출발 인접 j1에 있음
  const r3 = resolveMove(s3, 1, key(5, 4))
  // 텔레포트 가능 칸 직접 확인: 상대가 j1 점유 → 2칸만 남음
  r3.pieces[2] = key(0, 9)
  const tele2 = getMovableCells(r3, 1)
  assert('상대가 점유한 텔레포트 칸 제외 (j1 빠지고 2칸)', tele2.size === 2 && !tele2.has(key(0, 9)))
}

// ────────────────────────────────────────────────────────────
// 시나리오 5: 보물 획득 순서와 종료
console.log('\n[Test 5] 보물 획득 & 게임 종료')
{
  // P1이 a1으로 이동(첫 보물 10점)
  const s = makeInitialState()
  s.pieces[1] = key(0, 1) // P1 b1 (a1 인접)
  const r1 = resolveMove(s, 1, key(0, 0))
  assert('첫 보물 a1 → +10점', r1.event.type === 'treasure' && r1.event.points === 10 && r1.event.order === 1)
  assert('보물 1개 카운트', r1.treasureCount === 1)
  assert('a1 더 이상 free 아님', r1.treasures[key(0, 0)] !== null)

  // 같은 a1에 P2가 가도 빈 보물칸 (0점)
  r1.pieces[2] = key(0, 1)
  const r2 = resolveMove(r1, 2, key(0, 0))
  assert('이미 획득된 보물칸 → 점수 없음', r2.event.type === 'treasure-empty' && r2.scores[2] === 0)

  // 두번째 보물 f6 → 15점
  r2.pieces[2] = key(5, 4)
  const r3 = resolveMove(r2, 2, key(5, 5))
  assert('둘째 보물 f6 → +15점', r3.event.type === 'treasure' && r3.event.points === 15 && r3.event.order === 2)

  // 세번째 보물 k11 → 20점 (P1)
  r3.pieces[1] = key(10, 9)
  const r4 = resolveMove(r3, 1, key(10, 10))
  assert('셋째 보물 k11 → +20점', r4.event.type === 'treasure' && r4.event.points === 20 && r4.event.order === 3)
  assert('보물 3개 → 게임 종료 조건', r4.treasureCount === 3)
  assert('P1 점수 = 10 + 20 = 30', r4.scores[1] === 30)
  assert('P2 점수 = 15', r4.scores[2] === 15)
}

// ────────────────────────────────────────────────────────────
// 시나리오 6 (보너스): Firebase 직렬화 라운드트립 — 온라인 모드용
console.log('\n[Test 6] 직렬화 라운드트립 (온라인 모드 wire 포맷)')
{
  // mineMemoryLogic에서 임포트
  const mod = await import('../src/utils/mineMemoryLogic.js')
  const original = mod.initialGameState()
  original.mines[1].add(key(3, 3))
  original.mines[1].add(key(4, 4))
  original.mines[2].add(key(5, 5))
  original.scoredCells.add(key(6, 6))
  original.treasures[key(0, 0)] = { player: 1, order: 1 }
  original.treasureCount = 1
  original.scores[1] = 10
  original.pendingTeleport = 2

  const wire = mod.serializeForWire(original)
  // Firebase는 JSON-serializable해야 함
  const cloned = JSON.parse(JSON.stringify(wire))
  const back = mod.deserializeFromWire(cloned)

  assert('mines.1 Set 복원', back.mines[1].size === 2 && back.mines[1].has(key(3, 3)) && back.mines[1].has(key(4, 4)))
  assert('mines.2 Set 복원', back.mines[2].size === 1 && back.mines[2].has(key(5, 5)))
  assert('scoredCells Set 복원', back.scoredCells.has(key(6, 6)))
  assert('treasures 객체 키 숫자 복원', back.treasures[key(0, 0)]?.order === 1)
  assert('treasureCount 보존', back.treasureCount === 1)
  assert('scores 보존', back.scores[1] === 10)
  assert('pendingTeleport 보존', back.pendingTeleport === 2)
  assert('pieces 보존', back.pieces[1] === key(0, 10) && back.pieces[2] === key(10, 0))
}

console.log(`\n결과: ${pass} 통과 / ${fail} 실패`)
if (fail > 0) {
  console.log('\n실패 항목:')
  failures.forEach(f => console.log('  -', f))
  process.exit(1)
}
process.exit(0)
