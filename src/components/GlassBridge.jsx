import { useState, useEffect, useMemo } from 'react'
import { playClick, playWin, playLose, playError } from '../utils/sounds'

const STEPS = 16
const STEP_TIME = 10 // 초
const LIVES = 3
const BEST_KEY = 'glassbridge-best'

function makeBridge() {
  return Array.from({ length: STEPS }, () => (Math.random() < 0.5 ? 'L' : 'R'))
}

export default function GlassBridge({ onBack }) {
  const [phase, setPhase] = useState('menu') // menu | playing | win | lose
  const [bridge, setBridge] = useState(() => makeBridge())
  const [step, setStep] = useState(0)
  const [lives, setLives] = useState(LIVES)
  const [reveal, setReveal] = useState({}) // {idx: 'L'|'R'} → 실패한 칸 표시
  const [timeLeft, setTimeLeft] = useState(STEP_TIME)
  const [best, setBest] = useState(() => {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 }
  })

  useEffect(() => {
    if (phase !== 'playing') return
    setTimeLeft(STEP_TIME)
    const t = setInterval(() => {
      setTimeLeft(x => {
        if (x <= 1) {
          // 시간 초과 → 목숨 차감 + 랜덤 한쪽 실패 표시
          handleTimeout()
          return STEP_TIME
        }
        return x - 1
      })
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line
  }, [phase, step])

  const start = () => {
    setBridge(makeBridge())
    setStep(0)
    setLives(LIVES)
    setReveal({})
    setTimeLeft(STEP_TIME)
    setPhase('playing')
  }

  const handleTimeout = () => {
    // 멈춰있어도 그 자리에서 발판 무너짐 가정
    const correct = bridge[step]
    setReveal(r => ({ ...r, [step]: correct === 'L' ? 'R' : 'L' }))
    setLives(prev => {
      const next = prev - 1
      if (next <= 0) {
        setTimeout(() => setPhase('lose'), 600)
      }
      return next
    })
  }

  const choose = (side) => {
    if (phase !== 'playing') return
    const correct = bridge[step]
    if (side === correct) {
      playClick()
      setReveal(r => ({ ...r, [step]: 'safe-' + side }))
      const nextStep = step + 1
      if (nextStep >= STEPS) {
        // 클리어!
        if (best === 0 || nextStep > best) {
          setBest(STEPS)
          try { localStorage.setItem(BEST_KEY, String(STEPS)) } catch (_) {}
        }
        setTimeout(() => { playWin(); setPhase('win') }, 400)
      } else {
        setTimeout(() => setStep(nextStep), 300)
      }
    } else {
      playError()
      setReveal(r => ({ ...r, [step]: 'fail-' + side }))
      setLives(prev => {
        const next = prev - 1
        if (next <= 0) {
          if (step > best) {
            setBest(step)
            try { localStorage.setItem(BEST_KEY, String(step)) } catch (_) {}
          }
          setTimeout(() => { playLose(); setPhase('lose') }, 600)
        }
        return next
      })
    }
  }

  if (phase === 'menu') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16, display: 'block' }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🟦</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>징검다리 (강화유리)</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 1.6 }}>
          {STEPS}개의 발판 중 한쪽은 강화유리, 한쪽은 일반유리.<br />
          ❤️ 목숨 {LIVES}개. 한 칸당 {STEP_TIME}초 안에 선택!
        </p>
        {best > 0 && (
          <div style={{
            display: 'inline-block', padding: '6px 14px', borderRadius: 16,
            background: '#E3F2FD', fontSize: 13, fontWeight: 600, color: '#0D47A1', marginBottom: 24,
          }}>
            🏆 최고 도달: {best}/{STEPS}
          </div>
        )}
        <div style={{ maxWidth: 300, margin: '0 auto' }}>
          <button onClick={start}
            style={{
              width: '100%', padding: '18px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
              fontSize: 17, fontWeight: 700, color: '#FFF',
              background: 'linear-gradient(135deg, #118AB2, #073B4C)',
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
          background: win ? 'linear-gradient(135deg, #D4EDDA, #A8E6CF)' : 'linear-gradient(135deg, #FFF5F5, #F5C6CB)',
          border: `2px solid ${win ? '#27AE60' : '#E63946'}`, marginBottom: 20,
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{win ? '🎉' : '💥'}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            {win ? '다 건너왔다!' : '추락!'}
          </div>
          <div style={{ fontSize: 14, color: '#555' }}>
            {step}/{STEPS} 칸 도달 · 남은 목숨 {Math.max(0, lives)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={start}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#118AB2', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
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

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => setPhase('menu')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <div style={{ display: 'flex', gap: 12, fontSize: 14, fontWeight: 700 }}>
          <span>{'❤️'.repeat(lives)}{'🖤'.repeat(LIVES - lives)}</span>
          <span style={{ color: timeLeft <= 3 ? '#E63946' : '#555' }}>⏱ {timeLeft}초</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 14, fontSize: 16, fontWeight: 700 }}>
        🟦 {step + 1} / {STEPS} 칸
      </div>

      {/* 다리 시각화 (위→아래) */}
      <div style={{
        background: 'linear-gradient(180deg, #073B4C, #0E5B73)',
        padding: '16px 12px', borderRadius: 16, marginBottom: 18,
        maxHeight: 280, overflowY: 'auto',
      }}>
        {Array.from({ length: STEPS }).map((_, i) => {
          const isCurrent = i === step
          const r = reveal[i]
          const cellStyle = (side) => {
            let bg = '#FFF', op = 0.25
            if (r === 'safe-' + side) { bg = '#A8E6CF'; op = 1 }
            else if (r === 'fail-' + side) { bg = '#F5C6CB'; op = 1 }
            else if (r && (r === 'L' || r === 'R') && r === side) { bg = '#F5C6CB'; op = 1 } // 시간초과 실패
            else if (isCurrent) { op = 0.8 }
            return {
              flex: 1, height: 32, borderRadius: 8,
              background: bg, opacity: op,
              border: isCurrent && !r ? '2px solid #FFD700' : '2px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: '#073B4C', fontWeight: 700,
              cursor: isCurrent && !r ? 'pointer' : 'default',
            }
          }
          return (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 5, alignItems: 'center' }}>
              <div style={{ width: 28, fontSize: 11, color: '#A8DADC', textAlign: 'right' }}>{i + 1}</div>
              <div onClick={() => isCurrent && !r && choose('L')} style={cellStyle('L')}>
                {r === 'safe-L' ? '✓' : r === 'fail-L' ? '✗' : isCurrent ? '왼쪽' : ''}
              </div>
              <div onClick={() => isCurrent && !r && choose('R')} style={cellStyle('R')}>
                {r === 'safe-R' ? '✓' : r === 'fail-R' ? '✗' : isCurrent ? '오른쪽' : ''}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => choose('L')}
          style={{
            flex: 1, padding: '20px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #4895EF, #1F77B4)', color: '#FFF',
            fontSize: 18, fontWeight: 800,
          }}>
          ⬅ 왼쪽
        </button>
        <button onClick={() => choose('R')}
          style={{
            flex: 1, padding: '20px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #06A77D, #024B6E)', color: '#FFF',
            fontSize: 18, fontWeight: 800,
          }}>
          오른쪽 ➡
        </button>
      </div>
    </div>
  )
}
