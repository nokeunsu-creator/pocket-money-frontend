import { useState, useEffect } from 'react'

// 3x3 격자, 9 교차점
// 0 1 2
// 3 4 5
// 6 7 8
const ADJ = [
  [1, 3],       // 0
  [0, 2, 4],    // 1
  [1, 5],       // 2
  [0, 4, 6],    // 3
  [1, 3, 5, 7], // 4
  [2, 4, 8],    // 5
  [3, 7],       // 6
  [4, 6, 8],    // 7
  [5, 7],       // 8
]

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
]

function checkWin(board, player) {
  for (const line of LINES) {
    if (line.every(p => board[p] === player)) return line
  }
  return null
}

function opp(p) { return p === 'black' ? 'white' : 'black' }

function getMoves(board, player) {
  const moves = []
  for (let i = 0; i < 9; i++) {
    if (board[i] !== player) continue
    for (const j of ADJ[i]) {
      if (board[j] !== null) continue
      moves.push({ from: i, to: j })
    }
  }
  return moves
}

function applyMove(board, mv, player) {
  const nb = [...board]
  nb[mv.from] = null
  nb[mv.to] = player
  return nb
}

// 단순 평가: 줄 형성 진척도
function evaluate(board, player) {
  const enemy = opp(player)
  let s = 0
  for (const line of LINES) {
    let my = 0, op = 0
    for (const i of line) {
      if (board[i] === player) my++
      else if (board[i] === enemy) op++
    }
    if (my === 3) s += 1000
    else if (op === 3) s -= 1000
    else if (my && !op) s += my * my
    else if (op && !my) s -= op * op
  }
  return s
}

function negamax(board, player, depth, alpha, beta) {
  const win = checkWin(board, player)
  if (win) return 10000 + depth
  const lose = checkWin(board, opp(player))
  if (lose) return -10000 - depth
  if (depth === 0) return evaluate(board, player)
  const moves = getMoves(board, player)
  if (moves.length === 0) return 0 // 이동 불가
  let best = -Infinity
  for (const m of moves) {
    const nb = applyMove(board, m, player)
    const score = -negamax(nb, opp(player), depth - 1, -beta, -alpha)
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break
  }
  return best
}

function aiBestMove(board) {
  const moves = getMoves(board, 'white')
  if (moves.length === 0) return null
  let best = moves[0], bestScore = -Infinity
  for (const m of moves) {
    const nb = applyMove(board, m, 'white')
    const score = -negamax(nb, 'black', 7, -Infinity, Infinity)
    if (score > bestScore) { bestScore = score; best = m }
  }
  return best
}

function initialBoard() {
  // 사람(흑): 0, 1, 3 | AI(백): 5, 7, 8
  const b = Array(9).fill(null)
  b[0] = 'black'; b[1] = 'black'; b[3] = 'black'
  b[5] = 'white'; b[7] = 'white'; b[8] = 'white'
  return b
}

