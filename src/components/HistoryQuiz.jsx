import { useState, useEffect, useRef, useCallback } from 'react'
import { HISTORY_TOPICS } from '../data/historyQuiz'

const STORAGE_KEY = 'history-quiz-progress'
const TOTAL_QUESTIONS = 20
const TIME_PER_QUESTION = 15

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function HistoryQuiz({ onBack }) {
  const [phase, setPhase] = useState('select') // 'select' | 'playing' | 'results'
  const [topic, setTopic] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION)
  const [totalScore, setTotalScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [wrongAnswers, setWrongAnswers] = useState([])

  const timerRef = useRef(null)
  const feedbackRef = useRef(null)
  const scoreRef = useRef(0)
  const correctRef = useRef(0)
  const wrongRef = useRef([])

  // ---- localStorage helpers ----
  const getScores = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return { scores: {}, totalPlays: 0 }
      return JSON.parse(raw)
    } catch {
      return { scores: {}, totalPlays: 0 }
    }
  }, [])

  const saveScore = useCallback((topicKey, score) => {
    try {
      const data = getScores()
      const prev = data.scores[topicKey] || 0
      if (score > prev) data.scores[topicKey] = score
      data.totalPlays = (data.totalPlays || 0) + 1
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch { /* storage error */ }
  }, [getScores])

  // ---- Start game ----
  const startGame = (topicObj) => {
    const pool = [...topicObj.questions]
    const picked = shuffle(pool).slice(0, TOTAL_QUESTIONS)
    setTopic(topicObj)
    setQuestions(picked)
    setCurrentIdx(0)
    setTimeLeft(TIME_PER_QUESTION)
    setTotalScore(0)
    setCorrectCount(0)
    setFeedback(null)
    setWrongAnswers([])
    scoreRef.current = 0
    correctRef.current = 0
    wrongRef.current = []
    setPhase('playing')
  }

  // ---- Timer ----
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
    wrongRef.current = [...wrongRef.current, { ...q, selected: null }]
    setWrongAnswers(wrongRef.current)
    setFeedback({ selected: null, correct: q.answer, isCorrect: false })
    clearInterval(timerRef.current)
    feedbackRef.current = setTimeout(() => advanceQuestion(), 2500)
  }

  const handleAnswer = (choiceIdx) => {
    if (feedback) return
    clearInterval(timerRef.current)

    const q = questions[currentIdx]
    const isCorrect = choiceIdx === q.answer
    let earned = 0

    if (isCorrect) {
      const timeBonus = Math.floor(timeLeft * 3)
      earned = 50 + timeBonus
      scoreRef.current += earned
      correctRef.current += 1
      setTotalScore(scoreRef.current)
      setCorrectCount(correctRef.current)
    } else {
      wrongRef.current = [...wrongRef.current, { ...q, selected: choiceIdx }]
      setWrongAnswers(wrongRef.current)
    }

    setFeedback({ selected: choiceIdx, correct: q.answer, isCorrect, earned, explanation: q.explanation })
    feedbackRef.current = setTimeout(() => advanceQuestion(), isCorrect ? 2000 : 2500)
  }

  const advanceQuestion = () => {
    setFeedback(null)

    if (currentIdx + 1 >= questions.length) {
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
    if (topic) saveScore(topic.key, finalScore)
  }

  const getMedal = (score) => {
    if (score >= 900) return { emoji: '\u{1F947}', label: '\uAE08\uBA54\uB2EC', color: '#FFD700' }
    if (score >= 700) return { emoji: '\u{1F948}', label: '\uC740\uBA54\uB2EC', color: '#C0C0C0' }
    if (score >= 500) return { emoji: '\u{1F949}', label: '\uB3D9\uBA54\uB2EC', color: '#CD7F32' }
    return { emoji: '\u{1F4DD}', label: '\uB2E4\uC74C\uC5D4 \uB354 \uC798\uD560 \uC218 \uC788\uC5B4\uC694!', color: '#888' }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      clearTimeout(feedbackRef.current)
    }
  }, [])

  // ============ TOPIC SELECT ============
  if (phase === 'select') {
    const saved = getScores()
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 2rem' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #8B4513, #A0522D)',
          color: '#FFF', padding: '1.5rem 1.25rem 1.25rem', textAlign: 'center',
        }}>
          <button onClick={onBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 14px', cursor: 'pointer', position: 'absolute', left: 16 }}>
            ← 돌아가기
          </button>
          <div style={{ fontSize: 48, marginBottom: 4 }}>{'\u{1F1F0}\u{1F1F7}'}</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '4px 0 4px' }}>한국사 퀴즈</h2>
          <p style={{ fontSize: 13, opacity: 0.85, margin: 0 }}>
            주제를 선택하고 역사 퀴즈에 도전하세요!
          </p>
          {saved.totalPlays > 0 && (
            <div style={{ fontSize: 12, marginTop: 8, opacity: 0.7 }}>
              총 {saved.totalPlays}회 도전
            </div>
          )}
        </div>

        {/* Topic grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          padding: '1rem', maxWidth: 400, margin: '0 auto',
        }}>
          {HISTORY_TOPICS.map(t => {
            const best = saved.scores[t.key] || 0
            const medal = best > 0 ? getMedal(best) : null
            return (
              <button key={t.key} onClick={() => startGame(t)}
                style={{
                  padding: '16px 10px', borderRadius: 14,
                  border: '2px solid #E8D5C4',
                  background: '#FFFAF5', cursor: 'pointer',
                  textAlign: 'center', transition: 'all 0.15s',
                }}>
                <div style={{ fontSize: 32, marginBottom: 4 }}>{t.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#5D3A1A', marginBottom: 2 }}>{t.label}</div>
                {medal ? (
                  <div style={{ fontSize: 11, color: medal.color, fontWeight: 600 }}>
                    {medal.emoji} {best}점
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#BBB' }}>미도전</div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ============ RESULTS ============
  if (phase === 'results') {
    const medal = getMedal(totalScore)
    const maxScore = questions.length * 50 + questions.length * TIME_PER_QUESTION * 3
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 2rem' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #8B4513, #A0522D)',
          color: '#FFF', padding: '1.5rem 1.25rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: 48 }}>{medal.emoji}</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{medal.label}</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>{topic?.label}</div>
        </div>

        {/* Score card */}
        <div style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
          <div style={{
            padding: '24px 16px', borderRadius: 16,
            background: '#FFFAF5', border: '2px solid #E8D5C4',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 40, fontWeight: 700, color: '#8B4513' }}>
              {totalScore} <span style={{ fontSize: 16, fontWeight: 400, color: '#A0522D' }}>/ 1000</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#06D6A0' }}>{correctCount}</div>
                <div style={{ fontSize: 11, color: '#888' }}>정답</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#EF476F' }}>{questions.length - correctCount}</div>
                <div style={{ fontSize: 11, color: '#888' }}>오답</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#333' }}>{Math.round((correctCount / questions.length) * 100)}%</div>
                <div style={{ fontSize: 11, color: '#888' }}>정답률</div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
            <button onClick={() => startGame(topic)}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#8B4513', color: '#FFF', fontSize: 14, fontWeight: 600 }}>
              다시 하기
            </button>
            <button onClick={() => setPhase('select')}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#E8D5C4', color: '#5D3A1A', fontSize: 14, fontWeight: 600 }}>
              주제 변경
            </button>
            <button onClick={onBack}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
              돌아가기
            </button>
          </div>

          {/* Wrong answers review */}
          {wrongAnswers.length > 0 && (
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#8B4513', marginBottom: 12 }}>
                오답 노트 ({wrongAnswers.length}문제)
              </h3>
              {wrongAnswers.map((w, i) => (
                <div key={i} style={{
                  padding: '14px', borderRadius: 12, marginBottom: 10,
                  background: '#FFF8F0', border: '1px solid #F0DCC8',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 8, lineHeight: 1.5 }}>
                    {i + 1}. {w.q}
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>
                    {w.selected !== null ? (
                      <span style={{ color: '#EF476F' }}>내 답: {w.choices[w.selected]}</span>
                    ) : (
                      <span style={{ color: '#EF476F' }}>시간 초과</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#06D6A0', fontWeight: 600, marginBottom: 6 }}>
                    정답: {w.choices[w.answer]}
                  </div>
                  {w.explanation && (
                    <div style={{ fontSize: 12, color: '#8B7355', lineHeight: 1.5, background: '#FFF3E0', padding: '8px 10px', borderRadius: 8 }}>
                      {w.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============ PLAYING ============
  const q = questions[currentIdx]
  if (!q) return null

  const timerPct = (timeLeft / TIME_PER_QUESTION) * 100
  const timerColor = timeLeft <= 5 ? '#EF476F' : timeLeft <= 10 ? '#F39C12' : '#06D6A0'

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #8B4513, #A0522D)',
        color: '#FFF', padding: '1.25rem 1.25rem 1rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <button onClick={() => { clearInterval(timerRef.current); clearTimeout(feedbackRef.current); setPhase('select') }}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 13, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 그만하기
          </button>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <span>⭐ {totalScore}</span>
            <span>✅ {correctCount}</span>
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          {'\u{1F1F0}\u{1F1F7}'} {topic?.label}
        </div>
      </div>

      {/* Progress + Timer */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666', marginBottom: 6 }}>
          <span style={{ fontWeight: 600 }}>문제 {currentIdx + 1}/{questions.length}</span>
          <span style={{ fontWeight: 600, color: timerColor }}>{timeLeft}초</span>
        </div>
        {/* Progress bar */}
        <div style={{ height: 6, background: '#EEE', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: '#A0522D',
            width: `${((currentIdx + (feedback ? 1 : 0)) / questions.length) * 100}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>
        {/* Timer bar */}
        <div style={{ height: 5, background: '#EEE', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: timerColor,
            width: `${timerPct}%`,
            transition: 'width 1s linear',
          }} />
        </div>
      </div>

      {/* Question */}
      <div style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
        <div style={{
          fontSize: 19, fontWeight: 700, color: '#333', lineHeight: 1.6,
          marginBottom: 28, minHeight: 56,
        }}>
          {q.q}
        </div>

        {/* 4 choice buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380, margin: '0 auto' }}>
          {q.choices.map((choice, i) => {
            let bg = '#FFF'
            let borderColor = '#E0E0E0'
            let textColor = '#333'

            if (feedback) {
              if (i === q.answer) {
                bg = '#D4EDDA'
                borderColor = '#06D6A0'
                textColor = '#155724'
              } else if (i === feedback.selected) {
                bg = '#F8D7DA'
                borderColor = '#EF476F'
                textColor = '#721C24'
              }
            }

            return (
              <button key={i}
                onClick={() => handleAnswer(i)}
                disabled={!!feedback}
                style={{
                  padding: '14px 16px', borderRadius: 12,
                  border: `2px solid ${borderColor}`,
                  background: bg, color: textColor,
                  fontSize: 15, fontWeight: 600, cursor: feedback ? 'default' : 'pointer',
                  textAlign: 'left', transition: 'all 0.15s',
                  opacity: feedback && i !== q.answer && i !== feedback.selected ? 0.5 : 1,
                }}
              >
                <span style={{ color: '#A0522D', marginRight: 8, fontWeight: 700 }}>
                  {['①', '②', '③', '④'][i]}
                </span>
                {choice}
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {feedback && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontSize: 15, fontWeight: 700,
              color: feedback.isCorrect ? '#06D6A0' : '#EF476F',
              marginBottom: 6,
            }}>
              {feedback.isCorrect
                ? `정답! +${feedback.earned}점`
                : feedback.selected === null
                  ? `시간 초과! 정답: ${q.choices[q.answer]}`
                  : `오답! 정답: ${q.choices[q.answer]}`
              }
            </div>
            {feedback.explanation && (
              <div style={{
                fontSize: 13, color: '#5D3A1A', lineHeight: 1.5,
                background: '#FFF3E0', padding: '8px 12px', borderRadius: 8,
                maxWidth: 380, margin: '0 auto', textAlign: 'left',
              }}>
                {feedback.explanation}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
