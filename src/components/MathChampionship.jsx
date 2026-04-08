import { useState, useEffect, useRef, useCallback } from 'react'
import { generateArithmeticProblem, generateFractionProblem, generateShapeProblem, generateUnitProblem, generateClockProblem } from '../data/mathData'
import { getData, addScore, addDiamonds, updateRecord } from '../utils/mathStorage'

// ============ HELPERS ============

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getLevelRange(difficulty) {
  switch (difficulty) {
    case 'easy': return [1, 2]
    case 'medium': return [3, 4]
    case 'hard': return [5, 7]
    default: return [1, 2]
  }
}

function randLevel(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getTimePerQuestion(difficulty) {
  switch (difficulty) {
    case 'easy': return 15
    case 'medium': return 12
    case 'hard': return 10
    default: return 15
  }
}

function generateQuestions(difficulty) {
  const [minLv, maxLv] = getLevelRange(difficulty)
  const questions = []

  // 6 arithmetic
  for (let i = 0; i < 6; i++) {
    const lv = randLevel(minLv, maxLv)
    const p = generateArithmeticProblem(lv)
    questions.push({ type: 'arithmetic', ...p })
  }

  // 4 fraction
  for (let i = 0; i < 4; i++) {
    const lv = randLevel(minLv, maxLv)
    const p = generateFractionProblem(lv)
    questions.push({ type: 'fraction', ...p })
  }

  // 4 shape
  for (let i = 0; i < 4; i++) {
    const lv = randLevel(minLv, maxLv)
    const p = generateShapeProblem(lv)
    questions.push({ type: 'shape', ...p })
  }

  // 3 unit conversion
  for (let i = 0; i < 3; i++) {
    const lv = randLevel(minLv, maxLv)
    const p = generateUnitProblem(lv)
    questions.push({ type: 'unit', ...p })
  }

  // 3 clock reading
  for (let i = 0; i < 3; i++) {
    const lv = randLevel(minLv, maxLv)
    const p = generateClockProblem(lv)
    questions.push({ type: 'clock', ...p })
  }

  return shuffleArray(questions)
}

// ============ MINI COMPONENTS ============

function MiniClock({ hour, minute }) {
  const size = 150
  const cx = size / 2, cy = size / 2, r = size / 2 - 10

  const hourAngle = ((hour % 12) + minute / 60) * 30 - 90
  const minuteAngle = minute * 6 - 90

  const hourRad = (hourAngle * Math.PI) / 180
  const minuteRad = (minuteAngle * Math.PI) / 180

  const hourLen = r * 0.5
  const minuteLen = r * 0.75

  const hourX = cx + hourLen * Math.cos(hourRad)
  const hourY = cy + hourLen * Math.sin(hourRad)
  const minuteX = cx + minuteLen * Math.cos(minuteRad)
  const minuteY = cy + minuteLen * Math.sin(minuteRad)

  const numbers = [
    { n: 12, angle: -90 },
    { n: 3, angle: 0 },
    { n: 6, angle: 90 },
    { n: 9, angle: 180 },
  ]

  return (
    <svg width={size} height={size} style={{ display: 'block', margin: '0 auto 16px' }}>
      <circle cx={cx} cy={cy} r={r} fill="#FFF9E6" stroke="#333" strokeWidth={3} />
      {numbers.map(({ n, angle }) => {
        const rad = (angle * Math.PI) / 180
        const tx = cx + (r - 18) * Math.cos(rad)
        const ty = cy + (r - 18) * Math.sin(rad)
        return (
          <text key={n} x={tx} y={ty} textAnchor="middle" dominantBaseline="central"
            fontSize={14} fontWeight={700} fill="#333">
            {n}
          </text>
        )
      })}
      {/* tick marks */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 - 90) * Math.PI / 180
        const x1 = cx + (r - 4) * Math.cos(a)
        const y1 = cy + (r - 4) * Math.sin(a)
        const x2 = cx + (r - 10) * Math.cos(a)
        const y2 = cy + (r - 10) * Math.sin(a)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#999" strokeWidth={1.5} />
      })}
      {/* hour hand */}
      <line x1={cx} y1={cy} x2={hourX} y2={hourY} stroke="#333" strokeWidth={4} strokeLinecap="round" />
      {/* minute hand */}
      <line x1={cx} y1={cy} x2={minuteX} y2={minuteY} stroke="#4895EF" strokeWidth={2.5} strokeLinecap="round" />
      {/* center dot */}
      <circle cx={cx} cy={cy} r={4} fill="#333" />
    </svg>
  )
}

