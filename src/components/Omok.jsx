import { useState } from 'react'

const SIZE = 15

function createBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
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
  const [board, setBoard] = useState(createBoard())
  const [turn, setTurn] = useState('black') // 'black' | 'white'
  const [winner, setWinner] = useState(null)
  const [lastMove, setLastMove] = useState(null)
  const [history, setHistory] = useState([])

  const place = (r, c) => {
    if (board[r][c] || winner) return
    const newBoard = board.map(row => [...row])
    newBoard[r][c] = turn
    setBoard(newBoard)
    setLastMove([r, c])
    setHistory([...history, { r, c, player: turn }])

    if (checkWin(newBoard, r, c, turn)) {
      setWinner(turn)
    } else {
      setTurn(turn === 'black' ? 'white' : 'black')
    }
  }

  const undo = () => {
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
    setBoard(createBoard())
    setTurn('black')
    setWinner(null)
    setLastMove(null)
    setHistory([])
  }

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
          <button onClick={onBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 돌아가기
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>오목</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={undo}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 12, borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}>
              ↩ 무르기
            </button>
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
          : `${turn === 'black' ? '⚫ 흑' : '⚪ 백'}의 차례 · ${history.length}수`
        }
      </div>

      {/* 바둑판 */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', overflow: 'auto' }}>
        <svg
          width={boardSize + padding * 2}
          height={boardSize + padding * 2}
          style={{ background: '#DCB35C', borderRadius: 8 }}
        >
          {/* 격자선 */}
          {Array.from({ length: SIZE }).map((_, i) => (
            <g key={`line-${i}`}>
              <line
                x1={padding} y1={padding + i * cellSize}
                x2={padding + (SIZE - 1) * cellSize} y2={padding + i * cellSize}
                stroke="#8B6914" strokeWidth={0.8}
              />
              <line
                x1={padding + i * cellSize} y1={padding}
                x2={padding + i * cellSize} y2={padding + (SIZE - 1) * cellSize}
                stroke="#8B6914" strokeWidth={0.8}
              />
            </g>
          ))}

          {/* 화점 */}
          {[[3, 3], [3, 7], [3, 11], [7, 3], [7, 7], [7, 11], [11, 3], [11, 7], [11, 11]].map(([r, c]) => (
            <circle key={`dot-${r}-${c}`}
              cx={padding + c * cellSize} cy={padding + r * cellSize}
              r={2.5} fill="#8B6914"
            />
          ))}

          {/* 돌 */}
          {board.map((row, r) => row.map((cell, c) => {
            if (!cell) return null
            const isLast = lastMove && lastMove[0] === r && lastMove[1] === c
            return (
              <g key={`stone-${r}-${c}`}>
                <circle
                  cx={padding + c * cellSize} cy={padding + r * cellSize}
                  r={cellSize * 0.42}
                  fill={cell === 'black' ? '#222' : '#FFF'}
                  stroke={cell === 'black' ? '#000' : '#AAA'}
                  strokeWidth={0.8}
                />
                {isLast && (
                  <circle
                    cx={padding + c * cellSize} cy={padding + r * cellSize}
                    r={3} fill={cell === 'black' ? '#E74C3C' : '#E74C3C'}
                  />
                )}
              </g>
            )
          }))}

          {/* 클릭 영역 */}
          {!winner && board.map((row, r) => row.map((cell, c) => {
            if (cell) return null
            return (
              <rect key={`click-${r}-${c}`}
                x={padding + c * cellSize - cellSize / 2}
                y={padding + r * cellSize - cellSize / 2}
                width={cellSize} height={cellSize}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={() => place(r, c)}
              />
            )
          }))}
        </svg>
      </div>
    </div>
  )
}
