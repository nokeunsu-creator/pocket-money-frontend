import { useState, useEffect, useCallback, useRef } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

const SIZE = 13 // 13×13 (모바일 가독성)
const WIN = 6

function createBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
}

function boardToFlat(b) {
  return b.map(r => r.map(c => c || '').join(',')).join('|')
}
function flatToBoard(flat) {
  if (!flat) return createBoard()
  return flat.split('|').map(r => r.split(',').map(c => c || null))
}

function checkWin(board, r, c, player) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  for (const [dr, dc] of dirs) {
    let count = 1
    for (let d = 1; d < WIN; d++) {
      const nr = r + dr * d, nc = c + dc * d
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === player) count++
      else break
    }
    for (let d = 1; d < WIN; d++) {
      const nr = r - dr * d, nc = c - dc * d
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === player) count++
      else break
    }
    if (count >= WIN) return true
  }
  return false
}

function getCandidates(board) {
  const cand = new Set()
  let hasAny = false
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c]) {
        hasAny = true
        for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
          const nr = r + dr, nc = c + dc
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !board[nr][nc]) {
            cand.add(nr * SIZE + nc)
          }
        }
      }
    }
  }
  if (!hasAny) return [[Math.floor(SIZE / 2), Math.floor(SIZE / 2)]]
  return [...cand].map(v => [Math.floor(v / SIZE), v % SIZE])
}

// 위치 평가
function evalPos(board, r, c, player) {
  const opp = player === 'black' ? 'white' : 'black'
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  let score = 0
  board[r][c] = player
  for (const [dr, dc] of dirs) {
    let count = 1
    let openA = false, openB = false
    for (let d = 1; d < WIN; d++) {
      const nr = r + dr * d, nc = c + dc * d
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
        if (board[nr][nc] === player) count++
        else { if (!board[nr][nc]) openA = true; break }
      } else break
    }
    for (let d = 1; d < WIN; d++) {
      const nr = r - dr * d, nc = c - dc * d
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
        if (board[nr][nc] === player) count++
        else { if (!board[nr][nc]) openB = true; break }
      } else break
    }
    if (count >= 6) score += 1000000
    else if (count === 5) score += openA && openB ? 100000 : 50000
    else if (count === 4) score += openA && openB ? 10000 : 1000
    else if (count === 3) score += openA && openB ? 1000 : 100
    else if (count === 2) score += openA && openB ? 50 : 10
  }
  board[r][c] = null
  return score
}

// AI: 2수를 둠. 그리디 + 동시 위협 차단
function aiMove(board, player) {
  const cands = getCandidates(board)
  const opp = player === 'black' ? 'white' : 'black'

  // 첫 수
  const scored = cands.map(([r, c]) => {
    const offense = evalPos(board, r, c, player)
    const defense = evalPos(board, r, c, opp)
    return { r, c, score: offense + defense * 0.9 }
  }).sort((a, b) => b.score - a.score)

  const first = scored[0]
  board[first.r][first.c] = player

  // 두 번째 수 (첫수 둔 상태에서 다시 평가)
  const cand2 = getCandidates(board).filter(([r, c]) => !(r === first.r && c === first.c))
  let second
  if (cand2.length === 0) {
    second = first
  } else {
    const scored2 = cand2.map(([r, c]) => {
      const offense = evalPos(board, r, c, player)
      const defense = evalPos(board, r, c, opp)
      return { r, c, score: offense + defense * 0.9 }
    }).sort((a, b) => b.score - a.score)
    second = scored2[0]
  }
  board[first.r][first.c] = null
  return [[first.r, first.c], [second.r, second.c]]
}

export default function SixInRow({ onBack }) {
  const [mode, setMode] = useState(null) // 'ai' | 'online'
  if (!mode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16, display: 'block' }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>⚫</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>6목 (육목)</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
          첫 수는 1개, 그 뒤로는 <b>한 턴에 2수</b>씩!<br />
          가로/세로/대각선 6개 먼저 만들면 승<br />
          (13×13 판)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
          <button onClick={() => setMode('ai')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #34495E, #1A2530)', color: '#FFF', fontSize: 16, fontWeight: 700 }}>
            🤖 AI 대전
          </button>
          <button onClick={() => setMode('online')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4895EF, #1F77B4)', color: '#FFF', fontSize: 16, fontWeight: 700 }}>
            🌐 온라인 2인
          </button>
        </div>
      </div>
    )
  }
  if (mode === 'ai') return <SixAI onBack={() => setMode(null)} />
  return <SixOnline onBack={() => setMode(null)} />
}

