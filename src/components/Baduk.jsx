import { useState, useCallback } from 'react'

const SIZE = 9 // 9x9 바둑 (초보용)

function createBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
}

function getGroup(board, r, c) {
  const color = board[r][c]
  if (!color) return { stones: [], liberties: 0 }
  const visited = new Set()
  const stones = []
  const liberties = new Set()

  const dfs = (rr, cc) => {
    const key = `${rr},${cc}`
    if (visited.has(key)) return
    if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) return
    if (board[rr][cc] === null) {
      liberties.add(key)
      return
    }
    if (board[rr][cc] !== color) return
    visited.add(key)
    stones.push([rr, cc])
    dfs(rr - 1, cc)
    dfs(rr + 1, cc)
    dfs(rr, cc - 1)
    dfs(rr, cc + 1)
  }
  dfs(r, c)
  return { stones, liberties: liberties.size }
}

function removeDeadStones(board, color) {
  const newBoard = board.map(row => [...row])
  let captured = 0
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (newBoard[r][c] === color) {
        const group = getGroup(newBoard, r, c)
        if (group.liberties === 0) {
          group.stones.forEach(([sr, sc]) => { newBoard[sr][sc] = null })
          captured += group.stones.length
        }
      }
    }
  }
  return { board: newBoard, captured }
}

function boardToString(board) {
  return board.map(row => row.map(c => c || '.').join('')).join('|')
}

function countTerritory(board) {
  const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false))
  let blackTerritory = 0
  let whiteTerritory = 0
  let blackStones = 0
  let whiteStones = 0

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 'black') blackStones++
      else if (board[r][c] === 'white') whiteStones++
    }
  }

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== null || visited[r][c]) continue
      const territory = []
      let touchBlack = false
      let touchWhite = false

      const dfs = (rr, cc) => {
        if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) return
        if (visited[rr][cc]) return
        if (board[rr][cc] === 'black') { touchBlack = true; return }
        if (board[rr][cc] === 'white') { touchWhite = true; return }
        visited[rr][cc] = true
        territory.push([rr, cc])
        dfs(rr - 1, cc)
        dfs(rr + 1, cc)
        dfs(rr, cc - 1)
        dfs(rr, cc + 1)
      }
      dfs(r, c)

      if (touchBlack && !touchWhite) blackTerritory += territory.length
      else if (touchWhite && !touchBlack) whiteTerritory += territory.length
    }
  }

  return {
    black: blackStones + blackTerritory,
    white: whiteStones + whiteTerritory + 6.5, // 덤 6.5
    blackStones, whiteStones, blackTerritory, whiteTerritory,
  }
}

