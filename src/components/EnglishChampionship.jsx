import { useState, useEffect, useRef, useCallback } from 'react'
import { WORD_TOPICS } from '../data/englishWords'
import { SENTENCE_LEVELS } from '../data/englishSentences'
import { getData, addScore, addDiamonds, updateRecord } from '../utils/englishStorage'

// ============ HELPERS ============

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getAllWords() {
  const words = []
  WORD_TOPICS.forEach(topic => {
    topic.words.forEach(w => words.push({ ...w, topic: topic.label }))
  })
  return words
}

function getWordsByDifficulty(difficulty) {
  const all = getAllWords()
  switch (difficulty) {
    case 'easy':
      return all.filter(w => w.en.length <= 4)
    case 'medium':
      return all.filter(w => w.en.length >= 4 && w.en.length <= 6)
    case 'hard':
      return all.filter(w => w.en.length >= 6)
    default:
      return all
  }
}

function getSentencesByDifficulty(difficulty) {
  switch (difficulty) {
    case 'easy':
      return SENTENCE_LEVELS.filter(l => l.level >= 1 && l.level <= 3)
        .flatMap(l => l.sentences)
    case 'medium':
      return SENTENCE_LEVELS.filter(l => l.level >= 4 && l.level <= 7)
        .flatMap(l => l.sentences)
    case 'hard':
      return SENTENCE_LEVELS.filter(l => l.level >= 8 && l.level <= 10)
        .flatMap(l => l.sentences)
    default:
      return SENTENCE_LEVELS.flatMap(l => l.sentences)
  }
}

function getTimePerQuestion(difficulty) {
  switch (difficulty) {
    case 'easy': return 15
    case 'medium': return 12
    case 'hard': return 10
    default: return 12
  }
}

function generateWordQuestion(words) {
  const shuffled = shuffleArray(words)
  const correct = shuffled[0]
  const others = shuffled.slice(1, 4)
  // If not enough words, fill from all
  while (others.length < 3) {
    const all = getAllWords().filter(w => w.en !== correct.en)
    const rand = all[Math.floor(Math.random() * all.length)]
    if (!others.find(o => o.en === rand.en)) others.push(rand)
  }
  const choices = shuffleArray([correct, ...others.slice(0, 3)])
  return {
    type: 'word',
    kr: correct.kr,
    correctEn: correct.en,
    choices: choices.map(c => c.en),
  }
}

function generateSpellingQuestion(words) {
  const word = words[Math.floor(Math.random() * words.length)]
  const letters = word.en.split('')
  // Add some distractor letters
  const distractors = 'abcdefghijklmnopqrstuvwxyz'.split('')
    .filter(c => !letters.includes(c.toLowerCase()))
  const extraCount = Math.min(4, distractors.length)
  const extra = shuffleArray(distractors).slice(0, extraCount)
  const allLetters = shuffleArray([...letters, ...extra])
  return {
    type: 'spelling',
    kr: word.kr,
    correctEn: word.en,
    letters: allLetters,
  }
}

function generateSentenceQuestion(sentences) {
  const sentence = sentences[Math.floor(Math.random() * sentences.length)]
  return {
    type: 'sentence',
    kr: sentence.kr,
    correctWords: sentence.words,
    answer: sentence.answer,
    shuffledWords: shuffleArray(sentence.words.map((w, i) => ({ text: w, id: i }))),
  }
}

function generateQuestions(difficulty) {
  const words = getWordsByDifficulty(difficulty)
  const sentences = getSentencesByDifficulty(difficulty)
  const questions = []

  // 8 word questions
  const usedWords = new Set()
  for (let i = 0; i < 8; i++) {
    const available = words.filter(w => !usedWords.has(w.en))
    const pool = available.length >= 4 ? available : words
    const q = generateWordQuestion(pool)
    usedWords.add(q.correctEn)
    questions.push(q)
  }

  // 6 spelling questions
  const usedSpelling = new Set()
  for (let i = 0; i < 6; i++) {
    const available = words.filter(w => !usedSpelling.has(w.en))
    const pool = available.length > 0 ? available : words
    const q = generateSpellingQuestion(pool)
    usedSpelling.add(q.correctEn)
    questions.push(q)
  }

  // 6 sentence questions
  const usedSentences = new Set()
  for (let i = 0; i < 6; i++) {
    const available = sentences.filter(s => !usedSentences.has(s.answer))
    const pool = available.length > 0 ? available : sentences
    const q = generateSentenceQuestion(pool)
    usedSentences.add(q.answer)
    questions.push(q)
  }

  return shuffleArray(questions)
}

