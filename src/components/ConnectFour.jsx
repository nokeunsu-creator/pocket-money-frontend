import { useState, useEffect, useRef } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

const ROWS = 6
const COLS = 7

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}
function boardToFlat(board) {
  return board.map(row => row.map(c => c ? c[0] : '.').join('')).join('|')
}
function flatToBoard(flat) {
  if (!flat) return createBoard()
  return flat.split('|').map(row => row.split('').map(ch => ch === 'r' ? 'red' : ch === 'y' ? 'yellow' : null))
}

function dropRow(board, c) {
  for (let r = ROWS - 1; r >= 0; r--) if (board[r][c] === null) return r
  return -1
}
function checkWin(board, r, c, p) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  for (const [dr, dc] of dirs) {
    let count = 1
    for (let d = 1; d < 4; d++) {
      const nr = r + dr * d, nc = c + dc * d
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== p) break
      count++
    }
    for (let d = 1; d < 4; d++) {
      const nr = r - dr * d, nc = c - dc * d
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== p) break
      count++
    }
    if (count >= 4) return true
  }
  return false
}
function isFull(board) { for (let c = 0; c < COLS; c++) if (board[0][c] === null) return false; return true }
function opp(p) { return p === 'red' ? 'yellow' : 'red' }

function evalLine(line, p) {
  const o = opp(p)
  let my = 0, op = 0
  for (const v of line) { if (v === p) my++; else if (v === o) op++ }
  if (my && op) return 0
  if (my === 4) return 100000
  if (op === 4) return -100000
  if (my === 3) return 50
  if (op === 3) return -80
  if (my === 2) return 5
  if (op === 2) return -8
  return 0
}
function evaluate(board, p) {
  let s = 0
  for (let r = 0; r < ROWS; r++) {
    if (board[r][3] === p) s += 3
    else if (board[r][3] === opp(p)) s -= 3
  }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
    for (const [dr, dc] of dirs) {
      const er = r + dr * 3, ec = c + dc * 3
      if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue
      const line = [board[r][c], board[r + dr][c + dc], board[r + dr * 2][c + dc * 2], board[r + dr * 3][c + dc * 3]]
      s += evalLine(line, p)
    }
  }
  return s
}
function negamax(board, p, depth, alpha, beta) {
  if (depth === 0 || isFull(board)) return evaluate(board, p)
  let best = -Infinity
  const colOrder = [3, 2, 4, 1, 5, 0, 6]
  let anyMove = false
  for (const c of colOrder) {
    const r = dropRow(board, c)
    if (r < 0) continue
    anyMove = true
    board[r][c] = p
    if (checkWin(board, r, c, p)) { board[r][c] = null; return 100000 + depth }
    const score = -negamax(board, opp(p), depth - 1, -beta, -alpha)
    board[r][c] = null
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break
  }
  if (!anyMove) return 0
  return best
}
function aiMove(board) {
  for (let c = 0; c < COLS; c++) {
    const r = dropRow(board, c); if (r < 0) continue
    board[r][c] = 'yellow'
    if (checkWin(board, r, c, 'yellow')) { board[r][c] = null; return c }
    board[r][c] = null
  }
  for (let c = 0; c < COLS; c++) {
    const r = dropRow(board, c); if (r < 0) continue
    board[r][c] = 'red'
    if (checkWin(board, r, c, 'red')) { board[r][c] = null; return c }
    board[r][c] = null
  }
  let best = 3, bestScore = -Infinity
  const colOrder = [3, 2, 4, 1, 5, 0, 6]
  for (const c of colOrder) {
    const r = dropRow(board, c); if (r < 0) continue
    board[r][c] = 'yellow'
    const score = -negamax(board, 'red', 5, -Infinity, Infinity)
    board[r][c] = null
    if (score > bestScore) { bestScore = score; best = c }
  }
  return best
}

function getWinCells(board, r, c, p) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  for (const [dr, dc] of dirs) {
    const cells = [[r, c]]
    for (let d = 1; d < 4; d++) {
      const nr = r + dr * d, nc = c + dc * d
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== p) break
      cells.push([nr, nc])
    }
    for (let d = 1; d < 4; d++) {
      const nr = r - dr * d, nc = c - dc * d
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== p) break
      cells.push([nr, nc])
    }
    if (cells.length >= 4) return cells
  }
  return []
}

