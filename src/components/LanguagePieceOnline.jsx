// 언어의 조각 — 온라인 2인 모드 (host=P1, guest=P2)
// useGameRoom 사용. 본인은 위치별 색상, 상대는 색상별 개수만 공개.

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useGameRoom } from '../utils/useGameRoom'
import {
  decomposeWord, slotsToWord, shuffle, evaluateGuess, jamoKind, composeChar,
} from '../utils/hangulJamo'
import { pickRandomWord } from '../data/languagePieceWords'

const ROUND_LEN = [3, 4, 5]
const TARGET_SCORE = 13 // 사실상 도달 불가 — 라운드 수 한계로 게임 종료
const TURN_SECONDS = 60

const COLOR_P1 = '#3A7BD5'
const COLOR_P2 = '#E63946'
const ACCENT = '#7E57C2'

function buildRoundData(word) {
  const chars = decomposeWord(word)
  const tileJamos = []
  for (const ch of chars) {
    tileJamos.push(ch.cho, ch.jung)
    if (ch.jong) tileJamos.push(ch.jong)
  }
  const tilePool = tileJamos.map((j, idx) => ({ id: idx, jamo: j, kind: jamoKind(j) }))
  // 주의: Firebase Realtime DB는 null 값을 자동 삭제하므로 slots 배열은 보내지 않음.
  // 각 클라이언트가 len 기반으로 로컬 state로 직접 생성.
  return { tilePool: shuffle(tilePool), answer: word, hasJong: chars.map(c => !!c.jong), len: chars.length }
}

function makeEmptySlots(len) {
  return Array.from({ length: len }, () => ({ cho: null, jung: null, jong: null }))
}

function initialState() {
  return {
    phase: 'lobby',
    round: 1,
    scores: { 1: 0, 2: 0 },
    firstPlayer: 1,
    currentPlayer: 1,
    roundData: null,
    attempts: { 1: { history: [] }, 2: { history: [] } },
    usedWords: [],
    turnStartedAt: 0,
  }
}

export default function LanguagePieceOnline({ onBack }) {
  const r = useGameRoom('lang-piece')
  const [uiScreen, setUiScreen] = useState('entry')

  if (!r.roomCode) {
    if (uiScreen === 'join') return <JoinScreen room={r} onCancel={() => setUiScreen('entry')} onBack={onBack} />
    return <EntryScreen room={r} onBack={onBack} onPickJoin={() => setUiScreen('join')} />
  }

  return <InRoom room={r} onBack={onBack} />
}

// ────────────────────────────────────────────────────────────
function EntryScreen({ room, onBack, onPickJoin }) {
  const [creating, setCreating] = useState(false)
  const create = useCallback(async () => {
    setCreating(true)
    try { await room.createRoom(initialState()) }
    catch (e) { room.setError('방 만들기 실패: ' + e.message); setCreating(false) }
  }, [room])

  return (
    <div className="fade-in" style={{ maxWidth: 460, margin: '0 auto', padding: '1rem' }}>
      <button onClick={onBack} style={btnPlain}>← 돌아가기</button>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 56 }}>🌐</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>언어의 조각 · 온라인 2인</h2>
        <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>방장 1명 + 친구 1명</p>
      </div>
      <button onClick={create} disabled={creating} style={btnPrimary(COLOR_P1, creating)}>
        🎮 {creating ? '방 만드는 중...' : '방 만들기 (P1)'}
      </button>
      <button onClick={onPickJoin} style={btnPrimary(COLOR_P2)}>🔢 코드 입력해 참가 (P2)</button>
      {room.error && <ErrorBox text={room.error} />}
    </div>
  )
}

