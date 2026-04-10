import { useState, useEffect, useCallback } from 'react'
import nonsenseQuiz from '../data/nonsenseQuiz'

const STORAGE_KEY = 'nonsense-quiz-progress'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { solved: [], bestStreak: 0, totalPlays: 0 }
  } catch { return { solved: [], bestStreak: 0, totalPlays: 0 } }
}

function saveProgress(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export default function NonsenseQuiz({ onBack }) {
  const [phase, setPhase] = useState('menu') // menu | playing | result
  const [mode, setMode] = useState(null) // 'free' | 'challenge'
  const [questions, setQuestions] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [score, setScore] = useState(0)
  const [results, setResults] = useState([]) // { q, a, correct, usedHint }
  const [progress, setProgressState] = useState(getProgress())

  useEffect(() => {
    setProgressState(getProgress())
  }, [])

  const startFree = () => {
    setMode('free')
    setQuestions(shuffle(nonsenseQuiz))
    setQIndex(0)
    setShowHint(false)
    setShowAnswer(false)
    setPhase('playing')
  }

  const startChallenge = () => {
    setMode('challenge')
    setQuestions(shuffle(nonsenseQuiz).slice(0, 20))
    setQIndex(0)
    setScore(0)
    setStreak(0)
    setResults([])
    setShowHint(false)
    setShowAnswer(false)
    setUserInput('')
    setPhase('playing')
  }

  const current = questions[qIndex]

  const handleNext = () => {
    if (qIndex + 1 >= questions.length) {
      if (mode === 'challenge') {
        const prog = getProgress()
        prog.totalPlays = (prog.totalPlays || 0) + 1
        if (streak > (prog.bestStreak || 0)) prog.bestStreak = streak
        saveProgress(prog)
        setProgressState(prog)
        setPhase('result')
      } else {
        setQuestions(shuffle(nonsenseQuiz))
        setQIndex(0)
      }
    } else {
      setQIndex(qIndex + 1)
    }
    setShowHint(false)
    setShowAnswer(false)
    setUserInput('')
  }

  const handleCorrect = () => {
    const newStreak = streak + 1
    setStreak(newStreak)
    if (newStreak > bestStreak) setBestStreak(newStreak)
    setScore(s => s + (showHint ? 50 : 100))
    setResults(r => [...r, { q: current.q, a: current.a, correct: true, usedHint: showHint }])
    handleNext()
  }

  const handleWrong = () => {
    setStreak(0)
    setResults(r => [...r, { q: current.q, a: current.a, correct: false, usedHint: showHint }])
    handleNext()
  }

  const handleBack = () => {
    if (phase !== 'menu') {
      setPhase('menu')
      setMode(null)
      return
    }
    onBack()
  }

  const totalQ = nonsenseQuiz.length
  const solvedCount = progress.solved?.length || 0

  // Menu
  if (phase === 'menu') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🤪</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>넌센스 퀴즈</h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 8, lineHeight: 1.6 }}>
          말장난과 센스가 필요한 퀴즈!<br />
          총 <strong>{totalQ}문제</strong>
        </p>
        <div style={{
          display: 'inline-block', padding: '8px 16px', borderRadius: 20,
          background: '#FFF3CD', fontSize: 13, fontWeight: 600, color: '#856404', marginBottom: 24,
        }}>
          최고 연속 정답: {progress.bestStreak || 0}회 | 플레이: {progress.totalPlays || 0}회
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300, margin: '0 auto' }}>
          <button onClick={startFree}
            style={{
              padding: '18px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
              fontSize: 16, fontWeight: 700, color: '#FFF',
              background: 'linear-gradient(135deg, #F39C12, #E67E22)',
            }}>
            🎲 자유 모드
            <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.85, marginTop: 4 }}>
              랜덤 문제를 계속 풀어보세요
            </div>
          </button>
          <button onClick={startChallenge}
            style={{
              padding: '18px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
              fontSize: 16, fontWeight: 700, color: '#FFF',
              background: 'linear-gradient(135deg, #E74C3C, #C0392B)',
            }}>
            🏆 챌린지 모드
            <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.85, marginTop: 4 }}>
              20문제 도전! 점수를 올려보세요
            </div>
          </button>
        </div>
      </div>
    )
  }

  // Result (challenge only)
  if (phase === 'result') {
    const correctCount = results.filter(r => r.correct).length
    const emoji = correctCount >= 18 ? '🏆' : correctCount >= 14 ? '🥇' : correctCount >= 10 ? '🥈' : correctCount >= 6 ? '🥉' : '💪'
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{
          textAlign: 'center', padding: '32px 20px', borderRadius: 20,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          border: '2px solid #F1C40F', marginBottom: 20,
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{emoji}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>챌린지 완료!</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#E74C3C', marginBottom: 8 }}>
            {correctCount} / 20
          </div>
          <div style={{ fontSize: 15, color: '#666' }}>
            점수: {score}점 | 최고 연속: {bestStreak}회
          </div>
        </div>

        {/* Results list */}
        <div style={{ marginBottom: 20 }}>
          {results.map((r, i) => (
            <div key={i} style={{
              padding: '12px 14px', marginBottom: 8, borderRadius: 12,
              background: r.correct ? '#F0FFF4' : '#FFF5F5',
              border: `1px solid ${r.correct ? '#C6F6D5' : '#FED7D7'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{r.correct ? '✅' : '❌'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{r.q}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{r.a}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={startChallenge}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#E74C3C', color: '#FFF', fontSize: 15, fontWeight: 700,
            }}>
            다시 도전
          </button>
          <button onClick={() => setPhase('menu')}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#F0F0F0', color: '#555', fontSize: 15, fontWeight: 700,
            }}>
            메뉴로
          </button>
        </div>
      </div>
    )
  }

  // Playing
  if (!current) return null

  const progressPercent = mode === 'challenge' ? ((qIndex + 1) / questions.length) * 100 : 0

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #F39C12, #E67E22)',
        color: '#FFF', padding: '16px 16px 14px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <button onClick={handleBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 나가기
          </button>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            {mode === 'challenge' && <span>🏆 {score}점</span>}
            <span>🔥 {streak}연속</span>
          </div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          넌센스 퀴즈 {mode === 'challenge' ? `(${qIndex + 1}/${questions.length})` : ''}
        </div>
      </div>

      {/* Progress bar (challenge) */}
      {mode === 'challenge' && (
        <div style={{ height: 4, background: '#E0E0E0' }}>
          <div style={{ height: '100%', background: '#E74C3C', width: `${progressPercent}%`, transition: 'width 0.3s' }} />
        </div>
      )}

      <div style={{ padding: '20px 16px' }}>
        {/* Question card */}
        <div style={{
          background: '#FFF', borderRadius: 16, padding: '28px 20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 16, textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🤔</div>
          <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.6, color: '#333' }}>
            {current.q}
          </div>
        </div>

        {/* Hint */}
        {!showAnswer && (
          <button
            onClick={() => setShowHint(true)}
            disabled={showHint}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
              background: showHint ? '#FFF3CD' : '#F8F8F8',
              color: showHint ? '#856404' : '#888',
              fontSize: 14, fontWeight: 600, cursor: showHint ? 'default' : 'pointer',
              marginBottom: 12,
            }}
          >
            {showHint ? `💡 힌트: ${current.hint}` : '💡 힌트 보기' + (mode === 'challenge' ? ' (50점)' : '')}
          </button>
        )}

        {/* Show/Hide answer */}
        {!showAnswer ? (
          <button
            onClick={() => setShowAnswer(true)}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #4895EF, #3A7BD5)',
              color: '#FFF', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              marginBottom: 12,
            }}
          >
            정답 보기
          </button>
        ) : (
          <>
            {/* Answer */}
            <div style={{
              background: '#F0FFF4', borderRadius: 14, padding: '20px',
              border: '2px solid #06D6A0', marginBottom: 16, textAlign: 'center',
            }}>
              <div style={{ fontSize: 14, color: '#888', marginBottom: 6 }}>정답</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#2D6A4F' }}>
                {current.a}
              </div>
            </div>

            {/* Correct/Wrong buttons */}
            {mode === 'challenge' ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleCorrect}
                  style={{
                    flex: 1, padding: '14px 0', borderRadius: 12, border: 'none',
                    background: '#06D6A0', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  }}>
                  ✅ 맞췄어요!
                </button>
                <button onClick={handleWrong}
                  style={{
                    flex: 1, padding: '14px 0', borderRadius: 12, border: 'none',
                    background: '#EF476F', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  }}>
                  ❌ 틀렸어요
                </button>
              </div>
            ) : (
              <button onClick={handleNext}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
                  background: '#F39C12', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}>
                다음 문제 →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
