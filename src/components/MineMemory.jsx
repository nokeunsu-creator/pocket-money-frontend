// 망각의 지뢰 (Mines of Oblivion) — 2인 패스앤플레이 기억력 보드게임
// 룰:
//   - 11×11 보드. a1, f6, k11에 보물 3개.
//   - P1 시작 k1(우상), P2 시작 a11(좌하).
//   - 각자 지뢰 15개를 히든으로 배치 (출발지 5×5 내, 보물칸 금지).
//   - 8방향 한 칸 이동. 상대 말이 있는 칸 이동 불가.
//   - 착지 결과:
//     1) 보물칸: 10/15/20점 (획득 순서). 보물 사라짐.
//     2) 지뢰칸: -5점, 지뢰 모두 제거, 다음 턴 출발지 9×9 내로 텔레포트.
//     3) 일반칸: 3×3 인접 지뢰 수 점수. 같은 칸 두 번째부터는 0점.
//   - 보물 3개 모두 획득되면 종료. 점수 높은 사람 승리.

import { useState, useCallback, useMemo } from 'react'
import { useViewportWidth } from '../utils/useViewportWidth'

const SIZE = 11
const MINES_PER_PLAYER = 15
const TREASURE_POINTS = [10, 15, 20]
const MINE_PENALTY = -5
const MINE_FORBID_SIZE = 2  // 출발 코너 안쪽 2×2 (4칸) 지뢰 금지
const TELEPORT_SIZE = 4     // 지뢰 밟은 후 출발 코너 안쪽 4×4 (16칸) 텔레포트

const START = { 1: [0, 10], 2: [10, 0] } // P1=k1(우상), P2=a11(좌하)
const TREASURES = [[0, 0], [5, 5], [10, 10]] // a1, f6, k11

const COLOR_P1 = '#3A7BD5' // 파랑
const COLOR_P2 = '#E63946' // 빨강
const COLOR_TREASURE = '#F4A41B'
const COLOR_MINE = '#2C3E50'

// 좌표 헬퍼
function key(r, c) { return r * SIZE + c }
function unkey(k) { return [Math.floor(k / SIZE), k % SIZE] }
function toId(r, c) { return String.fromCharCode(97 + c) + (r + 1) }
function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE }
function cheby(r1, c1, r2, c2) { return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2)) }
function isTreasureCell(r, c) { return TREASURES.some(([tr, tc]) => tr === r && tc === c) }
function isStartCell(r, c) { return (r === 0 && c === 10) || (r === 10 && c === 0) }

// 출발 코너에서 안쪽으로 N×N 사각 영역 여부 (출발칸 포함)
// P1(k1, 우상): rows 0..N-1, cols 11-N..10
// P2(a11, 좌하): rows 11-N..10, cols 0..N-1
function isInOwnCornerQuadrant(player, r, c, size) {
  if (player === 1) {
    return r >= 0 && r < size && c >= SIZE - size && c < SIZE
  }
  return r >= SIZE - size && r < SIZE && c >= 0 && c < size
}

function isMinePlacementAllowed(r, c) {
  if (!inBounds(r, c)) return false
  if (isTreasureCell(r, c)) return false
  // 양쪽 출발 코너의 2×2 사각 영역에는 지뢰 금지
  if (isInOwnCornerQuadrant(1, r, c, MINE_FORBID_SIZE)) return false
  if (isInOwnCornerQuadrant(2, r, c, MINE_FORBID_SIZE)) return false
  return true
}

const DIRS_8 = [
  [-1, -1], [-1, 0], [-1, 1],
  [ 0, -1],          [ 0, 1],
  [ 1, -1], [ 1, 0], [ 1, 1],
]

const ADJ_3X3 = []
for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) ADJ_3X3.push([dr, dc])

function rollDie() { return 1 + Math.floor(Math.random() * 6) }

