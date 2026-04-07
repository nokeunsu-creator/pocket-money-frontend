import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

function generateQuestion(level) {
  const ops = ['+', '-', '×', '÷']
  let a, b, op, answer

  if (level === 'easy') {
    op = ['+', '-'][Math.floor(Math.random() * 2)]
    a = Math.floor(Math.random() * 50) + 1
    b = Math.floor(Math.random() * 50) + 1
    if (op === '-' && a < b) [a, b] = [b, a]
    answer = op === '+' ? a + b : a - b
  } else if (level === 'normal') {
    op = ops[Math.floor(Math.random() * 4)]
    if (op === '+' || op === '-') {
      a = Math.floor(Math.random() * 100) + 1
      b = Math.floor(Math.random() * 100) + 1
      if (op === '-' && a < b) [a, b] = [b, a]
      answer = op === '+' ? a + b : a - b
    } else if (op === '×') {
      a = Math.floor(Math.random() * 12) + 2
      b = Math.floor(Math.random() * 12) + 2
      answer = a * b
    } else {
      b = Math.floor(Math.random() * 9) + 2
      answer = Math.floor(Math.random() * 12) + 1
      a = b * answer
    }
  } else {
    op = ops[Math.floor(Math.random() * 4)]
    if (op === '+' || op === '-') {
      a = Math.floor(Math.random() * 500) + 50
      b = Math.floor(Math.random() * 500) + 50
      if (op === '-' && a < b) [a, b] = [b, a]
      answer = op === '+' ? a + b : a - b
    } else if (op === '×') {
      a = Math.floor(Math.random() * 20) + 2
      b = Math.floor(Math.random() * 20) + 2
      answer = a * b
    } else {
      b = Math.floor(Math.random() * 12) + 2
      answer = Math.floor(Math.random() * 20) + 1
      a = b * answer
    }
  }

  return { text: `${a} ${op} ${b}`, answer }
}

const MODES = [
  { key: 'easy', label: '덧셈·뺄셈', desc: '1~50', color: '#06D6A0', time: 60 },
  { key: 'normal', label: '사칙연산', desc: '1~100', color: '#4895EF', time: 60 },
  { key: 'hard', label: '고급', desc: '큰 숫자 (45초)', color: '#EF476F', time: 45 },
]

