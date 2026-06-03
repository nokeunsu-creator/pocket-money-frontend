import { useState, useEffect, useRef } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

const SIZE = 8

function createBoard() {
  const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < SIZE; c++) {
      if ((r + c) % 2 === 1) b[r][c] = { color: 'black', king: false }
    }
  }
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < SIZE; c++) {
      if ((r + c) % 2 === 1) b[r][c] = { color: 'red', king: false }
    }
  }
  return b
}

function cellToCh(p) {
  if (!p) return '.'
  if (p.color === 'red') return p.king ? 'R' : 'r'
  return p.king ? 'B' : 'b'
}
function chToCell(ch) {
  if (ch === '.') return null
  if (ch === 'r') return { color: 'red', king: false }
  if (ch === 'R') return { color: 'red', king: true }
  if (ch === 'b') return { color: 'black', king: false }
  if (ch === 'B') return { color: 'black', king: true }
  return null
}
function boardToFlat(b) {
  return b.map(row => row.map(cellToCh).join('')).join('|')
}
function flatToBoard(flat) {
  if (!flat) return createBoard()
  return flat.split('|').map(row => row.split('').map(chToCell))
}

function clone(board) {
  return board.map(row => row.map(c => c ? { ...c } : null))
}

function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE }
function opp(c) { return c === 'red' ? 'black' : 'red' }

function dirsFor(piece) {
  if (piece.king) return [[-1,-1],[-1,1],[1,-1],[1,1]]
  return piece.color === 'red' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]]
}

function continueJump(curBoard, cr, cc, steps, captures, results, origR, origC) {
  const cp = curBoard[cr][cc]
  for (const [dr, dc] of dirsFor(cp)) {
    const mr = cr + dr, mc = cc + dc
    const lr = cr + dr * 2, lc = cc + dc * 2
    if (!inBounds(lr, lc)) continue
    if (!curBoard[mr][mc] || curBoard[mr][mc].color !== opp(cp.color)) continue
    if (curBoard[lr][lc] !== null) continue
    const nb = clone(curBoard)
    const moved = { ...nb[cr][cc] }
    if (moved.color === 'red' && lr === 0) moved.king = true
    if (moved.color === 'black' && lr === SIZE - 1) moved.king = true
    nb[cr][cc] = null
    nb[mr][mc] = null
    nb[lr][lc] = moved
    const newSteps = [...steps, [lr, lc]]
    const newCaps = [...captures, [mr, mc]]
    results.push({ from: [origR, origC], steps: newSteps, captures: newCaps })
    continueJump(nb, lr, lc, newSteps, newCaps, results, origR, origC)
  }
}

function jumpsFrom(board, r, c) {
  const piece = board[r][c]
  if (!piece) return []
  const results = []
  for (const [dr, dc] of dirsFor(piece)) {
    const mr = r + dr, mc = c + dc
    const lr = r + dr * 2, lc = c + dc * 2
    if (!inBounds(lr, lc)) continue
    if (!board[mr][mc] || board[mr][mc].color !== opp(piece.color)) continue
    if (board[lr][lc] !== null) continue
    const nb = clone(board)
    const moved = { ...nb[r][c] }
    if (moved.color === 'red' && lr === 0) moved.king = true
    if (moved.color === 'black' && lr === SIZE - 1) moved.king = true
    nb[r][c] = null
    nb[mr][mc] = null
    nb[lr][lc] = moved
    const captures = [[mr, mc]]
    results.push({ from: [r, c], steps: [[lr, lc]], captures })
    continueJump(nb, lr, lc, [[lr, lc]], captures, results, r, c)
  }
  return results
}

function simpleMovesFrom(board, r, c) {
  const piece = board[r][c]
  if (!piece) return []
  const out = []
  for (const [dr, dc] of dirsFor(piece)) {
    const nr = r + dr, nc = c + dc
    if (!inBounds(nr, nc) || board[nr][nc] !== null) continue
    out.push({ from: [r, c], steps: [[nr, nc]], captures: [] })
  }
  return out
}

function allMoves(board, color) {
  const jumps = []
  const simple = []
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const p = board[r][c]
    if (!p || p.color !== color) continue
    jumps.push(...jumpsFrom(board, r, c))
    simple.push(...simpleMovesFrom(board, r, c))
  }
  return jumps.length > 0 ? jumps : simple
}

