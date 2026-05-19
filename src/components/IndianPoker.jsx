import { useState, useEffect } from 'react'
import { useMultiGameRoom } from '../utils/useMultiGameRoom'
import { CHILD1, CHILD2 } from '../config/names'

// 규칙 (나무위키 기준):
// - 각 플레이어 카드 1장씩 이마에 (자기 것은 안 보이고 상대만 보임)
// - 카드는 1~10 (또는 A~K). 여기선 1~10
// - 시작 칩 균등. 매 라운드 앤티 1.
// - 자기 카드 모르는 상태에서 베팅 (콜/레이즈/폴드)
// - 폴드: 베팅금 잃고 라운드 종료
// - 콜: 양측 베팅 같아지면 공개 → 높은 숫자 승
// - 같으면 무승부, 다시 분배
// - 칩 0이면 탈락

const START_CHIPS = 20
const ANTE = 1
const PLAYERS = 4 // 사람 1 + AI 3

function makeDeck() {
  // 1~10 각 2장씩 = 20장
  const d = []
  for (let v = 1; v <= 10; v++) { d.push(v); d.push(v) }
  return d
}
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// AI 결정: 상대들 카드를 봄. 평균 vs 자기 추정.
// 다인이라 단순화: 본 카드들의 최댓값보다 자기가 높을 가능성 추정.
function aiDecide(aiIdx, hands, alive, currentBet, myBet, chips) {
  // 보이는 카드들 (자기 제외)
  const visible = hands.filter((_, i) => i !== aiIdx && alive[i])
  const maxVisible = Math.max(...visible, 1)
  const avgVisible = visible.reduce((a, b) => a + b, 0) / visible.length
  // 자기 카드 베이지안: 평균보다 위에 있을 확률 약 0.5, 최댓값보다 위에 있을 확률 (10-maxVisible)/9
  const winProb = Math.max(0.1, (10 - maxVisible) / 9 * 0.6 + (10 - avgVisible) / 9 * 0.4)
  // 결정
  const need = currentBet - myBet
  if (need > chips) return { action: 'fold' }
  if (winProb < 0.25 && need > 0) return { action: 'fold' }
  if (winProb > 0.7 && chips > need + 2 && currentBet < 6) {
    return { action: 'raise', amount: Math.min(chips - need, 2) }
  }
  return { action: 'call' }
}

export default function IndianPoker({ onBack }) {
  const [mode, setMode] = useState(null)
  if (!mode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16, display: 'block' }}>← 돌아가기</button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🎴</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>인디언 포커</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.7 }}>
          이마에 카드 1장 (자기 것만 안 보임!)<br />
          카드 1~10. 큰 숫자 승. 콜/레이즈/폴드.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
          <button onClick={() => setMode('ai')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #7E3F8F, #4A235A)', color: '#FFF', fontSize: 16, fontWeight: 700 }}>
            🤖 AI 4인 토너먼트
          </button>
          <button onClick={() => setMode('online')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4895EF, #1F77B4)', color: '#FFF', fontSize: 16, fontWeight: 700 }}>
            🌐 온라인 2~6인
          </button>
        </div>
      </div>
    )
  }
  if (mode === 'ai') return <IndianPokerAI onBack={() => setMode(null)} />
  return <IndianPokerOnline onBack={() => setMode(null)} />
}

