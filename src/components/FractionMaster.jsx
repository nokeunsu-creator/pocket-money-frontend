import { useState, useEffect, useRef, useCallback } from 'react'
import { generateFractionProblem } from '../data/mathData'
import { getData, addScore, addDiamonds, updateRecord, updateDailyChallenge } from '../utils/mathStorage'

const DIFFICULTIES = [
  { key: 'beginner', label: '초급', levels: [1, 2], color: '#06D6A0', desc: '분수 이해, 같은 분모' },
  { key: 'intermediate', label: '중급', levels: [3, 4], color: '#4895EF', desc: '덧셈, 뺄셈, 약분' },
  { key: 'advanced', label: '고급', levels: [5], color: '#EF476F', desc: '다른 분모, 곱셈, 나눗셈' },
]

const TOTAL_QUESTIONS = 20
const TIME_PER_QUESTION = 15
const POINTS_PER_CORRECT = 50

function getMedal(score) {
  if (score >= 800) return { emoji: '\uD83E\uDD47', label: '금메달' }
  if (score >= 600) return { emoji: '\uD83E\uDD48', label: '은메달' }
  if (score >= 400) return { emoji: '\uD83E\uDD49', label: '동메달' }
  return null
}

export default function FractionMaster({ onBack }) {
  const [phase, setPhase] = useState('select') // 'select' | 'playing' | 'results'
  const [difficulty, setDifficulty] = useState(null)
  const [questionNum, setQuestionNum] = useState(0)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION)
  const [problem, setProblem] = useState(null)
  const [feedback, setFeedback] = useState(null) // { type, selectedIdx, correctIdx }
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)
  const [bestRecord, setBestRecord] = useState(0)
  const [results, setResults] = useState([]) // track each question result

  const timerRef = useRef(null)
  const feedbackRef = useRef(null)
  const scoreRef = useRef(0)
  const correctRef = useRef(0)
  const questionNumRef = useRef(0)

  // Load best record
  useEffect(() => {
    try {
      const data = getData()
      if (data?.records?.fractionMaster) {
        setBestRecord(data.records.fractionMaster)
      }
    } catch { /* no data */ }
  }, [])

  const nextQuestion = useCallback((diff, qNum) => {
    if (qNum >= TOTAL_QUESTIONS) {
      setPhase('results')
      return
    }
    const levels = diff.levels
    const level = levels[Math.floor(Math.random() * levels.length)]
    const p = generateFractionProblem(level)
    setProblem(p)
    setQuestionNum(qNum)
    questionNumRef.current = qNum
    setTimeLeft(TIME_PER_QUESTION)
    setFeedback(null)
    setShowCorrectAnswer(false)
  }, [])

  const startGame = (diff) => {
    setDifficulty(diff)
    setScore(0)
    setCorrectCount(0)
    setResults([])
    scoreRef.current = 0
    correctRef.current = 0
    questionNumRef.current = 0
    nextQuestion(diff, 0)
    setPhase('playing')
  }

  // Per-question timer
  useEffect(() => {
    if (phase !== 'playing' || feedback) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 0.1) {
          clearInterval(timerRef.current)
          // Time's up for this question
          handleTimeUp()
          return 0
        }
        return +(t - 0.1).toFixed(1)
      })
    }, 100)
    return () => clearInterval(timerRef.current)
  }, [phase, feedback, questionNum])

  const handleTimeUp = () => {
    if (!problem) return
    const correctIdx = problem.choices.indexOf(problem.answer)
    setFeedback({ type: 'timeout', selectedIdx: -1, correctIdx })
    setShowCorrectAnswer(true)
    setResults(prev => [...prev, { question: problem.text, correct: false }])

    feedbackRef.current = setTimeout(() => {
      const next = questionNumRef.current + 1
      if (next >= TOTAL_QUESTIONS) {
        setPhase('results')
      } else {
        nextQuestion(difficulty, next)
      }
    }, 1500)
  }

  const handleChoice = (choiceValue, choiceIdx) => {
    if (feedback) return
    if (phase !== 'playing') return
    clearInterval(timerRef.current)

    const correctIdx = problem.choices.indexOf(problem.answer)
    const isCorrect = choiceValue === problem.answer

    if (isCorrect) {
      const timeBonus = Math.round(timeLeft) * 3
      const points = POINTS_PER_CORRECT + timeBonus
      const newScore = scoreRef.current + points
      scoreRef.current = newScore
      setScore(newScore)

      const newCorrect = correctRef.current + 1
      correctRef.current = newCorrect
      setCorrectCount(newCorrect)

      setFeedback({ type: 'correct', selectedIdx: choiceIdx, correctIdx, points })
      setResults(prev => [...prev, { question: problem.text, correct: true, points }])
    } else {
      setFeedback({ type: 'wrong', selectedIdx: choiceIdx, correctIdx })
      setShowCorrectAnswer(true)
      setResults(prev => [...prev, { question: problem.text, correct: false }])
    }

    feedbackRef.current = setTimeout(() => {
      const next = questionNumRef.current + 1
      if (next >= TOTAL_QUESTIONS) {
        setPhase('results')
      } else {
        nextQuestion(difficulty, next)
      }
    }, isCorrect ? 800 : 1500)
  }

  // Save results
  useEffect(() => {
    if (phase !== 'results' || !difficulty) return
    const finalScore = scoreRef.current
    try {
      addScore(finalScore)
      updateRecord('fractionMaster', null, finalScore)
      updateDailyChallenge('fraction')
      if (finalScore > bestRecord) {
        addDiamonds(2)
        setBestRecord(finalScore)
      }
    } catch { /* storage error */ }
  }, [phase])

  // Cleanup
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      clearTimeout(feedbackRef.current)
    }
  }, [])

  const handleBack = () => {
    clearInterval(timerRef.current)
    clearTimeout(feedbackRef.current)
    if (phase === 'select') {
      onBack()
    } else {
      setPhase('select')
      setDifficulty(null)
    }
  }

  // ====== DIFFICULTY SELECT ======
  if (phase === 'select') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🧮</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>분수 마스터</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 8, lineHeight: 1.6 }}>
          20문제를 풀고 최고 점수를 세워보세요!<br/>
          문제당 15초, 빨리 풀수록 보너스 점수!
        </p>
        {bestRecord > 0 && (
          <div style={{ fontSize: 13, color: '#F39C12', fontWeight: 600, marginBottom: 16 }}>
            최고 기록: {bestRecord}점 {getMedal(bestRecord) ? getMedal(bestRecord).emoji : ''}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300, margin: '0 auto' }}>
          {DIFFICULTIES.map(d => (
            <button key={d.key} onClick={() => startGame(d)}
              style={{
                padding: '18px 16px', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: d.color, color: '#FFF', textAlign: 'center',
              }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{d.label}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{d.desc}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ====== RESULTS ======
  if (phase === 'results') {
    const finalScore = scoreRef.current
    const finalCorrect = correctRef.current
    const medal = getMedal(finalScore)
    const diffColor = difficulty?.color || '#4895EF'
    const isNewRecord = finalScore > 0 && finalScore >= bestRecord
    const accuracy = TOTAL_QUESTIONS > 0 ? Math.round((finalCorrect / TOTAL_QUESTIONS) * 100) : 0

    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{
          padding: '32px 20px', borderRadius: 20,
          background: medal ? 'linear-gradient(135deg, #FFF9E6, #FFF3CD)' : 'linear-gradient(135deg, #F8F9FA, #E9ECEF)',
          border: `2px solid ${medal ? '#F1C40F' : '#DEE2E6'}`,
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>
            {medal ? medal.emoji : '📊'}
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
          {medal && (
            <div style={{ fontSize: 16, fontWeight: 600, color: '#F39C12', marginBottom: 8 }}>
              {medal.label} 획득!
            </div>
          )}
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>게임 끝!</div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>
            분수 마스터 — {difficulty?.label}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 40, fontWeight: 700, color: diffColor }}>{finalScore}</div>
              <div style={{ fontSize: 11, color: '#888' }}>/ 1000점</div>
            </div>
            <div>
              <div style={{ fontSize: 40, fontWeight: 700, color: '#06D6A0' }}>{finalCorrect}</div>
              <div style={{ fontSize: 11, color: '#888' }}>/ {TOTAL_QUESTIONS} 정답</div>
            </div>
            <div>
              <div style={{ fontSize: 40, fontWeight: 700, color: '#333' }}>{accuracy}%</div>
              <div style={{ fontSize: 11, color: '#888' }}>정답률</div>
            </div>
          </div>

          {/* Score tier guide */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 24,
            fontSize: 12, color: '#888',
          }}>
            <span style={{ opacity: finalScore >= 800 ? 1 : 0.4 }}>{'\uD83E\uDD47'} 800+</span>
            <span style={{ opacity: finalScore >= 600 ? 1 : 0.4 }}>{'\uD83E\uDD48'} 600+</span>
            <span style={{ opacity: finalScore >= 400 ? 1 : 0.4 }}>{'\uD83E\uDD49'} 400+</span>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => startGame(difficulty)}
              style={{
                padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: diffColor, color: '#FFF', fontSize: 15, fontWeight: 700,
              }}>
              다시 하기
            </button>
            <button onClick={handleBack}
              style={{
                padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: '#F0F0F0', color: '#666', fontSize: 15, fontWeight: 700,
              }}>
              난이도 선택
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ====== PLAYING ======
  if (!problem) return null

  const diffColor = difficulty?.color || '#4895EF'
  const timerPct = (timeLeft / TIME_PER_QUESTION) * 100
  const timerColor = timeLeft <= 3 ? '#EF476F' : timeLeft <= 7 ? '#F39C12' : '#06D6A0'
  const progressPct = ((questionNum + 1) / TOTAL_QUESTIONS) * 100

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Header */}
      <div style={{ background: diffColor, color: '#FFF', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <button onClick={handleBack}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF',
              fontSize: 13, borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
            }}>
            ← 그만하기
          </button>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <span>🏆 {score}점</span>
            <span>✅ {correctCount}/{questionNum + (feedback ? 1 : 0)}</span>
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          분수 마스터 — {difficulty?.label}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>문제 {questionNum + 1}/{TOTAL_QUESTIONS}</span>
        </div>
        <div style={{ height: 4, background: '#EEE', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: diffColor,
            width: `${progressPct}%`,
            transition: 'width 0.3s',
          }} />
        </div>

        {/* Per-question timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: '#EEE', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: timerColor,
              width: `${Math.min(timerPct, 100)}%`,
              transition: 'width 0.1s linear, background 0.3s',
            }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: timerColor, minWidth: 36, textAlign: 'right' }}>
            {Math.ceil(timeLeft)}초
          </span>
        </div>
      </div>

      {/* Question */}
      <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{
          fontSize: 28, fontWeight: 700, marginBottom: 32, lineHeight: 1.5,
          color: '#333', minHeight: 80,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {problem.text}
        </div>

        {/* Feedback message */}
        {feedback && (
          <div style={{
            fontSize: 14, fontWeight: 700, marginBottom: 12,
            color: feedback.type === 'correct' ? '#06D6A0' : '#EF476F',
          }}>
            {feedback.type === 'correct'
              ? `정답! +${feedback.points}점`
              : feedback.type === 'timeout'
                ? '시간 초과!'
                : `오답! 정답: ${problem.answer}`
            }
          </div>
        )}

        {/* 4 Choice buttons */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
          maxWidth: 340, margin: '0 auto',
        }}>
          {problem.choices.map((choice, idx) => {
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
              } else {
                bg = '#F8F9FA'
                border = '2px solid #E0E0E0'
                color = '#AAA'
              }
            }

            return (
              <button key={idx} onClick={() => handleChoice(choice, idx)}
                disabled={!!feedback}
                style={{
                  padding: '16px 8px', borderRadius: 14, border, cursor: feedback ? 'default' : 'pointer',
                  fontSize: 20, fontWeight: 700, color, background: bg,
                  transition: 'all 0.15s',
                  boxShadow: feedback ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                  minHeight: 56,
                }}>
                {choice}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