function applyMove(board, move) {
  const nb = clone(board)
  const [fr, fc] = move.from
  let piece = { ...nb[fr][fc] }
  nb[fr][fc] = null
  for (const [cr, cc] of move.captures) nb[cr][cc] = null
  const [lr, lc] = move.steps[move.steps.length - 1]
  if (piece.color === 'red' && lr === 0) piece.king = true
  if (piece.color === 'black' && lr === SIZE - 1) piece.king = true
  nb[lr][lc] = piece
  return nb
}

function evaluate(board) {
  let s = 0
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const p = board[r][c]
    if (!p) continue
    const val = p.king ? 5 : 3
    const adv = p.king ? 0 : (p.color === 'black' ? r : SIZE - 1 - r) * 0.1
    if (p.color === 'black') s += val + adv
    else s -= val + adv
  }
  return s
}

function negamax(board, color, depth, alpha, beta) {
  const moves = allMoves(board, color)
  if (moves.length === 0) return color === 'black' ? -10000 : 10000
  if (depth === 0) return color === 'black' ? evaluate(board) : -evaluate(board)
  let best = -Infinity
  for (const m of moves) {
    const nb = applyMove(board, m)
    const score = -negamax(nb, opp(color), depth - 1, -beta, -alpha)
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break
  }
  return best
}

function aiBestMove(board) {
  const moves = allMoves(board, 'black')
  if (moves.length === 0) return null
  let best = moves[0], bestScore = -Infinity
  for (const m of moves) {
    const nb = applyMove(board, m)
    const score = -negamax(nb, 'red', 4, -Infinity, Infinity)
    if (score > bestScore) { bestScore = score; best = m }
  }
  return best
}

function piecesCount(board, color) {
  let n = 0
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (board[r][c]?.color === color) n++
  }
  return n
}