function SixAI({ onBack }) {
  const [board, setBoard] = useState(createBoard())
  const [turn, setTurn] = useState('black') // black=나
  const [movesThisTurn, setMovesThisTurn] = useState(0) // 현재 턴에 둔 수
  const [moveNumber, setMoveNumber] = useState(0) // 누적 수 (첫 1수 이후엔 2씩)
  const [winner, setWinner] = useState(null)
  const [pending, setPending] = useState([]) // 임시로 둔 좌표 (취소용)

  const movesPerTurn = moveNumber === 0 ? 1 : 2

  const reset = () => {
    setBoard(createBoard()); setTurn('black'); setMovesThisTurn(0); setMoveNumber(0); setWinner(null); setPending([])
  }

  const placeMyStone = (r, c) => {
    if (winner || turn !== 'black' || board[r][c]) return
    const nb = board.map(row => [...row])
    nb[r][c] = 'black'
    const won = checkWin(nb, r, c, 'black')
    setBoard(nb)
    setPending(p => [...p, [r, c]])
    const newMoves = movesThisTurn + 1
    if (won) { setWinner('black'); return }
    if (newMoves >= movesPerTurn) {
      // 턴 종료
      setMovesThisTurn(0); setMoveNumber(n => n + newMoves); setPending([])
      setTurn('white')
    } else {
      setMovesThisTurn(newMoves)
    }
  }

  // AI 턴
  useEffect(() => {
    if (turn !== 'white' || winner) return
    const t = setTimeout(() => {
      const wMoves = moveNumber === 0 ? 1 : 2
      const nb = board.map(row => [...row])
      let won = false
      for (let i = 0; i < wMoves; i++) {
        const cands = getCandidates(nb)
        // 첫 수만 평가
        const scored = cands.map(([r, c]) => ({
          r, c, score: evalPos(nb, r, c, 'white') + evalPos(nb, r, c, 'black') * 0.9,
        })).sort((a, b) => b.score - a.score)
        const pick = scored[0]
        nb[pick.r][pick.c] = 'white'
        if (checkWin(nb, pick.r, pick.c, 'white')) { won = true; break }
      }
      setBoard(nb)
      setMoveNumber(n => n + wMoves)
      if (won) setWinner('white')
      else setTurn('black')
    }, 600)
    return () => clearTimeout(t)
  }, [turn, board, moveNumber, winner])

  const cellPx = Math.min(28, Math.floor((window.innerWidth - 40) / SIZE))

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>⚫ 6목 (vs AI)</h2>
        <button onClick={reset}
          style={{ background: '#F0F0F0', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>리셋</button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 10, fontSize: 14, fontWeight: 700 }}>
        {winner
          ? (winner === 'black' ? '🎉 내가 6목 완성!' : '😵 AI가 6목 완성')
          : turn === 'black'
            ? `내 차례 (${movesThisTurn + 1}/${movesPerTurn})`
            : 'AI 생각 중...'}
      </div>

      <div style={{
        background: '#DCB35C', padding: 8, borderRadius: 8,
        display: 'inline-block', width: '100%', boxSizing: 'border-box',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gap: 0,
        }}>
          {board.map((row, r) => row.map((cell, c) => (
            <div key={r + '-' + c} onClick={() => placeMyStone(r, c)}
              style={{
                aspectRatio: '1/1',
                border: '1px solid #8B6F2A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#DCB35C',
                cursor: !cell && !winner && turn === 'black' ? 'pointer' : 'default',
                position: 'relative',
              }}>
              {cell && (
                <div style={{
                  width: '85%', height: '85%', borderRadius: '50%',
                  background: cell === 'black' ? 'radial-gradient(circle at 30% 30%, #555, #000)' : 'radial-gradient(circle at 30% 30%, #FFF, #CCC)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }} />
              )}
            </div>
          )))}
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 10 }}>
        흑(나) 첫 수 1개 → 백(AI) 2개 → 흑 2개 → ... · 6개 연속 승
      </p>
    </div>
  )
}

