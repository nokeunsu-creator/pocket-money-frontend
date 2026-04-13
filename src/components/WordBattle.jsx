import { useState, useEffect, useRef } from 'react'
import { WORD_TOPICS } from '../data/englishWords'
import { getData, addScore, addDiamonds, updateRecord } from '../utils/englishStorage'
import { useGameRoom } from '../utils/useGameRoom'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildCards(topicKey) {
  const topic = WORD_TOPICS.find((t) => t.key === topicKey)
  if (!topic) return []
  const picked = shuffle(topic.words).slice(0, 8)
  const cards = []
  picked.forEach((w, i) => {
    cards.push({ type: 'kr', text: w.kr, pairId: i })
    cards.push({ type: 'en', text: w.en, pairId: i })
  })
  return shuffle(cards)
}

function serializeCards(cards) {
  return cards.map((c) => `${c.type}:${c.text}:${c.pairId}`).join(',')
}

function deserializeCards(str) {
  if (!str) return []
  return str.split(',').map((s) => {
    const [type, text, pairId] = s.split(':')
    return { type, text, pairId: Number(pairId) }
  })
}

export default function WordBattle({ onBack }) {
  const [mode, setMode] = useState(null)
  const [topicKey, setTopicKey] = useState(null)
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [won, setWon] = useState(false)
  const [animMatch, setAnimMatch] = useState([])
  const timerRef = useRef(null)
  const lockRef = useRef(false)

  // Online state
  const [turn, setTurn] = useState('host')
  const [scores, setScores] = useState({ host: 0, guest: 0 })
  const [onlineWon, setOnlineWon] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [pendingTopic, setPendingTopic] = useState(null)
  const flipTimerRef = useRef(null)

  const room = useGameRoom('wordBattle')

  // --- Local timer ---
  useEffect(() => {
    if (mode !== 'local') return
    if (startTime && !won) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 200)
      return () => clearInterval(timerRef.current)
    }
  }, [startTime, won, mode])

  // --- Online: sync from Firebase ---
  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = room.gameState
    if (s.cards) setCards(deserializeCards(s.cards))
    setFlipped(s.flipped ? s.flipped.split(',').map(Number) : [])
    setMatched(s.matched ? s.matched.split(',').map(Number) : [])
    setTurn(s.turn || 'host')
    setScores(s.scores || { host: 0, guest: 0 })
    setOnlineWon(s.won || '')
    if (s.topic) setTopicKey(s.topic)
  }, [room.gameState, mode])

  // --- Online: handle 2 flipped cards (auto flip back on mismatch) ---
  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = room.gameState
    const currentFlipped = s.flipped ? s.flipped.split(',').map(Number) : []
    const currentCards = s.cards ? deserializeCards(s.cards) : []
    const currentMatched = s.matched ? s.matched.split(',').map(Number) : []

    if (currentFlipped.length === 2) {
      const [a, b] = currentFlipped
      const cardA = currentCards[a]
      const cardB = currentCards[b]
      const isMatch = cardA && cardB && cardA.pairId === cardB.pairId && cardA.type !== cardB.type

      if (flipTimerRef.current) clearTimeout(flipTimerRef.current)

      flipTimerRef.current = setTimeout(() => {
        if (room.role !== s.turn) return // only the current player handles updates

        const newScores = { ...(s.scores || { host: 0, guest: 0 }) }
        let newTurn = s.turn
        let newMatched = currentMatched
        let newWon = ''

        if (isMatch) {
          newMatched = [...currentMatched, a, b]
          newScores[s.turn] = (newScores[s.turn] || 0) + 1
          // same player goes again on match
          if (newMatched.length === currentCards.length) {
            if (newScores.host > newScores.guest) newWon = 'host'
            else if (newScores.guest > newScores.host) newWon = 'guest'
            else newWon = 'draw'
          }
        } else {
          newTurn = s.turn === 'host' ? 'guest' : 'host'
        }

        room.updateState({
          ...s,
          flipped: '',
          matched: newMatched.length > 0 ? newMatched.join(',') : '',
          turn: newTurn,
          scores: newScores,
          won: newWon,
        })
      }, 1000)
    }

    return () => {
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current)
    }
  }, [room.gameState, mode])

  // --- Start local game ---
  function startLocal(tKey) {
    setTopicKey(tKey)
    const c = buildCards(tKey)
    setCards(c)
    setFlipped([])
    setMatched([])
    setWon(false)
    setElapsed(0)
    setStartTime(Date.now())
    lockRef.current = false
  }

  // --- Local card flip ---
  function handleLocalFlip(idx) {
    if (lockRef.current) return
    if (flipped.includes(idx) || matched.includes(idx)) return

    const next = [...flipped, idx]
    setFlipped(next)

    if (next.length === 2) {
      lockRef.current = true
      const [a, b] = next
      const cardA = cards[a]
      const cardB = cards[b]
      const isMatch = cardA.pairId === cardB.pairId && cardA.type !== cardB.type

      setTimeout(() => {
        if (isMatch) {
          const newMatched = [...matched, a, b]
          setMatched(newMatched)
          setAnimMatch([a, b])
          setTimeout(() => setAnimMatch([]), 600)
          if (newMatched.length === cards.length) {
            clearInterval(timerRef.current)
            const finalElapsed = Math.floor((Date.now() - startTime) / 1000)
            setElapsed(finalElapsed)
            setWon(true)
            // rewards
            const score = Math.max(300 - finalElapsed * 5, 50)
            addScore(score)
            const stars = finalElapsed < 30 ? 3 : finalElapsed < 60 ? 2 : 1
            addDiamonds(stars)
          }
        }
        setFlipped([])
        lockRef.current = false
      }, 800)
    }
  }

  // --- Online card flip ---
  function handleOnlineFlip(idx) {
    if (!room.gameState || room.role !== room.gameState.turn) return
    const s = room.gameState
    const currentFlipped = s.flipped ? s.flipped.split(',').map(Number) : []
    const currentMatched = s.matched ? s.matched.split(',').map(Number) : []
    if (currentFlipped.length >= 2) return
    if (currentFlipped.includes(idx) || currentMatched.includes(idx)) return

    const newFlipped = [...currentFlipped, idx]
    room.updateState({
      ...s,
      flipped: newFlipped.join(','),
    })
  }

  // --- Create online room ---
  async function createOnline(tKey) {
    const c = buildCards(tKey)
    setTopicKey(tKey)
    setCards(c)
    setMode('online')
    await room.createRoom({
      cards: serializeCards(c),
      flipped: '',
      matched: '',
      turn: 'host',
      scores: { host: 0, guest: 0 },
      topic: tKey,
      won: '',
    })
  }

  // --- Join online room ---
  async function joinOnline() {
    if (joinCode.length !== 2) {
      room.setError('2자리 코드를 입력하세요')
      return
    }
    setMode('online')
    const ok = await room.joinRoom(joinCode)
    if (!ok) setMode(null)
  }

  // --- Stars ---
  function getStars(sec) {
    if (sec < 30) return 3
    if (sec < 60) return 2
    return 1
  }

  // --- Cleanup on back ---
  function handleBack() {
    if (room.roomCode) room.leaveRoom()
    clearInterval(timerRef.current)
    onBack()
  }

  function resetToMenu() {
    if (room.roomCode) room.leaveRoom()
    clearInterval(timerRef.current)
    setMode(null)
    setTopicKey(null)
    setCards([])
    setFlipped([])
    setMatched([])
    setWon(false)
    setElapsed(0)
    setStartTime(null)
    setOnlineWon('')
    setScores({ host: 0, guest: 0 })
    lockRef.current = false
  }

  // ===== RENDER =====

  // --- Mode selection ---
  if (!mode) {
    return (
      <div style={{ padding: 20, maxWidth: 420, margin: '0 auto' }}>
        <button onClick={handleBack} style={styles.backBtn}>← 뒤로</button>
        <h2 style={{ textAlign: 'center', marginBottom: 8 }}>🃏 단어 배틀</h2>
        <p style={{ textAlign: 'center', color: '#666', fontSize: 14, marginBottom: 24 }}>
          한국어-영어 카드 짝 맞추기
        </p>
        <button
          onClick={() => setMode('local')}
          style={{ ...styles.modeBtn, background: 'linear-gradient(135deg, #4895EF, #4361EE)' }}
        >
          🎯 혼자 하기 (타임어택)
        </button>
        <button
          onClick={() => setMode('create')}
          style={{ ...styles.modeBtn, background: 'linear-gradient(135deg, #F72585, #B5179E)' }}
        >
          🌐 온라인 방 만들기
        </button>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 2))}
            maxLength={2}
            inputMode="numeric"
            placeholder="방 코드 2자리"
            style={styles.codeInput}
          />
          <button
            onClick={joinOnline}
            style={{ ...styles.joinBtn, whiteSpace: 'nowrap', minWidth: 52 }}
          >
            참가
          </button>
        </div>
        {room.error && <p style={{ color: 'red', textAlign: 'center', marginTop: 8 }}>{room.error}</p>}
      </div>
    )
  }

  // --- Topic selection (local or create online) ---
  if ((mode === 'local' && !topicKey) || mode === 'create') {
    return (
      <div style={{ padding: 20, maxWidth: 420, margin: '0 auto' }}>
        <button onClick={resetToMenu} style={styles.backBtn}>← 뒤로</button>
        <h2 style={{ textAlign: 'center', marginBottom: 16 }}>📚 주제 선택</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {WORD_TOPICS.map((t) => (
            <button
              key={t.key}
              onClick={() => mode === 'create' ? createOnline(t.key) : startLocal(t.key)}
              style={styles.topicBtn}
            >
              <span style={{ fontSize: 28 }}>{t.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // --- Online waiting for guest ---
  if (mode === 'online' && room.role === 'host' && !room.connected) {
    return (
      <div style={{ padding: 20, maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
        <button onClick={resetToMenu} style={styles.backBtn}>← 뒤로</button>
        <h2>🃏 단어 배틀</h2>
        <p style={{ fontSize: 16, marginTop: 20 }}>방 코드</p>
        <p style={{ fontSize: 48, fontWeight: 800, color: '#4361EE', letterSpacing: 8 }}>
          {room.roomCode}
        </p>
        <p style={{ color: '#888', marginTop: 12 }}>상대를 기다리는 중...</p>
        <div style={styles.spinner} />
      </div>
    )
  }

  // --- Determine which flip handler to use ---
  const isOnline = mode === 'online'
  const handleFlip = isOnline ? handleOnlineFlip : handleLocalFlip
  const isMyTurn = isOnline ? room.role === turn : true
  const gameOver = isOnline ? !!onlineWon : won
  const topicObj = WORD_TOPICS.find((t) => t.key === topicKey)

  // --- Local: result screen ---
  if (mode === 'local' && won) {
    const stars = getStars(elapsed)
    const score = Math.max(300 - elapsed * 5, 50)
    return (
      <div style={{ padding: 20, maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
        <h2>🎉 완료!</h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 12 }}>
          {topicObj?.icon} {topicObj?.label}
        </p>
        <p style={{ fontSize: 36, marginBottom: 4 }}>
          {'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}
        </p>
        <p style={{ fontSize: 22, fontWeight: 700, margin: '8px 0' }}>⏱ {elapsed}초</p>
        <p style={{ fontSize: 18, color: '#4361EE', fontWeight: 600 }}>+{score}점 / +{stars}💎</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
          <button onClick={() => startLocal(topicKey)} style={styles.actionBtn}>
            🔄 다시 하기
          </button>
          <button onClick={resetToMenu} style={{ ...styles.actionBtn, background: '#888' }}>
            🏠 메뉴로
          </button>
        </div>
      </div>
    )
  }

  // --- Online: result screen ---
  if (isOnline && onlineWon) {
    const iWon = onlineWon === room.role
    const isDraw = onlineWon === 'draw'
    let resultText = isDraw ? '🤝 무승부!' : iWon ? '🎉 승리!' : '😢 패배'
    if (!isDraw) {
      if (iWon) {
        addScore(200)
        addDiamonds(3)
        updateRecord('wordBattle', 'wins', 1)
      } else {
        addScore(50)
        updateRecord('wordBattle', 'losses', 1)
      }
    } else {
      addScore(100)
      addDiamonds(1)
    }
    return (
      <div style={{ padding: 20, maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 32 }}>{resultText}</h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 12 }}>
          {topicObj?.icon} {topicObj?.label}
        </p>
        <div style={{ fontSize: 20, margin: '16px 0' }}>
          <span style={{ color: room.role === 'host' ? '#4361EE' : '#888' }}>
            나: {scores[room.role]}쌍
          </span>
          <span style={{ margin: '0 12px', color: '#ccc' }}>|</span>
          <span style={{ color: room.role !== 'host' ? '#4361EE' : '#888' }}>
            상대: {scores[room.role === 'host' ? 'guest' : 'host']}쌍
          </span>
        </div>
        <button onClick={resetToMenu} style={styles.actionBtn}>🏠 메뉴로</button>
      </div>
    )
  }

  // --- Game board ---
  return (
    <div style={{ padding: 16, maxWidth: 420, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={resetToMenu} style={styles.backBtn}>← 뒤로</button>
        <span style={{ fontSize: 14, color: '#888' }}>
          {topicObj?.icon} {topicObj?.label}
        </span>
      </div>

      {/* Status bar */}
      {mode === 'local' && (
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#4361EE' }}>⏱ {elapsed}초</span>
          <span style={{ marginLeft: 16, fontSize: 14, color: '#888' }}>
            {matched.length / 2} / 8 쌍
          </span>
        </div>
      )}

      {isOnline && (
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 15, marginBottom: 6 }}>
            <span style={{ color: room.role === 'host' ? '#4361EE' : '#333', fontWeight: room.role === 'host' ? 700 : 400 }}>
              나: {scores[room.role]}쌍
            </span>
            <span style={{ margin: '0 10px', color: '#ccc' }}>|</span>
            <span style={{ color: room.role !== 'host' ? '#4361EE' : '#333', fontWeight: room.role !== 'host' ? 700 : 400 }}>
              상대: {scores[room.role === 'host' ? 'guest' : 'host']}쌍
            </span>
          </div>
          <div style={{
            fontSize: 14,
            padding: '4px 12px',
            borderRadius: 12,
            display: 'inline-block',
            background: isMyTurn ? '#4361EE' : '#eee',
            color: isMyTurn ? '#fff' : '#888',
            fontWeight: 600,
          }}>
            {isMyTurn ? '내 차례!' : '상대 차례...'}
          </div>
        </div>
      )}

      {/* Card grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        maxWidth: 360,
        margin: '0 auto',
      }}>
        {cards.map((card, idx) => {
          const isFlipped = flipped.includes(idx)
          const isMatched = matched.includes(idx)
          const isAnimating = animMatch.includes(idx)
          const faceUp = isFlipped || isMatched

          return (
            <div
              key={idx}
              onClick={() => !gameOver && !isMatched && handleFlip(idx)}
              style={{
                minWidth: 60,
                minHeight: 72,
                borderRadius: 10,
                cursor: faceUp || isMatched || gameOver || !isMyTurn ? 'default' : 'pointer',
                perspective: 600,
                userSelect: 'none',
              }}
            >
              <div style={{
                width: '100%',
                height: '100%',
                minHeight: 72,
                borderRadius: 10,
                transition: 'transform 0.35s ease',
                transformStyle: 'preserve-3d',
                transform: faceUp ? 'rotateY(180deg)' : 'rotateY(0deg)',
                position: 'relative',
              }}>
                {/* Back face */}
                <div style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  minHeight: 72,
                  backfaceVisibility: 'hidden',
                  borderRadius: 10,
                  background: '#4895EF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  color: '#fff',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(72,149,239,0.3)',
                }}>
                  ?
                </div>
                {/* Front face */}
                <div style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  minHeight: 72,
                  backfaceVisibility: 'hidden',
                  borderRadius: 10,
                  transform: 'rotateY(180deg)',
                  background: isMatched
                    ? '#e8f5e9'
                    : card.type === 'kr' ? '#fff' : '#e8f0fe',
                  border: isAnimating
                    ? '3px solid #4CAF50'
                    : isMatched
                      ? '2px solid #81C784'
                      : '2px solid #ddd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                  textAlign: 'center',
                  fontSize: card.text && card.text.length > 5 ? 12 : 14,
                  fontWeight: 600,
                  color: isMatched ? '#66BB6A' : card.type === 'kr' ? '#333' : '#4361EE',
                  boxShadow: isAnimating
                    ? '0 0 12px rgba(76,175,80,0.5)'
                    : '0 2px 6px rgba(0,0,0,0.08)',
                  opacity: isMatched && !isAnimating ? 0.6 : 1,
                  transition: 'border 0.3s, box-shadow 0.3s, opacity 0.5s',
                  wordBreak: 'break-word',
                  lineHeight: 1.2,
                }}>
                  {card.text}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  backBtn: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    cursor: 'pointer',
    color: '#4361EE',
    padding: '4px 0',
    fontWeight: 600,
  },
  modeBtn: {
    display: 'block',
    width: '100%',
    padding: '14px 0',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    marginBottom: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  },
  codeInput: {
    flex: 1,
    padding: '10px 12px',
    fontSize: 16,
    borderRadius: 10,
    border: '2px solid #ddd',
    textAlign: 'center',
    letterSpacing: 6,
    outline: 'none',
  },
  joinBtn: {
    padding: '10px 16px',
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 10,
    border: 'none',
    background: '#4361EE',
    color: '#fff',
    cursor: 'pointer',
  },
  topicBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: '16px 8px',
    border: '2px solid #e0e0e0',
    borderRadius: 14,
    background: '#fff',
    cursor: 'pointer',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
  },
  actionBtn: {
    padding: '10px 20px',
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 10,
    border: 'none',
    background: '#4361EE',
    color: '#fff',
    cursor: 'pointer',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #eee',
    borderTop: '3px solid #4361EE',
    borderRadius: '50%',
    margin: '20px auto',
    animation: 'spin 1s linear infinite',
  },
}
