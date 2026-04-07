import { useState, useEffect } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

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

// Serialization helpers for online mode
function serializeCards(cards) {
  return cards.map(c => `${c.suit}${c.rank}`).join(',')
}

function deserializeCards(str) {
  if (!str) return []
  return str.split(',').filter(Boolean).map(s => {
    // suit is first char (unicode symbol), rank is rest
    const suit = s[0]
    const rank = s.slice(1)
    return { suit, rank }
  })
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
  const [mode, setMode] = useState(null) // null | 'local' | 'online'
  const [joinCode, setJoinCode] = useState('')

  // --- Local mode state ---
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

  // --- Online mode ---
  const room = useGameRoom('onecard')

  // Online state derived from Firebase
  const [onDeck, setOnDeck] = useState([])
  const [onMyHand, setOnMyHand] = useState([])
  const [onOpponentHand, setOnOpponentHand] = useState([])
  const [onDiscard, setOnDiscard] = useState([])
  const [onTurn, setOnTurn] = useState('host')
  const [onPendingDraw, setOnPendingDraw] = useState(0)
  const [onActiveSuit, setOnActiveSuit] = useState('')
  const [onShowSuitPicker, setOnShowSuitPicker] = useState('')
  const [onWinner, setOnWinner] = useState('')
  const [onMessage, setOnMessage] = useState('')

  // Sync online state from Firebase
  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = room.gameState
    setOnDeck(deserializeCards(s.deck))
    const hostHand = deserializeCards(s.hostHand)
    const guestHand = deserializeCards(s.guestHand)
    if (room.role === 'host') {
      setOnMyHand(hostHand)
      setOnOpponentHand(guestHand)
    } else {
      setOnMyHand(guestHand)
      setOnOpponentHand(hostHand)
    }
    setOnDiscard(deserializeCards(s.discard))
    setOnTurn(s.turn || 'host')
    setOnPendingDraw(s.pendingDraw || 0)
    setOnActiveSuit(s.activeSuit || '')
    setOnShowSuitPicker(s.showSuitPicker || '')
    setOnWinner(s.winner || '')
    setOnMessage(s.message || '')
  }, [room.gameState, mode, room.role])

  // --- Local mode functions (unchanged) ---
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

  // 플레이어 카드 내기 (local)
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
      setMessage('승리!')
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

  // 7 무늬 선택 (local)
  const pickSuit = (suit) => {
    setActiveSuit(suit)
    setShowSuitPicker(false)
    setTurn('cpu')
  }

  // 플레이어 드로우 (local)
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

  // CPU 턴 (local only)
  useEffect(() => {
    if (mode !== 'local') return
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
  }, [turn, gameOver, started, mode])

  // --- Online mode functions ---
  const createOnline = async () => {
    const d = createDeck()
    const hostHand = d.slice(0, 7)
    const guestHand = d.slice(7, 14)
    const firstCard = d[14]
    const remaining = d.slice(15)
    await room.createRoom({
      hostHand: serializeCards(hostHand),
      guestHand: serializeCards(guestHand),
      deck: serializeCards(remaining),
      discard: serializeCards([firstCard]),
      turn: 'host',
      pendingDraw: 0,
      activeSuit: '',
      showSuitPicker: '',
      winner: '',
      message: '',
    })
    setMode('online')
  }

  const joinOnline = async () => {
    if (joinCode.length !== 2) { room.setError('2자리 코드를 입력하세요'); return }
    const ok = await room.joinRoom(joinCode.toUpperCase())
    if (ok) setMode('online')
  }

  const handleBack = () => {
    if (mode === 'online') room.leaveRoom()
    if (mode) {
      setMode(null)
      setStarted(false)
      setGameOver(null)
      return
    }
    onBack()
  }

  // Online: play a card
  const onlinePlayCard = (idx) => {
    if (!room.connected || onWinner) return
    if (onTurn !== room.role) return
    if (onShowSuitPicker) return

    const onTop = onDiscard[onDiscard.length - 1]
    const card = onMyHand[idx]
    if (!canPlay(card, onTop, onActiveSuit || null, onPendingDraw)) return

    const newMyHand = onMyHand.filter((_, i) => i !== idx)
    const newDiscard = [...onDiscard, card]
    const opponentRole = room.role === 'host' ? 'guest' : 'host'

    let newTurn = opponentRole
    let newPendingDraw = onPendingDraw
    let newActiveSuit = ''
    let newShowSuitPicker = ''
    let newWinner = ''
    let newMessage = ''

    if (newMyHand.length === 0) {
      newWinner = room.role
      newMessage = ''
    } else {
      if (newMyHand.length === 1) {
        newMessage = '원카드!'
      }

      if (card.rank === '2') {
        newPendingDraw = onPendingDraw + 2
        newTurn = opponentRole
      } else if (card.rank === 'J') {
        // Skip opponent -> my turn again
        newTurn = room.role
        newMessage = 'J — 상대 건너뛰기!'
      } else if (card.rank === '7') {
        // Show suit picker for this player
        newShowSuitPicker = room.role
        newTurn = onTurn // keep current turn until suit is picked
      } else {
        newTurn = opponentRole
        newPendingDraw = 0
      }
    }

    const newState = {
      hostHand: room.role === 'host' ? serializeCards(newMyHand) : serializeCards(onOpponentHand),
      guestHand: room.role === 'guest' ? serializeCards(newMyHand) : serializeCards(onOpponentHand),
      deck: serializeCards(onDeck),
      discard: serializeCards(newDiscard),
      turn: newTurn,
      pendingDraw: newWinner ? 0 : newPendingDraw,
      activeSuit: newActiveSuit,
      showSuitPicker: newShowSuitPicker,
      winner: newWinner,
      message: newMessage,
    }
    room.updateState(newState)
  }

  // Online: pick suit after playing 7
  const onlinePickSuit = (suit) => {
    if (onShowSuitPicker !== room.role) return
    const opponentRole = room.role === 'host' ? 'guest' : 'host'
    const s = room.gameState
    room.updateState({
      ...s,
      activeSuit: suit,
      showSuitPicker: '',
      turn: opponentRole,
      message: `무늬 변경 → ${suit}`,
    })
  }

  // Online: draw card(s)
  const onlinePlayerDraw = () => {
    if (!room.connected || onWinner) return
    if (onTurn !== room.role) return
    if (onShowSuitPicker) return

    const count = onPendingDraw > 0 ? onPendingDraw : 1
    const result = drawCards(count, onDeck, onDiscard)
    const newMyHand = [...onMyHand, ...result.drawn]
    const opponentRole = room.role === 'host' ? 'guest' : 'host'

    const newState = {
      hostHand: room.role === 'host' ? serializeCards(newMyHand) : serializeCards(onOpponentHand),
      guestHand: room.role === 'guest' ? serializeCards(newMyHand) : serializeCards(onOpponentHand),
      deck: serializeCards(result.deck),
      discard: serializeCards(result.discard),
      turn: opponentRole,
      pendingDraw: 0,
      activeSuit: '',
      showSuitPicker: '',
      winner: '',
      message: count > 1 ? `+${count}장 드로우!` : '',
    }
    room.updateState(newState)
  }

  // Online: new game (host only reshuffles)
  const onlineNewGame = () => {
    const d = createDeck()
    const hostHand = d.slice(0, 7)
    const guestHand = d.slice(7, 14)
    const firstCard = d[14]
    const remaining = d.slice(15)
    room.updateState({
      hostHand: serializeCards(hostHand),
      guestHand: serializeCards(guestHand),
      deck: serializeCards(remaining),
      discard: serializeCards([firstCard]),
      turn: 'host',
      pendingDraw: 0,
      activeSuit: '',
      showSuitPicker: '',
      winner: '',
      message: '',
    })
  }

  // Compute playable indices for local
  const playableIndices = mode === 'local' && top
    ? myHand.map((c, i) => canPlay(c, top, activeSuit, pendingDraw) ? i : -1).filter(i => i >= 0)
    : []

  // Compute playable indices for online
  const onTop = onDiscard.length > 0 ? onDiscard[onDiscard.length - 1] : null
  const onlinePlayableIndices = mode === 'online' && onTop && onTurn === room.role && !onShowSuitPicker && !onWinner
    ? onMyHand.map((c, i) => canPlay(c, onTop, onActiveSuit || null, onPendingDraw) ? i : -1).filter(i => i >= 0)
    : []

  const isMyOnlineTurn = mode === 'online' && onTurn === room.role && !onWinner

  // ===== MODE SELECT SCREEN =====
  if (!mode) {
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => { setMode('local'); startGame() }}
            style={{
              padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
              fontSize: 16, fontWeight: 700, color: '#FFF',
              background: 'linear-gradient(135deg, #4A3F8A, #6B5FBF)',
            }}>
            같은 기기에서 (vs 컴퓨터)
          </button>
          <button onClick={createOnline}
            style={{
              padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
              fontSize: 16, fontWeight: 700, color: '#FFF',
              background: 'linear-gradient(135deg, #4895EF, #3A7BD5)',
            }}>
            온라인 방 만들기
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
          {room.error && <div style={{ color: '#E74C3C', fontSize: 13 }}>{room.error}</div>}
        </div>
      </div>
    )
  }

  // ===== ONLINE: WAITING FOR OPPONENT =====
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
          나는 선공 (호스트)
        </p>
      </div>
    )
  }

  // ===== ONLINE GAME SCREEN =====
  if (mode === 'online') {
    const myTurnAndNoSuitPicker = isMyOnlineTurn && !onShowSuitPicker
    const showMySuitPicker = onShowSuitPicker === room.role

    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '1rem' }}>
        {/* 헤더 */}
        <div style={{
          background: 'linear-gradient(135deg, #4895EF, #3A7BD5)',
          color: '#FFF', padding: '1rem 1.25rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={handleBack}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
              ← 나가기
            </button>
            <span style={{ fontSize: 16, fontWeight: 700 }}>원카드 (온라인)</span>
            <span style={{ fontSize: 12, opacity: 0.7 }}>덱 {onDeck.length}장</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0' }}>
          방 코드: <strong>{room.roomCode}</strong> · 나는 {room.role === 'host' ? '호스트 (선공)' : '게스트'}
        </div>

        <div style={{ padding: '0 12px' }}>
          {/* 상대 패 (face-down) */}
          <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
              상대 ({onOpponentHand.length}장)
              {onTurn !== room.role && !onWinner && <span style={{ marginLeft: 6 }}>생각중...</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
              {onOpponentHand.map((_, i) => <Card key={i} card={{}} faceDown small />)}
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
                onClick={myTurnAndNoSuitPicker ? onlinePlayerDraw : undefined}
                style={{ cursor: myTurnAndNoSuitPicker ? 'pointer' : 'default' }}
              >
                <Card card={{}} faceDown />
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#AAA', marginBottom: 4 }}>
                {onActiveSuit ? `무늬: ${onActiveSuit}` : '버린 카드'}
                {onPendingDraw > 0 && <span style={{ color: '#E74C3C', fontWeight: 700 }}> +{onPendingDraw}</span>}
              </div>
              {onTop && <Card card={onTop} disabled />}
            </div>
          </div>

          {/* 메시지 */}
          {onMessage && (
            <div style={{
              textAlign: 'center', padding: '8px 12px', marginBottom: 8,
              background: '#FFF9E6', borderRadius: 10, fontSize: 14, fontWeight: 600,
              color: '#333',
            }}>
              {onMessage}
            </div>
          )}

          {/* 턴 표시 */}
          {!onWinner && (
            <div style={{
              textAlign: 'center', padding: '6px 0', fontSize: 13, fontWeight: 600,
              color: isMyOnlineTurn ? '#4895EF' : '#888',
            }}>
              {isMyOnlineTurn ? '내 차례 — 카드를 내거나 덱을 터치' : '상대 차례...'}
            </div>
          )}

          {/* 무늬 선택 (only for the player who played 7) */}
          {showMySuitPicker && (
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 0',
              background: '#F7F6F3', borderRadius: 12, marginBottom: 8,
            }}>
              <span style={{ fontSize: 13, alignSelf: 'center', marginRight: 4 }}>무늬 선택:</span>
              {SUITS.map(s => (
                <button key={s} onClick={() => onlinePickSuit(s)}
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
              내 카드 ({onMyHand.length}장)
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
              {onMyHand.map((card, i) => (
                <Card
                  key={cardKey(card, i)}
                  card={card}
                  small={onMyHand.length > 10}
                  highlight={onlinePlayableIndices.includes(i)}
                  disabled={!onlinePlayableIndices.includes(i) || showMySuitPicker}
                  onClick={() => onlinePlayCard(i)}
                />
              ))}
            </div>
            {isMyOnlineTurn && onlinePlayableIndices.length === 0 && !onWinner && !showMySuitPicker && (
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#E74C3C' }}>
                낼 수 있는 카드가 없어요. 덱을 터치해서 드로우하세요!
              </div>
            )}
          </div>

          {/* 게임 오버 (online) */}
          {onWinner && (
            <div style={{
              textAlign: 'center', padding: '20px', marginTop: 8,
              background: onWinner === room.role ? 'linear-gradient(135deg, #FFF9E6, #FFF3CD)' : '#F8F8F8',
              borderRadius: 14,
              border: onWinner === room.role ? '2px solid #F1C40F' : '2px solid #DDD',
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{onWinner === room.role ? '🎉' : '😢'}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
                {onWinner === room.role ? '승리!' : '패배...'}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button onClick={onlineNewGame}
                  style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#4895EF', color: '#FFF', fontSize: 14, fontWeight: 600 }}>
                  다시 하기
                </button>
                <button onClick={handleBack}
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

  // ===== LOCAL GAME SCREEN (original, unchanged) =====
  if (!started) {
    // This shouldn't happen since we call startGame() when selecting local,
    // but just in case, start the game
    startGame()
    return null
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '1rem' }}>
      {/* 헤더 */}
      <div style={{
        background: 'linear-gradient(135deg, #4A3F8A, #6B5FBF)',
        color: '#FFF', padding: '1rem 1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={handleBack}
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
            {turn === 'cpu' && !gameOver && <span style={{ marginLeft: 6 }}>생각중...</span>}
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
              <button onClick={handleBack}
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
