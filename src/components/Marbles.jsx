import { useState, useEffect, useRef } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

const START_COUNT = 10
const MAX_HIDE = 5

// AI 전략: 짝/홀 확률 약간 편향 + 베팅은 보유량 비례
function aiGuess(history) {
  // 최근 5개에서 짝홀 비율 보고 적게 나온 쪽 약간 선호
  let oddRecent = 0, evenRecent = 0
  history.slice(-5).forEach(h => { if (h % 2) oddRecent++; else evenRecent++ })
  const r = Math.random()
  if (oddRecent < evenRecent) return r < 0.55 ? 'odd' : 'even'
  if (evenRecent < oddRecent) return r < 0.55 ? 'even' : 'odd'
  return r < 0.5 ? 'odd' : 'even'
}
function aiHide() {
  // 1~5 중 랜덤이지만 짝홀 분포 살짝 조정
  return 1 + Math.floor(Math.random() * MAX_HIDE)
}
function aiBet(myMarbles, oppMarbles) {
  const cap = Math.min(myMarbles, oppMarbles)
  if (cap <= 1) return 1
  // 보유량의 20~40% 베팅
  const v = Math.max(1, Math.floor(cap * (0.2 + Math.random() * 0.2)))
  return Math.min(v, cap)
}

export default function Marbles({ onBack }) {
  const [mode, setMode] = useState(null) // 'ai' | 'online'
  if (!mode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16, display: 'block' }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🔴</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>구슬치기 (짝홀)</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
          한 사람이 손에 구슬 1~{MAX_HIDE}개를 숨기고,<br />
          상대가 짝/홀 + 베팅 개수를 맞춰요.<br />
          맞으면 받고, 틀리면 줘요. 0개되면 패!
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
          <button onClick={() => setMode('ai')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #06A77D, #024B6E)', color: '#FFF', fontSize: 16, fontWeight: 700 }}>
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
  if (mode === 'ai') return <MarblesAI onBack={() => setMode(null)} onExit={onBack} />
  return <MarblesOnline onBack={() => setMode(null)} onExit={onBack} />
}

function MarblesAI({ onBack, onExit }) {
  const [me, setMe] = useState(START_COUNT)
  const [ai, setAi] = useState(START_COUNT)
  const [phase, setPhase] = useState('roleSelect')
  // phases: roleSelect | iHide | iGuess | reveal | gameOver
  const [myRole, setMyRole] = useState(null) // 'hider' | 'guesser'
  const [hidden, setHidden] = useState(null) // 숨긴 개수
  const [bet, setBet] = useState(1)
  const [guess, setGuess] = useState(null)
  const [reveal, setReveal] = useState(null) // {hidden, guess, bet, win}
  const [aiHistory, setAiHistory] = useState([])

  const startRound = () => {
    setHidden(null); setBet(1); setGuess(null); setReveal(null)
    setPhase('roleSelect')
  }

  const pickRole = (role) => {
    setMyRole(role)
    if (role === 'hider') setPhase('iHide')
    else setPhase('iGuess')
  }

  // 내가 숨김 → AI가 추측
  const confirmHide = () => {
    if (!hidden) return
    // AI 추측
    const aiG = aiGuess(aiHistory)
    const aiB = aiBet(ai, me)
    const win = (hidden % 2 === 1 ? 'odd' : 'even') === aiG
    setReveal({ hidden, guess: aiG, bet: aiB, win, hiderWasMe: true })
    setAiHistory(h => [...h, hidden])
    setTimeout(() => {
      if (win) {
        // AI 승: 내가 잃음
        setMe(m => m - aiB)
        setAi(a => a + aiB)
      } else {
        // 내가 승
        setMe(m => m + aiB)
        setAi(a => a - aiB)
      }
      setTimeout(checkEnd, 100)
    }, 1200)
  }

  // 내가 추측 → AI가 숨김
  const submitGuess = () => {
    if (!guess) return
    const h = aiHide()
    const win = (h % 2 === 1 ? 'odd' : 'even') === guess
    setReveal({ hidden: h, guess, bet, win, hiderWasMe: false })
    setAiHistory(arr => [...arr, h])
    setTimeout(() => {
      if (win) {
        setMe(m => m + bet)
        setAi(a => a - bet)
      } else {
        setMe(m => m - bet)
        setAi(a => a + bet)
      }
      setTimeout(checkEnd, 100)
    }, 1200)
  }

  const checkEnd = () => {
    if (me <= 0 || ai <= 0) setPhase('gameOver')
    else setPhase('roleSelect')
  }

  const cap = Math.min(me, ai)

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 17, fontWeight: 700 }}>🔴 구슬치기 (AI)</h2>
        <div style={{ width: 22 }} />
      </div>

      {/* 점수판 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <div style={{ flex: 1, padding: 14, borderRadius: 14, background: '#E8F5E9', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#2D6A4F', fontWeight: 700 }}>나</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1B5E20' }}>🔴 {me}</div>
        </div>
        <div style={{ flex: 1, padding: 14, borderRadius: 14, background: '#FFF5F5', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#B91D47', fontWeight: 700 }}>AI</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#7E0B30' }}>🔴 {ai}</div>
        </div>
      </div>

      {phase === 'gameOver' && (
        <div style={{
          padding: 24, borderRadius: 18,
          background: me > 0
            ? 'linear-gradient(135deg, #D4EDDA, #A8E6CF)'
            : 'linear-gradient(135deg, #FFF5F5, #F5C6CB)',
          textAlign: 'center', marginBottom: 16,
        }}>
          <div style={{ fontSize: 50 }}>{me > 0 ? '🏆' : '💀'}</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>
            {me > 0 ? '승리!' : '패배!'}
          </div>
        </div>
      )}

      {phase === 'roleSelect' && (
        <div>
          <p style={{ textAlign: 'center', fontSize: 14, color: '#555', marginBottom: 14 }}>
            이번 라운드 역할 선택
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => pickRole('hider')}
              style={{ flex: 1, padding: '20px 0', borderRadius: 14, border: 'none', background: '#7B68EE', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              ✊ 내가 숨김<br /><span style={{ fontSize: 11, opacity: 0.9 }}>(AI가 짝홀 맞힘)</span>
            </button>
            <button onClick={() => pickRole('guesser')}
              style={{ flex: 1, padding: '20px 0', borderRadius: 14, border: 'none', background: '#FF8C42', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              🔮 내가 추측<br /><span style={{ fontSize: 11, opacity: 0.9 }}>(AI가 숨김)</span>
            </button>
          </div>
        </div>
      )}

      {phase === 'iHide' && (
        <div>
          <p style={{ textAlign: 'center', fontSize: 14, color: '#555', marginBottom: 14 }}>
            손에 숨길 구슬 개수를 골라요
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setHidden(n)}
                style={{
                  width: 56, height: 56, borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: hidden === n ? '#06A77D' : '#F0F0F0',
                  color: hidden === n ? '#FFF' : '#333',
                  fontSize: 22, fontWeight: 800,
                }}>
                {n}
              </button>
            ))}
          </div>
          <button onClick={confirmHide} disabled={!hidden}
            style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: hidden ? '#06A77D' : '#DDD', color: '#FFF', fontSize: 16, fontWeight: 700, cursor: hidden ? 'pointer' : 'default' }}>
            확인 (AI 추측 시작)
          </button>
        </div>
      )}

      {phase === 'iGuess' && (
        <div>
          <p style={{ textAlign: 'center', fontSize: 14, color: '#555', marginBottom: 10 }}>
            AI가 1~{MAX_HIDE}개 숨겼어요. 짝/홀 + 베팅 개수!
          </p>
          <div style={{ marginBottom: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>베팅 (최대 {cap}개)</div>
            <input type="range" min={1} max={cap} value={bet} onChange={e => setBet(Number(e.target.value))}
              style={{ width: '80%' }} />
            <div style={{ fontSize: 22, fontWeight: 800, color: '#FF8C42' }}>{bet}개</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setGuess('odd')}
              style={{ flex: 1, padding: '20px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: guess === 'odd' ? '#7B68EE' : '#F0F0F0', color: guess === 'odd' ? '#FFF' : '#333',
                fontSize: 18, fontWeight: 800 }}>
              🔢 홀
            </button>
            <button onClick={() => setGuess('even')}
              style={{ flex: 1, padding: '20px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: guess === 'even' ? '#FF8C42' : '#F0F0F0', color: guess === 'even' ? '#FFF' : '#333',
                fontSize: 18, fontWeight: 800 }}>
              🎯 짝
            </button>
          </div>
          <button onClick={submitGuess} disabled={!guess}
            style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: guess ? '#06A77D' : '#DDD', color: '#FFF', fontSize: 16, fontWeight: 700, cursor: guess ? 'pointer' : 'default', marginTop: 14 }}>
            확인!
          </button>
        </div>
      )}

      {reveal && phase !== 'gameOver' && (
        <div style={{
          marginTop: 16, padding: 18, borderRadius: 14,
          background: reveal.win ? '#D4EDDA' : '#FADBD8',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
            숨긴 개수: {reveal.hidden}개 ({reveal.hidden % 2 ? '홀' : '짝'})
          </div>
          <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>
            {reveal.hiderWasMe ? 'AI' : '내'} 추측: {reveal.guess === 'odd' ? '홀' : '짝'} · 베팅 {reveal.bet}개
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: reveal.win ? (reveal.hiderWasMe ? '#C62828' : '#1B5E20') : (reveal.hiderWasMe ? '#1B5E20' : '#C62828') }}>
            {reveal.hiderWasMe
              ? (reveal.win ? `AI 정답! -${reveal.bet}` : `AI 오답! +${reveal.bet}`)
              : (reveal.win ? `정답! +${reveal.bet}` : `오답! -${reveal.bet}`)}
          </div>
        </div>
      )}

      {phase === 'gameOver' && (
        <button onClick={() => { setMe(START_COUNT); setAi(START_COUNT); startRound() }}
          style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: '#06A77D', color: '#FFF', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
          다시 시작
        </button>
      )}
    </div>
  )
}

// 온라인 2인용 (단순화)
function MarblesOnline({ onBack }) {
  const room = useGameRoom('marbles')
  const [joinCode, setJoinCode] = useState('')
  const [tempHide, setTempHide] = useState(null)
  const [tempBet, setTempBet] = useState(1)
  const [tempGuess, setTempGuess] = useState(null)

  const initialState = () => ({
    host: START_COUNT, guest: START_COUNT,
    round: 1,
    phase: 'roleSelect', // roleSelect → hide → guess → reveal
    hider: null, // 'host'|'guest'
    hidden: null, bet: null, guess: null,
    lastResult: null,
  })

  if (!room.roomCode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🔴</div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>구슬치기 온라인</h2>
        </div>
        <button onClick={() => room.createRoom(initialState())}
          style={{ width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', background: '#06A77D', color: '#FFF', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>
          ➕ 방 만들기
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 2))}
            placeholder="방 코드 (2자리)"
            inputMode="numeric"
            style={{ flex: 1, padding: '14px', fontSize: 16, borderRadius: 12, border: '1.5px solid #DDD', minWidth: 0, boxSizing: 'border-box', textAlign: 'center' }} />
          <button onClick={() => room.joinRoom(joinCode, initialState())}
            disabled={joinCode.length !== 2}
            style={{ padding: '0 18px', borderRadius: 12, border: 'none', background: joinCode.length === 2 ? '#4895EF' : '#DDD', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: joinCode.length === 2 ? 'pointer' : 'default', flexShrink: 0 }}>
            참가
          </button>
        </div>
        {room.error && <p style={{ color: '#C62828', textAlign: 'center', marginTop: 10 }}>{room.error}</p>}
      </div>
    )
  }

  if (!room.connected) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>방 코드: <span style={{ color: '#06A77D' }}>{room.roomCode}</span></h2>
        <p style={{ color: '#888' }}>친구를 기다리는 중...</p>
        <button onClick={room.leaveRoom}
          style={{ marginTop: 24, padding: '12px 24px', borderRadius: 12, border: 'none', background: '#F0F0F0', cursor: 'pointer' }}>
          나가기
        </button>
      </div>
    )
  }

  const s = room.gameState || initialState()
  const me = room.role === 'host' ? s.host : s.guest
  const opp = room.role === 'host' ? s.guest : s.host
  const myKey = room.role === 'host' ? 'host' : 'guest'
  const oppKey = room.role === 'host' ? 'guest' : 'host'

  const updateState = (next) => room.updateState(next)

  // 역할 선택 (host가 먼저 선택)
  const chooseRole = (asHider) => {
    updateState({ ...s, phase: 'hide', hider: asHider ? myKey : oppKey })
  }

  // 숨김 확정
  const confirmHide = () => {
    if (!tempHide) return
    updateState({ ...s, phase: 'guess', hidden: tempHide })
    setTempHide(null)
  }

  // 추측 확정
  const confirmGuess = () => {
    if (!tempGuess) return
    const cap = Math.min(me, opp)
    const bet = Math.min(tempBet, cap)
    const win = (s.hidden % 2 === 1 ? 'odd' : 'even') === tempGuess
    // win: 추측자가 맞춤
    const guesserKey = s.hider === 'host' ? 'guest' : 'host'
    const hiderKey = s.hider
    const next = { ...s, phase: 'reveal', bet, guess: tempGuess, lastResult: { win, bet, guesser: guesserKey } }
    if (win) {
      next[guesserKey] = s[guesserKey] + bet
      next[hiderKey] = s[hiderKey] - bet
    } else {
      next[guesserKey] = s[guesserKey] - bet
      next[hiderKey] = s[hiderKey] + bet
    }
    updateState(next)
    setTempGuess(null); setTempBet(1)
  }

  const nextRound = () => {
    if (s.host <= 0 || s.guest <= 0) {
      updateState({ ...s, phase: 'gameOver' })
    } else {
      updateState({ ...initialState(), host: s.host, guest: s.guest, round: s.round + 1 })
    }
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={room.leaveRoom}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>방 {room.roomCode} · R{s.round}</h2>
        <div style={{ width: 22 }} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <div style={{ flex: 1, padding: 14, borderRadius: 14, background: '#E8F5E9', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#2D6A4F', fontWeight: 700 }}>나</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>🔴 {me}</div>
        </div>
        <div style={{ flex: 1, padding: 14, borderRadius: 14, background: '#FFF5F5', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#B91D47', fontWeight: 700 }}>상대</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>🔴 {opp}</div>
        </div>
      </div>

      {s.phase === 'gameOver' && (
        <div style={{ padding: 22, borderRadius: 16, background: me > 0 ? '#A8E6CF' : '#F5C6CB', textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>{me > 0 ? '🏆' : '💀'}</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{me > 0 ? '승리!' : '패배!'}</div>
        </div>
      )}

      {s.phase === 'roleSelect' && room.role === 'host' && (
        <div>
          <p style={{ textAlign: 'center', marginBottom: 14, color: '#555' }}>역할을 골라요 (호스트 선택)</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => chooseRole(true)}
              style={{ flex: 1, padding: '20px 0', borderRadius: 14, border: 'none', background: '#7B68EE', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>
              ✊ 내가 숨김
            </button>
            <button onClick={() => chooseRole(false)}
              style={{ flex: 1, padding: '20px 0', borderRadius: 14, border: 'none', background: '#FF8C42', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>
              🔮 내가 추측
            </button>
          </div>
        </div>
      )}
      {s.phase === 'roleSelect' && room.role === 'guest' && (
        <p style={{ textAlign: 'center', color: '#888' }}>호스트가 역할 선택 중...</p>
      )}

      {s.phase === 'hide' && (
        s.hider === myKey ? (
          <div>
            <p style={{ textAlign: 'center', marginBottom: 14, color: '#555' }}>1~{MAX_HIDE}개 숨겨요</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setTempHide(n)}
                  style={{ width: 56, height: 56, borderRadius: 14, border: 'none', cursor: 'pointer', background: tempHide === n ? '#06A77D' : '#F0F0F0', color: tempHide === n ? '#FFF' : '#333', fontSize: 22, fontWeight: 800 }}>
                  {n}
                </button>
              ))}
            </div>
            <button onClick={confirmHide} disabled={!tempHide}
              style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: tempHide ? '#06A77D' : '#DDD', color: '#FFF', fontWeight: 700, cursor: tempHide ? 'pointer' : 'default' }}>
              확인
            </button>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#888' }}>상대가 숨기는 중...</p>
        )
      )}

      {s.phase === 'guess' && (
        s.hider !== myKey ? (
          <div>
            <p style={{ textAlign: 'center', marginBottom: 10, color: '#555' }}>짝/홀 + 베팅 (최대 {Math.min(me, opp)}개)</p>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <input type="range" min={1} max={Math.min(me, opp)} value={tempBet} onChange={e => setTempBet(Number(e.target.value))} style={{ width: '80%' }} />
              <div style={{ fontSize: 22, fontWeight: 800, color: '#FF8C42' }}>{tempBet}개</div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <button onClick={() => setTempGuess('odd')}
                style={{ flex: 1, padding: '18px 0', borderRadius: 14, border: 'none', background: tempGuess === 'odd' ? '#7B68EE' : '#F0F0F0', color: tempGuess === 'odd' ? '#FFF' : '#333', fontSize: 18, fontWeight: 800, cursor: 'pointer' }}>🔢 홀</button>
              <button onClick={() => setTempGuess('even')}
                style={{ flex: 1, padding: '18px 0', borderRadius: 14, border: 'none', background: tempGuess === 'even' ? '#FF8C42' : '#F0F0F0', color: tempGuess === 'even' ? '#FFF' : '#333', fontSize: 18, fontWeight: 800, cursor: 'pointer' }}>🎯 짝</button>
            </div>
            <button onClick={confirmGuess} disabled={!tempGuess}
              style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: tempGuess ? '#06A77D' : '#DDD', color: '#FFF', fontWeight: 700, cursor: tempGuess ? 'pointer' : 'default' }}>
              확인
            </button>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#888' }}>상대가 짝홀 추측 중...</p>
        )
      )}

      {s.phase === 'reveal' && (
        <div style={{ padding: 18, borderRadius: 14, background: '#FFF8E1', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
            숨긴 개수: {s.hidden}개 ({s.hidden % 2 ? '홀' : '짝'})
          </div>
          <div style={{ fontSize: 14, color: '#555' }}>추측: {s.guess === 'odd' ? '홀' : '짝'} · 베팅 {s.bet}개</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>
            {s.lastResult.guesser === myKey
              ? (s.lastResult.win ? '✅ 정답!' : '❌ 오답')
              : (s.lastResult.win ? '❌ 상대가 맞춤' : '✅ 상대 빗나감')}
          </div>
          <button onClick={nextRound}
            style={{ marginTop: 14, padding: '12px 28px', borderRadius: 12, border: 'none', background: '#06A77D', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>
            다음 라운드
          </button>
        </div>
      )}
    </div>
  )
}
