import { useState, useEffect, useRef } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

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
  // 흑: 0, 1, 3 | 백: 5, 7, 8
  const b = Array(9).fill(null)
  b[0] = 'black'; b[1] = 'black'; b[3] = 'black'
  b[5] = 'white'; b[7] = 'white'; b[8] = 'white'
  return b
}

// 보드 직렬화: '|' join (null → '')
function boardToFlat(board) {
  return board.map(c => c || '').join(',')
}
function flatToBoard(flat) {
  if (!flat) return initialBoard()
  return flat.split(',').map(c => c || null)
}

export default function Gonu({ onBack }) {
  const [mode, setMode] = useState(null) // null | 'local' | 'ai' | 'online'
  const [board, setBoard] = useState(initialBoard)
  const [turn, setTurn] = useState('black')
  const [selected, setSelected] = useState(null)
  const [winner, setWinner] = useState(null)
  const [winLine, setWinLine] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const aiBusyRef = useRef(false)

  const room = useGameRoom('gonu')

  // 온라인: 상태 수신
  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = room.gameState
    setBoard(flatToBoard(s.board))
    setTurn(s.turn || 'black')
    setWinner(s.winner || null)
    setWinLine(s.winLine || null)
    setSelected(null) // 상대 수가 들어오면 선택 초기화
  }, [room.gameState, mode])

  // AI 차례 처리 (local/ai 모드 한정)
  useEffect(() => {
    if (mode !== 'ai') return
    if (turn !== 'white' || winner) return
    if (aiBusyRef.current) return
    aiBusyRef.current = true
    const t = setTimeout(() => {
      const mv = aiBestMove(board)
      if (!mv) {
        // AI 이동 불가 → 흑 승
        setWinner('black')
        aiBusyRef.current = false
        return
      }
      const nb = applyMove(board, mv, 'white')
      setBoard(nb)
      const wl = checkWin(nb, 'white')
      if (wl) { setWinner('white'); setWinLine(wl) }
      else setTurn('black')
      aiBusyRef.current = false
    }, 500)
    return () => { clearTimeout(t); aiBusyRef.current = false }
  }, [turn, board, winner, mode])

  // 현재 사용자 차례인가?
  const canPlayColor = (() => {
    if (mode === 'local') return turn // 둘 다 가능
    if (mode === 'ai') return 'black'
    if (mode === 'online') return room.myColor
    return null
  })()

  const click = (i) => {
    if (winner) return
    if (mode === 'online' && !room.connected) return
    // 누구 차례인가 검증
    if (mode === 'ai' && turn !== 'black') return
    if (mode === 'online' && turn !== room.myColor) return

    const myColor = (mode === 'local') ? turn : canPlayColor
    if (!myColor) return

    const myMoves = getMoves(board, myColor)

    // 선택 없음 → 자기 말 선택
    if (selected === null) {
      if (board[i] === myColor && myMoves.some(m => m.from === i)) setSelected(i)
      return
    }
    // 같은 칸 재클릭 → 선택 해제
    if (i === selected) { setSelected(null); return }
    // 다른 자기 말 클릭 → 선택 변경
    if (board[i] === myColor && myMoves.some(m => m.from === i)) { setSelected(i); return }
    // 인접 빈 칸 클릭 → 이동
    const movesFromSel = myMoves.filter(m => m.from === selected)
    const hint = new Set(movesFromSel.map(m => m.to))
    if (!hint.has(i)) return

    const nb = applyMove(board, { from: selected, to: i }, myColor)
    const wl = checkWin(nb, myColor)
    const nextTurn = wl ? myColor : opp(myColor)

    if (mode === 'online') {
      room.updateState({
        board: boardToFlat(nb),
        turn: nextTurn,
        winner: wl ? myColor : '',
        winLine: wl || null,
      })
      // 로컬도 즉시 반영(낙관적). 서버 에코로 다시 set됨.
      setBoard(nb)
      setSelected(null)
      if (wl) { setWinner(myColor); setWinLine(wl) }
      else setTurn(nextTurn)
    } else {
      setBoard(nb)
      setSelected(null)
      if (wl) { setWinner(myColor); setWinLine(wl) }
      else setTurn(nextTurn)
    }
  }

  const reset = () => {
    if (mode === 'online') {
      room.updateState({
        board: boardToFlat(initialBoard()),
        turn: 'black',
        winner: '',
        winLine: null,
      })
    }
    setBoard(initialBoard())
    setTurn('black')
    setSelected(null)
    setWinner(null)
    setWinLine(null)
    aiBusyRef.current = false
  }

  const handleBack = () => {
    if (mode === 'online') room.leaveRoom()
    if (mode) {
      setMode(null)
      setBoard(initialBoard())
      setTurn('black')
      setSelected(null)
      setWinner(null)
      setWinLine(null)
      aiBusyRef.current = false
      return
    }
    onBack()
  }

  const createOnline = async () => {
    await room.createRoom({
      board: boardToFlat(initialBoard()),
      turn: 'black',
      winner: '',
      winLine: null,
    })
    setMode('online')
  }

  const joinOnline = async () => {
    if (joinCode.length !== 2) { room.setError('2자리 코드를 입력하세요'); return }
    const ok = await room.joinRoom(joinCode)
    if (ok) setMode('online')
  }

  // 모드 선택 화면
  if (!mode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: '#888', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🟫</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>줄고누</h2>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 24 }}>
          한국 전통 · 3×3 격자 · 자기 말 3개를 한 줄로!
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => setMode('local')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #5D4037, #8B6F2A)' }}>
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

  // 온라인 대기 화면
  if (mode === 'online' && !room.connected) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: '#888', cursor: 'pointer', marginBottom: 24 }}>
          ← 취소
        </button>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>상대를 기다리는 중...</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
          상대방에게 아래 코드를 알려주세요
        </p>
        <div style={{
          fontSize: 36, fontWeight: 700, letterSpacing: 8,
          padding: '16px 24px', background: '#F7F6F3', borderRadius: 14,
          display: 'inline-block', fontFamily: 'monospace',
        }}>
          {room.roomCode}
        </div>
        <p style={{ fontSize: 12, color: '#AAA', marginTop: 16 }}>
          나는 ⚫ 흑 (선공)
        </p>
      </div>
    )
  }

  // ─── 게임 화면 ───
  const myColor = mode === 'local' ? turn : canPlayColor
  const myMoves = (winner || (mode === 'online' && turn !== room.myColor) || (mode === 'ai' && turn !== 'black'))
    ? [] : getMoves(board, myColor)
  const movesFromSel = selected !== null ? myMoves.filter(m => m.from === selected) : []
  const hintCells = new Set(movesFromSel.map(m => m.to))

  const PX = Math.min(280, (typeof window !== 'undefined' ? window.innerWidth : 360) - 80)
  const cell = PX / 2
  const PAD = 30
  const toXY = (i) => {
    const c = i % 3, r = Math.floor(i / 3)
    return { x: PAD + c * cell, y: PAD + r * cell }
  }

  const statusText = (() => {
    if (winner === 'black') return mode === 'ai' ? '🎉 3줄 완성! 승리' : (mode === 'online' && room.myColor === 'black' ? '🎉 승리!' : (mode === 'online' ? '😵 상대 승리' : '⚫ 흑 승리'))
    if (winner === 'white') return mode === 'ai' ? '😵 AI가 3줄 완성' : (mode === 'online' && room.myColor === 'white' ? '🎉 승리!' : (mode === 'online' ? '😵 상대 승리' : '⚪ 백 승리'))
    if (mode === 'ai' && turn === 'white') return 'AI 생각 중...'
    if (mode === 'online') {
      if (turn === room.myColor) return selected === null ? '내 차례 · 말 선택' : '내 차례 · 이동할 자리 선택'
      return '상대 차례'
    }
    // local / ai 사람 차례
    if (mode === 'local') {
      return (turn === 'black' ? '⚫ 흑' : '⚪ 백') + (selected === null ? ' · 말 선택' : ' · 이동할 자리 선택')
    }
    return selected === null ? '말을 선택' : '이동할 자리 선택'
  })()

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>
          🟫 줄고누 {mode === 'online' ? '(온라인)' : mode === 'ai' ? '(vs AI)' : '(2인)'}
        </h2>
        <button onClick={reset}
          style={{ background: '#F0F0F0', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>리셋</button>
      </div>

      {mode === 'online' && (
        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0', borderRadius: 6, marginBottom: 6 }}>
          방 코드: <strong>{room.roomCode}</strong> · 나는 {room.myColor === 'black' ? '⚫ 흑' : '⚪ 백'}
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 10, fontSize: 14, fontWeight: 700, minHeight: 18 }}>
        {statusText}
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
