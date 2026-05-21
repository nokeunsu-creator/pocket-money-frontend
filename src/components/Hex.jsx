import { useState, useEffect } from 'react'

const SIZE = 11
// 흑(나): 위↔아래 연결 / 백(AI): 좌↔우 연결
const DIRS = [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0]]

function createBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
}

function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE }

// 연결 확인 (BFS)
function hasWon(board, player) {
  const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false))
  const queue = []
  if (player === 'black') {
    for (let c = 0; c < SIZE; c++) if (board[0][c] === 'black') { queue.push([0, c]); visited[0][c] = true }
  } else {
    for (let r = 0; r < SIZE; r++) if (board[r][0] === 'white') { queue.push([r, 0]); visited[r][0] = true }
  }
  while (queue.length) {
    const [r, c] = queue.shift()
    if (player === 'black' && r === SIZE - 1) return true
    if (player === 'white' && c === SIZE - 1) return true
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      if (!inBounds(nr, nc) || visited[nr][nc]) continue
      if (board[nr][nc] !== player) continue
      visited[nr][nc] = true
      queue.push([nr, nc])
    }
  }
  return false
}

// 거리 점수: 자기 색 셀들이 양 끝까지 얼마나 가깝게 연결되는지 (가짜 다익스트라)
function shortestPath(board, player) {
  // 양 끝 가상 노드를 두고, 자기 셀=비용0, 빈 셀=비용1, 상대 셀=차단
  const INF = 9999
  const dist = Array.from({ length: SIZE }, () => Array(SIZE).fill(INF))
  const heap = []
  const push = (d, r, c) => heap.push({ d, r, c })
  const pop = () => {
    let bi = 0
    for (let i = 1; i < heap.length; i++) if (heap[i].d < heap[bi].d) bi = i
    return heap.splice(bi, 1)[0]
  }
  if (player === 'black') {
    for (let c = 0; c < SIZE; c++) {
      if (board[0][c] === 'white') continue
      const cost = board[0][c] === 'black' ? 0 : 1
      dist[0][c] = cost; push(cost, 0, c)
    }
  } else {
    for (let r = 0; r < SIZE; r++) {
      if (board[r][0] === 'black') continue
      const cost = board[r][0] === 'white' ? 0 : 1
      dist[r][0] = cost; push(cost, r, 0)
    }
  }
  while (heap.length) {
    const { d, r, c } = pop()
    if (d > dist[r][c]) continue
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      if (!inBounds(nr, nc)) continue
      if (board[nr][nc] && board[nr][nc] !== player) continue
      const w = board[nr][nc] === player ? 0 : 1
      if (dist[r][c] + w < dist[nr][nc]) {
        dist[nr][nc] = dist[r][c] + w
        push(dist[nr][nc], nr, nc)
      }
    }
  }
  let best = INF
  if (player === 'black') {
    for (let c = 0; c < SIZE; c++) if (dist[SIZE - 1][c] < best) best = dist[SIZE - 1][c]
  } else {
    for (let r = 0; r < SIZE; r++) if (dist[r][SIZE - 1] < best) best = dist[r][SIZE - 1]
  }
  return best
}

function evalBoard(board) {
  // AI(백) 관점 점수
  const whitePath = shortestPath(board, 'white')
  const blackPath = shortestPath(board, 'black')
  if (whitePath === 0) return 100000
  if (blackPath === 0) return -100000
  return blackPath - whitePath
}

function aiMove(board) {
  // 1-ply 룩어헤드: 백이 가장 좋은 자리 + 흑 차단 고려
  let best = null, bestScore = -Infinity
  const candidates = []
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (board[r][c] !== null) continue
    // 근방에 돌이 있거나 가장자리 가까운 칸만 (속도)
    let near = false
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      if (inBounds(nr, nc) && board[nr][nc]) { near = true; break }
    }
    if (!near && !(c <= 1 || c >= SIZE - 2)) continue
    candidates.push([r, c])
  }
  if (candidates.length === 0) {
    return [Math.floor(SIZE / 2), Math.floor(SIZE / 2)]
  }
  for (const [r, c] of candidates) {
    const nb = board.map(row => [...row])
    nb[r][c] = 'white'
    if (hasWon(nb, 'white')) return [r, c]
    let score = evalBoard(nb)
    // 흑 즉시 승리 차단 가중치
    const blackTest = board.map(row => [...row])
    blackTest[r][c] = 'black'
    if (hasWon(blackTest, 'black')) score += 50000
    if (score > bestScore) { bestScore = score; best = [r, c] }
  }
  return best
}

