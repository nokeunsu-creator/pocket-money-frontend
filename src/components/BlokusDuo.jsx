import { useState, useEffect, useRef } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

const SIZE = 14
const START_BLACK = [4, 4]
const START_WHITE = [9, 9]

const PIECES_RAW = [
  [[0,0]],
  [[0,0],[0,1]],
  [[0,0],[0,1],[0,2]],
  [[0,0],[0,1],[1,1]],
  [[0,0],[0,1],[0,2],[0,3]],
  [[0,0],[0,1],[0,2],[1,2]],
  [[0,0],[0,1],[0,2],[1,1]],
  [[0,0],[0,1],[1,0],[1,1]],
  [[0,0],[0,1],[1,1],[1,2]],
  [[0,0],[0,1],[0,2],[0,3],[0,4]],
  [[0,0],[0,1],[0,2],[0,3],[1,3]],
  [[0,0],[0,1],[0,2],[1,0],[1,2]],
  [[0,0],[0,1],[0,2],[1,2],[2,2]],
  [[0,0],[0,1],[0,2],[1,0],[1,1]],
  [[0,1],[1,0],[1,1],[1,2],[2,1]],
  [[0,0],[0,1],[0,2],[1,1],[2,1]],
  [[0,0],[1,0],[1,1],[1,2],[2,2]],
  [[0,0],[0,1],[1,1],[1,2],[2,2]],
  [[0,0],[1,0],[1,1],[2,1],[2,2]],
  [[0,1],[1,0],[1,1],[1,2],[0,0]],
  [[0,0],[1,0],[2,0],[2,1],[2,2]],
]

function normalize(cells) {
  const minR = Math.min(...cells.map(c => c[0]))
  const minC = Math.min(...cells.map(c => c[1]))
  return cells.map(([r, c]) => [r - minR, c - minC]).sort((a, b) => a[0] - b[0] || a[1] - b[1])
}
function rotate(cells) { return normalize(cells.map(([r, c]) => [c, -r])) }
function flip(cells) { return normalize(cells.map(([r, c]) => [r, -c])) }
function getAllOrientations(cells) {
  const set = new Map()
  let cur = normalize(cells)
  for (let i = 0; i < 4; i++) {
    set.set(JSON.stringify(cur), cur)
    set.set(JSON.stringify(flip(cur)), flip(cur))
    cur = rotate(cur)
  }
  return [...set.values()]
}

const PIECES = PIECES_RAW.map((cells, i) => ({
  id: i,
  cells: normalize(cells),
  orientations: getAllOrientations(cells),
  size: cells.length,
}))

function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE }

function canPlace(board, cells, r, c, player, isFirst) {
  let touchesCorner = false
  let coversStart = false
  const start = player === 'black' ? START_BLACK : START_WHITE
  for (const [dr, dc] of cells) {
    const nr = r + dr, nc = c + dc
    if (!inBounds(nr, nc)) return false
    if (board[nr][nc] !== null) return false
    for (const [ar, ac] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const ar2 = nr + ar, ac2 = nc + ac
      if (inBounds(ar2, ac2) && board[ar2][ac2] === player) return false
    }
    for (const [ar, ac] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      const ar2 = nr + ar, ac2 = nc + ac
      if (inBounds(ar2, ac2) && board[ar2][ac2] === player) touchesCorner = true
    }
    if (nr === start[0] && nc === start[1]) coversStart = true
  }
  if (isFirst) return coversStart
  return touchesCorner
}

function applyPiece(board, cells, r, c, player) {
  const nb = board.map(row => [...row])
  for (const [dr, dc] of cells) nb[r + dr][c + dc] = player
  return nb
}

function findAllMoves(board, available, player, isFirst, limit) {
  const moves = []
  for (const pid of available) {
    const piece = PIECES[pid]
    for (const orient of piece.orientations) {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (canPlace(board, orient, r, c, player, isFirst)) {
            moves.push({ pid, orient, r, c, size: piece.size })
            if (limit && moves.length >= limit) return moves
          }
        }
      }
    }
  }
  return moves
}

