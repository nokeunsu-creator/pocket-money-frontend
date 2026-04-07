import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

function generateQuestion(range) {
  const a = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0]
  const b = Math.floor(Math.random() * 9) + 1
  return { a, b, answer: a * b }
}

const MODES = [
  { key: 'easy', label: '2~5단', range: [2, 5], color: '#06D6A0', time: 60 },
  { key: 'normal', label: '2~9단', range: [2, 9], color: '#4895EF', time: 60 },
  { key: 'hard', label: '2~9단 (30초)', range: [2, 9], color: '#EF476F', time: 30 },
]

function serializeMode(m) {
  return { key: m.key, label: m.label, range: m.range, color: m.color, time: m.time }
}

function deserializeMode(m) {
  if (!m) return null
  return { ...m, range: [m.range[0], m.range[1]] }
}

export default function MultiplyChallenge({ onBack }) {
  // playMode: null (lobby) | 'local' | 'online'
  const [playMode, setPlayMode] = useState(null)
  const [mode, setMode] = useState(null)
  const [question, setQuestion] = useState(null)
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [total, setTotal] = useState(0)
  const [joinCode, setJoinCode] = useState('')

  // Online-specific state
  const [countdown, setCountdown] = useState(null) // 3,2,1 countdown
  const [onlineGameStarted, setOnlineGameStarted] = useState(false)
  const [opponentScore, setOpponentScore] = useState(0)
  const [opponentTotal, setOpponentTotal] = useState(0)
  const [onlineWinner, setOnlineWinner] = useState('')

  const inputRef = useRef(null)
  const timerRef = useRef(null)
  const countdownRef = useRef(null)

  const room = useGameRoom('multiply')

  // ====== SINGLE PLAYER (LOCAL) LOGIC ======

  useEffect(() => {
    if (playMode !== 'local') return
    if (mode && !gameOver && timeLeft > 0) {
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
  }, [playMode, mode, gameOver])

  const startLocalGame = (m) => {
    setPlayMode('local')
    setMode(m)
    setScore(0)
    setTotal(0)
    setTimeLeft(m.time)
    setGameOver(false)
    setFeedback(null)
    setInput('')
    setQuestion(generateQuestion(m.range))
  }

  useEffect(() => {
    if (mode && !gameOver && inputRef.current) inputRef.current.focus()
  }, [mode, gameOver, question])

  const handleSubmit = () => {
    if (!input) return
    const num = Number(input)
    const newTotal = total + 1
    const isCorrect = num === question.answer
    const newScore = isCorrect ? score + 1 : score

    setTotal(newTotal)
    if (isCorrect) {
      setScore(newScore)
      setFeedback('correct')
    } else {
      setFeedback('wrong')
    }
    setInput('')

    // Online: sync score to Firebase
    if (playMode === 'online' && room.roomCode && room.gameState) {
      const scoreKey = room.role === 'host' ? 'hostScore' : 'guestScore'
      const totalKey = room.role === 'host' ? 'hostTotal' : 'guestTotal'
      room.updateState({
        ...room.gameState,
        [scoreKey]: newScore,
        [totalKey]: newTotal,
      })
    }

    setTimeout(() => {
      setFeedback(null)
      setQuestion(generateQuestion(mode.range))
    }, 300)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  // ====== ONLINE LOGIC ======

  const createOnline = async (m) => {
    const initialState = {
      mode: serializeMode(m),
      hostScore: 0,
      guestScore: 0,
      hostTotal: 0,
      guestTotal: 0,
      startAt: 0,
      gameOver: false,
      winner: '',
    }
    await room.createRoom(initialState)
    setMode(m)
    setPlayMode('online')
  }

  const joinOnline = async () => {
    if (joinCode.length !== 4) {
      room.setError('4자리 코드를 입력하세요')
      return
    }
    const ok = await room.joinRoom(joinCode)
    if (ok) {
      setPlayMode('online')
    }
  }

  // Guest: read mode from gameState once joined
  useEffect(() => {
    if (playMode !== 'online' || room.role !== 'guest') return
    if (room.gameState && room.gameState.mode) {
      const m = deserializeMode(room.gameState.mode)
      if (m) setMode(m)
    }
  }, [playMode, room.role, room.gameState?.mode?.key])

  // Host: when guest connects, set startAt (3 second countdown)
  useEffect(() => {
    if (playMode !== 'online' || room.role !== 'host') return
    if (room.connected && room.gameState && !room.gameState.startAt) {
      const startAt = Date.now() + 3500 // 3.5s from now for countdown
      room.updateState({
        ...room.gameState,
        startAt,
      })
    }
  }, [playMode, room.role, room.connected])

  // Both: countdown and game start based on startAt
  useEffect(() => {
    if (playMode !== 'online') return
    if (!room.gameState || !room.gameState.startAt || room.gameState.startAt === 0) return
    if (onlineGameStarted) return

    const startAt = room.gameState.startAt

    const tick = () => {
      const now = Date.now()
      const diff = startAt - now
      if (diff <= 0) {
        // Game starts
        setCountdown(null)
        setOnlineGameStarted(true)
        clearInterval(countdownRef.current)
      } else {
        setCountdown(Math.ceil(diff / 1000))
      }
    }
    tick()
    countdownRef.current = setInterval(tick, 100)
    return () => clearInterval(countdownRef.current)
  }, [playMode, room.gameState?.startAt, onlineGameStarted])

  // When online game starts, initialize local game state
  useEffect(() => {
    if (!onlineGameStarted || !mode) return
    setScore(0)
    setTotal(0)
    setTimeLeft(mode.time)
    setGameOver(false)
    setFeedback(null)
    setInput('')
    setQuestion(generateQuestion(mode.range))
  }, [onlineGameStarted])

  // Online timer
  useEffect(() => {
    if (playMode !== 'online' || !onlineGameStarted || gameOver) return
    if (timeLeft <= 0) return

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
  }, [playMode, onlineGameStarted, gameOver])

  // Online: when game over, determine winner (host writes result)
  useEffect(() => {
    if (playMode !== 'online' || !gameOver || !room.gameState) return
    if (room.role !== 'host') return
    if (room.gameState.gameOver) return

    // Small delay to let last score sync
    const timeout = setTimeout(() => {
      const gs = room.gameState
      const hs = room.role === 'host' ? score : (gs.hostScore || 0)
      const gScore = room.role === 'host' ? (gs.guestScore || 0) : score
      let winner = 'draw'
      if (hs > gScore) winner = 'host'
      else if (gScore > hs) winner = 'guest'

      room.updateState({
        ...gs,
        hostScore: hs,
        guestScore: gScore,
        gameOver: true,
        winner,
      })
    }, 1500)
    return () => clearTimeout(timeout)
  }, [playMode, gameOver, room.role])

  // Online: sync opponent score from gameState
  useEffect(() => {
    if (playMode !== 'online' || !room.gameState) return
    if (room.role === 'host') {
      setOpponentScore(room.gameState.guestScore || 0)
      setOpponentTotal(room.gameState.guestTotal || 0)
    } else {
      setOpponentScore(room.gameState.hostScore || 0)
      setOpponentTotal(room.gameState.hostTotal || 0)
    }
    if (room.gameState.gameOver && room.gameState.winner) {
      setOnlineWinner(room.gameState.winner)
      setGameOver(true)
      clearInterval(timerRef.current)
    }
  }, [playMode, room.role, room.gameState])

  const handleBack = () => {
    if (playMode === 'online') {
      room.leaveRoom()
      setOnlineGameStarted(false)
      setCountdown(null)
      setOnlineWinner('')
      setOpponentScore(0)
      setOpponentTotal(0)
    }
    clearInterval(timerRef.current)
    clearInterval(countdownRef.current)
    setMode(null)
    setPlayMode(null)
    setGameOver(false)
    setScore(0)
    setTotal(0)
  }

  // ====== RENDER: LOBBY (no playMode) ======
  if (!playMode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>✖️</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>구구단 챌린지</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 32, lineHeight: 1.6 }}>
          제한 시간 안에 최대한 많이 맞춰보세요!
        </p>

        {/* 혼자 하기 */}
        <div style={{ fontSize: 14, fontWeight: 600, color: '#555', marginBottom: 10 }}>혼자 하기</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 260, margin: '0 auto', marginBottom: 28 }}>
          {MODES.map(m => (
            <button key={m.key} onClick={() => startLocalGame(m)}
              style={{
                padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                fontSize: 15, fontWeight: 700, color: '#FFF',
                background: m.color,
              }}>
              {m.label}
              <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>{m.time}초</span>
            </button>
          ))}
        </div>

        {/* 온라인 */}
        <div style={{ fontSize: 14, fontWeight: 600, color: '#555', marginBottom: 10 }}>온라인 대전</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 260, margin: '0 auto', marginBottom: 16 }}>
          {MODES.map(m => (
            <button key={'online-' + m.key} onClick={() => createOnline(m)}
              style={{
                padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                fontSize: 15, fontWeight: 700, color: '#FFF',
                background: `linear-gradient(135deg, ${m.color}, ${m.color}CC)`,
              }}>
              🌐 온라인 방 만들기 — {m.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>또는 코드로 참가</div>
        <div style={{ display: 'flex', gap: 8, maxWidth: 260, margin: '8px auto 0' }}>
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.replace(/[^0-9]/g, ''))}
            maxLength={4}
            placeholder="방 코드 4자리"
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 10, border: '2px solid #E0E0E0',
              fontSize: 16, textAlign: 'center', outline: 'none', fontFamily: 'monospace',
            }}
          />
          <button onClick={joinOnline}
            style={{
              padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: '#4895EF', color: '#FFF', fontSize: 14, fontWeight: 700,
            }}>
            참가
          </button>
        </div>
        {room.error && <div style={{ color: '#EF476F', fontSize: 13, marginTop: 8 }}>{room.error}</div>}
      </div>
    )
  }

  // ====== RENDER: ONLINE WAITING ======
  if (playMode === 'online' && !room.connected) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 24 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>상대방을 기다리는 중...</h2>
        {mode && <p style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>모드: {mode.label} ({mode.time}초)</p>}
        <div style={{
          display: 'inline-block', padding: '12px 32px', borderRadius: 12,
          background: '#F0F0F0', fontSize: 32, fontWeight: 700, letterSpacing: 8,
          fontFamily: 'monospace', margin: '16px 0',
        }}>
          {room.roomCode}
        </div>
        <p style={{ fontSize: 13, color: '#888' }}>이 코드를 상대방에게 알려주세요</p>
      </div>
    )
  }

  // ====== RENDER: ONLINE COUNTDOWN ======
  if (playMode === 'online' && countdown !== null && !onlineGameStarted) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>곧 시작합니다!</h2>
        {mode && <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>모드: {mode.label} ({mode.time}초)</p>}
        <div style={{
          fontSize: 80, fontWeight: 700,
          color: mode ? mode.color : '#4895EF',
          lineHeight: 1,
          margin: '24px 0',
        }}>
          {countdown}
        </div>
        <p style={{ fontSize: 13, color: '#888' }}>
          방 코드: <strong>{room.roomCode}</strong> · 나는 {room.role === 'host' ? '방장' : '참가자'}
        </p>
      </div>
    )
  }

  // ====== RENDER: GAME OVER (LOCAL) ======
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
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24 }}>
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
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => startLocalGame(mode)}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: mode.color, color: '#FFF', fontSize: 14, fontWeight: 600 }}>
              다시 하기
            </button>
            <button onClick={handleBack}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
              난이도 변경
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ====== RENDER: GAME OVER (ONLINE) ======
  if (playMode === 'online' && gameOver && mode) {
    const myScore = score
    const myTotal = total
    const myPct = myTotal > 0 ? Math.round((myScore / myTotal) * 100) : 0
    const oppPct = opponentTotal > 0 ? Math.round((opponentScore / opponentTotal) * 100) : 0

    const iWon = onlineWinner === room.role
    const isDraw = onlineWinner === 'draw'
    const resultEmoji = iWon ? '🏆' : isDraw ? '🤝' : '😢'
    const resultText = iWon ? '승리!' : isDraw ? '무승부!' : '패배...'
    const resultColor = iWon ? '#F1C40F' : isDraw ? '#4895EF' : '#888'

    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{
          padding: '32px 20px', borderRadius: 20,
          background: iWon
            ? 'linear-gradient(135deg, #FFF9E6, #FFF3CD)'
            : isDraw
              ? 'linear-gradient(135deg, #EBF5FF, #D6ECFF)'
              : 'linear-gradient(135deg, #F5F5F5, #E8E8E8)',
          border: `2px solid ${resultColor}`,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{resultEmoji}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{resultText}</div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>온라인 · {mode.label}</div>

          {/* Score comparison */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>
                나 ({room.role === 'host' ? '방장' : '참가자'})
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: iWon || isDraw ? mode.color : '#888' }}>{myScore}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{myTotal}문제 · {myPct}%</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 20, fontWeight: 700, color: '#CCC' }}>VS</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>
                상대 ({room.role === 'host' ? '참가자' : '방장'})
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: !iWon && !isDraw ? mode.color : '#888' }}>{opponentScore}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{opponentTotal}문제 · {oppPct}%</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={handleBack}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: mode.color, color: '#FFF', fontSize: 14, fontWeight: 600 }}>
              나가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ====== RENDER: ACTIVE GAME (BOTH LOCAL & ONLINE) ======
  if (!mode || !question) return null

  const isOnline = playMode === 'online'

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ background: mode.color, color: '#FFF', padding: '1.5rem 1.25rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <button onClick={handleBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← {isOnline ? '나가기' : '돌아가기'}
          </button>
          <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
            <span>✅ {score}</span>
            {isOnline && <span style={{ opacity: 0.7 }}>👤 {opponentScore}</span>}
            <span>⏱ {timeLeft}초</span>
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>
          구구단 챌린지 — {mode.label} {isOnline ? '(온라인)' : ''}
        </div>
      </div>

      {isOnline && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 24, padding: '8px 16px',
          background: '#F8F9FA', borderBottom: '1px solid #EEE', fontSize: 13,
        }}>
          <span style={{ fontWeight: 600, color: mode.color }}>나: {score}점 ({total}문제)</span>
          <span style={{ color: '#CCC' }}>|</span>
          <span style={{ fontWeight: 600, color: '#888' }}>상대: {opponentScore}점 ({opponentTotal}문제)</span>
        </div>
      )}

      <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        {/* 타이머 바 */}
        <div style={{ height: 6, background: '#EEE', borderRadius: 3, marginBottom: 32, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: timeLeft <= 10 ? '#EF476F' : mode.color,
            width: `${(timeLeft / mode.time) * 100}%`,
            transition: 'width 1s linear',
          }} />
        </div>

        {/* 문제 */}
        <div style={{
          fontSize: 48, fontWeight: 700, marginBottom: 32,
          color: feedback === 'correct' ? '#06D6A0' : feedback === 'wrong' ? '#EF476F' : '#333',
          transition: 'color 0.2s',
        }}>
          {question.a} × {question.b} = ?
        </div>

        {/* 입력 */}
        <div style={{ display: 'flex', gap: 8, maxWidth: 200, margin: '0 auto' }}>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            maxLength={3}
            value={input}
            onChange={e => setInput(e.target.value.replace(/[^0-9]/g, ''))}
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
              background: mode.color, color: '#FFF', fontSize: 16, fontWeight: 700,
              flexShrink: 0,
            }}>
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