// ────────────────────────────────────────────────────────────
// 메인 컴포넌트
export default function MineMemory({ onBack }) {
  // 페이즈: intro → setup-1 → handoff-1 → setup-2 → handoff-2 → roll → play → end
  const [phase, setPhase] = useState('intro')

  // 지뢰
  const [mines, setMines] = useState({ 1: new Set(), 2: new Set() })
  // 셋업 임시 상태
  const [setupMines, setSetupMines] = useState(new Set())

  // 보물: 키 → null (남음) | { player, order }
  const [treasures, setTreasures] = useState({
    [key(0, 0)]: null,
    [key(5, 5)]: null,
    [key(10, 10)]: null,
  })
  const [treasureCount, setTreasureCount] = useState(0)

  // 말, 점수, 진행 상태
  const [pieces, setPieces] = useState({ 1: key(0, 10), 2: key(10, 0) })
  const [scores, setScores] = useState({ 1: 0, 2: 0 })
  const [scoredCells, setScoredCells] = useState(new Set())
  const [currentPlayer, setCurrentPlayer] = useState(1)
  const [pendingTeleport, setPendingTeleport] = useState(null)
  const [selected, setSelected] = useState(false) // 자기 말 선택됨
  const [lastMove, setLastMove] = useState(null) // key

  // 결과 모달
  const [event, setEvent] = useState(null)

  // 주사위 (선공 결정)
  const [dice, setDice] = useState({ 1: null, 2: null, who: 1, animating: false })

  const vw = useViewportWidth()
  const cellSize = Math.max(24, Math.min(36, Math.floor((Math.min(vw, 520) - 28) / SIZE)))

  // ── 셋업: 지뢰 토글 ────────────────────────────────
  const toggleSetupMine = useCallback((k) => {
    const [r, c] = unkey(k)
    if (!isMinePlacementAllowed(r, c)) return
    setSetupMines(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else if (next.size < MINES_PER_PLAYER) next.add(k)
      return next
    })
  }, [])

  const submitSetup = useCallback((player) => {
    if (setupMines.size !== MINES_PER_PLAYER) return
    setMines(prev => ({ ...prev, [player]: new Set(setupMines) }))
    setSetupMines(new Set())
    if (player === 1) setPhase('handoff-1')
    else setPhase('handoff-2')
  }, [setupMines])

  const resetSetup = useCallback(() => setSetupMines(new Set()), [])

  // ── 주사위 굴리기 ────────────────────────────────
  const rollDice = useCallback((who) => {
    if (dice.animating) return
    setDice(d => ({ ...d, animating: true }))
    // 간단한 애니메이션: 200ms 동안 무작위 값 표시 후 확정
    let ticks = 0
    const iv = setInterval(() => {
      ticks++
      setDice(d => ({ ...d, [who]: rollDie() }))
      if (ticks >= 8) {
        clearInterval(iv)
        const final = rollDie()
        setDice(d => {
          const next = { ...d, [who]: final, animating: false }
          if (who === 1) next.who = 2
          return next
        })
      }
    }, 60)
  }, [dice.animating])

  const resetRoll = useCallback(() => {
    setDice({ 1: null, 2: null, who: 1, animating: false })
  }, [])

  const confirmFirstPlayer = useCallback(() => {
    const winner = dice[1] > dice[2] ? 1 : 2
    setCurrentPlayer(winner)
    setPhase('play')
  }, [dice])

  // ── 이동 가능 칸 계산 ────────────────────────────────
  const movableCells = useMemo(() => {
    if (phase !== 'play' || !selected || event) return null
    const cells = new Set()
    const myK = pieces[currentPlayer]
    const oppK = pieces[currentPlayer === 1 ? 2 : 1]
    const [mr, mc] = unkey(myK)

    if (pendingTeleport === currentPlayer) {
      // 텔레포트: 본인 출발 코너에서 안쪽으로 4×4 사각 영역 어디든
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (!isInOwnCornerQuadrant(currentPlayer, r, c, TELEPORT_SIZE)) continue
          const k = key(r, c)
          if (k === oppK) continue
          if (k === myK) continue
          cells.add(k)
        }
      }
    } else {
      // 일반 이동: 인접 8칸
      for (const [dr, dc] of DIRS_8) {
        const nr = mr + dr, nc = mc + dc
        if (!inBounds(nr, nc)) continue
        const k = key(nr, nc)
        if (k === oppK) continue
        cells.add(k)
      }
    }
    return cells
  }, [phase, selected, pieces, currentPlayer, pendingTeleport, event])

  // ── 이동 실행 ────────────────────────────────
  const moveTo = useCallback((tk) => {
    if (!movableCells || !movableCells.has(tk)) return
    const [tr, tc] = unkey(tk)
    const player = currentPlayer
    const opp = player === 1 ? 2 : 1

    const newMines = { 1: new Set(mines[1]), 2: new Set(mines[2]) }
    const newScores = { ...scores }
    const newScoredCells = new Set(scoredCells)
    const newTreasures = { ...treasures }
    let newTreasureCount = treasureCount
    let newPendingTeleport = null
    let evt = null

    const isTreasureCell_ = (tk in newTreasures)
    const isFreeTreasure = isTreasureCell_ && newTreasures[tk] === null
    if (isFreeTreasure) {
      const order = newTreasureCount
      const pts = TREASURE_POINTS[order]
      newScores[player] += pts
      newTreasures[tk] = { player, order: order + 1 }
      newTreasureCount = order + 1
      evt = { type: 'treasure', player, points: pts, order: order + 1, cellId: toId(tr, tc) }
    } else if (isTreasureCell_) {
      // 이미 획득된 보물칸 — 점수 없음 (보물칸은 보물만)
      evt = { type: 'treasure-empty', player, cellId: toId(tr, tc) }
    } else if (newMines[1].has(tk) || newMines[2].has(tk)) {
      const minesHere = (newMines[1].has(tk) ? 1 : 0) + (newMines[2].has(tk) ? 1 : 0)
      newScores[player] += MINE_PENALTY
      newMines[1].delete(tk)
      newMines[2].delete(tk)
      newPendingTeleport = player
      evt = { type: 'mine', player, mineCount: minesHere, penalty: MINE_PENALTY, cellId: toId(tr, tc) }
    } else {
      let cellScore = 0
      const already = newScoredCells.has(tk)
      if (!already) {
        let count = 0
        for (const [dr, dc] of ADJ_3X3) {
          const nr = tr + dr, nc = tc + dc
          if (!inBounds(nr, nc)) continue
          const nk = key(nr, nc)
          if (newMines[1].has(nk)) count++
          if (newMines[2].has(nk)) count++
        }
        cellScore = count
        newScoredCells.add(tk)
      }
      newScores[player] += cellScore
      evt = { type: 'score', player, points: cellScore, already, cellId: toId(tr, tc) }
    }

    setPieces(prev => ({ ...prev, [player]: tk }))
    setMines(newMines)
    setScores(newScores)
    setScoredCells(newScoredCells)
    setTreasures(newTreasures)
    setTreasureCount(newTreasureCount)
    setPendingTeleport(newPendingTeleport)
    setLastMove(tk)
    setSelected(false)
    setEvent(evt)
  }, [movableCells, currentPlayer, mines, scores, scoredCells, treasures, treasureCount])

  const dismissEvent = useCallback(() => {
    setEvent(null)
    if (treasureCount >= 3) {
      setPhase('end')
      return
    }
    setCurrentPlayer(p => (p === 1 ? 2 : 1))
  }, [treasureCount])

  const restart = useCallback(() => {
    setPhase('intro')
    setMines({ 1: new Set(), 2: new Set() })
    setSetupMines(new Set())
    setTreasures({ [key(0, 0)]: null, [key(5, 5)]: null, [key(10, 10)]: null })
    setTreasureCount(0)
    setPieces({ 1: key(0, 10), 2: key(10, 0) })
    setScores({ 1: 0, 2: 0 })
    setScoredCells(new Set())
    setCurrentPlayer(1)
    setPendingTeleport(null)
    setSelected(false)
    setLastMove(null)
    setEvent(null)
    setDice({ 1: null, 2: null, who: 1, animating: false })
  }, [])

  // ────────────────────────────────────────────────────────────
  // 렌더 분기
  if (phase === 'intro') return <IntroScreen onBack={onBack} onStart={() => setPhase('setup-1')} />
  if (phase === 'setup-1') return (
    <SetupScreen
      player={1}
      mines={setupMines}
      toggleMine={toggleSetupMine}
      onSubmit={() => submitSetup(1)}
      onReset={resetSetup}
      onBack={() => setPhase('intro')}
      cellSize={cellSize}
    />
  )
  if (phase === 'handoff-1') return (
    <HandoffScreen
      title="📱 2P에게 폰을 넘겨주세요"
      sub="1P는 화면을 보지 마세요"
      next="2P 시작"
      onNext={() => setPhase('setup-2')}
    />
  )
  if (phase === 'setup-2') return (
    <SetupScreen
      player={2}
      mines={setupMines}
      toggleMine={toggleSetupMine}
      onSubmit={() => submitSetup(2)}
      onReset={resetSetup}
      onBack={() => setPhase('intro')}
      cellSize={cellSize}
    />
  )
  if (phase === 'handoff-2') return (
    <HandoffScreen
      title="📱 폰을 가운데 놓고 둘 다 보세요"
      sub="이제 주사위로 선공을 정합니다"
      next="주사위 굴리러 가기"
      onNext={() => setPhase('roll')}
    />
  )
  if (phase === 'roll') return (
    <RollScreen
      dice={dice}
      onRoll={rollDice}
      onConfirm={confirmFirstPlayer}
      onReset={resetRoll}
    />
  )
  if (phase === 'end') return (
    <EndScreen
      scores={scores}
      treasures={treasures}
      mines={mines}
      cellSize={cellSize}
      onRestart={restart}
      onBack={onBack}
    />
  )

  // play
  return (
    <PlayScreen
      cellSize={cellSize}
      pieces={pieces}
      treasures={treasures}
      treasureCount={treasureCount}
      scores={scores}
      scoredCells={scoredCells}
      currentPlayer={currentPlayer}
      pendingTeleport={pendingTeleport}
      selected={selected}
      setSelected={setSelected}
      movableCells={movableCells}
      lastMove={lastMove}
      event={event}
      onMove={moveTo}
      onDismissEvent={dismissEvent}
      onBack={onBack}
    />
  )
}

