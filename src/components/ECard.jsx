import { useState, useEffect } from 'react'

// 규칙 (카이지/나무위키):
// - 황제 사이드: 황제 1 + 시민 4 (총 5장)
// - 노예 사이드: 노예 1 + 시민 4
// - 동시에 카드 한 장 공개
// - 황제 > 시민 > 노예 > 황제 (3원 관계)
// - 시민 vs 시민 = 무승부, 카드 소진하며 진행
// - 5장 다 떨어지면 무승부 (방어 측 승)
// - 1세트 = 4 라운드 (양 진영 2번씩)

const EMPEROR_DECK = ['E', 'C', 'C', 'C', 'C', 'C'] // 시민 5장? 카이지는 황제1+시민4. 5장 모두
// 실제: 황제 사이드는 [E, C, C, C, C] 5장. 노예 사이드는 [S, C, C, C, C] 5장.
const E_DECK = ['E', 'C', 'C', 'C', 'C']
const S_DECK = ['S', 'C', 'C', 'C', 'C']

function beats(a, b) {
  if (a === b) return 0 // 무승부 (둘 다 C, 또는 똑같음)
  if (a === 'E' && b === 'C') return 1
  if (a === 'C' && b === 'E') return -1
  if (a === 'C' && b === 'S') return 1
  if (a === 'S' && b === 'C') return -1
  if (a === 'S' && b === 'E') return 1
  if (a === 'E' && b === 'S') return -1
  return 0
}

// AI 전략
function aiPick(aiCards, myVisibleCards /* 내가 낸 거 */, asSide, oppSide) {
  // 단순: 마지막에 E/S를 아껴두기. 시민 우선
  const citizens = aiCards.filter(c => c === 'C').length
  const remainingTrump = aiCards.filter(c => c !== 'C').length
  // 라운드 후반에 트럼프 카드 사용 가능성 ↑
  const round = 5 - aiCards.length // 0,1,2,3,4
  if (citizens === 0) return aiCards[0] // 마지막 카드
  // 시민이 많이 남았으면 시민 우선
  if (citizens > 1 && Math.random() < 0.7) return 'C'
  if (citizens === 1 && remainingTrump > 0 && round >= 2 && Math.random() < 0.5) {
    return aiCards.find(c => c !== 'C')
  }
  return 'C'
}

const NUM_SETS = 2 // 2세트: 1세트 = 4라운드, 자리 바뀜