function MiniShape({ shape }) {
  const s = 80
  const fill = '#B8D4E3'
  const stroke = '#4895EF'

  const shapes = {
    circle: <circle cx={40} cy={40} r={30} fill={fill} stroke={stroke} strokeWidth={2} />,
    triangle: <polygon points="40,10 10,70 70,70" fill={fill} stroke={stroke} strokeWidth={2} />,
    rectangle: <rect x={10} y={20} width={60} height={40} fill={fill} stroke={stroke} strokeWidth={2} />,
    square: <rect x={15} y={15} width={50} height={50} fill={fill} stroke={stroke} strokeWidth={2} />,
    pentagon: (() => {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 72 - 90) * Math.PI / 180
        return `${40 + 30 * Math.cos(a)},${40 + 30 * Math.sin(a)}`
      }).join(' ')
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={2} />
    })(),
    hexagon: (() => {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (i * 60 - 90) * Math.PI / 180
        return `${40 + 30 * Math.cos(a)},${40 + 30 * Math.sin(a)}`
      }).join(' ')
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={2} />
    })(),
    diamond: <polygon points="40,10 70,40 40,70 10,40" fill={fill} stroke={stroke} strokeWidth={2} />,
    parallelogram: <polygon points="20,60 10,20 60,20 70,60" fill={fill} stroke={stroke} strokeWidth={2} />,
    trapezoid: <polygon points="25,20 55,20 70,60 10,60" fill={fill} stroke={stroke} strokeWidth={2} />,
    oval: <ellipse cx={40} cy={40} rx={35} ry={22} fill={fill} stroke={stroke} strokeWidth={2} />,
  }

  return (
    <svg width={s} height={s} style={{ display: 'block', margin: '0 auto 12px' }}>
      {shapes[shape] || shapes.circle}
    </svg>
  )
}

// Try to detect the shape english name from the question text
function detectShapeFromQuestion(q) {
  if (!q || !q.text) return null
  const shapeMap = {
    '원': 'circle', '삼각형': 'triangle', '사각형': 'rectangle',
    '정사각형': 'square', '오각형': 'pentagon', '육각형': 'hexagon',
    '마름모': 'diamond', '평행사변형': 'parallelogram',
    '사다리꼴': 'trapezoid', '타원': 'oval', '직사각형': 'rectangle',
  }
  // Check text for shape keyword
  const text = q.text
  // Also check if the text contains english shape name (e.g. "(circle)")
  const enMatch = text.match(/\((\w+)\)/)
  if (enMatch && enMatch[1]) return enMatch[1]
  for (const [kr, en] of Object.entries(shapeMap)) {
    if (text.includes(kr)) return en
  }
  return null
}

// ============ DIFFICULTIES ============

const DIFFICULTIES = [
  { key: 'easy', label: '초급', stars: '\u2B50', color: '#06D6A0', desc: '기본 연산, 쉬운 문제' },
  { key: 'medium', label: '중급', stars: '\u2B50\u2B50', color: '#4895EF', desc: '곱셈 나눗셈, 분수 계산' },
  { key: 'hard', label: '고급', stars: '\u2B50\u2B50\u2B50', color: '#EF476F', desc: '복합 연산, 큰 수' },
]

// ============ MAIN COMPONENT ============

