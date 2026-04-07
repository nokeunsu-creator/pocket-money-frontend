import { useState, useEffect } from 'react'

const SUITS = ['♠', '♥', '♦', '♣']
const SUIT_COLORS = { '♠': '#333', '♥': '#E74C3C', '♦': '#E74C3C', '♣': '#333' }
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const RANK_VAL = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13 }

function createDeck() {
  const deck = []
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank })
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

function cardId(c) { return c.suit + c.rank }

// 카드 정렬: 무늬별 → 숫자순
function sortHand(hand) {
  return [...hand].sort((a, b) => {
    const si = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit)
    if (si !== 0) return si
    return RANK_VAL[a.rank] - RANK_VAL[b.rank]
  })
}

// 유효한 조합인지 확인 (트리플 or 런)
function isValidMeld(cards) {
  if (cards.length < 3) return false
  // 트리플: 같은 숫자 3장 이상
  if (cards.every(c => c.rank === cards[0].rank)) return true
  // 런: 같은 무늬, 연속 숫자 3장 이상
  if (!cards.every(c => c.suit === cards[0].suit)) return false
  const vals = cards.map(c => RANK_VAL[c.rank]).sort((a, b) => a - b)
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] !== vals[i - 1] + 1) return false
  }
  return true
}

// 패가 모두 유효한 조합으로 이루어져 있는지 (훌라 판정)
// 모든 카드가 3장 이상의 유효 조합에 속해야 함
function canDeclareHula(hand) {
  if (hand.length < 3) return false
  return tryMeld(hand, [])
}

function tryMeld(remaining, melds) {
  if (remaining.length === 0) return true
  if (remaining.length < 3) return false

  // 가능한 조합 찾기
  for (let i = 0; i < remaining.length; i++) {
    for (let j = i + 1; j < remaining.length; j++) {
      for (let k = j + 1; k < remaining.length; k++) {
        const meld = [remaining[i], remaining[j], remaining[k]]
        if (isValidMeld(meld)) {
          const rest = remaining.filter((_, idx) => idx !== i && idx !== j && idx !== k)
          // 3장 조합으로 시도
          if (tryMeld(rest, [...melds, meld])) return true
          // 4장 이상 확장 시도
          for (let l = 0; l < rest.length; l++) {
            const meld4 = [...meld, rest[l]]
            if (isValidMeld(meld4)) {
              const rest2 = rest.filter((_, idx) => idx !== l)
              if (tryMeld(rest2, [...melds, meld4])) return true
            }
          }
        }
      }
    }
  }
  return false
}

// AI: 가장 좋은 버릴 카드 선택
function aiChooseDiscard(hand) {
  // 조합에 포함되지 않는 카드 중 하나를 버림
  const scores = hand.map((card, idx) => {
    let score = 0
    // 같은 숫자 카드 수
    score += hand.filter(c => c.rank === card.rank).length * 2
    // 같은 무늬 연속 카드
    const samesuit = hand.filter(c => c.suit === card.suit).map(c => RANK_VAL[c.rank]).sort((a, b) => a - b)
    const v = RANK_VAL[card.rank]
    if (samesuit.includes(v - 1) || samesuit.includes(v + 1)) score += 3
    if (samesuit.includes(v - 1) && samesuit.includes(v + 1)) score += 3
    return { idx, score }
  })
  scores.sort((a, b) => a.score - b.score)
  return scores[0].idx
}

function MiniCard({ card, selected, onClick, disabled, faceDown, small }) {
  if (faceDown) {
    return (
      <div style={{
        width: small ? 32 : 44, height: small ? 46 : 62, borderRadius: 6,
        background: 'linear-gradient(135deg, #2D6A4F, #40916C)',
        border: '1.5px solid #1B4332',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: small ? 12 : 14, color: 'rgba(255,255,255,0.3)', flexShrink: 0,
      }}>🂠</div>
    )
  }
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        width: small ? 32 : 44, height: small ? 46 : 62, borderRadius: 6,
        background: selected ? '#E8F5E9' : '#FFF',
        border: selected ? '2px solid #2D6A4F' : '1.5px solid #DDD',
        display: 'inline-flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontSize: small ? 9 : 11, fontWeight: 700,
        color: SUIT_COLORS[card.suit],
        cursor: disabled ? 'default' : 'pointer',
        flexShrink: 0, padding: 0,
        transition: 'transform 0.1s',
      }}
      onPointerDown={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-3px)' }}
      onPointerUp={e => e.currentTarget.style.transform = ''}
      onPointerLeave={e => e.currentTarget.style.transform = ''}
    >
      <span style={{ fontSize: small ? 11 : 14 }}>{card.suit}</span>
      <span>{card.rank}</span>
    </button>
  )
}

