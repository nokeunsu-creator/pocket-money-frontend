import { useState, useEffect, useRef, useCallback } from 'react'
import { WORD_TOPICS } from '../data/englishWords'
import { getData, addScore, addDiamonds, updateRecord, updateDailyChallenge, addWrongWord } from '../utils/englishStorage'
import { useGameRoom } from '../utils/useGameRoom'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateChoices(topic, correctWord) {
  const others = topic.words.filter(w => w.en !== correctWord.en)
  const wrongChoices = shuffle(others).slice(0, 3)
  return shuffle([correctWord, ...wrongChoices])
}

function getComboMultiplier(combo) {
  if (combo >= 10) return 3
  if (combo >= 5) return 2
  return 1
}

function formatTime(seconds) {
  const s = Math.max(0, Math.round(seconds * 10) / 10)
  const sec = Math.floor(s)
  return `00:${sec < 10 ? '0' : ''}${sec}`
}

export default function WordSprint({ onBack }) {
  // Phase: 'topics' | 'countdown' | 'playing' | 'results'
  const [phase, setPhase] = useState('topics')
  const [playMode, setPlayMode] = useState(null) // null | 'local' | 'online'
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [topicRecords, setTopicRecords] = useState({})

  // Countdown
  const [countdownNum, setCountdownNum] = useState(3)

  // Game state
  const [timeLeft, setTimeLeft] = useState(30)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [currentWord, setCurrentWord] = useState(null)
  const [choices, setChoices] = useState([])
  const [usedIndices, setUsedIndices] = useState([])
  const [feedback, setFeedback] = useState(null) // { type: 'correct'|'wrong', correctIdx: number, selectedIdx: number }
  const [wrongWords, setWrongWords] = useState([])

  // Online state
  const [joinCode, setJoinCode] = useState('')
  const [onlineCountdown, setOnlineCountdown] = useState(null)
  const [onlineGameStarted, setOnlineGameStarted] = useState(false)
  const [opponentScore, setOpponentScore] = useState(0)
  const [onlineWinner, setOnlineWinner] = useState('')

  const timerRef = useRef(null)
  const countdownRef = useRef(null)
  const startCheckRef = useRef(null)
  const feedbackTimeoutRef = useRef(null)
  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const correctRef = useRef(0)
  const wrongRef = useRef(0)
  const maxComboRef = useRef(0)
  const timeLeftRef = useRef(30)

  const room = useGameRoom('wordSprint')

  // Load records on mount
  useEffect(() => {
    try {
      const data = getData()
      if (data && data.records && data.records.wordSprint) {
        setTopicRecords(data.records.wordSprint)
      }
    } catch (e) { /* no data yet */ }
  }, [])

  // Pick next word from topic, cycling through all before repeating
  const pickNextWord = useCallback((topic, used) => {
    let available = topic.words.map((w, i) => i).filter(i => !used.includes(i))
    if (available.length === 0) {
      // Reset - all words used
      available = topic.words.map((w, i) => i)
      setUsedIndices([])
    }
    const idx = available[Math.floor(Math.random() * available.length)]
    const word = topic.words[idx]
    const newUsed = [...(available.length === topic.words.length ? [] : used), idx]
    setUsedIndices(newUsed)
    setCurrentWord(word)
    setChoices(generateChoices(topic, word))
    return word
  }, [])

  // Start local game
  const startLocalGame = (topic) => {
    setPlayMode('local')
    setSelectedTopic(topic)
    setPhase('countdown')
    setCountdownNum(3)
  }

  // Countdown effect
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdownNum <= 0) {
      // Start the game
      setPhase('playing')
      resetGameState()
      pickNextWord(selectedTopic, [])
      return
    }
    const timer = setTimeout(() => setCountdownNum(n => n - 1), 1000)
    return () => clearTimeout(timer)
  }, [phase, countdownNum])

  const resetGameState = () => {
    setTimeLeft(30)
    timeLeftRef.current = 30
    setScore(0)
    scoreRef.current = 0
    setCombo(0)
    comboRef.current = 0
    setMaxCombo(0)
    maxComboRef.current = 0
    setCorrect(0)
    correctRef.current = 0
    setWrong(0)
    wrongRef.current = 0
    setUsedIndices([])
    setFeedback(null)
    setWrongWords([])
  }

  // Game timer (local)
  useEffect(() => {
    if (phase !== 'playing') return
    if (playMode === 'online' && !onlineGameStarted) return

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        const newT = Math.round((t - 0.1) * 10) / 10
        timeLeftRef.current = newT
        if (newT <= 0) {
          clearInterval(timerRef.current)
          // Delay results slightly to allow last feedback to show
          setTimeout(() => setPhase('results'), 200)
          return 0
        }
        return newT
      })
    }, 100)
    return () => clearInterval(timerRef.current)
  }, [phase, playMode, onlineGameStarted])

  // Handle answer selection
  const handleAnswer = (choiceIdx) => {
    if (feedback) return // Still showing feedback
    if (phase !== 'playing') return

    const selectedWord = choices[choiceIdx]
    const isCorrect = selectedWord.en === currentWord.en
    const correctIdx = choices.findIndex(c => c.en === currentWord.en)

    if (isCorrect) {
      const newCombo = comboRef.current + 1
      comboRef.current = newCombo
      setCombo(newCombo)

      const newMaxCombo = Math.max(maxComboRef.current, newCombo)
      maxComboRef.current = newMaxCombo
      setMaxCombo(newMaxCombo)

      const multiplier = getComboMultiplier(newCombo)
      const points = 10 * multiplier
      const newScore = scoreRef.current + points
      scoreRef.current = newScore
      setScore(newScore)

      const newCorrect = correctRef.current + 1
      correctRef.current = newCorrect
      setCorrect(newCorrect)

      // +2 second bonus
      setTimeLeft(t => {
        const newT = Math.min(t + 2, 99)
        timeLeftRef.current = newT
        return newT
      })

      setFeedback({ type: 'correct', correctIdx, selectedIdx: choiceIdx })
    } else {
      comboRef.current = 0
      setCombo(0)

      const newWrong = wrongRef.current + 1
      wrongRef.current = newWrong
      setWrong(newWrong)

      // -1 second penalty
      setTimeLeft(t => {
        const newT = Math.max(t - 1, 0)
        timeLeftRef.current = newT
        if (newT <= 0) {
          clearInterval(timerRef.current)
          setTimeout(() => setPhase('results'), 500)
        }
        return newT
      })

      setWrongWords(prev => [...prev, currentWord])
      setFeedback({ type: 'wrong', correctIdx, selectedIdx: choiceIdx })
    }

    // Sync online score
    if (playMode === 'online' && room.roomCode && room.gameState) {
      const scoreKey = room.role === 'host' ? 'hostScore' : 'guestScore'
      room.updateState({
        ...room.gameState,
        [scoreKey]: scoreRef.current,
      })
    }

    // Move to next word after delay
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null)
      if (timeLeftRef.current > 0) {
        pickNextWord(selectedTopic, usedIndices)
      }
    }, 300)
  }

  // Save results when game ends
  useEffect(() => {
    if (phase !== 'results' || !selectedTopic) return
    if (playMode === 'online') return // Online saves differently

    const finalScore = scoreRef.current

    try {
      addScore(finalScore)
      updateDailyChallenge('word')

      const currentBest = topicRecords[selectedTopic.key] || 0
      const isNewRecord = finalScore > currentBest

      updateRecord('wordSprint', selectedTopic.key, finalScore)

      if (isNewRecord && finalScore > 0) {
        addDiamonds(1)
      }

      // Save wrong words
      wrongWords.forEach(w => {
        addWrongWord(w)
      })

      // Update local records
      setTopicRecords(prev => ({
        ...prev,
        [selectedTopic.key]: Math.max(prev[selectedTopic.key] || 0, finalScore),
      }))
    } catch (e) { /* storage error */ }
  }, [phase])

  // ====== ONLINE LOGIC ======

  const createOnline = async (topic) => {
    const initialState = {
      topicKey: topic.key,
      hostScore: 0,
      guestScore: 0,
      startAt: 0,
      gameOver: false,
      winner: '',
    }
    await room.createRoom(initialState)
    setSelectedTopic(topic)
    setPlayMode('online')
    setPhase('topics') // Stay in lobby-like state, handled by online waiting render
  }

  const joinOnline = async () => {
    if (joinCode.length !== 2) {
      room.setError('2자리 코드를 입력하세요')
      return
    }
    const ok = await room.joinRoom(joinCode)
    if (ok) {
      setPlayMode('online')
    }
  }

  // Guest: read topic from gameState
  useEffect(() => {
    if (playMode !== 'online' || room.role !== 'guest') return
    if (room.gameState && room.gameState.topicKey && !selectedTopic) {
      const topic = WORD_TOPICS.find(t => t.key === room.gameState.topicKey)
      if (topic) setSelectedTopic(topic)
    }
  }, [playMode, room.role, room.gameState?.topicKey])

  // Host: when guest connects, set startAt
  useEffect(() => {
    if (playMode !== 'online' || room.role !== 'host') return
    if (room.connected && room.gameState && !room.gameState.startAt) {
      const startAt = Date.now() + 3500
      room.updateState({ ...room.gameState, startAt })
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
        setOnlineCountdown(null)
        setOnlineGameStarted(true)
        clearInterval(startCheckRef.current)
      } else {
        setOnlineCountdown(Math.ceil(diff / 1000))
      }
    }
    tick()
    startCheckRef.current = setInterval(tick, 100)
    return () => clearInterval(startCheckRef.current)
  }, [playMode, room.gameState?.startAt, onlineGameStarted])

  // When online game starts, initialize
  useEffect(() => {
    if (!onlineGameStarted || !selectedTopic) return
    resetGameState()
    pickNextWord(selectedTopic, [])
    setPhase('playing')
  }, [onlineGameStarted])

  // Online: sync opponent score
  useEffect(() => {
    if (playMode !== 'online' || !room.gameState) return
    if (room.role === 'host') {
      setOpponentScore(room.gameState.guestScore || 0)
    } else {
      setOpponentScore(room.gameState.hostScore || 0)
    }
    if (room.gameState.gameOver && room.gameState.winner) {
      setOnlineWinner(room.gameState.winner)
      setPhase('results')
      clearInterval(timerRef.current)
    }
  }, [playMode, room.role, room.gameState])

  // Online: when game over, determine winner (host writes)
  useEffect(() => {
    if (playMode !== 'online' || phase !== 'results' || !room.gameState) return
    if (room.role !== 'host') return
    if (room.gameState.gameOver) return

    const timeout = setTimeout(() => {
      const gs = room.gameState
      const hs = room.role === 'host' ? scoreRef.current : (gs.hostScore || 0)
      const gScore = room.role === 'host' ? (gs.guestScore || 0) : scoreRef.current
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
  }, [phase, playMode, room.role])

  // Online: save results with bonus
  useEffect(() => {
    if (phase !== 'results' || playMode !== 'online' || !onlineWinner || !selectedTopic) return
    try {
      const finalScore = scoreRef.current
      addScore(finalScore)
      updateDailyChallenge('word')
      updateRecord('wordSprint', selectedTopic.key, finalScore)

      const iWon = onlineWinner === room.role
      if (iWon) {
        addDiamonds(2) // Winner bonus
      }

      wrongWords.forEach(w => addWrongWord(w))
    } catch (e) { /* */ }
  }, [onlineWinner])

  const handleBack = () => {
    if (playMode === 'online') {
      room.leaveRoom()
      setOnlineGameStarted(false)
      setOnlineCountdown(null)
      setOnlineWinner('')
      setOpponentScore(0)
    }
    clearInterval(timerRef.current)
    clearInterval(startCheckRef.current)
    clearTimeout(feedbackTimeoutRef.current)
    setPhase('topics')
    setPlayMode(null)
    setSelectedTopic(null)
    setFeedback(null)
  }

  const handleTopicChange = () => {
    clearInterval(timerRef.current)
    clearTimeout(feedbackTimeoutRef.current)
    setPhase('topics')
    setPlayMode(null)
    setSelectedTopic(null)
    setFeedback(null)
  }

  // Timer bar color
  const getTimerColor = (t) => {
    if (t <= 5) return '#EF476F'
    if (t <= 15) return '#F1C40F'
    return '#06D6A0'
  }

  const multiplier = getComboMultiplier(combo)

  // ====== RENDER: ONLINE WAITING ======
  if (playMode === 'online' && room.roomCode && !room.connected) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 24 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>상대방을 기다리는 중...</h2>
        {selectedTopic && <p style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>주제: {selectedTopic.icon} {selectedTopic.label}</p>}
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
  if (playMode === 'online' && onlineCountdown !== null && !onlineGameStarted) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>곧 시작합니다!</h2>
        {selectedTopic && <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>주제: {selectedTopic.icon} {selectedTopic.label}</p>}
        <div style={{
          fontSize: 80, fontWeight: 700, color: '#4895EF',
          lineHeight: 1, margin: '24px 0',
        }}>
          {onlineCountdown}
        </div>
        <p style={{ fontSize: 13, color: '#888' }}>
          방 코드: <strong>{room.roomCode}</strong> · 나는 {room.role === 'host' ? '방장' : '참가자'}
        </p>
      </div>
    )
  }

  // ====== RENDER: ONLINE WAITING (guest, no startAt yet) ======
  if (playMode === 'online' && !onlineGameStarted && phase !== 'playing' && phase !== 'results') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 24 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>연결 중...</h3>
        <p style={{ fontSize: 13, color: '#888' }}>잠시만 기다려주세요</p>
      </div>
    )
  }

  // ====== RENDER: TOPIC SELECTION ======
  if (phase === 'topics' && !playMode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>📝</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>단어 스프린트</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 28, lineHeight: 1.6 }}>
          30초 안에 한국어 단어의 영어 뜻을 맞춰보세요!<br/>
          연속 정답으로 콤보 보너스를 얻으세요!
        </p>

        {/* 혼자 하기 */}
        <div style={{ fontSize: 14, fontWeight: 600, color: '#555', marginBottom: 12 }}>혼자 하기</div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
          maxWidth: 340, margin: '0 auto', marginBottom: 28,
        }}>
          {WORD_TOPICS.map(topic => {
            const best = topicRecords[topic.key]
            return (
              <button key={topic.key} onClick={() => startLocalGame(topic)}
                style={{
                  padding: '16px 8px', borderRadius: 14, border: '2px solid #F0F0F0',
                  cursor: 'pointer', background: '#FFF', textAlign: 'center',
                  transition: 'transform 0.1s',
                }}
                onPointerDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                onPointerUp={e => e.currentTarget.style.transform = ''}
                onPointerLeave={e => e.currentTarget.style.transform = ''}
              >
                <div style={{ fontSize: 28, marginBottom: 4 }}>{topic.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>{topic.label}</div>
                {best > 0 && (
                  <div style={{ fontSize: 11, color: '#F39C12', marginTop: 4, fontWeight: 600 }}>
                    최고 {best}점
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* 온라인 대전 */}
        <div style={{ borderTop: '1px solid #EEE', paddingTop: 20, maxWidth: 340, margin: '0 auto' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#555', marginBottom: 12 }}>온라인 대전</div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
            marginBottom: 16,
          }}>
            {WORD_TOPICS.map(topic => (
              <button key={'online-' + topic.key} onClick={() => createOnline(topic)}
                style={{
                  padding: '12px 8px', borderRadius: 14, border: 'none',
                  cursor: 'pointer', background: 'linear-gradient(135deg, #4895EF, #4895EFCC)',
                  textAlign: 'center', color: '#FFF',
                }}
                onPointerDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                onPointerUp={e => e.currentTarget.style.transform = ''}
                onPointerLeave={e => e.currentTarget.style.transform = ''}
              >
                <div style={{ fontSize: 20 }}>{topic.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{topic.label}</div>
              </button>
            ))}
          </div>

          <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>또는 코드로 참가</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.replace(/[^0-9]/g, ''))}
              maxLength={2}
              placeholder="방 코드 2자리"
              inputMode="numeric"
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 10, border: '2px solid #E0E0E0',
                fontSize: 16, textAlign: 'center', outline: 'none', fontFamily: 'monospace',
              }}
            />
            <button onClick={joinOnline}
              style={{
                padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: '#4895EF', color: '#FFF', fontSize: 14, fontWeight: 700,
                whiteSpace: 'nowrap', minWidth: 52,
              }}>
              참가
            </button>
          </div>
          {room.error && <div style={{ color: '#EF476F', fontSize: 13, marginTop: 8 }}>{room.error}</div>}
        </div>
      </div>
    )
  }

  // ====== RENDER: COUNTDOWN (LOCAL) ======
  if (phase === 'countdown') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{selectedTopic?.icon}</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{selectedTopic?.label}</h2>
        <div style={{
          fontSize: 96, fontWeight: 700, color: '#4895EF',
          lineHeight: 1, margin: '40px 0',
          animation: 'pulse 0.5s ease-in-out',
        }}>
          {countdownNum || 'GO!'}
        </div>
        <p style={{ fontSize: 14, color: '#888' }}>준비하세요!</p>
      </div>
    )
  }

  // ====== RENDER: RESULTS ======
  if (phase === 'results' && selectedTopic) {
    const finalScore = scoreRef.current
    const finalCorrect = correctRef.current
    const finalWrong = wrongRef.current
    const finalMaxCombo = maxComboRef.current
    const currentBest = topicRecords[selectedTopic.key] || 0
    const isNewRecord = playMode !== 'online' && finalScore > 0 && finalScore >= currentBest

    // Online results
    if (playMode === 'online') {
      const gs = room.gameState || {}
      const myScore = room.role === 'host' ? (gs.hostScore || scoreRef.current) : (gs.guestScore || scoreRef.current)
      const oppScore = room.role === 'host' ? (gs.guestScore || 0) : (gs.hostScore || 0)
      const winner = onlineWinner || gs.winner
      const iWon = winner === room.role
      const isDraw = winner === 'draw'
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
            <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>
              온라인 · {selectedTopic.icon} {selectedTopic.label}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>
                  나 ({room.role === 'host' ? '방장' : '참가자'})
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: iWon || isDraw ? '#4895EF' : '#888' }}>
                  {myScore}
                </div>
                <div style={{ fontSize: 11, color: '#888' }}>점</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: 20, fontWeight: 700, color: '#CCC' }}>VS</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>
                  상대 ({room.role === 'host' ? '참가자' : '방장'})
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: !iWon && !isDraw ? '#4895EF' : '#888' }}>
                  {oppScore}
                </div>
                <div style={{ fontSize: 11, color: '#888' }}>점</div>
              </div>
            </div>

            {iWon && (
              <div style={{ fontSize: 14, color: '#F39C12', fontWeight: 600, marginBottom: 16 }}>
                💎 +2 다이아 보너스!
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={handleBack}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#4895EF', color: '#FFF', fontSize: 14, fontWeight: 600 }}>
                나가기
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Local results
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{
          padding: '32px 20px', borderRadius: 20,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          border: '2px solid #F1C40F',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>결과</div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#4895EF' }}>{finalScore}</div>
              <div style={{ fontSize: 12, color: '#888' }}>점수</div>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#06D6A0' }}>{finalCorrect}</div>
              <div style={{ fontSize: 12, color: '#888' }}>정답</div>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#EF476F' }}>{finalWrong}</div>
              <div style={{ fontSize: 12, color: '#888' }}>오답</div>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#F39C12' }}>{finalMaxCombo}</div>
              <div style={{ fontSize: 12, color: '#888' }}>최대 콤보 🔥</div>
            </div>
          </div>

          <div style={{ fontSize: 14, color: '#06D6A0', fontWeight: 600, marginBottom: 8 }}>
            ⭐ +{finalScore}점 획득!
          </div>

          {isNewRecord && (
            <div style={{
              fontSize: 15, color: '#F39C12', fontWeight: 700, marginBottom: 16,
              padding: '8px 16px', background: 'rgba(243,156,18,0.1)', borderRadius: 10,
              display: 'inline-block',
            }}>
              💎 신기록! +1 다이아
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            <button onClick={() => startLocalGame(selectedTopic)}
              style={{
                padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: '#4895EF', color: '#FFF', fontSize: 14, fontWeight: 600,
              }}>
              다시 하기
            </button>
            <button onClick={handleTopicChange}
              style={{
                padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600,
              }}>
              주제 변경
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ====== RENDER: ACTIVE GAME ======
  if (phase !== 'playing' || !currentWord || !selectedTopic) return null

  const isOnline = playMode === 'online'
  const timerPct = (timeLeft / 30) * 100
  const timerColor = getTimerColor(timeLeft)
  const sec = Math.ceil(timeLeft)

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Timer bar at top */}
      <div style={{ height: 8, background: '#EEE', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          background: timerColor,
          width: `${timerPct}%`,
          transition: 'width 0.1s linear, background 0.3s',
        }} />
      </div>

      {/* Header stats */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', background: '#FAFAFA', borderBottom: '1px solid #EEE',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: timerColor }}>
          ⏱ {formatTime(sec)}
        </div>
        {combo >= 2 && (
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F39C12' }}>
            🔥 {combo}연속 {multiplier > 1 ? `(×${multiplier})` : ''}
          </div>
        )}
        <div style={{ fontSize: 15, fontWeight: 700, color: '#333' }}>
          점수: {score}
        </div>
      </div>

      {/* Online: opponent score */}
      {isOnline && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 24, padding: '8px 16px',
          background: '#F8F9FA', borderBottom: '1px solid #EEE', fontSize: 13,
        }}>
          <span style={{ fontWeight: 600, color: '#4895EF' }}>나: {score}점</span>
          <span style={{ color: '#CCC' }}>|</span>
          <span style={{ fontWeight: 600, color: '#888' }}>상대: {opponentScore}점</span>
        </div>
      )}

      {/* Back button */}
      <div style={{ padding: '8px 16px 0' }}>
        <button onClick={handleBack}
          style={{
            background: 'none', border: 'none', fontSize: 13, color: '#AAA',
            cursor: 'pointer', padding: '4px 0',
          }}>
          ← {isOnline ? '나가기' : '돌아가기'}
        </button>
      </div>

      {/* Korean word */}
      <div style={{ padding: '32px 16px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>
          {selectedTopic.icon} {selectedTopic.label}
        </div>
        <div style={{
          fontSize: 44, fontWeight: 700, color: '#333',
          padding: '20px 16px', borderRadius: 16,
          background: '#F8F9FA', border: '2px solid #EEE',
          marginBottom: 32,
        }}>
          {currentWord.kr}
        </div>

        {/* 4 answer buttons */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12,
          maxWidth: 360, margin: '0 auto',
        }}>
          {choices.map((choice, idx) => {
            let btnBg = '#FFF'
            let btnBorder = '2px solid #E0E0E0'
            let btnColor = '#333'

            if (feedback) {
              if (idx === feedback.correctIdx) {
                btnBg = '#D4EDDA'
                btnBorder = '2px solid #06D6A0'
                btnColor = '#06D6A0'
              }
              if (feedback.type === 'wrong' && idx === feedback.selectedIdx) {
                btnBg = '#FADBD8'
                btnBorder = '2px solid #EF476F'
                btnColor = '#EF476F'
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={!!feedback}
                style={{
                  padding: '16px 12px', borderRadius: 14, border: btnBorder,
                  cursor: feedback ? 'default' : 'pointer',
                  background: btnBg, color: btnColor,
                  fontSize: 16, fontWeight: 600,
                  minHeight: 60,
                  transition: 'all 0.15s',
                  opacity: feedback && idx !== feedback.correctIdx && idx !== feedback.selectedIdx ? 0.5 : 1,
                }}
                onPointerDown={e => { if (!feedback) e.currentTarget.style.transform = 'scale(0.96)' }}
                onPointerUp={e => e.currentTarget.style.transform = ''}
                onPointerLeave={e => e.currentTarget.style.transform = ''}
              >
                {choice.en}
              </button>
            )
          })}
        </div>

        {/* Combo indicator */}
        {combo >= 5 && (
          <div style={{
            marginTop: 16, fontSize: 13, fontWeight: 700,
            color: combo >= 10 ? '#EF476F' : '#F39C12',
          }}>
            🔥 {combo}연속 정답! ×{multiplier} 점수!
          </div>
        )}
      </div>
    </div>
  )
}
