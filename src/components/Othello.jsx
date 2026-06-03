import { useState, useEffect, useRef } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

const SIZE = 8
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]

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

function boardToFlat(board) {
  return board.map(row => row.map(c => c ? c[0] : '.').join('')).join('|')
}
function flatToBoard(flat) {
  if (!flat) return createBoard()
  return flat.split('|').map(row => row.split('').map(ch => ch === 'b' ? 'black' : ch === 'w' ? 'white' : null))
}

function opp(p) { return p === 'black' ? 'white' : 'black' }

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
  if (total >= 54) return (my - op) * 100
  return pos + mobility
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

export default function Othello({ onBack }) {
  const [mode, setMode] = useState(null) // null | 'local' | 'ai' | 'online'
  const [board, setBoard] = useState(createBoard)
  const [turn, setTurn] = useState('black')
  const [winner, setWinner] = useState(null) // 'black' | 'white' | 'draw'
  const [passed, setPassed] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const aiBusyRef = useRef(false)

  const room = useGameRoom('othello')

  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = room.gameState
    setBoard(flatToBoard(s.board))
    setTurn(s.turn || 'black')
    setWinner(s.winner || null)
    setPassed(!!s.passed)
  }, [room.gameState, mode])

  const { black, white } = countDiscs(board)

  const myColor = mode === 'local' ? turn
    : mode === 'ai' ? 'black'
    : mode === 'online' ? room.myColor : null

  const isMyTurn = !winner && (
    mode === 'local'
    || (mode === 'ai' && turn === 'black')
    || (mode === 'online' && room.connected && turn === room.myColor)
  )

  const myMoves = (isMyTurn && myColor) ? getValidMoves(board, myColor) : []
  const isHint = (r, c) => myMoves.some(m => m.r === r && m.c === c)

  const finishGameSync = (b) => {
    const { black, white } = countDiscs(b)
    if (black > white) return 'black'
    if (white > black) return 'white'
    return 'draw'
  }

  const place = (r, c) => {
    if (!isMyTurn) return
    const player = mode === 'local' ? turn : myColor
    const move = myMoves.find(m => m.r === r && m.c === c)
    if (!move) return
    const nb = applyMove(board, r, c, move.flips, player)
    const next = opp(player)
    const nextMoves = getValidMoves(nb, next)
    let nextTurn = next
    let nextPassed = false
    let nextWinner = null
    if (nextMoves.length === 0) {
      // 다음 색이 둘 수 없음 → 이번 색이 계속 두거나 종료
      const sameMoves = getValidMoves(nb, player)
      if (sameMoves.length === 0) {
        nextWinner = finishGameSync(nb)
      } else {
        nextTurn = player
        nextPassed = true
      }
    }

    if (mode === 'online') {
      room.updateState({
        board: boardToFlat(nb),
        turn: nextTurn,
        winner: nextWinner || '',
        passed: nextPassed,
      })
    }
    setBoard(nb)
    setTurn(nextTurn)
    setPassed(nextPassed)
    if (nextWinner) setWinner(nextWinner)
  }

  // AI 차례
  useEffect(() => {
    if (mode !== 'ai' || winner) return
    if (turn !== 'white') return
    if (aiBusyRef.current) return
    aiBusyRef.current = true
    const t = setTimeout(() => {
      const wMoves = getValidMoves(board, 'white')
      if (wMoves.length === 0) {
        const bMoves = getValidMoves(board, 'black')
        if (bMoves.length === 0) {
          setWinner(finishGameSync(board))
        } else {
          setTurn('black')
          setPassed(true)
        }
        aiBusyRef.current = false
        return
      }
      const empty = 64 - (black + white)
      const depth = empty <= 10 ? 8 : empty <= 16 ? 5 : 4
      const best = aiBestMove(board, 'white', depth)
      const nb = applyMove(board, best.r, best.c, best.flips, 'white')
      const bMoves = getValidMoves(nb, 'black')
      if (bMoves.length === 0) {
        const wMoves2 = getValidMoves(nb, 'white')
        if (wMoves2.length === 0) {
          setBoard(nb)
          setWinner(finishGameSync(nb))
        } else {
          setBoard(nb)
          setTurn('white')
          setPassed(true)
        }
      } else {
        setBoard(nb)
        setTurn('black')
        setPassed(false)
      }
      aiBusyRef.current = false
    }, 500)
    return () => { clearTimeout(t); aiBusyRef.current = false }
  }, [turn, board, winner, mode, black, white])

  const reset = () => {
    const fresh = createBoard()
    if (mode === 'online') {
      room.updateState({
        board: boardToFlat(fresh),
        turn: 'black',
        winner: '',
        passed: false,
      })
    }
    setBoard(fresh)
    setTurn('black')
    setWinner(null)
    setPassed(false)
    aiBusyRef.current = false
  }

  const handleBack = () => {
    if (mode === 'online') room.leaveRoom()
    if (mode) {
      setMode(null)
      setBoard(createBoard())
      setTurn('black')
      setWinner(null)
      setPassed(false)
      aiBusyRef.current = false
      return
    }
    onBack()
  }

  const createOnline = async () => {
    await room.createRoom({
      board: boardToFlat(createBoard()),
      turn: 'black',
      winner: '',
      passed: false,
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
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: '#888', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>⚫⚪</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>오델로</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => setMode('local')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}>
            📱 같은 기기에서 (2인)
          </button>
          <button onClick={() => setMode('ai')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #E67E22, #D35400)' }}>
            🤖 vs 컴퓨터
          </button>
          <button onClick={createOnline}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #4895EF, #3A7BD5)' }}>
            🌐 온라인 방 만들기
          </button>
          <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>또는 코드로 참가</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.replace(/[^0-9]/g, ''))}
              maxLength={2}
              placeholder="방 코드 2자리"
              inputMode="numeric"
              style={{
                flex: 1, minWidth: 0, boxSizing: 'border-box',
                padding: '12px', borderRadius: 10, border: '2px solid #DDD',
                fontSize: 16, fontWeight: 700, textAlign: 'center', letterSpacing: 4,
                fontFamily: 'monospace',
              }}
            />
            <button onClick={joinOnline}
              style={{ padding: '0 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#4895EF', color: '#FFF', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 52, flexShrink: 0 }}>
              참가
            </button>
          </div>
          {room.error && <div style={{ color: '#E74C3C', fontSize: 13 }}>{room.error}</div>}
        </div>
      </div>
    )
  }

  if (mode === 'online' && !room.connected) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: '#888', cursor: 'pointer', marginBottom: 24 }}>
          ← 취소
        </button>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>상대를 기다리는 중...</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>상대방에게 아래 코드를 알려주세요</p>
        <div style={{
          fontSize: 36, fontWeight: 700, letterSpacing: 8,
          padding: '16px 24px', background: '#F7F6F3', borderRadius: 14,
          display: 'inline-block', fontFamily: 'monospace',
        }}>{room.roomCode}</div>
        <p style={{ fontSize: 12, color: '#AAA', marginTop: 16 }}>나는 ⚫ 흑 (선공)</p>
      </div>
    )
  }

  const statusText = (() => {
    if (winner === 'draw') return '🤝 무승부'
    if (winner === 'black') return mode === 'online' && room.myColor === 'white' ? '😵 패배' : '🎉 ⚫ 흑 승리!'
    if (winner === 'white') return mode === 'online' && room.myColor === 'black' ? '😵 패배' : '🎉 ⚪ 백 승리!'
    if (mode === 'ai' && turn === 'white') return 'AI 생각 중...'
    if (mode === 'online') {
      if (turn === room.myColor) return passed ? '상대가 패스. 내 차례.' : (myMoves.length ? '내 차례' : '둘 곳이 없음 (자동 패스)')
      return passed ? '내가 패스. 상대 차례.' : '상대 차례'
    }
    // local/ai 사람 차례
    return (turn === 'black' ? '⚫ 흑' : '⚪ 백') + (passed ? ' (상대 패스)' : ' 차례') + (myMoves.length === 0 ? ' (둘 곳 없음)' : '')
  })()

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>
          ⚫⚪ 오델로 {mode === 'online' ? '(온라인)' : mode === 'ai' ? '(vs AI)' : '(2인)'}
        </h2>
        <button onClick={reset}
          style={{ background: '#F0F0F0', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>리셋</button>
      </div>

      {mode === 'online' && (
        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0', borderRadius: 6, marginBottom: 6 }}>
          방 코드: <strong>{room.roomCode}</strong> · 나는 {room.myColor === 'black' ? '⚫ 흑' : '⚪ 백'}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 8, fontSize: 14, fontWeight: 700 }}>
        <div>⚫ {black}</div>
        <div>⚪ {white}</div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 10, fontSize: 13, fontWeight: 700, minHeight: 18 }}>
        {statusText}
      </div>

      <div style={{
        background: '#1B5E20', padding: 6, borderRadius: 8, width: '100%', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gap: 2 }}>
          {board.map((row, r) => row.map((cell, c) => {
            const hint = !winner && isMyTurn && isHint(r, c)
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
