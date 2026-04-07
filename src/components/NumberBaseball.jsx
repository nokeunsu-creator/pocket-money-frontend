import { useState, useRef, useEffect } from 'react'

function generateAnswer(digits) {
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[nums[i], nums[j]] = [nums[j], nums[i]]
  }
  return nums.slice(0, digits)
}

function judge(answer, guess) {
  let strike = 0, ball = 0
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) strike++
    else if (answer.includes(guess[i])) ball++
  }
  return { strike, ball }
}

export default function NumberBaseball({ onBack }) {
  const [digits, setDigits] = useState(null) // 3 | 4 | 5
  const [answer, setAnswer] = useState([])
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [won, setWon] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (digits && inputRef.current) inputRef.current.focus()
  }, [digits, history])

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  const startGame = (d) => {
    setDigits(d)
    setAnswer(generateAnswer(d))
    setHistory([])
    setInput('')
    setWon(false)
    setError('')
  }

  const handleSubmit = () => {
    setError('')
    if (input.length !== digits) {
      setError(`${digits}자리 숫자를 입력하세요`)
      return
    }
    const nums = input.split('').map(Number)
    if (nums.some(n => n === 0)) {
      setError('0은 사용할 수 없어요')
      return
    }
    if (new Set(nums).size !== digits) {
      setError('중복 숫자는 안 돼요')
      return
    }
    const result = judge(answer, nums)
    const newHistory = [...history, { guess: input, ...result }]
    setHistory(newHistory)
    setInput('')
    if (result.strike === digits) setWon(true)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  // 난이도 선택 화면
  if (digits === null) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>baseball</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>숫자 야구</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 32, lineHeight: 1.6 }}>
          1~9 중 중복 없는 숫자를 맞춰보세요!<br/>
          숫자와 위치가 맞으면 <strong style={{ color: '#E74C3C' }}>S(스트라이크)</strong><br/>
          숫자만 맞으면 <strong style={{ color: '#3498DB' }}>B(볼)</strong>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          {[3, 4, 5].map(d => (
            <button key={d} onClick={() => startGame(d)}
              style={{
                padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                fontSize: 16, fontWeight: 700, color: '#FFF',
                background: d === 3 ? 'linear-gradient(135deg, #06D6A0, #05B384)'
                  : d === 4 ? 'linear-gradient(135deg, #4895EF, #3A7BD5)'
                  : 'linear-gradient(135deg, #EF476F, #D63B5C)',
                transition: 'transform 0.1s',
              }}
              onPointerDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
              onPointerUp={e => e.currentTarget.style.transform = ''}
              onPointerLeave={e => e.currentTarget.style.transform = ''}
            >
              {d}자리
              <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>
                {d === 3 ? '쉬움' : d === 4 ? '보통' : '어려움'}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const accentColor = digits === 3 ? '#06D6A0' : digits === 4 ? '#4895EF' : '#EF476F'

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      {/* 헤더 */}
      <div style={{
        background: digits === 3 ? 'linear-gradient(135deg, #06D6A0, #05B384)'
          : digits === 4 ? 'linear-gradient(135deg, #4895EF, #3A7BD5)'
          : 'linear-gradient(135deg, #EF476F, #D63B5C)',
        color: '#FFF', padding: '1.5rem 1.25rem 1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <button onClick={() => setDigits(null)}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 난이도
          </button>
          <span style={{ fontSize: 12, opacity: 0.8 }}>시도 {history.length}회</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>숫자 야구 — {digits}자리</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>1~9 중복 없는 {digits}자리 숫자를 맞춰보세요</div>
      </div>

      <div style={{ padding: '0 1rem' }}>
        {/* 기록 */}
        <div style={{ marginTop: 16 }}>
          {history.length === 0 && !won && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#BBB', fontSize: 13 }}>
              첫 번째 숫자를 입력해보세요!
            </div>
          )}
          {history.map((h, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', marginBottom: 8,
              background: idx === history.length - 1 && won ? '#FFF9E6' : '#FFF',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              border: idx === history.length - 1 && won ? '2px solid #F1C40F' : '1px solid rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#FFF',
                  background: accentColor, borderRadius: 8,
                  padding: '2px 8px', minWidth: 28, textAlign: 'center',
                }}>{idx + 1}</span>
                <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 6, fontFamily: 'monospace' }}>
                  {h.guess}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{
                  fontSize: 14, fontWeight: 700, color: '#E74C3C',
                  background: '#FDEDEC', padding: '4px 10px', borderRadius: 8,
                }}>{h.strike}S</span>
                <span style={{
                  fontSize: 14, fontWeight: 700, color: '#3498DB',
                  background: '#EBF5FB', padding: '4px 10px', borderRadius: 8,
                }}>{h.ball}B</span>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* 승리 */}
        {won && (
          <div style={{
            textAlign: 'center', padding: '24px 16px', marginTop: 8,
            background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
            borderRadius: 14, border: '2px solid #F1C40F',
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>정답!</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
              {history.length}번 만에 맞췄어요!
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => startGame(digits)}
                style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: accentColor, color: '#FFF', fontSize: 14, fontWeight: 600,
                }}>
                다시 하기
              </button>
              <button onClick={() => setDigits(null)}
                style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600,
                }}>
                난이도 변경
              </button>
            </div>
          </div>
        )}

        {/* 입력 */}
        {!won && (
          <div style={{
            display: 'flex', gap: 8, marginTop: 16,
            position: 'sticky', bottom: 16,
            background: '#F7F6F3', padding: 12, borderRadius: 14,
            boxShadow: '0 -2px 10px rgba(0,0,0,0.06)',
          }}>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={digits}
              value={input}
              onChange={e => { setInput(e.target.value.replace(/[^1-9]/g, '')); setError('') }}
              onKeyDown={handleKeyDown}
              placeholder={`${digits}자리 숫자`}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 10,
                border: error ? '2px solid #EF476F' : '2px solid #E0E0E0',
                fontSize: 20, fontWeight: 700, letterSpacing: 6,
                textAlign: 'center', fontFamily: 'monospace',
                outline: 'none',
              }}
            />
            <button onClick={handleSubmit}
              style={{
                padding: '0 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: accentColor, color: '#FFF', fontSize: 15, fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
              확인
            </button>
          </div>
        )}
        {error && (
          <div style={{ textAlign: 'center', color: '#EF476F', fontSize: 12, marginTop: 8 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
