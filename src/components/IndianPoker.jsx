import { useState, useEffect } from 'react'

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