export default function MathSpeedQuiz({ onBack }) {
  const [playMode, setPlayMode] = useState(null) // null | 'local' | 'online'
  const [mode, setMode] = useState(null)
  const [question, setQuestion] = useState(null)
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [joinCode, setJoinCode] = useState('')
  const [countdown, setCountdown] = useState(null)
  const [onlineGameStarted, setOnlineGameStarted] = useState(false)
  const [onlineGameOver, setOnlineGameOver] = useState(false)
  const inputRef = useRef(null)
  const timerRef = useRef(null)
  const countdownRef = useRef(null)
  const startCheckRef = useRef(null)
  const scoreRef = useRef(0)
  const totalRef = useRef(0)
  const comboRef = useRef(0)

  const room = useGameRoom('mathquiz')

  // --- Online: sync game state from Firebase ---
  useEffect(() => {
    if (playMode !== 'online' || !room.gameState) return
    const s = room.gameState
    // Detect game over from Firebase
    if (s.gameOver === 'true' && !onlineGameOver) {
      setOnlineGameOver(true)
      setGameOver(true)
      clearInterval(timerRef.current)
    }
    // Set mode from Firebase state for guest
    if (s.modeKey && !mode) {
      const m = MODES.find(x => x.key === s.modeKey)
      if (m) {
        setMode({ ...m, time: s.modeTime || m.time })
      }
    }
  }, [room.gameState, playMode, onlineGameOver, mode])

  // --- Online: host detects guest connected, sets startAt ---
  useEffect(() => {
    if (playMode !== 'online' || room.role !== 'host') return
    if (room.connected && room.gameState && !room.gameState.startAt) {
      const startAt = Date.now() + 3000
      room.updateState({ ...room.gameState, startAt })
    }
  }, [room.connected, playMode, room.role, room.gameState])

  // --- Online: both players wait for startAt, show countdown, then start ---
  useEffect(() => {
    if (playMode !== 'online' || !room.gameState?.startAt || onlineGameStarted) return
    const startAt = room.gameState.startAt

    const check = () => {
      const now = Date.now()
      const diff = startAt - now
      if (diff <= 0) {
        setCountdown(null)
        setOnlineGameStarted(true)
        clearInterval(startCheckRef.current)
        // Start playing
        const m = MODES.find(x => x.key === room.gameState.modeKey)
        if (m) {
          const modeObj = { ...m, time: room.gameState.modeTime || m.time }
          setMode(modeObj)
          setScore(0)
          setTotal(0)
          setCombo(0)
          setMaxCombo(0)
          scoreRef.current = 0
          totalRef.current = 0
          comboRef.current = 0
          setTimeLeft(modeObj.time)
          setGameOver(false)
          setOnlineGameOver(false)
          setFeedback(null)
          setInput('')
          setQuestion(generateQuestion(modeObj.key))
        }
      } else {
        setCountdown(Math.ceil(diff / 1000))
      }
    }
    check()
    startCheckRef.current = setInterval(check, 100)
    return () => clearInterval(startCheckRef.current)
  }, [room.gameState?.startAt, playMode, onlineGameStarted])

  // --- Timer (works for both local and online) ---
  useEffect(() => {
    if (mode && !gameOver && timeLeft > 0 && (playMode === 'local' || onlineGameStarted)) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current)
            setGameOver(true)
            return 0
          }
          return t - 1
        })
      }, 1000)
      return () => clearInterval(timerRef.current)
    }
  }, [mode, gameOver, playMode, onlineGameStarted])

  // --- Online: when local game over, push final scores and determine winner ---
  useEffect(() => {
    if (playMode !== 'online' || !gameOver || !onlineGameStarted) return
    if (onlineGameOver) return // Already processed from Firebase

    const myRole = room.role
    const gs = room.gameState || {}
    const update = { ...gs }

    if (myRole === 'host') {
      update.hostScore = scoreRef.current
      update.hostTotal = totalRef.current
      update.hostCombo = maxCombo
    } else {
      update.guestScore = scoreRef.current
      update.guestTotal = totalRef.current
      update.guestCombo = maxCombo
    }

    // Check if both sides have finished - determine winner
    const hostDone = myRole === 'host' ? true : (gs.gameOver === 'true' || gs.hostScore !== undefined && gs.hostScore > 0) || gs.hostTotal > 0
    const guestDone = myRole === 'guest' ? true : (gs.gameOver === 'true' || gs.guestScore !== undefined && gs.guestScore > 0) || gs.guestTotal > 0

    // Mark game as over
    update.gameOver = 'true'

    const hs = myRole === 'host' ? scoreRef.current : (gs.hostScore || 0)
    const gScore = myRole === 'guest' ? scoreRef.current : (gs.guestScore || 0)
    if (hs > gScore) update.winner = 'host'
    else if (gScore > hs) update.winner = 'guest'
    else update.winner = 'draw'

    room.updateState(update)
    setOnlineGameOver(true)
  }, [gameOver, playMode, onlineGameStarted])

  // --- Online: sync my score in real-time ---
  const syncScore = useCallback((newScore, newTotal, newCombo) => {
    if (playMode !== 'online' || !room.gameState || !onlineGameStarted) return
    const gs = room.gameState
    const update = { ...gs }
    if (room.role === 'host') {
      update.hostScore = newScore
      update.hostTotal = newTotal
      update.hostCombo = newCombo
    } else {
      update.guestScore = newScore
      update.guestTotal = newTotal
      update.guestCombo = newCombo
    }
    room.updateState(update)
  }, [playMode, room.gameState, room.role, onlineGameStarted, room.updateState])

  // --- Local mode start ---
  const startGame = (m) => {
    setPlayMode('local')
    setMode(m)
    setScore(0)
    setTotal(0)
    setCombo(0)
    setMaxCombo(0)
    scoreRef.current = 0
    totalRef.current = 0
    comboRef.current = 0
    setTimeLeft(m.time)
    setGameOver(false)
    setOnlineGameOver(false)
    setFeedback(null)
    setInput('')
    setQuestion(generateQuestion(m.key))
  }

  // --- Online: host creates room with chosen difficulty ---
  const createOnline = async (m) => {
    await room.createRoom({
      modeKey: m.key,
      modeTime: m.time,
      hostScore: 0,
      guestScore: 0,
      hostTotal: 0,
      guestTotal: 0,
      hostCombo: 0,
      guestCombo: 0,
      startAt: 0,
      gameOver: '',
      winner: '',
    })
    setMode(m)
    setPlayMode('online')
  }

  // --- Online: guest joins room ---
  const joinOnline = async () => {
    if (joinCode.length !== 2) { room.setError('2자리 코드를 입력하세요'); return }
    const ok = await room.joinRoom(joinCode.toUpperCase())
    if (ok) setPlayMode('online')
  }

  const handleBack = () => {
    if (playMode === 'online') room.leaveRoom()
    clearInterval(timerRef.current)
    clearInterval(startCheckRef.current)
    setPlayMode(null)
    setMode(null)
    setOnlineGameStarted(false)
    setOnlineGameOver(false)
    setCountdown(null)
    setGameOver(false)
  }

  useEffect(() => {
    if (mode && !gameOver && inputRef.current) inputRef.current.focus()
  }, [mode, gameOver, question])

  const handleSubmit = () => {
    if (!input && input !== '0') return
    const num = Number(input)
    const newTotal = totalRef.current + 1
    totalRef.current = newTotal
    setTotal(newTotal)

    let newScore = scoreRef.current
    let newCombo = comboRef.current

    if (num === question.answer) {
      newScore = scoreRef.current + 1
      scoreRef.current = newScore
      setScore(newScore)
      newCombo = comboRef.current + 1
      comboRef.current = newCombo
      setCombo(newCombo)
      setMaxCombo(m => Math.max(m, newCombo))
      setFeedback('correct')
    } else {
      comboRef.current = 0
      newCombo = 0
      setCombo(0)
      setFeedback('wrong')
    }
    setInput('')

    // Sync to Firebase in online mode
    if (playMode === 'online') {
      syncScore(newScore, newTotal, newCombo)
    }

    setTimeout(() => {
      setFeedback(null)
      setQuestion(generateQuestion(mode.key))
    }, 300)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  // Get opponent info from gameState
  const opponentScore = room.gameState
    ? (room.role === 'host' ? room.gameState.guestScore : room.gameState.hostScore) || 0
    : 0
  const opponentCombo = room.gameState
    ? (room.role === 'host' ? room.gameState.guestCombo : room.gameState.hostCombo) || 0
    : 0

  // ============ MODE SELECTION SCREEN ============
  if (!playMode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🧮</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>사칙연산 스피드퀴즈</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 32, lineHeight: 1.6 }}>
          제한 시간 안에 최대한 빠르게 풀어보세요!<br/>
          연속 정답으로 콤보를 쌓아보세요!
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 4 }}>혼자 하기</div>
          {MODES.map(m => (
            <button key={m.key} onClick={() => startGame(m)}
              style={{
                padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                fontSize: 16, fontWeight: 700, color: '#FFF',
                background: m.color,
              }}>
              {m.label}
              <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>{m.desc}</span>
            </button>
          ))}
          <div style={{ borderTop: '1px solid #EEE', marginTop: 12, paddingTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 12 }}>온라인 대전</div>
            {MODES.map(m => (
              <button key={'online-' + m.key} onClick={() => createOnline(m)}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                  fontSize: 15, fontWeight: 700, color: '#FFF', marginBottom: 8,
                  background: `linear-gradient(135deg, ${m.color}, ${m.color}CC)`,
                }}>
                🌐 {m.label} 방 만들기
              </button>
            ))}
            <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>또는 코드로 참가</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.replace(/[^0-9]/g, ''))}
                maxLength={2}
                placeholder="방 코드 2자리"
                inputMode="numeric"
                style={{
                  flex: 1, padding: '12px', borderRadius: 10, border: '2px solid #DDD',
                  fontSize: 16, fontWeight: 700, textAlign: 'center', letterSpacing: 4,
                  fontFamily: 'monospace',
                }}
              />
              <button onClick={joinOnline}
                style={{ padding: '0 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#4895EF', color: '#FFF', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 52 }}>
                참가
              </button>
            </div>
            {room.error && <div style={{ color: '#E74C3C', fontSize: 13, marginTop: 8 }}>{room.error}</div>}
          </div>
        </div>
      </div>
    )
  }

  // ============ ONLINE: WAITING FOR GUEST ============
  if (playMode === 'online' && room.role === 'host' && !room.connected) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 24 }}>
          ← 취소
        </button>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>상대를 기다리는 중...</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
          상대방에게 아래 코드를 알려주세요
        </p>
        <div style={{
          display: 'inline-block', padding: '16px 32px', borderRadius: 16,
          background: '#F8F9FA', border: '2px dashed #CCC', marginBottom: 16,
        }}>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 8, fontFamily: 'monospace' }}>
            {room.roomCode}
          </div>
        </div>
        <div style={{ fontSize: 13, color: '#888' }}>
          난이도: <strong>{mode?.label}</strong> | 시간: {mode?.time}초
        </div>
      </div>
    )
  }

  // ============ ONLINE: COUNTDOWN BEFORE START ============
  if (playMode === 'online' && countdown !== null && !onlineGameStarted) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>곧 시작합니다!</h3>
        <div style={{
          fontSize: 72, fontWeight: 700, color: '#4895EF', marginBottom: 16,
        }}>
          {countdown}
        </div>
        <p style={{ fontSize: 14, color: '#888' }}>
          난이도: <strong>{mode?.label || (room.gameState?.modeKey && MODES.find(x => x.key === room.gameState.modeKey)?.label)}</strong>
        </p>
      </div>
    )
  }

  // ============ ONLINE: WAITING FOR COUNTDOWN (guest just joined, no startAt yet) ============
  if (playMode === 'online' && !onlineGameStarted && countdown === null) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>연결 중...</h3>
        <p style={{ fontSize: 13, color: '#888' }}>잠시만 기다려주세요</p>
      </div>
    )
  }

  // ============ GAME OVER (LOCAL) ============
  if (playMode === 'local' && gameOver) {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{
          padding: '32px 20px', borderRadius: 20,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          border: '2px solid #F1C40F',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>게임 끝!</div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>{mode.label}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: mode.color }}>{score}</div>
              <div style={{ fontSize: 11, color: '#888' }}>정답</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#888' }}>{total - score}</div>
              <div style={{ fontSize: 11, color: '#888' }}>오답</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#333' }}>{pct}%</div>
              <div style={{ fontSize: 11, color: '#888' }}>정답률</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#F39C12' }}>{maxCombo}</div>
              <div style={{ fontSize: 11, color: '#888' }}>최대콤보</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => startGame(mode)}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: mode.color, color: '#FFF', fontSize: 14, fontWeight: 600 }}>
              다시 하기
            </button>
            <button onClick={() => { setPlayMode(null); setMode(null) }}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
              난이도 변경
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============ GAME OVER (ONLINE) ============
  if (playMode === 'online' && gameOver) {
    const gs = room.gameState || {}
    const modeObj = mode || MODES.find(x => x.key === gs.modeKey) || MODES[0]
    const myScore = room.role === 'host' ? (gs.hostScore || 0) : (gs.guestScore || 0)
    const myTotal = room.role === 'host' ? (gs.hostTotal || 0) : (gs.guestTotal || 0)
    const myCombo = room.role === 'host' ? (gs.hostCombo || 0) : (gs.guestCombo || 0)
    const oppScore = room.role === 'host' ? (gs.guestScore || 0) : (gs.hostScore || 0)
    const oppTotal = room.role === 'host' ? (gs.guestTotal || 0) : (gs.hostTotal || 0)
    const oppCombo = room.role === 'host' ? (gs.guestCombo || 0) : (gs.hostCombo || 0)
    const winner = gs.winner
    const iWon = (winner === room.role)
    const isDraw = (winner === 'draw')
    const resultEmoji = iWon ? '🎉' : isDraw ? '🤝' : '😢'
    const resultText = iWon ? '승리!' : isDraw ? '무승부!' : '패배...'
    const resultColor = iWon ? '#06D6A0' : isDraw ? '#4895EF' : '#EF476F'

    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{
          padding: '32px 20px', borderRadius: 20,
          background: iWon ? 'linear-gradient(135deg, #E8FFF0, #D4EDDA)' : isDraw ? 'linear-gradient(135deg, #E8F4FD, #D6EAF8)' : 'linear-gradient(135deg, #FFF0F0, #FADBD8)',
          border: `2px solid ${resultColor}`,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{resultEmoji}</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: resultColor }}>{resultText}</div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>{modeObj.label}</div>

          {/* Score comparison */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24,
            marginBottom: 24,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>나</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: iWon ? '#06D6A0' : '#333' }}>{myScore}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{myTotal}문제 (콤보 {myCombo})</div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#CCC' }}>vs</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>상대</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: !iWon && !isDraw ? '#EF476F' : '#333' }}>{oppScore}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{oppTotal}문제 (콤보 {oppCombo})</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={handleBack}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
              나가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============ PLAYING (LOCAL + ONLINE) ============
  const modeColor = mode?.color || '#4895EF'
  const modeTime = mode?.time || 60

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ background: modeColor, color: '#FFF', padding: '1.5rem 1.25rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <button onClick={handleBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 돌아가기
          </button>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <span>✅ {score}</span>
            {combo >= 2 && <span style={{ fontWeight: 700 }}>🔥 {combo}콤보</span>}
            <span>⏱ {timeLeft}초</span>
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>
          사칙연산 퀴즈 — {mode?.label}
          {playMode === 'online' && <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>온라인</span>}
        </div>
      </div>

      {/* Online: opponent score bar */}
      {playMode === 'online' && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 16px', background: '#F8F9FA', borderBottom: '1px solid #EEE',
          fontSize: 13,
        }}>
          <span style={{ color: '#333', fontWeight: 600 }}>나: ✅ {score}</span>
          <span style={{ color: '#888' }}>vs</span>
          <span style={{ color: '#E74C3C', fontWeight: 600 }}>
            상대: ✅ {opponentScore}
            {opponentCombo >= 2 && <span style={{ marginLeft: 4 }}>🔥{opponentCombo}</span>}
          </span>
        </div>
      )}

      <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ height: 6, background: '#EEE', borderRadius: 3, marginBottom: 32, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: timeLeft <= 10 ? '#EF476F' : modeColor,
            width: `${(timeLeft / modeTime) * 100}%`,
            transition: 'width 1s linear',
          }} />
        </div>

        {combo >= 3 && (
          <div style={{ fontSize: 12, fontWeight: 700, color: '#F39C12', marginBottom: 8 }}>
            🔥 {combo}콤보!
          </div>
        )}

        <div style={{
          fontSize: 44, fontWeight: 700, marginBottom: 32,
          color: feedback === 'correct' ? '#06D6A0' : feedback === 'wrong' ? '#EF476F' : '#333',
          transition: 'color 0.2s',
        }}>
          {question?.text} = ?
        </div>

        <div style={{ display: 'flex', gap: 8, maxWidth: 220, margin: '0 auto' }}>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={input}
            onChange={e => setInput(e.target.value.replace(/[^0-9-]/g, ''))}
            onKeyDown={handleKeyDown}
            placeholder="?"
            style={{
              flex: 1, minWidth: 0, padding: '12px 8px', borderRadius: 12,
              border: '2px solid #E0E0E0', fontSize: 24, fontWeight: 700,
              textAlign: 'center', outline: 'none', fontFamily: 'monospace',
            }}
          />
          <button onClick={handleSubmit}
            style={{
              padding: '0 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: modeColor, color: '#FFF', fontSize: 16, fontWeight: 700,
              flexShrink: 0,
            }}>
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
