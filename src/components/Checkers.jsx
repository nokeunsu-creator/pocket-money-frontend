import { useState, useEffect } from 'react'

const SIZE = 8
// 사람=red(아래에서 시작, 위로 진행), AI=black(위에서 시작, 아래로 진행)
// piece: { color: 'red'|'black', king: bool }

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

function clone(board) {
  return board.map(row => row.map(c => c ? { ...c } : null))
}

function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE }
function opp(c) { return c === 'red' ? 'black' : 'red' }

// 이동 방향 (color, king에 따라)
function dirsFor(piece) {
  if (piece.king) return [[-1,-1],[-1,1],[1,-1],[1,1]]
  return piece.color === 'red' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]]
}

// 한 칸에서 가능한 점프(연속 포함) 시퀀스 모두 반환
function jumpsFrom(board, r, c) {
  const piece = board[r][c]
  if (!piece) return []
  const results = []
  const recurse = (curBoard, cr, cc, path) => {
    const cp = curBoard[cr][cc]
    let extended = false
    for (const [dr, dc] of dirsFor(cp)) {
      const mr = cr + dr, mc = cc + dc
      const lr = cr + dr * 2, lc = cc + dc * 2
      if (!inBounds(lr, lc)) continue
      if (!curBoard[mr][mc] || curBoard[mr][mc].color !== opp(cp.color)) continue
      if (curBoard[lr][lc] !== null) continue
      // 점프 실행
      const nb = clone(curBoard)
      const moved = { ...nb[cr][cc] }
      // 킹 승격 체크
      if (moved.color === 'red' && lr === 0) moved.king = true
      if (moved.color === 'black' && lr === SIZE - 1) moved.king = true
      nb[cr][cc] = null
      nb[mr][mc] = null
      nb[lr][lc] = moved
      const captured = [...path.captures, [mr, mc]]
      const newPath = [...path.steps, [lr, lc]]
      extended = true
      recurse(nb, lr, lc, { steps: newPath, captures, finalKing: moved.king !== piece.king })
      // 점프 끝낼 수도 있음 (연속 안 함). 체커 영국식 룰: 가능하면 계속해야 하지만,
      // 여기선 사용자가 끝낼지 선택 가능하게 모든 단계 결과를 후보로 추가
      results.push({ from: [r, c], steps: [...newPath], captures })
    }
  }
  // 초기 호출
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
    // 연속 점프 재귀
    continueJump(nb, lr, lc, [[lr, lc]], captures, results, r, c)
  }
  return results
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
  // 영국식: 점프 가능하면 점프만 (가장 긴 점프 강제는 아님 — 어느 점프든 OK)
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
  // AI(black) 관점
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
  if (moves.length === 0) {
    return color === 'black' ? -10000 : 10000
  }
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
  const [board, setBoard] = useState(createBoard)
  const [turn, setTurn] = useState('red')
  const [selected, setSelected] = useState(null) // [r, c]
  const [winner, setWinner] = useState(null)

  const myMoves = turn === 'red' && !winner ? allMoves(board, 'red') : []
  const movesFromSel = selected
    ? myMoves.filter(m => m.from[0] === selected[0] && m.from[1] === selected[1])
    : []

  const cellHints = new Set()
  for (const m of movesFromSel) {
    const [lr, lc] = m.steps[m.steps.length - 1]
    cellHints.add(`${lr},${lc}`)
  }
  // 선택 가능한 말
  const selectable = new Set()
  for (const m of myMoves) selectable.add(`${m.from[0]},${m.from[1]}`)

  const click = (r, c) => {
    if (turn !== 'red' || winner) return
    if (selected) {
      if (selected[0] === r && selected[1] === c) { setSelected(null); return }
      const target = movesFromSel.find(m => {
        const [lr, lc] = m.steps[m.steps.length - 1]
        return lr === r && lc === c
      })
      if (target) {
        const nb = applyMove(board, target)
        setBoard(nb)
        setSelected(null)
        // 승부 확인 후 턴 넘김
        if (piecesCount(nb, 'black') === 0 || allMoves(nb, 'black').length === 0) {
          setWinner('red'); return
        }
        setTurn('black')
        return
      }
      // 다른 자기 말 선택
      if (board[r][c]?.color === 'red' && selectable.has(`${r},${c}`)) {
        setSelected([r, c])
        return
      }
      return
    }
    if (board[r][c]?.color === 'red' && selectable.has(`${r},${c}`)) {
      setSelected([r, c])
    }
  }

  useEffect(() => {
    if (turn !== 'black' || winner) return
    const t = setTimeout(() => {
      const mv = aiBestMove(board)
      if (!mv) { setWinner('red'); return }
      const nb = applyMove(board, mv)
      setBoard(nb)
      if (piecesCount(nb, 'red') === 0 || allMoves(nb, 'red').length === 0) {
        setWinner('black'); return
      }
      setTurn('red')
    }, 600)
    return () => clearTimeout(t)
  }, [turn, board, winner])

  const reset = () => {
    setBoard(createBoard())
    setTurn('red')
    setSelected(null)
    setWinner(null)
  }

  const cellPx = Math.min(46, Math.floor((Math.min(window.innerWidth, 480) - 32) / SIZE))

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>🔴 체커</h2>
        <button onClick={reset}
          style={{ background: '#F0F0F0', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>리셋</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 6, fontSize: 13, fontWeight: 700 }}>
        <div>🔴 나 {piecesCount(board, 'red')}</div>
        <div>⚫ AI {piecesCount(board, 'black')}</div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 13, fontWeight: 700, minHeight: 18 }}>
        {winner ? (winner === 'red' ? '🎉 승리!' : '😵 패배')
          : turn === 'red' ? '내 차례 (🔴 위로 이동)' : 'AI 생각 중... (⚫ 아래로 이동)'}
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
                  cursor: turn === 'red' && !winner ? 'pointer' : 'default',
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
        대각선 한 칸 이동 · 상대 말 뛰어넘으면 잡기 · 끝줄 도달 시 킹(♛, 뒤로도 이동) · 점프 가능하면 점프 강제
      </p>
    </div>
  )
}
