import { useState, useEffect } from 'react'

const HOME = -1
const GOAL = 99

// 노드 좌표 (격자 5x5, 0~5)
const COORDS = {
  // 외곽: 시작점(0)=오른쪽위, 시계방향
  0:  [5, 0],  // 시작/끝
  1:  [5, 1],
  2:  [5, 2],
  3:  [5, 3],
  4:  [5, 4],
  5:  [5, 5],  // 방 (오른쪽 아래)
  6:  [4, 5],
  7:  [3, 5],
  8:  [2, 5],
  9:  [1, 5],
  10: [0, 5],  // 뒷밭 (왼쪽 아래)
  11: [0, 4],
  12: [0, 3],
  13: [0, 2],
  14: [0, 1],
  15: [0, 0],  // 찌 (왼쪽 위)
  16: [1, 0],
  17: [2, 0],
  18: [3, 0],
  19: [4, 0],
  // 방 단축
  20: [4, 4],
  21: [3, 3],
  22: [2.5, 2.5], // 중심
  23: [3, 2],
  24: [4, 1],
  // 뒷밭 단축
  25: [1, 4],
  26: [2, 3],
}

const NODE_IDS = Object.keys(COORDS).map(Number)

// 다음 노드 (isFirstStep: 윷 던지기의 첫 칸인지)
function nextNode(node, isFirstStep) {
  if (node === HOME) return 1
  if (isFirstStep) {
    if (node === 5) return 20
    if (node === 10) return 25
    if (node === 22) return 23  // 중심에서 출발은 시작점 방향
  }
  if (node >= 1 && node < 19) return node + 1
  if (node === 19) return GOAL
  if (node === 20) return 21
  if (node === 21) return 22
  if (node === 22) return 23
  if (node === 23) return 24
  if (node === 24) return GOAL
  if (node === 25) return 26
  if (node === 26) return 22
  return GOAL
}

function move(from, n) {
  let cur = from
  for (let i = 0; i < n; i++) {
    cur = nextNode(cur, i === 0)
    if (cur === GOAL) return GOAL
  }
  return cur
}

// 윷 던지기
function throwYut() {
  // 4 윷가락: 각각 등(0) 또는 배(1) 50%
  let backs = 0
  for (let i = 0; i < 4; i++) if (Math.random() < 0.5) backs++
  // backs: 배(둥근 면 위) 개수
  // 도: 등1배3=1점? 전통적으로: 배 1개 = 도, 배 2개 = 개, 배 3개 = 걸, 배 4개 = 윷, 배 0개 = 모
  // 일반적 변형: 등 1개=도, 등 2개=개, 등 3개=걸, 등 4개=윷, 등 0개(전부 배)=모
  // 여기서는 backs=4 → 모, backs=0 → 윷, backs=1 → 도, ...
  // 헷갈리니 단순화: backs와 무관, 등(round side) 개수로 계산
  const ups = 4 - backs // 등의 개수
  // ups=1 → 도(1), 2→개(2), 3→걸(3), 4→윷(4), 0→모(5)
  if (ups === 0) return { name: '모', steps: 5, again: true }
  if (ups === 1) return { name: '도', steps: 1, again: false }
  if (ups === 2) return { name: '개', steps: 2, again: false }
  if (ups === 3) return { name: '걸', steps: 3, again: false }
  return { name: '윷', steps: 4, again: true }
}

// 게임 상태:
// pieces: [{ id, owner: 'me'|'ai', pos: HOME/GOAL/노드id, group: [말 ids] }]
// 같은 pos에 같은 owner의 말들이 자동으로 같은 그룹

function makeInitialPieces() {
  const arr = []
  for (let i = 0; i < 4; i++) arr.push({ id: 'me' + i, owner: 'me', pos: HOME })
  for (let i = 0; i < 4; i++) arr.push({ id: 'ai' + i, owner: 'ai', pos: HOME })
  return arr
}

// 같은 위치 자기 말들 (group)
function groupAt(pieces, owner, pos) {
  if (pos === HOME || pos === GOAL) return []
  return pieces.filter(p => p.owner === owner && p.pos === pos)
}

