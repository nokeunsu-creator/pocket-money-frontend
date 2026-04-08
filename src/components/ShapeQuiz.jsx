import { useState, useEffect, useRef, useCallback } from 'react'
import { generateShapeProblem } from '../data/mathData'
import { getData, addScore, addDiamonds, updateRecord, updateDailyChallenge } from '../utils/mathStorage'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function drawShape(shapeName, size = 120) {
  const half = size / 2
  const colors = ['#FFB3BA', '#BAE1FF', '#BAFFC9', '#FFFFBA', '#E8BAFF', '#FFD9BA']
  const color = colors[Math.abs(shapeName.length * 7) % colors.length]

  const svgProps = {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    style: { display: 'block', margin: '0 auto' },
  }

  switch (shapeName) {
    case '원': {
      const r = half * 0.8
      return (
        <svg {...svgProps}>
          <circle cx={half} cy={half} r={r} fill="#FFB3BA" stroke="#E8879A" strokeWidth={2} />
        </svg>
      )
    }
    case '삼각형': {
      const m = size * 0.1
      const pts = `${half},${m} ${size - m},${size - m} ${m},${size - m}`
      return (
        <svg {...svgProps}>
          <polygon points={pts} fill="#BAFFC9" stroke="#7ACC8A" strokeWidth={2} />
        </svg>
      )
    }
    case '직사각형': {
      const w = size * 0.85
      const h = size * 0.55
      const x = (size - w) / 2
      const y = (size - h) / 2
      return (
        <svg {...svgProps}>
          <rect x={x} y={y} width={w} height={h} rx={3} fill="#BAE1FF" stroke="#7AB8E0" strokeWidth={2} />
        </svg>
      )
    }
    case '정사각형': {
      const s = size * 0.7
      const x = (size - s) / 2
      const y = (size - s) / 2
      return (
        <svg {...svgProps}>
          <rect x={x} y={y} width={s} height={s} rx={3} fill="#FFFFBA" stroke="#D4D47A" strokeWidth={2} />
        </svg>
      )
    }
    case '오각형': {
      const r = half * 0.75
      const pts = Array.from({ length: 5 }, (_, i) => {
        const angle = (i * 72 - 90) * Math.PI / 180
        return `${half + r * Math.cos(angle)},${half + r * Math.sin(angle)}`
      }).join(' ')
      return (
        <svg {...svgProps}>
          <polygon points={pts} fill="#E8BAFF" stroke="#C08AE0" strokeWidth={2} />
        </svg>
      )
    }
    case '육각형': {
      const r = half * 0.75
      const pts = Array.from({ length: 6 }, (_, i) => {
        const angle = (i * 60 - 90) * Math.PI / 180
        return `${half + r * Math.cos(angle)},${half + r * Math.sin(angle)}`
      }).join(' ')
      return (
        <svg {...svgProps}>
          <polygon points={pts} fill="#FFD9BA" stroke="#D4A87A" strokeWidth={2} />
        </svg>
      )
    }
    case '마름모': {
      const r = half * 0.75
      const pts = `${half},${half - r} ${half + r * 0.7},${half} ${half},${half + r} ${half - r * 0.7},${half}`
      return (
        <svg {...svgProps}>
          <polygon points={pts} fill="#BAFFC9" stroke="#7ACC8A" strokeWidth={2} />
        </svg>
      )
    }
    case '사다리꼴': {
      const m = size * 0.1
      const topW = size * 0.4
      const topX = (size - topW) / 2
      const pts = `${topX},${m + size * 0.15} ${topX + topW},${m + size * 0.15} ${size - m},${size - m} ${m},${size - m}`
      return (
        <svg {...svgProps}>
          <polygon points={pts} fill="#BAE1FF" stroke="#7AB8E0" strokeWidth={2} />
        </svg>
      )
    }
    case '평행사변형': {
      const m = size * 0.1
      const offset = size * 0.2
      const pts = `${m + offset},${m + size * 0.2} ${size - m},${m + size * 0.2} ${size - m - offset},${size - m - size * 0.2} ${m},${size - m - size * 0.2}`
      return (
        <svg {...svgProps}>
          <polygon points={pts} fill="#FFFFBA" stroke="#D4D47A" strokeWidth={2} />
        </svg>
      )
    }
    default: {
      return (
        <svg {...svgProps}>
          <circle cx={half} cy={half} r={half * 0.6} fill="#EEE" stroke="#CCC" strokeWidth={2} />
          <text x={half} y={half + 5} textAnchor="middle" fontSize={14} fill="#999">?</text>
        </svg>
      )
    }
  }
}

const LEVELS = [
  { key: 1, label: 'Lv.1 도형이름', desc: '도형의 이름을 맞춰보세요', color: '#06D6A0' },
  { key: 2, label: 'Lv.2 변의 수', desc: '변의 개수를 맞춰보세요', color: '#4895EF' },
  { key: 3, label: 'Lv.3 둘레', desc: '둘레를 계산해보세요', color: '#F39C12' },
  { key: 4, label: 'Lv.4 넓이', desc: '넓이를 계산해보세요', color: '#EF476F' },
  { key: 5, label: 'Lv.5 종합', desc: '모든 유형이 섞여 나와요', color: '#7B2FF7' },
]

