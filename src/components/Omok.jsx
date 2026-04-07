import { useState, useEffect } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

const SIZE = 15

function createBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
}

function boardToFlat(board) {
  return board.map(row => row.map(c => c || '').join(',')).join('|')
}

function flatToBoard(flat) {
  if (!flat) return createBoard()
  return flat.split('|').map(row => row.split(',').map(c => c || null))
}

function checkWin(board, r, c, player) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  for (const [dr, dc] of dirs) {
    let count = 1
    for (let d = 1; d < 5; d++) {
      const nr = r + dr * d, nc = c + dc * d
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === player) count++
      else break
    }
    for (let d = 1; d < 5; d++) {
      const nr = r - dr * d, nc = c - dc * d
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === player) count++
      else break
    }
    if (count >= 5) return true
  }
  return false
}

export default function Omok({ onBack }) {
  const [mode, setMode] = useState(null) // null | 'local' | 'online'
  const [board, setBoard] = useState(createBoard())
  const [turn, setTurn] = useState('black')
  const [winner, setWinner] = useState(null)
  const [lastMove, setLastMove] = useState(null)
  const [history, setHistory] = useState([])
  const [joinCode, setJoinCode] = useState('')

  const room = useGameRoom('omok')

  // 온라인: 게임 상태 수신
  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = room.gameState
    setBoard(flatToBoard(s.board))
    setTurn(s.turn || 'black')
    setWinner(s.winner || null)
    setLastMove(s.lastMove || null)
    setHistory(s.history || [])
  }, [room.gameState, mode])

  const place = (r, c) => {
    if (board[r][c] || winner) return

    // 온라인: 자기 턴만 가능
    if (mode === 'online') {
      if (!room.connected) return
      if (turn !== room.myColor) return
    }

    const newBoard = board.map(row => [...row])
    newBoard[r][c] = turn
    const newHistory = [...history, { r, c, player: turn }]
    const newWinner = checkWin(newBoard, r, c, turn) ? turn : null
    const newTurn = newWinner ? turn : (turn === 'black' ? 'white' : 'black')

    if (mode === 'online') {
      room.updateState({
        board: boardToFlat(newBoard),
        turn: newTurn,
        winner: newWinner || '',
        lastMove: [r, c],
        history: newHistory,
      })
    } else {
      setBoard(newBoard)
      setLastMove([r, c])
      setHistory(newHistory)
      setWinner(newWinner)
      setTurn(newTurn)
    }
  }

  const undo = () => {
    if (mode === 'online') return // 온라인은 무르기 불가
    if (history.length === 0 || winner) return
    const prev = history.slice(0, -1)
    const newBoard = createBoard()
    prev.forEach(m => { newBoard[m.r][m.c] = m.player })
    setBoard(newBoard)
    setHistory(prev)
    setLastMove(prev.length > 0 ? [prev[prev.length - 1].r, prev[prev.length - 1].c] : null)
    setTurn(history[history.length - 1].player)
  }

  const reset = () => {
    if (mode === 'online') {
      room.updateState({
        board: boardToFlat(createBoard()),
        turn: 'black',
        winner: '',
        lastMove: null,
        history: [],
      })
    } else {
      setBoard(createBoard())
      setTurn('black')
      setWinner(null)
      setLastMove(null)
      setHistory([])
    }
  }

  const handleBack = () => {
    if (mode === 'online') room.leaveRoom()
    if (mode) { setMode(null); return }
    onBack()
  }

  const createOnline = async () => {
    const code = await room.createRoom({
      board: boardToFlat(createBoard()),
      turn: 'black',
      winner: '',
      lastMove: null,
      history: [],
    })
    setMode('online')
  }

  const joinOnline = async () => {
    if (joinCode.length !== 6) { room.setError('6자리 코드를 입력하세요'); return }
    const ok = await room.joinRoom(joinCode.toUpperCase())
    if (ok) setMode('online')
  }

  // 모드 선택 화면
  if (!mode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>⚫</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>오목</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => setMode('local')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #333, #555)' }}>
            📱 같은 기기에서 (2인)
          </button>
          <button onClick={createOnline}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #4895EF, #3A7BD5)' }}>
            🌐 온라인 방 만들기
          </button>
          <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>또는 코드로 참가</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={6}
              placeholder="방 코드 6자리"
              style={{
                flex: 1, padding: '12px', borderRadius: 10, border: '2px solid #DDD',
                fontSize: 16, fontWeight: 700, textAlign: 'center', letterSpacing: 4,
                fontFamily: 'monospace',
              }}
            />
            <button onClick={joinOnline}
              style={{ padding: '0 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#4895EF', color: '#FFF', fontSize: 14, fontWeight: 700 }}>
              참가
            </button>
          </div>
          {room.error && <div style={{ color: '#E74C3C', fontSize: 13 }}>{room.error}</div>}
        </div>
      </div>
    )
  }

  // 온라인: 대기 화면
  if (mode === 'online' && !room.connected) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 24 }}>
          ← 취소
        </button>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>상대를 기다리는 중...</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
          상대방에게 아래 코드를 알려주세요
        </p>
        <div style={{
          fontSize: 36, fontWeight: 700, letterSpacing: 8,
          padding: '16px 24px', background: '#F7F6F3', borderRadius: 14,
          display: 'inline-block', fontFamily: 'monospace',
        }}>
          {room.roomCode}
        </div>
        <p style={{ fontSize: 12, color: '#AAA', marginTop: 16 }}>
          나는 ⚫ 흑 (선공)
        </p>
      </div>
    )
  }

  const isMyTurn = mode === 'local' || turn === room.myColor
  const cellSize = Math.min(Math.floor((window.innerWidth - 32) / SIZE), 28)
  const boardSize = cellSize * (SIZE - 1)
  const padding = cellSize

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '1rem' }}>
      <div style={{
        background: 'linear-gradient(135deg, #333, #555)',
        color: '#FFF', padding: '1rem 1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={handleBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← {mode === 'online' ? '나가기' : '돌아가기'}
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>
            오목 {mode === 'online' ? `(온라인)` : ''}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {mode === 'local' && (
              <button onClick={undo}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 12, borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}>
                ↩ 무르기
              </button>
            )}
            <button onClick={reset}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 12, borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}>
              새 게임
            </button>
          </div>
        </div>
      </div>

      {/* 턴 표시 */}
      <div style={{
        textAlign: 'center', padding: '10px 0',
        fontSize: 14, fontWeight: 600,
        color: winner ? '#F1C40F' : '#333',
        background: winner ? '#FFF9E6' : '#F7F6F3',
      }}>
        {winner
          ? `🎉 ${winner === 'black' ? '⚫ 흑' : '⚪ 백'} 승리!`
          : mode === 'online'
            ? (isMyTurn
              ? `내 차례 (${room.myColor === 'black' ? '⚫ 흑' : '⚪ 백'}) · ${history.length}수`
              : `상대 차례 · ${history.length}수`)
            : `${turn === 'black' ? '⚫ 흑' : '⚪ 백'}의 차례 · ${history.length}수`
        }
      </div>

      {mode === 'online' && (
        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0' }}>
          방 코드: <strong>{room.roomCode}</strong> · 나는 {room.myColor === 'black' ? '⚫ 흑' : '⚪ 백'}
        </div>
      )}

      {/* 바둑판 */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', overflow: 'auto' }}>
        <svg
          width={boardSize + padding * 2}
          height={boardSize + padding * 2}
          style={{ background: '#DCB35C', borderRadius: 8 }}
        >
          {Array.from({ length: SIZE }).map((_, i) => (
            <g key={`line-${i}`}>
              <line x1={padding} y1={padding + i * cellSize} x2={padding + (SIZE - 1) * cellSize} y2={padding + i * cellSize} stroke="#8B6914" strokeWidth={0.8} />
              <line x1={padding + i * cellSize} y1={padding} x2={padding + i * cellSize} y2={padding + (SIZE - 1) * cellSize} stroke="#8B6914" strokeWidth={0.8} />
            </g>
          ))}

          {[[3, 3], [3, 7], [3, 11], [7, 3], [7, 7], [7, 11], [11, 3], [11, 7], [11, 11]].map(([r, c]) => (
            <circle key={`dot-${r}-${c}`} cx={padding + c * cellSize} cy={padding + r * cellSize} r={2.5} fill="#8B6914" />
          ))}

          {board.map((row, r) => row.map((cell, c) => {
            if (!cell) return null
            const isLast = lastMove && lastMove[0] === r && lastMove[1] === c
            return (
              <g key={`stone-${r}-${c}`}>
                <circle cx={padding + c * cellSize} cy={padding + r * cellSize} r={cellSize * 0.42}
                  fill={cell === 'black' ? '#222' : '#FFF'} stroke={cell === 'black' ? '#000' : '#AAA'} strokeWidth={0.8} />
                {isLast && <circle cx={padding + c * cellSize} cy={padding + r * cellSize} r={3} fill="#E74C3C" />}
              </g>
            )
          }))}

          {!winner && board.map((row, r) => row.map((cell, c) => {
            if (cell) return null
            return (
              <rect key={`click-${r}-${c}`}
                x={padding + c * cellSize - cellSize / 2} y={padding + r * cellSize - cellSize / 2}
                width={cellSize} height={cellSize} fill="transparent"
                style={{ cursor: isMyTurn ? 'pointer' : 'default' }}
                onClick={() => place(r, c)} />
            )
          }))}
        </svg>
      </div>
    </div>
  )
}
