import { useState, useEffect } from 'react'

const ROWS = 6
const COLS = 7

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
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

function isFull(board) {
  for (let c = 0; c < COLS; c++) if (board[0][c] === null) return false
  return true
}

function opp(p) { return p === 'red' ? 'yellow' : 'red' }

function evalLine(line, p) {
  const o = opp(p)
  let my = 0, op = 0
  for (const v of line) {
    if (v === p) my++
    else if (v === o) op++
  }
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
  // 가운데 칼럼 가중치
  for (let r = 0; r < ROWS; r++) {
    if (board[r][3] === p) s += 3
    else if (board[r][3] === opp(p)) s -= 3
  }
  // 모든 4연속 윈도우
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
    for (const [dr, dc] of dirs) {
      const er = r + dr * 3, ec = c + dc * 3
      if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue
      const line = [
        board[r][c], board[r + dr][c + dc],
        board[r + dr * 2][c + dc * 2], board[r + dr * 3][c + dc * 3],
      ]
      s += evalLine(line, p)
    }
  }
  return s
}

function negamax(board, p, depth, alpha, beta) {
  // 즉시 승부 확인 위한 wrapper는 호출자에서
  if (depth === 0 || isFull(board)) return evaluate(board, p)
  let best = -Infinity
  const colOrder = [3, 2, 4, 1, 5, 0, 6]
  let anyMove = false
  for (const c of colOrder) {
    const r = dropRow(board, c)
    if (r < 0) continue
    anyMove = true
    board[r][c] = p
    if (checkWin(board, r, c, p)) {
      board[r][c] = null
      return 100000 + depth
    }
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
  // 1수: 즉시 승리/즉시 차단 확인
  for (let c = 0; c < COLS; c++) {
    const r = dropRow(board, c)
    if (r < 0) continue
    board[r][c] = 'yellow'
    if (checkWin(board, r, c, 'yellow')) { board[r][c] = null; return c }
    board[r][c] = null
  }
  for (let c = 0; c < COLS; c++) {
    const r = dropRow(board, c)
    if (r < 0) continue
    board[r][c] = 'red'
    if (checkWin(board, r, c, 'red')) { board[r][c] = null; return c }
    board[r][c] = null
  }
  // negamax 깊이 6
  let best = 3, bestScore = -Infinity
  const colOrder = [3, 2, 4, 1, 5, 0, 6]
  for (const c of colOrder) {
    const r = dropRow(board, c)
    if (r < 0) continue
    board[r][c] = 'yellow'
    const score = -negamax(board, 'red', 5, -Infinity, Infinity)
    board[r][c] = null
    if (score > bestScore) { bestScore = score; best = c }
  }
  return best
}

export default function ConnectFour({ onBack }) {
  const [board, setBoard] = useState(createBoard)
  const [turn, setTurn] = useState('red') // 사람=red
  const [winner, setWinner] = useState(null)
  const [winCells, setWinCells] = useState([])

  const drop = (c) => {
    if (turn !== 'red' || winner) return
    const r = dropRow(board, c)
    if (r < 0) return
    const nb = board.map(row => [...row])
    nb[r][c] = 'red'
    setBoard(nb)
    if (checkWin(nb, r, c, 'red')) {
      setWinner('red'); setWinCells(getWinCells(nb, r, c, 'red')); return
    }
    if (isFull(nb)) { setWinner('draw'); return }
    setTurn('yellow')
  }

  useEffect(() => {
    if (turn !== 'yellow' || winner) return
    const t = setTimeout(() => {
      const work = board.map(row => [...row])
      const c = aiMove(work)
      const r = dropRow(board, c)
      const nb = board.map(row => [...row])
      nb[r][c] = 'yellow'
      setBoard(nb)
      if (checkWin(nb, r, c, 'yellow')) {
        setWinner('yellow'); setWinCells(getWinCells(nb, r, c, 'yellow')); return
      }
      if (isFull(nb)) { setWinner('draw'); return }
      setTurn('red')
    }, 500)
    return () => clearTimeout(t)
  }, [turn, board, winner])

  const reset = () => {
    setBoard(createBoard())
    setTurn('red')
    setWinner(null)
    setWinCells([])
  }

  const cellPx = Math.min(48, Math.floor((Math.min(window.innerWidth, 480) - 40) / COLS))

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>🔴 커넥트 포 (사목)</h2>
        <button onClick={reset}
          style={{ background: '#F0F0F0', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>리셋</button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 10, fontSize: 14, fontWeight: 700, minHeight: 18 }}>
        {winner === 'red' ? '🎉 4개 연결!'
          : winner === 'yellow' ? '😵 AI 승리'
            : winner === 'draw' ? '🤝 무승부'
              : turn === 'red' ? '내 차례 (🔴)' : 'AI 생각 중... (🟡)'}
      </div>

      {/* 열 버튼 (떨어뜨릴 칼럼 선택) */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${cellPx}px)`, gap: 4, justifyContent: 'center', marginBottom: 4 }}>
        {Array.from({ length: COLS }).map((_, c) => (
          <button key={c} onClick={() => drop(c)}
            disabled={!!winner || turn !== 'red' || dropRow(board, c) < 0}
            style={{
              height: 26, borderRadius: 6, border: 'none',
              background: turn === 'red' && !winner && dropRow(board, c) >= 0 ? '#FFD54F' : '#EEE',
              cursor: turn === 'red' && !winner && dropRow(board, c) >= 0 ? 'pointer' : 'default',
              fontWeight: 700, fontSize: 14,
            }}>↓</button>
        ))}
      </div>

      <div style={{
        background: '#1565C0', padding: 6, borderRadius: 10, display: 'inline-block',
      }}>
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
                  cursor: turn === 'red' && !winner && !cell ? 'pointer' : 'default',
                }} />
            )
          }))}
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 10 }}>
        칼럼을 눌러 떨어뜨림 · 가로/세로/대각선 4개 연결 시 승리
      </p>
    </div>
  )
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