function IndianPokerAI({ onBack }) {
  const [chips, setChips] = useState(Array(PLAYERS).fill(START_CHIPS))
  const [alive, setAlive] = useState(Array(PLAYERS).fill(true)) // 토너먼트용 (칩 0 → false)
  const [hands, setHands] = useState([])
  const [folded, setFolded] = useState(Array(PLAYERS).fill(false))
  const [pot, setPot] = useState(0)
  const [bets, setBets] = useState(Array(PLAYERS).fill(0))
  const [currentBet, setCurrentBet] = useState(0)
  const [turn, setTurn] = useState(0)
  const [phase, setPhase] = useState('menu') // menu | playing | reveal | gameOver
  const [log, setLog] = useState([])
  const [winnerIdx, setWinnerIdx] = useState(null)
  const [winners, setWinners] = useState([])

  const newRound = () => {
    const stillIn = alive.map((a, i) => a && chips[i] > 0)
    if (stillIn.filter(Boolean).length <= 1) {
      setPhase('gameOver')
      return
    }
    const deck = shuffle(makeDeck())
    const nh = []
    for (let i = 0; i < PLAYERS; i++) nh.push(stillIn[i] ? deck.pop() : 0)
    // 앤티
    const newChips = [...chips]
    let p = 0
    for (let i = 0; i < PLAYERS; i++) {
      if (stillIn[i] && newChips[i] >= ANTE) { newChips[i] -= ANTE; p += ANTE }
    }
    setChips(newChips)
    setHands(nh)
    setFolded(stillIn.map(s => !s))
    setBets(Array(PLAYERS).fill(0))
    setCurrentBet(0)
    setPot(p)
    setTurn(stillIn.indexOf(true))
    setPhase('playing')
    setLog([`라운드 시작 · 앤티 ${ANTE}씩`])
    setWinnerIdx(null); setWinners([])
  }

  const start = () => {
    setChips(Array(PLAYERS).fill(START_CHIPS))
    setAlive(Array(PLAYERS).fill(true))
    setHands([])
    setFolded(Array(PLAYERS).fill(false))
    setPot(0); setBets(Array(PLAYERS).fill(0)); setCurrentBet(0); setTurn(0)
    setPhase('starting')
    setLog([])
    setTimeout(newRound, 50)
  }

  // 다음 턴 (살아있고 폴드 안 한 사람 중)
  const advanceTurn = (foldedNow, betsNow, currentBetNow) => {
    let next = turn
    for (let i = 0; i < PLAYERS; i++) {
      next = (next + 1) % PLAYERS
      if (!foldedNow[next] && chips[next] > 0) break
    }
    // 종료 조건: 한 명만 남음 OR 모두 currentBet 매칭
    const activeIdx = []
    for (let i = 0; i < PLAYERS; i++) if (!foldedNow[i]) activeIdx.push(i)
    if (activeIdx.length === 1) {
      // 마지막 한 명이 승
      revealAndEnd(activeIdx, foldedNow, betsNow)
      return
    }
    const allMatched = activeIdx.every(i => betsNow[i] === currentBetNow)
    if (allMatched && next === activeIdx[0]) {
      // 한 바퀴 돌았고 다 같음 → 공개
      revealAndEnd(activeIdx, foldedNow, betsNow)
      return
    }
    setTurn(next)
  }

  const revealAndEnd = (activeIdx, foldedNow, betsNow) => {
    // 폴드 안 한 사람들 중 최고 카드
    if (activeIdx.length === 0) return
    const sortedActive = [...activeIdx].sort((a, b) => hands[b] - hands[a])
    const maxCard = hands[sortedActive[0]]
    const winnersIdx = activeIdx.filter(i => hands[i] === maxCard)
    setWinners(winnersIdx)
    const totalPot = pot + betsNow.reduce((a, b) => a + b, 0)
    const share = Math.floor(totalPot / winnersIdx.length)
    const newChips = [...chips]
    winnersIdx.forEach(i => { newChips[i] += share })
    setChips(newChips)
    setPhase('reveal')
    setLog(l => [...l, `🏆 승자: ${winnersIdx.map(i => i === 0 ? '나' : 'AI' + i).join(', ')} (카드 ${maxCard}) · +${share}`])
    // 탈락 처리
    const newAlive = newChips.map(c => c > 0)
    setAlive(newAlive)
  }

  // AI 자동 진행
  useEffect(() => {
    if (phase !== 'playing' || turn === 0 || folded[turn]) return
    const t = setTimeout(() => {
      const dec = aiDecide(turn, hands, alive, currentBet, bets[turn], chips[turn])
      handleAction(dec.action, dec.amount || 0)
    }, 900)
    return () => clearTimeout(t)
    // eslint-disable-next-line
  }, [turn, phase])

  // 폴드된 사람 자동 스킵 (사람 차례인데 folded면 advance)
  useEffect(() => {
    if (phase === 'playing' && folded[turn]) advanceTurn(folded, bets, currentBet)
    // eslint-disable-next-line
  }, [phase, turn])

  const handleAction = (action, raiseAmount = 0) => {
    if (phase !== 'playing') return
    const i = turn
    const newFolded = [...folded]
    const newBets = [...bets]
    const newChips = [...chips]
    let newCurrentBet = currentBet
    const need = currentBet - newBets[i]

    if (action === 'fold') {
      newFolded[i] = true
      setLog(l => [...l, `${i === 0 ? '나' : 'AI' + i}: 폴드`])
    } else if (action === 'call') {
      const pay = Math.min(need, newChips[i])
      newBets[i] += pay; newChips[i] -= pay
      setLog(l => [...l, `${i === 0 ? '나' : 'AI' + i}: 콜 (+${pay})`])
    } else if (action === 'raise') {
      const pay = Math.min(need + raiseAmount, newChips[i])
      newBets[i] += pay; newChips[i] -= pay
      newCurrentBet = newBets[i]
      setLog(l => [...l, `${i === 0 ? '나' : 'AI' + i}: 레이즈 → ${newCurrentBet}`])
    }
    setFolded(newFolded); setBets(newBets); setChips(newChips); setCurrentBet(newCurrentBet)
    advanceTurn(newFolded, newBets, newCurrentBet)
  }

  if (phase === 'menu') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16, display: 'block' }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🎴</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>인디언 포커</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 1.7 }}>
          이마에 카드 1장 (자기 카드만 안 보임!)<br />
          카드는 1~10. <b>큰 숫자 승</b>.<br />
          상대 카드 보고 베팅·콜·레이즈·폴드<br />
          시작 칩 {START_CHIPS}, 앤티 {ANTE} · 4명 토너먼트
        </p>
        <button onClick={start}
          style={{ padding: '16px 40px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #7E3F8F, #4A235A)', color: '#FFF', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
          🎯 시작
        </button>
      </div>
    )
  }

  if (phase === 'gameOver') {
    const winner = chips.findIndex(c => c > 0)
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ textAlign: 'center', padding: 28, borderRadius: 20, background: winner === 0 ? 'linear-gradient(135deg, #D4EDDA, #A8E6CF)' : 'linear-gradient(135deg, #FFF5F5, #F5C6CB)', marginBottom: 18 }}>
          <div style={{ fontSize: 56 }}>{winner === 0 ? '🏆' : '😵'}</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{winner === 0 ? '우승!' : `AI${winner} 우승`}</div>
          <div style={{ fontSize: 14, color: '#555', marginTop: 6 }}>남은 칩: {chips.map((c, i) => `${i === 0 ? '나' : 'AI' + i}=${c}`).join(', ')}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={start}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#7E3F8F', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>다시</button>
          <button onClick={() => setPhase('menu')}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#F0F0F0', color: '#555', fontWeight: 700, cursor: 'pointer' }}>메뉴</button>
        </div>
      </div>
    )
  }

  const myCard = hands[0] || 0
  const need = currentBet - (bets[0] || 0)
  const canCall = need <= chips[0]
  const canRaise = chips[0] > need

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={() => setPhase('menu')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>🎴 팟: {pot + bets.reduce((a, b) => a + b, 0)}</h2>
        <div style={{ width: 22 }} />
      </div>

      {/* AI들 (다른 사람 카드 보임) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            flex: 1, padding: 10, borderRadius: 12,
            background: folded[i] ? '#EEE' : '#FFF',
            border: turn === i && phase === 'playing' ? '2px solid #FFD700' : '2px solid transparent',
            textAlign: 'center', opacity: alive[i] ? 1 : 0.3,
          }}>
            <div style={{ fontSize: 11, color: '#888' }}>AI{i}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#4A235A', margin: '4px 0' }}>
              {alive[i] && !folded[i] ? hands[i] : '×'}
            </div>
            <div style={{ fontSize: 11, color: '#555' }}>💰 {chips[i]}{folded[i] && ' 폴드'}</div>
            <div style={{ fontSize: 11, color: '#888' }}>베팅 {bets[i] || 0}</div>
          </div>
        ))}
      </div>

      {/* 내 카드 (안 보임) */}
      <div style={{
        background: 'linear-gradient(135deg, #4A235A, #2C1338)',
        padding: '24px 16px', borderRadius: 18, textAlign: 'center', color: '#FFF',
        marginBottom: 14,
      }}>
        <div style={{ fontSize: 13, opacity: 0.8 }}>내 카드 (이마)</div>
        <div style={{ fontSize: 56, margin: '6px 0', letterSpacing: 4 }}>
          {phase === 'reveal' ? myCard : '🎴'}
        </div>
        <div style={{ fontSize: 13 }}>💰 {chips[0]} · 베팅 {bets[0] || 0}</div>
      </div>

      {phase === 'playing' && turn === 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => handleAction('fold')}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#E63946', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>
            폴드
          </button>
          <button onClick={() => handleAction('call')} disabled={!canCall}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: canCall ? '#06A77D' : '#DDD', color: '#FFF', fontWeight: 700, cursor: canCall ? 'pointer' : 'default' }}>
            콜 ({need > 0 ? `+${need}` : '체크'})
          </button>
          <button onClick={() => handleAction('raise', 2)} disabled={!canRaise}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: canRaise ? '#FF9F1C' : '#DDD', color: '#FFF', fontWeight: 700, cursor: canRaise ? 'pointer' : 'default' }}>
            레이즈+2
          </button>
        </div>
      )}
      {phase === 'playing' && turn !== 0 && (
        <div style={{ textAlign: 'center', color: '#888', padding: 14 }}>
          AI{turn} 생각 중...
        </div>
      )}

      {phase === 'reveal' && (
        <button onClick={newRound}
          style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: '#7E3F8F', color: '#FFF', fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
          다음 라운드
        </button>
      )}

      <div style={{ marginTop: 14, padding: 10, borderRadius: 10, background: '#F5F5F5', fontSize: 12, color: '#555', maxHeight: 100, overflowY: 'auto' }}>
        {log.slice(-5).map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  )
}

