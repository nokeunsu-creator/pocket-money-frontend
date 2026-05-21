import { useState, useEffect, useMemo } from 'react'

const SIZE = 14
// 시작점: (4,4) 사람, (9,9) AI
const START_BLACK = [4, 4]
const START_WHITE = [9, 9]

// 21개 폴리오미노 (1~5칸)
const PIECES_RAW = [
  // 1칸
  [[0,0]],
  // 2칸
  [[0,0],[0,1]],
  // 3칸
  [[0,0],[0,1],[0,2]],
  [[0,0],[0,1],[1,1]],
  // 4칸
  [[0,0],[0,1],[0,2],[0,3]],
  [[0,0],[0,1],[0,2],[1,2]],
  [[0,0],[0,1],[0,2],[1,1]],
  [[0,0],[0,1],[1,0],[1,1]],
  [[0,0],[0,1],[1,1],[1,2]],
  // 5칸
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
    // 같은 색이 변(상하좌우)으로 닿으면 안됨
    for (const [ar, ac] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const ar2 = nr + ar, ac2 = nc + ac
      if (inBounds(ar2, ac2) && board[ar2][ac2] === player) return false
    }
    // 대각선으로 같은 색이 닿아야 함 (첫수 제외)
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
  // 큰 조각 우선 + 약간의 랜덤성 + 자유 코너 수
  moves.sort((a, b) => b.size - a.size)
  const top = moves.filter(m => m.size === moves[0].size)
  // top 중에서 다음 코너 자유도 최대인 것 선택
  let best = top[0], bestScore = -Infinity
  for (const m of top.slice(0, Math.min(40, top.length))) {
    const nb = applyPiece(board, m.orient, m.r, m.c, 'white')
    let corners = 0
    for (const [dr, dc] of m.orient) {
      const r = m.r + dr, c = m.c + dc
      for (const [ar, ac] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
        const nr = r + ar, nc = c + ac
        if (inBounds(nr, nc) && nb[nr][nc] === null) {
          // 변에 자기 돌이 없어야 유효
          let ok = true
          for (const [br, bc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            const xr = nr + br, xc = nc + bc
            if (inBounds(xr, xc) && nb[xr][xc] === 'white' && !(xr === r && xc === c)) {
              // 자기 돌이긴 한데 방금 둔 조각 아닌 다른 거면 변 충돌
              const inMove = m.orient.some(([dr2, dc2]) => m.r + dr2 === xr && m.c + dc2 === xc)
              if (!inMove) { ok = false; break }
            }
          }
          if (ok) corners++
        }
      }
    }
    if (corners > bestScore) { bestScore = corners; best = m }
  }
  return best
}

export default function BlokusDuo({ onBack }) {
  const [board, setBoard] = useState(() => Array.from({ length: SIZE }, () => Array(SIZE).fill(null)))
  const [turn, setTurn] = useState('black')
  const [myPieces, setMyPieces] = useState(() => PIECES.map((_, i) => i))
  const [aiPieces, setAiPieces] = useState(() => PIECES.map((_, i) => i))
  const [selectedPid, setSelectedPid] = useState(null)
  const [orientIdx, setOrientIdx] = useState(0)
  const [winner, setWinner] = useState(null)
  const [passes, setPasses] = useState({ black: false, white: false })

  const isMyFirst = myPieces.length === PIECES.length
  const isAiFirst = aiPieces.length === PIECES.length

  const orient = selectedPid !== null
    ? PIECES[selectedPid].orientations[orientIdx % PIECES[selectedPid].orientations.length]
    : null

  const place = (r, c) => {
    if (turn !== 'black' || winner || selectedPid === null) return
    if (!canPlace(board, orient, r, c, 'black', isMyFirst)) return
    const nb = applyPiece(board, orient, r, c, 'black')
    setBoard(nb)
    setMyPieces(myPieces.filter(p => p !== selectedPid))
    setSelectedPid(null)
    setOrientIdx(0)
    setPasses({ ...passes, black: false })
    setTurn('white')
  }

  // 둘 곳이 없으면 자동 패스
  useEffect(() => {
    if (turn !== 'black' || winner) return
    const moves = findAllMoves(board, myPieces, 'black', isMyFirst, 1)
    if (moves.length === 0) {
      setPasses(p => {
        const np = { ...p, black: true }
        if (np.white) finalize()
        return np
      })
      setTurn('white')
    }
  }, [turn, board, myPieces, winner])

  useEffect(() => {
    if (turn !== 'white' || winner) return
    const t = setTimeout(() => {
      const mv = aiMove(board, aiPieces, isAiFirst)
      if (!mv) {
        setPasses(p => {
          const np = { ...p, white: true }
          if (np.black) finalize()
          return np
        })
        setTurn('black')
        return
      }
      const nb = applyPiece(board, mv.orient, mv.r, mv.c, 'white')
      setBoard(nb)
      setAiPieces(aiPieces.filter(p => p !== mv.pid))
      setPasses({ ...passes, white: false })
      setTurn('black')
    }, 600)
    return () => clearTimeout(t)
  }, [turn, board, aiPieces, winner])

  const finalize = () => {
    const myLeft = myPieces.reduce((s, p) => s + PIECES[p].size, 0)
    const aiLeft = aiPieces.reduce((s, p) => s + PIECES[p].size, 0)
    if (myLeft < aiLeft) setWinner('black')
    else if (aiLeft < myLeft) setWinner('white')
    else setWinner('draw')
  }

  const reset = () => {
    setBoard(Array.from({ length: SIZE }, () => Array(SIZE).fill(null)))
    setTurn('black')
    setMyPieces(PIECES.map((_, i) => i))
    setAiPieces(PIECES.map((_, i) => i))
    setSelectedPid(null)
    setOrientIdx(0)
    setWinner(null)
    setPasses({ black: false, white: false })
  }

  const cellPx = Math.min(22, Math.floor((Math.min(window.innerWidth, 480) - 32) / SIZE))

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>🟦 블로커스 듀오</h2>
        <button onClick={reset}
          style={{ background: '#F0F0F0', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>리셋</button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 6, fontSize: 13, fontWeight: 700, minHeight: 18 }}>
        {winner
          ? (winner === 'black' ? '🎉 승리!' : winner === 'white' ? '😵 패배' : '🤝 무승부')
          : turn === 'black' ? '내 차례 (🟦)' : 'AI 생각 중... (🟥)'}
      </div>

      {/* 보드 */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${SIZE}, ${cellPx}px)`,
          gap: 1, background: '#888', padding: 1, borderRadius: 6,
        }}>
          {board.map((row, r) => row.map((cell, c) => {
            const isStart = (r === START_BLACK[0] && c === START_BLACK[1]) || (r === START_WHITE[0] && c === START_WHITE[1])
            const isPreview = orient && turn === 'black' && !winner
              && orient.some(([dr, dc]) => true) // preview computed below
            // Preview 미리 클릭한 위치 기준: hover 어려우니 별도 처리 안 함
            return (
              <div key={r + '-' + c} onClick={() => place(r, c)}
                style={{
                  width: cellPx, height: cellPx,
                  background: cell === 'black' ? '#1976D2' : cell === 'white' ? '#D32F2F' : (isStart ? '#FFE082' : '#FAFAFA'),
                  cursor: selectedPid !== null && turn === 'black' ? 'pointer' : 'default',
                }} />
            )
          }))}
        </div>
      </div>

      {/* 컨트롤 */}
      {turn === 'black' && !winner && selectedPid !== null && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          <button onClick={() => setOrientIdx(i => i + 1)}
            style={{ padding: '6px 12px', borderRadius: 10, border: 'none', background: '#7E57C2', color: '#FFF', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>↻ 회전/뒤집기</button>
          <button onClick={() => { setSelectedPid(null); setOrientIdx(0) }}
            style={{ padding: '6px 12px', borderRadius: 10, border: 'none', background: '#888', color: '#FFF', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>취소</button>
        </div>
      )}

      {/* 선택된 조각 모양 */}
      {selectedPid !== null && orient && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <PiecePreview cells={orient} color="#1976D2" />
        </div>
      )}

      {/* 내 조각 팔레트 */}
      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
        내 조각 ({myPieces.length}/21)
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {myPieces.map(pid => (
          <div key={pid} onClick={() => { setSelectedPid(pid); setOrientIdx(0) }}
            style={{
              padding: 4, borderRadius: 6,
              background: selectedPid === pid ? '#FFE082' : '#F5F5F5',
              cursor: 'pointer', border: selectedPid === pid ? '2px solid #FB8C00' : '1px solid #DDD',
            }}>
            <PiecePreview cells={PIECES[pid].cells} color="#1976D2" small />
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: '#888' }}>
        AI 남은: {aiPieces.length}/21 · 변(상하좌우) 닿으면 X, 모서리(대각)로만 연결 · 작게 남길수록 승리
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
