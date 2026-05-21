import { useState, useEffect } from 'react'

// 24 교차점, 좌표는 (row, col) 격자 7x7 중 일부
// idx 0~23, 각 점의 시각적 위치(x,y) 0~6 그리드 기준
const POINTS = [
  [0, 0], [3, 0], [6, 0],
  [1, 1], [3, 1], [5, 1],
  [2, 2], [3, 2], [4, 2],
  [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3],
  [2, 4], [3, 4], [4, 4],
  [1, 5], [3, 5], [5, 5],
  [0, 6], [3, 6], [6, 6],
]

// 인접 점 그래프
const ADJ = [
  [1, 9],          // 0
  [0, 2, 4],       // 1
  [1, 14],         // 2
  [4, 10],         // 3
  [1, 3, 5, 7],    // 4
  [4, 13],         // 5
  [7, 11],         // 6
  [4, 6, 8],       // 7
  [7, 12],         // 8
  [0, 10, 21],     // 9
  [3, 9, 11, 18],  // 10
  [6, 10, 15],     // 11
  [8, 13, 17],     // 12
  [5, 12, 14, 20], // 13
  [2, 13, 23],     // 14
  [11, 16],        // 15
  [15, 17, 19],    // 16
  [12, 16],        // 17
  [10, 19],        // 18
  [16, 18, 20, 22],// 19
  [13, 19],        // 20
  [9, 22],         // 21
  [19, 21, 23],    // 22
  [14, 22],        // 23
]

// 3개 직선(밀) 패턴
const MILLS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [9, 10, 11], [12, 13, 14],
  [15, 16, 17], [18, 19, 20], [21, 22, 23],
  [0, 9, 21], [3, 10, 18], [6, 11, 15],
  [1, 4, 7], [16, 19, 22],
  [8, 12, 17], [5, 13, 20], [2, 14, 23],
]

function millsAt(point) {
  return MILLS.filter(m => m.includes(point))
}

function inMill(board, point, player) {
  if (board[point] !== player) return false
  return millsAt(point).some(m => m.every(p => board[p] === player))
}

function allPiecesInMills(board, player) {
  const own = []
  for (let i = 0; i < 24; i++) if (board[i] === player) own.push(i)
  return own.every(p => inMill(board, p, player))
}

function countPieces(board, player) {
  let n = 0
  for (let i = 0; i < 24; i++) if (board[i] === player) n++
  return n
}

function canMove(board, player, phase, placed) {
  // phase 'place'에선 항상 가능
  if (phase === 'place') return true
  if (placed < 9) return true
  const cnt = countPieces(board, player)
  if (cnt <= 3) return true // 날기 가능
  for (let i = 0; i < 24; i++) {
    if (board[i] !== player) continue
    for (const j of ADJ[i]) if (board[j] === null) return true
  }
  return false
}

function opp(p) { return p === 'black' ? 'white' : 'black' }

// AI: 단순 휴리스틱 + 1수 룩어헤드
function aiPickPlace(board, player) {
  let best = -1, bestScore = -Infinity
  for (let i = 0; i < 24; i++) {
    if (board[i] !== null) continue
    const nb = [...board]; nb[i] = player
    let score = 0
    if (millsAt(i).some(m => m.every(p => nb[p] === player))) score += 50
    // 상대 밀 차단
    nb[i] = opp(player)
    if (millsAt(i).some(m => m.every(p => nb[p] === opp(player)))) score += 40
    nb[i] = player
    // 인접 자유도
    score += ADJ[i].length * 2
    if (score > bestScore) { bestScore = score; best = i }
  }
  return best
}

function aiPickMove(board, player, canFly) {
  // moves: { from, to, makesMill }
  const moves = []
  for (let i = 0; i < 24; i++) {
    if (board[i] !== player) continue
    const targets = canFly ? board.map((v, k) => v === null ? k : -1).filter(k => k >= 0) : ADJ[i].filter(j => board[j] === null)
    for (const j of targets) {
      const nb = [...board]; nb[i] = null; nb[j] = player
      const mill = millsAt(j).some(m => m.every(p => nb[p] === player))
      let score = (mill ? 50 : 0) + ADJ[j].length * 2
      // 상대 밀 차단 가능성
      const nb2 = [...board]; nb2[i] = null
      // 상대가 j로 못 두게 막는 효과: j에 상대가 두면 밀 만드는지
      if (millsAt(j).some(m => m.every(p => p === j ? true : nb2[p] === opp(player)))) score += 30
      moves.push({ from: i, to: j, score, makesMill: mill })
    }
  }
  if (moves.length === 0) return null
  moves.sort((a, b) => b.score - a.score)
  return moves[0]
}

// 제거할 상대 돌 고르기: 밀 아닌 것 우선, 가치 높은 것 우선
function aiPickRemove(board, target) {
  const candidates = []
  for (let i = 0; i < 24; i++) {
    if (board[i] !== target) continue
    candidates.push({ idx: i, inMill: inMill(board, i, target) })
  }
  // 룰: 가능하면 밀 안에 있지 않은 돌만 제거
  const allInMill = candidates.every(c => c.inMill)
  const pool = allInMill ? candidates : candidates.filter(c => !c.inMill)
  // 인접도 높은 것 우선 제거 (공격력 큰 돌)
  pool.sort((a, b) => ADJ[b.idx].length - ADJ[a.idx].length)
  return pool[0]?.idx
}