// ─── 온라인 2~6인 ───
// state = {
//   hands: { [slot]: card },           // 자기 카드는 UI에서 가림
//   chips: { [slot]: number },
//   bets:  { [slot]: number },
//   folded: { [slot]: bool },
//   alive: { [slot]: bool },           // 토너먼트 (칩 0 → false)
//   pot, currentBet, turn (slot), round, log, phase: 'waitNext' | 'playing' | 'reveal' | 'tournamentOver',
//   winners: [slot], winnerCard
// }
function IndianPokerOnline({ onBack }) {
  const mr = useMultiGameRoom('indianpoker')
  const [joinCode, setJoinCode] = useState('')
  const [myName, setMyName] = useState(() => {
    try { return localStorage.getItem('indian-poker-name') || '' } catch { return '' }
  })
  const [chosenMax, setChosenMax] = useState(4)

  const saveName = (n) => {
    setMyName(n)
    try { localStorage.setItem('indian-poker-name', n) } catch (_) {}
  }

  if (!mr.roomCode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>← 돌아가기</button>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 56 }}>🎴</div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>인디언 포커 온라인</h2>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>내 이름</div>
          <input value={myName} onChange={e => saveName(e.target.value.slice(0, 8))}
            placeholder="2~8자"
            style={{ width: '100%', padding: '14px', fontSize: 16, borderRadius: 12, border: '1.5px solid #DDD', boxSizing: 'border-box', minWidth: 0 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>최대 인원 (방장만 선택)</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[2, 3, 4, 5, 6].map(n => (
              <button key={n} onClick={() => setChosenMax(n)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
                  background: chosenMax === n ? '#7E3F8F' : '#F0F0F0',
                  color: chosenMax === n ? '#FFF' : '#555', fontWeight: 700, cursor: 'pointer',
                }}>{n}</button>
            ))}
          </div>
        </div>
        <button onClick={() => mr.createRoom(chosenMax, myName || '호스트')}
          disabled={!myName}
          style={{ width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', background: myName ? '#7E3F8F' : '#DDD', color: '#FFF', fontSize: 16, fontWeight: 700, cursor: myName ? 'pointer' : 'default', marginBottom: 12 }}>
          ➕ 방 만들기 ({chosenMax}인)
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 2))}
            placeholder="방 코드 2자리" inputMode="numeric"
            style={{ flex: 1, padding: '14px', fontSize: 16, borderRadius: 12, border: '1.5px solid #DDD', minWidth: 0, boxSizing: 'border-box', textAlign: 'center' }} />
          <button onClick={() => mr.joinRoom(joinCode, myName || '게스트')}
            disabled={joinCode.length !== 2 || !myName}
            style={{ padding: '0 18px', borderRadius: 12, border: 'none', background: (joinCode.length === 2 && myName) ? '#4895EF' : '#DDD', color: '#FFF', fontWeight: 700, cursor: (joinCode.length === 2 && myName) ? 'pointer' : 'default' }}>참가</button>
        </div>
        {mr.error && <p style={{ color: '#C62828', textAlign: 'center', marginTop: 10 }}>{mr.error}</p>}
      </div>
    )
  }

  return <IndianPokerRoom mr={mr} onLeave={() => mr.leaveRoom()} />
}

