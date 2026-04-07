import { useState, useRef, useEffect } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

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
  const [mode, setMode] = useState(null) // null | 'local' | 'online'
  const [digits, setDigits] = useState(null) // 3 | 4 | 5
  const [answer, setAnswer] = useState([])
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [won, setWon] = useState(false)
  const [error, setError] = useState('')
  const [joinCode, setJoinCode] = useState('')

  // Online-specific local state
  const [onlineDigits, setOnlineDigits] = useState(4)
  const [secretInput, setSecretInput] = useState('')
  const [secretSubmitted, setSecretSubmitted] = useState(false)

  const inputRef = useRef(null)
  const bottomRef = useRef(null)

  const room = useGameRoom('baseball')

  // Sync online game state
  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = room.gameState
    setDigits(s.digits || 4)
  }, [room.gameState, mode])

  useEffect(() => {
    if (mode === 'local' && digits && inputRef.current) inputRef.current.focus()
  }, [mode, digits, history])

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [history, room.gameState])

  // --- Local (single-player) logic ---
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

  // --- Online logic ---
  const createOnline = async () => {
    await room.createRoom({
      hostSecret: '',
      guestSecret: '',
      hostHistory: '[]',
      guestHistory: '[]',
      turn: 'host',
      digits: onlineDigits,
      winner: '',
      phase: 'setup',
    })
    setMode('online')
    setSecretInput('')
    setSecretSubmitted(false)
  }

  const joinOnline = async () => {
    if (joinCode.length !== 2) { room.setError('2자리 코드를 입력하세요'); return }
    const ok = await room.joinRoom(joinCode.toUpperCase())
    if (ok) {
      setMode('online')
      setSecretInput('')
      setSecretSubmitted(false)
    }
  }

  const handleBack = () => {
    if (mode === 'online') room.leaveRoom()
    if (mode) {
      setMode(null)
      setDigits(null)
      setSecretInput('')
      setSecretSubmitted(false)
      setInput('')
      setError('')
      return
    }
    onBack()
  }

  const handleSecretSubmit = () => {
    const gs = room.gameState
    const d = gs.digits || 4
    setError('')
    if (secretInput.length !== d) {
      setError(`${d}자리 숫자를 입력하세요`)
      return
    }
    const nums = secretInput.split('').map(Number)
    if (nums.some(n => n === 0)) {
      setError('0은 사용할 수 없어요')
      return
    }
    if (new Set(nums).size !== d) {
      setError('중복 숫자는 안 돼요')
      return
    }

    const secretField = room.role === 'host' ? 'hostSecret' : 'guestSecret'
    const otherSecretField = room.role === 'host' ? 'guestSecret' : 'hostSecret'
    const update = { [secretField]: nums.join(',') }

    // If both have submitted, move to play phase
    if (gs[otherSecretField]) {
      update.phase = 'play'
      update.turn = 'host'
    }

    room.updateState(update)
    setSecretSubmitted(true)
    setError('')
  }

  const handleOnlineGuess = () => {
    const gs = room.gameState
    if (!gs) return
    const d = gs.digits || 4
    setError('')
    if (input.length !== d) {
      setError(`${d}자리 숫자를 입력하세요`)
      return
    }
    const nums = input.split('').map(Number)
    if (nums.some(n => n === 0)) {
      setError('0은 사용할 수 없어요')
      return
    }
    if (new Set(nums).size !== d) {
      setError('중복 숫자는 안 돼요')
      return
    }

    // The secret I'm guessing is the opponent's secret
    const opponentSecretStr = room.role === 'host' ? gs.guestSecret : gs.hostSecret
    const opponentSecret = opponentSecretStr.split(',').map(Number)
    const result = judge(opponentSecret, nums)

    const myHistoryKey = room.role === 'host' ? 'hostHistory' : 'guestHistory'
    const myHistory = JSON.parse(gs[myHistoryKey] || '[]')
    const newHistory = [...myHistory, { guess: input, strike: result.strike, ball: result.ball }]

    const update = { [myHistoryKey]: JSON.stringify(newHistory) }

    if (result.strike === d) {
      // I got all strikes — check if it's simultaneous win
      // Host goes first. If host wins, guest gets one more turn to tie.
      // If guest wins on the same round count, it's a draw.
      const otherHistoryKey = room.role === 'host' ? 'guestHistory' : 'hostHistory'
      const otherHistory = JSON.parse(gs[otherHistoryKey] || '[]')

      if (room.role === 'host') {
        // Host just guessed correctly. Guest hasn't gone this round yet.
        // Let guest take their turn, then check for draw.
        update.winner = 'host_pending'
        update.turn = 'guest'
      } else {
        // Guest just guessed. Check if host already won this round.
        if (gs.winner === 'host_pending') {
          update.winner = 'draw'
        } else {
          update.winner = 'guest'
        }
      }
    } else {
      // No win — switch turns
      if (room.role === 'host') {
        update.turn = 'guest'
      } else {
        // Guest finished their turn. If host had pending win, finalize it.
        if (gs.winner === 'host_pending') {
          update.winner = 'host'
        } else {
          update.turn = 'host'
        }
      }
    }

    room.updateState(update)
    setInput('')
    setError('')
  }

  const handleOnlineKeyDown = (e) => {
    if (e.key === 'Enter') handleOnlineGuess()
  }

  const handleSecretKeyDown = (e) => {
    if (e.key === 'Enter') handleSecretSubmit()
  }

  const resetOnline = () => {
    const gs = room.gameState
    room.updateState({
      hostSecret: '',
      guestSecret: '',
      hostHistory: '[]',
      guestHistory: '[]',
      turn: 'host',
      digits: gs?.digits || 4,
      winner: '',
      phase: 'setup',
    })
    setSecretInput('')
    setSecretSubmitted(false)
    setInput('')
    setError('')
  }

  // ========================
  //  MODE SELECTION SCREEN
  // ========================
  if (!mode) {
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 280, margin: '0 auto' }}>
          <button onClick={() => setMode('local')}
            style={{
              padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
              fontSize: 16, fontWeight: 700, color: '#FFF',
              background: 'linear-gradient(135deg, #333, #555)',
            }}>
            혼자 하기
          </button>

          {/* Online digit picker */}
          <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>온라인 자릿수 선택</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {[3, 4, 5].map(d => (
              <button key={d} onClick={() => setOnlineDigits(d)}
                style={{
                  padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700,
                  color: onlineDigits === d ? '#FFF' : '#666',
                  background: onlineDigits === d ? '#4895EF' : '#F0F0F0',
                }}>
                {d}자리
              </button>
            ))}
          </div>

          <button onClick={createOnline}
            style={{
              padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
              fontSize: 16, fontWeight: 700, color: '#FFF',
              background: 'linear-gradient(135deg, #4895EF, #3A7BD5)',
            }}>
            온라인 방 만들기
          </button>
          <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>또는 코드로 참가</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.replace(/[^0-9]/g, ''))}
              maxLength={2}
              placeholder="방 코드 2자리"
              inputMode="numeric"
              style={{
                flex: 1, padding: '12px', borderRadius: 10, border: '2px solid #DDD',
                fontSize: 16, fontWeight: 700, textAlign: 'center', letterSpacing: 4,
                fontFamily: 'monospace',
              }}
            />
            <button onClick={joinOnline}
              style={{ padding: '0 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#4895EF', color: '#FFF', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 52 }}>
              참가
            </button>
          </div>
          {room.error && <div style={{ color: '#E74C3C', fontSize: 13 }}>{room.error}</div>}
        </div>
      </div>
    )
  }

  // ========================
  //  LOCAL: DIGIT SELECTION
  // ========================
  if (mode === 'local' && digits === null) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={() => setMode(null)}
          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>baseball</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>난이도 선택</h2>
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

  // ========================
  //  LOCAL: GAME PLAY
  // ========================
  if (mode === 'local') {
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

  // ========================
  //  ONLINE: WAITING FOR OPPONENT
  // ========================
  if (mode === 'online' && !room.connected) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 24 }}>
          ← 취소
        </button>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>상대를 기다리는 중...</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
          상대방에게 아래 코드를 알려주세요
        </p>
        <div style={{
          fontSize: 36, fontWeight: 700, letterSpacing: 8,
          padding: '16px 24px', background: '#F7F6F3', borderRadius: 14,
          display: 'inline-block', fontFamily: 'monospace',
        }}>
          {room.roomCode}
        </div>
        <p style={{ fontSize: 12, color: '#AAA', marginTop: 16 }}>
          나는 선공 (호스트)
        </p>
      </div>
    )
  }

  // ========================
  //  ONLINE: GAME
  // ========================
  const gs = room.gameState || {}
  const d = gs.digits || 4
  const phase = gs.phase || 'setup'
  const onlineTurn = gs.turn || 'host'
  const winnerVal = gs.winner || ''
  const myRole = room.role // 'host' | 'guest'

  const mySecretField = myRole === 'host' ? 'hostSecret' : 'guestSecret'
  const opponentSecretField = myRole === 'host' ? 'guestSecret' : 'hostSecret'
  const myHistoryKey = myRole === 'host' ? 'hostHistory' : 'guestHistory'
  const opponentHistoryKey = myRole === 'host' ? 'guestHistory' : 'hostHistory'

  const mySecret = gs[mySecretField] || ''
  const opponentSecret = gs[opponentSecretField] || ''
  const myHistory = JSON.parse(gs[myHistoryKey] || '[]')
  const opponentHistory = JSON.parse(gs[opponentHistoryKey] || '[]')

  const isMyTurn = onlineTurn === myRole
  const resolvedWinner = winnerVal === 'host_pending' ? '' : winnerVal
  const gameOver = resolvedWinner === 'host' || resolvedWinner === 'guest' || resolvedWinner === 'draw'

  const accentColor = d === 3 ? '#06D6A0' : d === 4 ? '#4895EF' : '#EF476F'
  const headerBg = d === 3 ? 'linear-gradient(135deg, #06D6A0, #05B384)'
    : d === 4 ? 'linear-gradient(135deg, #4895EF, #3A7BD5)'
    : 'linear-gradient(135deg, #EF476F, #D63B5C)'

  // Determine if my secret is already submitted (from firebase state)
  const mySecretReady = !!mySecret
  const opponentSecretReady = !!opponentSecret

  // Setup phase
  if (phase === 'setup') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
        <div style={{ background: headerBg, color: '#FFF', padding: '1.5rem 1.25rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <button onClick={handleBack}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
              ← 나가기
            </button>
            <span style={{ fontSize: 12, opacity: 0.8 }}>방 코드: {room.roomCode}</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>숫자 야구 — {d}자리 (온라인)</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>비밀 숫자를 정해주세요</div>
        </div>

        <div style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
            나는 {myRole === 'host' ? '호스트 (선공)' : '게스트 (후공)'}
          </div>

          {mySecretReady || secretSubmitted ? (
            <div style={{
              padding: '32px 16px', background: '#F0FFF4', borderRadius: 14,
              border: '2px solid #06D6A0', marginBottom: 16,
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>비밀 숫자 제출 완료!</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 6, fontFamily: 'monospace', marginTop: 8 }}>
                {mySecret || secretInput}
              </div>
              {!opponentSecretReady && (
                <div style={{ fontSize: 13, color: '#888', marginTop: 16 }}>
                  상대방이 비밀 숫자를 정하고 있어요...
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 14, color: '#555', marginBottom: 16, lineHeight: 1.6 }}>
                상대방이 맞춰야 할 나의 비밀 숫자를 정하세요<br/>
                <span style={{ fontSize: 12, color: '#999' }}>1~9 중복 없는 {d}자리</span>
              </p>
              <div style={{ display: 'flex', gap: 8, maxWidth: 300, margin: '0 auto' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={d}
                  value={secretInput}
                  onChange={e => { setSecretInput(e.target.value.replace(/[^1-9]/g, '')); setError('') }}
                  onKeyDown={handleSecretKeyDown}
                  placeholder={`${d}자리 비밀 숫자`}
                  style={{
                    flex: 1, padding: '14px', borderRadius: 10,
                    border: error ? '2px solid #EF476F' : '2px solid #E0E0E0',
                    fontSize: 22, fontWeight: 700, letterSpacing: 6,
                    textAlign: 'center', fontFamily: 'monospace', outline: 'none',
                  }}
                />
                <button onClick={handleSecretSubmit}
                  style={{
                    padding: '0 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: accentColor, color: '#FFF', fontSize: 15, fontWeight: 700,
                  }}>
                  제출
                </button>
              </div>
              {error && (
                <div style={{ color: '#EF476F', fontSize: 12, marginTop: 8 }}>{error}</div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Play phase
  const renderHistoryList = (historyArr, label, color) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 8 }}>{label}</div>
      {historyArr.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '12px 0', color: '#CCC', fontSize: 12 }}>
          아직 기록이 없어요
        </div>
      ) : (
        historyArr.map((h, idx) => (
          <div key={idx} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', marginBottom: 6,
            background: '#FFF', borderRadius: 10,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#FFF',
                background: color, borderRadius: 6,
                padding: '2px 6px', minWidth: 22, textAlign: 'center',
              }}>{idx + 1}</span>
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 4, fontFamily: 'monospace' }}>
                {h.guess}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{
                fontSize: 12, fontWeight: 700, color: '#E74C3C',
                background: '#FDEDEC', padding: '3px 8px', borderRadius: 6,
              }}>{h.strike}S</span>
              <span style={{
                fontSize: 12, fontWeight: 700, color: '#3498DB',
                background: '#EBF5FB', padding: '3px 8px', borderRadius: 6,
              }}>{h.ball}B</span>
            </div>
          </div>
        ))
      )}
    </div>
  )

  const winLabel = resolvedWinner === 'draw'
    ? '🤝 무승부!'
    : resolvedWinner === myRole
      ? '🎉 승리!'
      : resolvedWinner
        ? '😢 패배...'
        : ''

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      {/* 헤더 */}
      <div style={{ background: headerBg, color: '#FFF', padding: '1.5rem 1.25rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <button onClick={handleBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 나가기
          </button>
          <span style={{ fontSize: 12, opacity: 0.8 }}>방 코드: {room.roomCode}</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>숫자 야구 — {d}자리 (온라인)</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
          나는 {myRole === 'host' ? '호스트 (선공)' : '게스트 (후공)'}
        </div>
      </div>

      {/* 턴 표시 */}
      <div style={{
        textAlign: 'center', padding: '10px 0',
        fontSize: 14, fontWeight: 600,
        color: gameOver ? '#F1C40F' : '#333',
        background: gameOver ? '#FFF9E6' : '#F7F6F3',
      }}>
        {gameOver
          ? winLabel
          : isMyTurn && winnerVal !== 'host_pending'
            ? '내 차례! 상대의 숫자를 맞춰보세요'
            : '상대방 차례입니다...'
        }
      </div>

      <div style={{ padding: '0 1rem', marginTop: 16 }}>
        {/* My guess history */}
        {renderHistoryList(myHistory, '나의 추측 기록', accentColor)}

        {/* Opponent guess history */}
        {renderHistoryList(opponentHistory, '상대의 추측 기록', '#888')}

        <div ref={bottomRef} />

        {/* Game over */}
        {gameOver && (
          <div style={{
            textAlign: 'center', padding: '24px 16px', marginTop: 8,
            background: resolvedWinner === myRole
              ? 'linear-gradient(135deg, #FFF9E6, #FFF3CD)'
              : resolvedWinner === 'draw'
                ? 'linear-gradient(135deg, #F0F4FF, #E8EEFF)'
                : 'linear-gradient(135deg, #FFF0F0, #FFE8E8)',
            borderRadius: 14,
            border: resolvedWinner === myRole ? '2px solid #F1C40F' : resolvedWinner === 'draw' ? '2px solid #4895EF' : '2px solid #EF476F',
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>
              {resolvedWinner === myRole ? '🎉' : resolvedWinner === 'draw' ? '🤝' : '😢'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
              {resolvedWinner === 'draw' ? '무승부!' : resolvedWinner === myRole ? '승리!' : '패배...'}
            </div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
              상대의 비밀 숫자: <strong style={{ fontFamily: 'monospace', letterSpacing: 4 }}>
                {(myRole === 'host' ? gs.guestSecret : gs.hostSecret).replace(/,/g, '')}
              </strong>
            </div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
              나의 비밀 숫자: <strong style={{ fontFamily: 'monospace', letterSpacing: 4 }}>
                {(myRole === 'host' ? gs.hostSecret : gs.guestSecret).replace(/,/g, '')}
              </strong>
            </div>
            <button onClick={resetOnline}
              style={{
                padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: accentColor, color: '#FFF', fontSize: 14, fontWeight: 600,
              }}>
              다시 하기
            </button>
          </div>
        )}

        {/* Input for guessing */}
        {!gameOver && phase === 'play' && (
          <div style={{
            display: 'flex', gap: 8, marginTop: 16,
            position: 'sticky', bottom: 16,
            background: '#F7F6F3', padding: 12, borderRadius: 14,
            boxShadow: '0 -2px 10px rgba(0,0,0,0.06)',
            opacity: isMyTurn && winnerVal !== 'host_pending' ? 1 : 0.5,
            pointerEvents: isMyTurn && winnerVal !== 'host_pending' ? 'auto' : 'none',
          }}>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={d}
              value={input}
              onChange={e => { setInput(e.target.value.replace(/[^1-9]/g, '')); setError('') }}
              onKeyDown={handleOnlineKeyDown}
              placeholder={`${d}자리 숫자`}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 10,
                border: error ? '2px solid #EF476F' : '2px solid #E0E0E0',
                fontSize: 20, fontWeight: 700, letterSpacing: 6,
                textAlign: 'center', fontFamily: 'monospace',
                outline: 'none',
              }}
            />
            <button onClick={handleOnlineGuess}
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
