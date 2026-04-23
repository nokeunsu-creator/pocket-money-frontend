import { useState, useEffect, useCallback, useRef } from 'react'
import { CHILD1, CHILD2 } from '../config/names'
import { submitQuizScore } from '../api/api'

const PLAYER_KEY = 'num-memory-player'
const BEST_KEY_PREFIX = 'num-memory-best-'
const START_LEN = 3
const SHOW_MS_PER_DIGIT = 700 // 자릿수당 700ms 표시

function thisYearMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function randDigits(n) {
  let s = ''
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10)
  return s
}

export default function NumberMemory({ onBack }) {
  const [player, setPlayer] = useState(() => {
    try { return localStorage.getItem(PLAYER_KEY) } catch { return null }
  })
  const [phase, setPhase] = useState('menu') // menu | showing | typing | right | wrong | gameover
  const [level, setLevel] = useState(START_LEN)
  const [currentNum, setCurrentNum] = useState('')
  const [input, setInput] = useState('')
  const [best, setBest] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!player) return
    try { setBest(Number(localStorage.getItem(BEST_KEY_PREFIX + player)) || 0) } catch (_) {}
  }, [player])

  const choosePlayer = (name) => {
    setPlayer(name)
    try { localStorage.setItem(PLAYER_KEY, name) } catch (_) {}
  }

  const start = useCallback(() => {
    setLevel(START_LEN)
    beginRound(START_LEN)
  }, [])

  function beginRound(n) {
    const num = randDigits(n)
    setCurrentNum(num)
    setInput('')
    setPhase('showing')
    // n자리만큼 보여주고 typing 모드
    const duration = Math.max(1000, n * SHOW_MS_PER_DIGIT)
    setTimeout(() => {
      setPhase('typing')
      setTimeout(() => inputRef.current?.focus(), 50)
    }, duration)
  }

  const submit = () => {
    if (phase !== 'typing') return
    if (input === currentNum) {
      setPhase('right')
      setTimeout(() => {
        const next = level + 1
        setLevel(next)
        beginRound(next)
      }, 1000)
    } else {
      // 틀림 → 게임 오버
      setPhase('wrong')
      const finalLevel = level - 1  // 마지막으로 성공한 레벨
      setTimeout(() => finishGame(finalLevel), 1500)
    }
  }

  function finishGame(finalLevel) {
    if (finalLevel > best) {
      setBest(finalLevel)
      try { localStorage.setItem(BEST_KEY_PREFIX + player, String(finalLevel)) } catch (_) {}
    }
    if (player && finalLevel > 0) {
      submitQuizScore({
        userName: player,
        quizId: 'num-memory',
        grade: null,
        score: finalLevel,
        maxScore: Math.max(20, finalLevel),
        yearMonth: thisYearMonth(),
      }).catch(() => {})
    }
    setPhase('gameover')
  }

  // 플레이어 선택
  if (!player) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🧠</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>숫자 기억</h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>누가 플레이하나요?</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {[CHILD1, CHILD2].map((name, i) => (
            <button key={name} onClick={() => choosePlayer(name)}
              style={{
                padding: '18px 28px', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: i === 0 ? 'linear-gradient(135deg, #4895EF, #3A7BD5)' : 'linear-gradient(135deg, #EF476F, #D63B5C)',
                color: '#FFF', fontSize: 17, fontWeight: 700, minWidth: 120,
              }}>
              {name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 메뉴
  if (phase === 'menu') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={onBack}
            style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer' }}>
            ← 돌아가기
          </button>
          <button onClick={() => { try { localStorage.removeItem(PLAYER_KEY) } catch (_) {}; setPlayer(null) }}
            style={{ background: '#F5F5F5', border: 'none', borderRadius: 12, fontSize: 12, padding: '5px 12px', cursor: 'pointer', color: '#666' }}>
            👤 {player} (바꾸기)
          </button>
        </div>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🧠</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>숫자 기억 게임</h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 8, lineHeight: 1.6 }}>
          잠깐 보여주는 숫자를 외워서<br />
          순서대로 입력해요. 틀리면 끝!
        </p>
        <div style={{
          display: 'inline-block', padding: '8px 16px', borderRadius: 20,
          background: '#FFF3CD', fontSize: 13, fontWeight: 600, color: '#856404', marginBottom: 24,
        }}>
          최고 기록: {best}자리
        </div>
        <div style={{ maxWidth: 300, margin: '0 auto' }}>
          <button onClick={start}
            style={{
              width: '100%', padding: '18px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
              fontSize: 17, fontWeight: 700, color: '#FFF',
              background: 'linear-gradient(135deg, #8E44AD, #6C3483)',
            }}>
            🎯 시작
          </button>
        </div>
      </div>
    )
  }

  // 게임 오버
  if (phase === 'gameover') {
    const reached = level - 1
    const isBest = reached >= best && reached > 0
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{
          textAlign: 'center', padding: '32px 20px', borderRadius: 20,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          border: '2px solid #F1C40F', marginBottom: 20,
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🧠</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{player} 도전 끝!</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#8E44AD' }}>{reached}자리</div>
          {isBest && (
            <div style={{ fontSize: 13, color: '#B7950B', fontWeight: 700, marginTop: 4 }}>
              🏆 최고 기록!
            </div>
          )}
          <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>최고: {best}자리</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={start}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: 'none',
              background: '#8E44AD', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
            다시 도전
          </button>
          <button onClick={() => setPhase('menu')}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: 'none',
              background: '#F0F0F0', color: '#555', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
            메뉴로
          </button>
        </div>
      </div>
    )
  }

  // showing/typing/right/wrong
  const isShow = phase === 'showing'
  const isType = phase === 'typing'
  const isRight = phase === 'right'
  const isWrong = phase === 'wrong'
  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={() => setPhase('menu')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>
          ←
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>🧠 Lv.{level}</h2>
        <div style={{ fontSize: 13, color: '#888' }}>최고 {best}</div>
      </div>

      <div style={{
        padding: '40px 20px', borderRadius: 20,
        background: isRight ? 'linear-gradient(135deg, #E8F8F0, #D4EDDA)'
          : isWrong ? 'linear-gradient(135deg, #FFF5F5, #F5C6CB)'
          : 'linear-gradient(135deg, #F3E5F5, #E1BEE7)',
        marginBottom: 20, minHeight: 160,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        {isShow && (
          <>
            <div style={{ fontSize: 13, color: '#6C3483', marginBottom: 12 }}>외워주세요!</div>
            <div style={{
              fontSize: Math.max(28, 56 - level * 2),
              fontWeight: 800, color: '#4A148C',
              letterSpacing: 6,
              fontFamily: 'monospace',
            }}>
              {currentNum}
            </div>
          </>
        )}
        {isType && (
          <>
            <div style={{ fontSize: 13, color: '#6C3483', marginBottom: 12 }}>기억한 숫자를 입력하세요!</div>
            <input ref={inputRef}
              type="number"
              inputMode="numeric"
              value={input}
              onChange={e => setInput(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder={'?'.repeat(level)}
              style={{
                width: '80%', padding: '14px', fontSize: 28, fontWeight: 700,
                border: '2px solid #BA68C8', borderRadius: 12,
                textAlign: 'center', letterSpacing: 6, fontFamily: 'monospace',
                minWidth: 0, boxSizing: 'border-box',
                background: '#FFF',
              }} />
          </>
        )}
        {isRight && (
          <>
            <div style={{ fontSize: 40 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#27AE60', marginTop: 8 }}>정답!</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>다음 레벨 준비...</div>
          </>
        )}
        {isWrong && (
          <>
            <div style={{ fontSize: 40 }}>❌</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#C0392B', marginTop: 8 }}>틀렸어요</div>
            <div style={{ fontSize: 14, color: '#555', marginTop: 6 }}>
              정답은 <b>{currentNum}</b> 였어요
            </div>
          </>
        )}
      </div>

      {isType && (
        <button onClick={submit}
          disabled={input.length === 0}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
            background: input.length > 0 ? '#8E44AD' : '#DDD',
            color: '#FFF', fontSize: 16, fontWeight: 700,
            cursor: input.length > 0 ? 'pointer' : 'default',
          }}>
          확인
        </button>
      )}
    </div>
  )
}
