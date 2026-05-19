import { useState, useEffect } from 'react'

// 규칙 (라이어 게임 / 나무위키):
// - 5명의 플레이어가 매 라운드 1~99 중 정수 1개 선택 (비밀)
// - 동시 공개
// - 같은 수를 적은 사람들 모두 0점
// - 남은 사람: 자신의 수가 소수면 +수, 합성수(또는 1)면 -수
// - 5라운드 후 누적 점수가 가장 높은 사람 승

const ROUNDS = 5
const PLAYERS = 5 // 사람 1 + AI 4

function isPrime(n) {
  if (n < 2) return false
  if (n === 2) return true
  if (n % 2 === 0) return false
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false
  return true
}

function listPrimes() {
  const arr = []
  for (let i = 2; i < 100; i++) if (isPrime(i)) arr.push(i)
  return arr
}
const PRIMES = listPrimes()

// AI 전략 (라이어게임 등장 인물별 다른 성격)
function aiPick(strategy, history, round) {
  // strategy: 'safe' | 'greedy' | 'avoid' | 'random'
  if (strategy === 'random') {
    return PRIMES[Math.floor(Math.random() * PRIMES.length)]
  }
  if (strategy === 'safe') {
    // 작은 소수 선호 (다른 사람이 덜 선택할 듯한)
    const candidates = PRIMES.filter(p => p > 30 && p < 80)
    return candidates[Math.floor(Math.random() * candidates.length)]
  }
  if (strategy === 'greedy') {
    // 큰 소수 선호
    const candidates = PRIMES.filter(p => p > 70)
    return candidates[Math.floor(Math.random() * candidates.length)]
  }
  if (strategy === 'avoid') {
    // 다른 사람이 선택했던 수 회피
    const used = new Set(history.flat())
    const candidates = PRIMES.filter(p => !used.has(p))
    if (candidates.length === 0) return PRIMES[Math.floor(Math.random() * PRIMES.length)]
    return candidates[Math.floor(Math.random() * candidates.length)]
  }
  return 41
}

const AI_NAMES = ['🤖 알파', '🤖 베타', '🤖 감마', '🤖 델타']
const AI_STRATS = ['safe', 'greedy', 'avoid', 'random']

