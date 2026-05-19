import { useState, useEffect, useRef, useCallback } from 'react'

const GOAL = 100
const TIME_LIMIT = 45
const BEST_KEY = 'rlgl-best'

export default function RedLightGreenLight({ onBack }) {
  const [phase, setPhase] = useState('menu') // menu | playing | win | lose
  const [progress, setProgress] = useState(0)
  const [light, setLight] = useState('green') // green | red
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [bestTime, setBestTime] = useState(() => {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 }
  })
  const lightRef = useRef('green')
  const switchTimerRef = useRef(null)
  const timeTimerRef = useRef(null)

  const clearTimers = () => {
    if (switchTimerRef.current) clearTimeout(switchTimerRef.current)
    if (timeTimerRef.current) clearInterval(timeTimerRef.current)
  }

  const scheduleSwitch = useCallback(() => {
    const cur = lightRef.current
    // green은 1.2~3초 / red는 1.5~2.5초
    const delay = cur === 'green'
      ? 1200 + Math.random() * 1800
      : 1500 + Math.random() * 1000
    switchTimerRef.current = setTimeout(() => {
      const next = cur === 'green' ? 'red' : 'green'
      lightRef.current = next
      setLight(next)
      scheduleSwitch()
    }, delay)
  }, [])

  const start = useCallback(() => {
    clearTimers()
    setProgress(0)
    setTimeLeft(TIME_LIMIT)
    lightRef.current = 'green'
    setLight('green')
    setPhase('playing')
    scheduleSwitch()
    timeTimerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearTimers()
          setPhase('lose')
          return 0
        }
        return t - 1
      })
    }, 1000)
  }, [scheduleSwitch])

  useEffect(() => () => clearTimers(), [])

  const onTap = () => {
    if (phase !== 'playing') return
    if (lightRef.current === 'red') {
      // 탈락
      clearTimers()
      setPhase('lose')
      return
    }
    setProgress(p => {
      const next = Math.min(GOAL, p + 4)
      if (next >= GOAL) {
        clearTimers()
        const elapsed = TIME_LIMIT - timeLeft
        if (bestTime === 0 || elapsed < bestTime) {
          setBestTime(elapsed)
          try { localStorage.setItem(BEST_KEY, String(elapsed)) } catch (_) {}
        }
        setPhase('win')
      }
      return next
    })
  }

  if (phase === 'menu') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16, display: 'block' }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🌸</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>무궁화 꽃이 피었습니다</h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 16, lineHeight: 1.6 }}>
          🟢 초록불일 때 화면을 빠르게 두드려서 전진!<br />
          🔴 빨간불일 때 누르면 탈락!
        </p>
        {bestTime > 0 && (
          <div style={{
            display: 'inline-block', padding: '6px 14px', borderRadius: 16,
            background: '#FFF3CD', fontSize: 13, fontWeight: 600, color: '#856404', marginBottom: 24,
          }}>
            🏆 최단 통과: {bestTime}초
          </div>
        )}
        <div style={{ maxWidth: 300, margin: '0 auto' }}>
          <button onClick={start}
            style={{
              width: '100%', padding: '18px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
              fontSize: 17, fontWeight: 700, color: '#FFF',
              background: 'linear-gradient(135deg, #E63946, #C1121F)',
            }}>
            🎯 시작
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'win' || phase === 'lose') {
    const win = phase === 'win'
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{
          textAlign: 'center', padding: '32px 20px', borderRadius: 20,
          background: win
            ? 'linear-gradient(135deg, #D4EDDA, #A8E6CF)'
            : 'linear-gradient(135deg, #FFF5F5, #F5C6CB)',
          border: `2px solid ${win ? '#27AE60' : '#E63946'}`, marginBottom: 20,
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{win ? '🎉' : '💀'}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            {win ? '결승선 도착!' : '탈락!'}
          </div>
          <div style={{ fontSize: 14, color: '#555' }}>
            {win ? `${TIME_LIMIT - timeLeft}초 만에 통과` : `${progress}% 지점에서 탈락`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={start}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#E63946', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            다시 도전
          </button>
          <button onClick={() => setPhase('menu')}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#F0F0F0', color: '#555', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            메뉴로
          </button>
        </div>
      </div>
    )
  }

  // playing
  const isRed = light === 'red'
  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => { clearTimers(); setPhase('menu') }}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>
          ←
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#555' }}>⏱ {timeLeft}초</div>
      </div>

      {/* 영희 인형 */}
      <div style={{
        textAlign: 'center', padding: '32px 20px', borderRadius: 20,
        background: isRed
          ? 'linear-gradient(135deg, #FFEBEE, #FFCDD2)'
          : 'linear-gradient(135deg, #E8F5E9, #C8E6C9)',
        transition: 'background 0.2s',
        marginBottom: 16, border: `3px solid ${isRed ? '#E63946' : '#27AE60'}`,
      }}>
        <div style={{ fontSize: 70, lineHeight: 1, transform: isRed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s' }}>
          👧
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12, color: isRed ? '#C1121F' : '#1B5E20' }}>
          {isRed ? '🔴 멈춰!' : '🟢 무궁화 꽃이...'}
        </div>
      </div>

      {/* 진행 바 */}
      <div style={{ background: '#EEE', borderRadius: 20, height: 22, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{
          width: `${progress}%`, height: '100%',
          background: 'linear-gradient(90deg, #4895EF, #1F77B4)',
          transition: 'width 0.1s',
        }} />
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: '#888', marginBottom: 16 }}>{progress}% / 100%</div>

      <button onPointerDown={onTap}
        style={{
          width: '100%', padding: '40px 0', borderRadius: 20, border: 'none', cursor: 'pointer',
          background: isRed ? 'linear-gradient(135deg, #E57373, #C62828)' : 'linear-gradient(135deg, #66BB6A, #2E7D32)',
          color: '#FFF', fontSize: 22, fontWeight: 800,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          userSelect: 'none', touchAction: 'manipulation',
        }}>
        👆 빠르게 두드려요!
      </button>
    </div>
  )
}