function aiMove(board, available, isFirst) {
  const moves = findAllMoves(board, available, 'white', isFirst, 4000)
  if (moves.length === 0) return null
  moves.sort((a, b) => b.size - a.size)
  const top = moves.filter(m => m.size === moves[0].size)
  let best = top[0], bestScore = -Infinity
  for (const m of top.slice(0, Math.min(40, top.length))) {
    const nb = applyPiece(board, m.orient, m.r, m.c, 'white')
    let corners = 0
    for (const [dr, dc] of m.orient) {
      const r = m.r + dr, c = m.c + dc
      for (const [ar, ac] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
        const nr = r + ar, nc = c + ac
        if (inBounds(nr, nc) && nb[nr][nc] === null) corners++
      }
    }
    if (corners > bestScore) { bestScore = corners; best = m }
  }
  return best
}

function boardToFlat(board) {
  return board.map(row => row.map(c => c ? c[0] : '.').join('')).join('|')
}
function flatToBoard(flat) {
  if (!flat) return Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
  return flat.split('|').map(row => row.split('').map(ch => ch === 'b' ? 'black' : ch === 'w' ? 'white' : null))
}

export default function BlokusDuo({ onBack }) {
  const [mode, setMode] = useState(null)
  const [board, setBoard] = useState(() => Array.from({ length: SIZE }, () => Array(SIZE).fill(null)))
  const [turn, setTurn] = useState('black')
  const [blackPieces, setBlackPieces] = useState(() => PIECES.map((_, i) => i))
  const [whitePieces, setWhitePieces] = useState(() => PIECES.map((_, i) => i))
  const [selectedPid, setSelectedPid] = useState(null)
  const [orientIdx, setOrientIdx] = useState(0)
  const [winner, setWinner] = useState(null)
  const [passes, setPasses] = useState({ black: false, white: false })
  const [joinCode, setJoinCode] = useState('')
  const aiBusyRef = useRef(false)

  const room = useGameRoom('blokus')

  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = room.gameState
    setBoard(flatToBoard(s.board))
    setTurn(s.turn || 'black')
    setBlackPieces(s.blackPieces || PIECES.map((_, i) => i))
    setWhitePieces(s.whitePieces || PIECES.map((_, i) => i))
    setPasses(s.passes || { black: false, white: false })
    setWinner(s.winner || null)
    if (s.turn !== turn) {
      setSelectedPid(null)
      setOrientIdx(0)
    }
  }, [room.gameState, mode])

  const myColor = mode === 'local' ? turn
    : mode === 'ai' ? 'black'
    : mode === 'online' ? room.myColor : null

  const isMyTurn = !winner && (
    mode === 'local'
    || (mode === 'ai' && turn === 'black')
    || (mode === 'online' && room.connected && turn === room.myColor)
  )

  const myPieces = (mode === 'local' ? (turn === 'black' ? blackPieces : whitePieces) : (myColor === 'black' ? blackPieces : whitePieces))
  const opponentPieces = (myColor === 'black' ? whitePieces : blackPieces)
  const isMyFirst = myPieces.length === PIECES.length
  const isAiFirst = whitePieces.length === PIECES.length

  const orient = selectedPid !== null
    ? PIECES[selectedPid].orientations[orientIdx % PIECES[selectedPid].orientations.length]
    : null

  const finalize = (bp, wp) => {
    const bLeft = bp.reduce((s, p) => s + PIECES[p].size, 0)
    const wLeft = wp.reduce((s, p) => s + PIECES[p].size, 0)
    if (bLeft < wLeft) return 'black'
    if (wLeft < bLeft) return 'white'
    return 'draw'
  }

  const syncAndCommit = (nb, nextTurn, nbp, nwp, npasses, w) => {
    if (mode === 'online') {
      room.updateState({
        board: boardToFlat(nb),
        turn: nextTurn,
        blackPieces: nbp,
        whitePieces: nwp,
        passes: npasses,
        winner: w || '',
      })
    }
    setBoard(nb)
    setTurn(nextTurn)
    setBlackPieces(nbp)
    setWhitePieces(nwp)
    setPasses(npasses)
    if (w) setWinner(w)
  }

  const place = (r, c) => {
    if (!isMyTurn || selectedPid === null) return
    const color = mode === 'local' ? turn : myColor
    const playerIsFirst = (color === 'black' ? blackPieces : whitePieces).length === PIECES.length
    if (!canPlace(board, orient, r, c, color, playerIsFirst)) return
    const nb = applyPiece(board, orient, r, c, color)
    const nbp = color === 'black' ? blackPieces.filter(p => p !== selectedPid) : blackPieces
    const nwp = color === 'white' ? whitePieces.filter(p => p !== selectedPid) : whitePieces
    const next = color === 'black' ? 'white' : 'black'
    const npasses = { ...passes, [color]: false }
    syncAndCommit(nb, next, nbp, nwp, npasses, null)
    setSelectedPid(null)
    setOrientIdx(0)
  }

  // 자동 패스 검사 (사람 차례인데 둘 곳 없으면)
  useEffect(() => {
    if (winner) return
    if (mode === 'ai' && turn === 'white') return // AI 처리
    if (mode === 'online' && !isMyTurn) return
    // 현재 턴 색의 가능 수 확인
    const color = turn
    const pieces = color === 'black' ? blackPieces : whitePieces
    const isFirst = pieces.length === PIECES.length
    const moves = findAllMoves(board, pieces, color, isFirst, 1)
    if (moves.length === 0 && pieces.length > 0) {
      const next = color === 'black' ? 'white' : 'black'
      const np = { ...passes, [color]: true }
      // 양쪽 모두 패스면 종료
      if (np[next]) {
        const w = finalize(blackPieces, whitePieces)
        syncAndCommit(board, next, blackPieces, whitePieces, np, w)
      } else {
        syncAndCommit(board, next, blackPieces, whitePieces, np, null)
      }
    }
  }, [turn, board, blackPieces, whitePieces, winner, mode, isMyTurn])

  // AI 차례
  useEffect(() => {
    if (mode !== 'ai' || winner) return
    if (turn !== 'white') return
    if (aiBusyRef.current) return
    aiBusyRef.current = true
    const t = setTimeout(() => {
      const mv = aiMove(board, whitePieces, isAiFirst)
      if (!mv) {
        const np = { ...passes, white: true }
        if (np.black) {
          const w = finalize(blackPieces, whitePieces)
          syncAndCommit(board, 'black', blackPieces, whitePieces, np, w)
        } else {
          syncAndCommit(board, 'black', blackPieces, whitePieces, np, null)
        }
        aiBusyRef.current = false
        return
      }
      const nb = applyPiece(board, mv.orient, mv.r, mv.c, 'white')
      const nwp = whitePieces.filter(p => p !== mv.pid)
      syncAndCommit(nb, 'black', blackPieces, nwp, { ...passes, white: false }, null)
      aiBusyRef.current = false
    }, 600)
    return () => { clearTimeout(t); aiBusyRef.current = false }
  }, [turn, board, whitePieces, blackPieces, winner, mode, isAiFirst, passes])

  const reset = () => {
    const fresh = Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
    const allp = PIECES.map((_, i) => i)
    syncAndCommit(fresh, 'black', allp, allp, { black: false, white: false }, null)
    setSelectedPid(null)
    setOrientIdx(0)
    setWinner(null)
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
    const allp = PIECES.map((_, i) => i)
    await room.createRoom({
      board: boardToFlat(Array.from({ length: SIZE }, () => Array(SIZE).fill(null))),
      turn: 'black',
      blackPieces: allp,
      whitePieces: allp,
      passes: { black: false, white: false },
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
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 15, color: '#888', cursor: 'pointer', marginBottom: 16 }}>← 돌아가기</button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🟦</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>블로커스 듀오</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => setMode('local')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #1976D2, #1565C0)' }}>📱 같은 기기에서 (2인)</button>
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
        <p style={{ fontSize: 12, color: '#AAA', marginTop: 16 }}>나는 🟦 (선공)</p>
      </div>
    )
  }

  const cellPx = Math.min(22, Math.floor((Math.min(typeof window !== 'undefined' ? window.innerWidth : 360, 480) - 32) / SIZE))

  const myDisplayColor = mode === 'local'
    ? (turn === 'black' ? '#1976D2' : '#D32F2F')
    : (myColor === 'black' ? '#1976D2' : '#D32F2F')

  const statusText = (() => {
    if (winner === 'draw') return '🤝 무승부'
    if (winner) {
      if (mode === 'online') return winner === room.myColor ? '🎉 승리!' : '😵 패배'
      if (mode === 'ai') return winner === 'black' ? '🎉 승리!' : '😵 패배'
      return winner === 'black' ? '🟦 승리!' : '🟥 승리!'
    }
    if (mode === 'ai' && turn === 'white') return 'AI 생각 중... (🟥)'
    if (mode === 'online') return isMyTurn ? `내 차례 (${room.myColor === 'black' ? '🟦' : '🟥'})` : '상대 차례'
    return (turn === 'black' ? '🟦' : '🟥') + ' 차례'
  })()

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={handleBack} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>
          🟦 블로커스 {mode === 'online' ? '(온라인)' : mode === 'ai' ? '(vs AI)' : '(2인)'}
        </h2>
        <button onClick={reset} style={{ background: '#F0F0F0', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>리셋</button>
      </div>

      {mode === 'online' && (
        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0', borderRadius: 6, marginBottom: 6 }}>
          방 코드: <strong>{room.roomCode}</strong> · 나는 {room.myColor === 'black' ? '🟦' : '🟥'}
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 6, fontSize: 13, fontWeight: 700, minHeight: 18 }}>
        {statusText}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${SIZE}, ${cellPx}px)`,
          gap: 1, background: '#888', padding: 1, borderRadius: 6,
        }}>
          {board.map((row, r) => row.map((cell, c) => {
            const isStart = (r === START_BLACK[0] && c === START_BLACK[1]) || (r === START_WHITE[0] && c === START_WHITE[1])
            return (
              <div key={r + '-' + c} onClick={() => place(r, c)}
                style={{
                  width: cellPx, height: cellPx,
                  background: cell === 'black' ? '#1976D2' : cell === 'white' ? '#D32F2F' : (isStart ? '#FFE082' : '#FAFAFA'),
                  cursor: selectedPid !== null && isMyTurn ? 'pointer' : 'default',
                }} />
            )
          }))}
        </div>
      </div>

      {isMyTurn && !winner && selectedPid !== null && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          <button onClick={() => setOrientIdx(i => i + 1)}
            style={{ padding: '6px 12px', borderRadius: 10, border: 'none', background: '#7E57C2', color: '#FFF', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>↻ 회전/뒤집기</button>
          <button onClick={() => { setSelectedPid(null); setOrientIdx(0) }}
            style={{ padding: '6px 12px', borderRadius: 10, border: 'none', background: '#888', color: '#FFF', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>취소</button>
        </div>
      )}

      {selectedPid !== null && orient && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <PiecePreview cells={orient} color={myDisplayColor} />
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
        내 조각 ({myPieces.length}/21)
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {isMyTurn && myPieces.map(pid => (
          <div key={pid} onClick={() => { setSelectedPid(pid); setOrientIdx(0) }}
            style={{
              padding: 4, borderRadius: 6,
              background: selectedPid === pid ? '#FFE082' : '#F5F5F5',
              cursor: 'pointer', border: selectedPid === pid ? '2px solid #FB8C00' : '1px solid #DDD',
            }}>
            <PiecePreview cells={PIECES[pid].cells} color={myDisplayColor} small />
          </div>
        ))}
        {!isMyTurn && myPieces.map(pid => (
          <div key={pid} style={{ padding: 4, borderRadius: 6, background: '#F5F5F5', opacity: 0.5, border: '1px solid #DDD' }}>
            <PiecePreview cells={PIECES[pid].cells} color={myDisplayColor} small />
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: '#888' }}>
        상대 남은: {opponentPieces.length}/21 · 변(상하좌우) 닿으면 X, 모서리(대각)로만 연결 · 작게 남길수록 승리
      </div>
    </div>
  )
}

function PiecePreview({ cells, color, small }) {
  const maxR = Math.max(...cells.map(c => c[0]))
  const maxC = Math.max(...cells.map(c => c[1]))
  const size = small ? 10 : 16
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${maxC + 1}, ${size}px)`,
      gridTemplateRows: `repeat(${maxR + 1}, ${size}px)`,
      gap: 1,
    }}>
      {Array.from({ length: maxR + 1 }).map((_, r) =>
        Array.from({ length: maxC + 1 }).map((_, c) => (
          <div key={r + '-' + c} style={{
            width: size, height: size,
            background: cells.some(([dr, dc]) => dr === r && dc === c) ? color : 'transparent',
            borderRadius: 2,
          }} />
        ))
      )}
    </div>
  )
}
