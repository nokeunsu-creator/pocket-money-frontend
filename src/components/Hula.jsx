import { useState, useEffect } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

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

// --- Serialization helpers for online mode ---
function serializeCards(cards) {
  if (!cards || cards.length === 0) return ''
  return cards.map(c => c.suit + c.rank).join(',')
}

function deserializeCards(str) {
  if (!str || str === '') return []
  return str.split(',').map(s => {
    // Suit is always the first character (a symbol)
    const suit = s[0]
    const rank = s.slice(1)
    return { suit, rank }
  })
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
  // Mode: null = selection, 'local' = vs CPU, 'online' = multiplayer
  const [mode, setMode] = useState(null)
  const [joinCode, setJoinCode] = useState('')

  // --- Local (CPU) state ---
  const [started, setStarted] = useState(false)
  const [deck, setDeck] = useState([])
  const [myHand, setMyHand] = useState([])
  const [cpuHand, setCpuHand] = useState([])
  const [discardPile, setDiscardPile] = useState([])
  const [turn, setTurn] = useState('player') // 'player' | 'cpu'
  const [phase, setPhase] = useState('draw') // 'draw' | 'discard'
  const [selected, setSelected] = useState(new Set())
  const [message, setMessage] = useState('')
  const [gameOver, setGameOver] = useState(null) // 'win' | 'lose' | 'draw'

  // --- Online state ---
  const {
    roomCode, role, gameState, connected, error,
    createRoom, joinRoom, updateState, leaveRoom, setError,
  } = useGameRoom('hula')
  const [onlineSelected, setOnlineSelected] = useState(new Set())

  // ========== LOCAL (CPU) GAME LOGIC (unchanged) ==========

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
    if (mode !== 'local') return
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
  }, [turn, gameOver, started, mode])

  useEffect(() => {
    if (mode !== 'local') return
    if (started && turn === 'player' && phase === 'draw' && !gameOver) {
      setMessage('덱 또는 버린 카드에서 1장 드로우')
    }
  }, [turn, phase, started, gameOver, mode])

  // ========== ONLINE MULTIPLAYER LOGIC ==========

  const handleCreateRoom = async () => {
    const d = createDeck()
    const hostHand = d.slice(0, 7)
    const guestHand = d.slice(7, 14)
    const discardCard = [d[14]]
    const remaining = d.slice(15)

    const initialState = {
      hostHand: serializeCards(hostHand),
      guestHand: serializeCards(guestHand),
      deck: serializeCards(remaining),
      discardPile: serializeCards(discardCard),
      turn: 'host',
      phase: 'draw',
      winner: '',
      message: '',
    }
    await createRoom(initialState)
    setMode('online')
  }

  const handleJoinRoom = async () => {
    if (joinCode.length !== 4) {
      setError('4자리 코드를 입력하세요')
      return
    }
    const ok = await joinRoom(joinCode)
    if (ok) {
      setMode('online')
    }
  }

  // Derive online game values from gameState
  const onlineMyHand = gameState
    ? sortHand(deserializeCards(role === 'host' ? gameState.hostHand : gameState.guestHand))
    : []
  const onlineOpponentHandCount = gameState
    ? deserializeCards(role === 'host' ? gameState.guestHand : gameState.hostHand).length
    : 0
  const onlineDeck = gameState ? deserializeCards(gameState.deck) : []
  const onlineDiscardPile = gameState ? deserializeCards(gameState.discardPile) : []
  const onlineTopDiscard = onlineDiscardPile.length > 0 ? onlineDiscardPile[onlineDiscardPile.length - 1] : null
  const onlineTurn = gameState ? gameState.turn : null
  const onlinePhase = gameState ? gameState.phase : null
  const onlineWinner = gameState ? gameState.winner : ''
  const onlineMessage = gameState ? gameState.message : ''
  const isMyTurn = onlineTurn === role

  const onlineDrawFromDeck = () => {
    if (!isMyTurn || onlinePhase !== 'draw' || onlineDeck.length === 0 || onlineWinner) return
    const card = onlineDeck[onlineDeck.length - 1]
    const newHand = sortHand([...onlineMyHand, card])
    const newDeck = onlineDeck.slice(0, -1)

    const myHandKey = role === 'host' ? 'hostHand' : 'guestHand'
    updateState({
      ...gameState,
      [myHandKey]: serializeCards(newHand),
      deck: serializeCards(newDeck),
      phase: 'discard',
      message: '',
    })
    setOnlineSelected(new Set())
  }

  const onlineDrawFromDiscard = () => {
    if (!isMyTurn || onlinePhase !== 'draw' || onlineDiscardPile.length === 0 || onlineWinner) return
    const card = onlineDiscardPile[onlineDiscardPile.length - 1]
    const newHand = sortHand([...onlineMyHand, card])
    const newDiscardPile = onlineDiscardPile.slice(0, -1)

    const myHandKey = role === 'host' ? 'hostHand' : 'guestHand'
    updateState({
      ...gameState,
      [myHandKey]: serializeCards(newHand),
      discardPile: serializeCards(newDiscardPile),
      phase: 'discard',
      message: '',
    })
    setOnlineSelected(new Set())
  }

  const onlineToggleSelect = (idx) => {
    if (!isMyTurn || onlinePhase !== 'discard' || onlineWinner) return
    const s = new Set()
    if (!onlineSelected.has(idx)) s.add(idx)
    setOnlineSelected(s)
  }

  const onlineDiscardSelected = () => {
    if (onlineSelected.size !== 1) return
    const idx = [...onlineSelected][0]
    const card = onlineMyHand[idx]
    const newHand = sortHand(onlineMyHand.filter((_, i) => i !== idx))
    const newDiscardPile = [...onlineDiscardPile, card]

    const myHandKey = role === 'host' ? 'hostHand' : 'guestHand'
    const opponentRole = role === 'host' ? 'guest' : 'host'

    // 훌라 체크
    if (canDeclareHula(newHand)) {
      updateState({
        ...gameState,
        [myHandKey]: serializeCards(newHand),
        discardPile: serializeCards(newDiscardPile),
        phase: 'draw',
        turn: opponentRole,
        winner: role,
        message: (role === 'host' ? '방장' : '참가자') + ' 훌라! 승리!',
      })
      setOnlineSelected(new Set())
      return
    }

    // 덱 소진 체크
    if (onlineDeck.length === 0 && newDiscardPile.length <= 1) {
      updateState({
        ...gameState,
        [myHandKey]: serializeCards(newHand),
        discardPile: serializeCards(newDiscardPile),
        winner: 'draw',
        message: '카드 소진 — 무승부!',
      })
      setOnlineSelected(new Set())
      return
    }

    updateState({
      ...gameState,
      [myHandKey]: serializeCards(newHand),
      discardPile: serializeCards(newDiscardPile),
      turn: opponentRole,
      phase: 'draw',
      message: '',
    })
    setOnlineSelected(new Set())
  }

  const handleOnlineNewGame = async () => {
    const d = createDeck()
    const hostHand = d.slice(0, 7)
    const guestHand = d.slice(7, 14)
    const discardCard = [d[14]]
    const remaining = d.slice(15)

    await updateState({
      hostHand: serializeCards(hostHand),
      guestHand: serializeCards(guestHand),
      deck: serializeCards(remaining),
      discardPile: serializeCards(discardCard),
      turn: 'host',
      phase: 'draw',
      winner: '',
      message: '',
    })
    setOnlineSelected(new Set())
  }

  const handleLeaveOnline = () => {
    leaveRoom()
    setMode(null)
    setJoinCode('')
    setOnlineSelected(new Set())
  }

  // ========== RENDER ==========

  // Mode selection screen
  if (mode === null) {
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
          <button onClick={() => { setMode('local'); }}
            style={{
              padding: '14px 40px', borderRadius: 14, border: 'none', cursor: 'pointer',
              fontSize: 16, fontWeight: 700, color: '#FFF',
              background: 'linear-gradient(135deg, #2D6A4F, #40916C)',
              width: '100%',
            }}>
            같은 기기에서 (vs 컴퓨터)
          </button>
          <button onClick={handleCreateRoom}
            style={{
              padding: '14px 40px', borderRadius: 14, border: 'none', cursor: 'pointer',
              fontSize: 16, fontWeight: 700, color: '#FFF',
              background: 'linear-gradient(135deg, #1565C0, #1E88E5)',
              width: '100%',
            }}>
            온라인 방 만들기
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="4자리 코드"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 14,
                border: '2px solid #DDD', fontSize: 16, textAlign: 'center',
                fontWeight: 700, letterSpacing: 4,
              }}
            />
            <button onClick={handleJoinRoom}
              style={{
                padding: '12px 20px', borderRadius: 14, border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 700, color: '#FFF',
                background: joinCode.length === 4 ? '#1565C0' : '#CCC',
              }}>
              참가
            </button>
          </div>
          {error && (
            <div style={{ color: '#E74C3C', fontSize: 13, fontWeight: 600 }}>{error}</div>
          )}
        </div>
      </div>
    )
  }

  // ========== LOCAL (CPU) MODE ==========
  if (mode === 'local') {
    if (!started) {
      // Auto-start local game
      startGame()
      return null
    }

    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '1rem' }}>
        {/* 헤더 */}
        <div style={{
          background: 'linear-gradient(135deg, #2D6A4F, #40916C)',
          color: '#FFF', padding: '1rem 1.25rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => { setMode(null); setStarted(false); }}
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
                <button onClick={() => { setMode(null); setStarted(false); }}
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

  // ========== ONLINE MODE ==========

  // Waiting for opponent
  if (mode === 'online' && !connected) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleLeaveOnline}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 24 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎴</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>상대를 기다리는 중...</h2>
        <div style={{
          display: 'inline-block', padding: '16px 32px', borderRadius: 16,
          background: '#F0F4FF', marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>방 코드</div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 8, color: '#1565C0' }}>
            {roomCode}
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#AAA' }}>상대에게 이 코드를 알려주세요</p>
      </div>
    )
  }

  if (mode === 'online' && connected && gameState) {
    const iWin = onlineWinner === role
    const iLose = onlineWinner !== '' && onlineWinner !== 'draw' && onlineWinner !== role
    const isDraw = onlineWinner === 'draw'
    const gameEnded = onlineWinner !== ''

    const turnLabel = isMyTurn ? '내 턴' : '상대 턴'
    const canDraw = isMyTurn && onlinePhase === 'draw' && !gameEnded
    const canDiscard = isMyTurn && onlinePhase === 'discard' && !gameEnded

    let statusMessage = ''
    if (gameEnded) {
      statusMessage = onlineMessage
    } else if (isMyTurn && onlinePhase === 'draw') {
      statusMessage = '덱 또는 버린 카드에서 1장 드로우'
    } else if (isMyTurn && onlinePhase === 'discard') {
      statusMessage = '카드를 1장 버리세요'
    } else {
      statusMessage = '상대 턴을 기다리는 중...'
    }

    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '1rem' }}>
        {/* 헤더 */}
        <div style={{
          background: 'linear-gradient(135deg, #1565C0, #1E88E5)',
          color: '#FFF', padding: '1rem 1.25rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={handleLeaveOnline}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
              ← 나가기
            </button>
            <span style={{ fontSize: 16, fontWeight: 700 }}>훌라 온라인</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, opacity: 0.7 }}>방 {roomCode}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>덱 {onlineDeck.length}장</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 6, fontSize: 13, fontWeight: 600, opacity: 0.9 }}>
            {!gameEnded && (isMyTurn
              ? <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 12px', borderRadius: 10 }}>내 턴</span>
              : <span style={{ opacity: 0.6 }}>상대 턴</span>
            )}
          </div>
        </div>

        <div style={{ padding: '0 12px' }}>
          {/* 상대 패 (face-down) */}
          <div style={{ textAlign: 'center', padding: '10px 0 6px' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
              상대 ({onlineOpponentHandCount}장)
              {!isMyTurn && !gameEnded && <span style={{ marginLeft: 6 }}>🤔</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              {Array.from({ length: onlineOpponentHandCount }).map((_, i) => (
                <MiniCard key={i} card={{}} faceDown small />
              ))}
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
                onClick={canDraw ? onlineDrawFromDeck : undefined}
                style={{ cursor: canDraw ? 'pointer' : 'default' }}
              >
                <MiniCard card={{}} faceDown />
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#AAA', marginBottom: 4 }}>버린 카드</div>
              {onlineTopDiscard ? (
                <div
                  onClick={canDraw ? onlineDrawFromDiscard : undefined}
                  style={{ cursor: canDraw ? 'pointer' : 'default' }}
                >
                  <MiniCard card={onlineTopDiscard} disabled={!canDraw} />
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
          {statusMessage && (
            <div style={{
              textAlign: 'center', padding: '8px 12px', marginBottom: 8,
              background: isMyTurn ? '#E3F2FD' : '#F5F5F5',
              borderRadius: 10, fontSize: 13, fontWeight: 600,
              color: isMyTurn ? '#1565C0' : '#888',
            }}>
              {statusMessage}
            </div>
          )}

          {/* 내 패 */}
          <div style={{ padding: '10px 0', borderTop: '1px solid #EEE' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6, textAlign: 'center' }}>
              내 카드 ({onlineMyHand.length}장) {role === 'host' ? '(방장)' : '(참가자)'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
              {onlineMyHand.map((card, i) => (
                <MiniCard
                  key={cardId(card) + '-' + i}
                  card={card}
                  selected={onlineSelected.has(i)}
                  onClick={() => onlineToggleSelect(i)}
                  disabled={!canDiscard}
                />
              ))}
            </div>

            {/* 버리기 버튼 */}
            {canDiscard && (
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <button
                  onClick={onlineDiscardSelected}
                  disabled={onlineSelected.size !== 1}
                  style={{
                    padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: onlineSelected.size === 1 ? '#1565C0' : '#DDD',
                    color: '#FFF', fontSize: 14, fontWeight: 600,
                  }}>
                  선택한 카드 버리기
                </button>
              </div>
            )}
          </div>

          {/* 게임 오버 */}
          {gameEnded && (
            <div style={{
              textAlign: 'center', padding: '20px', marginTop: 8,
              background: iWin ? 'linear-gradient(135deg, #FFF9E6, #FFF3CD)' : '#F8F8F8',
              borderRadius: 14,
              border: iWin ? '2px solid #F1C40F' : '2px solid #DDD',
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>
                {iWin ? '🎉' : isDraw ? '🤝' : '😢'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                {iWin ? '훌라! 승리!' : isDraw ? '무승부' : '패배...'}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
                {role === 'host' && (
                  <button onClick={handleOnlineNewGame}
                    style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#1565C0', color: '#FFF', fontSize: 14, fontWeight: 600 }}>
                    다시 하기
                  </button>
                )}
                <button onClick={handleLeaveOnline}
                  style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
                  나가기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