export default function ECard({ onBack }) {
  const [phase, setPhase] = useState('menu')
  const [setIdx, setSetIdx] = useState(0) // 0: 첫 세트, 1: 자리 바꿈
  const [round, setRound] = useState(0)
  const [mySide, setMySide] = useState('emperor') // 'emperor' | 'slave'
  const [myHand, setMyHand] = useState([])
  const [aiHand, setAiHand] = useState([])
  const [myPick, setMyPick] = useState(null)
  const [aiPicked, setAiPicked] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [scores, setScores] = useState({ emperor: 0, slave: 0 })
  const [setResult, setSetResult] = useState(null) // 1세트 결과
  const [log, setLog] = useState([])

  const startSet = (myAsEmperor) => {
    setMySide(myAsEmperor ? 'emperor' : 'slave')
    setMyHand([...(myAsEmperor ? E_DECK : S_DECK)])
    setAiHand([...(myAsEmperor ? S_DECK : E_DECK)])
    setRound(0); setMyPick(null); setAiPicked(null); setRevealed(false); setSetResult(null)
    setLog(l => [...l, `${setIdx === 0 ? '1' : '2'}세트 시작 (나=${myAsEmperor ? '황제' : '노예'})`])
    setPhase('playing')
  }

  const start = () => {
    setSetIdx(0)
    setScores({ emperor: 0, slave: 0 })
    setLog([])
    startSet(true) // 첫 세트는 사용자가 황제
  }

  const submitPick = (card) => {
    if (myPick || revealed) return
    setMyPick(card)
    // AI 픽
    const aiCard = aiPick(aiHand, [], mySide === 'emperor' ? 'slave' : 'emperor', mySide)
    setAiPicked(aiCard)
    setTimeout(() => setRevealed(true), 800)
  }

  // 공개 후 결과
  useEffect(() => {
    if (!revealed) return
    const myCard = myPick
    const aiCard = aiPicked
    const result = beats(myCard, aiCard)
    setLog(l => [...l, `R${round + 1}: 나 ${myCard} vs AI ${aiCard} → ${result === 0 ? '무승부' : result > 0 ? '내 승' : 'AI 승'}`])
    setTimeout(() => {
      if (result === 0) {
        // 무승부 → 다음 라운드, 양쪽 카드 소진
        const newMy = [...myHand]
        newMy.splice(newMy.indexOf(myCard), 1)
        const newAi = [...aiHand]
        newAi.splice(newAi.indexOf(aiCard), 1)
        if (newMy.length === 0 || newAi.length === 0) {
          // 카드 소진 → 황제측 승 (방어측 승). 즉 노예가 황제 못 잡았으므로 황제측 승.
          handleSetEnd('emperor')
          return
        }
        setMyHand(newMy); setAiHand(newAi)
        setRound(r => r + 1); setMyPick(null); setAiPicked(null); setRevealed(false)
      } else {
        // 누가 이겼나
        // 카이지룰: 노예가 황제 잡으면 5배(자리). 황제가 시민으로 노예 잡으면 1배.
        const winnerSide = result > 0 ? mySide : (mySide === 'emperor' ? 'slave' : 'emperor')
        handleSetEnd(winnerSide)
      }
    }, 1400)
    // eslint-disable-next-line
  }, [revealed])

  const handleSetEnd = (winnerSide) => {
    // 점수: 노예가 황제 잡으면 5점, 그 외 1점
    let pts = 1
    if (winnerSide === 'slave') pts = 5 // 슬레이브가 황제 잡음
    const newScores = { ...scores, [winnerSide]: scores[winnerSide] + pts }
    setScores(newScores)
    setLog(l => [...l, `🏆 ${winnerSide === 'emperor' ? '황제측' : '노예측'} 승 (+${pts})`])
    setSetResult({ winner: winnerSide, pts })
    setPhase('setEnd')
  }

  const nextSet = () => {
    if (setIdx + 1 >= NUM_SETS) {
      setPhase('gameOver')
    } else {
      setSetIdx(setIdx + 1)
      // 자리 교대
      startSet(mySide !== 'emperor')
    }
  }

  if (phase === 'menu') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16, display: 'block' }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>👑</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>E카드</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 1.7 }}>
          👑 황제 &gt; 👨 시민 &gt; 🔗 노예 &gt; 👑 황제<br />
          황제측: 황제1 + 시민4<br />
          노예측: 노예1 + 시민4<br />
          노예가 황제 잡으면 <b>5배 점수!</b><br />
          2세트 (자리 바꿈)
        </p>
        <button onClick={start}
          style={{ padding: '16px 40px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #B91D47, #6B1029)', color: '#FFF', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
          🎯 시작
        </button>
      </div>
    )
  }

  if (phase === 'gameOver') {
    const myScore = scores[mySide] // 마지막 mySide 기준... 사실 양쪽 따로
    // 점수가 더 높은 사람이 승. 그런데 양쪽 다 점수가 누적되므로...
    // 좋은 방식: 사용자 입장에서 누가 더 많이 승리했는지 확인
    // 단순화: 양 진영 합산 점수. 사용자는 두 세트 동안 양쪽을 한 번씩 함.
    // 그러므로 더 잘 한 진영의 점수를 비교... 어렵다. 그냥 emperor vs slave 비교.
    const empWin = scores.emperor > scores.slave
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ padding: 28, borderRadius: 20, background: 'linear-gradient(135deg, #FFF3CD, #FFE082)', textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 56 }}>{empWin ? '👑' : '🔗'}</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {empWin ? '황제측 승!' : scores.emperor === scores.slave ? '무승부' : '노예측 승!'}
          </div>
          <div style={{ fontSize: 14, color: '#555', marginTop: 8 }}>
            👑 황제측 {scores.emperor} : 노예측 🔗 {scores.slave}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={start} style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#B91D47', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>다시</button>
          <button onClick={() => setPhase('menu')} style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#F0F0F0', color: '#555', fontWeight: 700, cursor: 'pointer' }}>메뉴</button>
        </div>
      </div>
    )
  }

  if (phase === 'setEnd') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ padding: 24, borderRadius: 16, background: '#FFF3CD', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 48 }}>{setResult.winner === 'emperor' ? '👑' : '🔗'}</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>
            {setResult.winner === 'emperor' ? '황제측' : '노예측'} 승!
          </div>
          <div style={{ fontSize: 14, color: '#555' }}>+{setResult.pts}점</div>
        </div>
        <div style={{ padding: 14, borderRadius: 12, background: '#F5F5F5', textAlign: 'center', marginBottom: 16, fontSize: 13 }}>
          현재 누적: 👑 {scores.emperor} · 🔗 {scores.slave}
        </div>
        <button onClick={nextSet}
          style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: '#B91D47', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>
          {setIdx + 1 >= NUM_SETS ? '최종 결과' : '다음 세트 (자리 바꿈)'}
        </button>
      </div>
    )
  }

  const cardEmoji = c => c === 'E' ? '👑' : c === 'S' ? '🔗' : '👨'
  const cardName = c => c === 'E' ? '황제' : c === 'S' ? '노예' : '시민'

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => setPhase('menu')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 14, fontWeight: 700 }}>세트 {setIdx + 1}/{NUM_SETS} · R{round + 1}</h2>
        <div style={{ fontSize: 13, color: '#888' }}>나={mySide === 'emperor' ? '👑' : '🔗'}</div>
      </div>

      {/* AI 영역 */}
      <div style={{
        padding: 16, borderRadius: 16, background: '#F5F0FA', marginBottom: 12, textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: '#7E3F8F', marginBottom: 6 }}>
          AI ({mySide === 'emperor' ? '노예측' : '황제측'}) · 남은 {aiHand.length}장
        </div>
        <div style={{ fontSize: 48, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {revealed ? cardEmoji(aiPicked) : aiPicked ? '🎴' : '...'}
        </div>
        <div style={{ fontSize: 13, color: '#555', fontWeight: 700 }}>
          {revealed && aiPicked ? cardName(aiPicked) : ''}
        </div>
      </div>

      <div style={{
        padding: 16, borderRadius: 16, background: 'linear-gradient(135deg, #FFF3CD, #FFE082)', marginBottom: 14, textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: '#856404', marginBottom: 6 }}>
          내가 낸 카드
        </div>
        <div style={{ fontSize: 48, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {myPick ? cardEmoji(myPick) : '?'}
        </div>
      </div>

      {/* 내 손패 */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        {myHand.map((c, i) => (
          <button key={i} onClick={() => submitPick(c)}
            disabled={!!myPick}
            style={{
              padding: '12px 10px', borderRadius: 12, border: '2px solid #B91D47', cursor: myPick ? 'default' : 'pointer',
              background: myPick ? '#EEE' : '#FFF', minWidth: 56,
              opacity: myPick ? 0.5 : 1,
            }}>
            <div style={{ fontSize: 28 }}>{cardEmoji(c)}</div>
            <div style={{ fontSize: 10, color: '#555', fontWeight: 700 }}>{cardName(c)}</div>
          </button>
        ))}
      </div>

      <div style={{ padding: 8, borderRadius: 10, background: '#F5F5F5', fontSize: 11, color: '#555', maxHeight: 80, overflowY: 'auto' }}>
        {log.slice(-4).map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  )
}
