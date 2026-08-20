import { useState, useEffect, useRef } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

const SIZE = 11
// 흑: 위↔아래 / 백: 좌↔우
const DIRS = [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0]]

function createBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
}

function boardToFlat(board) {
  return board.map(row => row.map(c => c ? c[0] : '.').join('')).join('|')
}
function flatToBoard(flat) {
  if (!flat) return createBoard()
  return flat.split('|').map(row => row.split('').map(ch => ch === 'b' ? 'black' : ch === 'w' ? 'white' : null))
}

function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE }

function hasWon(board, player) {
  const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false))
  const queue = []
  if (player === 'black') {
    for (let c = 0; c < SIZE; c++) if (board[0][c] === 'black') { queue.push([0, c]); visited[0][c] = true }
  } else {
    for (let r = 0; r < SIZE; r++) if (board[r][0] === 'white') { queue.push([r, 0]); visited[r][0] = true }
  }
  while (queue.length) {
    const [r, c] = queue.shift()
    if (player === 'black' && r === SIZE - 1) return true
    if (player === 'white' && c === SIZE - 1) return true
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      if (!inBounds(nr, nc) || visited[nr][nc]) continue
      if (board[nr][nc] !== player) continue
      visited[nr][nc] = true
      queue.push([nr, nc])
    }
  }
  return false
}

function shortestPath(board, player) {
  const INF = 9999
  const dist = Array.from({ length: SIZE }, () => Array(SIZE).fill(INF))
  const heap = []
  const push = (d, r, c) => heap.push({ d, r, c })
  const pop = () => {
    let bi = 0
    for (let i = 1; i < heap.length; i++) if (heap[i].d < heap[bi].d) bi = i
    return heap.splice(bi, 1)[0]
  }
  if (player === 'black') {
    for (let c = 0; c < SIZE; c++) {
      if (board[0][c] === 'white') continue
      const cost = board[0][c] === 'black' ? 0 : 1
      dist[0][c] = cost; push(cost, 0, c)
    }
  } else {
    for (let r = 0; r < SIZE; r++) {
      if (board[r][0] === 'black') continue
      const cost = board[r][0] === 'white' ? 0 : 1
      dist[r][0] = cost; push(cost, r, 0)
    }
  }
  while (heap.length) {
    const { d, r, c } = pop()
    if (d > dist[r][c]) continue
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      if (!inBounds(nr, nc)) continue
      if (board[nr][nc] && board[nr][nc] !== player) continue
      const w = board[nr][nc] === player ? 0 : 1
      if (dist[r][c] + w < dist[nr][nc]) {
        dist[nr][nc] = dist[r][c] + w
        push(dist[nr][nc], nr, nc)
      }
    }
  }
  let best = INF
  if (player === 'black') {
    for (let c = 0; c < SIZE; c++) if (dist[SIZE - 1][c] < best) best = dist[SIZE - 1][c]
  } else {
    for (let r = 0; r < SIZE; r++) if (dist[r][SIZE - 1] < best) best = dist[r][SIZE - 1]
  }
  return best
}

function evalBoard(board) {
  const whitePath = shortestPath(board, 'white')
  const blackPath = shortestPath(board, 'black')
  if (whitePath === 0) return 100000
  if (blackPath === 0) return -100000
  return blackPath - whitePath
}

function aiMove(board) {
  let best = null, bestScore = -Infinity
  const candidates = []
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (board[r][c] !== null) continue
    let near = false
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      if (inBounds(nr, nc) && board[nr][nc]) { near = true; break }
    }
    if (!near && !(c <= 1 || c >= SIZE - 2)) continue
    candidates.push([r, c])
  }
  if (candidates.length === 0) {
    return [Math.floor(SIZE / 2), Math.floor(SIZE / 2)]
  }
  for (const [r, c] of candidates) {
    const nb = board.map(row => [...row])
    nb[r][c] = 'white'
    if (hasWon(nb, 'white')) return [r, c]
    let score = evalBoard(nb)
    const blackTest = board.map(row => [...row])
    blackTest[r][c] = 'black'
    if (hasWon(blackTest, 'black')) score += 50000
    if (score > bestScore) { bestScore = score; best = [r, c] }
  }
  return best
}