export default function Baduk({ onBack }) {
  const [board, setBoard] = useState(createBoard())
  const [turn, setTurn] = useState('black')
  const [captures, setCaptures] = useState({ black: 0, white: 0 })
  const [lastMove, setLastMove] = useState(null)
  const [prevBoardStr, setPrevBoardStr] = useState('')
  const [passCount, setPassCount] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(null)
  const [history, setHistory] = useState([])
  const [message, setMessage] = useState('')

  const opponent = turn === 'black' ? 'white' : 'black'

  const place = useCallback((r, c) => {
    if (board[r][c] || gameOver) return

    const testBoard = board.map(row => [...row])
    testBoard[r][c] = turn

    // 상대 돌 잡기
    const afterCapture = removeDeadStones(testBoard, opponent)
    let newBoard = afterCapture.board
    let newCaptured = afterCapture.captured

    // 자충수 체크
    const selfGroup = getGroup(newBoard, r, c)
    if (selfGroup.liberties === 0) {
      setMessage('자충수! 놓을 수 없어요')
      setTimeout(() => setMessage(''), 1500)
      return
    }

    // 패 규칙 (같은 판 반복 금지)
    const newBoardStr = boardToString(newBoard)
    if (newBoardStr === prevBoardStr) {
      setMessage('패! 같은 형태 반복 금지')
      setTimeout(() => setMessage(''), 1500)
      return
    }

    setHistory([...history, { board: board.map(r => [...r]), turn, captures: { ...captures }, prevBoardStr }])
    setPrevBoardStr(boardToString(board))
    setBoard(newBoard)
    setLastMove([r, c])
    setCaptures({
      ...captures,
      [turn]: captures[turn] + newCaptured,
    })
    setPassCount(0)
    setTurn(opponent)
    setMessage('')
  }, [board, turn, opponent, gameOver, prevBoardStr, captures, history])

  const pass = () => {
    if (gameOver) return
    setHistory([...history, { board: board.map(r => [...r]), turn, captures: { ...captures }, prevBoardStr }])
    const newPassCount = passCount + 1
    setPassCount(newPassCount)
    setTurn(opponent)
    setMessage(`${turn === 'black' ? '⚫ 흑' : '⚪ 백'} 패스`)

    if (newPassCount >= 2) {
      // 양쪽 모두 패스 → 계가
      const s = countTerritory(board)
      setScore(s)
      setGameOver(true)
      setMessage('')
    }
  }

  const undo = () => {
    if (history.length === 0 || gameOver) return
    const last = history[history.length - 1]
    setBoard(last.board)
    setTurn(last.turn)
    setCaptures(last.captures)
    setPrevBoardStr(last.prevBoardStr)
    setHistory(history.slice(0, -1))
    setPassCount(0)
    setLastMove(null)
    setMessage('')
  }

  const reset = () => {
    setBoard(createBoard())
    setTurn('black')
    setCaptures({ black: 0, white: 0 })
    setLastMove(null)
    setPrevBoardStr('')
    setPassCount(0)
    setGameOver(false)
    setScore(null)
    setHistory([])
    setMessage('')
  }

  const cellSize = Math.min(Math.floor((window.innerWidth - 32) / SIZE), 38)
  const boardPx = cellSize * (SIZE - 1)
  const padding = cellSize

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '1rem' }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a, #333)',
        color: '#FFF', padding: '1rem 1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 돌아가기
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>바둑 (9×9)</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={undo}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 12, borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}>
              ↩
            </button>
            <button onClick={reset}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 12, borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}>
              새 게임
            </button>
          </div>
        </div>
      </div>

      {/* 정보 바 */}
      <div style={{
        display: 'flex', justifyContent: 'space-around', padding: '10px 16px',
        background: '#F7F6F3', fontSize: 13,
      }}>
        <div style={{ textAlign: 'center', fontWeight: turn === 'black' && !gameOver ? 700 : 400 }}>
          ⚫ 흑 <span style={{ fontSize: 11, color: '#888' }}>잡은돌 {captures.black}</span>
        </div>
        <div style={{
          padding: '2px 12px', borderRadius: 10,
          background: gameOver ? '#F1C40F' : turn === 'black' ? '#333' : '#FFF',
          color: gameOver ? '#333' : turn === 'black' ? '#FFF' : '#333',
          border: '1px solid #DDD', fontSize: 12, fontWeight: 600,
        }}>
          {gameOver ? '종료' : `${turn === 'black' ? '흑' : '백'} 차례`}
        </div>
        <div style={{ textAlign: 'center', fontWeight: turn === 'white' && !gameOver ? 700 : 400 }}>
          ⚪ 백 <span style={{ fontSize: 11, color: '#888' }}>잡은돌 {captures.white}</span>
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <div style={{
          textAlign: 'center', padding: '6px', fontSize: 13, fontWeight: 600,
          color: '#E74C3C', background: '#FFF5F5',
        }}>
          {message}
        </div>
      )}

      {/* 바둑판 */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <svg
          width={boardPx + padding * 2}
          height={boardPx + padding * 2}
          style={{ background: '#DCB35C', borderRadius: 8 }}
        >
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
          {[[2, 2], [2, 6], [4, 4], [6, 2], [6, 6]].map(([r, c]) => (
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
                  r={cellSize * 0.44}
                  fill={cell === 'black' ? '#222' : '#FFF'}
                  stroke={cell === 'black' ? '#000' : '#AAA'}
                  strokeWidth={0.8}
                />
                {isLast && (
                  <circle
                    cx={padding + c * cellSize} cy={padding + r * cellSize}
                    r={3} fill="#E74C3C"
                  />
                )}
              </g>
            )
          }))}

          {/* 클릭 영역 */}
          {!gameOver && board.map((row, r) => row.map((cell, c) => {
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

      {/* 패스 버튼 */}
      {!gameOver && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <button onClick={pass}
            style={{
              padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: '#555', color: '#FFF', fontSize: 14, fontWeight: 600,
            }}>
            패스 {passCount >= 1 ? '(양쪽 패스 시 종료)' : ''}
          </button>
        </div>
      )}

      {/* 계가 결과 */}
      {gameOver && score && (
        <div style={{
          margin: '8px 12px', padding: '20px', borderRadius: 14,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          border: '2px solid #F1C40F', textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
            {score.black > score.white ? '⚫ 흑 승리!' : '⚪ 백 승리!'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16, fontSize: 13 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{score.black}</div>
              <div style={{ color: '#888' }}>⚫ 흑</div>
              <div style={{ fontSize: 11, color: '#AAA' }}>돌 {score.blackStones} + 집 {score.blackTerritory}</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{score.white}</div>
              <div style={{ color: '#888' }}>⚪ 백</div>
              <div style={{ fontSize: 11, color: '#AAA' }}>돌 {score.whiteStones} + 집 {score.whiteTerritory} + 덤6.5</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={reset}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#333', color: '#FFF', fontSize: 14, fontWeight: 600 }}>
              다시 하기
            </button>
            <button onClick={onBack}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
              게임 목록
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