// 합법적 이동 후보: 어떤 (자기 말 그룹)을 N칸 이동할 것인가
function getMoveOptions(pieces, owner, steps) {
  const seen = new Set()
  const options = []
  for (const p of pieces) {
    if (p.owner !== owner) continue
    if (p.pos === GOAL) continue
    const groupKey = p.pos
    if (seen.has(groupKey)) continue
    seen.add(groupKey)
    const dest = move(p.pos, steps)
    options.push({ from: p.pos, dest })
  }
  return options
}

// 이동 적용 (잡기/업기 포함). 반환: { newPieces, captured }
function applyMove(pieces, owner, fromPos, steps) {
  const dest = move(fromPos, steps)
  const enemyOwner = owner === 'me' ? 'ai' : 'me'
  let captured = false
  const newPieces = pieces.map(p => {
    if (p.owner === owner && p.pos === fromPos) return { ...p, pos: dest }
    return p
  })
  if (dest !== GOAL && dest !== HOME) {
    // 상대 말 잡기
    for (let i = 0; i < newPieces.length; i++) {
      const p = newPieces[i]
      if (p.owner === enemyOwner && p.pos === dest) {
        newPieces[i] = { ...p, pos: HOME }
        captured = true
      }
    }
  }
  return { newPieces, captured }
}

// 도착 카운트
function goalCount(pieces, owner) {
  return pieces.filter(p => p.owner === owner && p.pos === GOAL).length
}

// AI 휴리스틱: 잡기 > GOAL 가까이 > 업기 > 신규 출발
function aiPickMove(pieces, steps) {
  const options = getMoveOptions(pieces, 'ai', steps)
  if (options.length === 0) return null
  let best = options[0], bestScore = -Infinity
  for (const opt of options) {
    let score = 0
    if (opt.dest === GOAL) score += 100
    // 잡기 가능?
    const enemyAtDest = pieces.some(p => p.owner === 'me' && p.pos === opt.dest)
    if (enemyAtDest) score += 80
    // 자기 말 있는 곳 (업기)
    const allyAtDest = pieces.some(p => p.owner === 'ai' && p.pos === opt.dest && p.pos !== opt.from)
    if (allyAtDest) score += 30
    // 출발 (HOME에서): 우선순위 약간
    if (opt.from === HOME) score += 5
    // 진행도 (보드 위치는 시작점과의 거리)
    if (opt.dest !== GOAL && opt.dest !== HOME) {
      // 대략 GOAL까지 거리 추정 (단순)
      score += (40 - estimateDistance(opt.dest))
    }
    if (score > bestScore) { bestScore = score; best = opt }
  }
  return best
}

function estimateDistance(node) {
  // 단축 경로 사용 가능 거리 (대략)
  if (node >= 1 && node <= 5) return 20 - node + 0
  if (node === 5) return 5  // 방→단축
  if (node >= 6 && node < 10) return 20 - node
  if (node === 10) return 6
  if (node >= 11 && node < 19) return 20 - node
  if (node === 19) return 1
  if (node === 20) return 4
  if (node === 21) return 3
  if (node === 22) return 2
  if (node === 23) return 2
  if (node === 24) return 1
  if (node === 25) return 5
  if (node === 26) return 4
  return 20
}