function JoinScreen({ room, onCancel }) {
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const join = useCallback(async () => {
    if (code.length !== 2) { room.setError('2자리 숫자'); return }
    setJoining(true)
    try {
      const ok = await room.joinRoom(code)
      if (!ok) setJoining(false)
    } catch (e) { room.setError(e.message); setJoining(false) }
  }, [code, room])

  return (
    <div className="fade-in" style={{ maxWidth: 460, margin: '0 auto', padding: '1rem' }}>
      <button onClick={onCancel} style={btnPlain}>← 뒤로</button>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 50 }}>🔢</div>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>방 코드 입력</h2>
      </div>
      <input
        type="tel" inputMode="numeric" maxLength={2}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 2))}
        placeholder="42"
        style={{ width: '100%', padding: '14px 16px', fontSize: 32, fontWeight: 700, textAlign: 'center', letterSpacing: 8, border: '2px solid #DDD', borderRadius: 12, boxSizing: 'border-box', minWidth: 0 }}
      />
      <button onClick={join} disabled={joining || code.length !== 2} style={btnPrimary(COLOR_P2, joining || code.length !== 2)}>
        {joining ? '참가 중...' : '참가'}
      </button>
      {room.error && <ErrorBox text={room.error} />}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
function InRoom({ room, onBack }) {
  const state = room.gameState
  const isHost = room.role === 'host'
  const myPlayer = isHost ? 1 : 2
  const oppPlayer = isHost ? 2 : 1

  const leave = useCallback(async () => {
    if (window.confirm('방에서 나가시겠어요?')) {
      await room.leaveRoom()
      onBack()
    }
  }, [room, onBack])

  // 호스트가 라운드 시작 시 roundData 생성
  useEffect(() => {
    if (!isHost || !state) return
    if (state.phase === 'lobby' && room.connected) {
      // 손님 입장 → 라운드 1 데이터 생성
      const len = ROUND_LEN[0]
      const exclude = new Set(state.usedWords || [])
      const word = pickRandomWord(len, exclude)
      const rd = buildRoundData(word)
      room.updateState({
        ...state,
        phase: 'round-intro',
        roundData: rd,
        usedWords: [...(state.usedWords || []), word],
        firstPlayer: 1,
        currentPlayer: 1,
        attempts: { 1: { history: [] }, 2: { history: [] } },
      })
    }
  }, [isHost, state, room])

  if (!state) {
    return (
      <CenteredCard>
        <div style={{ fontSize: 50 }}>⏳</div>
        <h3>방 연결 중...</h3>
      </CenteredCard>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: (myPlayer === 1 ? COLOR_P1 : COLOR_P2) + '15' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: myPlayer === 1 ? COLOR_P1 : COLOR_P2 }}>
          {myPlayer}P · 방 #{room.roomCode}
        </div>
        <button onClick={leave} style={{ background: 'none', border: '1px solid #DDD', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#666' }}>나가기</button>
      </div>
      <div style={{ padding: 8 }}>
        {state.phase === 'lobby' && <LobbyScreen room={room} state={state} isHost={isHost} />}
        {state.phase === 'round-intro' && <RoundIntro room={room} state={state} myPlayer={myPlayer} />}
        {state.phase === 'p-turn' && <TurnScreen room={room} state={state} myPlayer={myPlayer} oppPlayer={oppPlayer} />}
        {state.phase === 'round-end' && <RoundEndScreen room={room} state={state} myPlayer={myPlayer} isHost={isHost} />}
        {state.phase === 'end' && <EndScreen state={state} myPlayer={myPlayer} onBack={onBack} />}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
function LobbyScreen({ room, state, isHost }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', paddingTop: 24 }}>
      <div style={{ fontSize: 14, color: '#666' }}>방 코드</div>
      <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: 6, color: COLOR_P1 }}>{room.roomCode}</div>
      {isHost
        ? <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>친구에게 알려주세요. 입장하면 게임이 시작됩니다.</div>
        : <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>방장의 신호를 기다리는 중...</div>}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
function RoundIntro({ room, state, myPlayer }) {
  const len = ROUND_LEN[state.round - 1]
  const firstP = state.firstPlayer || 1
  const startTurn = useCallback(() => {
    room.updateState({
      ...state,
      phase: 'p-turn',
      currentPlayer: firstP,
      turnStartedAt: Date.now(),
    })
  }, [room, state, firstP])

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: 32, color: ACCENT, fontWeight: 800 }}>라운드 {state.round}</div>
      <div style={{ fontSize: 48, fontWeight: 900, margin: '8px 0' }}>{len}글자</div>
      <div style={{ fontSize: 14, color: '#555', marginBottom: 12 }}>
        선공: <b style={{ color: firstP === 1 ? COLOR_P1 : COLOR_P2 }}>{firstP}P</b>
        {firstP === myPlayer && <span style={{ color: '#2E7D32', marginLeft: 6, fontWeight: 700 }}>(나)</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
        <ScoreCard player={1} score={state.scores[1]} active={myPlayer === 1} />
        <ScoreCard player={2} score={state.scores[2]} active={myPlayer === 2} />
      </div>
      <button onClick={startTurn} style={btnPrimary(ACCENT)}>시작</button>
      <p style={{ fontSize: 11, color: '#999', marginTop: 6 }}>※ 한 번씩 번갈아 등록합니다. 누군가 모두 초록 만들면 라운드 끝.</p>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// 본 게임 — 턴제 진행 (한 번씩 번갈아). 본인은 자기 색상/카운트만, 상대에게는 단어만 공개.
function TurnScreen({ room, state, myPlayer, oppPlayer }) {
  const rd = state.roundData
  const slotCount = rd?.len ?? rd?.hasJong?.length ?? 0
  const isMyTurn = state.currentPlayer === myPlayer

  // 로컬 슬롯/타일 (내 턴일 때만 의미 있음)
  const [localSlots, setLocalSlots] = useState(() => makeEmptySlots(slotCount))
  const [localTilePool, setLocalTilePool] = useState(() => rd?.tilePool ? rd.tilePool.map(t => ({ ...t, used: false })) : [])
  const [selectedTile, setSelectedTile] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  const myHistory = state.attempts?.[myPlayer]?.history || []
  const oppHistory = state.attempts?.[oppPlayer]?.history || []

  // 타이머 (턴 단위)
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])
  const started = state.turnStartedAt || now
  const elapsed = Math.max(0, Math.floor((now - started) / 1000))
  const secondsLeft = Math.max(0, TURN_SECONDS - elapsed)
  const m = Math.floor(secondsLeft / 60), s = secondsLeft % 60
  const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  const timeOver = secondsLeft === 0

  // 슬롯 리셋: "내 턴 시작" 시점에만 (라운드 변경 또는 내가 직전 시도 후 다시 내 차례).
  // 상대 등록(=상태 갱신)으로는 절대 리셋하지 않음.
  const lastResetKey = useRef(null)
  useEffect(() => {
    if (!rd || !isMyTurn) return
    const key = `${state.round}-${myHistory.length}`
    if (lastResetKey.current === key) return
    lastResetKey.current = key
    const len = rd.len ?? rd.hasJong?.length ?? 0
    setLocalSlots(makeEmptySlots(len))
    setLocalTilePool(rd.tilePool ? rd.tilePool.map(t => ({ ...t, used: false })) : [])
    setSelectedTile(null)
  }, [rd, isMyTurn, state.round, myHistory.length])

  const pickTile = useCallback((tileId) => {
    if (!isMyTurn) return
    setSelectedTile(prev => (prev === tileId ? null : tileId))
  }, [isMyTurn])

  const placeOrRemove = useCallback((charIdx, kind) => {
    if (!isMyTurn) return
    setLocalSlots(prevSlots => {
      const slots = prevSlots.map(x => ({ ...x }))
      const slot = slots[charIdx]
      const cur = slot[kind]
      if (cur != null) {
        setLocalTilePool(pool => pool.map(t => t.id === cur ? { ...t, used: false } : t))
        slot[kind] = null
        setSelectedTile(null)
        return slots
      }
      if (selectedTile == null) return prevSlots
      const tile = localTilePool.find(t => t.id === selectedTile)
      if (!tile || tile.used) return prevSlots
      if (tile.kind === 'vowel' && kind !== 'jung') return prevSlots
      if (tile.kind === 'consonant' && kind === 'jung') return prevSlots
      setLocalTilePool(pool => pool.map(t => t.id === selectedTile ? { ...t, used: true } : t))
      slot[kind] = selectedTile
      setSelectedTile(null)
      return slots
    })
  }, [isMyTurn, selectedTile, localTilePool])

  const tileJamoOfSlot = useCallback((charIdx, kind) => {
    const tileId = localSlots[charIdx]?.[kind]
    if (tileId == null) return null
    return localTilePool.find(t => t.id === tileId)?.jamo || null
  }, [localSlots, localTilePool])

  const submit = useCallback(() => {
    if (!isMyTurn || !rd) return
    const slotsJamo = localSlots.map(s => ({
      cho: s.cho != null ? localTilePool.find(t => t.id === s.cho)?.jamo : null,
      jung: s.jung != null ? localTilePool.find(t => t.id === s.jung)?.jamo : null,
      jong: s.jong != null ? localTilePool.find(t => t.id === s.jong)?.jamo : null,
    }))
    const guess = slotsToWord(slotsJamo)
    if (!guess) { alert('글자를 모두 완성하세요 (자음/모음)'); return }
    const result = evaluateGuess(guess, rd.answer)
    const allGreen = result.colors.every(c => c === 'green')
    const newHistory = [...myHistory, { guess, result }]
    const newAttempts = {
      ...state.attempts,
      [myPlayer]: { history: newHistory },
    }
    if (allGreen) {
      // 라운드 승: round-end로
      room.updateState({ ...state, attempts: newAttempts, phase: 'round-end' })
    } else {
      // 턴 넘김
      room.updateState({
        ...state,
        attempts: newAttempts,
        currentPlayer: oppPlayer,
        turnStartedAt: Date.now(),
      })
    }
  }, [isMyTurn, rd, localSlots, localTilePool, room, state, myPlayer, oppPlayer, myHistory])

  if (!rd) return <div style={{ padding: 24, textAlign: 'center' }}>라운드 데이터 로딩…</div>

  const color = myPlayer === 1 ? COLOR_P1 : COLOR_P2
  const isComplete = localSlots.every(s => s.cho != null && s.jung != null)

  return (
    <div className="fade-in" style={{ maxWidth: 520, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 13, color: '#666' }}>R{state.round} · {slotCount}글자</div>
        <div style={{
          fontSize: 14, fontWeight: 800,
          color: timeOver ? '#E63946' : secondsLeft < 15 ? '#E67E22' : '#444',
        }}>⏱ {timeOver ? '시간 초과' : timeStr}</div>
      </div>

      {/* 점수 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <ScoreCard player={1} score={state.scores[1]} active={myPlayer === 1} />
        <ScoreCard player={2} score={state.scores[2]} active={myPlayer === 2} />
      </div>

      {/* 턴 표시 */}
      <TurnIndicator isMyTurn={isMyTurn} myPlayer={myPlayer} oppPlayer={oppPlayer} />

      {/* 상대 시도 단어 (단어만 — 색상/카운트는 비공개) */}
      <OpponentHistoryBox oppPlayer={oppPlayer} history={oppHistory} />

      {/* 내 시도 히스토리 (단어 + 색상 + 카운트, 나만 봄) */}
      {myHistory.length > 0 && <MyHistoryBox history={myHistory} />}

      {isMyTurn ? (
        <>
          {/* 정답 슬롯 */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            {localSlots.map((slot, i) => (
              <SyllableSlot
                key={i}
                slot={slot}
                charIdx={i}
                jamoOf={(kind) => tileJamoOfSlot(i, kind)}
                onSlotTap={(kind) => placeOrRemove(i, kind)}
              />
            ))}
          </div>

          {/* 타일 풀 */}
          <div style={{ background: '#F8F4FF', padding: 10, borderRadius: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>자모 타일</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {localTilePool.map(t => (
                <Tile
                  key={t.id}
                  tile={t}
                  selected={selectedTile === t.id && !t.used}
                  onClick={() => !t.used && pickTile(t.id)}
                />
              ))}
            </div>
          </div>

          <button onClick={submit} disabled={!isComplete} style={btnPrimary(color, !isComplete)}>
            {isComplete ? '✓ 등록' : '글자 모두 완성하세요'}
          </button>
        </>
      ) : (
        <WaitingForOpponent oppPlayer={oppPlayer} />
      )}
    </div>
  )
}

function TurnIndicator({ isMyTurn, myPlayer, oppPlayer }) {
  const activeP = isMyTurn ? myPlayer : oppPlayer
  const activeColor = activeP === 1 ? COLOR_P1 : COLOR_P2
  return (
    <div style={{ padding: '8px 12px', borderRadius: 10, background: activeColor + '20', border: `2px solid ${activeColor}`, marginBottom: 8, textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: activeColor }}>
        {isMyTurn ? `🎯 내 차례 (${myPlayer}P)` : `⏳ ${oppPlayer}P 차례 — 기다리는 중`}
      </div>
    </div>
  )
}

function WaitingForOpponent({ oppPlayer }) {
  const color = oppPlayer === 1 ? COLOR_P1 : COLOR_P2
  return (
    <div style={{ padding: 24, textAlign: 'center', background: '#F8F4FF', borderRadius: 12 }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>⏳</div>
      <div style={{ fontSize: 15, color, fontWeight: 700 }}>{oppPlayer}P가 단어를 만드는 중...</div>
      <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>등록하면 화면이 자동으로 넘어와요.</div>
    </div>
  )
}

function OpponentHistoryBox({ oppPlayer, history }) {
  if (!history?.length) return null
  const color = oppPlayer === 1 ? COLOR_P1 : COLOR_P2
  return (
    <div style={{ padding: 10, borderRadius: 10, background: color + '10', border: `1px solid ${color}33`, marginBottom: 8 }}>
      <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 4 }}>{oppPlayer}P 시도 ({history.length}회) · 색상 비공개</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {history.map((h, idx) => (
          <div key={idx} style={{ padding: '4px 10px', background: '#FFF', border: '1px solid #DDD', borderRadius: 6, fontSize: 14, fontWeight: 700 }}>
            {h.guess}
          </div>
        ))}
      </div>
    </div>
  )
}

function MyHistoryBox({ history }) {
  return (
    <div style={{ padding: 10, borderRadius: 10, background: '#FFFBE0', marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>내 시도 ({history.length}회)</div>
      {history.map((h, idx) => {
        const summary = h.result.colors.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc }, {})
        return (
          <div key={idx} style={{ marginBottom: idx === history.length - 1 ? 0 : 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{h.guess}</div>
              <div style={{ fontSize: 11, color: '#666' }}>
                🟢{summary.green || 0} 🟡{summary.yellow || 0} 🔴{summary.red || 0}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {h.result.chars.map((c, i) => <JamoBadge key={i} jamo={c} color={h.result.colors[i]} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SyllableSlot({ slot, charIdx, jamoOf, onSlotTap }) {
  const cho = jamoOf('cho')
  const jung = jamoOf('jung')
  const jong = jamoOf('jong')
  const preview = composeChar(cho, jung, jong) || (cho && jung ? null : (cho || jung))
  const slotStyle = (filled, accent) => ({
    width: 36, height: 32, boxSizing: 'border-box',
    border: `2px ${filled ? 'solid' : 'dashed'} ${filled ? accent : '#DDD'}`,
    borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, fontWeight: 800, cursor: 'pointer', userSelect: 'none',
    background: filled ? '#FFF' : '#FAFAFA', color: filled ? '#222' : '#BBB',
  })
  const labelStyle = { fontSize: 9, color: '#888', textAlign: 'center', width: 36 }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 6, border: '1px solid #EEE', borderRadius: 10, background: '#FAFAFA' }}>
      <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>{charIdx + 1}번 글자</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: preview ? '#222' : '#CCC', minHeight: 32, marginBottom: 4 }}>
        {preview || '?'}
      </div>
      <div style={labelStyle}>초성</div>
      <div onClick={() => onSlotTap('cho')} style={slotStyle(cho, '#0D47A1')}>{cho || ''}</div>
      <div style={{ ...labelStyle, marginTop: 3 }}>중성</div>
      <div onClick={() => onSlotTap('jung')} style={slotStyle(jung, '#E65100')}>{jung || ''}</div>
      <div style={{ ...labelStyle, marginTop: 3 }}>받침</div>
      <div onClick={() => onSlotTap('jong')} style={slotStyle(jong, '#0D47A1')}>{jong || ''}</div>
    </div>
  )
}

function Tile({ tile, selected, onClick }) {
  const isVowel = tile.kind === 'vowel'
  return (
    <button onClick={onClick} disabled={tile.used} style={{
      width: 38, height: 42, borderRadius: 8,
      background: tile.used ? '#EEE' : selected ? (isVowel ? '#FFE082' : '#BBDEFB') : '#FFF',
      border: selected ? '2px solid #1976D2' : '2px solid #DDD',
      fontSize: 20, fontWeight: 800,
      color: tile.used ? '#BBB' : (isVowel ? '#E65100' : '#0D47A1'),
      cursor: tile.used ? 'default' : 'pointer',
    }}>{tile.jamo}</button>
  )
}

function JamoBadge({ jamo, color }) {
  const bg = color === 'green' ? '#2E7D32' : color === 'yellow' ? '#F9A825' : '#C62828'
  return (
    <div style={{ width: 28, height: 28, borderRadius: 6, background: bg, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800 }}>{jamo}</div>
  )
}

// ────────────────────────────────────────────────────────────
function RoundEndScreen({ room, state, myPlayer, isHost }) {
  const len = ROUND_LEN[state.round - 1]
  const h1 = state.attempts?.[1]?.history || []
  const h2 = state.attempts?.[2]?.history || []
  const last1 = h1[h1.length - 1]
  const last2 = h2[h2.length - 1]
  const win1 = !!last1?.result?.colors?.every(c => c === 'green')
  const win2 = !!last2?.result?.colors?.every(c => c === 'green')

  const proceedNext = useCallback(() => {
    if (!isHost) return
    const newScores = { ...state.scores }
    if (win1) newScores[1] += len
    if (win2) newScores[2] += len
    if (newScores[1] >= TARGET_SCORE || newScores[2] >= TARGET_SCORE || state.round >= ROUND_LEN.length) {
      room.updateState({ ...state, scores: newScores, phase: 'end' })
      return
    }
    const nextRound = state.round + 1
    const nextLen = ROUND_LEN[nextRound - 1]
    const exclude = new Set(state.usedWords || [])
    const word = pickRandomWord(nextLen, exclude)
    const rd = buildRoundData(word)
    const nextFirstPlayer = (state.firstPlayer || 1) === 1 ? 2 : 1
    room.updateState({
      ...state,
      phase: 'round-intro',
      round: nextRound,
      scores: newScores,
      firstPlayer: nextFirstPlayer,
      currentPlayer: nextFirstPlayer,
      roundData: rd,
      attempts: { 1: { history: [] }, 2: { history: [] } },
      usedWords: [...(state.usedWords || []), word],
    })
  }, [isHost, room, state, win1, win2, len])

  // 새 점수 미리보기 (UI)
  const previewP1 = state.scores[1] + (win1 ? len : 0)
  const previewP2 = state.scores[2] + (win2 ? len : 0)

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, color: ACCENT, fontWeight: 700 }}>라운드 {state.round} 결과</div>
        <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>정답</div>
        <div style={{ fontSize: 30, fontWeight: 900, margin: '4px 0' }}>{state.roundData?.answer}</div>
      </div>

      <PlayerResultRow player={1} attempt={last1} attempts={h1.length} win={win1} len={len} />
      <PlayerResultRow player={2} attempt={last2} attempts={h2.length} win={win2} len={len} />

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <ScoreCard player={1} score={previewP1} active={win1} delta={win1 ? len : 0} />
        <ScoreCard player={2} score={previewP2} active={win2} delta={win2 ? len : 0} />
      </div>

      {isHost ? (
        <button onClick={proceedNext} style={btnPrimary(ACCENT)}>
          {previewP1 >= TARGET_SCORE || previewP2 >= TARGET_SCORE || state.round >= ROUND_LEN.length ? '게임 결과' : '다음 라운드 (방장)'}
        </button>
      ) : (
        <div style={{ padding: 12, background: '#F8F4FF', borderRadius: 10, fontSize: 13, textAlign: 'center', color: '#666', marginTop: 14 }}>
          방장이 "다음 라운드" 누를 때까지 기다리세요.
        </div>
      )}
    </div>
  )
}

function PlayerResultRow({ player, attempt, attempts, win, len }) {
  const color = player === 1 ? COLOR_P1 : COLOR_P2
  return (
    <div style={{ padding: 12, border: `2px solid ${win ? '#2E7D32' : color + '44'}`, borderRadius: 12, marginBottom: 8, background: win ? '#E8F5E9' : '#FFF' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color }}>{player}P · {attempts || 0}번 시도</div>
        <div style={{ fontSize: 13 }}>{win ? <span style={{ color: '#2E7D32', fontWeight: 700 }}>✓ +{len}점</span> : <span style={{ color: '#999' }}>0점</span>}</div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{attempt?.guess || '미제출'}</div>
      {attempt?.result && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {attempt.result.chars.map((c, i) => <JamoBadge key={i} jamo={c} color={attempt.result.colors[i]} />)}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
function EndScreen({ state, myPlayer, onBack }) {
  const winner = state.scores[1] > state.scores[2] ? 1 : state.scores[1] < state.scores[2] ? 2 : 0
  const wcolor = winner === 1 ? COLOR_P1 : winner === 2 ? COLOR_P2 : '#888'
  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: 60 }}>🏆</div>
      {winner === 0
        ? <h2 style={{ fontSize: 24, color: '#888', fontWeight: 800 }}>무승부!</h2>
        : <h2 style={{ fontSize: 26, color: wcolor, fontWeight: 800 }}>{winner}P 승리!</h2>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 }}>
        <ScoreCard player={1} score={state.scores[1]} active={winner === 1} />
        <ScoreCard player={2} score={state.scores[2]} active={winner === 2} />
      </div>
      <button onClick={onBack} style={{ ...btnPrimary('#888'), marginTop: 24 }}>나가기</button>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
function ScoreCard({ player, score, active, delta }) {
  const color = player === 1 ? COLOR_P1 : COLOR_P2
  return (
    <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: active ? color + '22' : '#F8F8F8', border: active ? `2px solid ${color}` : '2px solid transparent' }}>
      <div style={{ fontSize: 11, color, fontWeight: 700 }}>{player}P</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#222' }}>
        {score}{delta ? <span style={{ fontSize: 13, color: '#2E7D32', marginLeft: 4 }}>+{delta}</span> : ''}
      </div>
    </div>
  )
}

function CenteredCard({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', padding: 24, textAlign: 'center' }}>
      {children}
    </div>
  )
}

function ErrorBox({ text }) {
  return <div style={{ marginTop: 12, padding: 12, background: '#FFF5F5', borderRadius: 10, fontSize: 13, color: '#E74C3C', textAlign: 'center' }}>⚠️ {text}</div>
}

const btnPlain = { background: 'none', border: 'none', fontSize: 15, color: '#666', cursor: 'pointer', marginBottom: 12 }
function btnPrimary(color, disabled = false) {
  return {
    width: '100%', padding: '14px 16px',
    background: disabled ? '#CCC' : color, color: '#FFF',
    border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginTop: 12, boxShadow: disabled ? 'none' : `0 2px 6px ${color}44`,
  }
}