const TOTAL_QUESTIONS = 15
const TIME_PER_QUESTION = 15

export default function ShapeQuiz({ onBack }) {
  const [phase, setPhase] = useState('select') // 'select' | 'playing' | 'results'
  const [level, setLevel] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION)
  const [totalScore, setTotalScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState(null) // null | { selected, correct, isCorrect }
  const [selectedAnswer, setSelectedAnswer] = useState(null)

  const timerRef = useRef(null)
  const feedbackRef = useRef(null)
  const scoreRef = useRef(0)
  const correctRef = useRef(0)

  // Generate all questions for the level
  const startGame = (lv) => {
    const qs = []
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      qs.push(generateShapeProblem(lv))
    }
    setLevel(lv)
    setQuestions(qs)
    setCurrentIdx(0)
    setTimeLeft(TIME_PER_QUESTION)
    setTotalScore(0)
    setCorrectCount(0)
    setFeedback(null)
    setSelectedAnswer(null)
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

    setSelectedAnswer(choice)
    setFeedback({ selected: choice, correct: q.answer, isCorrect, earned })

    feedbackRef.current = setTimeout(() => advanceQuestion(), 1200)
  }

  const advanceQuestion = () => {
    setFeedback(null)
    setSelectedAnswer(null)

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
      updateRecord('shapeQuiz', null, finalScore)
      updateDailyChallenge('shape')
      if (correctRef.current >= 12) addDiamonds(3)
      else if (correctRef.current >= 8) addDiamonds(1)
    } catch (e) { /* storage error */ }
  }

  const getMedal = () => {
    const pct = correctRef.current / TOTAL_QUESTIONS
    if (pct >= 0.9) return { emoji: '🥇', label: '금메달', color: '#FFD700' }
    if (pct >= 0.7) return { emoji: '🥈', label: '은메달', color: '#C0C0C0' }
    if (pct >= 0.5) return { emoji: '🥉', label: '동메달', color: '#CD7F32' }
    return { emoji: '📝', label: '다음엔 더 잘할 수 있어요!', color: '#888' }
  }

  const getLevelColor = () => {
    const lv = LEVELS.find(l => l.key === level)
    return lv ? lv.color : '#4895EF'
  }

  // Cleanup
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      clearTimeout(feedbackRef.current)
    }
  }, [])

  // ============ LEVEL SELECT ============
  if (phase === 'select') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>📐</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>도형 퀴즈</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 32, lineHeight: 1.6 }}>
          도형의 이름, 변의 수, 둘레, 넓이를 맞춰보세요!<br />
          문제당 15초, 총 15문제입니다.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
          {LEVELS.map(lv => (
            <button key={lv.key} onClick={() => startGame(lv.key)}
              style={{
                padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                fontSize: 16, fontWeight: 700, color: '#FFF',
                background: lv.color,
                textAlign: 'center',
              }}>
              {lv.label}
              <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.85, marginTop: 2 }}>{lv.desc}</div>
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
    const color = getLevelColor()
    const lvLabel = LEVELS.find(l => l.key === level)?.label || ''

    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{
          padding: '32px 20px', borderRadius: 20,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          border: '2px solid #F1C40F',
        }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>{medal.emoji}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{medal.label}</div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>{lvLabel}</div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color }}>{totalScore}</div>
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
            <button onClick={() => startGame(level)}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: color, color: '#FFF', fontSize: 14, fontWeight: 600 }}>
              다시 하기
            </button>
            <button onClick={() => setPhase('select')}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
              레벨 선택
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============ PLAYING ============
  const q = questions[currentIdx]
  if (!q) return null

  const color = getLevelColor()
  const lvLabel = LEVELS.find(l => l.key === level)?.label || ''

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Header */}
      <div style={{ background: color, color: '#FFF', padding: '1.5rem 1.25rem 1.25rem' }}>
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
          도형 퀴즈 — {lvLabel}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '0 16px', marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#999', marginBottom: 4 }}>
          <span>{currentIdx + 1} / {TOTAL_QUESTIONS}</span>
        </div>
        <div style={{ height: 6, background: '#EEE', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: color,
            width: `${((currentIdx + (feedback ? 1 : 0)) / TOTAL_QUESTIONS) * 100}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>
        {/* Timer bar */}
        <div style={{ height: 4, background: '#EEE', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: timeLeft <= 5 ? '#EF476F' : '#06D6A0',
            width: `${(timeLeft / TIME_PER_QUESTION) * 100}%`,
            transition: 'width 1s linear',
          }} />
        </div>
      </div>

      {/* Question area */}
      <div style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
        {/* Shape SVG if applicable */}
        {q.shape && (
          <div style={{ marginBottom: 16 }}>
            {drawShape(q.shape, 130)}
          </div>
        )}

        {/* Question text */}
        <div style={{
          fontSize: 20, fontWeight: 700, marginBottom: 24, lineHeight: 1.5,
          color: '#333', minHeight: 56,
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
                  fontSize: 16, fontWeight: 600, cursor: feedback ? 'default' : 'pointer',
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