export default function Yutnori({ onBack }) {
  const [pieces, setPieces] = useState(makeInitialPieces)
  const [turn, setTurn] = useState('me')
  const [pendingThrows, setPendingThrows] = useState([]) // 던진 윷 결과 (이동 대기 중)
  const [lastThrow, setLastThrow] = useState(null)
  const [winner, setWinner] = useState(null)
  const [needsThrow, setNeedsThrow] = useState(true)
  const [busy, setBusy] = useState(false)
  const [logMsg, setLogMsg] = useState('')

  const myGoal = goalCount(pieces, 'me')
  const aiGoal = goalCount(pieces, 'ai')

  // 사람: 윷 던지기
  const doThrow = () => {
    if (turn !== 'me' || winner || busy) return
    if (!needsThrow && pendingThrows.length > 0) return
    const r = throwYut()
    setLastThrow(r)
    setPendingThrows(prev => [...prev, r])
    setNeedsThrow(r.again)
    setLogMsg(`내가 ${r.name}을(를) 던졌어요!${r.again ? ' (한 번 더!)' : ''}`)
  }

  // 사람: 말 선택 → 이동 적용
  const handlePickMove = (fromPos, throwIdx) => {
    if (turn !== 'me' || winner || busy) return
    const t = pendingThrows[throwIdx]
    if (!t) return
    const { newPieces, captured } = applyMove(pieces, 'me', fromPos, t.steps)
    setPieces(newPieces)
    setPendingThrows(prev => prev.filter((_, i) => i !== throwIdx))
    if (captured) {
      // 잡기 보너스: 한 번 더 던질 권리
      setNeedsThrow(true)
      setLogMsg('상대 말을 잡았어요! 한 번 더 던지세요')
    }
    // 종료 확인
    if (goalCount(newPieces, 'me') === 4) {
      setWinner('me'); return
    }
    // pendingThrows가 비고 needsThrow가 false면 AI 턴
    if (pendingThrows.length === 1 && !needsThrow && !captured) {
      setTurn('ai')
      setNeedsThrow(true)
      setLogMsg('AI 차례')
    }
  }

  // AI 턴
  useEffect(() => {
    if (turn !== 'ai' || winner) return
    let cancelled = false
    setBusy(true)
    const run = async () => {
      let throws = []
      // 던지기 (윷/모면 한 번 더)
      while (true) {
        await new Promise(r => setTimeout(r, 700))
        if (cancelled) return
        const r = throwYut()
        setLastThrow(r)
        throws.push(r)
        setLogMsg(`AI가 ${r.name}을(를) 던졌어요`)
        if (!r.again) break
      }
      // 이동 (각 던지기마다)
      let cur = pieces
      for (const t of throws) {
        await new Promise(r => setTimeout(r, 700))
        if (cancelled) return
        const opt = aiPickMove(cur, t.steps)
        if (!opt) continue
        const { newPieces, captured } = applyMove(cur, 'ai', opt.from, t.steps)
        cur = newPieces
        setPieces(cur)
        if (captured) {
          // 한 번 더 던지기 (재귀적)
          await new Promise(r => setTimeout(r, 600))
          while (true) {
            if (cancelled) return
            const extra = throwYut()
            setLastThrow(extra)
            setLogMsg(`AI 보너스 ${extra.name}`)
            await new Promise(r => setTimeout(r, 600))
            const opt2 = aiPickMove(cur, extra.steps)
            if (opt2) {
              const r2 = applyMove(cur, 'ai', opt2.from, extra.steps)
              cur = r2.newPieces
              setPieces(cur)
            }
            if (!extra.again) break
            await new Promise(r => setTimeout(r, 500))
          }
        }
      }
      if (goalCount(cur, 'ai') === 4) {
        setWinner('ai')
      } else {
        setTurn('me')
        setNeedsThrow(true)
        setLogMsg('내 차례')
      }
      setBusy(false)
    }
    run()
    return () => { cancelled = true; setBusy(false) }
  }, [turn, winner])

  const reset = () => {
    setPieces(makeInitialPieces())
    setTurn('me')
    setPendingThrows([])
    setLastThrow(null)
    setWinner(null)
    setNeedsThrow(true)
    setBusy(false)
    setLogMsg('')
  }

  // 윷판 SVG
  const PX = Math.min(360, window.innerWidth - 32)
  const PAD = 22
  const cell = (PX - PAD * 2) / 5
  const toXY = (id) => {
    const [gx, gy] = COORDS[id]
    return { x: PAD + gx * cell, y: PAD + gy * cell }
  }

  // 노드별 말
  const piecesAt = (id) => pieces.filter(p => p.pos === id)
  const homeMe = pieces.filter(p => p.owner === 'me' && p.pos === HOME).length
  const homeAi = pieces.filter(p => p.owner === 'ai' && p.pos === HOME).length

  const myOptions = pendingThrows.length > 0 && turn === 'me' && !winner
    ? getMoveOptions(pieces, 'me', pendingThrows[0].steps)
    : []

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>🪵 윷놀이</h2>
        <button onClick={reset}
          style={{ background: '#F0F0F0', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>리셋</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 6, fontSize: 13, fontWeight: 700 }}>
        <div>🔵 나 (도착 {myGoal}/4, 집 {homeMe})</div>
        <div>🔴 AI (도착 {aiGoal}/4, 집 {homeAi})</div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 13, fontWeight: 700, minHeight: 18, color: '#5D4037' }}>
        {winner === 'me' ? '🎉 승리!' : winner === 'ai' ? '😵 패배' : logMsg || (turn === 'me' ? '윷을 던지세요' : 'AI 차례')}
      </div>

      {/* 윷판 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <svg width={PX} height={PX} style={{ background: '#FFE0B2', borderRadius: 8 }}>
          {/* 외곽 사각형 */}
          <rect x={toXY(15).x} y={toXY(15).y}
            width={toXY(5).x - toXY(15).x} height={toXY(5).y - toXY(15).y}
            fill="none" stroke="#8B4513" strokeWidth="2" />
          {/* 대각선 */}
          <line x1={toXY(5).x} y1={toXY(5).y} x2={toXY(15).x} y2={toXY(15).y} stroke="#8B4513" strokeWidth="1.5" />
          <line x1={toXY(10).x} y1={toXY(10).y} x2={toXY(0).x} y2={toXY(0).y} stroke="#8B4513" strokeWidth="1.5" />
          {/* 노드 원 */}
          {NODE_IDS.map(id => {
            const { x, y } = toXY(id)
            const isCorner = [0, 5, 10, 15].includes(id)
            const isCenter = id === 22
            const r = isCorner || isCenter ? 14 : 9
            const isOption = myOptions.some(o => o.from === id)
            const ps = piecesAt(id)
            return (
              <g key={id} onClick={() => isOption && handlePickMove(id, 0)} style={{ cursor: isOption ? 'pointer' : 'default' }}>
                <circle cx={x} cy={y} r={r}
                  fill={isOption ? '#FFD54F' : isCenter ? '#A1887F' : isCorner ? '#D7CCC8' : '#FFF8E1'}
                  stroke="#8B4513" strokeWidth="1.5" />
                {ps.length > 0 && (
                  <g>
                    <circle cx={x} cy={y} r={r - 3}
                      fill={ps[0].owner === 'me' ? '#1976D2' : '#D32F2F'} />
                    {ps.length > 1 && (
                      <text x={x} y={y + 4} textAnchor="middle"
                        fill="#FFF" fontSize="11" fontWeight="700">{ps.length}</text>
                    )}
                  </g>
                )}
                {id === 0 && ps.length === 0 && (
                  <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fill="#5D4037">출/끝</text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* 던진 윷 목록 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {pendingThrows.map((t, i) => (
          <div key={i} style={{
            background: i === 0 ? '#FFD54F' : '#FFF3E0',
            border: '2px solid #FB8C00', borderRadius: 10, padding: '4px 10px',
            fontSize: 13, fontWeight: 700,
          }}>{t.name} ({t.steps})</div>
        ))}
      </div>

      {turn === 'me' && !winner && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={doThrow}
            disabled={!needsThrow && pendingThrows.length === 0}
            style={{
              padding: '12px 24px', borderRadius: 12, border: 'none',
              background: needsThrow ? '#388E3C' : '#BDBDBD',
              color: '#FFF', fontWeight: 700, fontSize: 14,
              cursor: needsThrow ? 'pointer' : 'default',
            }}>🪵 윷 던지기</button>
        </div>
      )}

      {/* 출발 가능한 말 (HOME에서 출발) */}
      {pendingThrows.length > 0 && turn === 'me' && !winner && homeMe > 0 && myOptions.some(o => o.from === HOME) && (
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button onClick={() => handlePickMove(HOME, 0)}
            style={{
              padding: '8px 16px', borderRadius: 10, border: 'none',
              background: '#1976D2', color: '#FFF', fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
            }}>🏠에서 새 말 출발 ({lastThrow?.name})</button>
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 10 }}>
        4말 모두 도착하면 승리 · 윷/모는 한 번 더 던지기 · 방·뒷밭에 정확히 멈추면 단축 · 상대 말 잡으면 한 번 더
      </p>
    </div>
  )
}