// ────────────────────────────────────────────────────────────
// 인트로 (룰 설명)
function IntroScreen({ onBack, onStart }) {
  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 12 }}>
        ← 돌아가기
      </button>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 56, marginBottom: 6 }}>💣</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #7E57C2, #E63946)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          망각의 지뢰
        </h2>
        <p style={{ fontSize: 13, color: '#888', marginTop: 6 }}>11×11 · 2인 패스앤플레이 · 기억력 보드</p>
      </div>

      <RuleCard icon="🧠" title="지뢰는 본인만 기억합니다" body="각자 지뢰 15개를 보드에 숨기고, 위치는 머릿속에 기억해야 해요. 화면엔 지뢰가 보이지 않아요." />
      <RuleCard icon="♟️" title="한 칸씩 8방향 이동" body="자기 차례에 상하좌우·대각선 한 칸 이동. 상대 말이 있는 칸은 못 가요." />
      <RuleCard icon="🎯" title="점수: 인접 9칸의 지뢰 수" body="이동한 칸 주변 3×3에 지뢰가 몇 개 있는지가 점수예요. 두 사람 지뢰 모두 합산하고, 같은 칸 두 번째부터는 0점." />
      <RuleCard icon="💥" title="지뢰 밟으면 -5점" body="내 지뢰든 상대 지뢰든 -5점. 지뢰는 사라지고, 다음 턴엔 출발 코너 4×4 영역으로 텔레포트해야 해요." />
      <RuleCard icon="💎" title="보물 a1·f6·k11" body="첫 보물 10점, 둘째 15점, 셋째 20점. 3개 다 획득되면 게임 종료." />

      <button onClick={onStart} style={primaryBtn('#7E57C2')}>
        ▶ 시작
      </button>
    </div>
  )
}

