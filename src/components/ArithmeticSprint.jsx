import { useState, useEffect, useRef, useCallback } from 'react'
import { generateArithmeticProblem } from '../data/mathData'
import { getData, addScore, addDiamonds, updateRecord, updateDailyChallenge } from '../utils/mathStorage'

const LEVELS = [
  { level: 1, label: 'Lv.1 덧셈뺄셈(20이내)', color: '#06D6A0' },
  { level: 2, label: 'Lv.2 덧셈뺄셈(100이내)', color: '#4CC9F0' },
  { level: 3, label: 'Lv.3 구구단', color: '#4895EF' },
  { level: 4, label: 'Lv.4 나눗셈', color: '#7B2FF7' },
  { level: 5, label: 'Lv.5 혼합(100이내)', color: '#F77F00' },
  { level: 6, label: 'Lv.6 두자리\u00D7한자리', color: '#EF476F' },
  { level: 7, label: 'Lv.7 세자리\u00B1', color: '#E63946' },
  { level: 8, label: 'Lv.8 종합', color: '#333333' },
]

const GAME_DURATION = 30

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateChoices(answer) {
  const spread = Math.max(Math.abs(answer), 5)
  const wrongs = new Set()
  let attempts = 0
  while (wrongs.size < 3 && attempts < 50) {
    let offset = Math.floor(Math.random() * spread) + 1
    if (Math.random() < 0.5) offset = -offset
    const wrong = answer + offset
    if (wrong !== answer && !wrongs.has(wrong)) {
      wrongs.add(wrong)
    }
    attempts++
  }
  while (wrongs.size < 3) {
    wrongs.add(answer + wrongs.size + 1)
  }
  return shuffle([answer, ...wrongs])
}

function getComboMultiplier(combo) {
  if (combo >= 10) return 3
  if (combo >= 5) return 2
  return 1
}