export default function MathChampionship({ onBack }) {
  const [phase, setPhase] = useState('select') // select | playing | result
  const [difficulty, setDifficulty] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [feedback, setFeedback] = useState(null) // null | 'correct' | 'wrong' | 'timeout'
  const [answered, setAnswered] = useState(false)
  const [selectedChoice, setSelectedChoice] = useState(null)
  const [scorePopup, setScorePopup] = useState(null)
  const [totalTimeUsed, setTotalTimeUsed] = useState(0)

  const timerRef = useRef(null)
  const feedbackTimerRef = useRef(null)
  const scoreRef = useRef(0)
  const correctRef = useRef(0)
  const totalTimeRef = useRef(0)
  const questionStartRef = useRef(0)

  const startGame = useCallback((diff) => {
    const qs = generateQuestions(diff)
    setDifficulty(diff)
    setQuestions(qs)
    setCurrentQ(0)
    setScore(0)
    setCorrectCount(0)
    setTotalTimeUsed(0)
    scoreRef.current = 0
    correctRef.current = 0
    totalTimeRef.current = 0
    setFeedback(null)
    setAnswered(false)
    setSelectedChoice(null)
    setScorePopup(null)
    setPhase('playing')

    const t = getTimePerQuestion(diff)
    setTimeLeft(t)
    questionStartRef.current = Date.now()
  }, [])

  // Timer per question
  useEffect(() => {
    if (phase !== 'playing' || answered) return
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
  }, [phase, currentQ, answered, difficulty])

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  const handleTimeout = () => {
    if (answered) return
    setAnswered(true)
    setFeedback('timeout')
    clearInterval(timerRef.current)

    const maxTime = getTimePerQuestion(difficulty)
    totalTimeRef.current += maxTime
    setTotalTimeUsed(totalTimeRef.current)

    feedbackTimerRef.current = setTimeout(nextQuestion, 2000)
  }

  const handleChoice = (choice) => {
    if (answered) return
    setAnswered(true)
    setSelectedChoice(choice)
    clearInterval(timerRef.current)

    const maxTime = getTimePerQuestion(difficulty)
    const elapsed = maxTime - timeLeft
    totalTimeRef.current += elapsed
    setTotalTimeUsed(totalTimeRef.current)

    const q = questions[currentQ]
    const isCorrect = String(choice) === String(q.answer)

    if (isCorrect) {
      const basePoints = 50
      const timeBonus = Math.max(0, timeLeft) * 5
      const points = basePoints + timeBonus
      const newScore = scoreRef.current + points
      const newCorrect = correctRef.current + 1
      scoreRef.current = newScore
      correctRef.current = newCorrect
      setScore(newScore)
      setCorrectCount(newCorrect)
      setFeedback('correct')
      setScorePopup(`+${points}`)
    } else {
      setFeedback('wrong')
      setScorePopup(null)
    }

    const delay = isCorrect ? 1000 : 2000
    feedbackTimerRef.current = setTimeout(nextQuestion, delay)
  }

  const nextQuestion = () => {
    const next = currentQ + 1
    if (next >= questions.length) {
      setPhase('result')
      return
    }
    setCurrentQ(next)
    setFeedback(null)
    setAnswered(false)
    setSelectedChoice(null)
    setScorePopup(null)
    const t = getTimePerQuestion(difficulty)
    setTimeLeft(t)
    questionStartRef.current = Date.now()
  }

  // Save results
  useEffect(() => {
    if (phase !== 'result') return
    const finalScore = scoreRef.current
    const finalCorrect = correctRef.current
    if (finalScore > 0) addScore(finalScore)
    updateRecord('championship', difficulty, finalScore)

    // Award diamonds based on medal
    if (finalScore >= 900) addDiamonds(10)
    else if (finalScore >= 700) addDiamonds(5)
    else if (finalScore >= 500) addDiamonds(2)
    else addDiamonds(1)
  }, [phase])

  const currentQuestion = questions[currentQ] || null
  const maxTime = getTimePerQuestion(difficulty)
  const diffConfig = DIFFICULTIES.find(d => d.key === difficulty)
  const diffColor = diffConfig?.color || '#4895EF'

  // ============ DIFFICULTY SELECT SCREEN ============
  if (phase === 'select') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🏆</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>수학 왕 선발전</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 32, lineHeight: 1.6 }}>
          다양한 수학 문제 20문항에 도전!<br />
          사칙연산, 분수, 도형, 단위변환, 시계읽기
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300, margin: '0 auto' }}>
          {DIFFICULTIES.map(d => (
            <button key={d.key} onClick={() => startGame(d.key)}
              style={{
                padding: '18px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                fontSize: 16, fontWeight: 700, color: '#FFF',
                background: d.color,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
              <span>{d.label} {d.stars}</span>
              <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.85 }}>{d.desc}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ============ RESULT SCREEN ============
  if (phase === 'result') {
    const finalScore = scoreRef.current
    const finalCorrect = correctRef.current
    const avgTime = finalCorrect > 0
      ? (totalTimeRef.current / 20).toFixed(1)
      : '-'

    let medal, medalText, medalColor
    if (finalScore >= 900) {
      medal = '\uD83E\uDD47'; medalText = '\uAE08\uBA54\uB2EC!'; medalColor = '#F1C40F'
    } else if (finalScore >= 700) {
      medal = '\uD83E\uDD48'; medalText = '\uC740\uBA54\uB2EC!'; medalColor = '#95A5A6'
    } else if (finalScore >= 500) {
      medal = '\uD83E\uDD49'; medalText = '\uB3D9\uBA54\uB2EC!'; medalColor = '#CD7F32'
    } else {
      medal = '\uD83D\uDCAA'; medalText = '\uB2E4\uC74C\uC5D0 \uB3C4\uC804!'; medalColor = '#888'
    }

    const diamonds = finalScore >= 900 ? 10 : finalScore >= 700 ? 5 : finalScore >= 500 ? 2 : 1
    const diffLabel = DIFFICULTIES.find(d => d.key === difficulty)?.label || ''

    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{
          padding: '32px 20px', borderRadius: 20,
          background: finalScore >= 700
            ? 'linear-gradient(135deg, #FFF9E6, #FFF3CD)'
            : 'linear-gradient(135deg, #F8F9FA, #E9ECEF)',
          border: `2px solid ${medalColor}`,
        }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>{medal}</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: medalColor }}>{medalText}</div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>수학 왕 선발전 - {diffLabel}</div>

          <div style={{
            fontSize: 48, fontWeight: 700, color: '#333', marginBottom: 4, marginTop: 16,
          }}>
            {finalScore}
          </div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>총점</div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#06D6A0' }}>{finalCorrect}</div>
              <div style={{ fontSize: 11, color: '#888' }}>정답 / 20</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#EF476F' }}>{20 - finalCorrect}</div>
              <div style={{ fontSize: 11, color: '#888' }}>오답</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#4895EF' }}>{avgTime}s</div>
              <div style={{ fontSize: 11, color: '#888' }}>평균 시간</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#F39C12' }}>+{diamonds}</div>
              <div style={{ fontSize: 11, color: '#888' }}>\uD83D\uDC8E 보상</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => startGame(difficulty)}
              style={{
                padding: '12px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: diffColor, color: '#FFF', fontSize: 14, fontWeight: 600,
              }}>
              다시 도전
            </button>
            <button onClick={() => { setPhase('select'); setDifficulty(null) }}
              style={{
                padding: '12px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600,
              }}>
              난이도 변경
            </button>
            <button onClick={onBack}
              style={{
                padding: '12px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600,
              }}>
              돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============ PLAYING SCREEN ============
  if (!currentQuestion) return null

  const timerPct = (timeLeft / maxTime) * 100
  const timerColor = timeLeft <= 3 ? '#EF476F' : timeLeft <= 6 ? '#F39C12' : '#06D6A0'
  const progressPct = ((currentQ + 1) / 20) * 100

  const shapeName = currentQuestion.type === 'shape' ? detectShapeFromQuestion(currentQuestion) : null

  // Build choices - arithmetic problems from generateArithmeticProblem don't have choices
  // They just have { text, answer }. We need to generate choices for them.
  let choices = currentQuestion.choices
  if (!choices) {
    // generate 4 choices for arithmetic answers
    const ans = currentQuestion.answer
    const choiceSet = new Set()
    choiceSet.add(ans)
    let attempts = 0
    while (choiceSet.size < 4 && attempts < 100) {
      const spread = Math.max(Math.abs(ans) * 0.3, 5)
      const offset = Math.floor(Math.random() * spread) + 1
      const wrong = ans + (Math.random() < 0.5 ? offset : -offset)
      if (wrong > 0 && wrong !== ans) choiceSet.add(wrong)
      attempts++
    }
    while (choiceSet.size < 4) choiceSet.add(ans + choiceSet.size)
    choices = shuffleArray([...choiceSet])
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Header */}
      <div style={{ background: diffColor, color: '#FFF', padding: '1.25rem 1.25rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <button onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF',
              fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
            }}>
            ← 나가기
          </button>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {currentQ + 1} / 20
          </div>
          <div style={{ fontSize: 14 }}>
            {score}점
          </div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          수학 왕 선발전
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: '#E0E0E0' }}>
        <div style={{
          height: '100%', background: diffColor,
          width: `${progressPct}%`, transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Timer bar */}
      <div style={{ height: 6, background: '#F0F0F0' }}>
        <div style={{
          height: '100%', background: timerColor,
          width: `${timerPct}%`, transition: 'width 1s linear',
        }} />
      </div>

      <div style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
        {/* Timer number */}
        <div style={{
          fontSize: 16, fontWeight: 700, marginBottom: 16,
          color: timeLeft <= 3 ? '#EF476F' : timeLeft <= 6 ? '#F39C12' : '#888',
        }}>
          \u23F1 {timeLeft}초
        </div>

        {/* Clock visualization for clock questions */}
        {currentQuestion.type === 'clock' && currentQuestion.hour !== undefined && (
          <MiniClock hour={currentQuestion.hour} minute={currentQuestion.minute} />
        )}

        {/* Shape visualization */}
        {currentQuestion.type === 'shape' && shapeName && (
          <MiniShape shape={shapeName} />
        )}

        {/* Question text */}
        <div style={{
          fontSize: currentQuestion.text.length > 30 ? 18 : 24,
          fontWeight: 700, marginBottom: 28, lineHeight: 1.5,
          color: feedback === 'correct' ? '#06D6A0' : feedback === 'wrong' || feedback === 'timeout' ? '#EF476F' : '#333',
          transition: 'color 0.2s',
          minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {currentQuestion.text}
        </div>

        {/* Score popup */}
        {scorePopup && feedback === 'correct' && (
          <div style={{
            fontSize: 20, fontWeight: 700, color: '#06D6A0', marginBottom: 12,
            animation: 'fadeIn 0.3s ease',
          }}>
            {scorePopup}
          </div>
        )}

        {/* Show correct answer on wrong/timeout */}
        {(feedback === 'wrong' || feedback === 'timeout') && (
          <div style={{
            fontSize: 14, color: '#EF476F', marginBottom: 12, fontWeight: 600,
          }}>
            {feedback === 'timeout' ? '\u23F0 시간 초과! ' : '\u274C '}
            정답: {currentQuestion.answer}
          </div>
        )}

        {/* 4 choice buttons */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          maxWidth: 340, margin: '0 auto',
        }}>
          {choices.map((choice, i) => {
            const isCorrectChoice = String(choice) === String(currentQuestion.answer)
            const isSelected = selectedChoice !== null && String(choice) === String(selectedChoice)

            let btnBg = '#FFF'
            let btnBorder = '2px solid #E0E0E0'
            let btnColor = '#333'

            if (answered) {
              if (isCorrectChoice) {
                btnBg = '#D4EDDA'
                btnBorder = '2px solid #06D6A0'
                btnColor = '#06D6A0'
              } else if (isSelected && !isCorrectChoice) {
                btnBg = '#FADBD8'
                btnBorder = '2px solid #EF476F'
                btnColor = '#EF476F'
              } else {
                btnBg = '#F8F9FA'
                btnBorder = '2px solid #E0E0E0'
                btnColor = '#AAA'
              }
            }

            return (
              <button key={i} onClick={() => handleChoice(choice)}
                disabled={answered}
                style={{
                  padding: '14px 8px', borderRadius: 12, border: btnBorder,
                  cursor: answered ? 'default' : 'pointer',
                  background: btnBg, color: btnColor,
                  fontSize: 16, fontWeight: 600,
                  transition: 'all 0.2s',
                  opacity: answered && !isCorrectChoice && !isSelected ? 0.5 : 1,
                }}>
                {choice}
              </button>
            )
          })}
        </div>

        {/* Question type badge */}
        <div style={{
          marginTop: 20, fontSize: 11, color: '#AAA',
          display: 'flex', justifyContent: 'center', gap: 8,
        }}>
          <span style={{
            padding: '2px 8px', borderRadius: 8,
            background: '#F0F0F0',
          }}>
            {currentQuestion.type === 'arithmetic' ? '\uD83E\uDDEE 사칙연산'
              : currentQuestion.type === 'fraction' ? '\uD83C\uDF70 분수'
              : currentQuestion.type === 'shape' ? '\uD83D\uDD37 도형'
              : currentQuestion.type === 'unit' ? '\uD83D\uDCCF 단위변환'
              : currentQuestion.type === 'clock' ? '\u23F0 시계읽기'
              : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
