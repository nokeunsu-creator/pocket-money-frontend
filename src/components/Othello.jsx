import { useState, useEffect, useCallback } from 'react'

const SIZE = 8
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]

// 위치별 가중치 (코너 강함, 코너 인접 약함)
const WEIGHTS = [
  [120, -20, 20,  5,  5, 20, -20, 120],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [ 20,  -5, 15,  3,  3, 15,  -5,  20],
  [  5,  -5,  3,  3,  3,  3,  -5,   5],
  [  5,  -5,  3,  3,  3,  3,  -5,   5],
  [ 20,  -5, 15,  3,  3, 15,  -5,  20],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [120, -20, 20,  5,  5, 20, -20, 120],
]

function createBoard() {
  const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
  b[3][3] = 'white'; b[4][4] = 'white'
  b[3][4] = 'black'; b[4][3] = 'black'
  return b
}

function opp(p) { return p === 'black' ? 'white' : 'black' }

// 한 방향으로 뒤집을 수 있는 돌 좌표 반환
function flipsInDir(board, r, c, dr, dc, player) {
  const flips = []
  let nr = r + dr, nc = c + dc
  while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
    if (board[nr][nc] === null) return []
    if (board[nr][nc] === player) return flips
    flips.push([nr, nc])
    nr += dr; nc += dc
  }
  return []
}

function getFlips(board, r, c, player) {
  if (board[r][c] !== null) return []
  const all = []
  for (const [dr, dc] of DIRS) {
    const f = flipsInDir(board, r, c, dr, dc, player)
    if (f.length) all.push(...f)
  }
  return all
}

function getValidMoves(board, player) {
  const moves = []
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const f = getFlips(board, r, c, player)
      if (f.length) moves.push({ r, c, flips: f })
    }
  }
  return moves
}

function applyMove(board, r, c, flips, player) {
  const nb = board.map(row => [...row])
  nb[r][c] = player
  for (const [fr, fc] of flips) nb[fr][fc] = player
  return nb
}

function countDiscs(board) {
  let b = 0, w = 0
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (board[r][c] === 'black') b++
    else if (board[r][c] === 'white') w++
  }
  return { black: b, white: w }
}

// AI 평가: 위치가중치 + 이동성 + 종반엔 돌 수
function evaluate(board, player) {
  const enemy = opp(player)
  let pos = 0, my = 0, op = 0
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (board[r][c] === player) { pos += WEIGHTS[r][c]; my++ }
    else if (board[r][c] === enemy) { pos -= WEIGHTS[r][c]; op++ }
  }
  const total = my + op
  const myMoves = getValidMoves(board, player).length
  const opMoves = getValidMoves(board, enemy).length
  const mobility = (myMoves - opMoves) * 5
  // 종반 (54+ 돌): 돌 수가 결정적
  if (total >= 54) return (my - op) * 100
  return pos + mobility
}

function aiBestMove(board, player, depth) {
  const moves = getValidMoves(board, player)
  if (moves.length === 0) return null
  let best = moves[0], bestScore = -Infinity
  for (const m of moves) {
    const nb = applyMove(board, m.r, m.c, m.flips, player)
    const score = -negamax(nb, opp(player), depth - 1, -Infinity, Infinity)
    if (score > bestScore) { bestScore = score; best = m }
  }
  return best
}

function negamax(board, player, depth, alpha, beta) {
  if (depth === 0) return evaluate(board, player)
  const moves = getValidMoves(board, player)
  if (moves.length === 0) {
    const enemyMoves = getValidMoves(board, opp(player))
    if (enemyMoves.length === 0) {
      const { black, white } = countDiscs(board)
      const my = player === 'black' ? black : white
      const op = player === 'black' ? white : black
      return (my - op) * 1000
    }
    return -negamax(board, opp(player), depth - 1, -beta, -alpha)
  }
  let best = -Infinity
  for (const m of moves) {
    const nb = applyMove(board, m.r, m.c, m.flips, player)
    const score = -negamax(nb, opp(player), depth - 1, -beta, -alpha)
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break
  }
  return best
}

