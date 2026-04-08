import { useState, useEffect, useRef } from 'react'
import { generateClockProblem } from '../data/mathData'
import { getData, addScore, addDiamonds, updateRecord } from '../utils/mathStorage'

function AnalogClock({ hour, minute, size = 200 }) {
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.42

  // Hour hand
  const hourAngle = ((hour % 12) + minute / 60) * 30 - 90
  const hourRad = hourAngle * Math.PI / 180
  const hourLen = r * 0.55
  const hx = cx + hourLen * Math.cos(hourRad)
  const hy = cy + hourLen * Math.sin(hourRad)

  // Minute hand
  const minuteAngle = minute * 6 - 90
  const minuteRad = minuteAngle * Math.PI / 180
  const minuteLen = r * 0.8
  const mx = cx + minuteLen * Math.cos(minuteRad)
  const my = cy + minuteLen * Math.sin(minuteRad)

  // Hour marks & numbers
  const hourMarks = []
  const numberLabels = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 - 90) * Math.PI / 180
    const outerR = r * 0.95
    const innerR = i % 3 === 0 ? r * 0.82 : r * 0.88
    const x1 = cx + innerR * Math.cos(angle)
    const y1 = cy + innerR * Math.sin(angle)
    const x2 = cx + outerR * Math.cos(angle)
    const y2 = cy + outerR * Math.sin(angle)
    hourMarks.push(
      <line key={`h-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="#333" strokeWidth={i % 3 === 0 ? 3 : 1.5} strokeLinecap="round" />
    )
  }

  // Minute marks
  const minuteMarks = []
  for (let i = 0; i < 60; i++) {
    if (i % 5 === 0) continue // skip hour positions
    const angle = (i * 6 - 90) * Math.PI / 180
    const outerR = r * 0.95
    const innerR = r * 0.92
    const x1 = cx + innerR * Math.cos(angle)
    const y1 = cy + innerR * Math.sin(angle)
    const x2 = cx + outerR * Math.cos(angle)
    const y2 = cy + outerR * Math.sin(angle)
    minuteMarks.push(
      <line key={`m-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="#AAA" strokeWidth={0.8} strokeLinecap="round" />
    )
  }

  // Number positions for 12, 3, 6, 9
  const keyNumbers = [
    { num: 12, angle: -90 },
    { num: 3, angle: 0 },
    { num: 6, angle: 90 },
    { num: 9, angle: 180 },
  ]

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto' }}>
      {/* Clock face */}
      <circle cx={cx} cy={cy} r={r + 4} fill="#FFF" stroke="#DDD" strokeWidth={3} />
      <circle cx={cx} cy={cy} r={r} fill="#FAFAFA" stroke="#CCC" strokeWidth={1} />

      {/* Minute marks */}
      {minuteMarks}

      {/* Hour marks */}
      {hourMarks}

      {/* Numbers 12, 3, 6, 9 */}
      {keyNumbers.map(({ num, angle }) => {
        const rad = angle * Math.PI / 180
        const nr = r * 0.7
        const nx = cx + nr * Math.cos(rad)
        const ny = cy + nr * Math.sin(rad) + (size * 0.025)
        return (
          <text key={num} x={nx} y={ny} textAnchor="middle" dominantBaseline="middle"
            fontSize={size * 0.09} fontWeight={700} fill="#555" fontFamily="sans-serif">
            {num}
          </text>
        )
      })}

      {/* Hour hand */}
      <line x1={cx} y1={cy} x2={hx} y2={hy}
        stroke="#333" strokeWidth={4.5} strokeLinecap="round" />

      {/* Minute hand */}
      <line x1={cx} y1={cy} x2={mx} y2={my}
        stroke="#4895EF" strokeWidth={3} strokeLinecap="round" />

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={5} fill="#333" />
      <circle cx={cx} cy={cy} r={2.5} fill="#FFF" />
    </svg>
  )
}

const LEVELS = [
  { key: 1, label: 'Lv.1 정각', desc: '1시, 2시, 3시...', color: '#06D6A0' },
  { key: 2, label: 'Lv.2 30분', desc: '1시 30분, 2시 30분...', color: '#4895EF' },
  { key: 3, label: 'Lv.3 15분', desc: '15분 단위', color: '#F39C12' },
  { key: 4, label: 'Lv.4 5분 단위', desc: '5분 단위로 읽기', color: '#EF476F' },
  { key: 5, label: 'Lv.5 1분 단위', desc: '정확한 시간 읽기', color: '#7B2FF7' },
]

const TOTAL_QUESTIONS = 15
const TIME_PER_QUESTION = 20

export default function ClockReading({ onBack }) {
  const [phase, setPhase] = useState('select') // 'select' | 'playing' | 'results'
  const [level, setLevel] = useState(null)
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

  const startGame = (lv) => {
    const qs = []
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      qs.push(generateClockProblem(lv))
    }
    setLevel(lv)
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
    feedbackRef.current = setTimeout(() => advanceQuestion(), 1500)
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
      updateRecord('clockReading', null, finalScore)
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
        <div style={{ fontSize: 64, marginBottom: 12 }}>🕐</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>시계 읽기</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 32, lineHeight: 1.6 }}>
          시계를 보고 시간을 맞춰보세요!<br />
          총 15문제, 4개 중에 골라요.
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
          시계 읽기 — {lvLabel}
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
            background: color,
            width: `${((currentIdx + (feedback ? 1 : 0)) / TOTAL_QUESTIONS) * 100}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>
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
        {/* Analog clock */}
        <div style={{ marginBottom: 20 }}>
          <AnalogClock hour={q.hour} minute={q.minute} size={200} />
        </div>

        {/* Question text */}
        <div style={{
          fontSize: 18, fontWeight: 700, marginBottom: 24, lineHeight: 1.5,
          color: '#333',
        }}>
          이 시계가 가리키는 시간은?
        </div>

        {/* 4 choice buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 320, margin: '0 auto' }}>
          {q.choices.map((choice, i) => {
            let bg = '#FFF'
            let borderColor = '#E0E0E0'
            let textColor = '#333'

            if (feedback) {
              if (choice === q.answer) {
                bg = '#D4EDDA'
                borderColor = '#06D6A0'
                textColor = '#155724'
              } else if (choice === feedback.selected) {
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
                  fontSize: 20, fontWeight: 700, cursor: feedback ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  opacity: feedback && choice !== q.answer && choice !== feedback.selected ? 0.5 : 1,
                  fontFamily: 'monospace',
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
