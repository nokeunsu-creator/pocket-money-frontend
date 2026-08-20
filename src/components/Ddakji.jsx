import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

const WIN_ROUNDS = 3 // 5판 3선승

// 파워 게이지: 0~100 왕복, 빨간 구역(70~95)에 멈추면 강타
function flipChance(power) {
  // 70~95 sweet spot
  if (power >= 70 && power <= 95) return 0.85
  if (power >= 55 && power < 70) return 0.45
  if (power > 95) return 0.55 // 너무 세서 빗나감
  if (power >= 40 && power < 55) return 0.2
  return 0.05
}

export default function Ddakji({ onBack }) {
  const [mode, setMode] = useState(null)
  if (!mode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16, display: 'block' }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🟫</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>딱지치기</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
          파워 게이지 sweet spot(70~95)에 멈춰서 뒤집기!<br />
          3판 먼저 뒤집으면 승리.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
          <button onClick={() => setMode('ai')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #8B4513, #5D2F09)', color: '#FFF', fontSize: 16, fontWeight: 700 }}>
            🤖 AI 대전
          </button>
          <button onClick={() => setMode('online')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4895EF, #1F77B4)', color: '#FFF', fontSize: 16, fontWeight: 700 }}>
            🌐 온라인 2인
          </button>
        </div>
      </div>
    )
  }
  if (mode === 'ai') return <DdakjiAI onBack={() => setMode(null)} />
  return <DdakjiOnline onBack={() => setMode(null)} />
}

