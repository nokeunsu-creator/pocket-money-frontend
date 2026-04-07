import { useState, useEffect } from 'react'

const SUITS = ['♠', '♥', '♦', '♣']
const SUIT_COLORS = { '♠': '#333', '♥': '#E74C3C', '♦': '#E74C3C', '♣': '#333' }
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

function createDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank })
    }
  }
  return shuffle(deck)
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function canPlay(card, top, activeSuit, pendingDraw) {
  // 공격 카드(2) 쌓여있을 때: 2로만 방어 가능
  if (pendingDraw > 0) return card.rank === '2'
  // 7은 무늬 변경 카드 — 언제든 낼 수 있음
  if (card.rank === '7') return true
  // 같은 숫자 또는 같은 무늬
  const suit = activeSuit || top.suit
  return card.rank === top.rank || card.suit === suit
}

function cardKey(card, idx) {
  return `${card.suit}${card.rank}-${idx}`
}

function Card({ card, small, onClick, disabled, faceDown, highlight }) {
  if (faceDown) {
    return (
      <div style={{
        width: small ? 36 : 52, height: small ? 52 : 74, borderRadius: 8,
        background: 'linear-gradient(135deg, #4A3F8A, #6B5FBF)',
        border: '2px solid #3A2F7A',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: small ? 14 : 18, color: 'rgba(255,255,255,0.3)',
        flexShrink: 0,
      }}>🂠</div>
    )
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: small ? 36 : 52, height: small ? 52 : 74, borderRadius: 8,
        background: highlight ? '#FFFDE7' : '#FFF',
        border: highlight ? '2px solid #F1C40F' : '2px solid #DDD',
        display: 'inline-flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontSize: small ? 11 : 14, fontWeight: 700,
        color: SUIT_COLORS[card.suit],
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
        transition: 'transform 0.1s',
        padding: 0,
      }}
      onPointerDown={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-4px)' }}
      onPointerUp={e => e.currentTarget.style.transform = ''}
      onPointerLeave={e => e.currentTarget.style.transform = ''}
    >
      <span style={{ fontSize: small ? 13 : 16 }}>{card.suit}</span>
      <span>{card.rank}</span>
    </button>
  )
}

