import { useState, useEffect, useRef, useCallback } from 'react'

const SHAPES = [
  { key: 'circle', name: '동그라미', icon: '⭕', difficulty: 1 },
  { key: 'triangle', name: '삼각형', icon: '🔺', difficulty: 2 },
  { key: 'star', name: '별', icon: '⭐', difficulty: 3 },
  { key: 'umbrella', name: '우산', icon: '☂️', difficulty: 4 },
]

const SIZE = 320 // canvas px (CSS)
const TIME_LIMIT = 60
const MAX_CRACKS = 5
const TOLERANCE = 18 // 외곽선에서 이만큼 벗어나면 크랙

// 경로 생성: SIZE×SIZE 좌표계 기준
function makePath(shape) {
  const cx = SIZE / 2, cy = SIZE / 2
  const points = []
  if (shape === 'circle') {
    const r = SIZE * 0.36
    for (let i = 0; i <= 200; i++) {
      const t = (i / 200) * Math.PI * 2
      points.push([cx + r * Math.cos(t), cy + r * Math.sin(t)])
    }
  } else if (shape === 'triangle') {
    const r = SIZE * 0.38
    const verts = [0, 1, 2].map(i => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
    })
    verts.push(verts[0])
    for (let i = 0; i < 3; i++) {
      const [x1, y1] = verts[i], [x2, y2] = verts[i + 1]
      for (let s = 0; s <= 60; s++) {
        const t = s / 60
        points.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t])
      }
    }
  } else if (shape === 'star') {
    const ro = SIZE * 0.38, ri = SIZE * 0.16
    const verts = []
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const r = i % 2 === 0 ? ro : ri
      verts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
    }
    verts.push(verts[0])
    for (let i = 0; i < 10; i++) {
      const [x1, y1] = verts[i], [x2, y2] = verts[i + 1]
      for (let s = 0; s <= 25; s++) {
        const t = s / 25
        points.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t])
      }
    }
  } else if (shape === 'umbrella') {
    // 반원 + 손잡이 직선 + 작은 J
    const r = SIZE * 0.32
    const top = cy - SIZE * 0.05
    // 반원 (위쪽 둥근 우산)
    for (let i = 0; i <= 120; i++) {
      const t = Math.PI + (i / 120) * Math.PI // 180 → 360
      points.push([cx + r * Math.cos(t), top + r * Math.sin(t)])
    }
    // 손잡이 직선 (아래로)
    for (let i = 0; i <= 80; i++) {
      const t = i / 80
      points.push([cx, top + t * (SIZE * 0.32)])
    }
    // J 꼬리
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * Math.PI
      const jr = SIZE * 0.06
      points.push([cx - jr + jr * Math.cos(-t), top + SIZE * 0.32 + jr * Math.sin(-t) - jr])
    }
  }
  return points
}

function nearestDist(px, py, path) {
  let best = Infinity
  for (let i = 0; i < path.length; i++) {
    const dx = path[i][0] - px, dy = path[i][1] - py
    const d2 = dx * dx + dy * dy
    if (d2 < best) best = d2
  }
  return Math.sqrt(best)
}