export default function NineMensMorris({ onBack }) {
  const [board, setBoard] = useState(() => Array(24).fill(null))
  const [turn, setTurn] = useState('black') // 'black' = 사람
  const [placed, setPlaced] = useState({ black: 0, white: 0 })
  const [selected, setSelected] = useState(null) // 이동 단계에서 선택한 from
  const [removing, setRemoving] = useState(null) // 밀 만든 후 제거 단계: 'black'|'white'
  const [winner, setWinner] = useState(null)
  const [status, setStatus] = useState('')

  const myPlaced = placed.black
  const aiPlaced = placed.white
  const myPhase = myPlaced < 9 ? 'place' : (countPieces(board, 'black') <= 3 ? 'fly' : 'move')
  const aiPhase = aiPlaced < 9 ? 'place' : (countPieces(board, 'white') <= 3 ? 'fly' : 'move')

  // 사람 클릭 처리
  const handleClick = (i) => {
    if (winner) return
    if (removing === 'black') {
      // AI가 밀 만든 후 내 돌 제거하는 단계는 AI가 자동 처리
      return
    }
    if (turn !== 'black') return

    // 제거 단계 (내가 밀을 만든 직후)
    if (removing === 'white') {
      if (board[i] !== 'white') return
      const allMill = allPiecesInMills(board, 'white')
      if (!allMill && inMill(board, i, 'white')) return
      const nb = [...board]; nb[i] = null
      setBoard(nb)
      setRemoving(null)
      finishTurnAfter(nb, 'black')
      return
    }

    // 놓기 단계
    if (myPhase === 'place') {
      if (board[i] !== null) return
      const nb = [...board]; nb[i] = 'black'
      const newPlaced = { ...placed, black: placed.black + 1 }
      setBoard(nb)
      setPlaced(newPlaced)
      // 밀 만들었는지
      if (millsAt(i).some(m => m.every(p => nb[p] === 'black'))) {
        // 제거 가능한 상대 돌 있는지 확인
        const removable = [...Array(24).keys()].filter(k => nb[k] === 'white')
        if (removable.length > 0) {
          setRemoving('white')
          setStatus('상대 돌을 제거하세요')
          return
        }
      }
      finishTurnAfter(nb, 'black', newPlaced)
      return
    }

    // 이동/날기 단계
    if (selected === null) {
      if (board[i] !== 'black') return
      setSelected(i)
      return
    }
    if (i === selected) { setSelected(null); return }
    if (board[i] !== null) {
      // 다른 자기 돌 선택 변경
      if (board[i] === 'black') { setSelected(i); return }
      return
    }
    const canFly = countPieces(board, 'black') <= 3
    if (!canFly && !ADJ[selected].includes(i)) return
    const nb = [...board]; nb[selected] = null; nb[i] = 'black'
    setBoard(nb)
    setSelected(null)
    if (millsAt(i).some(m => m.every(p => nb[p] === 'black'))) {
      const removable = [...Array(24).keys()].filter(k => nb[k] === 'white')
      if (removable.length > 0) {
        setRemoving('white')
        setStatus('상대 돌을 제거하세요')
        return
      }
    }
    finishTurnAfter(nb, 'black')
  }

  const finishTurnAfter = (nb, mover, newPlaced = placed) => {
    // 상대 패배 조건 체크 (놓기 단계 끝난 후만)
    const enemy = opp(mover)
    const enemyPlacedAll = (enemy === 'black' ? newPlaced.black : newPlaced.white) >= 9
    if (enemyPlacedAll && countPieces(nb, enemy) < 3) {
      setWinner(mover); setStatus(''); return
    }
    if (enemyPlacedAll && !canMove(nb, enemy, 'move', enemy === 'black' ? newPlaced.black : newPlaced.white)) {
      setWinner(mover); setStatus(''); return
    }
    setStatus('')
    setTurn(enemy)
  }

  // AI 턴
  useEffect(() => {
    if (turn !== 'white' || winner) return
    if (removing === 'black') return // 사람 돌 제거 단계: 아래 별도 effect
    const t = setTimeout(() => {
      let nb, last
      if (aiPhase === 'place') {
        last = aiPickPlace(board, 'white')
        nb = [...board]; nb[last] = 'white'
        setPlaced(p => ({ ...p, white: p.white + 1 }))
      } else {
        const mv = aiPickMove(board, 'white', aiPhase === 'fly')
        if (!mv) { setWinner('black'); return }
        nb = [...board]; nb[mv.from] = null; nb[mv.to] = 'white'
        last = mv.to
      }
      setBoard(nb)
      if (millsAt(last).some(m => m.every(p => nb[p] === 'white'))) {
        const removable = [...Array(24).keys()].filter(k => nb[k] === 'black')
        if (removable.length > 0) {
          setRemoving('black')
          setStatus('AI가 내 돌을 가져갑니다...')
          return
        }
      }
      const newPlaced = { ...placed, white: (aiPhase === 'place' ? placed.white + 1 : placed.white) }
      finishTurnAfter(nb, 'white', newPlaced)
    }, 600)
    return () => clearTimeout(t)
  }, [turn, board, winner, removing, aiPhase, placed])

  // AI 제거 단계 (사람 돌 제거)
  useEffect(() => {
    if (removing !== 'black' || winner) return
    const t = setTimeout(() => {
      const idx = aiPickRemove(board, 'black')
      if (idx === undefined) { setRemoving(null); return }
      const nb = [...board]; nb[idx] = null
      setBoard(nb)
      setRemoving(null)
      const newPlaced = { ...placed }
      finishTurnAfter(nb, 'white', newPlaced)
    }, 700)
    return () => clearTimeout(t)
  }, [removing, board, winner, placed])

  const reset = () => {
    setBoard(Array(24).fill(null))
    setTurn('black')
    setPlaced({ black: 0, white: 0 })
    setSelected(null)
    setRemoving(null)
    setWinner(null)
    setStatus('')
  }

  const BOARD_PX = Math.min(360, window.innerWidth - 40)
  const cell = BOARD_PX / 6
  const PAD = 20

  // 선 그리기용 좌표 변환
  const toXY = (i) => {
    const [gx, gy] = POINTS[i]
    return { x: PAD + gx * cell, y: PAD + gy * cell }
  }

  // 인접 선 (중복 제거)
  const lines = []
  const seen = new Set()
  for (let i = 0; i < 24; i++) {
    for (const j of ADJ[i]) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (seen.has(key)) continue
      seen.add(key)
      lines.push([i, j])
    }
  }

  const turnText = () => {
    if (winner) return winner === 'black' ? '🎉 승리!' : '😵 패배'
    if (status) return status
    if (turn === 'black') {
      if (myPhase === 'place') return `놓기 ${myPlaced + 1}/9`
      if (myPhase === 'fly') return '내 차례 (날기 가능)'
      return selected === null ? '돌을 선택' : '이동할 곳 선택'
    }
    return 'AI 생각 중...'
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>🔵 9목 모리스</h2>
        <button onClick={reset}
          style={{ background: '#F0F0F0', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>리셋</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 6, fontSize: 13, fontWeight: 700 }}>
        <div>⚫ 나 (남은 {9 - placed.black} · 판 {countPieces(board, 'black')})</div>
        <div>⚪ AI (남은 {9 - placed.white} · 판 {countPieces(board, 'white')})</div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 13, fontWeight: 700, minHeight: 18 }}>
        {turnText()}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={BOARD_PX + PAD * 2} height={BOARD_PX + PAD * 2}
          style={{ background: '#DCB35C', borderRadius: 8 }}>
          {lines.map(([i, j], k) => {
            const a = toXY(i), b = toXY(j)
            return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#5D4037" strokeWidth="2" />
          })}
          {POINTS.map((_, i) => {
            const { x, y } = toXY(i)
            const sel = selected === i
            const target = !winner && turn === 'black' && removing === 'white' && board[i] === 'white'
              && (allPiecesInMills(board, 'white') || !inMill(board, i, 'white'))
            const placeable = !winner && turn === 'black' && myPhase === 'place' && board[i] === null
            const moveTarget = !winner && turn === 'black' && selected !== null && board[i] === null
              && (countPieces(board, 'black') <= 3 || ADJ[selected].includes(i))
            return (
              <g key={i} onClick={() => handleClick(i)} style={{ cursor: 'pointer' }}>
                <circle cx={x} cy={y} r={14} fill="transparent" />
                {target && <circle cx={x} cy={y} r={16} fill="none" stroke="#E53935" strokeWidth="2" strokeDasharray="3 2" />}
                {(placeable || moveTarget) && (
                  <circle cx={x} cy={y} r={5} fill="rgba(0,0,0,0.25)" />
                )}
                {board[i] && (
                  <circle cx={x} cy={y} r={12}
                    fill={board[i] === 'black' ? 'url(#bgrad)' : 'url(#wgrad)'}
                    stroke={sel ? '#FFD54F' : '#333'} strokeWidth={sel ? 3 : 0.5} />
                )}
              </g>
            )
          })}
          <defs>
            <radialGradient id="bgrad" cx="0.3" cy="0.3">
              <stop offset="0%" stopColor="#666" />
              <stop offset="100%" stopColor="#000" />
            </radialGradient>
            <radialGradient id="wgrad" cx="0.3" cy="0.3">
              <stop offset="0%" stopColor="#FFF" />
              <stop offset="100%" stopColor="#BBB" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 10 }}>
        9개씩 놓기 → 한 칸씩 이동 → 돌 3개면 어디든 날기 · 3연결(밀) 시 상대 돌 제거 · 2개 이하면 패배
      </p>
    </div>
  )
}
