import { useState, useEffect, useRef } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

// 24 교차점
const POINTS = [
  [0, 0], [3, 0], [6, 0],
  [1, 1], [3, 1], [5, 1],
  [2, 2], [3, 2], [4, 2],
  [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3],
  [2, 4], [3, 4], [4, 4],
  [1, 5], [3, 5], [5, 5],
  [0, 6], [3, 6], [6, 6],
]

const ADJ = [
  [1, 9], [0, 2, 4], [1, 14],
  [4, 10], [1, 3, 5, 7], [4, 13],
  [7, 11], [4, 6, 8], [7, 12],
  [0, 10, 21], [3, 9, 11, 18], [6, 10, 15],
  [8, 13, 17], [5, 12, 14, 20], [2, 13, 23],
  [11, 16], [15, 17, 19], [12, 16],
  [10, 19], [16, 18, 20, 22], [13, 19],
  [9, 22], [19, 21, 23], [14, 22],
]

const MILLS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [9, 10, 11], [12, 13, 14],
  [15, 16, 17], [18, 19, 20], [21, 22, 23],
  [0, 9, 21], [3, 10, 18], [6, 11, 15],
  [1, 4, 7], [16, 19, 22],
  [8, 12, 17], [5, 13, 20], [2, 14, 23],
]

function millsAt(point) { return MILLS.filter(m => m.includes(point)) }
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
function canMove(board, player) {
  const cnt = countPieces(board, player)
  if (cnt <= 3) return true
  for (let i = 0; i < 24; i++) {
    if (board[i] !== player) continue
    for (const j of ADJ[i]) if (board[j] === null) return true
  }
  return false
}

function opp(p) { return p === 'black' ? 'white' : 'black' }

function boardToFlat(board) {
  return board.map(c => c ? c[0] : '.').join('')
}
function flatToBoard(flat) {
  if (!flat) return Array(24).fill(null)
  return flat.split('').map(ch => ch === 'b' ? 'black' : ch === 'w' ? 'white' : null)
}

function aiPickPlace(board, player) {
  let best = -1, bestScore = -Infinity
  for (let i = 0; i < 24; i++) {
    if (board[i] !== null) continue
    const nb = [...board]; nb[i] = player
    let score = 0
    if (millsAt(i).some(m => m.every(p => nb[p] === player))) score += 50
    nb[i] = opp(player)
    if (millsAt(i).some(m => m.every(p => nb[p] === opp(player)))) score += 40
    nb[i] = player
    score += ADJ[i].length * 2
    if (score > bestScore) { bestScore = score; best = i }
  }
  return best
}

function aiPickMove(board, player, canFly) {
  const moves = []
  for (let i = 0; i < 24; i++) {
    if (board[i] !== player) continue
    const targets = canFly ? board.map((v, k) => v === null ? k : -1).filter(k => k >= 0) : ADJ[i].filter(j => board[j] === null)
    for (const j of targets) {
      const nb = [...board]; nb[i] = null; nb[j] = player
      const mill = millsAt(j).some(m => m.every(p => nb[p] === player))
      let score = (mill ? 50 : 0) + ADJ[j].length * 2
      moves.push({ from: i, to: j, score, makesMill: mill })
    }
  }
  if (moves.length === 0) return null
  moves.sort((a, b) => b.score - a.score)
  return moves[0]
}

function aiPickRemove(board, target) {
  const candidates = []
  for (let i = 0; i < 24; i++) {
    if (board[i] !== target) continue
    candidates.push({ idx: i, inMill: inMill(board, i, target) })
  }
  const allInMill = candidates.every(c => c.inMill)
  const pool = allInMill ? candidates : candidates.filter(c => !c.inMill)
  pool.sort((a, b) => ADJ[b.idx].length - ADJ[a.idx].length)
  return pool[0]?.idx
}