export default function Dalgona({ onBack }) {
  const [phase, setPhase] = useState('menu') // menu | playing | win | lose
  const [shape, setShape] = useState('circle')
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [cracks, setCracks] = useState(0)
  const [progress, setProgress] = useState(0)
  const canvasRef = useRef(null)
  const pathRef = useRef([])
  const visitedRef = useRef(null) // Uint8Array of path indices
  const drawingRef = useRef(false)
  const lastPosRef = useRef(null)
  const offCounterRef = useRef(0)
  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])

  // 그리기
  const draw = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    c.width = SIZE * dpr
    c.height = SIZE * dpr
    c.style.width = SIZE + 'px'
    c.style.height = SIZE + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // 달고나 배경
    ctx.fillStyle = '#E8A87C'
    ctx.fillRect(0, 0, SIZE, SIZE)
    // 표면 결
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    for (let i = 0; i < 80; i++) {
      ctx.fillRect(Math.random() * SIZE, Math.random() * SIZE, 2, 2)
    }
    // 모양 외곽선 (점선)
    const path = pathRef.current
    ctx.strokeStyle = '#6D4C41'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    for (let i = 0; i < path.length; i++) {
      const [x, y] = path[i]
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.setLineDash([])

    // 그려진 영역 (방문한 점)
    const visited = visitedRef.current
    if (visited) {
      ctx.fillStyle = '#5D4037'
      for (let i = 0; i < path.length; i++) {
        if (visited[i]) {
          ctx.beginPath()
          ctx.arc(path[i][0], path[i][1], 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }, [])

  // 라운드 시작
  const start = (s) => {
    setShape(s)
    pathRef.current = makePath(s)
    visitedRef.current = new Uint8Array(pathRef.current.length)
    setProgress(0)
    setCracks(0)
    setTimeLeft(TIME_LIMIT)
    offCounterRef.current = 0
    setPhase('playing')
  }

  useEffect(() => {
    if (phase !== 'playing') return
    draw()
    const t = setInterval(() => {
      setTimeLeft(x => {
        if (x <= 1) {
          setPhase('lose')
          return 0
        }
        return x - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [phase, draw, shape])

  useEffect(() => { if (phase === 'playing') draw() }, [progress, cracks, draw, phase])

  const getPos = (e) => {
    const c = canvasRef.current
    if (!c) return null
    const rect = c.getBoundingClientRect()
    const t = e.touches?.[0] || e.changedTouches?.[0] || e
    return [t.clientX - rect.left, t.clientY - rect.top]
  }

  const onDown = (e) => {
    e.preventDefault()
    if (phaseRef.current !== 'playing') return
    drawingRef.current = true
    lastPosRef.current = getPos(e)
    handleMove(lastPosRef.current)
  }
  const onMove = (e) => {
    if (!drawingRef.current) return
    e.preventDefault()
    const p = getPos(e)
    if (!p) return
    // 점 사이 보간
    const [lx, ly] = lastPosRef.current
    const dx = p[0] - lx, dy = p[1] - ly
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4))
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      handleMove([lx + dx * t, ly + dy * t])
    }
    lastPosRef.current = p
  }
  const onUp = () => { drawingRef.current = false }

  const handleMove = (pos) => {
    if (phaseRef.current !== 'playing') return
    const path = pathRef.current
    const visited = visitedRef.current
    const [px, py] = pos
    // 가장 가까운 점 인덱스 찾기 + 거리
    let best = Infinity, bestIdx = -1
    for (let i = 0; i < path.length; i++) {
      const dx = path[i][0] - px, dy = path[i][1] - py
      const d2 = dx * dx + dy * dy
      if (d2 < best) { best = d2; bestIdx = i }
    }
    const dist = Math.sqrt(best)
    if (dist <= TOLERANCE) {
      offCounterRef.current = 0
      // 방문 표시 (주변 몇 개)
      for (let k = -3; k <= 3; k++) {
        const idx = bestIdx + k
        if (idx >= 0 && idx < path.length && !visited[idx]) {
          visited[idx] = 1
        }
      }
      // 진행률
      let count = 0
      for (let i = 0; i < visited.length; i++) if (visited[i]) count++
      const pct = Math.round((count / visited.length) * 100)
      setProgress(prev => {
        if (pct >= 95 && prev < 95) {
          setTimeout(() => setPhase('win'), 50)
        }
        return Math.max(prev, pct)
      })
    } else {
      offCounterRef.current += 1
      // 일정 거리 이상 벗어나서 누적되면 크랙
      if (offCounterRef.current > 8) {
        offCounterRef.current = 0
        setCracks(prev => {
          const next = prev + 1
          if (next >= MAX_CRACKS) {
            setTimeout(() => setPhase('lose'), 50)
          }
          return next
        })
      }
    }
  }

  if (phase === 'menu') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>🍯</div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>달고나 뽑기</h2>
          <p style={{ fontSize: 13, color: '#888', marginTop: 6, lineHeight: 1.6 }}>
            모양 선을 따라 손가락으로 살살 떼어내요.<br />
            너무 벗어나면 깨져요! 5번 깨지면 실패.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {SHAPES.map(s => (
            <button key={s.key} onClick={() => start(s.key)}
              style={{
                padding: '20px 12px', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: '#FFF', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
              <div style={{ fontSize: 36 }}>{s.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: '#FF9F1C' }}>난이도 {'★'.repeat(s.difficulty)}</div>
            </button>
          ))}
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
            ? 'linear-gradient(135deg, #FFF3CD, #FFE082)'
            : 'linear-gradient(135deg, #FFF5F5, #F5C6CB)',
          border: `2px solid ${win ? '#FF9F1C' : '#E63946'}`, marginBottom: 20,
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{win ? '🍯' : '💔'}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            {win ? '성공!' : '실패!'}
          </div>
          <div style={{ fontSize: 14, color: '#555' }}>
            진행 {progress}% · 크랙 {cracks}/{MAX_CRACKS} · 남은 시간 {timeLeft}초
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => start(shape)}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#FF9F1C', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            같은 모양 다시
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
          <span>⏱ {timeLeft}초</span>
          <span style={{ color: '#E63946' }}>💔 {cracks}/{MAX_CRACKS}</span>
        </div>
      </div>
      <div style={{ background: '#EEE', borderRadius: 20, height: 14, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #FF9F1C, #E76F51)', transition: 'width 0.1s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <canvas ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          style={{
            borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            touchAction: 'none', cursor: 'crosshair',
          }} />
      </div>
      <p style={{ textAlign: 'center', fontSize: 12, color: '#888', marginTop: 12 }}>
        손가락으로 점선을 천천히 따라가세요
      </p>
    </div>
  )
}