export default function Gonu({ onBack }) {
  const [board, setBoard] = useState(initialBoard)
  const [turn, setTurn] = useState('black')
  const [selected, setSelected] = useState(null)
  const [winner, setWinner] = useState(null)
  const [winLine, setWinLine] = useState(null)

  const myMoves = turn === 'black' && !winner ? getMoves(board, 'black') : []
  const movesFromSel = selected !== null ? myMoves.filter(m => m.from === selected) : []
  const hintCells = new Set(movesFromSel.map(m => m.to))

  const click = (i) => {
    if (turn !== 'black' || winner) return
    if (selected === null) {
      if (board[i] === 'black' && myMoves.some(m => m.from === i)) setSelected(i)
      return
    }
    if (i === selected) { setSelected(null); return }
    if (board[i] === 'black' && myMoves.some(m => m.from === i)) { setSelected(i); return }
    if (!hintCells.has(i)) return
    const nb = applyMove(board, { from: selected, to: i }, 'black')
    setBoard(nb)
    setSelected(null)
    const wl = checkWin(nb, 'black')
    if (wl) { setWinner('black'); setWinLine(wl); return }
    setTurn('white')
  }

  useEffect(() => {
    if (turn !== 'white' || winner) return
    const t = setTimeout(() => {
      const mv = aiBestMove(board)
      if (!mv) { setWinner('black'); return } // AI 이동 불가
      const nb = applyMove(board, mv, 'white')
      setBoard(nb)
      const wl = checkWin(nb, 'white')
      if (wl) { setWinner('white'); setWinLine(wl); return }
      setTurn('black')
    }, 500)
    return () => clearTimeout(t)
  }, [turn, board, winner])

  const reset = () => {
    setBoard(initialBoard())
    setTurn('black')
    setSelected(null)
    setWinner(null)
    setWinLine(null)
  }

  const PX = Math.min(280, window.innerWidth - 80)
  const cell = PX / 2
  const PAD = 30
  const toXY = (i) => {
    const c = i % 3, r = Math.floor(i / 3)
    return { x: PAD + c * cell, y: PAD + r * cell }
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>🟫 줄고누 (한국 전통)</h2>
        <button onClick={reset}
          style={{ background: '#F0F0F0', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>리셋</button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 10, fontSize: 14, fontWeight: 700, minHeight: 18 }}>
        {winner === 'black' ? '🎉 3줄 완성! 승리'
          : winner === 'white' ? '😵 AI가 3줄 완성'
            : turn === 'black' ? (selected === null ? '말을 선택' : '이동할 자리 선택') : 'AI 생각 중...'}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={PX + PAD * 2} height={PX + PAD * 2}
          style={{ background: '#DCB35C', borderRadius: 8 }}>
          {/* 격자 선 */}
          {[0, 1, 2].map(i => (
            <line key={'h' + i} x1={toXY(0).x} y1={toXY(i * 3).y}
              x2={toXY(2).x} y2={toXY(i * 3).y}
              stroke="#5D4037" strokeWidth="2" />
          ))}
          {[0, 1, 2].map(i => (
            <line key={'v' + i} x1={toXY(i).x} y1={toXY(0).y}
              x2={toXY(i).x} y2={toXY(6).y}
              stroke="#5D4037" strokeWidth="2" />
          ))}
          {/* 승리 줄 강조 */}
          {winLine && (
            <line x1={toXY(winLine[0]).x} y1={toXY(winLine[0]).y}
              x2={toXY(winLine[2]).x} y2={toXY(winLine[2]).y}
              stroke="#FFD54F" strokeWidth="6" opacity={0.7} />
          )}
          {/* 노드 + 말 */}
          {Array.from({ length: 9 }).map((_, i) => {
            const { x, y } = toXY(i)
            const sel = selected === i
            const hint = hintCells.has(i)
            return (
              <g key={i} onClick={() => click(i)} style={{ cursor: 'pointer' }}>
                <circle cx={x} cy={y} r={18} fill="transparent" />
                {hint && <circle cx={x} cy={y} r={10} fill="rgba(0,0,0,0.3)" />}
                {board[i] && (
                  <circle cx={x} cy={y} r={16}
                    fill={board[i] === 'black' ? 'url(#bg)' : 'url(#wg)'}
                    stroke={sel ? '#FFD54F' : '#333'} strokeWidth={sel ? 3 : 1} />
                )}
              </g>
            )
          })}
          <defs>
            <radialGradient id="bg" cx="0.3" cy="0.3">
              <stop offset="0%" stopColor="#666" />
              <stop offset="100%" stopColor="#000" />
            </radialGradient>
            <radialGradient id="wg" cx="0.3" cy="0.3">
              <stop offset="0%" stopColor="#FFF" />
              <stop offset="100%" stopColor="#BBB" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 10 }}>
        한 칸 가로/세로 이동(대각선 X) · 자기 말 3개가 한 줄(가로/세로) 정렬 시 승리
      </p>
    </div>
  )
}