export default function NineMensMorris({ onBack }) {
  const [mode, setMode] = useState(null) // null | 'local' | 'ai' | 'online'
  const [board, setBoard] = useState(() => Array(24).fill(null))
  const [turn, setTurn] = useState('black')
  const [placed, setPlaced] = useState({ black: 0, white: 0 })
  const [selected, setSelected] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [winner, setWinner] = useState(null)
  const [status, setStatus] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const aiBusyRef = useRef(false)

  const room = useGameRoom('morris')

  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = room.gameState
    setBoard(flatToBoard(s.board))
    setTurn(s.turn || 'black')
    setPlaced(s.placed || { black: 0, white: 0 })
    setRemoving(s.removing || null)
    setWinner(s.winner || null)
    setSelected(null)
  }, [room.gameState, mode])

  const myColor = mode === 'local' ? turn
    : mode === 'ai' ? 'black'
    : mode === 'online' ? room.myColor : null

  const phaseFor = (color) => {
    const p = color === 'black' ? placed.black : placed.white
    return p < 9 ? 'place' : (countPieces(board, color) <= 3 ? 'fly' : 'move')
  }

  const isMyTurn = !winner && (
    mode === 'local'
    || (mode === 'ai' && turn === 'black' && removing !== 'black')
    || (mode === 'online' && room.connected && turn === room.myColor)
  )

  const syncState = (next) => {
    if (mode === 'online') {
      room.updateState({
        board: boardToFlat(next.board),
        turn: next.turn,
        placed: next.placed,
        removing: next.removing || null,
        winner: next.winner || '',
      })
    }
    setBoard(next.board)
    setTurn(next.turn)
    setPlaced(next.placed)
    setRemoving(next.removing || null)
    if (next.winner) setWinner(next.winner)
  }

  const finishMoveTurn = (nb, moverColor, newPlaced) => {
    const enemy = opp(moverColor)
    const enemyPlacedAll = (enemy === 'black' ? newPlaced.black : newPlaced.white) >= 9
    if (enemyPlacedAll && countPieces(nb, enemy) < 3) {
      syncState({ board: nb, turn: enemy, placed: newPlaced, removing: null, winner: moverColor })
      return
    }
    if (enemyPlacedAll && !canMove(nb, enemy)) {
      syncState({ board: nb, turn: enemy, placed: newPlaced, removing: null, winner: moverColor })
      return
    }
    syncState({ board: nb, turn: enemy, placed: newPlaced, removing: null })
    setStatus('')
  }

  // 클릭 처리 (사람 차례)
  const handleClick = (i) => {
    if (!isMyTurn) return
    const color = mode === 'local' ? turn : myColor

    if (removing === color) return // 내 돌이 제거당하는 단계는 클릭 불가 (상대 액션)

    // 제거 단계 (내가 밀을 만들었음 → 상대 돌 제거)
    if (removing && removing === opp(color)) {
      if (board[i] !== opp(color)) return
      const allMill = allPiecesInMills(board, opp(color))
      if (!allMill && inMill(board, i, opp(color))) return
      const nb = [...board]; nb[i] = null
      finishMoveTurn(nb, color, placed)
      return
    }

    const phase = phaseFor(color)
    if (phase === 'place') {
      if (board[i] !== null) return
      const nb = [...board]; nb[i] = color
      const newPlaced = { ...placed, [color]: placed[color] + 1 }
      if (millsAt(i).some(m => m.every(p => nb[p] === color))) {
        const removable = [...Array(24).keys()].filter(k => nb[k] === opp(color))
        if (removable.length > 0) {
          // 밀 → 제거 단계
          syncState({ board: nb, turn, placed: newPlaced, removing: opp(color) })
          setStatus('상대 돌을 제거하세요')
          return
        }
      }
      finishMoveTurn(nb, color, newPlaced)
      return
    }

    // 이동/날기
    if (selected === null) {
      if (board[i] !== color) return
      setSelected(i)
      return
    }
    if (i === selected) { setSelected(null); return }
    if (board[i] === color) { setSelected(i); return }
    if (board[i] !== null) return
    const canFly = countPieces(board, color) <= 3
    if (!canFly && !ADJ[selected].includes(i)) return
    const nb = [...board]; nb[selected] = null; nb[i] = color
    setSelected(null)
    if (millsAt(i).some(m => m.every(p => nb[p] === color))) {
      const removable = [...Array(24).keys()].filter(k => nb[k] === opp(color))
      if (removable.length > 0) {
        syncState({ board: nb, turn, placed, removing: opp(color) })
        setStatus('상대 돌을 제거하세요')
        return
      }
    }
    finishMoveTurn(nb, color, placed)
  }

  // AI 차례 처리
  useEffect(() => {
    if (mode !== 'ai' || winner) return
    if (turn !== 'white' && removing !== 'black') return
    if (aiBusyRef.current) return
    aiBusyRef.current = true
    const t = setTimeout(() => {
      // AI 제거 단계
      if (removing === 'black') {
        const idx = aiPickRemove(board, 'black')
        if (idx === undefined) { aiBusyRef.current = false; return }
        const nb = [...board]; nb[idx] = null
        finishMoveTurn(nb, 'white', placed)
        aiBusyRef.current = false
        return
      }
      if (turn !== 'white') { aiBusyRef.current = false; return }
      const ph = phaseFor('white')
      let nb, last
      if (ph === 'place') {
        last = aiPickPlace(board, 'white')
        if (last < 0) { aiBusyRef.current = false; return }
        nb = [...board]; nb[last] = 'white'
        const newPlaced = { ...placed, white: placed.white + 1 }
        if (millsAt(last).some(m => m.every(p => nb[p] === 'white'))) {
          const removable = [...Array(24).keys()].filter(k => nb[k] === 'black')
          if (removable.length > 0) {
            setBoard(nb)
            setPlaced(newPlaced)
            setRemoving('black')
            setStatus('AI가 내 돌을 가져갑니다...')
            aiBusyRef.current = false
            return
          }
        }
        finishMoveTurn(nb, 'white', newPlaced)
        aiBusyRef.current = false
        return
      }
      // move/fly
      const mv = aiPickMove(board, 'white', ph === 'fly')
      if (!mv) {
        // 이동 불가 → 흑 승
        syncState({ board, turn: 'white', placed, removing: null, winner: 'black' })
        aiBusyRef.current = false
        return
      }
      nb = [...board]; nb[mv.from] = null; nb[mv.to] = 'white'
      last = mv.to
      if (millsAt(last).some(m => m.every(p => nb[p] === 'white'))) {
        const removable = [...Array(24).keys()].filter(k => nb[k] === 'black')
        if (removable.length > 0) {
          setBoard(nb)
          setRemoving('black')
          setStatus('AI가 내 돌을 가져갑니다...')
          aiBusyRef.current = false
          return
        }
      }
      finishMoveTurn(nb, 'white', placed)
      aiBusyRef.current = false
    }, 600)
    return () => { clearTimeout(t); aiBusyRef.current = false }
  }, [turn, board, winner, removing, mode, placed])

  const reset = () => {
    const next = { board: Array(24).fill(null), turn: 'black', placed: { black: 0, white: 0 }, removing: null, winner: null }
    if (mode === 'online') {
      room.updateState({
        board: boardToFlat(next.board),
        turn: 'black',
        placed: next.placed,
        removing: null,
        winner: '',
      })
    }
    setBoard(next.board)
    setTurn(next.turn)
    setPlaced(next.placed)
    setRemoving(null)
    setSelected(null)
    setWinner(null)
    setStatus('')
    aiBusyRef.current = false
  }

  const handleBack = () => {
    if (mode === 'online') room.leaveRoom()
    if (mode) {
      setMode(null)
      reset()
      return
    }
    onBack()
  }

  const createOnline = async () => {
    await room.createRoom({
      board: boardToFlat(Array(24).fill(null)),
      turn: 'black',
      placed: { black: 0, white: 0 },
      removing: null,
      winner: '',
    })
    setMode('online')
  }
  const joinOnline = async () => {
    if (joinCode.length !== 2) { room.setError('2자리 코드를 입력하세요'); return }
    const ok = await room.joinRoom(joinCode)
    if (ok) setMode('online')
  }

  if (!mode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: '#888', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🔵</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>9목 모리스</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => setMode('local')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #5D4037, #8B6F2A)' }}>
            📱 같은 기기에서 (2인)
          </button>
          <button onClick={() => setMode('ai')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #E67E22, #D35400)' }}>
            🤖 vs 컴퓨터
          </button>
          <button onClick={createOnline}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #4895EF, #3A7BD5)' }}>
            🌐 온라인 방 만들기
          </button>
          <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>또는 코드로 참가</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.replace(/[^0-9]/g, ''))}
              maxLength={2}
              placeholder="방 코드 2자리"
              inputMode="numeric"
              style={{
                flex: 1, minWidth: 0, boxSizing: 'border-box',
                padding: '12px', borderRadius: 10, border: '2px solid #DDD',
                fontSize: 16, fontWeight: 700, textAlign: 'center', letterSpacing: 4,
                fontFamily: 'monospace',
              }}
            />
            <button onClick={joinOnline}
              style={{ padding: '0 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#4895EF', color: '#FFF', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 52, flexShrink: 0 }}>
              참가
            </button>
          </div>
          {room.error && <div style={{ color: '#E74C3C', fontSize: 13 }}>{room.error}</div>}
        </div>
      </div>
    )
  }

  if (mode === 'online' && !room.connected) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: '#888', cursor: 'pointer', marginBottom: 24 }}>
          ← 취소
        </button>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>상대를 기다리는 중...</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>상대방에게 아래 코드를 알려주세요</p>
        <div style={{
          fontSize: 36, fontWeight: 700, letterSpacing: 8,
          padding: '16px 24px', background: '#F7F6F3', borderRadius: 14,
          display: 'inline-block', fontFamily: 'monospace',
        }}>{room.roomCode}</div>
        <p style={{ fontSize: 12, color: '#AAA', marginTop: 16 }}>나는 ⚫ 흑 (선공)</p>
      </div>
    )
  }

  const BOARD_PX = Math.min(360, (typeof window !== 'undefined' ? window.innerWidth : 360) - 40)
  const cell = BOARD_PX / 6
  const PAD = 20
  const toXY = (i) => {
    const [gx, gy] = POINTS[i]
    return { x: PAD + gx * cell, y: PAD + gy * cell }
  }
  const lines = []
  const seen = new Set()
  for (let i = 0; i < 24; i++) {
    for (const j of ADJ[i]) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (seen.has(key)) continue
      seen.add(key); lines.push([i, j])
    }
  }

  const myPhase = myColor ? phaseFor(myColor) : 'place'

  const turnText = () => {
    if (winner) {
      if (mode === 'online') return winner === room.myColor ? '🎉 승리!' : '😵 패배'
      if (mode === 'ai') return winner === 'black' ? '🎉 승리!' : '😵 패배'
      return winner === 'black' ? '⚫ 흑 승리!' : '⚪ 백 승리!'
    }
    if (status) return status
    if (isMyTurn) {
      if (removing) return removing === opp(myColor) ? '상대 돌을 제거하세요' : '...'
      if (myPhase === 'place') return `놓기 ${(placed[myColor] || 0) + 1}/9`
      if (myPhase === 'fly') return selected === null ? '내 차례 (날기 가능)' : '날 곳을 선택'
      return selected === null ? '돌을 선택' : '이동할 곳 선택'
    }
    if (mode === 'ai') return 'AI 생각 중...'
    if (mode === 'online') return '상대 차례'
    return (turn === 'black' ? '⚫' : '⚪') + ' 차례'
  }

  const blackLeft = 9 - placed.black
  const whiteLeft = 9 - placed.white

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>
          🔵 9목 모리스 {mode === 'online' ? '(온라인)' : mode === 'ai' ? '(vs AI)' : '(2인)'}
        </h2>
        <button onClick={reset}
          style={{ background: '#F0F0F0', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>리셋</button>
      </div>

      {mode === 'online' && (
        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0', borderRadius: 6, marginBottom: 6 }}>
          방 코드: <strong>{room.roomCode}</strong> · 나는 {room.myColor === 'black' ? '⚫ 흑' : '⚪ 백'}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 6, fontSize: 13, fontWeight: 700 }}>
        <div>⚫ (남은 {blackLeft} · 판 {countPieces(board, 'black')})</div>
        <div>⚪ (남은 {whiteLeft} · 판 {countPieces(board, 'white')})</div>
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
            const targetEnemy = !winner && isMyTurn && removing === opp(myColor) && board[i] === opp(myColor)
              && (allPiecesInMills(board, opp(myColor)) || !inMill(board, i, opp(myColor)))
            const placeable = !winner && isMyTurn && !removing && myPhase === 'place' && board[i] === null
            const moveTarget = !winner && isMyTurn && !removing && selected !== null && board[i] === null
              && (countPieces(board, myColor) <= 3 || ADJ[selected].includes(i))
            return (
              <g key={i} onClick={() => handleClick(i)} style={{ cursor: 'pointer' }}>
                <circle cx={x} cy={y} r={14} fill="transparent" />
                {targetEnemy && <circle cx={x} cy={y} r={16} fill="none" stroke="#E53935" strokeWidth="2" strokeDasharray="3 2" />}
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
