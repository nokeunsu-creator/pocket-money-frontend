import { useState, useEffect, useRef, useCallback } from 'react'
import { SENTENCE_LEVELS } from '../data/englishSentences'
import { getData, addScore, addDiamonds, updateRecord, updateDailyChallenge } from '../utils/englishStorage'

function buildSentencePool() {
  const pool = []
  SENTENCE_LEVELS.forEach(lv => {
    lv.sentences.forEach(s => {
      pool.push({ ...s, level: lv.level, wordCount: s.words.length })
    })
  })
  // Sort easier first (fewer words), then shuffle within same word count
  pool.sort((a, b) => {
    if (a.wordCount !== b.wordCount) return a.wordCount - b.wordCount
    return Math.random() - 0.5
  })
  return pool
}

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const GAME_TIME = 120
const CORRECT_POINTS = 30
const SPEED_BONUS_FAST = 3
const SPEED_BONUS_GOOD = 2

const WORD_COLORS = [
  '#4895EF', '#06D6A0', '#F39C12', '#E74C3C', '#7B2FF7',
  '#3498DB', '#1ABC9C', '#E67E22', '#9B59B6', '#2ECC71',
]

export default function SentenceRush({ onBack }) {
  const [phase, setPhase] = useState('ready') // ready | playing | showCorrect | result
  const [pool, setPool] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_TIME)
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [bestSpeed, setBestSpeed] = useState(null)

  // Current sentence state
  const [availableWords, setAvailableWords] = useState([])
  const [answerWords, setAnswerWords] = useState([])
  const [feedback, setFeedback] = useState(null) // null | 'correct' | 'wrong' | 'fast' | 'good'
  const [correctAnswer, setCorrectAnswer] = useState(null)
  const [sentenceStartTime, setSentenceStartTime] = useState(null)

  const timerRef = useRef(null)
  const feedbackTimerRef = useRef(null)
  const scoreRef = useRef(0)
  const completedRef = useRef(0)
  const bestSpeedRef = useRef(null)

  const startGame = useCallback(() => {
    const p = buildSentencePool()
    setPool(p)
    setCurrentIndex(0)
    setTimeLeft(GAME_TIME)
    setScore(0)
    setCompleted(0)
    setBestSpeed(null)
    scoreRef.current = 0
    completedRef.current = 0
    bestSpeedRef.current = null
    setFeedback(null)
    setCorrectAnswer(null)
    setPhase('playing')

    if (p.length > 0) {
      loadSentence(p[0])
    }
  }, [])

  const loadSentence = (sentence) => {
    setAvailableWords(shuffleArray(sentence.words.map((w, i) => ({ text: w, id: i }))))
    setAnswerWords([])
    setFeedback(null)
    setCorrectAnswer(null)
    setSentenceStartTime(Date.now())
  }

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          setPhase('result')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  // Cleanup feedback timer
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  const currentSentence = pool[currentIndex] || null

  const handleTapAvailable = (wordObj) => {
    if (phase !== 'playing' || feedback) return
    setAvailableWords(prev => prev.filter(w => w.id !== wordObj.id))
    setAnswerWords(prev => [...prev, wordObj])
  }

  const handleTapAnswer = (wordObj) => {
    if (phase !== 'playing' || feedback) return
    setAnswerWords(prev => prev.filter(w => w.id !== wordObj.id))
    setAvailableWords(prev => [...prev, wordObj])
  }

  // Auto-submit when all words placed
  useEffect(() => {
    if (phase !== 'playing' || !currentSentence || feedback) return
    if (answerWords.length === currentSentence.words.length) {
      checkAnswer()
    }
  }, [answerWords, phase, currentSentence, feedback])

  const checkAnswer = () => {
    if (!currentSentence) return
    const userAnswer = answerWords.map(w => w.text).join(' ')
    const correct = currentSentence.words.join(' ')
    const elapsed = (Date.now() - sentenceStartTime) / 1000

    if (userAnswer === correct) {
      let multiplier = 1
      let speedLabel = null
      if (elapsed < 5) {
        multiplier = SPEED_BONUS_FAST
        speedLabel = 'fast'
      } else if (elapsed < 10) {
        multiplier = SPEED_BONUS_GOOD
        speedLabel = 'good'
      }

      const points = CORRECT_POINTS * multiplier
      const newScore = scoreRef.current + points
      const newCompleted = completedRef.current + 1
      scoreRef.current = newScore
      completedRef.current = newCompleted
      setScore(newScore)
      setCompleted(newCompleted)

      if (bestSpeedRef.current === null || elapsed < bestSpeedRef.current) {
        bestSpeedRef.current = elapsed
        setBestSpeed(elapsed)
      }

      setFeedback(speedLabel || 'correct')
      feedbackTimerRef.current = setTimeout(() => advanceToNext(), 800)
    } else {
      setFeedback('wrong')
      setCorrectAnswer(currentSentence.words.join(' '))
      feedbackTimerRef.current = setTimeout(() => advanceToNext(), 1500)
    }
  }

  const handleSubmit = () => {
    if (phase !== 'playing' || feedback || answerWords.length === 0) return
    checkAnswer()
  }

  const advanceToNext = () => {
    const nextIdx = currentIndex + 1
    if (nextIdx >= pool.length) {
      clearInterval(timerRef.current)
      setPhase('result')
      return
    }
    setCurrentIndex(nextIdx)
    loadSentence(pool[nextIdx])
  }

  // Save results
  useEffect(() => {
    if (phase !== 'result') return
    const finalScore = scoreRef.current
    const finalCompleted = completedRef.current
    if (finalScore > 0) addScore(finalScore)
    updateRecord('sentenceRush', null, finalCompleted)
    updateDailyChallenge('sentence')
    if (finalCompleted >= 5) addDiamonds(2)
    if (finalCompleted >= 10) addDiamonds(3)
  }, [phase])

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  // ============ READY SCREEN ============
  if (phase === 'ready') {
    return (
      <div className="fade-in" style={{
        maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center',
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', fontSize: 15,
          color: '#999', cursor: 'pointer', marginBottom: 16,
        }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🎯</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>문장 타임어택</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 8, lineHeight: 1.6 }}>
          한국어 문장을 보고 영어 단어를 올바른 순서로 배열하세요!
        </p>
        <div style={{
          background: '#FFF8E1', borderRadius: 16, padding: 16, margin: '16px 0 28px',
          textAlign: 'left', fontSize: 13, lineHeight: 1.8, color: '#555',
        }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#F39C12' }}>
            게임 규칙
          </div>
          <div>⏱ 제한 시간: <strong>2분</strong></div>
          <div>✅ 정답: +30점</div>
          <div>⚡ 5초 이내: ×3 보너스!</div>
          <div>⚡ 10초 이내: ×2 보너스!</div>
          <div>📈 점점 어려워져요 (3단어 → 6단어 이상)</div>
        </div>
        <button onClick={startGame} style={{
          padding: '16px 48px', borderRadius: 16, border: 'none', cursor: 'pointer',
          fontSize: 18, fontWeight: 700, color: '#FFF',
          background: 'linear-gradient(135deg, #F39C12, #E67E22)',
          boxShadow: '0 4px 16px rgba(243,156,18,0.3)',
        }}>
          시작하기!
        </button>
      </div>
    )
  }

  // ============ RESULT SCREEN ============
  if (phase === 'result') {
    const finalScore = scoreRef.current
    const finalCompleted = completedRef.current
    const finalBestSpeed = bestSpeedRef.current
    return (
      <div className="fade-in" style={{
        maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center',
      }}>
        <div style={{
          padding: '32px 20px', borderRadius: 20,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          border: '2px solid #F39C12',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>타임어택 종료!</div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>문장 타임어택</div>

          <div style={{
            display: 'flex', justifyContent: 'center', gap: 20,
            marginBottom: 24, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#F39C12' }}>{finalScore}</div>
              <div style={{ fontSize: 11, color: '#888' }}>총점수</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#06D6A0' }}>{finalCompleted}</div>
              <div style={{ fontSize: 11, color: '#888' }}>완성 문장</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#4895EF' }}>
                {finalBestSpeed != null ? `${finalBestSpeed.toFixed(1)}s` : '-'}
              </div>
              <div style={{ fontSize: 11, color: '#888' }}>최고 속도</div>
            </div>
          </div>

          {finalCompleted >= 10 && (
            <div style={{
              fontSize: 14, fontWeight: 700, color: '#7B2FF7',
              marginBottom: 12,
            }}>
              💎 +5 다이아!
            </div>
          )}
          {finalCompleted >= 5 && finalCompleted < 10 && (
            <div style={{
              fontSize: 14, fontWeight: 700, color: '#7B2FF7',
              marginBottom: 12,
            }}>
              💎 +2 다이아!
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={startGame} style={{
              padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #F39C12, #E67E22)',
              color: '#FFF', fontSize: 15, fontWeight: 700,
            }}>
              다시 도전
            </button>
            <button onClick={onBack} style={{
              padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#F0F0F0', color: '#666', fontSize: 15, fontWeight: 600,
            }}>
              돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============ PLAYING SCREEN ============
  const timerPct = (timeLeft / GAME_TIME) * 100
  const timerColor = timeLeft <= 20 ? '#EF476F' : timeLeft <= 40 ? '#F39C12' : '#06D6A0'

  return (
    <div className="fade-in" style={{
      maxWidth: 480, margin: '0 auto', minHeight: '100vh',
      background: '#F5F7FA', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #F39C12, #E67E22)',
        padding: '14px 16px 18px',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 10,
        }}>
          <button onClick={() => { clearInterval(timerRef.current); setPhase('result') }} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10,
            padding: '6px 12px', fontSize: 13, color: '#FFF', cursor: 'pointer',
          }}>
            ← 종료
          </button>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#FFF', fontWeight: 600 }}>
            <span>⏱ {formatTime(timeLeft)}</span>
            <span>완성: {completed}문장</span>
            <span>점수: {score}</span>
          </div>
        </div>

        {/* Timer bar */}
        <div style={{
          height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.3)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 3, background: '#FFF',
            width: `${timerPct}%`,
            transition: 'width 1s linear',
          }} />
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px 16px 24px', display: 'flex', flexDirection: 'column' }}>
        {/* Korean sentence */}
        {currentSentence && (
          <>
            <div style={{
              textAlign: 'center', marginBottom: 20, padding: '16px 12px',
              background: '#FFF', borderRadius: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>
                이 문장을 영어로 만들어 보세요
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#333', lineHeight: 1.4 }}>
                "{currentSentence.kr}"
              </div>
            </div>

            {/* Speed feedback */}
            {feedback && (
              <div style={{
                textAlign: 'center', marginBottom: 12, fontSize: 18, fontWeight: 700,
                color: feedback === 'wrong' ? '#EF476F'
                  : feedback === 'fast' ? '#E74C3C'
                  : feedback === 'good' ? '#F39C12'
                  : '#06D6A0',
                animation: 'pulse 0.5s ease',
              }}>
                {feedback === 'fast' && '⚡ FAST! ×3'}
                {feedback === 'good' && '⚡ GOOD! ×2'}
                {feedback === 'correct' && '✅ OK!'}
                {feedback === 'wrong' && '❌ 틀렸어요'}
              </div>
            )}

            {/* Show correct answer on wrong */}
            {feedback === 'wrong' && correctAnswer && (
              <div style={{
                textAlign: 'center', marginBottom: 12, padding: '10px 16px',
                background: '#FFF3E0', borderRadius: 12, fontSize: 15, fontWeight: 600,
                color: '#E65100',
              }}>
                정답: {correctAnswer}
              </div>
            )}

            {/* Answer area */}
            <div style={{
              background: '#FFF', borderRadius: 16, padding: '16px',
              minHeight: 70, marginBottom: 16,
              border: feedback === 'correct' || feedback === 'fast' || feedback === 'good'
                ? '2px solid #06D6A0'
                : feedback === 'wrong' ? '2px solid #EF476F'
                : '2px solid #E8ECF0',
              display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
              justifyContent: 'center',
              transition: 'border-color 0.2s',
            }}>
              <div style={{
                fontSize: 11, color: '#BBB', width: '100%', textAlign: 'center',
                marginBottom: answerWords.length > 0 ? 4 : 0,
              }}>
                답:
              </div>
              {answerWords.map((w, i) => (
                <button key={`ans-${w.id}`} onClick={() => handleTapAnswer(w)} style={{
                  padding: '8px 14px', borderRadius: 10, border: 'none',
                  background: '#E3F2FD', color: '#1565C0', fontSize: 16,
                  fontWeight: 600, cursor: 'pointer',
                  transition: 'transform 0.1s',
                }}>
                  {w.text}
                </button>
              ))}
              {/* Empty slots */}
              {Array.from({ length: currentSentence.words.length - answerWords.length }).map((_, i) => (
                <div key={`slot-${i}`} style={{
                  padding: '8px 14px', borderRadius: 10,
                  background: '#F5F5F5', border: '2px dashed #DDD',
                  color: 'transparent', fontSize: 16, fontWeight: 600,
                  minWidth: 40, textAlign: 'center',
                }}>
                  ___
                </div>
              ))}
            </div>

            {/* Available words */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 8, textAlign: 'center' }}>
                보기: (단어를 탭하세요)
              </div>
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center',
              }}>
                {availableWords.map((w) => (
                  <button key={`avail-${w.id}`} onClick={() => handleTapAvailable(w)} style={{
                    padding: '12px 20px', borderRadius: 14, border: 'none',
                    background: WORD_COLORS[w.id % WORD_COLORS.length],
                    color: '#FFF', fontSize: 18, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
                    transition: 'transform 0.1s',
                  }}
                    onPointerDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
                    onPointerUp={e => e.currentTarget.style.transform = ''}
                    onPointerLeave={e => e.currentTarget.style.transform = ''}
                  >
                    {w.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit button */}
            {answerWords.length > 0 && answerWords.length < currentSentence.words.length && !feedback && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <button onClick={handleSubmit} style={{
                  padding: '12px 36px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #F39C12, #E67E22)',
                  color: '#FFF', fontSize: 16, fontWeight: 700,
                  boxShadow: '0 3px 12px rgba(243,156,18,0.3)',
                }}>
                  확인
                </button>
              </div>
            )}

            {/* Speed hint */}
            {!feedback && (
              <div style={{
                textAlign: 'center', marginTop: 16, fontSize: 13,
                color: '#BBB', fontWeight: 500,
              }}>
                ⚡ 빠를수록 보너스!
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>
    </div>
  )
}