function IndianPokerRoom({ mr, onLeave }) {
  const room = mr.room
  if (!room) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <p>방 정보 로딩 중...</p>
      </div>
    )
  }

  const players = room.players || {}
  const playerSlots = Object.keys(players).map(Number).sort((a, b) => a - b)
  const isHost = mr.isHost
  const mySlot = mr.mySlot

  // 로비
  if (room.status === 'lobby') {
    const startGame = () => {
      const deck = shuffle(makeDeck())
      const hands = {}, chips = {}, bets = {}, folded = {}, alive = {}
      playerSlots.forEach(slot => {
        hands[slot] = deck.pop()
        chips[slot] = START_CHIPS - ANTE
        bets[slot] = 0
        folded[slot] = false
        alive[slot] = true
      })
      const pot = ANTE * playerSlots.length
      const initial = {
        hands, chips, bets, folded, alive,
        pot, currentBet: 0,
        turn: playerSlots[0],
        round: 1,
        phase: 'playing',
        log: [`라운드 1 시작 · 앤티 ${ANTE}씩`],
      }
      mr.startGame(initial)
    }
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>방 코드</h2>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#7E3F8F', letterSpacing: 8, fontFamily: 'monospace' }}>{mr.roomCode}</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>최대 {room.maxPlayers}인</div>
        </div>
        <div style={{ background: '#FFF', borderRadius: 14, padding: 12, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {Array.from({ length: room.maxPlayers }).map((_, slot) => (
            <div key={slot} style={{
              padding: '10px 6px', display: 'flex', justifyContent: 'space-between',
              borderBottom: slot < room.maxPlayers - 1 ? '1px solid #EEE' : 'none',
              background: slot === mySlot ? '#FFF3CD' : 'transparent',
            }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                {slot === 0 ? '👑' : '👤'} 슬롯 {slot + 1}
              </span>
              <span style={{ fontSize: 14, color: players[slot] ? '#1B5E20' : '#888' }}>
                {players[slot] ? players[slot].name : '대기 중'}
              </span>
            </div>
          ))}
        </div>
        {isHost ? (
          <button onClick={startGame} disabled={playerSlots.length < 2}
            style={{ width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', background: playerSlots.length >= 2 ? '#7E3F8F' : '#DDD', color: '#FFF', fontWeight: 800, fontSize: 16, cursor: playerSlots.length >= 2 ? 'pointer' : 'default' }}>
            🎯 게임 시작 ({playerSlots.length}인)
          </button>
        ) : (
          <p style={{ textAlign: 'center', color: '#888' }}>호스트가 시작하기를 기다리는 중...</p>
        )}
        <button onClick={onLeave}
          style={{ width: '100%', marginTop: 10, padding: '12px 0', borderRadius: 12, border: 'none', background: '#F0F0F0', color: '#555', fontWeight: 700, cursor: 'pointer' }}>
          나가기
        </button>
      </div>
    )
  }

  // 게임 진행 / 종료
  const s = room.state
  if (!s) return null

  const myCard = s.hands?.[mySlot]
  const myChips = s.chips?.[mySlot] || 0
  const myBet = s.bets?.[mySlot] || 0
  const need = s.currentBet - myBet
  const isMyTurn = s.turn === mySlot && s.phase === 'playing' && !s.folded?.[mySlot]
  const totalPot = s.pot + Object.values(s.bets || {}).reduce((a, b) => a + b, 0)

  const playerName = (slot) => players[slot]?.name || `슬롯${slot + 1}`

  // 액션
  const doAction = (action, raiseAmount = 0) => {
    if (!isMyTurn) return
    const newFolded = { ...s.folded }
    const newBets = { ...s.bets }
    const newChips = { ...s.chips }
    let newCurrentBet = s.currentBet
    const myBetNow = newBets[mySlot] || 0
    const needNow = newCurrentBet - myBetNow
    const logLine = (() => {
      if (action === 'fold') { newFolded[mySlot] = true; return `${playerName(mySlot)}: 폴드` }
      if (action === 'call') {
        const pay = Math.min(needNow, newChips[mySlot])
        newBets[mySlot] = myBetNow + pay; newChips[mySlot] -= pay
        return `${playerName(mySlot)}: 콜 (+${pay})`
      }
      if (action === 'raise') {
        const pay = Math.min(needNow + raiseAmount, newChips[mySlot])
        newBets[mySlot] = myBetNow + pay; newChips[mySlot] -= pay
        newCurrentBet = newBets[mySlot]
        return `${playerName(mySlot)}: 레이즈 → ${newCurrentBet}`
      }
      return ''
    })()

    // 다음 턴 / 종료 판정
    const activeSlots = playerSlots.filter(sl => !newFolded[sl] && s.alive[sl])
    if (activeSlots.length === 1) {
      // 라운드 종료 (한 명만 남음)
      finalize(activeSlots, newFolded, newBets, newChips, [...(s.log || []), logLine])
      return
    }
    // 다음 턴 찾기
    let next = mySlot
    for (let i = 0; i < room.maxPlayers; i++) {
      next = (next + 1) % room.maxPlayers
      if (activeSlots.includes(next)) break
    }
    // 한 바퀴 돌고 모두 베팅 일치하면 공개
    const allMatched = activeSlots.every(sl => (newBets[sl] || 0) === newCurrentBet)
    if (allMatched && next === activeSlots[0]) {
      finalize(activeSlots, newFolded, newBets, newChips, [...(s.log || []), logLine])
      return
    }
    mr.updateState({
      ...s,
      folded: newFolded, bets: newBets, chips: newChips, currentBet: newCurrentBet,
      turn: next,
      log: [...(s.log || []), logLine].slice(-30),
    })
  }

  const finalize = (activeSlots, newFolded, newBets, newChips, newLog) => {
    // 최고 카드
    let maxCard = -1
    activeSlots.forEach(sl => { if (s.hands[sl] > maxCard) maxCard = s.hands[sl] })
    const winners = activeSlots.filter(sl => s.hands[sl] === maxCard)
    const potTotal = s.pot + Object.values(newBets).reduce((a, b) => a + b, 0)
    const share = Math.floor(potTotal / winners.length)
    const finalChips = { ...newChips }
    winners.forEach(sl => { finalChips[sl] = (finalChips[sl] || 0) + share })
    const newAlive = { ...s.alive }
    playerSlots.forEach(sl => { if (finalChips[sl] <= 0) newAlive[sl] = false })

    mr.updateState({
      ...s,
      folded: newFolded, bets: newBets, chips: finalChips, alive: newAlive,
      phase: 'reveal',
      winners, winnerCard: maxCard,
      log: [...newLog, `🏆 승: ${winners.map(playerName).join(', ')} (카드 ${maxCard}) · 각 +${share}`].slice(-30),
    })
  }

  // 호스트가 다음 라운드 진행
  const nextRound = () => {
    if (!isHost) return
    const stillAlive = playerSlots.filter(sl => s.alive[sl] && s.chips[sl] > 0)
    if (stillAlive.length <= 1) {
      mr.updateState({ ...s, phase: 'tournamentOver' })
      return
    }
    const deck = shuffle(makeDeck())
    const newHands = {}, newBets = {}, newFolded = {}
    const newChips = { ...s.chips }
    let pot = 0
    playerSlots.forEach(sl => {
      if (stillAlive.includes(sl) && newChips[sl] >= ANTE) {
        newChips[sl] -= ANTE; pot += ANTE
      }
      newHands[sl] = stillAlive.includes(sl) ? deck.pop() : 0
      newBets[sl] = 0
      newFolded[sl] = !stillAlive.includes(sl)
    })
    mr.updateState({
      ...s,
      hands: newHands, chips: newChips, bets: newBets, folded: newFolded,
      pot, currentBet: 0,
      turn: stillAlive[0],
      round: s.round + 1,
      phase: 'playing',
      winners: null, winnerCard: null,
      log: [...(s.log || []), `라운드 ${s.round + 1} 시작`].slice(-30),
    })
  }

  // 토너먼트 종료
  if (s.phase === 'tournamentOver') {
    const winner = playerSlots.find(sl => s.alive[sl])
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ padding: 28, borderRadius: 20, background: winner === mySlot ? 'linear-gradient(135deg, #D4EDDA, #A8E6CF)' : 'linear-gradient(135deg, #FFF5F5, #F5C6CB)', textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 56 }}>{winner === mySlot ? '🏆' : '😵'}</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {winner === mySlot ? '우승!' : `${playerName(winner)} 우승`}
          </div>
        </div>
        <button onClick={onLeave}
          style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: '#F0F0F0', color: '#555', fontWeight: 700, cursor: 'pointer' }}>
          나가기
        </button>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={onLeave}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 14, fontWeight: 700 }}>방 {mr.roomCode} · R{s.round} · 팟 {totalPot}</h2>
        <div style={{ width: 22 }} />
      </div>

      {/* 다른 플레이어들 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        {playerSlots.filter(sl => sl !== mySlot).map(sl => (
          <div key={sl} style={{
            padding: 8, borderRadius: 10, minWidth: 80,
            background: s.folded?.[sl] ? '#EEE' : !s.alive?.[sl] ? '#FAFAFA' : '#FFF',
            border: s.turn === sl && s.phase === 'playing' ? '2px solid #FFD700' : '2px solid transparent',
            textAlign: 'center',
            opacity: s.alive?.[sl] ? 1 : 0.4,
          }}>
            <div style={{ fontSize: 11, color: '#888' }}>{playerName(sl)}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#4A235A' }}>
              {s.alive?.[sl] && !s.folded?.[sl] ? s.hands[sl] : '×'}
            </div>
            <div style={{ fontSize: 11, color: '#555' }}>💰 {s.chips?.[sl] || 0}</div>
            {s.folded?.[sl] && <div style={{ fontSize: 10, color: '#C62828' }}>폴드</div>}
          </div>
        ))}
      </div>

      {/* 내 카드 (안 보임) */}
      <div style={{
        background: 'linear-gradient(135deg, #4A235A, #2C1338)',
        padding: '20px 12px', borderRadius: 18, textAlign: 'center', color: '#FFF',
        marginBottom: 14,
      }}>
        <div style={{ fontSize: 12, opacity: 0.8 }}>내 카드 ({playerName(mySlot)})</div>
        <div style={{ fontSize: 52, margin: '4px 0' }}>
          {s.phase === 'reveal' ? myCard : '🎴'}
        </div>
        <div style={{ fontSize: 12 }}>💰 {myChips} · 베팅 {myBet}</div>
      </div>

      {s.phase === 'playing' && isMyTurn && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => doAction('fold')}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#E63946', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>폴드</button>
          <button onClick={() => doAction('call')} disabled={need > myChips}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: need <= myChips ? '#06A77D' : '#DDD', color: '#FFF', fontWeight: 700, cursor: need <= myChips ? 'pointer' : 'default' }}>
            콜 {need > 0 ? `+${need}` : '체크'}
          </button>
          <button onClick={() => doAction('raise', 2)} disabled={myChips <= need}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: myChips > need ? '#FF9F1C' : '#DDD', color: '#FFF', fontWeight: 700, cursor: myChips > need ? 'pointer' : 'default' }}>
            레이즈+2
          </button>
        </div>
      )}
      {s.phase === 'playing' && !isMyTurn && (
        <div style={{ textAlign: 'center', color: '#888', padding: 14 }}>
          {playerName(s.turn)} 차례...
        </div>
      )}
      {s.phase === 'reveal' && (
        <div>
          <div style={{ padding: 12, borderRadius: 12, background: '#FFF3CD', textAlign: 'center', marginBottom: 12, fontWeight: 700 }}>
            🏆 {s.winners?.map(playerName).join(', ')} (카드 {s.winnerCard})
          </div>
          {isHost ? (
            <button onClick={nextRound}
              style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: '#7E3F8F', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>
              다음 라운드
            </button>
          ) : (
            <p style={{ textAlign: 'center', color: '#888' }}>호스트가 진행 중...</p>
          )}
        </div>
      )}

      <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: '#F5F5F5', fontSize: 11, color: '#555', maxHeight: 80, overflowY: 'auto' }}>
        {(s.log || []).slice(-5).map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  )
}
