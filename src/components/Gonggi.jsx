import { useState, useEffect, useRef, useCallback } from 'react'

// 공기놀이 5단계 (나무위키 기준)
// 1단(한 알): 4알 흩고, 1알 던지고 1알 줍고 받기 ×4
// 2단(두 알): 2알씩 ×2
// 3단(세 알): 3알 1번 + 1알 1번 (혹은 1+3)
// 4단(네 알): 4알 한 번에
// 꺾기: 5알 손등으로 던져 받고, 다시 던져 손바닥으로 잡기

const STAGES = [
  { id: 1, name: '1단 (한 알)', picks: [1, 1, 1, 1], desc: '4알 흩고 한 알씩 4번' },
  { id: 2, name: '2단 (두 알)', picks: [2, 2], desc: '두 알씩 2번' },
  { id: 3, name: '3단 (세 알)', picks: [3, 1], desc: '세 알 + 한 알' },
  { id: 4, name: '4단 (네 알)', picks: [4], desc: '네 알 한 번에' },
]

const BEST_KEY = 'gonggi-best'

// 게이지 sweet spot 정의
const THROW_SWEET = [40, 75] // 던지기 파워
const CATCH_SWEET = [55, 90] // 받기 타이밍

export default function Gonggi({ onBack }) {
  const [phase, setPhase] = useState('menu') // menu | playing | over | bend(꺾기)
  const [stage, setStage] = useState(0) // STAGES index
  const [stepIdx, setStepIdx] = useState(0) // 이번 단계 안에서 몇 번째 던지기인지
  const [sub, setSub] = useState('throw') // throw | pickup | catch
  const [gauge, setGauge] = useState(0)
  const [running, setRunning] = useState(false)
  const [score, setScore] = useState(0)
  const [bendCatch, setBendCatch] = useState(null) // 꺾기 잡은 개수
  const [msg, setMsg] = useState('')
  const dirRef = useRef(1)
  const animRef = useRef(null)
  const [best, setBest] = useState(() => {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 }
  })

  const stopGauge = useCallback(() => {
    setRunning(false)
    if (animRef.current) cancelAnimationFrame(animRef.current)
  }, [])

  useEffect(() => () => stopGauge(), [stopGauge])

  const startGauge = (speed = 2.5) => {
    setGauge(0)
    dirRef.current = 1
    setRunning(true)
    const loop = () => {
      setGauge(g => {
        let n = g + dirRef.current * speed
        if (n >= 100) { n = 100; dirRef.current = -1 }
        if (n <= 0) { n = 0; dirRef.current = 1 }
        return n
      })
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
  }

  const start = () => {
    setPhase('playing')
    setStage(0); setStepIdx(0); setSub('throw'); setScore(0); setMsg('')
    setTimeout(() => startGauge(2.5), 200)
  }

  const tap = () => {
    if (!running) return
    stopGauge()
    const g = Math.round(gauge)

    if (sub === 'throw') {
      const ok = g >= THROW_SWEET[0] && g <= THROW_SWEET[1]
      if (!ok) return fail('던지기 실패! 너무 약하거나 셌어요')
      setMsg('💪 멋진 던지기!')
      setTimeout(() => { setSub('pickup'); setMsg(''); startGauge(3.5) }, 700)
    } else if (sub === 'pickup') {
      // 더 까다로움 (집기는 빠르게)
      const range = [50, 90]
      const ok = g >= range[0] && g <= range[1]
      if (!ok) return fail('집기 실패! 타이밍이 빗나갔어요')
      setMsg('🤏 집기 성공!')
      setTimeout(() => { setSub('catch'); setMsg(''); startGauge(4.0) }, 600)
    } else if (sub === 'catch') {
      const ok = g >= CATCH_SWEET[0] && g <= CATCH_SWEET[1]
      if (!ok) return fail('받기 실패! 떨어뜨렸어요')
      setMsg('🎯 받았다!')
      setTimeout(advance, 700)
    }
  }

  const fail = (m) => {
    setMsg('❌ ' + m)
    setTimeout(finish, 1300)
  }

  const advance = () => {
    const stageDef = STAGES[stage]
    const next = stepIdx + 1
    if (next >= stageDef.picks.length) {
      // 단계 완료
      const reward = 5 * (stage + 1) // 단계별 보너스
      setScore(s => s + reward)
      setMsg(`🎉 ${stageDef.name} 클리어! +${reward}`)
      if (stage + 1 >= STAGES.length) {
        // 4단 완료 → 꺾기
        setTimeout(() => { setMsg(''); setPhase('bend') }, 1200)
      } else {
        setTimeout(() => {
          setMsg(''); setStage(stage + 1); setStepIdx(0); setSub('throw')
          startGauge(2.5)
        }, 1200)
      }
    } else {
      setStepIdx(next); setSub('throw'); setMsg('')
      setTimeout(() => startGauge(2.5), 400)
    }
  }

  // 꺾기: 5알 던져 손등 → 다시 던져 손바닥
  const [bendPhase, setBendPhase] = useState('toss') // toss | catch1 | toss2 | catch2
  const [bendStones, setBendStones] = useState(0)

  useEffect(() => {
    if (phase !== 'bend') return
    setBendPhase('toss'); setBendStones(0)
    setTimeout(() => startGauge(3.5), 400)
    // eslint-disable-next-line
  }, [phase])

  const bendTap = () => {
    if (!running) return
    stopGauge()
    const g = Math.round(gauge)
    if (bendPhase === 'toss') {
      const ok = g >= 50 && g <= 85
      if (!ok) {
        setMsg('❌ 던지기 실패')
        setTimeout(finish, 1200)
        return
      }
      setMsg('👋 손등으로!')
      setTimeout(() => { setBendPhase('catch1'); setMsg(''); startGauge(4.5) }, 600)
    } else if (bendPhase === 'catch1') {
      // 받는 개수 = 정확도 (0~5)
      const acc = 100 - Math.abs(72 - g) * 2
      const caught = Math.max(0, Math.min(5, Math.round(acc / 20)))
      setBendStones(caught)
      setMsg(`✋ 손등에 ${caught}알 받음`)
      if (caught === 0) {
        setTimeout(finish, 1200)
      } else {
        setTimeout(() => { setBendPhase('toss2'); setMsg(''); startGauge(4.0) }, 1000)
      }
    } else if (bendPhase === 'toss2') {
      const ok = g >= 45 && g <= 85
      if (!ok) {
        setMsg('❌ 두 번째 던지기 실패')
        setBendCatch(0)
        setTimeout(finish, 1200)
        return
      }
      setMsg('🤚 손바닥으로!')
      setTimeout(() => { setBendPhase('catch2'); setMsg(''); startGauge(4.8) }, 600)
    } else if (bendPhase === 'catch2') {
      // 최종 점수: bendStones 중 일부만 잡힘
      const acc = 100 - Math.abs(72 - g) * 2
      const caught = Math.max(0, Math.min(bendStones, Math.round((acc / 100) * bendStones)))
      setBendCatch(caught)
      setScore(s => s + caught * 10)
      setMsg(`🎯 최종 ${caught}알 잡음! +${caught * 10}`)
      setTimeout(finish, 1400)
    }
  }

  const finish = () => {
    if (score > best) {
      setBest(score)
      try { localStorage.setItem(BEST_KEY, String(score)) } catch (_) {}
    }
    setPhase('over')
  }

  if (phase === 'menu') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16, display: 'block' }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🟢</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>공기놀이</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 1.7 }}>
          1단→2단→3단→4단→꺾기 순서로 진행<br />
          던지기 / 집기 / 받기 타이밍을 맞춰요<br />
          한 번이라도 실패하면 끝!
        </p>
        {best > 0 && (
          <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 16, background: '#E8F5E9', color: '#1B5E20', fontWeight: 700, marginBottom: 16 }}>
            🏆 최고 점수: {best}
          </div>
        )}
        <div style={{ background: '#F5F5F5', borderRadius: 14, padding: 14, fontSize: 12, color: '#555', textAlign: 'left', marginBottom: 20 }}>
          {STAGES.map(s => (
            <div key={s.id} style={{ marginBottom: 4 }}>
              <b>{s.name}</b> · {s.desc}
            </div>
          ))}
          <div><b>꺾기</b> · 5알 손등→손바닥 (잡은 만큼 점수)</div>
        </div>
        <button onClick={start}
          style={{ padding: '16px 40px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #2D6A4F, #1B5E20)', color: '#FFF', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
          🎯 시작
        </button>
      </div>
    )
  }

  if (phase === 'over') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ textAlign: 'center', padding: '32px 20px', borderRadius: 20, background: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)', border: '2px solid #2D6A4F', marginBottom: 20 }}>
          <div style={{ fontSize: 56 }}>🟢</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1B5E20', marginTop: 8 }}>최종 점수</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#1B5E20' }}>{score}</div>
          {score > 0 && score >= best && <div style={{ color: '#FF9F1C', fontWeight: 700, marginTop: 4 }}>🏆 신기록!</div>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={start}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#2D6A4F', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>다시</button>
          <button onClick={() => setPhase('menu')}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#F0F0F0', color: '#555', fontWeight: 700, cursor: 'pointer' }}>메뉴</button>
        </div>
      </div>
    )
  }

  const isBend = phase === 'bend'
  const stageDef = STAGES[stage]
  const subLabel = isBend
    ? (bendPhase === 'toss' ? '5알 던지기' : bendPhase === 'catch1' ? '손등으로 받기!' : bendPhase === 'toss2' ? '다시 던지기' : '손바닥으로 잡기!')
    : (sub === 'throw' ? '한 알 던지기' : sub === 'pickup' ? `${stageDef.picks[stepIdx]}알 집기` : '받기')

  // sweet spot 시각화 범위
  const sweetRange = isBend
    ? (bendPhase === 'toss' ? [50, 85] : bendPhase === 'catch1' ? [62, 82] : bendPhase === 'toss2' ? [45, 85] : [62, 82])
    : (sub === 'throw' ? THROW_SWEET : sub === 'pickup' ? [50, 90] : CATCH_SWEET)

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={() => { stopGauge(); setPhase('menu') }}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1B5E20' }}>
          {isBend ? '🌟 꺾기' : stageDef.name}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#FF9F1C' }}>{score}점</div>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #E8F5E9, #A8E6CF)',
        padding: '24px 16px', borderRadius: 16, textAlign: 'center', marginBottom: 16,
      }}>
        <div style={{ fontSize: 40 }}>
          {isBend
            ? (bendPhase.startsWith('toss') ? '✋' : bendPhase === 'catch1' ? '🫳' : '🫴')
            : (sub === 'throw' ? '☝️' : sub === 'pickup' ? '🤏' : '🤲')}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, marginTop: 6 }}>{subLabel}</div>
        {!isBend && (
          <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
            {stepIdx + 1} / {stageDef.picks.length}
          </div>
        )}
      </div>

      <div style={{
        position: 'relative', height: 36, background: '#EEE', borderRadius: 18, marginBottom: 16, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', left: `${sweetRange[0]}%`, width: `${sweetRange[1] - sweetRange[0]}%`,
          top: 0, bottom: 0, background: 'rgba(45, 106, 79, 0.25)',
        }} />
        <div style={{
          height: '100%', width: `${gauge}%`,
          background: gauge >= sweetRange[0] && gauge <= sweetRange[1]
            ? 'linear-gradient(90deg, #2D6A4F, #1B5E20)'
            : 'linear-gradient(90deg, #888, #555)',
        }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#FFF', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
          {Math.round(gauge)}
        </div>
      </div>

      <button onPointerDown={isBend ? bendTap : tap}
        disabled={!running}
        style={{
          width: '100%', padding: '20px 0', borderRadius: 16, border: 'none',
          background: running ? 'linear-gradient(135deg, #2D6A4F, #1B5E20)' : '#DDD',
          color: '#FFF', fontSize: 18, fontWeight: 800,
          cursor: running ? 'pointer' : 'default',
          touchAction: 'manipulation',
        }}>
        탭!
      </button>

      {msg && (
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 16, fontWeight: 700, color: msg.startsWith('❌') ? '#C62828' : '#2D6A4F' }}>
          {msg}
        </div>
      )}
    </div>
  )
}
