import { useState, useEffect, useMemo } from 'react'
import { WORD_PAIRS } from '../data/wordPairs'
import { CHILD1, CHILD2 } from '../config/names'
import { submitQuizScore } from '../api/api'

const ROUND_SIZE = 4  // 한 라운드당 4쌍
const PLAYER_KEY = 'word-match-player'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function thisYearMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function WordMatching({ onBack }) {
  const [player, setPlayer] = useState(() => {
    try { return localStorage.getItem(PLAYER_KEY) } catch { return null }
  })
  const [phase, setPhase] = useState('grade') // grade | playing | result
  const [grade, setGrade] = useState(null)
  const [allPairs, setAllPairs] = useState([]) // 섞인 전체 풀 (라운드에 공급)
  const [roundPairs, setRoundPairs] = useState([]) // 현재 4쌍
  const [matched, setMatched] = useState(new Set()) // 현재 라운드 매칭 완료된 쌍의 en
  const [selectedEn, setSelectedEn] = useState(null)
  const [selectedKo, setSelectedKo] = useState(null)
  const [wrongPair, setWrongPair] = useState(null) // { en, ko } 빨간 깜빡임
  const [totalMatched, setTotalMatched] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const TOTAL_PAIRS = 12  // 한 게임에서 풀 쌍 수 (3라운드)

  const choosePlayer = (name) => {
    setPlayer(name)
    try { localStorage.setItem(PLAYER_KEY, name) } catch (_) {}
  }

  const startGrade = (g) => {
    const pool = shuffle(WORD_PAIRS[g]).slice(0, TOTAL_PAIRS)
    setGrade(g)
    setAllPairs(pool)
    setupNextRound(pool, 0)
    setTotalMatched(0)
    setMistakes(0)
    setStartTime(Date.now())
    setElapsed(0)
    setPhase('playing')
  }

  function setupNextRound(pool, alreadyDone) {
    const nextBatch = pool.slice(alreadyDone, alreadyDone + ROUND_SIZE)
    setRoundPairs(nextBatch)
    setMatched(new Set())
    setSelectedEn(null)
    setSelectedKo(null)
    setWrongPair(null)
  }

  // 타이머
  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 500)
    return () => clearInterval(id)
  }, [phase, startTime])

  // 라운드 완성 체크
  useEffect(() => {
    if (phase !== 'playing' || roundPairs.length === 0) return
    if (matched.size === roundPairs.length) {
      // 다음 라운드 or 게임 종료
      const done = totalMatched + matched.size
      if (done >= allPairs.length) {
        // 게임 끝
        finishGame(done)
      } else {
        setTimeout(() => setupNextRound(allPairs, done), 400)
      }
      setTotalMatched(done)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched])

  function finishGame(done) {
    setPhase('result')
    const score = Math.max(0, done * 100 - mistakes * 10)
    if (player) {
      submitQuizScore({
        userName: player,
        quizId: 'word-match',
        grade: String(grade),
        score,
        maxScore: TOTAL_PAIRS * 100,
        yearMonth: thisYearMonth(),
      }).catch(() => {})
    }
  }

  // 선택 핸들러
  useEffect(() => {
    if (phase !== 'playing') return
    if (selectedEn && selectedKo) {
      const pair = roundPairs.find(p => p.en === selectedEn)
      if (pair && pair.ko === selectedKo) {
        // 정답
        setMatched(prev => new Set([...prev, selectedEn]))
        setSelectedEn(null)
        setSelectedKo(null)
      } else {
        // 오답
        setWrongPair({ en: selectedEn, ko: selectedKo })
        setMistakes(m => m + 1)
        setTimeout(() => {
          setWrongPair(null)
          setSelectedEn(null)
          setSelectedKo(null)
        }, 600)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEn, selectedKo])

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
  }

  // 플레이어 선택
  if (!player) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🔤</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>영어 단어 매칭</h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>누가 플레이하나요?</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {[CHILD1, CHILD2].map((name, i) => (
            <button key={name} onClick={() => choosePlayer(name)}
              style={{
                padding: '18px 28px', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: i === 0 ? 'linear-gradient(135deg, #4895EF, #3A7BD5)' : 'linear-gradient(135deg, #EF476F, #D63B5C)',
                color: '#FFF', fontSize: 17, fontWeight: 700, minWidth: 120,
              }}>
              {name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 난이도 선택
  if (phase === 'grade') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={onBack}
            style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer' }}>
            ← 돌아가기
          </button>
          <button onClick={() => { try { localStorage.removeItem(PLAYER_KEY) } catch (_) {}; setPlayer(null) }}
            style={{ background: '#F5F5F5', border: 'none', borderRadius: 12, fontSize: 12, padding: '5px 12px', cursor: 'pointer', color: '#666' }}>
            👤 {player} (바꾸기)
          </button>
        </div>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🔤</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>영어 단어 매칭</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
          영단어와 뜻을 짝 맞춰 보세요<br />
          총 {TOTAL_PAIRS}쌍 · 한 라운드에 {ROUND_SIZE}쌍씩
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300, margin: '0 auto' }}>
          {[3, 4, 5, 6].map((g, i) => {
            const colors = [
              'linear-gradient(135deg, #06D6A0, #05B384)',
              'linear-gradient(135deg, #4895EF, #3A7BD5)',
              'linear-gradient(135deg, #F39C12, #E67E22)',
              'linear-gradient(135deg, #EF476F, #D63B5C)',
            ]
            return (
              <button key={g} onClick={() => startGrade(g)}
                style={{
                  padding: '16px 20px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: colors[i], color: '#FFF', textAlign: 'left',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{g}학년</span>
                <span style={{ fontSize: 12, opacity: 0.85 }}>{WORD_PAIRS[g].length}개 단어 풀</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 결과
  if (phase === 'result') {
    const score = Math.max(0, totalMatched * 100 - mistakes * 10)
    const emoji = score >= 1100 ? '🏆' : score >= 900 ? '🥇' : score >= 700 ? '🥈' : '💪'
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{
          textAlign: 'center', padding: '32px 20px', borderRadius: 20,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          border: '2px solid #F1C40F', marginBottom: 20,
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{emoji}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{player} 완료!</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#E67E22', marginBottom: 8 }}>
            {score}점
          </div>
          <div style={{ fontSize: 13, color: '#888' }}>
            {totalMatched}쌍 · 실수 {mistakes}번 · {formatTime(elapsed)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => startGrade(grade)}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: 'none',
              background: '#4895EF', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
            다시 도전
          </button>
          <button onClick={() => setPhase('grade')}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: 'none',
              background: '#F0F0F0', color: '#555', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
            난이도 선택
          </button>
        </div>
      </div>
    )
  }

  // 플레이
  const ens = useMemo(() => shuffle(roundPairs.map(p => p.en)), [roundPairs])
  const kos = useMemo(() => shuffle(roundPairs.map(p => p.ko)), [roundPairs])
  const cellStyle = (selected, isMatched, isWrong) => ({
    padding: '14px 12px',
    borderRadius: 12,
    border: selected ? '3px solid #F39C12' : isWrong ? '3px solid #EF476F' : '2px solid #EEE',
    background: isMatched ? '#E8F8F0' : selected ? '#FEF9E6' : isWrong ? '#FFF5F5' : '#FFF',
    fontSize: 15, fontWeight: 700,
    cursor: isMatched ? 'default' : 'pointer',
    opacity: isMatched ? 0.5 : 1,
    color: isMatched ? '#888' : '#2C3E50',
    textAlign: 'center',
    transition: 'all 0.15s',
  })

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setPhase('grade')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>
          ←
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>🔤 {grade}학년 매칭</h2>
        <div style={{ fontSize: 12, color: '#666' }}>
          ⏱ {formatTime(elapsed)} · ❌ {mistakes}
        </div>
      </div>

      {/* 진행률 */}
      <div style={{
        height: 6, background: '#EEE', borderRadius: 3, overflow: 'hidden', marginBottom: 14,
      }}>
        <div style={{
          width: `${((totalMatched + matched.size) / TOTAL_PAIRS) * 100}%`, height: '100%',
          background: 'linear-gradient(90deg, #4895EF, #06D6A0)',
          transition: 'width 0.3s',
        }} />
      </div>

      <div style={{ fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 10 }}>
        짝 맞은 쌍: {totalMatched + matched.size} / {TOTAL_PAIRS}
      </div>

      {/* 매칭 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* English */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#888', textAlign: 'center', marginBottom: 2 }}>English</div>
          {ens.map(en => {
            const isMatched = matched.has(en)
            const isSelected = selectedEn === en
            const isWrong = wrongPair?.en === en
            return (
              <button key={en}
                onClick={() => { if (!isMatched) setSelectedEn(en) }}
                disabled={isMatched}
                style={cellStyle(isSelected, isMatched, isWrong)}>
                {en}
              </button>
            )
          })}
        </div>
        {/* Korean */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#888', textAlign: 'center', marginBottom: 2 }}>뜻</div>
          {kos.map(ko => {
            const pair = roundPairs.find(p => p.ko === ko)
            const isMatched = pair && matched.has(pair.en)
            const isSelected = selectedKo === ko
            const isWrong = wrongPair?.ko === ko
            return (
              <button key={ko}
                onClick={() => { if (!isMatched) setSelectedKo(ko) }}
                disabled={isMatched}
                style={cellStyle(isSelected, isMatched, isWrong)}>
                {ko}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#AAA', textAlign: 'center', marginTop: 16 }}>
        영단어 → 뜻 순서로 눌러 짝을 맞춰보세요 🎯
      </div>
    </div>
  )
}