function RuleCard({ icon, title, body }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: 12, background: '#FAFAFA', borderRadius: 12, marginBottom: 8, alignItems: 'flex-start' }}>
      <div style={{ fontSize: 24, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{body}</div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// 셋업 화면
function SetupScreen({ player, mines, toggleMine, onSubmit, onReset, onBack, cellSize }) {
  const color = player === 1 ? COLOR_P1 : COLOR_P2
  const startK = player === 1 ? key(0, 10) : key(10, 0)
  return (
    <div className="fade-in" style={{ maxWidth: 520, margin: '0 auto', padding: '0.5rem' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 14, color: 'var(--gray)', cursor: 'pointer', marginBottom: 6 }}>
        ← 처음으로
      </button>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ display: 'inline-block', padding: '4px 14px', background: color, color: '#fff', borderRadius: 999, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
          {player}P 지뢰 배치
        </div>
        <div style={{ fontSize: 13, color: '#666' }}>
          빈 칸을 탭해서 지뢰 15개를 숨겨두세요.<br/>
          <b style={{ color: '#E63946' }}>위치는 머릿속에만 — 화면엔 게임 중 안 보입니다!</b>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F8F4FF', borderRadius: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 14 }}>
          배치: <b style={{ color, fontSize: 18 }}>{mines.size}</b> / {MINES_PER_PLAYER}
        </div>
        <button onClick={onReset} style={{ background: 'none', border: '1px solid #DDD', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#666', cursor: 'pointer' }}>
          ↺ 초기화
        </button>
      </div>

      <BoardGrid
        cellSize={cellSize}
        renderCell={(r, c) => {
          const k = key(r, c)
          const allowed = isMinePlacementAllowed(r, c)
          const placed = mines.has(k)
          const isStart = isStartCell(r, c)
          const isTr = isTreasureCell(r, c)
          let bg = '#FFF'
          if (!allowed) bg = '#EAE6F0'
          if (isTr) bg = '#FFF4D6'
          if (isStart) bg = k === startK ? color + '22' : '#F0F0F0'
          return (
            <div
              key={k}
              onClick={() => allowed && toggleMine(k)}
              style={{
                width: cellSize, height: cellSize, boxSizing: 'border-box',
                border: '1px solid #DDD', background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: cellSize * 0.5, cursor: allowed ? 'pointer' : 'not-allowed',
                userSelect: 'none',
                position: 'relative',
              }}
            >
              {isTr && !placed && <span style={{ fontSize: cellSize * 0.55 }}>💎</span>}
              {isStart && !placed && (
                <span style={{ fontSize: cellSize * 0.5, fontWeight: 800, color: k === startK ? color : '#999' }}>
                  {k === key(0, 10) ? '①' : '②'}
                </span>
              )}
              {placed && <span style={{ fontSize: cellSize * 0.6 }}>💣</span>}
            </div>
          )
        }}
      />

      <div style={{ fontSize: 11, color: '#888', marginTop: 8, lineHeight: 1.6 }}>
        ※ <span style={{ background: '#EAE6F0', padding: '0 6px' }}>회색</span> = 출발지 근처(설치 불가)<br/>
        ※ <span style={{ background: '#FFF4D6', padding: '0 6px' }}>💎</span> = 보물칸(설치 불가)
      </div>

      <button
        onClick={onSubmit}
        disabled={mines.size !== MINES_PER_PLAYER}
        style={primaryBtn(color, mines.size !== MINES_PER_PLAYER)}
      >
        {mines.size === MINES_PER_PLAYER ? '✓ 제출' : `${MINES_PER_PLAYER - mines.size}개 더 배치`}
      </button>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// 핸드오프 (폰 넘기기)
function HandoffScreen({ title, sub, next, onNext }) {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '2rem 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>📱</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>{title}</h2>
      <p style={{ fontSize: 14, color: '#666', marginBottom: 32 }}>{sub}</p>
      <button onClick={onNext} style={{ ...primaryBtn('#7E57C2'), maxWidth: 280 }}>
        {next}
      </button>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// 주사위 (선공 결정)
function RollScreen({ dice, onRoll, onConfirm, onReset }) {
  const both = dice[1] != null && dice[2] != null && !dice.animating
  const tie = both && dice[1] === dice[2]
  const winner = both && !tie ? (dice[1] > dice[2] ? 1 : 2) : null

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem', textAlign: 'center' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>🎲 선공 결정</h2>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>높은 숫자가 먼저 둡니다.</p>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
        <PlayerDie player={1} value={dice[1]} active={dice.who === 1 && dice[1] == null} onRoll={() => onRoll(1)} animating={dice.animating && dice.who === 1} />
        <PlayerDie player={2} value={dice[2]} active={dice.who === 2 && dice[2] == null} onRoll={() => onRoll(2)} animating={dice.animating && dice.who === 2} />
      </div>

      {both && tie && (
        <div style={{ padding: 14, background: '#FFF4D6', borderRadius: 10, marginBottom: 12, fontSize: 14 }}>
          😯 동률! 다시 굴려주세요.
          <button onClick={onReset} style={{ display: 'block', margin: '8px auto 0', padding: '6px 16px', background: '#F4A41B', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13 }}>
            다시 굴리기
          </button>
        </div>
      )}

      {winner && (
        <>
          <div style={{ padding: 14, background: winner === 1 ? '#E8F0FE' : '#FFE8EA', borderRadius: 10, marginBottom: 12, fontSize: 15, fontWeight: 700, color: winner === 1 ? COLOR_P1 : COLOR_P2 }}>
            🏁 {winner}P 선공!
          </div>
          <button onClick={onConfirm} style={primaryBtn('#7E57C2')}>
            게임 시작
          </button>
        </>
      )}
    </div>
  )
}

function PlayerDie({ player, value, active, onRoll, animating }) {
  const color = player === 1 ? COLOR_P1 : COLOR_P2
  return (
    <div style={{ flex: 1, maxWidth: 160 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 6 }}>{player}P</div>
      <button
        onClick={onRoll}
        disabled={!active}
        style={{
          width: '100%', aspectRatio: '1/1', maxWidth: 120,
          margin: '0 auto', display: 'block',
          background: value == null ? '#F8F8F8' : '#FFF',
          border: `3px solid ${value == null ? '#DDD' : color}`,
          borderRadius: 16,
          fontSize: 48, fontWeight: 800, color,
          cursor: active ? 'pointer' : 'default',
          boxShadow: active ? `0 4px 12px ${color}44` : 'none',
          transform: animating ? 'rotate(15deg) scale(1.05)' : 'rotate(0) scale(1)',
          transition: 'transform 0.08s ease-out',
        }}
      >
        {value == null ? '?' : value}
      </button>
      {active && !animating && <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>탭해서 굴리기</div>}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// 본 게임
function PlayScreen({
  cellSize, pieces, treasures, treasureCount, scores, scoredCells,
  currentPlayer, pendingTeleport, selected, setSelected, movableCells, lastMove,
  event, onMove, onDismissEvent, onBack,
}) {
  const myK = pieces[currentPlayer]
  const oppK = pieces[currentPlayer === 1 ? 2 : 1]
  const myColor = currentPlayer === 1 ? COLOR_P1 : COLOR_P2
  const treasuresLeft = 3 - treasureCount

  const handleCellTap = (k) => {
    if (event) return
    if (k === myK) {
      setSelected(s => !s)
      return
    }
    if (selected && movableCells && movableCells.has(k)) {
      onMove(k)
    }
  }

  return (
    <div className="fade-in" style={{ maxWidth: 520, margin: '0 auto', padding: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 14, color: 'var(--gray)', cursor: 'pointer' }}>← 나가기</button>
        <div style={{ fontSize: 12, color: '#888' }}>💎 남은 보물 {treasuresLeft}/3</div>
      </div>

      {/* 점수 헤더 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <ScoreCard player={1} score={scores[1]} active={currentPlayer === 1} />
        <ScoreCard player={2} score={scores[2]} active={currentPlayer === 2} />
      </div>

      {/* 차례 안내 */}
      <div style={{
        padding: '8px 12px', borderRadius: 10, marginBottom: 8,
        background: myColor + '15', border: `1px solid ${myColor}44`,
        fontSize: 13, textAlign: 'center', fontWeight: 600, color: myColor,
      }}>
        {pendingTeleport === currentPlayer
          ? `🚀 ${currentPlayer}P · 지뢰를 밟았어요. 출발 코너 4×4 안 어디로든 이동하세요`
          : selected
          ? `${currentPlayer}P · 이동할 칸을 탭하세요 (다시 자기 말 탭하면 취소)`
          : `${currentPlayer}P 차례 · 본인 말을 탭하세요`}
      </div>

      <BoardGrid
        cellSize={cellSize}
        renderCell={(r, c) => {
          const k = key(r, c)
          const isP1 = pieces[1] === k
          const isP2 = pieces[2] === k
          const isMine = k === myK
          const trState = treasures[k]
          const hasFreeTreasure = trState !== undefined && trState === null
          const usedTreasure = trState !== undefined && trState !== null
          const isMovable = selected && movableCells && movableCells.has(k)
          const isLast = lastMove === k
          const isScored = scoredCells.has(k)

          let bg = '#FFF'
          if (hasFreeTreasure) bg = '#FFF4D6'
          if (usedTreasure) bg = '#F4ECDC'
          if (isScored && !isP1 && !isP2 && !hasFreeTreasure) bg = '#F5F5F5'
          if (isLast && !isP1 && !isP2) bg = '#FFFBE0'

          let border = '1px solid #DDD'
          if (isMovable) border = '2px solid #4CAF50'
          if (isMine && selected) border = '2px solid ' + myColor

          return (
            <div
              key={k}
              onClick={() => handleCellTap(k)}
              style={{
                width: cellSize, height: cellSize, boxSizing: 'border-box',
                border, background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: cellSize * 0.55,
                cursor: 'pointer', userSelect: 'none', position: 'relative',
                transition: 'background 0.15s, border 0.1s',
              }}
            >
              {isP1 && <PieceIcon player={1} size={cellSize * 0.7} />}
              {isP2 && <PieceIcon player={2} size={cellSize * 0.7} />}
              {!isP1 && !isP2 && hasFreeTreasure && <span style={{ filter: 'drop-shadow(0 0 4px #F4A41B88)' }}>💎</span>}
              {!isP1 && !isP2 && usedTreasure && <span style={{ opacity: 0.35, fontSize: cellSize * 0.5 }}>💎</span>}
              {isMovable && !isP1 && !isP2 && !hasFreeTreasure && !usedTreasure && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF50', opacity: 0.7 }} />
              )}
              {isScored && !isP1 && !isP2 && !hasFreeTreasure && !usedTreasure && !isMovable && (
                <div style={{ position: 'absolute', bottom: 1, right: 2, fontSize: cellSize * 0.25, color: '#BBB' }}>·</div>
              )}
            </div>
          )
        }}
      />

      <div style={{ fontSize: 11, color: '#888', marginTop: 6, lineHeight: 1.6 }}>
        ※ 지뢰는 보이지 않습니다. 본인이 놓은 위치를 기억하세요!<br/>
        ※ 회색 점이 찍힌 칸은 이미 누군가 점수를 받은 칸 (다시 가면 0점)
      </div>

      {event && <EventModal event={event} onDismiss={onDismissEvent} />}
    </div>
  )
}

function ScoreCard({ player, score, active }) {
  const color = player === 1 ? COLOR_P1 : COLOR_P2
  return (
    <div style={{
      flex: 1, padding: '8px 12px', borderRadius: 10,
      background: active ? color + '22' : '#F8F8F8',
      border: active ? `2px solid ${color}` : '2px solid transparent',
      transition: 'all 0.2s',
    }}>
      <div style={{ fontSize: 11, color, fontWeight: 700 }}>{player}P{active ? ' · 차례' : ''}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#222' }}>{score}</div>
    </div>
  )
}

function PieceIcon({ player, size }) {
  const color = player === 1 ? COLOR_P1 : COLOR_P2
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 30% 30%, #fff8, ${color})`,
      border: `2px solid ${color}`,
      boxShadow: `0 2px 4px ${color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: size * 0.5,
    }}>
      {player}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// 결과 모달 (이동 결과)
function EventModal({ event, onDismiss }) {
  const color = event.player === 1 ? COLOR_P1 : COLOR_P2
  let icon, title, body
  if (event.type === 'treasure') {
    icon = '💎'
    title = `${event.order}번째 보물 획득!`
    body = `${event.cellId} → +${event.points}점`
  } else if (event.type === 'treasure-empty') {
    icon = '🪙'
    title = '빈 보물칸'
    body = `${event.cellId} · 이미 누군가 가져갔어요 (0점)`
  } else if (event.type === 'mine') {
    icon = '💥'
    title = '지뢰 폭발!'
    body = event.mineCount > 1
      ? `${event.cellId}에 지뢰 ${event.mineCount}개 (모두 제거) · ${event.penalty}점\n다음 턴: 출발 코너 4×4로 텔레포트`
      : `${event.cellId}에서 지뢰 폭발 · ${event.penalty}점\n다음 턴: 출발 코너 4×4로 텔레포트`
  } else {
    icon = '🎯'
    title = event.already ? '이미 점수 받은 칸 (0점)' : `+${event.points}점`
    body = event.already ? `${event.cellId} · 이전에 누군가 다녀감` : `${event.cellId} · 주변 9칸 지뢰 ${event.points}개`
  }
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0008',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, zIndex: 100,
    }} onClick={onDismiss}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, padding: 24,
        maxWidth: 320, width: '100%', textAlign: 'center',
        boxShadow: '0 10px 30px #0004',
        animation: 'popIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <div style={{ display: 'inline-block', padding: '2px 10px', background: color, color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>
          {event.player}P
        </div>
        <div style={{ fontSize: 64, marginBottom: 4 }}>{icon}</div>
        <h3 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 6px' }}>{title}</h3>
        <p style={{ fontSize: 13, color: '#555', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{body}</p>
        <button onClick={onDismiss} style={{ ...primaryBtn('#7E57C2'), marginTop: 14 }}>
          확인
        </button>
      </div>
      <style>{`@keyframes popIn{0%{transform:scale(0.7);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// 종료 (지뢰 공개)
function EndScreen({ scores, treasures, mines, cellSize, onRestart, onBack }) {
  const winner = scores[1] > scores[2] ? 1 : scores[1] < scores[2] ? 2 : 0
  const wcolor = winner === 1 ? COLOR_P1 : winner === 2 ? COLOR_P2 : '#888'

  return (
    <div className="fade-in" style={{ maxWidth: 520, margin: '0 auto', padding: '0.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: 12, paddingTop: 8 }}>
        <div style={{ fontSize: 60, marginBottom: 4 }}>🏆</div>
        {winner === 0 ? (
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#888' }}>무승부!</h2>
        ) : (
          <h2 style={{ fontSize: 24, fontWeight: 800, color: wcolor }}>{winner}P 승리!</h2>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
          <ScoreCard player={1} score={scores[1]} active={winner === 1} />
          <ScoreCard player={2} score={scores[2]} active={winner === 2} />
        </div>
      </div>

      <div style={{ padding: '6px 0', fontSize: 13, color: '#666', textAlign: 'center' }}>
        지뢰 위치 공개 (<span style={{ color: COLOR_P1 }}>● 1P</span> / <span style={{ color: COLOR_P2 }}>● 2P</span>)
      </div>

      <BoardGrid
        cellSize={cellSize}
        renderCell={(r, c) => {
          const k = key(r, c)
          const has1 = mines[1].has(k)
          const has2 = mines[2].has(k)
          const trState = treasures[k]
          const usedTreasure = trState !== undefined && trState !== null
          const isTr = trState !== undefined
          return (
            <div key={k} style={{
              width: cellSize, height: cellSize, boxSizing: 'border-box',
              border: '1px solid #DDD',
              background: isTr ? (usedTreasure ? '#F4ECDC' : '#FFF4D6') : '#FFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              fontSize: cellSize * 0.5,
            }}>
              {isTr && <span style={{ position: 'absolute', fontSize: cellSize * 0.4, opacity: 0.4 }}>💎</span>}
              {(has1 || has2) && (
                <div style={{
                  width: cellSize * 0.5, height: cellSize * 0.5,
                  borderRadius: '50%',
                  background: has1 && has2
                    ? `linear-gradient(135deg, ${COLOR_P1} 50%, ${COLOR_P2} 50%)`
                    : has1 ? COLOR_P1 : COLOR_P2,
                  border: '1px solid #fff',
                  zIndex: 1,
                }} />
              )}
            </div>
          )
        }}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={onRestart} style={{ flex: 1, ...primaryBtn('#7E57C2') }}>
          🔄 다시 하기
        </button>
        <button onClick={onBack} style={{ flex: 1, ...primaryBtn('#888') }}>
          나가기
        </button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// 보드 그리드 (공통)
function BoardGrid({ cellSize, renderCell }) {
  return (
    <div style={{ display: 'inline-block', padding: 4, background: '#FAF9F6', borderRadius: 8, boxShadow: '0 2px 8px #0001', overflow: 'auto', maxWidth: '100%' }}>
      <div style={{ display: 'flex', marginBottom: 2 }}>
        <div style={{ width: cellSize * 0.5 }} />
        {Array.from({ length: SIZE }, (_, c) => (
          <div key={c} style={{ width: cellSize, textAlign: 'center', fontSize: 10, color: '#999' }}>
            {String.fromCharCode(97 + c)}
          </div>
        ))}
      </div>
      {Array.from({ length: SIZE }, (_, r) => (
        <div key={r} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: cellSize * 0.5, textAlign: 'center', fontSize: 10, color: '#999' }}>{r + 1}</div>
          {Array.from({ length: SIZE }, (_, c) => renderCell(r, c))}
        </div>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// 스타일 헬퍼
function primaryBtn(color, disabled = false) {
  return {
    width: '100%',
    padding: '12px 16px',
    background: disabled ? '#CCC' : color,
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginTop: 12,
    boxShadow: disabled ? 'none' : `0 2px 6px ${color}44`,
    transition: 'transform 0.05s',
  }
}