export default function Checkers({ onBack }) {
  const [mode, setMode] = useState(null)
  const [board, setBoard] = useState(createBoard)
  const [turn, setTurn] = useState('red')
  const [selected, setSelected] = useState(null)
  const [winner, setWinner] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const aiBusyRef = useRef(false)

  const room = useGameRoom('checkers')

  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = room.gameState
    setBoard(flatToBoard(s.board))
    setTurn(s.turn || 'red')
    setWinner(s.winner || null)
    setSelected(null)
  }, [room.gameState, mode])

  // 색 매핑: host=red, guest=black
  const myColorOnline = room.myColor === 'black' ? 'red' : room.myColor === 'white' ? 'black' : null
  const myColor = mode === 'local' ? turn
    : mode === 'ai' ? 'red'
    : mode === 'online' ? myColorOnline : null

  const isMyTurn = !winner && (
    mode === 'local'
    || (mode === 'ai' && turn === 'red')
    || (mode === 'online' && room.connected && turn === myColorOnline)
  )

  const myMoves = (isMyTurn && myColor) ? allMoves(board, myColor) : []
  const movesFromSel = selected
    ? myMoves.filter(m => m.from[0] === selected[0] && m.from[1] === selected[1])
    : []
  const cellHints = new Set()
  for (const m of movesFromSel) {
    const [lr, lc] = m.steps[m.steps.length - 1]
    cellHints.add(`${lr},${lc}`)
  }
  const selectable = new Set()
  for (const m of myMoves) selectable.add(`${m.from[0]},${m.from[1]}`)

  const sync = (nb, nextTurn, w) => {
    if (mode === 'online') {
      room.updateState({ board: boardToFlat(nb), turn: nextTurn, winner: w || '' })
    }
    setBoard(nb)
    setTurn(nextTurn)
    if (w) setWinner(w)
  }

  const click = (r, c) => {
    if (!isMyTurn) return
    const color = mode === 'local' ? turn : myColor
    if (selected) {
      if (selected[0] === r && selected[1] === c) { setSelected(null); return }
      const target = movesFromSel.find(m => {
        const [lr, lc] = m.steps[m.steps.length - 1]
        return lr === r && lc === c
      })
      if (target) {
        const nb = applyMove(board, target)
        setSelected(null)
        const next = opp(color)
        if (piecesCount(nb, next) === 0 || allMoves(nb, next).length === 0) {
          sync(nb, next, color)
        } else {
          sync(nb, next, null)
        }
        return
      }
      if (board[r][c]?.color === color && selectable.has(`${r},${c}`)) {
        setSelected([r, c]); return
      }
      return
    }
    if (board[r][c]?.color === color && selectable.has(`${r},${c}`)) {
      setSelected([r, c])
    }
  }

  useEffect(() => {
    if (mode !== 'ai' || winner) return
    if (turn !== 'black') return
    if (aiBusyRef.current) return
    aiBusyRef.current = true
    const t = setTimeout(() => {
      const mv = aiBestMove(board)
      if (!mv) { setWinner('red'); aiBusyRef.current = false; return }
      const nb = applyMove(board, mv)
      if (piecesCount(nb, 'red') === 0 || allMoves(nb, 'red').length === 0) {
        setBoard(nb); setWinner('black')
      } else {
        setBoard(nb); setTurn('red')
      }
      aiBusyRef.current = false
    }, 600)
    return () => { clearTimeout(t); aiBusyRef.current = false }
  }, [turn, board, winner, mode])

  const reset = () => {
    const fresh = createBoard()
    sync(fresh, 'red', null)
    setWinner(null); setSelected(null)
    aiBusyRef.current = false
  }

  const handleBack = () => {
    if (mode === 'online') room.leaveRoom()
    if (mode) { setMode(null); setBoard(createBoard()); setTurn('red'); setSelected(null); setWinner(null); aiBusyRef.current = false; return }
    onBack()
  }

  const createOnline = async () => {
    await room.createRoom({ board: boardToFlat(createBoard()), turn: 'red', winner: '' })
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
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>체커</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => setMode('local')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #8D6E63, #5D4037)' }}>📱 같은 기기에서 (2인)</button>
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
        <p style={{ fontSize: 12, color: '#AAA', marginTop: 16 }}>나는 🔴 (선공, 위로 이동)</p>
      </div>
    )
  }

  const cellPx = Math.min(46, Math.floor((Math.min(typeof window !== 'undefined' ? window.innerWidth : 360, 480) - 32) / SIZE))

  const statusText = (() => {
    if (winner) {
      if (mode === 'online') return winner === myColorOnline ? '🎉 승리!' : '😵 패배'
      if (mode === 'ai') return winner === 'red' ? '🎉 승리!' : '😵 패배'
      return winner === 'red' ? '🔴 승리!' : '⚫ 승리!'
    }
    if (mode === 'ai' && turn === 'black') return 'AI 생각 중... (⚫)'
    if (mode === 'online') return isMyTurn ? `내 차례 (${myColorOnline === 'red' ? '🔴' : '⚫'})` : '상대 차례'
    return (turn === 'red' ? '🔴 (위로)' : '⚫ (아래로)') + ' 차례'
  })()

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={handleBack} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>
          🔴 체커 {mode === 'online' ? '(온라인)' : mode === 'ai' ? '(vs AI)' : '(2인)'}
        </h2>
        <button onClick={reset} style={{ background: '#F0F0F0', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>리셋</button>
      </div>

      {mode === 'online' && (
        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0', borderRadius: 6, marginBottom: 6 }}>
          방 코드: <strong>{room.roomCode}</strong> · 나는 {myColorOnline === 'red' ? '🔴' : '⚫'}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 6, fontSize: 13, fontWeight: 700 }}>
        <div>🔴 {piecesCount(board, 'red')}</div>
        <div>⚫ {piecesCount(board, 'black')}</div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 13, fontWeight: 700, minHeight: 18 }}>
        {statusText}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${SIZE}, ${cellPx}px)`,
          gap: 0, border: '4px solid #5D4037', borderRadius: 6,
        }}>
          {board.map((row, r) => row.map((cell, c) => {
            const dark = (r + c) % 2 === 1
            const isSelected = selected && selected[0] === r && selected[1] === c
            const isHint = cellHints.has(`${r},${c}`)
            return (
              <div key={r + '-' + c} onClick={() => click(r, c)}
                style={{
                  width: cellPx, height: cellPx,
                  background: isSelected ? '#FFD54F' : isHint ? '#A5D6A7' : (dark ? '#8D6E63' : '#EFEBE9'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: isMyTurn ? 'pointer' : 'default',
                }}>
                {cell && (
                  <div style={{
                    width: '78%', height: '78%', borderRadius: '50%',
                    background: cell.color === 'red'
                      ? 'radial-gradient(circle at 30% 30%, #EF5350, #B71C1C)'
                      : 'radial-gradient(circle at 30% 30%, #555, #000)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: cell.color === 'red' ? '#FFE082' : '#FFD54F',
                    fontWeight: 700, fontSize: cellPx * 0.4,
                  }}>
                    {cell.king ? '♛' : ''}
                  </div>
                )}
              </div>
            )
          }))}
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 10 }}>
        대각선 한 칸 이동 · 상대 말 뛰어넘어 잡기 · 끝줄 도달 시 킹(♛, 뒤로도 이동) · 점프 가능하면 점프 강제
      </p>
    </div>
  )
}