export default function Hex({ onBack }) {
  const [mode, setMode] = useState(null) // null | 'local' | 'ai' | 'online'
  const [board, setBoard] = useState(createBoard)
  const [turn, setTurn] = useState('black')
  const [winner, setWinner] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const aiBusyRef = useRef(false)

  const room = useGameRoom('hex')

  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = room.gameState
    setBoard(flatToBoard(s.board))
    setTurn(s.turn || 'black')
    setWinner(s.winner || null)
  }, [room.gameState, mode])

  const myColor = mode === 'local' ? turn
    : mode === 'ai' ? 'black'
    : mode === 'online' ? room.myColor : null

  const isMyTurn = !winner && (
    mode === 'local'
    || (mode === 'ai' && turn === 'black')
    || (mode === 'online' && room.connected && turn === room.myColor)
  )

  const place = (r, c) => {
    if (!isMyTurn || board[r][c]) return
    const color = mode === 'local' ? turn : myColor
    const nb = board.map(row => [...row])
    nb[r][c] = color
    const won = hasWon(nb, color)
    const nextTurn = won ? color : (color === 'black' ? 'white' : 'black')
    if (mode === 'online') {
      room.updateState({
        board: boardToFlat(nb),
        turn: nextTurn,
        winner: won ? color : '',
      })
    }
    setBoard(nb)
    if (won) setWinner(color)
    else setTurn(nextTurn)
  }

  // AI 차례
  useEffect(() => {
    if (mode !== 'ai' || winner) return
    if (turn !== 'white') return
    if (aiBusyRef.current) return
    aiBusyRef.current = true
    const t = setTimeout(() => {
      const mv = aiMove(board)
      if (!mv) { aiBusyRef.current = false; return }
      const nb = board.map(row => [...row])
      nb[mv[0]][mv[1]] = 'white'
      setBoard(nb)
      if (hasWon(nb, 'white')) setWinner('white')
      else setTurn('black')
      aiBusyRef.current = false
    }, 500)
    return () => { clearTimeout(t); aiBusyRef.current = false }
  }, [turn, board, winner, mode])

  const reset = () => {
    const fresh = createBoard()
    if (mode === 'online') {
      room.updateState({ board: boardToFlat(fresh), turn: 'black', winner: '' })
    }
    setBoard(fresh)
    setTurn('black')
    setWinner(null)
    aiBusyRef.current = false
  }

  const handleBack = () => {
    if (mode === 'online') room.leaveRoom()
    if (mode) {
      setMode(null)
      setBoard(createBoard())
      setTurn('black')
      setWinner(null)
      aiBusyRef.current = false
      return
    }
    onBack()
  }

  const createOnline = async () => {
    await room.createRoom({ board: boardToFlat(createBoard()), turn: 'black', winner: '' })
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
        <div style={{ fontSize: 64, marginBottom: 12 }}>⬡</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>헥스</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => setMode('local')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #455A64, #607D8B)' }}>
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
        <p style={{ fontSize: 12, color: '#AAA', marginTop: 16 }}>나는 ⚫ 흑 (위↔아래)</p>
      </div>
    )
  }

  const W = Math.min((typeof window !== 'undefined' ? window.innerWidth : 360) - 32, 440)
  const hexSize = W / (SIZE + 6)
  const hexW = Math.sqrt(3) * hexSize
  const hexH = 2 * hexSize
  const xOff = hexW / 2
  const totalW = hexW * SIZE + hexW / 2 * (SIZE - 1) + 8
  const totalH = hexH * 3 / 4 * (SIZE - 1) + hexH + 8

  const hexPoints = (cx, cy) => {
    const pts = []
    for (let i = 0; i < 6; i++) {
      const ang = Math.PI / 180 * (60 * i - 30)
      pts.push(`${cx + hexSize * Math.cos(ang)},${cy + hexSize * Math.sin(ang)}`)
    }
    return pts.join(' ')
  }

  const statusText = (() => {
    if (winner) {
      if (mode === 'online') return winner === room.myColor ? '🎉 승리!' : '😵 패배'
      if (mode === 'ai') return winner === 'black' ? '🎉 위아래 연결 성공!' : '😵 AI가 좌우 연결'
      return winner === 'black' ? '⚫ 흑 승리 (위↔아래)' : '⚪ 백 승리 (좌↔우)'
    }
    if (mode === 'ai' && turn === 'white') return 'AI 생각 중... (⚪ 좌↔우)'
    if (mode === 'online') return isMyTurn
      ? `내 차례 (${room.myColor === 'black' ? '⚫ 위↔아래' : '⚪ 좌↔우'})`
      : '상대 차례'
    return (turn === 'black' ? '⚫ 흑 (위↔아래)' : '⚪ 백 (좌↔우)') + ' 차례'
  })()

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>
          ⬡ 헥스 {mode === 'online' ? '(온라인)' : mode === 'ai' ? '(vs AI)' : '(2인)'}
        </h2>
        <button onClick={reset}
          style={{ background: '#F0F0F0', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>리셋</button>
      </div>

      {mode === 'online' && (
        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0', borderRadius: 6, marginBottom: 6 }}>
          방 코드: <strong>{room.roomCode}</strong> · 나는 {room.myColor === 'black' ? '⚫ (위↔아래)' : '⚪ (좌↔우)'}
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 13, fontWeight: 700, minHeight: 18 }}>
        {statusText}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={totalW} height={totalH} style={{ background: '#F5F5F5', borderRadius: 8 }}>
          <rect x={0} y={0} width={totalW} height={4} fill="#333" />
          <rect x={0} y={totalH - 4} width={totalW} height={4} fill="#333" />
          <rect x={0} y={0} width={4} height={totalH} fill="#BBB" />
          <rect x={totalW - 4} y={0} width={4} height={totalH} fill="#BBB" />
          {board.map((row, r) => row.map((cell, c) => {
            const cx = 4 + hexW / 2 + c * hexW + r * xOff
            const cy = 4 + hexSize + r * hexH * 3 / 4
            return (
              <g key={r + '-' + c} onClick={() => place(r, c)} style={{ cursor: !cell && isMyTurn && !winner ? 'pointer' : 'default' }}>
                <polygon points={hexPoints(cx, cy)}
                  fill={cell === 'black' ? '#222' : cell === 'white' ? '#FFF' : '#E8DBA6'}
                  stroke="#8B6F2A" strokeWidth="1" />
              </g>
            )
          }))}
        </svg>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 10 }}>
        ⚫는 위↔아래, ⚪는 좌↔우 연결 시 승리 · 무승부 없음
      </p>
    </div>
  )
}