export default function Hex({ onBack }) {
  const [board, setBoard] = useState(createBoard)
  const [turn, setTurn] = useState('black')
  const [winner, setWinner] = useState(null)

  const place = (r, c) => {
    if (turn !== 'black' || winner || board[r][c]) return
    const nb = board.map(row => [...row])
    nb[r][c] = 'black'
    setBoard(nb)
    if (hasWon(nb, 'black')) { setWinner('black'); return }
    setTurn('white')
  }

  useEffect(() => {
    if (turn !== 'white' || winner) return
    const t = setTimeout(() => {
      const mv = aiMove(board)
      if (!mv) return
      const nb = board.map(row => [...row])
      nb[mv[0]][mv[1]] = 'white'
      setBoard(nb)
      if (hasWon(nb, 'white')) { setWinner('white'); return }
      setTurn('black')
    }, 500)
    return () => clearTimeout(t)
  }, [turn, board, winner])

  const reset = () => {
    setBoard(createBoard())
    setTurn('black')
    setWinner(null)
  }

  // 육각형 그리기
  const W = Math.min(window.innerWidth - 32, 440)
  const hexSize = W / (SIZE + 6) // 한 변
  const hexW = Math.sqrt(3) * hexSize
  const hexH = 2 * hexSize
  const xOff = hexW / 2
  const totalW = hexW * SIZE + hexW / 2 * (SIZE - 1) + 8
  const totalH = hexH * 3 / 4 * (SIZE - 1) + hexH + 8

  const hexPoints = (cx, cy) => {
    const pts = []
    for (let i = 0; i < 6; i++) {
      const ang = Math.PI / 180 * (60 * i - 30)
      pts.push(`${cx + hexSize * Math.cos(ang)},${cy + hexSize * Math.sin(ang)}`)
    }
    return pts.join(' ')
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>⬡ 헥스</h2>
        <button onClick={reset}
          style={{ background: '#F0F0F0', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>리셋</button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 13, fontWeight: 700, minHeight: 18 }}>
        {winner
          ? (winner === 'black' ? '🎉 위아래 연결 성공!' : '😵 AI가 좌우 연결')
          : turn === 'black' ? '내 차례 (⚫ 위↔아래)' : 'AI 생각 중... (⚪ 좌↔우)'}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={totalW} height={totalH} style={{ background: '#F5F5F5', borderRadius: 8 }}>
          {/* 가장자리 컬러 표시 */}
          <rect x={0} y={0} width={totalW} height={4} fill="#333" />
          <rect x={0} y={totalH - 4} width={totalW} height={4} fill="#333" />
          <rect x={0} y={0} width={4} height={totalH} fill="#BBB" />
          <rect x={totalW - 4} y={0} width={4} height={totalH} fill="#BBB" />
          {board.map((row, r) => row.map((cell, c) => {
            const cx = 4 + hexW / 2 + c * hexW + r * xOff
            const cy = 4 + hexSize + r * hexH * 3 / 4
            // SIZE가 커서 마지막 행이 화면 밖으로 나가지 않게 살짝 자유롭게
            return (
              <g key={r + '-' + c} onClick={() => place(r, c)} style={{ cursor: !cell && turn === 'black' && !winner ? 'pointer' : 'default' }}>
                <polygon points={hexPoints(cx, cy)}
                  fill={cell === 'black' ? '#222' : cell === 'white' ? '#FFF' : '#E8DBA6'}
                  stroke="#8B6F2A" strokeWidth="1" />
              </g>
            )
          }))}
        </svg>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 10 }}>
        ⚫(나)는 위↔아래, ⚪(AI)는 좌↔우 연결 시 승리 · 무승부 없음
      </p>
    </div>
  )
}
