import { useState, useEffect, useRef } from 'react'

const STORAGE_PREFIX = 'grade-quiz-'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getProgress(quizId) {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PREFIX + quizId)) || {}
  } catch { return {} }
}

function saveProgress(quizId, data) {
  localStorage.setItem(STORAGE_PREFIX + quizId, JSON.stringify(data))
}

export default function GradeQuiz({ quizId, title, icon, color, grades, onBack }) {
  const [phase, setPhase] = useState('grades') // grades | playing | result
  const [grade, setGrade] = useState(null)
  const [questions, setQuestions] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [wrong, setWrong] = useState([])
  const [progress, setProgressState] = useState({})
  const timerRef = useRef(null)

  useEffect(() => {
    setProgressState(getProgress(quizId))
  }, [quizId])

  const startQuiz = (g) => {
    const gradeData = grades[g]
    if (!gradeData) return
    setGrade(g)
    const shuffled = shuffle(gradeData.questions).slice(0, 20)
    setQuestions(shuffled)
    setQIndex(0)
    setScore(0)
    setSelected(null)
    setShowResult(false)
    setWrong([])
    setPhase('playing')
  }

  const handleSelect = (idx) => {
    if (selected !== null) return
    setSelected(idx)
    const correct = idx === questions[qIndex].answer
    if (correct) setScore(s => s + 1)
    else setWrong(w => [...w, { ...questions[qIndex], selectedIdx: idx }])

    timerRef.current = setTimeout(() => {
      if (qIndex + 1 >= questions.length) {
        const finalScore = correct ? score + 1 : score
        const prog = getProgress(quizId)
        const key = `grade${grade}`
        if (!prog[key] || finalScore > prog[key]) {
          prog[key] = finalScore
          saveProgress(quizId, prog)
          setProgressState(prog)
        }
        setPhase('result')
      } else {
        setQIndex(qIndex + 1)
        setSelected(null)
        setShowResult(false)
      }
    }, 1200)
  }

  const handleBack = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (phase !== 'grades') {
      setPhase('grades')
      setGrade(null)
      return
    }
    onBack()
  }

  // Grade selection
  if (phase === 'grades') {
    const gradeKeys = Object.keys(grades).sort((a, b) => a - b)
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{icon}</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{title}</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>학년을 선택하세요</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300, margin: '0 auto' }}>
          {gradeKeys.map((g, i) => {
            const gData = grades[g]
            const best = progress[`grade${g}`]
            const colors = [
              'linear-gradient(135deg, #06D6A0, #05B384)',
              'linear-gradient(135deg, #4895EF, #3A7BD5)',
              'linear-gradient(135deg, #F39C12, #E67E22)',
              'linear-gradient(135deg, #EF476F, #D63B5C)',
            ]
            return (
              <button key={g} onClick={() => startQuiz(Number(g))}
                style={{
                  padding: '16px 20px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: colors[i % 4], color: '#FFF', textAlign: 'left',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{g}학년</div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{gData.questions.length}문제</div>
                </div>
                {best != null && (
                  <div style={{
                    background: 'rgba(255,255,255,0.25)', borderRadius: 10,
                    padding: '4px 10px', fontSize: 13, fontWeight: 700,
                  }}>
                    최고 {best}/20
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Result
  if (phase === 'result') {
    const emoji = score >= 18 ? '🏆' : score >= 14 ? '🥇' : score >= 10 ? '🥈' : score >= 6 ? '🥉' : '💪'
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{
          textAlign: 'center', padding: '28px 20px', borderRadius: 20,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          border: '2px solid #F1C40F', marginBottom: 20,
        }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>{emoji}</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{grade}학년 완료!</div>
          <div style={{ fontSize: 36, fontWeight: 700, color, marginBottom: 4 }}>{score} / {questions.length}</div>
        </div>

        {wrong.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: '#E74C3C' }}>틀린 문제 복습</h3>
            {wrong.map((w, i) => (
              <div key={i} style={{
                padding: '12px 14px', marginBottom: 8, borderRadius: 12,
                background: '#FFF5F5', border: '1px solid #FED7D7',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{w.q}</div>
                <div style={{ fontSize: 12, color: '#E74C3C' }}>내 답: {w.choices[w.selectedIdx]}</div>
                <div style={{ fontSize: 12, color: '#27AE60' }}>정답: {w.choices[w.answer]}</div>
                {w.explanation && <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{w.explanation}</div>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => startQuiz(grade)}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: color, color: '#FFF', fontSize: 15, fontWeight: 700 }}>
            다시 도전
          </button>
          <button onClick={() => { setPhase('grades'); setGrade(null) }}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#555', fontSize: 15, fontWeight: 700 }}>
            학년 선택
          </button>
        </div>
      </div>
    )
  }

  // Playing
  const current = questions[qIndex]
  if (!current) return null
  const progressPercent = ((qIndex + 1) / questions.length) * 100

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ background: color, color: '#FFF', padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <button onClick={handleBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 나가기
          </button>
          <span style={{ fontSize: 13 }}>{grade}학년 · {qIndex + 1}/{questions.length} · ✅ {score}</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{icon} {title}</div>
      </div>
      <div style={{ height: 4, background: '#E0E0E0' }}>
        <div style={{ height: '100%', background: color, width: `${progressPercent}%`, transition: 'width 0.3s' }} />
      </div>

      <div style={{ padding: '20px 16px' }}>
        <div style={{
          background: '#FFF', borderRadius: 16, padding: '24px 20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 16,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.6, color: '#333', textAlign: 'center' }}>
            {current.q}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {current.choices.map((choice, idx) => {
            let bg = '#FFF'
            let border = '2px solid #E0E0E0'
            let textColor = '#333'
            if (selected !== null) {
              if (idx === current.answer) {
                bg = '#F0FFF4'; border = '2px solid #06D6A0'; textColor = '#2D6A4F'
              } else if (idx === selected && idx !== current.answer) {
                bg = '#FFF5F5'; border = '2px solid #EF476F'; textColor = '#C0392B'
              }
            }
            return (
              <button key={idx} onClick={() => handleSelect(idx)}
                disabled={selected !== null}
                style={{
                  padding: '14px 16px', borderRadius: 12, border, background: bg,
                  fontSize: 15, fontWeight: 500, color: textColor, cursor: selected !== null ? 'default' : 'pointer',
                  textAlign: 'left', transition: 'all 0.15s',
                }}>
                {choice}
              </button>
            )
          })}
        </div>

        {selected !== null && current.explanation && (
          <div style={{
            marginTop: 12, padding: '12px 14px', borderRadius: 10,
            background: '#F8F9FA', fontSize: 13, color: '#666', lineHeight: 1.5,
          }}>
            💡 {current.explanation}
          </div>
        )}
      </div>
    </div>
  )
}
