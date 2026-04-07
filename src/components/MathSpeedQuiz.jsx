import { useState, useEffect, useRef } from 'react'

function generateQuestion(level) {
  const ops = ['+', '-', '×', '÷']
  let a, b, op, answer

  if (level === 'easy') {
    op = ['+', '-'][Math.floor(Math.random() * 2)]
    a = Math.floor(Math.random() * 50) + 1
    b = Math.floor(Math.random() * 50) + 1
    if (op === '-' && a < b) [a, b] = [b, a]
    answer = op === '+' ? a + b : a - b
  } else if (level === 'normal') {
    op = ops[Math.floor(Math.random() * 4)]
    if (op === '+' || op === '-') {
      a = Math.floor(Math.random() * 100) + 1
      b = Math.floor(Math.random() * 100) + 1
      if (op === '-' && a < b) [a, b] = [b, a]
      answer = op === '+' ? a + b : a - b
    } else if (op === '×') {
      a = Math.floor(Math.random() * 12) + 2
      b = Math.floor(Math.random() * 12) + 2
      answer = a * b
    } else {
      b = Math.floor(Math.random() * 9) + 2
      answer = Math.floor(Math.random() * 12) + 1
      a = b * answer
    }
  } else {
    op = ops[Math.floor(Math.random() * 4)]
    if (op === '+' || op === '-') {
      a = Math.floor(Math.random() * 500) + 50
      b = Math.floor(Math.random() * 500) + 50
      if (op === '-' && a < b) [a, b] = [b, a]
      answer = op === '+' ? a + b : a - b
    } else if (op === '×') {
      a = Math.floor(Math.random() * 20) + 2
      b = Math.floor(Math.random() * 20) + 2
      answer = a * b
    } else {
      b = Math.floor(Math.random() * 12) + 2
      answer = Math.floor(Math.random() * 20) + 1
      a = b * answer
    }
  }

  return { text: `${a} ${op} ${b}`, answer }
}

const MODES = [
  { key: 'easy', label: '덧셈·뺄셈', desc: '1~50', color: '#06D6A0', time: 60 },
  { key: 'normal', label: '사칙연산', desc: '1~100', color: '#4895EF', time: 60 },
  { key: 'hard', label: '고급', desc: '큰 숫자 (45초)', color: '#EF476F', time: 45 },
]

export default function MathSpeedQuiz({ onBack }) {
  const [mode, setMode] = useState(null)
  const [question, setQuestion] = useState(null)
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (mode && !gameOver && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current)
            setGameOver(true)
            return 0
          }
          return t - 1
        })
      }, 1000)
      return () => clearInterval(timerRef.current)
    }
  }, [mode, gameOver])

  const startGame = (m) => {
    setMode(m)
    setScore(0)
    setTotal(0)
    setCombo(0)
    setMaxCombo(0)
    setTimeLeft(m.time)
    setGameOver(false)
    setFeedback(null)
    setInput('')
    setQuestion(generateQuestion(m.key))
  }

  useEffect(() => {
    if (mode && !gameOver && inputRef.current) inputRef.current.focus()
  }, [mode, gameOver, question])

  const handleSubmit = () => {
    if (!input && input !== '0') return
    const num = Number(input)
    setTotal(t => t + 1)
    if (num === question.answer) {
      setScore(s => s + 1)
      setCombo(c => {
        const nc = c + 1
        setMaxCombo(m => Math.max(m, nc))
        return nc
      })
      setFeedback('correct')
    } else {
      setCombo(0)
      setFeedback('wrong')
    }
    setInput('')
    setTimeout(() => {
      setFeedback(null)
      setQuestion(generateQuestion(mode.key))
    }, 300)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  if (!mode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🧮</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>사칙연산 스피드퀴즈</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 32, lineHeight: 1.6 }}>
          제한 시간 안에 최대한 빠르게 풀어보세요!<br/>
          연속 정답으로 콤보를 쌓아보세요!
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          {MODES.map(m => (
            <button key={m.key} onClick={() => startGame(m)}
              style={{
                padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                fontSize: 16, fontWeight: 700, color: '#FFF',
                background: m.color,
              }}>
              {m.label}
              <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>{m.desc}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (gameOver) {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{
          padding: '32px 20px', borderRadius: 20,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          border: '2px solid #F1C40F',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>게임 끝!</div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>{mode.label}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: mode.color }}>{score}</div>
              <div style={{ fontSize: 11, color: '#888' }}>정답</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#888' }}>{total - score}</div>
              <div style={{ fontSize: 11, color: '#888' }}>오답</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#333' }}>{pct}%</div>
              <div style={{ fontSize: 11, color: '#888' }}>정답률</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#F39C12' }}>{maxCombo}</div>
              <div style={{ fontSize: 11, color: '#888' }}>최대콤보</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => startGame(mode)}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: mode.color, color: '#FFF', fontSize: 14, fontWeight: 600 }}>
              다시 하기
            </button>
            <button onClick={() => setMode(null)}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
              난이도 변경
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ background: mode.color, color: '#FFF', padding: '1.5rem 1.25rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <button onClick={() => setMode(null)}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 돌아가기
          </button>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <span>✅ {score}</span>
            {combo >= 2 && <span style={{ fontWeight: 700 }}>🔥 {combo}콤보</span>}
            <span>⏱ {timeLeft}초</span>
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>사칙연산 퀴즈 — {mode.label}</div>
      </div>

      <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ height: 6, background: '#EEE', borderRadius: 3, marginBottom: 32, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: timeLeft <= 10 ? '#EF476F' : mode.color,
            width: `${(timeLeft / mode.time) * 100}%`,
            transition: 'width 1s linear',
          }} />
        </div>

        {combo >= 3 && (
          <div style={{ fontSize: 12, fontWeight: 700, color: '#F39C12', marginBottom: 8 }}>
            🔥 {combo}콤보!
          </div>
        )}

        <div style={{
          fontSize: 44, fontWeight: 700, marginBottom: 32,
          color: feedback === 'correct' ? '#06D6A0' : feedback === 'wrong' ? '#EF476F' : '#333',
          transition: 'color 0.2s',
        }}>
          {question.text} = ?
        </div>

        <div style={{ display: 'flex', gap: 8, maxWidth: 220, margin: '0 auto' }}>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={input}
            onChange={e => setInput(e.target.value.replace(/[^0-9-]/g, ''))}
            onKeyDown={handleKeyDown}
            placeholder="?"
            style={{
              flex: 1, minWidth: 0, padding: '12px 8px', borderRadius: 12,
              border: '2px solid #E0E0E0', fontSize: 24, fontWeight: 700,
              textAlign: 'center', outline: 'none', fontFamily: 'monospace',
            }}
          />
          <button onClick={handleSubmit}
            style={{
              padding: '0 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: mode.color, color: '#FFF', fontSize: 16, fontWeight: 700,
              flexShrink: 0,
            }}>
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