export default function PrimeMonopoly({ onBack }) {
  const [phase, setPhase] = useState('menu') // menu | playing | reveal | gameOver
  const [round, setRound] = useState(0)
  const [myPick, setMyPick] = useState('')
  const [picks, setPicks] = useState([]) // 이번 라운드 [n, n, n, n, n]
  const [history, setHistory] = useState([]) // 라운드별 picks
  const [scores, setScores] = useState(Array(PLAYERS).fill(0))
  const [reveal, setReveal] = useState(null) // {picks, results}

  const start = () => {
    setRound(0); setMyPick(''); setPicks([]); setHistory([]); setScores(Array(PLAYERS).fill(0))
    setReveal(null); setPhase('playing')
  }

  const submitMyPick = () => {
    const n = parseInt(myPick, 10)
    if (!Number.isInteger(n) || n < 1 || n > 99) {
      alert('1~99 사이의 정수를 입력하세요')
      return
    }
    // AI들 픽
    const allPicks = [n]
    for (let i = 0; i < 4; i++) {
      allPicks.push(aiPick(AI_STRATS[i], history, round))
    }
    setPicks(allPicks)
    setHistory(h => [...h, allPicks])

    // 중복 체크
    const counts = {}
    allPicks.forEach(p => { counts[p] = (counts[p] || 0) + 1 })

    // 결과 계산
    const results = allPicks.map((p, i) => {
      if (counts[p] > 1) return { picked: p, score: 0, reason: '중복' }
      if (isPrime(p)) return { picked: p, score: p, reason: '소수' }
      return { picked: p, score: -p, reason: p === 1 ? '1은 합성수' : '합성수' }
    })
    const newScores = scores.map((s, i) => s + results[i].score)
    setScores(newScores)
    setReveal({ picks: allPicks, results })
    setPhase('reveal')
    setMyPick('')
  }

  const nextRound = () => {
    if (round + 1 >= ROUNDS) {
      setPhase('gameOver')
    } else {
      setRound(round + 1)
      setReveal(null)
      setPhase('playing')
    }
  }

  if (phase === 'menu') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16, display: 'block' }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🔢</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>소수 독점 게임</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 1.7 }}>
          5명이 1~99 중 정수 1개 동시 공개<br />
          <b>같은 수 → 0점</b> (중복 처리)<br />
          남은 사람: <b>소수면 +수</b>, 합성수(1 포함)면 <b>-수</b><br />
          {ROUNDS}라운드 누적 점수 최대 승!
        </p>
        <div style={{ background: '#F5F5F5', borderRadius: 12, padding: 12, fontSize: 11, color: '#555', marginBottom: 20, textAlign: 'left' }}>
          💡 <b>전략 팁</b><br />
          • 큰 소수는 위험하지만 점수가 크다 (97 = +97 or 0)<br />
          • 작은 소수는 다른 사람도 노릴 가능성 ↑<br />
          • 합성수는 절대 금지 (-점수)<br />
          • 1은 소수 아님! (-1)
        </div>
        <button onClick={start}
          style={{ padding: '16px 40px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #1F77B4, #0D3D6B)', color: '#FFF', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
          🎯 시작
        </button>
      </div>
    )
  }

  if (phase === 'gameOver') {
    const ranking = scores.map((s, i) => ({
      idx: i, score: s, name: i === 0 ? '🙋 나' : AI_NAMES[i - 1],
    })).sort((a, b) => b.score - a.score)
    const myRank = ranking.findIndex(r => r.idx === 0) + 1
    const iWon = myRank === 1
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ padding: 24, borderRadius: 18, textAlign: 'center', marginBottom: 16,
          background: iWon ? 'linear-gradient(135deg, #D4EDDA, #A8E6CF)' : 'linear-gradient(135deg, #FFF5F5, #F5C6CB)' }}>
          <div style={{ fontSize: 56 }}>{iWon ? '🏆' : myRank <= 2 ? '🥈' : '😵'}</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {iWon ? '우승!' : `${myRank}위`}
          </div>
          <div style={{ fontSize: 14, color: '#555' }}>최종 {scores[0]}점</div>
        </div>
        <div style={{ padding: 14, borderRadius: 12, background: '#FFF', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          {ranking.map((r, i) => (
            <div key={r.idx} style={{
              display: 'flex', justifyContent: 'space-between', padding: '8px 4px',
              borderBottom: i < ranking.length - 1 ? '1px solid #EEE' : 'none',
              background: r.idx === 0 ? '#FFF3CD' : 'transparent',
              borderRadius: 6,
            }}>
              <div style={{ fontWeight: 700 }}>{i + 1}위 · {r.name}</div>
              <div style={{ fontWeight: 800, color: r.score >= 0 ? '#1B5E20' : '#C62828' }}>{r.score}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={start} style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#1F77B4', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>다시</button>
          <button onClick={() => setPhase('menu')} style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#F0F0F0', color: '#555', fontWeight: 700, cursor: 'pointer' }}>메뉴</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={() => setPhase('menu')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>🔢 R{round + 1}/{ROUNDS}</h2>
        <div style={{ fontSize: 14, fontWeight: 700, color: scores[0] >= 0 ? '#1B5E20' : '#C62828' }}>
          내 점수: {scores[0]}
        </div>
      </div>

      {/* 점수판 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        {scores.map((s, i) => (
          <div key={i} style={{
            padding: '6px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
            background: i === 0 ? '#E3F2FD' : '#F5F5F5',
            color: s >= 0 ? '#1B5E20' : '#C62828',
            border: i === 0 ? '2px solid #1F77B4' : '2px solid transparent',
          }}>
            {i === 0 ? '🙋 나' : AI_NAMES[i - 1].slice(2)}<br />{s}
          </div>
        ))}
      </div>

      {phase === 'playing' && (
        <div>
          <p style={{ textAlign: 'center', fontSize: 14, color: '#555', marginBottom: 12 }}>
            1~99 중 정수 하나 선택!
          </p>
          <input
            type="number"
            inputMode="numeric"
            min="1" max="99"
            value={myPick}
            onChange={e => setMyPick(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
            placeholder="예: 47"
            style={{
              width: '100%', padding: 16, fontSize: 24, fontWeight: 800, borderRadius: 14,
              border: '2px solid #1F77B4', textAlign: 'center', marginBottom: 14,
              minWidth: 0, boxSizing: 'border-box', fontFamily: 'monospace',
            }} />
          <button onClick={submitMyPick}
            disabled={!myPick}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 12, border: 'none',
              background: myPick ? '#1F77B4' : '#DDD', color: '#FFF',
              fontWeight: 800, fontSize: 16, cursor: myPick ? 'pointer' : 'default',
            }}>
            제출 (AI도 동시에 공개)
          </button>
          <div style={{ marginTop: 14, padding: 10, borderRadius: 10, background: '#F5F5F5', fontSize: 12, color: '#555' }}>
            💡 {myPick && (
              isPrime(parseInt(myPick, 10))
                ? <span>{myPick}은 <b style={{ color: '#1B5E20' }}>소수</b>예요 (다른 사람과 겹치지 않으면 +{myPick})</span>
                : parseInt(myPick, 10) > 0 && <span>{myPick}은 <b style={{ color: '#C62828' }}>{myPick === '1' ? '1 (소수 아님)' : '합성수'}</b>예요 (-{myPick})</span>
            )}
          </div>
        </div>
      )}

      {phase === 'reveal' && reveal && (
        <div>
          <div style={{ padding: 14, borderRadius: 14, background: '#FFF', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textAlign: 'center', color: '#1F77B4' }}>
              R{round + 1} 결과
            </div>
            {reveal.picks.map((p, i) => {
              const r = reveal.results[i]
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 4px', borderBottom: i < PLAYERS - 1 ? '1px solid #EEE' : 'none',
                  background: i === 0 ? '#FFFBEA' : 'transparent', borderRadius: 6,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {i === 0 ? '🙋 나' : AI_NAMES[i - 1]}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace' }}>{p}</span>
                    <span style={{ fontSize: 11, color: '#888', minWidth: 50, textAlign: 'right' }}>{r.reason}</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: r.score > 0 ? '#1B5E20' : r.score < 0 ? '#C62828' : '#888', minWidth: 40, textAlign: 'right' }}>
                      {r.score > 0 ? `+${r.score}` : r.score}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={nextRound}
            style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: '#1F77B4', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>
            {round + 1 >= ROUNDS ? '최종 결과 보기' : '다음 라운드'}
          </button>
        </div>
      )}
    </div>
  )
}