export default function OneCard({ onBack }) {
  const [deck, setDeck] = useState([])
  const [myHand, setMyHand] = useState([])
  const [cpuHand, setCpuHand] = useState([])
  const [discard, setDiscard] = useState([])
  const [turn, setTurn] = useState('player') // 'player' | 'cpu'
  const [pendingDraw, setPendingDraw] = useState(0)
  const [activeSuit, setActiveSuit] = useState(null) // 7로 변경된 무늬
  const [showSuitPicker, setShowSuitPicker] = useState(false)
  const [message, setMessage] = useState('')
  const [gameOver, setGameOver] = useState(null) // 'win' | 'lose'
  const [started, setStarted] = useState(false)

  const startGame = () => {
    const d = createDeck()
    const p = d.slice(0, 7)
    const c = d.slice(7, 14)
    const first = d[14]
    const remaining = d.slice(15)
    setMyHand(p)
    setCpuHand(c)
    setDiscard([first])
    setDeck(remaining)
    setTurn('player')
    setPendingDraw(0)
    setActiveSuit(null)
    setShowSuitPicker(false)
    setMessage('')
    setGameOver(null)
    setStarted(true)
  }

  const top = discard[discard.length - 1]

  // 덱 보충 (카드 부족 시)
  const ensureDeck = (currentDeck, currentDiscard) => {
    if (currentDeck.length > 0) return [currentDeck, currentDiscard]
    if (currentDiscard.length <= 1) return [currentDeck, currentDiscard]
    const topCard = currentDiscard[currentDiscard.length - 1]
    const reshuffled = shuffle(currentDiscard.slice(0, -1))
    return [reshuffled, [topCard]]
  }

  const drawCards = (count, fromDeck, fromDiscard) => {
    let d = [...fromDeck]
    let disc = [...fromDiscard]
    const drawn = []
    for (let i = 0; i < count; i++) {
      ;[d, disc] = ensureDeck(d, disc)
      if (d.length === 0) break
      drawn.push(d.pop())
    }
    return { drawn, deck: d, discard: disc }
  }

  // 플레이어 카드 내기
  const playCard = (idx) => {
    if (turn !== 'player' || gameOver) return
    const card = myHand[idx]
    if (!canPlay(card, top, activeSuit, pendingDraw)) return

    const newHand = myHand.filter((_, i) => i !== idx)
    const newDiscard = [...discard, card]
    setMyHand(newHand)
    setDiscard(newDiscard)
    setActiveSuit(null)

    if (newHand.length === 0) {
      setGameOver('win')
      setMessage('🎉 승리!')
      return
    }
    if (newHand.length === 1) setMessage('원카드!')

    // 특수 카드 처리
    if (card.rank === '2') {
      setPendingDraw(p => p + 2)
      setTurn('cpu')
    } else if (card.rank === 'J') {
      // 스킵 → 내 턴 다시
      setMessage('J — 상대 건너뛰기!')
      setTimeout(() => setMessage(m => m === 'J — 상대 건너뛰기!' ? '' : m), 1200)
      setTurn('player')
    } else if (card.rank === '7') {
      setShowSuitPicker(true)
    } else {
      setTurn('cpu')
    }
  }

  // 7 무늬 선택
  const pickSuit = (suit) => {
    setActiveSuit(suit)
    setShowSuitPicker(false)
    setTurn('cpu')
  }

  // 플레이어 드로우
  const playerDraw = () => {
    if (turn !== 'player' || gameOver) return
    const count = pendingDraw > 0 ? pendingDraw : 1
    const result = drawCards(count, deck, discard)
    setMyHand([...myHand, ...result.drawn])
    setDeck(result.deck)
    setDiscard(result.discard)
    setPendingDraw(0)
    if (pendingDraw > 0) setMessage(`+${count}장 드로우!`)
    else setMessage('1장 드로우')
    setTimeout(() => setMessage(m => m.includes('드로우') ? '' : m), 1000)
    setTurn('cpu')
  }

  // CPU 턴
  useEffect(() => {
    if (turn !== 'cpu' || gameOver || !started) return
    const timer = setTimeout(() => {
      const currentTop = discard[discard.length - 1]
      const playable = cpuHand.map((c, i) => ({ card: c, idx: i }))
        .filter(({ card }) => canPlay(card, currentTop, activeSuit, pendingDraw))

      if (playable.length > 0) {
        // 우선순위: 공격중이면 2, 그 외 특수카드 후순위
        let choice
        if (pendingDraw > 0) {
          choice = playable.find(p => p.card.rank === '2') || null
        }
        if (!choice) {
          // 일반카드 우선, 특수카드는 아껴둠
          const normal = playable.filter(p => !['2', '7', 'J'].includes(p.card.rank))
          choice = normal.length > 0 ? normal[Math.floor(Math.random() * normal.length)] : playable[Math.floor(Math.random() * playable.length)]
        }

        const card = choice.card
        const newHand = cpuHand.filter((_, i) => i !== choice.idx)
        const newDiscard = [...discard, card]
        setCpuHand(newHand)
        setDiscard(newDiscard)

        if (newHand.length === 0) {
          setGameOver('lose')
          setMessage('컴퓨터 승리...')
          return
        }
        if (newHand.length === 1) setMessage('컴퓨터: 원카드!')

        if (card.rank === '2') {
          setPendingDraw(p => p + 2)
          setActiveSuit(null)
          setTurn('player')
        } else if (card.rank === 'J') {
          setMessage('컴퓨터 J — 건너뛰기!')
          setActiveSuit(null)
          setTimeout(() => {
            setMessage(m => m.includes('건너뛰기') ? '' : m)
            setTurn('cpu')
          }, 800)
          return
        } else if (card.rank === '7') {
          // CPU가 가장 많은 무늬 선택
          const suitCount = {}
          newHand.forEach(c => { suitCount[c.suit] = (suitCount[c.suit] || 0) + 1 })
          const bestSuit = Object.entries(suitCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '♠'
          setActiveSuit(bestSuit)
          setMessage(`컴퓨터: 무늬 → ${bestSuit}`)
          setTimeout(() => setMessage(m => m.includes('무늬') ? '' : m), 1200)
          setTurn('player')
        } else {
          setActiveSuit(null)
          setTurn('player')
        }
      } else {
        // 못 내면 드로우
        const count = pendingDraw > 0 ? pendingDraw : 1
        const result = drawCards(count, deck, discard)
        setCpuHand([...cpuHand, ...result.drawn])
        setDeck(result.deck)
        setDiscard(result.discard)
        setPendingDraw(0)
        if (count > 1) setMessage(`컴퓨터 +${count}장!`)
        setActiveSuit(null)
        setTurn('player')
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [turn, gameOver, started])

  const playableIndices = myHand.map((c, i) => canPlay(c, top, activeSuit, pendingDraw) ? i : -1).filter(i => i >= 0)

  if (!started) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🃏</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>원카드</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 12, lineHeight: 1.8 }}>
          같은 숫자 또는 같은 무늬 카드를 내세요<br />
          먼저 카드를 다 내면 승리!
        </p>
        <div style={{ fontSize: 12, color: '#AAA', marginBottom: 24, lineHeight: 1.8, textAlign: 'left', maxWidth: 260, margin: '0 auto 24px' }}>
          <strong>특수 카드</strong><br />
          2 → 다음 사람 +2장<br />
          7 → 무늬 변경<br />
          J → 상대 건너뛰기
        </div>
        <button onClick={startGame}
          style={{
            padding: '14px 40px', borderRadius: 14, border: 'none', cursor: 'pointer',
            fontSize: 16, fontWeight: 700, color: '#FFF',
            background: 'linear-gradient(135deg, #4A3F8A, #6B5FBF)',
          }}>
          게임 시작
        </button>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '1rem' }}>
      {/* 헤더 */}
      <div style={{
        background: 'linear-gradient(135deg, #4A3F8A, #6B5FBF)',
        color: '#FFF', padding: '1rem 1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 돌아가기
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>원카드</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>덱 {deck.length}장</span>
        </div>
      </div>

      <div style={{ padding: '0 12px' }}>
        {/* 컴퓨터 패 */}
        <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
            컴퓨터 ({cpuHand.length}장)
            {turn === 'cpu' && !gameOver && <span style={{ marginLeft: 6 }}>🤔 생각중...</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
            {cpuHand.map((_, i) => <Card key={i} card={{}} faceDown small />)}
          </div>
        </div>

        {/* 가운데: 버린카드 + 덱 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 20, padding: '16px 0',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#AAA', marginBottom: 4 }}>덱</div>
            <div
              onClick={turn === 'player' && !gameOver && !showSuitPicker ? playerDraw : undefined}
              style={{ cursor: turn === 'player' && !gameOver ? 'pointer' : 'default' }}
            >
              <Card card={{}} faceDown />
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#AAA', marginBottom: 4 }}>
              {activeSuit ? `무늬: ${activeSuit}` : '버린 카드'}
              {pendingDraw > 0 && <span style={{ color: '#E74C3C', fontWeight: 700 }}> +{pendingDraw}</span>}
            </div>
            {top && <Card card={top} disabled />}
          </div>
        </div>

        {/* 메시지 */}
        {message && (
          <div style={{
            textAlign: 'center', padding: '8px 12px', marginBottom: 8,
            background: '#FFF9E6', borderRadius: 10, fontSize: 14, fontWeight: 600,
            color: '#333',
          }}>
            {message}
          </div>
        )}

        {/* 무늬 선택 */}
        {showSuitPicker && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 0',
            background: '#F7F6F3', borderRadius: 12, marginBottom: 8,
          }}>
            <span style={{ fontSize: 13, alignSelf: 'center', marginRight: 4 }}>무늬 선택:</span>
            {SUITS.map(s => (
              <button key={s} onClick={() => pickSuit(s)}
                style={{
                  width: 44, height: 44, borderRadius: 10, border: '2px solid #DDD',
                  background: '#FFF', fontSize: 22, cursor: 'pointer',
                  color: SUIT_COLORS[s],
                }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* 내 패 */}
        <div style={{
          padding: '12px 0', borderTop: '1px solid #EEE',
        }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 6, textAlign: 'center' }}>
            내 카드 ({myHand.length}장)
            {turn === 'player' && !gameOver && !showSuitPicker && (
              <span style={{ color: '#4A3F8A', fontWeight: 600 }}> — 카드를 내거나 덱을 터치</span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
            {myHand.map((card, i) => (
              <Card
                key={cardKey(card, i)}
                card={card}
                small={myHand.length > 10}
                highlight={turn === 'player' && playableIndices.includes(i)}
                disabled={turn !== 'player' || !playableIndices.includes(i) || showSuitPicker}
                onClick={() => playCard(i)}
              />
            ))}
          </div>
          {turn === 'player' && playableIndices.length === 0 && !gameOver && !showSuitPicker && (
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#E74C3C' }}>
              낼 수 있는 카드가 없어요. 덱을 터치해서 드로우하세요!
            </div>
          )}
        </div>

        {/* 게임 오버 */}
        {gameOver && (
          <div style={{
            textAlign: 'center', padding: '20px', marginTop: 8,
            background: gameOver === 'win' ? 'linear-gradient(135deg, #FFF9E6, #FFF3CD)' : '#F8F8F8',
            borderRadius: 14,
            border: gameOver === 'win' ? '2px solid #F1C40F' : '2px solid #DDD',
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>{gameOver === 'win' ? '🎉' : '😢'}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              {gameOver === 'win' ? '승리!' : '패배...'}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={startGame}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#4A3F8A', color: '#FFF', fontSize: 14, fontWeight: 600 }}>
                다시 하기
              </button>
              <button onClick={onBack}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
                게임 목록
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