export default function Hula({ onBack }) {
  const [started, setStarted] = useState(false)
  const [deck, setDeck] = useState([])
  const [myHand, setMyHand] = useState([])
  const [cpuHand, setCpuHand] = useState([])
  const [discardPile, setDiscardPile] = useState([])
  const [turn, setTurn] = useState('player') // 'player' | 'cpu'
  const [phase, setPhase] = useState('draw') // 'draw' | 'discard'
  const [selected, setSelected] = useState(new Set())
  const [message, setMessage] = useState('')
  const [gameOver, setGameOver] = useState(null) // 'win' | 'lose'

  const startGame = () => {
    const d = createDeck()
    setMyHand(sortHand(d.slice(0, 7)))
    setCpuHand(d.slice(7, 14))
    setDiscardPile([d[14]])
    setDeck(d.slice(15))
    setTurn('player')
    setPhase('draw')
    setSelected(new Set())
    setMessage('')
    setGameOver(null)
    setStarted(true)
  }

  const topDiscard = discardPile[discardPile.length - 1]

  // 덱에서 드로우
  const drawFromDeck = () => {
    if (phase !== 'draw' || turn !== 'player' || deck.length === 0) return
    const card = deck[deck.length - 1]
    setMyHand(sortHand([...myHand, card]))
    setDeck(deck.slice(0, -1))
    setPhase('discard')
    setMessage('카드를 1장 버리세요')
  }

  // 버린 카드 더미에서 가져오기
  const drawFromDiscard = () => {
    if (phase !== 'draw' || turn !== 'player' || discardPile.length === 0) return
    const card = discardPile[discardPile.length - 1]
    setMyHand(sortHand([...myHand, card]))
    setDiscardPile(discardPile.slice(0, -1))
    setPhase('discard')
    setMessage('카드를 1장 버리세요')
  }

  // 카드 선택 (버리기용)
  const toggleSelect = (idx) => {
    if (phase !== 'discard' || turn !== 'player') return
    const s = new Set()
    if (!selected.has(idx)) s.add(idx)
    setSelected(s)
  }

  // 카드 버리기
  const discardSelected = () => {
    if (selected.size !== 1) return
    const idx = [...selected][0]
    const card = myHand[idx]
    const newHand = sortHand(myHand.filter((_, i) => i !== idx))
    setMyHand(newHand)
    setDiscardPile([...discardPile, card])
    setSelected(new Set())
    setMessage('')

    // 훌라 체크
    if (canDeclareHula(newHand)) {
      setGameOver('win')
      setMessage('🎉 훌라! 승리!')
      return
    }

    setTurn('cpu')
    setPhase('draw')
  }

  // CPU 턴
  useEffect(() => {
    if (turn !== 'cpu' || gameOver || !started) return
    const timer = setTimeout(() => {
      let newCpuHand = [...cpuHand]
      let newDeck = [...deck]
      let newDiscardPile = [...discardPile]

      // 드로우: 버린 카드가 유용하면 가져옴, 아니면 덱에서
      const topD = newDiscardPile[newDiscardPile.length - 1]
      let tookDiscard = false
      if (topD) {
        const testHand = [...newCpuHand, topD]
        // 같은 숫자 2장 이상이면 가져감
        const sameRank = testHand.filter(c => c.rank === topD.rank).length
        if (sameRank >= 2) {
          newCpuHand.push(topD)
          newDiscardPile = newDiscardPile.slice(0, -1)
          tookDiscard = true
        }
      }
      if (!tookDiscard && newDeck.length > 0) {
        newCpuHand.push(newDeck[newDeck.length - 1])
        newDeck = newDeck.slice(0, -1)
      }

      // 버리기
      const discIdx = aiChooseDiscard(newCpuHand)
      const discarded = newCpuHand[discIdx]
      newCpuHand = newCpuHand.filter((_, i) => i !== discIdx)
      newDiscardPile = [...newDiscardPile, discarded]

      setCpuHand(newCpuHand)
      setDeck(newDeck)
      setDiscardPile(newDiscardPile)

      // 훌라 체크
      if (canDeclareHula(newCpuHand)) {
        setGameOver('lose')
        setMessage('컴퓨터 훌라! 패배...')
        return
      }

      // 덱 소진 체크
      if (newDeck.length === 0 && newDiscardPile.length <= 1) {
        setGameOver('draw')
        setMessage('카드 소진 — 무승부!')
        return
      }

      setTurn('player')
      setPhase('draw')
      setMessage('덱 또는 버린 카드에서 1장 드로우')
    }, 1200)
    return () => clearTimeout(timer)
  }, [turn, gameOver, started])

  useEffect(() => {
    if (started && turn === 'player' && phase === 'draw' && !gameOver) {
      setMessage('덱 또는 버린 카드에서 1장 드로우')
    }
  }, [turn, phase, started, gameOver])

  if (!started) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🎴</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>훌라</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 12, lineHeight: 1.8 }}>
          7장의 카드로 조합을 완성하세요!
        </p>
        <div style={{ fontSize: 12, color: '#AAA', marginBottom: 24, lineHeight: 1.8, textAlign: 'left', maxWidth: 280, margin: '0 auto 24px' }}>
          <strong>규칙</strong><br />
          • 매 턴 1장 드로우 → 1장 버리기<br />
          • 같은 숫자 3장 = <strong>트리플</strong><br />
          • 같은 무늬 연속 3장 = <strong>런</strong><br />
          • 모든 카드가 조합이면 <strong>훌라!</strong><br />
          예) [♠3♠4♠5] + [♥7♦7♣7] + 나머지 1장 버리기
        </div>
        <button onClick={startGame}
          style={{
            padding: '14px 40px', borderRadius: 14, border: 'none', cursor: 'pointer',
            fontSize: 16, fontWeight: 700, color: '#FFF',
            background: 'linear-gradient(135deg, #2D6A4F, #40916C)',
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
        background: 'linear-gradient(135deg, #2D6A4F, #40916C)',
        color: '#FFF', padding: '1rem 1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 돌아가기
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>훌라</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>덱 {deck.length}장</span>
        </div>
      </div>

      <div style={{ padding: '0 12px' }}>
        {/* 컴퓨터 패 */}
        <div style={{ textAlign: 'center', padding: '10px 0 6px' }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
            컴퓨터 ({cpuHand.length}장)
            {turn === 'cpu' && !gameOver && <span style={{ marginLeft: 6 }}>🤔</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            {cpuHand.map((_, i) => <MiniCard key={i} card={{}} faceDown small />)}
          </div>
        </div>

        {/* 가운데: 덱 + 버린카드 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 20, padding: '12px 0',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#AAA', marginBottom: 4 }}>덱</div>
            <div
              onClick={phase === 'draw' && turn === 'player' && !gameOver ? drawFromDeck : undefined}
              style={{ cursor: phase === 'draw' && turn === 'player' ? 'pointer' : 'default' }}
            >
              <MiniCard card={{}} faceDown />
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#AAA', marginBottom: 4 }}>버린 카드</div>
            {topDiscard ? (
              <div
                onClick={phase === 'draw' && turn === 'player' && !gameOver ? drawFromDiscard : undefined}
                style={{ cursor: phase === 'draw' && turn === 'player' ? 'pointer' : 'default' }}
              >
                <MiniCard card={topDiscard} disabled={phase !== 'draw'} />
              </div>
            ) : (
              <div style={{
                width: 44, height: 62, borderRadius: 6,
                border: '1.5px dashed #DDD', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#CCC',
              }}>없음</div>
            )}
          </div>
        </div>

        {/* 메시지 */}
        {message && (
          <div style={{
            textAlign: 'center', padding: '8px 12px', marginBottom: 8,
            background: '#E8F5E9', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#2D6A4F',
          }}>
            {message}
          </div>
        )}

        {/* 내 패 */}
        <div style={{ padding: '10px 0', borderTop: '1px solid #EEE' }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 6, textAlign: 'center' }}>
            내 카드 ({myHand.length}장)
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
            {myHand.map((card, i) => (
              <MiniCard
                key={cardId(card) + '-' + i}
                card={card}
                selected={selected.has(i)}
                onClick={() => toggleSelect(i)}
                disabled={phase !== 'discard' || turn !== 'player' || !!gameOver}
              />
            ))}
          </div>

          {/* 버리기 버튼 */}
          {phase === 'discard' && turn === 'player' && !gameOver && (
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button
                onClick={discardSelected}
                disabled={selected.size !== 1}
                style={{
                  padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: selected.size === 1 ? '#2D6A4F' : '#DDD',
                  color: '#FFF', fontSize: 14, fontWeight: 600,
                }}>
                선택한 카드 버리기
              </button>
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
            <div style={{ fontSize: 36, marginBottom: 8 }}>
              {gameOver === 'win' ? '🎉' : gameOver === 'draw' ? '🤝' : '😢'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
              {gameOver === 'win' ? '훌라! 승리!' : gameOver === 'draw' ? '무승부' : '패배...'}
            </div>
            {gameOver === 'lose' && (
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                컴퓨터 패: {cpuHand.map(c => `${c.suit}${c.rank}`).join(' ')}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <button onClick={startGame}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#2D6A4F', color: '#FFF', fontSize: 14, fontWeight: 600 }}>
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