export default function ConnectFour({ onBack }) {
  const [mode, setMode] = useState(null)
  const [board, setBoard] = useState(createBoard)
  const [turn, setTurn] = useState('red')
  const [winner, setWinner] = useState(null)
  const [winCells, setWinCells] = useState([])
  const [joinCode, setJoinCode] = useState('')
  const aiBusyRef = useRef(false)

  const room = useGameRoom('connect4')

  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = room.gameState
    setBoard(flatToBoard(s.board))
    setTurn(s.turn || 'red')
    setWinner(s.winner || null)
    setWinCells(s.winCells || [])
  }, [room.gameState, mode])

  // 색 매핑: host=red, guest=yellow
  const myColorOnline = room.myColor === 'black' ? 'red' : room.myColor === 'white' ? 'yellow' : null
  const myColor = mode === 'local' ? turn
    : mode === 'ai' ? 'red'
    : mode === 'online' ? myColorOnline : null

  const isMyTurn = !winner && (
    mode === 'local'
    || (mode === 'ai' && turn === 'red')
    || (mode === 'online' && room.connected && turn === myColorOnline)
  )

  const drop = (c) => {
    if (!isMyTurn) return
    const r = dropRow(board, c)
    if (r < 0) return
    const player = mode === 'local' ? turn : myColor
    const nb = board.map(row => [...row])
    nb[r][c] = player
    let nextTurn = opp(player)
    let nextWinner = null
    let nextWinCells = []
    if (checkWin(nb, r, c, player)) {
      nextWinner = player
      nextWinCells = getWinCells(nb, r, c, player)
    } else if (isFull(nb)) {
      nextWinner = 'draw'
    }
    if (mode === 'online') {
      room.updateState({
        board: boardToFlat(nb),
        turn: nextTurn, winner: nextWinner || '', winCells: nextWinCells,
      })
    }
    setBoard(nb)
    setTurn(nextTurn)
    if (nextWinner) { setWinner(nextWinner); setWinCells(nextWinCells) }
  }

  useEffect(() => {
    if (mode !== 'ai' || winner) return
    if (turn !== 'yellow') return
    if (aiBusyRef.current) return
    aiBusyRef.current = true
    const t = setTimeout(() => {
      const work = board.map(row => [...row])
      const c = aiMove(work)
      const r = dropRow(board, c)
      const nb = board.map(row => [...row])
      nb[r][c] = 'yellow'
      setBoard(nb)
      if (checkWin(nb, r, c, 'yellow')) {
        setWinner('yellow'); setWinCells(getWinCells(nb, r, c, 'yellow'))
      } else if (isFull(nb)) {
        setWinner('draw')
      } else {
        setTurn('red')
      }
      aiBusyRef.current = false
    }, 500)
    return () => { clearTimeout(t); aiBusyRef.current = false }
  }, [turn, board, winner, mode])

  const reset = () => {
    const fresh = createBoard()
    if (mode === 'online') {
      room.updateState({ board: boardToFlat(fresh), turn: 'red', winner: '', winCells: [] })
    }
    setBoard(fresh); setTurn('red'); setWinner(null); setWinCells([])
    aiBusyRef.current = false
  }

  const handleBack = () => {
    if (mode === 'online') room.leaveRoom()
    if (mode) { setMode(null); setBoard(createBoard()); setTurn('red'); setWinner(null); setWinCells([]); aiBusyRef.current = false; return }
    onBack()
  }

  const createOnline = async () => {
    await room.createRoom({ board: boardToFlat(createBoard()), turn: 'red', winner: '', winCells: [] })
    setMode('online')
  }
  const joinOnline = async () => {
    if (joinCode.length !== 2) { room.setError('2자리 코드를 입력하세요'); return }
    const ok = await room.joinRoom(joinCode); if (ok) setMode('online')
  }

  if (!mode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 15, color: '#888', cursor: 'pointer', marginBottom: 16 }}>← 돌아가기</button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🔴</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>커넥트 포 (사목)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => setMode('local')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #1565C0, #0D47A1)' }}>📱 같은 기기에서 (2인)</button>
          <button onClick={() => setMode('ai')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #E67E22, #D35400)' }}>🤖 vs 컴퓨터</button>
          <button onClick={createOnline}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #4895EF, #3A7BD5)' }}>🌐 온라인 방 만들기</button>
          <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>또는 코드로 참가</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.replace(/[^0-9]/g, ''))}
              maxLength={2} placeholder="방 코드 2자리" inputMode="numeric"
              style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '12px', borderRadius: 10, border: '2px solid #DDD', fontSize: 16, fontWeight: 700, textAlign: 'center', letterSpacing: 4, fontFamily: 'monospace' }} />
            <button onClick={joinOnline}
              style={{ padding: '0 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#4895EF', color: '#FFF', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 52, flexShrink: 0 }}>참가</button>
          </div>
          {room.error && <div style={{ color: '#E74C3C', fontSize: 13 }}>{room.error}</div>}
        </div>
      </div>
    )
  }

  if (mode === 'online' && !room.connected) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack} style={{ background: 'none', border: 'none', fontSize: 15, color: '#888', cursor: 'pointer', marginBottom: 24 }}>← 취소</button>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>상대를 기다리는 중...</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>상대방에게 아래 코드를 알려주세요</p>
        <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 8, padding: '16px 24px', background: '#F7F6F3', borderRadius: 14, display: 'inline-block', fontFamily: 'monospace' }}>{room.roomCode}</div>
        <p style={{ fontSize: 12, color: '#AAA', marginTop: 16 }}>나는 🔴 (선공)</p>
      </div>
    )
  }

  const cellPx = Math.min(48, Math.floor((Math.min(typeof window !== 'undefined' ? window.innerWidth : 360, 480) - 40) / COLS))

  const statusText = (() => {
    if (winner === 'draw') return '🤝 무승부'
    if (winner) {
      if (mode === 'online') return winner === myColorOnline ? '🎉 승리!' : '😵 패배'
      if (mode === 'ai') return winner === 'red' ? '🎉 4개 연결!' : '😵 AI 승리'
      return winner === 'red' ? '🔴 승리!' : '🟡 승리!'
    }
    if (mode === 'ai' && turn === 'yellow') return 'AI 생각 중... (🟡)'
    if (mode === 'online') return isMyTurn ? `내 차례 (${myColorOnline === 'red' ? '🔴' : '🟡'})` : '상대 차례'
    return (turn === 'red' ? '🔴' : '🟡') + ' 차례'
  })()

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={handleBack} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>
          🔴 커넥트 포 {mode === 'online' ? '(온라인)' : mode === 'ai' ? '(vs AI)' : '(2인)'}
        </h2>
        <button onClick={reset} style={{ background: '#F0F0F0', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>리셋</button>
      </div>

      {mode === 'online' && (
        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0', borderRadius: 6, marginBottom: 6 }}>
          방 코드: <strong>{room.roomCode}</strong> · 나는 {myColorOnline === 'red' ? '🔴' : '🟡'}
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 10, fontSize: 14, fontWeight: 700, minHeight: 18 }}>
        {statusText}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${cellPx}px)`, gap: 4, justifyContent: 'center', marginBottom: 4 }}>
            {Array.from({ length: COLS }).map((_, c) => (
              <button key={c} onClick={() => drop(c)}
                disabled={!isMyTurn || dropRow(board, c) < 0}
                style={{
                  height: 26, borderRadius: 6, border: 'none',
                  background: isMyTurn && dropRow(board, c) >= 0 ? '#FFD54F' : '#EEE',
                  cursor: isMyTurn && dropRow(board, c) >= 0 ? 'pointer' : 'default',
                  fontWeight: 700, fontSize: 14,
                }}>↓</button>
            ))}
          </div>

          <div style={{ background: '#1565C0', padding: 6, borderRadius: 10, display: 'inline-block' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${cellPx}px)`, gap: 4 }}>
              {board.map((row, r) => row.map((cell, c) => {
                const isWin = winCells.some(([wr, wc]) => wr === r && wc === c)
                return (
                  <div key={r + '-' + c} onClick={() => drop(c)}
                    style={{
                      width: cellPx, height: cellPx, borderRadius: '50%',
                      background: cell === 'red' ? 'radial-gradient(circle at 30% 30%, #E57373, #C62828)'
                        : cell === 'yellow' ? 'radial-gradient(circle at 30% 30%, #FFF176, #F9A825)'
                        : '#0D47A1',
                      boxShadow: isWin ? '0 0 0 3px #FFD54F' : 'inset 0 2px 4px rgba(0,0,0,0.4)',
                      cursor: isMyTurn && !cell ? 'pointer' : 'default',
                    }} />
                )
              }))}
            </div>
          </div>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 10 }}>
        칼럼을 눌러 떨어뜨림 · 가로/세로/대각선 4개 연결 시 승리
      </p>
    </div>
  )
}
