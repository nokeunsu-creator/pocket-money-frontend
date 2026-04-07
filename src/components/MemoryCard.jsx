import { useState, useEffect, useRef } from 'react'

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
  const [size, setSize] = useState(null)
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [moves, setMoves] = useState(0)
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [won, setWon] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (startTime && !won) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      return () => clearInterval(timerRef.current)
    }
  }, [startTime, won])

  const startGame = (s) => {
    setSize(s)
    setCards(generateBoard(s))
    setFlipped([])
    setMatched([])
    setMoves(0)
    setStartTime(Date.now())
    setElapsed(0)
    setWon(false)
  }

  const handleFlip = (idx) => {
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

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  if (!size) {
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
        </div>
      </div>
    )
  }

  const accentColor = size === 4 ? '#06D6A0' : '#EF476F'

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{
        background: size === 4 ? 'linear-gradient(135deg, #06D6A0, #05B384)' : 'linear-gradient(135deg, #EF476F, #D63B5C)',
        color: '#FFF', padding: '1.5rem 1.25rem 1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <button onClick={() => setSize(null)}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 난이도
          </button>
          <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
            <span>⏱ {formatTime(elapsed)}</span>
            <span>🔄 {moves}회</span>
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>카드 뒤집기 — {size}×{size}</div>
      </div>

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
            return (
              <button key={idx}
                onClick={() => handleFlip(idx)}
                style={{
                  aspectRatio: '1', borderRadius: size === 4 ? 12 : 8, border: 'none', cursor: show ? 'default' : 'pointer',
                  fontSize: size === 4 ? 32 : 22,
                  background: isMatched ? '#E8F8F0' : show ? '#FFF' : accentColor,
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

        {won && (
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
              <button onClick={() => setSize(null)}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
                난이도 변경
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
