import { useState, useEffect, useRef, useCallback } from 'react'
import { SCIENCE_TOPICS } from '../data/scienceQuiz'

// ====== localStorage helpers ======
const STORAGE_KEY = 'science-quiz-progress'

function getScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      return data.scores || {}
    }
  } catch (e) { /* ignore */ }
  return {}
}

function saveScore(topicKey, score) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : { scores: {}, totalPlays: 0 }
    const prev = data.scores[topicKey] || 0
    if (score > prev) {
      data.scores[topicKey] = score
    }
    data.totalPlays = (data.totalPlays || 0) + 1
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) { /* ignore */ }
}

// ====== helpers ======
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getMedal(score) {
  if (score >= 900) return '\u{1F947}'
  if (score >= 700) return '\u{1F948}'
  if (score >= 500) return '\u{1F949}'
  return null
}

export default function ScienceQuiz({ onBack }) {
  // Phase: 'topics' | 'countdown' | 'playing' | 'results'
  const [phase, setPhase] = useState('topics')
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [topicScores, setTopicScores] = useState({})

  // Countdown
  const [countdownNum, setCountdownNum] = useState(3)

  // Game state
  const [questionIndex, setQuestionIndex] = useState(0)
  const [questions, setQuestions] = useState([])
  const [timeLeft, setTimeLeft] = useState(15)
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState(null) // null | { type: 'correct'|'wrong', correctIdx, selectedIdx, explanation }
  const [wrongAnswers, setWrongAnswers] = useState([])

  const timerRef = useRef(null)
  const feedbackTimeoutRef = useRef(null)
  const scoreRef = useRef(0)
  const timeLeftRef = useRef(15)

  // Load scores on mount
  useEffect(() => {
    setTopicScores(getScores())
  }, [])

  // Start game
  const startGame = (topic) => {
    setSelectedTopic(topic)
    // Pick 20 random questions (or all if fewer)
    const shuffled = shuffle(topic.questions)
    setQuestions(shuffled.slice(0, 20))
    setPhase('countdown')
    setCountdownNum(3)
  }

  // Countdown effect
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdownNum <= 0) {
      setPhase('playing')
      setQuestionIndex(0)
      setScore(0)
      scoreRef.current = 0
      setTimeLeft(15)
      timeLeftRef.current = 15
      setFeedback(null)
      setWrongAnswers([])
      return
    }
    const timer = setTimeout(() => setCountdownNum(n => n - 1), 1000)
    return () => clearTimeout(timer)
  }, [phase, countdownNum])

  // Per-question timer
  useEffect(() => {
    if (phase !== 'playing' || feedback) return

    setTimeLeft(15)
    timeLeftRef.current = 15

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        const newT = Math.round((t - 0.1) * 10) / 10
        timeLeftRef.current = newT
        if (newT <= 0) {
          clearInterval(timerRef.current)
          // Time's up - treat as wrong
          handleTimeUp()
          return 0
        }
        return newT
      })
    }, 100)

    return () => clearInterval(timerRef.current)
  }, [phase, questionIndex, feedback])

  const handleTimeUp = useCallback(() => {
    if (phase !== 'playing') return
    const q = questions[questionIndex]
    if (!q) return

    setWrongAnswers(prev => [...prev, {
      question: q.q,
      correctAnswer: q.choices[q.answer],
      yourAnswer: '(시간 초과)',
      explanation: q.explanation,
    }])

    setFeedback({
      type: 'wrong',
      correctIdx: q.answer,
      selectedIdx: -1,
      explanation: q.explanation,
    })

    feedbackTimeoutRef.current = setTimeout(() => {
      advanceQuestion()
    }, 2500)
  }, [phase, questionIndex, questions])

  // Handle answer
  const handleAnswer = (choiceIdx) => {
    if (feedback) return
    if (phase !== 'playing') return
    clearInterval(timerRef.current)

    const q = questions[questionIndex]
    const isCorrect = choiceIdx === q.answer

    if (isCorrect) {
      const timeBonus = Math.floor(timeLeftRef.current) * 3
      const points = 50 + timeBonus
      const newScore = scoreRef.current + points
      scoreRef.current = newScore
      setScore(newScore)

      setFeedback({
        type: 'correct',
        correctIdx: q.answer,
        selectedIdx: choiceIdx,
        explanation: q.explanation,
      })

      feedbackTimeoutRef.current = setTimeout(() => {
        advanceQuestion()
      }, 2000)
    } else {
      setWrongAnswers(prev => [...prev, {
        question: q.q,
        correctAnswer: q.choices[q.answer],
        yourAnswer: q.choices[choiceIdx],
        explanation: q.explanation,
      }])

      setFeedback({
        type: 'wrong',
        correctIdx: q.answer,
        selectedIdx: choiceIdx,
        explanation: q.explanation,
      })

      feedbackTimeoutRef.current = setTimeout(() => {
        advanceQuestion()
      }, 2500)
    }
  }

  const advanceQuestion = () => {
    setFeedback(null)
    const next = questionIndex + 1
    if (next >= questions.length) {
      setPhase('results')
    } else {
      setQuestionIndex(next)
    }
  }

  // Save results when game ends
  useEffect(() => {
    if (phase !== 'results' || !selectedTopic) return
    const finalScore = scoreRef.current
    saveScore(selectedTopic.key, finalScore)
    setTopicScores(prev => ({
      ...prev,
      [selectedTopic.key]: Math.max(prev[selectedTopic.key] || 0, finalScore),
    }))
  }, [phase])

  const handleTopicChange = () => {
    clearInterval(timerRef.current)
    clearTimeout(feedbackTimeoutRef.current)
    setPhase('topics')
    setSelectedTopic(null)
    setFeedback(null)
  }

  const handleBackToHub = () => {
    clearInterval(timerRef.current)
    clearTimeout(feedbackTimeoutRef.current)
    onBack()
  }

  // Timer bar color: green -> yellow -> red
  const getTimerColor = (t) => {
    if (t <= 5) return '#EF476F'
    if (t <= 10) return '#F1C40F'
    return '#06D6A0'
  }

  // ====== RENDER: TOPIC SELECTION ======
  if (phase === 'topics') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>

        {/* Purple gradient header */}
        <div style={{
          background: 'linear-gradient(135deg, #9B59B6, #8E44AD)',
          borderRadius: 20, padding: '28px 20px', marginBottom: 24, color: '#FFF',
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔬</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>과학 퀴즈</h2>
          <p style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
            주제를 선택하고 20문제에 도전하세요!<br/>
            빠르게 맞출수록 높은 점수를 받아요!
          </p>
        </div>

        {/* 2-column topic grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
          maxWidth: 360, margin: '0 auto',
        }}>
          {SCIENCE_TOPICS.map(topic => {
            const best = topicScores[topic.key] || 0
            const medal = getMedal(best)
            return (
              <button key={topic.key} onClick={() => startGame(topic)}
                style={{
                  padding: '16px 8px', borderRadius: 14, border: '2px solid #F0F0F0',
                  cursor: 'pointer', background: '#FFF', textAlign: 'center',
                  transition: 'transform 0.1s',
                }}
                onPointerDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                onPointerUp={e => e.currentTarget.style.transform = ''}
                onPointerLeave={e => e.currentTarget.style.transform = ''}
              >
                <div style={{ fontSize: 28, marginBottom: 4 }}>{topic.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>{topic.label}</div>
                {best > 0 && (
                  <div style={{ fontSize: 11, color: '#9B59B6', marginTop: 4, fontWeight: 600 }}>
                    {medal && <span>{medal} </span>}최고 {best}점
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ====== RENDER: COUNTDOWN ======
  if (phase === 'countdown') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{selectedTopic?.icon}</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{selectedTopic?.label}</h2>
        <div style={{
          fontSize: 96, fontWeight: 700, color: '#9B59B6',
          lineHeight: 1, margin: '40px 0',
          animation: 'pulse 0.5s ease-in-out',
        }}>
          {countdownNum || 'GO!'}
        </div>
        <p style={{ fontSize: 14, color: '#888' }}>준비하세요!</p>
      </div>
    )
  }

  // ====== RENDER: RESULTS ======
  if (phase === 'results' && selectedTopic) {
    const finalScore = scoreRef.current
    const totalQuestions = questions.length
    const wrongCount = wrongAnswers.length
    const correctCount = totalQuestions - wrongCount
    const medal = getMedal(finalScore)

    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{
          padding: '32px 20px', borderRadius: 20,
          background: 'linear-gradient(135deg, #F3E5F5, #E8DAEF)',
          border: '2px solid #9B59B6',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>
            {medal || '🔬'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            퀴즈 결과
          </div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>
            {selectedTopic.icon} {selectedTopic.label}
          </div>

          {/* Score */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: '#9B59B6' }}>
              {finalScore}
            </div>
            <div style={{ fontSize: 13, color: '#888' }}>/ 1000점</div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24,
          }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#06D6A0' }}>{correctCount}</div>
              <div style={{ fontSize: 12, color: '#888' }}>정답</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#EF476F' }}>{wrongCount}</div>
              <div style={{ fontSize: 12, color: '#888' }}>오답</div>
            </div>
          </div>

          {/* Medal message */}
          {medal && (
            <div style={{
              fontSize: 15, fontWeight: 700, marginBottom: 16,
              padding: '8px 16px', background: 'rgba(155,89,182,0.1)', borderRadius: 10,
              display: 'inline-block', color: '#9B59B6',
            }}>
              {medal} {finalScore >= 900 ? '완벽해요!' : finalScore >= 700 ? '훌륭해요!' : '잘했어요!'}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <button onClick={() => startGame(selectedTopic)}
              style={{
                padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: '#9B59B6', color: '#FFF', fontSize: 14, fontWeight: 600,
              }}>
              다시 하기
            </button>
            <button onClick={handleTopicChange}
              style={{
                padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600,
              }}>
              주제 변경
            </button>
            <button onClick={handleBackToHub}
              style={{
                padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600,
              }}>
              돌아가기
            </button>
          </div>
        </div>

        {/* Wrong answers review */}
        {wrongAnswers.length > 0 && (
          <div style={{
            marginTop: 24, textAlign: 'left', padding: '20px',
            background: '#FFF', borderRadius: 16, border: '2px solid #F0F0F0',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, textAlign: 'center', color: '#333' }}>
              오답 노트
            </h3>
            {wrongAnswers.map((item, idx) => (
              <div key={idx} style={{
                padding: '14px', marginBottom: idx < wrongAnswers.length - 1 ? 12 : 0,
                background: '#FEF9F9', borderRadius: 12, border: '1px solid #FADBD8',
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 8, lineHeight: 1.5 }}>
                  {idx + 1}. {item.question}
                </div>
                {item.yourAnswer !== '(시간 초과)' && (
                  <div style={{ fontSize: 13, color: '#EF476F', marginBottom: 4 }}>
                    내 답: {item.yourAnswer}
                  </div>
                )}
                {item.yourAnswer === '(시간 초과)' && (
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
                    (시간 초과)
                  </div>
                )}
                <div style={{ fontSize: 13, color: '#06D6A0', fontWeight: 600, marginBottom: 4 }}>
                  정답: {item.correctAnswer}
                </div>
                {item.explanation && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 6, lineHeight: 1.5, borderTop: '1px solid #F0E0E0', paddingTop: 6 }}>
                    {item.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ====== RENDER: ACTIVE GAME ======
  if (phase !== 'playing' || !selectedTopic || questions.length === 0) return null

  const q = questions[questionIndex]
  if (!q) return null

  const timerPct = (timeLeft / 15) * 100
  const timerColor = getTimerColor(timeLeft)

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Purple gradient header bar */}
      <div style={{
        background: 'linear-gradient(135deg, #9B59B6, #8E44AD)',
        padding: '12px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        color: '#FFF',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          문제 {questionIndex + 1}/{questions.length}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>
          {score}점
        </div>
      </div>

      {/* Timer bar */}
      <div style={{ height: 8, background: '#EEE', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          background: timerColor,
          width: `${timerPct}%`,
          transition: 'width 0.1s linear, background 0.3s',
        }} />
      </div>

      {/* Back button */}
      <div style={{ padding: '8px 16px 0' }}>
        <button onClick={handleTopicChange}
          style={{
            background: 'none', border: 'none', fontSize: 13, color: '#AAA',
            cursor: 'pointer', padding: '4px 0',
          }}>
          ← 돌아가기
        </button>
      </div>

      {/* Question */}
      <div style={{ padding: '24px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: '#888', marginBottom: 12 }}>
          {selectedTopic.icon} {selectedTopic.label}
        </div>
        <div style={{
          fontSize: 18, fontWeight: 700, color: '#333',
          padding: '24px 16px', borderRadius: 16,
          background: '#F8F9FA', border: '2px solid #EEE',
          marginBottom: 24, lineHeight: 1.6, minHeight: 80,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {q.q}
        </div>

        {/* Feedback message */}
        {feedback && (
          <div style={{
            marginBottom: 16, padding: '10px 16px', borderRadius: 12,
            fontSize: 14, fontWeight: 600, lineHeight: 1.5,
            background: feedback.type === 'correct' ? '#D4EDDA' : '#FADBD8',
            color: feedback.type === 'correct' ? '#06D6A0' : '#EF476F',
          }}>
            {feedback.type === 'correct' ? '정답! 🎉' : '오답!'}
            {feedback.explanation && (
              <div style={{ fontSize: 12, color: '#666', marginTop: 6, fontWeight: 400 }}>
                {feedback.explanation}
              </div>
            )}
          </div>
        )}

        {/* 4 choice buttons */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr', gap: 10,
          maxWidth: 400, margin: '0 auto',
        }}>
          {q.choices.map((choice, idx) => {
            let btnBg = '#FFF'
            let btnBorder = '2px solid #E0E0E0'
            let btnColor = '#333'

            if (feedback) {
              if (idx === feedback.correctIdx) {
                btnBg = '#D4EDDA'
                btnBorder = '2px solid #06D6A0'
                btnColor = '#155724'
              }
              if (feedback.type === 'wrong' && idx === feedback.selectedIdx) {
                btnBg = '#FADBD8'
                btnBorder = '2px solid #EF476F'
                btnColor = '#721C24'
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={!!feedback}
                style={{
                  padding: '16px 16px', borderRadius: 14, border: btnBorder,
                  cursor: feedback ? 'default' : 'pointer',
                  background: btnBg, color: btnColor,
                  fontSize: 15, fontWeight: 600,
                  minHeight: 52, textAlign: 'left',
                  transition: 'all 0.15s',
                  opacity: feedback && idx !== feedback.correctIdx && idx !== feedback.selectedIdx ? 0.4 : 1,
                }}
                onPointerDown={e => { if (!feedback) e.currentTarget.style.transform = 'scale(0.98)' }}
                onPointerUp={e => e.currentTarget.style.transform = ''}
                onPointerLeave={e => e.currentTarget.style.transform = ''}
              >
                <span style={{ marginRight: 8, color: '#9B59B6', fontWeight: 700 }}>
                  {['A', 'B', 'C', 'D'][idx]}.
                </span>
                {choice}
              </button>
            )
          })}
        </div>

        {/* Timer display */}
        <div style={{
          marginTop: 20, fontSize: 14, fontWeight: 700, color: timerColor,
        }}>
          ⏱ {Math.ceil(timeLeft)}초
        </div>
      </div>
    </div>
  )
}
