import { useState, useEffect, useRef, useCallback } from 'react'
import { CHILD1, CHILD2 } from '../config/names'

const TURN_SECONDS = 20
const COLORS = [
  { name: '검정', value: '#222' },
  { name: '빨강', value: '#E74C3C' },
  { name: '주황', value: '#F39C12' },
  { name: '노랑', value: '#F1C40F' },
  { name: '초록', value: '#27AE60' },
  { name: '파랑', value: '#3498DB' },
  { name: '보라', value: '#9B59B6' },
  { name: '분홍', value: '#EF476F' },
]

export default function CollaborativeDrawing({ onBack }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [phase, setPhase] = useState('menu') // menu | playing | done
  const [players, setPlayers] = useState([CHILD1, CHILD2])
  const [turn, setTurn] = useState(0) // 0 or 1
  const [turnsLeft, setTurnsLeft] = useState(6) // 각자 3번씩 돌아가며
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS)
  const [color, setColor] = useState(COLORS[0].value)
  const [size, setSize] = useState(6)
  const [drawing, setDrawing] = useState(false)
  const lastPos = useRef({ x: 0, y: 0 })

  const currentPlayer = players[turn]

  // 캔버스 크기 조정
  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current
    if (!canvas) return
    const container = containerRef.current
    const width = container.clientWidth
    const height = Math.min(width, 500)
    canvas.width = width * 2
    canvas.height = height * 2
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    const ctx = canvas.getContext('2d')
    ctx.scale(2, 2)
    ctx.fillStyle = '#FFF'
    ctx.fillRect(0, 0, width, height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [phase])

  // 턴 타이머
  useEffect(() => {
    if (phase !== 'playing') return
    if (timeLeft <= 0) {
      endTurn()
      return
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft])

  const start = () => {
    setTurn(0)
    setTurnsLeft(6)
    setTimeLeft(TURN_SECONDS)
    setPhase('playing')
  }

  const endTurn = () => {
    const next = turnsLeft - 1
    if (next <= 0) {
      setPhase('done')
      return
    }
    setTurnsLeft(next)
    setTurn(t => (t + 1) % 2)
    setTimeLeft(TURN_SECONDS)
  }

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const startDraw = (e) => {
    e.preventDefault()
    setDrawing(true)
    lastPos.current = getPos(e)
  }

  const moveDraw = (e) => {
    if (!drawing) return
    e.preventDefault()
    const pos = getPos(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.strokeStyle = color
    ctx.lineWidth = size
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }

  const endDraw = () => setDrawing(false)

  const clearCanvas = () => {
    if (!window.confirm('그림을 모두 지울까요?')) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const w = canvas.width / 2
    const h = canvas.height / 2
    ctx.fillStyle = '#FFF'
    ctx.fillRect(0, 0, w, h)
  }

  const saveImage = () => {
    const canvas = canvasRef.current
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `이어그리기_${players[0]}_${players[1]}.png`
    a.click()
  }

  // 메뉴
  if (phase === 'menu') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎨</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>이어그리기</h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
          번갈아 가며 한 그림에 계속 그려서 완성!<br />
          각자 3번씩, 한 번에 20초
        </p>
        <div style={{ maxWidth: 280, margin: '0 auto 20px' }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>플레이어</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={players[0]} onChange={e => setPlayers([e.target.value, players[1]])}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '2px solid #EEE', fontSize: 14, minWidth: 0, boxSizing: 'border-box' }} />
            <span style={{ alignSelf: 'center', color: '#888' }}>vs</span>
            <input value={players[1]} onChange={e => setPlayers([players[0], e.target.value])}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '2px solid #EEE', fontSize: 14, minWidth: 0, boxSizing: 'border-box' }} />
          </div>
        </div>
        <button onClick={start}
          style={{
            width: '100%', maxWidth: 280, padding: '16px 0', borderRadius: 14,
            border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF',
            background: 'linear-gradient(135deg, #E67E22, #D35400)',
          }}>
          🖍️ 그리기 시작
        </button>
      </div>
    )
  }

  // 결과
  if (phase === 'done') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🖼️</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>합작 완성!</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>
            {players[0]} + {players[1]}
          </div>
        </div>
        <div ref={containerRef}>
          <canvas ref={canvasRef}
            style={{ border: '2px solid #EEE', borderRadius: 12, display: 'block', maxWidth: '100%' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button onClick={saveImage}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#06D6A0', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            💾 저장
          </button>
          <button onClick={start}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#E67E22', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            다시
          </button>
          <button onClick={() => setPhase('menu')}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#F0F0F0', color: '#555', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            메뉴
          </button>
        </div>
      </div>
    )
  }

  // 플레이
  const timerPct = (timeLeft / TURN_SECONDS) * 100
  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <button onClick={() => setPhase('menu')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>
          ←
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>🎨 이어그리기</h2>
        <div style={{ fontSize: 12, color: '#888' }}>남은 턴 {turnsLeft}</div>
      </div>

      {/* 현재 차례 + 타이머 */}
      <div style={{
        background: turn === 0 ? 'linear-gradient(135deg, #4895EF, #3A7BD5)' : 'linear-gradient(135deg, #EF476F, #D63B5C)',
        color: '#FFF', padding: '10px 16px', borderRadius: 12, marginBottom: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>차례</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{currentPlayer}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>⏱ {timeLeft}</div>
        </div>
      </div>
      <div style={{ height: 4, background: '#EEE', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{
          width: `${timerPct}%`, height: '100%',
          background: timeLeft <= 5 ? '#E74C3C' : '#06D6A0',
          transition: 'width 1s linear',
        }} />
      </div>

      {/* 캔버스 */}
      <div ref={containerRef}>
        <canvas ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={moveDraw}
          onTouchEnd={endDraw}
          style={{ border: '2px solid #EEE', borderRadius: 12, display: 'block', maxWidth: '100%', touchAction: 'none' }} />
      </div>

      {/* 색상 선택 */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        {COLORS.map(c => (
          <button key={c.value} onClick={() => setColor(c.value)}
            aria-label={c.name}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: c.value, border: color === c.value ? '3px solid #2C3E50' : '2px solid #EEE',
              cursor: 'pointer',
            }} />
        ))}
      </div>

      {/* 굵기 */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#888' }}>굵기</span>
        {[3, 6, 10, 16].map(s => (
          <button key={s} onClick={() => setSize(s)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 10, border: size === s ? '2px solid #2C3E50' : '1px solid #EEE',
              background: '#FFF', cursor: 'pointer', fontSize: 12,
            }}>
            <span style={{
              display: 'inline-block', width: s * 1.5, height: s * 1.5,
              background: color, borderRadius: '50%',
            }} />
          </button>
        ))}
      </div>

      {/* 턴 종료 / 지우기 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={clearCanvas}
          style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#FDECEA', color: '#C0392B', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          🧽 전체 지우기
        </button>
        <button onClick={endTurn}
          style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: '#06D6A0', color: '#FFF', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          ✅ 다 그렸어요, 다음 차례
        </button>
      </div>
    </div>
  )
}