const DIFFICULTIES = [
  { key: 'easy', label: '초급', stars: '⭐', color: '#06D6A0', desc: '쉬운 단어, 기본 문장' },
  { key: 'medium', label: '중급', stars: '⭐⭐', color: '#4895EF', desc: '중간 난이도' },
  { key: 'hard', label: '고급', stars: '⭐⭐⭐', color: '#EF476F', desc: '어려운 단어, 복잡한 문장' },
]

const WORD_COLORS = [
  '#4895EF', '#06D6A0', '#F39C12', '#E74C3C', '#7B2FF7',
  '#3498DB', '#1ABC9C', '#E67E22', '#9B59B6', '#2ECC71',
]

export default function EnglishChampionship({ onBack }) {
  const [phase, setPhase] = useState('select') // select | playing | result
  const [difficulty, setDifficulty] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [feedback, setFeedback] = useState(null) // null | 'correct' | 'wrong'
  const [answered, setAnswered] = useState(false)

  // Spelling state
  const [spellingInput, setSpellingInput] = useState([])
  const [spellingAvailable, setSpellingAvailable] = useState([])

  // Sentence state
  const [sentenceAnswer, setSentenceAnswer] = useState([])
  const [sentenceAvailable, setSentenceAvailable] = useState([])

  const timerRef = useRef(null)
  const feedbackTimerRef = useRef(null)
  const scoreRef = useRef(0)
  const correctRef = useRef(0)
  const questionStartRef = useRef(0)

  const startGame = useCallback((diff) => {
    const qs = generateQuestions(diff)
    setDifficulty(diff)
    setQuestions(qs)
    setCurrentQ(0)
    setScore(0)
    setCorrectCount(0)
    scoreRef.current = 0
    correctRef.current = 0
    setFeedback(null)
    setAnswered(false)
    setPhase('playing')

    const t = getTimePerQuestion(diff)
    setTimeLeft(t)
    questionStartRef.current = Date.now()

    // Initialize first question state
    if (qs[0]) initQuestionState(qs[0])
  }, [])

  const initQuestionState = (q) => {
    if (q.type === 'spelling') {
      setSpellingInput([])
      setSpellingAvailable(q.letters.map((l, i) => ({ char: l, id: i })))
    } else if (q.type === 'sentence') {
      setSentenceAnswer([])
      setSentenceAvailable([...q.shuffledWords])
    }
  }

  // Timer per question
  useEffect(() => {
    if (phase !== 'playing' || answered) return
    const maxTime = getTimePerQuestion(difficulty)
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
    setFeedback('wrong')
    clearInterval(timerRef.current)
    feedbackTimerRef.current = setTimeout(nextQuestion, 1200)
  }

  const submitAnswer = (isCorrect, remainingTime) => {
    if (answered) return
    setAnswered(true)
    clearInterval(timerRef.current)

    if (isCorrect) {
      const basePoints = 50
      const timeBonus = Math.max(0, remainingTime) * 5
      const points = basePoints + timeBonus
      const newScore = scoreRef.current + points
      const newCorrect = correctRef.current + 1
      scoreRef.current = newScore
      correctRef.current = newCorrect
      setScore(newScore)
      setCorrectCount(newCorrect)
      setFeedback('correct')
    } else {
      setFeedback('wrong')
    }
    feedbackTimerRef.current = setTimeout(nextQuestion, 1000)
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
    const t = getTimePerQuestion(difficulty)
    setTimeLeft(t)
    questionStartRef.current = Date.now()
    initQuestionState(questions[next])
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
    else if (finalScore >= 700) addDiamonds(7)
    else if (finalScore >= 500) addDiamonds(5)
    else if (finalCorrect > 0) addDiamonds(2)
  }, [phase])

  const currentQuestion = questions[currentQ] || null

  // ============ WORD QUESTION HANDLER ============
  const handleWordChoice = (choice) => {
    if (answered) return
    const isCorrect = choice === currentQuestion.correctEn
    submitAnswer(isCorrect, timeLeft)
  }

  // ============ SPELLING HANDLERS ============
  const handleSpellingTap = (letterObj) => {
    if (answered) return
    setSpellingAvailable(prev => prev.filter(l => l.id !== letterObj.id))
    setSpellingInput(prev => [...prev, letterObj])
  }

  const handleSpellingRemove = (letterObj) => {
    if (answered) return
    setSpellingInput(prev => prev.filter(l => l.id !== letterObj.id))
    setSpellingAvailable(prev => [...prev, letterObj])
  }

  const handleSpellingSubmit = () => {
    if (answered) return
    const attempt = spellingInput.map(l => l.char).join('')
    const isCorrect = attempt.toLowerCase() === currentQuestion.correctEn.toLowerCase()
    submitAnswer(isCorrect, timeLeft)
  }

  // Auto-submit spelling when correct length
  useEffect(() => {
    if (phase !== 'playing' || answered || !currentQuestion || currentQuestion.type !== 'spelling') return
    if (spellingInput.length === currentQuestion.correctEn.length) {
      handleSpellingSubmit()
    }
  }, [spellingInput, phase, answered, currentQuestion])

  // ============ SENTENCE HANDLERS ============
  const handleSentenceTapAvailable = (wordObj) => {
    if (answered) return
    setSentenceAvailable(prev => prev.filter(w => w.id !== wordObj.id))
    setSentenceAnswer(prev => [...prev, wordObj])
  }

  const handleSentenceTapAnswer = (wordObj) => {
    if (answered) return
    setSentenceAnswer(prev => prev.filter(w => w.id !== wordObj.id))
    setSentenceAvailable(prev => [...prev, wordObj])
  }

  const handleSentenceSubmit = () => {
    if (answered) return
    const attempt = sentenceAnswer.map(w => w.text).join(' ')
    const correct = currentQuestion.correctWords.join(' ')
    submitAnswer(attempt === correct, timeLeft)
  }

  // Auto-submit sentence when all words placed
  useEffect(() => {
    if (phase !== 'playing' || answered || !currentQuestion || currentQuestion.type !== 'sentence') return
    if (sentenceAnswer.length === currentQuestion.correctWords.length) {
      handleSentenceSubmit()
    }
  }, [sentenceAnswer, phase, answered, currentQuestion])

  // ============ DIFFICULTY SELECT ============
  if (phase === 'select') {
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
        <div style={{ fontSize: 64, marginBottom: 12 }}>🏆</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>영어 왕 선발전</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 8, lineHeight: 1.6 }}>
          단어 + 스펠링 + 문장, 총 20문제!
        </p>
        <div style={{
          background: '#FFF8E1', borderRadius: 16, padding: 14, margin: '12px 0 28px',
          fontSize: 13, color: '#555', lineHeight: 1.7,
        }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#D4A017' }}>
            점수 안내
          </div>
          <div>✅ 정답: +50점 기본</div>
          <div>⏱ 시간 보너스: 남은 초 × 5점</div>
          <div>🥇 900점 이상: 영어 왕!</div>
        </div>

        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>난이도를 선택하세요</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300, margin: '0 auto' }}>
          {DIFFICULTIES.map(d => (
            <button key={d.key} onClick={() => startGame(d.key)} style={{
              padding: '18px 20px', borderRadius: 16, border: 'none', cursor: 'pointer',
              background: d.color, color: '#FFF', textAlign: 'left',
              boxShadow: `0 4px 16px ${d.color}44`,
              transition: 'transform 0.1s',
            }}
              onPointerDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onPointerUp={e => e.currentTarget.style.transform = ''}
              onPointerLeave={e => e.currentTarget.style.transform = ''}
            >
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                {d.stars} {d.label}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{d.desc}</div>
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
    const maxScore = questions.length * 125 // theoretical max
    let medal, medalLabel
    if (finalScore >= 900) { medal = '🥇'; medalLabel = '영어 왕!' }
    else if (finalScore >= 700) { medal = '🥈'; medalLabel = '훌륭해요!' }
    else if (finalScore >= 500) { medal = '🥉'; medalLabel = '잘했어요!' }
    else { medal = '💪'; medalLabel = '다음에 도전!' }

    const diffInfo = DIFFICULTIES.find(d => d.key === difficulty)

    let diamondReward = 0
    if (finalScore >= 900) diamondReward = 10
    else if (finalScore >= 700) diamondReward = 7
    else if (finalScore >= 500) diamondReward = 5
    else if (finalCorrect > 0) diamondReward = 2

    return (
      <div className="fade-in" style={{
        maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center',
      }}>
        <div style={{
          padding: '32px 20px', borderRadius: 24,
          background: finalScore >= 900
            ? 'linear-gradient(135deg, #FFF9E6, #FFF3CD)'
            : finalScore >= 700
            ? 'linear-gradient(135deg, #F5F5F5, #E8E8E8)'
            : finalScore >= 500
            ? 'linear-gradient(135deg, #FFF0EB, #FFE0D6)'
            : 'linear-gradient(135deg, #F5F7FA, #E8ECF0)',
          border: `2px solid ${diffInfo?.color || '#D4A017'}`,
        }}>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>
            {diffInfo?.stars} {diffInfo?.label}
          </div>
          <div style={{ fontSize: 64, marginBottom: 8 }}>{medal}</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>영어 왕 선발전 결과</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: diffInfo?.color, marginBottom: 20 }}>
            {medalLabel}
          </div>

          <div style={{
            display: 'flex', justifyContent: 'center', gap: 24,
            marginBottom: 24, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#D4A017' }}>{finalScore}</div>
              <div style={{ fontSize: 12, color: '#888' }}>점수</div>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#06D6A0' }}>
                {finalCorrect}/{questions.length}
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>정답</div>
            </div>
          </div>

          {diamondReward > 0 && (
            <div style={{
              fontSize: 16, fontWeight: 700, color: '#7B2FF7', marginBottom: 16,
              padding: '8px 16px', background: 'rgba(123,47,247,0.08)',
              borderRadius: 12, display: 'inline-block',
            }}>
              💎 +{diamondReward} 다이아!
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
            <button onClick={() => startGame(difficulty)} style={{
              padding: '12px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: diffInfo?.color || '#D4A017',
              color: '#FFF', fontSize: 15, fontWeight: 700,
            }}>
              다시 도전
            </button>
            <button onClick={() => setPhase('select')} style={{
              padding: '12px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#F0F0F0', color: '#666', fontSize: 15, fontWeight: 600,
            }}>
              난이도 변경
            </button>
            <button onClick={onBack} style={{
              padding: '12px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
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
  if (!currentQuestion) return null

  const maxTime = getTimePerQuestion(difficulty)
  const timerPct = (timeLeft / maxTime) * 100
  const timerColor = timeLeft <= 3 ? '#EF476F' : timeLeft <= 6 ? '#F39C12' : '#06D6A0'
  const diffInfo = DIFFICULTIES.find(d => d.key === difficulty)

  const typeLabel = currentQuestion.type === 'word' ? '단어'
    : currentQuestion.type === 'spelling' ? '스펠링'
    : '문장'

  return (
    <div className="fade-in" style={{
      maxWidth: 480, margin: '0 auto', minHeight: '100vh',
      background: '#F5F7FA', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${diffInfo?.color || '#D4A017'}, ${diffInfo?.color || '#D4A017'}CC)`,
        padding: '14px 16px 18px',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 10,
        }}>
          <div style={{ fontSize: 13, color: '#FFF', fontWeight: 600 }}>
            문제 {currentQ + 1}/{questions.length}
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 13, color: '#FFF', fontWeight: 600 }}>
            <span>점수: {score}</span>
            <span>⏱ {timeLeft}초</span>
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

        {/* Question progress dots */}
        <div style={{
          display: 'flex', gap: 3, marginTop: 8, justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          {questions.map((_, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: 5,
              background: i === currentQ ? '#FFF'
                : i < currentQ ? 'rgba(255,255,255,0.6)'
                : 'rgba(255,255,255,0.2)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px 16px 24px' }}>
        {/* Question type badge */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span style={{
            display: 'inline-block', padding: '4px 14px', borderRadius: 20,
            background: currentQuestion.type === 'word' ? '#E3F2FD'
              : currentQuestion.type === 'spelling' ? '#E8F5E9'
              : '#FFF3E0',
            color: currentQuestion.type === 'word' ? '#1565C0'
              : currentQuestion.type === 'spelling' ? '#2E7D32'
              : '#E65100',
            fontSize: 12, fontWeight: 700,
          }}>
            [{typeLabel}]
          </span>
        </div>

        {/* Feedback overlay */}
        {feedback && (
          <div style={{
            textAlign: 'center', marginBottom: 12, fontSize: 20, fontWeight: 700,
            color: feedback === 'correct' ? '#06D6A0' : '#EF476F',
            animation: 'pulse 0.5s ease',
          }}>
            {feedback === 'correct' ? '✅ 정답!' : '❌ 오답!'}
            {feedback === 'wrong' && currentQuestion.type === 'word' && (
              <div style={{ fontSize: 14, color: '#E65100', marginTop: 4 }}>
                정답: {currentQuestion.correctEn}
              </div>
            )}
            {feedback === 'wrong' && currentQuestion.type === 'spelling' && (
              <div style={{ fontSize: 14, color: '#E65100', marginTop: 4 }}>
                정답: {currentQuestion.correctEn}
              </div>
            )}
            {feedback === 'wrong' && currentQuestion.type === 'sentence' && (
              <div style={{ fontSize: 14, color: '#E65100', marginTop: 4 }}>
                정답: {currentQuestion.correctWords.join(' ')}
              </div>
            )}
          </div>
        )}

        {/* ---- WORD QUESTION ---- */}
        {currentQuestion.type === 'word' && (
          <div>
            <div style={{
              textAlign: 'center', padding: '20px 16px', marginBottom: 20,
              background: '#FFF', borderRadius: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 13, color: '#999', marginBottom: 8 }}>
                이 단어의 영어는?
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#333' }}>
                "{currentQuestion.kr}"
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentQuestion.choices.map((choice, i) => {
                let bg = '#FFF'
                let border = '2px solid #E8ECF0'
                let color = '#333'
                if (feedback) {
                  if (choice === currentQuestion.correctEn) {
                    bg = '#E8F5E9'
                    border = '2px solid #06D6A0'
                    color = '#2E7D32'
                  } else if (feedback === 'wrong') {
                    bg = '#FAFAFA'
                    color = '#CCC'
                  }
                }
                return (
                  <button key={i} onClick={() => handleWordChoice(choice)}
                    disabled={answered}
                    style={{
                      padding: '16px 20px', borderRadius: 14, border, background: bg,
                      fontSize: 18, fontWeight: 600, color, cursor: answered ? 'default' : 'pointer',
                      textAlign: 'center', transition: 'all 0.2s',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    }}
                    onPointerDown={e => { if (!answered) e.currentTarget.style.transform = 'scale(0.97)' }}
                    onPointerUp={e => e.currentTarget.style.transform = ''}
                    onPointerLeave={e => e.currentTarget.style.transform = ''}
                  >
                    {choice}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ---- SPELLING QUESTION ---- */}
        {currentQuestion.type === 'spelling' && (
          <div>
            <div style={{
              textAlign: 'center', padding: '20px 16px', marginBottom: 20,
              background: '#FFF', borderRadius: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 13, color: '#999', marginBottom: 8 }}>
                이 단어의 스펠링을 맞추세요
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#333' }}>
                "{currentQuestion.kr}"
              </div>
              <div style={{ fontSize: 12, color: '#BBB', marginTop: 6 }}>
                {currentQuestion.correctEn.length}글자
              </div>
            </div>

            {/* Input area */}
            <div style={{
              display: 'flex', gap: 6, justifyContent: 'center',
              marginBottom: 20, flexWrap: 'wrap',
            }}>
              {Array.from({ length: currentQuestion.correctEn.length }).map((_, i) => {
                const letter = spellingInput[i]
                return (
                  <div key={i}
                    onClick={() => letter && handleSpellingRemove(letter)}
                    style={{
                      width: 40, height: 48, borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, fontWeight: 700,
                      background: letter ? '#E3F2FD' : '#F5F5F5',
                      border: letter ? '2px solid #4895EF' : '2px dashed #DDD',
                      color: '#1565C0', cursor: letter ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                    }}>
                    {letter ? letter.char : ''}
                  </div>
                )
              })}
            </div>

            {/* Letter grid */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
            }}>
              {spellingAvailable.map(l => (
                <button key={l.id} onClick={() => handleSpellingTap(l)}
                  disabled={answered}
                  style={{
                    width: 44, height: 48, borderRadius: 12, border: 'none',
                    background: '#FFF', color: '#333', fontSize: 20, fontWeight: 700,
                    cursor: answered ? 'default' : 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'transform 0.1s',
                  }}
                  onPointerDown={e => { if (!answered) e.currentTarget.style.transform = 'scale(0.9)' }}
                  onPointerUp={e => e.currentTarget.style.transform = ''}
                  onPointerLeave={e => e.currentTarget.style.transform = ''}
                >
                  {l.char}
                </button>
              ))}
            </div>

            {/* Submit button for partial spelling */}
            {spellingInput.length > 0 && spellingInput.length < currentQuestion.correctEn.length && !answered && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button onClick={handleSpellingSubmit} style={{
                  padding: '10px 28px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: '#06D6A0', color: '#FFF', fontSize: 15, fontWeight: 700,
                }}>
                  확인
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---- SENTENCE QUESTION ---- */}
        {currentQuestion.type === 'sentence' && (
          <div>
            <div style={{
              textAlign: 'center', padding: '16px 12px', marginBottom: 16,
              background: '#FFF', borderRadius: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 13, color: '#999', marginBottom: 6 }}>
                영어 문장을 만들어 보세요
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#333', lineHeight: 1.4 }}>
                "{currentQuestion.kr}"
              </div>
            </div>

            {/* Answer area */}
            <div style={{
              background: '#FFF', borderRadius: 16, padding: '14px',
              minHeight: 60, marginBottom: 14,
              border: feedback === 'correct' ? '2px solid #06D6A0'
                : feedback === 'wrong' ? '2px solid #EF476F'
                : '2px solid #E8ECF0',
              display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
              justifyContent: 'center', transition: 'border-color 0.2s',
            }}>
              {sentenceAnswer.map(w => (
                <button key={`ans-${w.id}`} onClick={() => handleSentenceTapAnswer(w)}
                  disabled={answered}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: 'none',
                    background: '#E3F2FD', color: '#1565C0', fontSize: 15,
                    fontWeight: 600, cursor: answered ? 'default' : 'pointer',
                  }}>
                  {w.text}
                </button>
              ))}
              {Array.from({ length: currentQuestion.correctWords.length - sentenceAnswer.length }).map((_, i) => (
                <div key={`slot-${i}`} style={{
                  padding: '8px 12px', borderRadius: 8,
                  background: '#F5F5F5', border: '2px dashed #DDD',
                  color: 'transparent', fontSize: 15, minWidth: 32,
                }}>
                  __
                </div>
              ))}
            </div>

            {/* Available words */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
            }}>
              {sentenceAvailable.map(w => (
                <button key={`avail-${w.id}`} onClick={() => handleSentenceTapAvailable(w)}
                  disabled={answered}
                  style={{
                    padding: '10px 16px', borderRadius: 12, border: 'none',
                    background: WORD_COLORS[w.id % WORD_COLORS.length],
                    color: '#FFF', fontSize: 16, fontWeight: 700,
                    cursor: answered ? 'default' : 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                    transition: 'transform 0.1s',
                  }}
                  onPointerDown={e => { if (!answered) e.currentTarget.style.transform = 'scale(0.93)' }}
                  onPointerUp={e => e.currentTarget.style.transform = ''}
                  onPointerLeave={e => e.currentTarget.style.transform = ''}
                >
                  {w.text}
                </button>
              ))}
            </div>

            {/* Submit button for partial sentence */}
            {sentenceAnswer.length > 0 && sentenceAnswer.length < currentQuestion.correctWords.length && !answered && (
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <button onClick={handleSentenceSubmit} style={{
                  padding: '10px 28px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #F39C12, #E67E22)',
                  color: '#FFF', fontSize: 15, fontWeight: 700,
                }}>
                  확인
                </button>
              </div>
            )}
          </div>
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