export default function Othello({ onBack }) {
  const [board, setBoard] = useState(createBoard)
  const [turn, setTurn] = useState('black') // 'black' = 사람
  const [winner, setWinner] = useState(null)
  const [passed, setPassed] = useState(false)

  const myMoves = turn === 'black' ? getValidMoves(board, 'black') : []
  const isHint = (r, c) => myMoves.some(m => m.r === r && m.c === c)
  const { black, white } = countDiscs(board)

  const place = (r, c) => {
    if (turn !== 'black' || winner) return
    const move = myMoves.find(m => m.r === r && m.c === c)
    if (!move) return
    const nb = applyMove(board, r, c, move.flips, 'black')
    setBoard(nb)
    setTurn('white')
    setPassed(false)
  }

  // AI 턴
  useEffect(() => {
    if (turn !== 'white' || winner) return
    const t = setTimeout(() => {
      const wMoves = getValidMoves(board, 'white')
      if (wMoves.length === 0) {
        const bMoves = getValidMoves(board, 'black')
        if (bMoves.length === 0) {
          finishGame(board)
        } else {
          setTurn('black')
          setPassed(true)
        }
        return
      }
      // 남은 빈 칸 기준으로 깊이 조절
      const empty = 64 - (black + white)
      const depth = empty <= 10 ? 8 : empty <= 16 ? 5 : 4
      const best = aiBestMove(board, 'white', depth)
      const nb = applyMove(board, best.r, best.c, best.flips, 'white')
      setBoard(nb)
      // 사람이 둘 수 있는지 확인
      const bMoves = getValidMoves(nb, 'black')
      if (bMoves.length === 0) {
        const wMoves2 = getValidMoves(nb, 'white')
        if (wMoves2.length === 0) finishGame(nb)
        else { setTurn('white'); setPassed(true) }
      } else {
        setTurn('black')
        setPassed(false)
      }
    }, 500)
    return () => clearTimeout(t)
  }, [turn, board, winner, black, white])

  const finishGame = (b) => {
    const { black, white } = countDiscs(b)
    if (black > white) setWinner('black')
    else if (white > black) setWinner('white')
    else setWinner('draw')
  }

  const reset = () => {
    setBoard(createBoard())
    setTurn('black')
    setWinner(null)
    setPassed(false)
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>⚫⚪ 오델로</h2>
        <button onClick={reset}
          style={{ background: '#F0F0F0', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>리셋</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 8, fontSize: 14, fontWeight: 700 }}>
        <div>⚫ 나 {black}</div>
        <div>⚪ AI {white}</div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 10, fontSize: 13, fontWeight: 700, minHeight: 18 }}>
        {winner
          ? (winner === 'black' ? '🎉 승리!' : winner === 'white' ? '😵 패배' : '🤝 무승부')
          : turn === 'black'
            ? (myMoves.length ? (passed ? 'AI가 둘 수 없어 패스. 내 차례.' : '내 차례') : '둘 곳이 없어 패스...')
            : 'AI 생각 중...'}
      </div>

      <div style={{
        background: '#1B5E20', padding: 6, borderRadius: 8, width: '100%', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gap: 2 }}>
          {board.map((row, r) => row.map((cell, c) => {
            const hint = !winner && turn === 'black' && isHint(r, c)
            return (
              <div key={r + '-' + c} onClick={() => place(r, c)}
                style={{
                  aspectRatio: '1/1',
                  background: '#2E7D32',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: hint ? 'pointer' : 'default',
                  borderRadius: 3,
                  position: 'relative',
                }}>
                {cell && (
                  <div style={{
                    width: '85%', height: '85%', borderRadius: '50%',
                    background: cell === 'black' ? 'radial-gradient(circle at 30% 30%, #555, #000)' : 'radial-gradient(circle at 30% 30%, #FFF, #BBB)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  }} />
                )}
                {hint && !cell && (
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(0,0,0,0.25)' }} />
                )}
              </div>
            )
          }))}
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 10 }}>
        상대 돌 사이에 끼우면 뒤집힘 · 점으로 표시된 곳이 둘 수 있는 자리
      </p>
    </div>
  )
}