export default function ArithmeticSprint({ onBack }) {
  const [phase, setPhase] = useState('select') // 'select' | 'countdown' | 'playing' | 'results'
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [countdownNum, setCountdownNum] = useState(3)

  // Game state
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [problem, setProblem] = useState(null)
  const [choices, setChoices] = useState([])
  const [feedback, setFeedback] = useState(null) // { type, selectedIdx, correctIdx }
  const [bestRecord, setBestRecord] = useState(0)

  const timerRef = useRef(null)
  const countdownRef = useRef(null)
  const feedbackRef = useRef(null)
  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const correctRef = useRef(0)
  const timeLeftRef = useRef(GAME_DURATION)

  // Load best record
  useEffect(() => {
    try {
      const data = getData()
      if (data?.records?.arithmeticSprint) {
        setBestRecord(data.records.arithmeticSprint)
      }
    } catch { /* no data */ }
  }, [])

  const nextProblem = useCallback((level) => {
    const p = generateArithmeticProblem(level)
    const c = generateChoices(p.answer)
    setProblem(p)
    setChoices(c)
  }, [])

  const startGame = (levelObj) => {
    setSelectedLevel(levelObj)
    setPhase('countdown')
    setCountdownNum(3)

    let count = 3
    countdownRef.current = setInterval(() => {
      count -= 1
      if (count <= 0) {
        clearInterval(countdownRef.current)
        setCountdownNum(0)

        // Initialize game
        setScore(0)
        setCombo(0)
        setMaxCombo(0)
        setCorrectCount(0)
        setWrongCount(0)
        setFeedback(null)
        scoreRef.current = 0
        comboRef.current = 0
        maxComboRef.current = 0
        correctRef.current = 0
        setTimeLeft(GAME_DURATION)
        timeLeftRef.current = GAME_DURATION
        nextProblem(levelObj.level)
        setPhase('playing')
      } else {
        setCountdownNum(count)
      }
    }, 1000)
  }

  // Game timer
  useEffect(() => {
    if (phase !== 'playing') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        const newT = Math.max(0, +(t - 0.1).toFixed(1))
        timeLeftRef.current = newT
        if (newT <= 0) {
          clearInterval(timerRef.current)
          setTimeout(() => setPhase('results'), 300)
        }
        return newT
      })
    }, 100)
    return () => clearInterval(timerRef.current)
  }, [phase])

  // Save results
  useEffect(() => {
    if (phase !== 'results' || !selectedLevel) return
    const finalScore = scoreRef.current
    try {
      addScore(finalScore)
      updateRecord('arithmeticSprint', null, finalScore)
      updateDailyChallenge('arithmetic')
      if (finalScore > bestRecord) {
        addDiamonds(1)
        setBestRecord(finalScore)
      }
    } catch { /* storage error */ }
  }, [phase])

  const handleChoice = (choiceValue, choiceIdx) => {
    if (feedback) return
    if (phase !== 'playing') return

    const correctIdx = choices.indexOf(problem.answer)
    const isCorrect = choiceValue === problem.answer

    if (isCorrect) {
      const newCombo = comboRef.current + 1
      comboRef.current = newCombo
      setCombo(newCombo)
      if (newCombo > maxComboRef.current) {
        maxComboRef.current = newCombo
        setMaxCombo(newCombo)
      }

      const multiplier = getComboMultiplier(newCombo)
      const points = 10 * multiplier
      const newScore = scoreRef.current + points
      scoreRef.current = newScore
      setScore(newScore)

      const newCorrect = correctRef.current + 1
      correctRef.current = newCorrect
      setCorrectCount(newCorrect)

      // +2 seconds bonus
      setTimeLeft(t => {
        const newT = +(t + 2).toFixed(1)
        timeLeftRef.current = newT
        return newT
      })

      setFeedback({ type: 'correct', selectedIdx: choiceIdx, correctIdx })
    } else {
      comboRef.current = 0
      setCombo(0)
      setWrongCount(w => w + 1)

      // -1 second penalty
      setTimeLeft(t => {
        const newT = Math.max(0, +(t - 1).toFixed(1))
        timeLeftRef.current = newT
        if (newT <= 0) {
          clearInterval(timerRef.current)
          setTimeout(() => setPhase('results'), 500)
        }
        return newT
      })

      setFeedback({ type: 'wrong', selectedIdx: choiceIdx, correctIdx })
    }

    feedbackRef.current = setTimeout(() => {
      setFeedback(null)
      if (timeLeftRef.current > 0) {
        nextProblem(selectedLevel.level)
      }
    }, 350)
  }

  // Cleanup
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      clearInterval(countdownRef.current)
      clearTimeout(feedbackRef.current)
    }
  }, [])

  const handleBack = () => {
    clearInterval(timerRef.current)
    clearInterval(countdownRef.current)
    clearTimeout(feedbackRef.current)
    if (phase === 'select') {
      onBack()
    } else {
      setPhase('select')
      setSelectedLevel(null)
    }
  }

  // ====== LEVEL SELECT ======
  if (phase === 'select') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>⚡</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>연산 스프린트</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 8, lineHeight: 1.6 }}>
          30초 동안 최대한 많이 풀어보세요!<br/>
          정답 +10점(콤보보너스), 시간 +2초<br/>
          오답 시간 -1초, 콤보 초기화
        </p>
        {bestRecord > 0 && (
          <div style={{ fontSize: 13, color: '#F39C12', fontWeight: 600, marginBottom: 16 }}>
            최고 기록: {bestRecord}점
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 300, margin: '0 auto' }}>
          {LEVELS.map(lv => (
            <button key={lv.level} onClick={() => startGame(lv)}
              style={{
                padding: '14px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                fontSize: 15, fontWeight: 700, color: '#FFF',
                background: lv.color,
                textAlign: 'center',
              }}>
              {lv.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ====== COUNTDOWN ======
  if (phase === 'countdown') {
    const lvColor = selectedLevel?.color || '#4895EF'
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{selectedLevel?.label}</h3>
        <div style={{
          fontSize: 80, fontWeight: 700, color: lvColor, lineHeight: 1, margin: '32px 0',
        }}>
          {countdownNum}
        </div>
        <p style={{ fontSize: 14, color: '#888' }}>준비하세요!</p>
      </div>
    )
  }

  // ====== RESULTS ======
  if (phase === 'results') {
    const finalScore = scoreRef.current
    const finalCorrect = correctRef.current
    const finalMaxCombo = maxComboRef.current
    const lvColor = selectedLevel?.color || '#4895EF'
    const isNewRecord = finalScore > 0 && finalScore >= bestRecord

    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{
          padding: '32px 20px', borderRadius: 20,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          border: '2px solid #F1C40F',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>
            {finalScore >= 300 ? '🏆' : finalScore >= 150 ? '🎉' : '👏'}
          </div>
          {isNewRecord && (
            <div style={{
              display: 'inline-block', padding: '4px 16px', borderRadius: 20,
              background: '#F1C40F', color: '#FFF', fontSize: 12, fontWeight: 700,
              marginBottom: 12,
            }}>
              NEW RECORD!
            </div>
          )}
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>게임 끝!</div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>{selectedLevel?.label}</div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, color: lvColor }}>{finalScore}</div>
              <div style={{ fontSize: 11, color: '#888' }}>점수</div>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#06D6A0' }}>{finalCorrect}</div>
              <div style={{ fontSize: 11, color: '#888' }}>정답</div>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#EF476F' }}>{wrongCount}</div>
              <div style={{ fontSize: 11, color: '#888' }}>오답</div>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#F39C12' }}>{finalMaxCombo}</div>
              <div style={{ fontSize: 11, color: '#888' }}>최대콤보</div>
            </div>
          </div>

          {finalMaxCombo >= 5 && (
            <div style={{ fontSize: 13, color: '#F39C12', marginBottom: 16 }}>
              {finalMaxCombo >= 10 ? '🔥 x3 콤보 보너스 달성!' : '🔥 x2 콤보 보너스 달성!'}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => startGame(selectedLevel)}
              style={{
                padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: lvColor, color: '#FFF', fontSize: 15, fontWeight: 700,
              }}>
              다시 하기
            </button>
            <button onClick={handleBack}
              style={{
                padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: '#F0F0F0', color: '#666', fontSize: 15, fontWeight: 700,
              }}>
              레벨 선택
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ====== PLAYING ======
  const lvColor = selectedLevel?.color || '#4895EF'
  const timerPct = (timeLeft / GAME_DURATION) * 100
  const timerColor = timeLeft <= 5 ? '#EF476F' : timeLeft <= 10 ? '#F39C12' : '#06D6A0'
  const multiplier = getComboMultiplier(combo)

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Header */}
      <div style={{ background: lvColor, color: '#FFF', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <button onClick={handleBack}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF',
              fontSize: 13, borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
            }}>
            ← 그만하기
          </button>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <span>🏆 {score}</span>
            {combo >= 2 && <span style={{ fontWeight: 700 }}>🔥 {combo}콤보{multiplier > 1 ? ` x${multiplier}` : ''}</span>}
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          연산 스프린트 — {selectedLevel?.label}
        </div>
      </div>

      {/* Timer bar */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ flex: 1, height: 8, background: '#EEE', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: timerColor,
              width: `${Math.min(timerPct, 100)}%`,
              transition: 'width 0.1s linear, background 0.3s',
            }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: timerColor, minWidth: 44, textAlign: 'right' }}>
            {Math.ceil(timeLeft)}초
          </span>
        </div>
      </div>

      {/* Problem area */}
      <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        {/* Combo display */}
        {combo >= 3 && (
          <div style={{
            fontSize: 13, fontWeight: 700, color: '#F39C12', marginBottom: 8,
            animation: 'pulse 0.5s ease-in-out',
          }}>
            🔥 {combo}콤보! {multiplier > 1 ? `(x${multiplier} 보너스)` : ''}
          </div>
        )}

        {/* Problem text */}
        <div style={{
          fontSize: 44, fontWeight: 700, marginBottom: 36, letterSpacing: 2,
          color: feedback?.type === 'correct' ? '#06D6A0' : feedback?.type === 'wrong' ? '#EF476F' : '#333',
          transition: 'color 0.2s',
        }}>
          {problem?.text}
        </div>

        {/* 4 Choice buttons */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
          maxWidth: 320, margin: '0 auto',
        }}>
          {choices.map((choice, idx) => {
            let bg = '#FFF'
            let border = '2px solid #E0E0E0'
            let color = '#333'

            if (feedback) {
              if (idx === feedback.correctIdx) {
                bg = '#D4EDDA'
                border = '2px solid #06D6A0'
                color = '#06D6A0'
              } else if (idx === feedback.selectedIdx && feedback.type === 'wrong') {
                bg = '#FADBD8'
                border = '2px solid #EF476F'
                color = '#EF476F'
              }
            }

            return (
              <button key={idx} onClick={() => handleChoice(choice, idx)}
                disabled={!!feedback}
                style={{
                  padding: '18px 8px', borderRadius: 14, border, cursor: feedback ? 'default' : 'pointer',
                  fontSize: 22, fontWeight: 700, color, background: bg,
                  transition: 'all 0.15s',
                  boxShadow: feedback ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                {choice}
              </button>
            )
          })}
        </div>

        {/* Score indicators */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 24, fontSize: 13, color: '#888' }}>
          <span>정답 {correctCount}</span>
          <span>오답 {wrongCount}</span>
        </div>
      </div>
    </div>
  )
}