function DdakjiAI({ onBack }) {
  const [phase, setPhase] = useState('menu') // menu | playing | over
  const [myWins, setMyWins] = useState(0)
  const [aiWins, setAiWins] = useState(0)
  const [round, setRound] = useState(1)
  const [turn, setTurn] = useState('me') // me | ai
  const [power, setPower] = useState(0)
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState([]) // [{by, power, flipped}]
  const dirRef = useRef(1)
  const animRef = useRef(null)

  const stopGauge = useCallback(() => {
    setRunning(false)
    if (animRef.current) cancelAnimationFrame(animRef.current)
  }, [])

  useEffect(() => () => stopGauge(), [stopGauge])

  const startGauge = () => {
    setPower(0)
    dirRef.current = 1
    setRunning(true)
    const loop = () => {
      setPower(p => {
        let np = p + dirRef.current * 2.5
        if (np >= 100) { np = 100; dirRef.current = -1 }
        if (np <= 0) { np = 0; dirRef.current = 1 }
        return np
      })
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
  }

  const startRound = () => {
    setPhase('playing')
    setRound(1)
    setMyWins(0); setAiWins(0)
    setTurn('me')
    setLog([])
    setTimeout(startGauge, 200)
  }

  const myStrike = () => {
    if (!running || turn !== 'me') return
    stopGauge()
    const p = Math.round(power)
    const flipped = Math.random() < flipChance(p)
    setLog(l => [...l, { by: 'me', power: p, flipped }])
    setTimeout(() => resolveStrike(flipped, 'me'), 700)
  }

  const aiTurn = useCallback(() => {
    // AI 파워: 60~95에서 정규분포 비슷
    const p = Math.round(55 + Math.random() * 40)
    const flipped = Math.random() < flipChance(p)
    setPower(p)
    setLog(l => [...l, { by: 'ai', power: p, flipped }])
    setTimeout(() => resolveStrike(flipped, 'ai'), 800)
    // eslint-disable-next-line
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    if (turn === 'ai' && !running) {
      setTimeout(aiTurn, 500)
    }
    // eslint-disable-next-line
  }, [turn, phase])

  const resolveStrike = (flipped, by) => {
    if (flipped) {
      // 그 라운드 승
      if (by === 'me') setMyWins(w => {
        const next = w + 1
        if (next >= WIN_ROUNDS) setTimeout(() => setPhase('over'), 600)
        return next
      })
      else setAiWins(w => {
        const next = w + 1
        if (next >= WIN_ROUNDS) setTimeout(() => setPhase('over'), 600)
        return next
      })
      // 새 라운드
      setTimeout(() => {
        setRound(r => r + 1)
        setTurn('me')
        setLog([])
        setTimeout(startGauge, 200)
      }, 1300)
    } else {
      // 차례 교대 (같은 라운드 안)
      setTimeout(() => {
        setTurn(by === 'me' ? 'ai' : 'me')
        if (by === 'ai') setTimeout(startGauge, 200)
      }, 800)
    }
  }

  if (phase === 'menu') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16, display: 'block' }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🟫</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>딱지치기</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
          움직이는 파워 게이지가 <b style={{ color: '#E63946' }}>빨간 구역(70~95)</b>에 있을 때<br />
          탭하면 딱지가 뒤집힐 확률이 높아져요!<br />
          3판 먼저 뒤집으면 승리!
        </p>
        <button onClick={startRound}
          style={{ padding: '16px 40px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #8B4513, #5D2F09)', color: '#FFF', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
          🎯 시작
        </button>
      </div>
    )
  }

  if (phase === 'over') {
    const win = myWins > aiWins
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{
          textAlign: 'center', padding: '32px 20px', borderRadius: 20,
          background: win ? 'linear-gradient(135deg, #D4EDDA, #A8E6CF)' : 'linear-gradient(135deg, #FFF5F5, #F5C6CB)',
          border: `2px solid ${win ? '#27AE60' : '#E63946'}`, marginBottom: 20,
        }}>
          <div style={{ fontSize: 56 }}>{win ? '🏆' : '😵'}</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{win ? '승리!' : '패배...'}</div>
          <div style={{ fontSize: 14, color: '#555' }}>최종 {myWins} : {aiWins}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={startRound}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#8B4513', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>다시</button>
          <button onClick={() => setPhase('menu')}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#F0F0F0', color: '#555', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>메뉴</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={() => { stopGauge(); setPhase('menu') }}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 17, fontWeight: 700 }}>🟫 라운드 {round}</h2>
        <div style={{ width: 22 }} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <div style={{ flex: 1, padding: 14, borderRadius: 14, background: '#E8F5E9', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#2D6A4F', fontWeight: 700 }}>나</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{myWins}</div>
        </div>
        <div style={{ flex: 1, padding: 14, borderRadius: 14, background: '#FFF5F5', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#B91D47', fontWeight: 700 }}>AI</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{aiWins}</div>
        </div>
      </div>

      {/* 딱지 일러스트 */}
      <div style={{
        background: '#FFEFD5', borderRadius: 16, padding: '30px 0', textAlign: 'center', marginBottom: 16,
        border: '2px dashed #8B4513',
      }}>
        <div style={{ fontSize: 64 }}>🟫</div>
        <div style={{ fontSize: 13, color: '#5D2F09', fontWeight: 700, marginTop: 4 }}>
          {turn === 'me' ? '🎯 내 차례' : '🤖 AI 차례'}
        </div>
      </div>

      {/* 파워 게이지 */}
      <div style={{
        position: 'relative', height: 36, background: '#EEE', borderRadius: 18, marginBottom: 16,
        overflow: 'hidden',
      }}>
        {/* sweet spot */}
        <div style={{
          position: 'absolute', left: '70%', width: '25%', top: 0, bottom: 0,
          background: 'rgba(230, 57, 70, 0.25)',
        }} />
        {/* power fill */}
        <div style={{
          height: '100%', width: `${power}%`,
          background: power >= 70 && power <= 95
            ? 'linear-gradient(90deg, #E63946, #C1121F)'
            : 'linear-gradient(90deg, #4895EF, #1F77B4)',
          transition: running ? 'none' : 'width 0.2s',
        }} />
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, color: '#FFF', textShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }}>
          파워 {Math.round(power)}
        </div>
      </div>

      {turn === 'me' && running ? (
        <button onPointerDown={myStrike}
          style={{
            width: '100%', padding: '24px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #8B4513, #5D2F09)', color: '#FFF',
            fontSize: 20, fontWeight: 800,
            touchAction: 'manipulation',
          }}>
          💥 내려쳐!
        </button>
      ) : (
        <div style={{ padding: 16, textAlign: 'center', color: '#888', fontSize: 14 }}>
          {turn === 'ai' ? 'AI가 노리는 중...' : '결과 확인 중...'}
        </div>
      )}

      {log.length > 0 && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: '#F5F5F5', fontSize: 12 }}>
          {log.slice(-3).map((l, i) => (
            <div key={i} style={{ color: l.flipped ? '#27AE60' : '#888' }}>
              {l.by === 'me' ? '🙋' : '🤖'} 파워 {l.power} → {l.flipped ? '✅ 뒤집힘!' : '안 뒤집힘'}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 온라인 2인 ───
// 동기화 모델:
// - 각 라운드는 'host' 또는 'guest'가 striker(공격자)
// - striker가 게이지 멈추고 power 제출 → 양쪽 동일 확률 시드 사용 위해 결과도 striker가 결정 (clientside)
// - 룸 상태: { hostWins, guestWins, round, striker:'host'|'guest', phase:'striking'|'reveal'|'over', lastStrike }
function DdakjiOnline({ onBack }) {
  const room = useGameRoom('ddakji')
  const [joinCode, setJoinCode] = useState('')
  const [power, setPower] = useState(0)
  const [running, setRunning] = useState(false)
  const dirRef = useRef(1)
  const animRef = useRef(null)

  const initialState = () => ({
    hostWins: 0, guestWins: 0,
    round: 1,
    striker: 'host', // 처음엔 호스트부터
    phase: 'striking', // striking | reveal | over
    lastStrike: null, // { by, power, flipped }
  })

  const stopGauge = useCallback(() => {
    setRunning(false)
    if (animRef.current) cancelAnimationFrame(animRef.current)
  }, [])

  const startGauge = () => {
    setPower(0); dirRef.current = 1; setRunning(true)
    const loop = () => {
      setPower(p => {
        let np = p + dirRef.current * 2.5
        if (np >= 100) { np = 100; dirRef.current = -1 }
        if (np <= 0) { np = 0; dirRef.current = 1 }
        return np
      })
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
  }

  useEffect(() => () => stopGauge(), [stopGauge])

  const s = room.gameState || initialState()
  const myKey = room.role === 'host' ? 'host' : 'guest'
  const oppKey = myKey === 'host' ? 'guest' : 'host'
  const isMyTurn = s.phase === 'striking' && s.striker === myKey
  const myWins = myKey === 'host' ? s.hostWins : s.guestWins
  const oppWins = myKey === 'host' ? s.guestWins : s.hostWins

  // 내 차례에 자동으로 게이지 시작
  useEffect(() => {
    if (!room.connected) return
    if (isMyTurn && !running) {
      const t = setTimeout(startGauge, 400)
      return () => clearTimeout(t)
    }
    if (!isMyTurn && running) stopGauge()
    // eslint-disable-next-line
  }, [isMyTurn, room.connected])

  const strike = () => {
    if (!isMyTurn || !running) return
    stopGauge()
    const p = Math.round(power)
    const flipped = Math.random() < flipChance(p)
    const lastStrike = { by: myKey, power: p, flipped }
    if (flipped) {
      // 라운드 승리
      const next = { ...s, lastStrike, phase: 'reveal' }
      if (myKey === 'host') next.hostWins = s.hostWins + 1
      else next.guestWins = s.guestWins + 1
      if ((myKey === 'host' ? next.hostWins : next.guestWins) >= WIN_ROUNDS) {
        next.phase = 'over'
      }
      room.updateState(next)
    } else {
      // 차례 교대 (같은 라운드)
      room.updateState({ ...s, lastStrike, striker: oppKey })
    }
  }

  const nextRound = () => {
    if (!room.isHost && room.role !== 'host') return // 호스트가 진행
    if (s.phase === 'over') return
    room.updateState({
      ...s, round: s.round + 1, striker: 'host', phase: 'striking', lastStrike: null,
    })
  }

  // 룸 생성/참가
  if (!room.roomCode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>← 돌아가기</button>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🟫</div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>딱지치기 온라인</h2>
        </div>
        <button onClick={() => room.createRoom(initialState())}
          style={{ width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', background: '#8B4513', color: '#FFF', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>
          ➕ 방 만들기
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 2))}
            placeholder="방 코드 2자리" inputMode="numeric"
            style={{ flex: 1, padding: '14px', fontSize: 16, borderRadius: 12, border: '1.5px solid #DDD', minWidth: 0, boxSizing: 'border-box', textAlign: 'center' }} />
          <button onClick={() => room.joinRoom(joinCode, initialState())}
            disabled={joinCode.length !== 2}
            style={{ padding: '0 18px', borderRadius: 12, border: 'none', background: joinCode.length === 2 ? '#4895EF' : '#DDD', color: '#FFF', fontWeight: 700, cursor: joinCode.length === 2 ? 'pointer' : 'default' }}>참가</button>
        </div>
        {room.error && <p style={{ color: '#C62828', textAlign: 'center', marginTop: 10 }}>{room.error}</p>}
      </div>
    )
  }

  if (!room.connected) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>방 코드: <span style={{ color: '#8B4513' }}>{room.roomCode}</span></h2>
        <p style={{ color: '#888', marginTop: 16 }}>친구 기다리는 중...</p>
        <button onClick={room.leaveRoom} style={{ marginTop: 24, padding: '12px 24px', borderRadius: 12, border: 'none', background: '#F0F0F0', cursor: 'pointer' }}>나가기</button>
      </div>
    )
  }

  // 게임 진행
  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={room.leaveRoom}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>방 {room.roomCode} · R{s.round}</h2>
        <div style={{ width: 22 }} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, padding: 14, borderRadius: 14, background: '#E8F5E9', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#2D6A4F', fontWeight: 700 }}>나 ({myKey})</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{myWins}</div>
        </div>
        <div style={{ flex: 1, padding: 14, borderRadius: 14, background: '#FFF5F5', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#B91D47', fontWeight: 700 }}>상대</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{oppWins}</div>
        </div>
      </div>

      {s.phase === 'over' && (
        <div style={{
          padding: 22, borderRadius: 16, marginBottom: 14,
          background: myWins > oppWins ? 'linear-gradient(135deg, #D4EDDA, #A8E6CF)' : 'linear-gradient(135deg, #FFF5F5, #F5C6CB)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 50 }}>{myWins > oppWins ? '🏆' : '😵'}</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{myWins > oppWins ? '승리!' : '패배'}</div>
        </div>
      )}

      <div style={{
        background: '#FFEFD5', borderRadius: 16, padding: '24px 0', textAlign: 'center', marginBottom: 14,
        border: '2px dashed #8B4513',
      }}>
        <div style={{ fontSize: 56 }}>🟫</div>
        <div style={{ fontSize: 13, color: '#5D2F09', fontWeight: 700, marginTop: 4 }}>
          {s.phase === 'over' ? '게임 종료' : isMyTurn ? '🎯 내 차례' : '👀 상대 차례'}
        </div>
      </div>

      <div style={{
        position: 'relative', height: 36, background: '#EEE', borderRadius: 18, marginBottom: 14, overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', left: '70%', width: '25%', top: 0, bottom: 0, background: 'rgba(230, 57, 70, 0.25)' }} />
        <div style={{
          height: '100%', width: `${power}%`,
          background: power >= 70 && power <= 95 ? 'linear-gradient(90deg, #E63946, #C1121F)' : 'linear-gradient(90deg, #4895EF, #1F77B4)',
        }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#FFF', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
          파워 {Math.round(power)}
        </div>
      </div>

      {s.phase === 'striking' && isMyTurn && running && (
        <button onPointerDown={strike}
          style={{
            width: '100%', padding: '22px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #8B4513, #5D2F09)', color: '#FFF',
            fontSize: 20, fontWeight: 800, touchAction: 'manipulation',
          }}>
          💥 내려쳐!
        </button>
      )}
      {s.phase === 'reveal' && (
        <div>
          <div style={{ padding: 14, borderRadius: 12, background: '#FFF3CD', textAlign: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>
              {s.lastStrike?.by === myKey ? '내가' : '상대가'} 파워 {s.lastStrike?.power}로 ✅ 뒤집음!
            </div>
          </div>
          {room.role === 'host' && (
            <button onClick={nextRound}
              style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: '#8B4513', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>
              다음 라운드 (호스트)
            </button>
          )}
          {room.role !== 'host' && (
            <div style={{ textAlign: 'center', color: '#888', fontSize: 13 }}>호스트가 진행 중...</div>
          )}
        </div>
      )}

      {s.lastStrike && s.phase === 'striking' && !s.lastStrike.flipped && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: '#F5F5F5', fontSize: 12, textAlign: 'center', color: '#555' }}>
          {s.lastStrike.by === myKey ? '내' : '상대'} 파워 {s.lastStrike.power} → 안 뒤집힘. 차례 교대!
        </div>
      )}
    </div>
  )
}
