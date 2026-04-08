import { useState, useEffect, useRef } from 'react'
import { generateUnitProblem } from '../data/mathData'
import { getData, addScore, addDiamonds, updateRecord } from '../utils/mathStorage'

const CATEGORIES = [
  { key: 'length', icon: '📏', label: '길이', color: '#4895EF' },
  { key: 'weight', icon: '⚖️', label: '무게', color: '#06D6A0' },
  { key: 'volume', icon: '🥤', label: '부피', color: '#F39C12' },
  { key: 'mixed', icon: '🔀', label: '종합', color: '#7B2FF7' },
]

const UNIT_ICONS = {
  length: '📏',
  weight: '⚖️',
  volume: '🥤',
}

const TOTAL_QUESTIONS = 20
const TIME_PER_QUESTION = 12

export default function UnitConvert({ onBack }) {
  const [phase, setPhase] = useState('select') // 'select' | 'playing' | 'results'
  const [category, setCategory] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION)
  const [totalScore, setTotalScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState(null)

  const timerRef = useRef(null)
  const feedbackRef = useRef(null)
  const scoreRef = useRef(0)
  const correctRef = useRef(0)

  const startGame = (cat) => {
    const qs = []
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      qs.push(generateUnitProblem(cat))
    }
    setCategory(cat)
    setQuestions(qs)
    setCurrentIdx(0)
    setTimeLeft(TIME_PER_QUESTION)
    setTotalScore(0)
    setCorrectCount(0)
    setFeedback(null)
    scoreRef.current = 0
    correctRef.current = 0
    setPhase('playing')
  }

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || feedback) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          handleTimeout()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, currentIdx, feedback])

  const handleTimeout = () => {
    const q = questions[currentIdx]
    if (!q) return
    setFeedback({ selected: null, correct: q.answer, isCorrect: false })
    clearInterval(timerRef.current)
    feedbackRef.current = setTimeout(() => advanceQuestion(), 1200)
  }

  const handleAnswer = (choice) => {
    if (feedback) return
    clearInterval(timerRef.current)

    const q = questions[currentIdx]
    const isCorrect = choice === q.answer
    let earned = 0

    if (isCorrect) {
      const timeBonus = Math.floor(timeLeft * 3)
      earned = 50 + timeBonus
      scoreRef.current += earned
      correctRef.current += 1
      setTotalScore(scoreRef.current)
      setCorrectCount(correctRef.current)
    }

    setFeedback({ selected: choice, correct: q.answer, isCorrect, earned })
    feedbackRef.current = setTimeout(() => advanceQuestion(), 1200)
  }

  const advanceQuestion = () => {
    setFeedback(null)

    if (currentIdx + 1 >= TOTAL_QUESTIONS) {
      finishGame()
    } else {
      setCurrentIdx(i => i + 1)
      setTimeLeft(TIME_PER_QUESTION)
    }
  }

  const finishGame = () => {
    clearInterval(timerRef.current)
    clearTimeout(feedbackRef.current)
    setPhase('results')

    const finalScore = scoreRef.current
    try {
      addScore(finalScore)
      updateRecord('unitConvert', null, finalScore)
      if (correctRef.current >= 16) addDiamonds(3)
      else if (correctRef.current >= 10) addDiamonds(1)
    } catch (e) { /* storage error */ }
  }

  const getMedal = () => {
    const pct = correctRef.current / TOTAL_QUESTIONS
    if (pct >= 0.9) return { emoji: '🥇', label: '금메달', color: '#FFD700' }
    if (pct >= 0.7) return { emoji: '🥈', label: '은메달', color: '#C0C0C0' }
    if (pct >= 0.5) return { emoji: '🥉', label: '동메달', color: '#CD7F32' }
    return { emoji: '📝', label: '다음엔 더 잘할 수 있어요!', color: '#888' }
  }

  const getCatInfo = () => CATEGORIES.find(c => c.key === category) || CATEGORIES[0]

  // Cleanup
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      clearTimeout(feedbackRef.current)
    }
  }, [])

  // ============ CATEGORY SELECT ============
  if (phase === 'select') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>📏</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>단위 변환 퀴즈</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 32, lineHeight: 1.6 }}>
          길이, 무게, 부피의 단위를 변환해보세요!<br />
          문제당 12초, 총 20문제입니다.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => startGame(cat.key)}
              style={{
                padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                fontSize: 16, fontWeight: 700, color: '#FFF',
                background: cat.color,
                textAlign: 'center',
              }}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ============ RESULTS ============
  if (phase === 'results') {
    const medal = getMedal()
    const pct = Math.round((correctRef.current / TOTAL_QUESTIONS) * 100)
    const catInfo = getCatInfo()

    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{
          padding: '32px 20px', borderRadius: 20,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          border: '2px solid #F1C40F',
        }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>{medal.emoji}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{medal.label}</div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>{catInfo.icon} {catInfo.label}</div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: catInfo.color }}>{totalScore}</div>
              <div style={{ fontSize: 11, color: '#888' }}>점수</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#06D6A0' }}>{correctCount}</div>
              <div style={{ fontSize: 11, color: '#888' }}>정답</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#EF476F' }}>{TOTAL_QUESTIONS - correctCount}</div>
              <div style={{ fontSize: 11, color: '#888' }}>오답</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#333' }}>{pct}%</div>
              <div style={{ fontSize: 11, color: '#888' }}>정답률</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => startGame(category)}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: catInfo.color, color: '#FFF', fontSize: 14, fontWeight: 600 }}>
              다시 하기
            </button>
            <button onClick={() => setPhase('select')}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
              카테고리 선택
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============ PLAYING ============
  const q = questions[currentIdx]
  if (!q) return null

  const catInfo = getCatInfo()
  const unitIcon = q.unitType ? (UNIT_ICONS[q.unitType] || '🔢') : catInfo.icon

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Header */}
      <div style={{ background: catInfo.color, color: '#FFF', padding: '1.5rem 1.25rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <button onClick={() => { clearInterval(timerRef.current); clearTimeout(feedbackRef.current); setPhase('select') }}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 그만하기
          </button>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <span>⭐ {totalScore}</span>
            <span>✅ {correctCount}/{currentIdx + (feedback ? 1 : 0)}</span>
            <span>⏱ {timeLeft}초</span>
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>
          단위 변환 — {catInfo.icon} {catInfo.label}
        </div>
      </div>

      {/* Progress */}
      <div style={{ padding: '0 16px', marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#999', marginBottom: 4 }}>
          <span>{currentIdx + 1} / {TOTAL_QUESTIONS}</span>
        </div>
        <div style={{ height: 6, background: '#EEE', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: catInfo.color,
            width: `${((currentIdx + (feedback ? 1 : 0)) / TOTAL_QUESTIONS) * 100}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{ height: 4, background: '#EEE', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: timeLeft <= 4 ? '#EF476F' : '#06D6A0',
            width: `${(timeLeft / TIME_PER_QUESTION) * 100}%`,
            transition: 'width 1s linear',
          }} />
        </div>
      </div>

      {/* Question area */}
      <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        {/* Unit type icon */}
        <div style={{ fontSize: 36, marginBottom: 12 }}>{unitIcon}</div>

        {/* Question text */}
        <div style={{
          fontSize: 28, fontWeight: 700, marginBottom: 32, lineHeight: 1.4,
          color: '#333',
        }}>
          {q.question}
        </div>

        {/* 4 choice buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 340, margin: '0 auto' }}>
          {q.choices.map((choice, i) => {
            let bg = '#FFF'
            let borderColor = '#E0E0E0'
            let textColor = '#333'

            if (feedback) {
              if (String(choice) === String(q.answer)) {
                bg = '#D4EDDA'
                borderColor = '#06D6A0'
                textColor = '#155724'
              } else if (String(choice) === String(feedback.selected)) {
                bg = '#F8D7DA'
                borderColor = '#EF476F'
                textColor = '#721C24'
              }
            }

            return (
              <button key={i}
                onClick={() => handleAnswer(choice)}
                disabled={!!feedback}
                style={{
                  padding: '14px 10px', borderRadius: 14,
                  border: `2px solid ${borderColor}`,
                  background: bg, color: textColor,
                  fontSize: 18, fontWeight: 600, cursor: feedback ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  opacity: feedback && String(choice) !== String(q.answer) && String(choice) !== String(feedback.selected) ? 0.5 : 1,
                }}
              >
                {choice}
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {feedback && (
          <div style={{
            marginTop: 16, fontSize: 15, fontWeight: 700,
            color: feedback.isCorrect ? '#06D6A0' : '#EF476F',
          }}>
            {feedback.isCorrect
              ? `정답! +${feedback.earned}점`
              : feedback.selected === null
                ? `시간 초과! 정답: ${q.answer}`
                : `오답! 정답: ${q.answer}`
            }
          </div>
        )}
      </div>
    </div>
  )
}
