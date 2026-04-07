import { useState, useEffect, useRef } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

const EMOJI_SETS = {
  4: ['🐶', '🐱', '🐸', '🐵', '🦊', '🐰', '🐻', '🐼'],
  6: ['🐶', '🐱', '🐸', '🐵', '🦊', '🐰', '🐻', '🐼', '🦁', '🐯', '🐮', '🐷', '🐨', '🐹', '🐔', '🐧', '🐙', '🦄'],
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateBoard(size) {
  const pairCount = (size * size) / 2
  const emojis = shuffle(EMOJI_SETS[size]).slice(0, pairCount)
  return shuffle([...emojis, ...emojis])
}

export default function MemoryCard({ onBack }) {
  const [mode, setMode] = useState(null) // null | 'local' | 'online'
  const [size, setSize] = useState(null)
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [moves, setMoves] = useState(0)
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [won, setWon] = useState(false)
  const timerRef = useRef(null)

  // Online state
  const [turn, setTurn] = useState('host')
  const [scores, setScores] = useState({ host: 0, guest: 0 })
  const [onlineWon, setOnlineWon] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [pendingSize, setPendingSize] = useState(4)
  const flipTimerRef = useRef(null)

  const room = useGameRoom('memory')

  // Local timer
  useEffect(() => {
    if (mode !== 'local') return
    if (startTime && !won) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      return () => clearInterval(timerRef.current)
    }
  }, [startTime, won, mode])

  // Online: sync game state from Firebase
  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = room.gameState
    if (s.cards) setCards(s.cards.split(','))
    setFlipped(s.flipped ? s.flipped.split(',').map(Number) : [])
    setMatched(s.matched ? s.matched.split(',').map(Number) : [])
    setTurn(s.turn || 'host')
    setScores(s.scores || { host: 0, guest: 0 })
    setOnlineWon(s.won || '')
    setSize(s.size || 4)
  }, [room.gameState, mode])

  // Online: when 2 cards are flipped and they don't match, flip them back after delay
  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = room.gameState
    const currentFlipped = s.flipped ? s.flipped.split(',').map(Number) : []
    const currentCards = s.cards ? s.cards.split(',') : []
    const currentMatched = s.matched ? s.matched.split(',').map(Number) : []

    if (currentFlipped.length === 2) {
      const [a, b] = currentFlipped
      if (currentCards[a] !== currentCards[b]) {
        // No match - only the player whose turn it is should push the state update
        if (s.turn === room.role) {
          flipTimerRef.current = setTimeout(() => {
            const nextTurn = s.turn === 'host' ? 'guest' : 'host'
            room.updateState({
              ...s,
              flipped: '',
              turn: nextTurn,
            })
          }, 800)
        }
      }
    }
    return () => { if (flipTimerRef.current) clearTimeout(flipTimerRef.current) }
  }, [room.gameState, mode])

  // Local mode start
  const startGame = (s) => {
    setMode('local')
    setSize(s)
    setCards(generateBoard(s))
    setFlipped([])
    setMatched([])
    setMoves(0)
    setStartTime(Date.now())
    setElapsed(0)
    setWon(false)
  }

  // Local mode flip
  const handleFlipLocal = (idx) => {
    if (flipped.length === 2 || flipped.includes(idx) || matched.includes(idx)) return

    const newFlipped = [...flipped, idx]
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setMoves(m => m + 1)
      const [a, b] = newFlipped
      if (cards[a] === cards[b]) {
        const newMatched = [...matched, a, b]
        setMatched(newMatched)
        setFlipped([])
        if (newMatched.length === cards.length) {
          setWon(true)
          clearInterval(timerRef.current)
        }
      } else {
        setTimeout(() => setFlipped([]), 600)
      }
    }
  }

  // Online mode flip
  const handleFlipOnline = (idx) => {
    if (!room.connected || onlineWon) return
    if (turn !== room.role) return
    if (flipped.includes(idx) || matched.includes(idx)) return
    if (flipped.length >= 2) return

    const s = room.gameState
    const currentFlipped = s.flipped ? s.flipped.split(',').map(Number) : []
    const currentCards = s.cards ? s.cards.split(',') : []
    const currentMatched = s.matched ? s.matched.split(',').map(Number) : []

    if (currentFlipped.length >= 2) return
    if (currentFlipped.includes(idx) || currentMatched.includes(idx)) return

    const newFlipped = [...currentFlipped, idx]

    if (newFlipped.length === 2) {
      const [a, b] = newFlipped
      if (currentCards[a] === currentCards[b]) {
        // Match found
        const newMatched = [...currentMatched, a, b]
        const newScores = { ...s.scores, [room.role]: (s.scores[room.role] || 0) + 1 }
        const totalPairs = currentCards.length / 2
        let newWon = ''
        if (newMatched.length / 2 === totalPairs) {
          if (newScores.host > newScores.guest) newWon = 'host'
          else if (newScores.guest > newScores.host) newWon = 'guest'
          else newWon = 'draw'
        }
        room.updateState({
          ...s,
          flipped: '',
          matched: newMatched.join(','),
          scores: newScores,
          turn: s.turn, // same player gets another turn
          won: newWon,
        })
      } else {
        // No match - show both cards, flip back handled by the effect above
        room.updateState({
          ...s,
          flipped: newFlipped.join(','),
        })
      }
    } else {
      // First card flipped
      room.updateState({
        ...s,
        flipped: newFlipped.join(','),
      })
    }
  }

  const handleFlip = (idx) => {
    if (mode === 'local') handleFlipLocal(idx)
    else handleFlipOnline(idx)
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const handleBack = () => {
    if (mode === 'online') room.leaveRoom()
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current)
    if (mode) {
      setMode(null)
      setSize(null)
      setOnlineWon('')
      setScores({ host: 0, guest: 0 })
      return
    }
    onBack()
  }

  const createOnline = async () => {
    const boardCards = generateBoard(pendingSize)
    await room.createRoom({
      cards: boardCards.join(','),
      flipped: '',
      matched: '',
      turn: 'host',
      scores: { host: 0, guest: 0 },
      size: pendingSize,
      won: '',
    })
    setMode('online')
  }

  const joinOnline = async () => {
    if (joinCode.length !== 4) { room.setError('4자리 코드를 입력하세요'); return }
    const ok = await room.joinRoom(joinCode.toUpperCase())
    if (ok) setMode('online')
  }

  const resetOnline = () => {
    if (!room.connected) return
    const s = room.gameState
    const currentSize = s.size || 4
    const boardCards = generateBoard(currentSize)
    room.updateState({
      cards: boardCards.join(','),
      flipped: '',
      matched: '',
      turn: 'host',
      scores: { host: 0, guest: 0 },
      size: currentSize,
      won: '',
    })
  }

  // Mode selection screen
  if (!mode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🃏</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>카드 뒤집기</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 32, lineHeight: 1.6 }}>
          같은 그림의 카드 2장을 찾아 뒤집으세요!
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 4 }}>같은 기기에서 (1인)</div>
          <button onClick={() => startGame(4)}
            style={{
              padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
              fontSize: 16, fontWeight: 700, color: '#FFF',
              background: 'linear-gradient(135deg, #06D6A0, #05B384)',
            }}>
            4×4 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>쉬움 (8쌍)</span>
          </button>
          <button onClick={() => startGame(6)}
            style={{
              padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
              fontSize: 16, fontWeight: 700, color: '#FFF',
              background: 'linear-gradient(135deg, #EF476F, #D63B5C)',
            }}>
            6×6 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>어려움 (18쌍)</span>
          </button>

          <div style={{ borderTop: '1px solid #E0E0E0', margin: '12px 0' }} />

          <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 4 }}>온라인 (2인 대전)</div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 4 }}>
            <button onClick={() => setPendingSize(4)}
              style={{
                padding: '8px 18px', borderRadius: 10, border: `2px solid ${pendingSize === 4 ? '#4895EF' : '#DDD'}`,
                cursor: 'pointer', fontSize: 14, fontWeight: 600,
                background: pendingSize === 4 ? '#EBF3FF' : '#FFF', color: pendingSize === 4 ? '#4895EF' : '#888',
              }}>
              4×4
            </button>
            <button onClick={() => setPendingSize(6)}
              style={{
                padding: '8px 18px', borderRadius: 10, border: `2px solid ${pendingSize === 6 ? '#4895EF' : '#DDD'}`,
                cursor: 'pointer', fontSize: 14, fontWeight: 600,
                background: pendingSize === 6 ? '#EBF3FF' : '#FFF', color: pendingSize === 6 ? '#4895EF' : '#888',
              }}>
              6×6
            </button>
          </div>

          <button onClick={createOnline}
            style={{
              padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
              fontSize: 16, fontWeight: 700, color: '#FFF',
              background: 'linear-gradient(135deg, #4895EF, #3A7BD5)',
            }}>
            🌐 온라인 방 만들기
          </button>

          <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>또는 코드로 참가</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.replace(/[^0-9]/g, ''))}
              maxLength={4}
              placeholder="방 코드 4자리"
              inputMode="numeric"
              style={{
                flex: 1, padding: '12px', borderRadius: 10, border: '2px solid #DDD',
                fontSize: 16, fontWeight: 700, textAlign: 'center', letterSpacing: 4,
                fontFamily: 'monospace',
              }}
            />
            <button onClick={joinOnline}
              style={{ padding: '0 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#4895EF', color: '#FFF', fontSize: 14, fontWeight: 700 }}>
              참가
            </button>
          </div>
          {room.error && <div style={{ color: '#E74C3C', fontSize: 13 }}>{room.error}</div>}
        </div>
      </div>
    )
  }

  // Online waiting screen
  if (mode === 'online' && !room.connected) {
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
          fontSize: 36, fontWeight: 700, letterSpacing: 8,
          padding: '16px 24px', background: '#F7F6F3', borderRadius: 14,
          display: 'inline-block', fontFamily: 'monospace',
        }}>
          {room.roomCode}
        </div>
        <p style={{ fontSize: 12, color: '#AAA', marginTop: 16 }}>
          나는 🟦 방장 (선공)
        </p>
      </div>
    )
  }

  const isOnline = mode === 'online'
  const isMyTurn = !isOnline || turn === room.role
  const accentColor = size === 4 ? '#06D6A0' : '#EF476F'
  const headerBg = size === 4
    ? 'linear-gradient(135deg, #06D6A0, #05B384)'
    : 'linear-gradient(135deg, #EF476F, #D63B5C)'

  const gameOver = isOnline ? !!onlineWon : won

  const renderWinBanner = () => {
    if (isOnline && onlineWon) {
      const myScore = scores[room.role] || 0
      const opScore = scores[room.role === 'host' ? 'guest' : 'host'] || 0
      let label
      if (onlineWon === 'draw') label = '무승부!'
      else if (onlineWon === room.role) label = '승리!'
      else label = '패배...'
      return (
        <div style={{
          textAlign: 'center', padding: '24px 16px', marginTop: 16,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          borderRadius: 14, border: '2px solid #F1C40F',
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>
            {onlineWon === 'draw' ? '🤝' : onlineWon === room.role ? '🎉' : '😢'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
            나 {myScore}점 vs 상대 {opScore}점
          </div>
          <button onClick={resetOnline}
            style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: accentColor, color: '#FFF', fontSize: 14, fontWeight: 600 }}>
            다시 하기
          </button>
        </div>
      )
    }

    if (!isOnline && won) {
      return (
        <div style={{
          textAlign: 'center', padding: '24px 16px', marginTop: 16,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          borderRadius: 14, border: '2px solid #F1C40F',
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>완료!</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
            {moves}번 시도 · {formatTime(elapsed)}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => startGame(size)}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: accentColor, color: '#FFF', fontSize: 14, fontWeight: 600 }}>
              다시 하기
            </button>
            <button onClick={() => { setMode(null); setSize(null) }}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
              난이도 변경
            </button>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{
        background: isOnline ? 'linear-gradient(135deg, #4895EF, #3A7BD5)' : headerBg,
        color: '#FFF', padding: '1.5rem 1.25rem 1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <button onClick={handleBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← {isOnline ? '나가기' : '돌아가기'}
          </button>
          {isOnline ? (
            <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
              <span>🟦 {scores.host}</span>
              <span>🟥 {scores.guest}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
              <span>⏱ {formatTime(elapsed)}</span>
              <span>🔄 {moves}회</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            카드 뒤집기 — {size}×{size} {isOnline ? '(온라인)' : ''}
          </div>
          {isOnline && (
            <button onClick={resetOnline}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 12, borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}>
              새 게임
            </button>
          )}
        </div>
      </div>

      {/* Turn / status indicator for online */}
      {isOnline && (
        <>
          <div style={{
            textAlign: 'center', padding: '10px 0',
            fontSize: 14, fontWeight: 600,
            color: onlineWon ? '#F1C40F' : '#333',
            background: onlineWon ? '#FFF9E6' : '#F7F6F3',
          }}>
            {onlineWon
              ? (onlineWon === 'draw'
                ? '🤝 무승부!'
                : onlineWon === room.role ? '🎉 승리!' : '😢 패배...')
              : isMyTurn
                ? '내 차례 — 카드 2장을 뒤집으세요'
                : '상대 차례 — 기다려주세요...'
            }
          </div>
          <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0' }}>
            방 코드: <strong>{room.roomCode}</strong> · 나는 {room.role === 'host' ? '🟦 방장' : '🟥 참가자'}
          </div>
        </>
      )}

      <div style={{ padding: '16px 12px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gap: size === 4 ? 8 : 5,
        }}>
          {cards.map((emoji, idx) => {
            const isFlipped = flipped.includes(idx)
            const isMatched = matched.includes(idx)
            const show = isFlipped || isMatched
            const canClick = !gameOver && !show && (mode === 'local' || (isMyTurn && flipped.length < 2))
            return (
              <button key={idx}
                onClick={() => handleFlip(idx)}
                style={{
                  aspectRatio: '1', borderRadius: size === 4 ? 12 : 8, border: 'none',
                  cursor: canClick ? 'pointer' : 'default',
                  fontSize: size === 4 ? 32 : 22,
                  background: isMatched ? '#E8F8F0' : show ? '#FFF' : (isOnline ? '#4895EF' : accentColor),
                  boxShadow: show ? '0 2px 8px rgba(0,0,0,0.08)' : '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s',
                  transform: show ? 'rotateY(0deg)' : 'rotateY(180deg)',
                  opacity: isMatched ? 0.7 : 1,
                }}
              >
                {show ? emoji : ''}
              </button>
            )
          })}
        </div>

        {renderWinBanner()}
      </div>
    </div>
  )
}