function SixOnline({ onBack }) {
  const room = useGameRoom('sixrow')
  const [joinCode, setJoinCode] = useState('')

  const initialState = () => ({
    board: boardToFlat(createBoard()),
    turn: 'black',
    movesThisTurn: 0,
    moveNumber: 0,
    winner: null,
  })

  if (!room.roomCode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>← 돌아가기</button>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>⚫</div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>6목 온라인</h2>
        </div>
        <button onClick={() => room.createRoom(initialState())}
          style={{ width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', background: '#34495E', color: '#FFF', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>
          ➕ 방 만들기
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 2))}
            placeholder="방 코드 2자리" inputMode="numeric"
            style={{ flex: 1, padding: '14px', fontSize: 16, borderRadius: 12, border: '1.5px solid #DDD', minWidth: 0, boxSizing: 'border-box', textAlign: 'center' }} />
          <button onClick={() => room.joinRoom(joinCode, initialState())}
            disabled={joinCode.length !== 2}
            style={{ padding: '0 18px', borderRadius: 12, border: 'none', background: joinCode.length === 2 ? '#4895EF' : '#DDD', color: '#FFF', fontWeight: 700, cursor: joinCode.length === 2 ? 'pointer' : 'default' }}>참가</button>
        </div>
        {room.error && <p style={{ color: '#C62828', textAlign: 'center', marginTop: 10 }}>{room.error}</p>}
      </div>
    )
  }

  if (!room.connected) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>방 코드: <span style={{ color: '#34495E' }}>{room.roomCode}</span></h2>
        <p style={{ color: '#888', marginTop: 16 }}>친구 기다리는 중...</p>
        <button onClick={room.leaveRoom} style={{ marginTop: 24, padding: '12px 24px', borderRadius: 12, border: 'none', background: '#F0F0F0', cursor: 'pointer' }}>나가기</button>
      </div>
    )
  }

  const s = room.gameState || initialState()
  const board = flatToBoard(s.board)
  const myColor = room.myColor
  const isMyTurn = s.turn === myColor && !s.winner
  const movesPerTurn = s.moveNumber === 0 ? 1 : 2

  const placeStone = (r, c) => {
    if (!isMyTurn || board[r][c] || s.winner) return
    const nb = board.map(row => [...row])
    nb[r][c] = myColor
    const won = checkWin(nb, r, c, myColor)
    const newMoves = s.movesThisTurn + 1
    const next = { ...s, board: boardToFlat(nb) }
    if (won) next.winner = myColor
    else if (newMoves >= movesPerTurn) {
      next.movesThisTurn = 0
      next.moveNumber = s.moveNumber + newMoves
      next.turn = myColor === 'black' ? 'white' : 'black'
    } else {
      next.movesThisTurn = newMoves
    }
    room.updateState(next)
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={room.leaveRoom} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 14, fontWeight: 700 }}>방 {room.roomCode} · 나는 {myColor === 'black' ? '⚫흑' : '⚪백'}</h2>
        <div style={{ width: 22 }} />
      </div>

      <div style={{ textAlign: 'center', marginBottom: 10, fontSize: 14, fontWeight: 700 }}>
        {s.winner
          ? (s.winner === myColor ? '🎉 승리!' : '😵 패배')
          : isMyTurn
            ? `내 차례 (${s.movesThisTurn + 1}/${movesPerTurn})`
            : '상대 차례...'}
      </div>

      <div style={{ background: '#DCB35C', padding: 8, borderRadius: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
          {board.map((row, r) => row.map((cell, c) => (
            <div key={r + '-' + c} onClick={() => placeStone(r, c)}
              style={{
                aspectRatio: '1/1', border: '1px solid #8B6F2A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: !cell && isMyTurn ? 'pointer' : 'default',
              }}>
              {cell && (
                <div style={{
                  width: '85%', height: '85%', borderRadius: '50%',
                  background: cell === 'black' ? 'radial-gradient(circle at 30% 30%, #555, #000)' : 'radial-gradient(circle at 30% 30%, #FFF, #CCC)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }} />
              )}
            </div>
          )))}
        </div>
      </div>
    </div>
  )
}
