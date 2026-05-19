// 망각의 지뢰 — 3대 온라인 모드 (딜러 + P1 + P2)
// Firebase 실시간 동기화. 지뢰는 본인과 딜러에게만 UI로 보임.
// 페이즈: wait-players → setup → roll → play → end

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useViewportWidth } from '../utils/useViewportWidth'
import { useMineMemoryRoom } from '../utils/useMineMemoryRoom'
import {
  SIZE, MINES_PER_PLAYER, TREASURE_POINTS, MINE_PENALTY,
  MINE_SETUP_SECONDS,
  COLOR_P1, COLOR_P2, COLOR_DEALER,
  key, unkey, toId, inBounds, isTreasureCell, isStartCell,
  isMinePlacementAllowed,
  DIRS_8, rollDie, ADJ_8,
  getTeleportTargets, countMineCells,
  initialGameState, serializeForWire, deserializeFromWire,
} from '../utils/mineMemoryLogic'

const ROLE_LABEL = { dealer: '🎩 딜러', p1: '①플레이어 1', p2: '②플레이어 2' }
const ROLE_COLOR = { dealer: COLOR_DEALER, p1: COLOR_P1, p2: COLOR_P2 }

export default function MineMemoryOnline({ onBack }) {
  const r = useMineMemoryRoom()
  const [uiScreen, setUiScreen] = useState('entry') // entry | join

  // 방 입장 전
  if (!r.roomCode) {
    if (uiScreen === 'join') return <JoinScreen room={r} onCancel={() => setUiScreen('entry')} onBack={onBack} />
    return <EntryScreen room={r} onBack={onBack} onPickJoin={() => setUiScreen('join')} />
  }

  // 방 안
  return <InRoom room={r} onBack={onBack} />
}

// ────────────────────────────────────────────────────────────
// 입장 전
function EntryScreen({ room, onBack, onPickJoin }) {
  const [creating, setCreating] = useState(false)

  const createRoom = useCallback(async () => {
    setCreating(true)
    try {
      await room.createAsDealer(serializeForWire(initialGameState()))
    } catch (e) {
      room.setError('방 만들기 실패: ' + (e?.message || e))
    } finally {
      setCreating(false)
    }
  }, [room])

  return (
    <div className="fade-in" style={{ maxWidth: 460, margin: '0 auto', padding: '1rem' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
        ← 돌아가기
      </button>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 56, marginBottom: 4 }}>🌐</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>3대 온라인 모드</h2>
        <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>딜러 1대 + 플레이어 2대</p>
      </div>

      <button onClick={createRoom} disabled={creating} style={bigBtn(COLOR_DEALER, creating)}>
        🎩 {creating ? '방 만드는 중...' : '딜러로 방 만들기'}
      </button>
      <button onClick={onPickJoin} style={bigBtn('#3A7BD5')}>
        🎮 플레이어로 코드 입력해서 참가
      </button>

      {room.error && <ErrorBox text={room.error} />}

      <div style={{ marginTop: 18, padding: 12, background: '#F8F4FF', borderRadius: 10, fontSize: 12, color: '#666', lineHeight: 1.6 }}>
        <b style={{ color: COLOR_DEALER }}>딜러 역할</b>: 방을 만들어 코드를 받고, 양쪽 지뢰를 모두 봅니다. 게임 진행 관리.<br/>
        <b style={{ color: COLOR_P1 }}>플레이어</b>: 코드를 입력해 입장. 본인 지뢰만 배치하고, 게임 중 지뢰는 안 보임 (기억!).
      </div>
    </div>
  )
}

function JoinScreen({ room, onCancel, onBack }) {
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)

  const join = useCallback(async () => {
    if (code.length !== 2) {
      room.setError('2자리 숫자를 입력하세요')
      return
    }
    setJoining(true)
    try {
      const role = await room.joinAsPlayer(code)
      if (!role) setJoining(false)
    } catch (e) {
      room.setError('참가 실패: ' + (e?.message || e))
      setJoining(false)
    }
  }, [code, room])

  return (
    <div className="fade-in" style={{ maxWidth: 460, margin: '0 auto', padding: '1rem' }}>
      <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
        ← 뒤로
      </button>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 50, marginBottom: 4 }}>🔢</div>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>방 코드 입력</h2>
        <p style={{ fontSize: 12, color: '#888' }}>딜러에게 받은 2자리 숫자</p>
      </div>
      <input
        type="tel"
        inputMode="numeric"
        maxLength={2}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 2))}
        placeholder="예: 42"
        style={{
          width: '100%', padding: '14px 16px', fontSize: 32, fontWeight: 700,
          textAlign: 'center', letterSpacing: 8,
          border: '2px solid #DDD', borderRadius: 12,
          boxSizing: 'border-box', minWidth: 0,
        }}
      />
      <button onClick={join} disabled={joining || code.length !== 2} style={bigBtn(COLOR_P1, joining || code.length !== 2)}>
        {joining ? '참가 중...' : '참가'}
      </button>
      {room.error && <ErrorBox text={room.error} />}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// 방 안 — 페이즈/역할 라우터
function InRoom({ room, onBack }) {
  const data = room.room
  const role = room.role

  // Hooks (조건문 전에 호출되어야 함)
  const leave = useCallback(async () => {
    if (window.confirm('방에서 나가시겠어요? (딜러가 나가면 방이 사라집니다)')) {
      await room.leaveRoom()
      onBack()
    }
  }, [room, onBack])
  const state = useMemo(() => deserializeFromWire(data?.state), [data?.state])
  const visibleMines = useMemo(() => getVisibleMines(state, role), [state, role])

  if (!data) {
    return (
      <CenteredCard>
        <div style={{ fontSize: 50, marginBottom: 8 }}>⏳</div>
        <h3>방 연결 중...</h3>
      </CenteredCard>
    )
  }

  const phase = data.phase || 'wait-players'

  return (
    <div style={{ position: 'relative' }}>
      {/* 상단 정보 바 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: ROLE_COLOR[role] + '15', borderBottom: `1px solid ${ROLE_COLOR[role]}33` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: ROLE_COLOR[role] }}>
          {ROLE_LABEL[role]} · 방 #{room.roomCode}
        </div>
        <button onClick={leave} style={{ background: 'none', border: '1px solid #DDD', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#666', cursor: 'pointer' }}>
          나가기
        </button>
      </div>

      <div style={{ padding: 8 }}>
        {phase === 'wait-players' && <PhaseWaitPlayers data={data} room={room} role={role} />}
        {phase === 'setup' && <PhaseSetup data={data} room={room} role={role} state={state} visibleMines={visibleMines} />}
        {phase === 'roll' && <PhaseRoll data={data} room={room} role={role} />}
        {phase === 'play' && <PhasePlay data={data} room={room} role={role} state={state} visibleMines={visibleMines} />}
        {phase === 'end' && <PhaseEnd data={data} room={room} role={role} state={state} />}
      </div>
    </div>
  )
}

// 본인+딜러만 자기 지뢰 본다
function getVisibleMines(state, role) {
  if (role === 'dealer') return state.mines
  if (role === 'p1') return { 1: state.mines[1], 2: new Set() }
  return { 1: new Set(), 2: state.mines[2] }
}

// ────────────────────────────────────────────────────────────
// 페이즈 1: 양 플레이어 입장 대기
function PhaseWaitPlayers({ data, room, role }) {
  const bothReady = data.p1 && data.p2
  const startSetup = useCallback(() => {
    if (role !== 'dealer') return
    room.patchRoom({ phase: 'setup', setupStartedAt: Date.now() })
  }, [room, role])

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', padding: '24px 0 12px' }}>
        <div style={{ fontSize: 16, color: '#666', marginBottom: 4 }}>방 코드</div>
        <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: 6, color: COLOR_DEALER }}>{room.roomCode}</div>
        {role === 'dealer' && <div style={{ fontSize: 12, color: '#888' }}>플레이어에게 알려주세요</div>}
      </div>

      <div style={{ background: '#FAFAFA', borderRadius: 12, padding: 14 }}>
        <SlotRow label="🎩 딜러" filled={true} color={COLOR_DEALER} />
        <SlotRow label="①플레이어 1" filled={!!data.p1} color={COLOR_P1} />
        <SlotRow label="②플레이어 2" filled={!!data.p2} color={COLOR_P2} />
      </div>

      {role === 'dealer' ? (
        <button onClick={startSetup} disabled={!bothReady} style={bigBtn(COLOR_DEALER, !bothReady)}>
          {bothReady ? '✓ 지뢰 배치 시작' : '플레이어 2명 대기 중...'}
        </button>
      ) : (
        <div style={{ padding: 14, background: '#E8F0FE', borderRadius: 10, fontSize: 13, color: '#555', textAlign: 'center', marginTop: 12 }}>
          {bothReady ? '✓ 입장 완료. 딜러가 게임 시작을 누를 때까지 기다려주세요.' : '⏳ 다른 플레이어 대기 중...'}
        </div>
      )}
    </div>
  )
}

function SlotRow({ label, filled, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: filled ? color : '#DDD' }} />
      <div style={{ flex: 1, fontSize: 14, color: filled ? '#222' : '#999' }}>{label}</div>
      <div style={{ fontSize: 12, color: filled ? color : '#BBB' }}>{filled ? '✓' : '대기'}</div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// 페이즈 2: 지뢰 배치
function PhaseSetup({ data, room, role, state, visibleMines }) {
  const isPlayer = role === 'p1' || role === 'p2'
  const myPlayer = role === 'p1' ? 1 : role === 'p2' ? 2 : null
  const [localMines, setLocalMines] = useState(() => new Set())
  const vw = useViewportWidth()
  const cellSize = Math.max(24, Math.min(36, Math.floor((Math.min(vw, 520) - 28) / SIZE)))

  // 다른 클라이언트에서 본인 지뢰가 이미 제출되어 있다면 그대로 표시
  useEffect(() => {
    if (myPlayer && state.mines[myPlayer].size > 0) {
      setLocalMines(new Set(state.mines[myPlayer]))
    }
  }, [data.eventSeq]) // initial sync only

  // 10분 카운트다운 (원작 룰) — setupStartedAt 기준 모든 클라이언트 동기화
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])
  const startedAt = data.setupStartedAt || now
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000))
  const secondsLeft = Math.max(0, MINE_SETUP_SECONDS - elapsed)
  const tm = Math.floor(secondsLeft / 60), ts = secondsLeft % 60
  const timeStr = `${String(tm).padStart(2, '0')}:${String(ts).padStart(2, '0')}`
  const timeOver = secondsLeft === 0

  const p1Count = state.mines[1].size
  const p2Count = state.mines[2].size
  const bothDone = p1Count === MINES_PER_PLAYER && p2Count === MINES_PER_PLAYER

  // 플레이어: 자기 지뢰 토글
  const toggle = useCallback((k) => {
    if (!myPlayer) return
    const [r, c] = unkey(k)
    if (!isMinePlacementAllowed(r, c)) return
    setLocalMines(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else if (next.size < MINES_PER_PLAYER) next.add(k)
      return next
    })
  }, [myPlayer])

  // 플레이어: 제출
  const submit = useCallback(async () => {
    if (!myPlayer || localMines.size !== MINES_PER_PLAYER) return
    const nextState = { ...state, mines: { ...state.mines, [myPlayer]: new Set(localMines) } }
    await room.patchState(serializeForWire(nextState))
  }, [myPlayer, localMines, room, state])

  // 딜러: 다음 단계로
  const goRoll = useCallback(() => {
    if (role !== 'dealer') return
    room.patchRoom({ phase: 'roll', dice: { 1: null, 2: null, who: 1 } })
  }, [role, room])

  // 본인 제출 완료 여부
  const mySubmitted = myPlayer && state.mines[myPlayer].size === MINES_PER_PLAYER
  // 화면에 보여줄 지뢰: 본인=localMines (편집 중) 또는 제출 후=state.mines[myPlayer]
  const displayMines = !myPlayer
    ? null
    : mySubmitted ? state.mines[myPlayer] : localMines

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>지뢰 배치</h3>
        {bothDone ? (
          <div style={{
            display: 'inline-block', marginTop: 6, padding: '4px 14px',
            background: '#E8F5E9', color: '#2E7D32',
            fontWeight: 700, fontSize: 14, borderRadius: 999,
          }}>
            ✓ 모두 제출 완료 — 딜러가 다음 단계 진행
          </div>
        ) : (
          <div style={{
            display: 'inline-block', marginTop: 6, padding: '2px 12px',
            background: timeOver ? '#FFE8EA' : secondsLeft < 60 ? '#FFF4D6' : '#F0F0F0',
            color: timeOver ? '#E63946' : secondsLeft < 60 ? '#E67E22' : '#444',
            fontWeight: 700, fontSize: 14, borderRadius: 999,
          }}>
            ⏱ {timeOver ? '시간 초과' : timeStr}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 6 }}>
          <ProgressChip player={1} count={p1Count} />
          <ProgressChip player={2} count={p2Count} />
        </div>
      </div>

      {/* 보드 — 역할별 */}
      {role === 'dealer' && (
        <DealerSetupView state={state} cellSize={cellSize} />
      )}
      {isPlayer && !mySubmitted && (
        <PlayerSetupBoard
          player={myPlayer}
          mines={localMines}
          toggle={toggle}
          cellSize={cellSize}
        />
      )}
      {isPlayer && mySubmitted && (
        <div style={{ padding: 24, background: ROLE_COLOR[role] + '15', borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: ROLE_COLOR[role] }}>제출 완료!</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            상대방 대기 중... 지뢰 위치를 머릿속에 잘 기억해두세요!
          </div>
        </div>
      )}

      {/* 액션 */}
      {isPlayer && !mySubmitted && (
        <button
          onClick={submit}
          disabled={localMines.size !== MINES_PER_PLAYER}
          style={bigBtn(ROLE_COLOR[role], localMines.size !== MINES_PER_PLAYER)}
        >
          {localMines.size === MINES_PER_PLAYER ? '✓ 제출' : `${MINES_PER_PLAYER - localMines.size}개 더 배치`}
        </button>
      )}
      {role === 'dealer' && (
        <button onClick={goRoll} disabled={!bothDone} style={bigBtn(COLOR_DEALER, !bothDone)}>
          {bothDone ? '주사위 굴리기로' : `대기 중 (${p1Count + p2Count}/${MINES_PER_PLAYER * 2})`}
        </button>
      )}
    </div>
  )
}

function ProgressChip({ player, count }) {
  const color = player === 1 ? COLOR_P1 : COLOR_P2
  const done = count === MINES_PER_PLAYER
  return (
    <div style={{ padding: '4px 10px', borderRadius: 999, background: color + '22', fontSize: 12, fontWeight: 700, color }}>
      {player}P {count}/{MINES_PER_PLAYER} {done && '✓'}
    </div>
  )
}

function DealerSetupView({ state, cellSize }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#666', textAlign: 'center', margin: '6px 0' }}>
        딜러 시야 — 양쪽 지뢰 위치
      </div>
      <BoardGrid cellSize={cellSize} renderCell={(r, c) => {
        const k = key(r, c)
        const has1 = state.mines[1].has(k)
        const has2 = state.mines[2].has(k)
        const isTr = isTreasureCell(r, c)
        const isStart = isStartCell(r, c)
        let bg = '#FFF'
        if (isTr) bg = '#FFF4D6'
        if (isStart) bg = '#F0F0F0'
        return (
          <div key={k} style={cellBase(cellSize, bg)}>
            {isTr && <span style={{ fontSize: cellSize * 0.45, opacity: 0.5, position: 'absolute' }}>💎</span>}
            {(has1 || has2) && (
              <div style={{
                width: cellSize * 0.6, height: cellSize * 0.6, borderRadius: '50%',
                background: has1 && has2 ? `linear-gradient(135deg, ${COLOR_P1} 50%, ${COLOR_P2} 50%)` : has1 ? COLOR_P1 : COLOR_P2,
                border: '1px solid #fff', zIndex: 1,
              }} />
            )}
          </div>
        )
      }} />
    </div>
  )
}

function PlayerSetupBoard({ player, mines, toggle, cellSize }) {
  const color = player === 1 ? COLOR_P1 : COLOR_P2
  const startK = player === 1 ? key(0, 10) : key(10, 0)
  return (
    <>
      <div style={{ fontSize: 12, color: '#666', textAlign: 'center', margin: '6px 0' }}>
        본인 지뢰만 보입니다. <b style={{ color: COLOR_P2 }}>화면에 안 띄울 때 기억하세요!</b>
      </div>
      <BoardGrid cellSize={cellSize} renderCell={(r, c) => {
        const k = key(r, c)
        const allowed = isMinePlacementAllowed(r, c)
        const placed = mines.has(k)
        const isStart = isStartCell(r, c)
        const isTr = isTreasureCell(r, c)
        let bg = '#FFF'
        if (!allowed) bg = '#EAE6F0'
        if (isTr) bg = '#FFF4D6'
        if (isStart) bg = k === startK ? color + '22' : '#F0F0F0'
        return (
          <div key={k} onClick={() => allowed && toggle(k)} style={{
            ...cellBase(cellSize, bg),
            cursor: allowed ? 'pointer' : 'not-allowed',
          }}>
            {isTr && !placed && <span style={{ fontSize: cellSize * 0.55 }}>💎</span>}
            {isStart && !placed && (
              <span style={{ fontSize: cellSize * 0.5, fontWeight: 800, color: k === startK ? color : '#999' }}>
                {k === key(0, 10) ? '①' : '②'}
              </span>
            )}
            {placed && <span style={{ fontSize: cellSize * 0.6 }}>💣</span>}
          </div>
        )
      }} />
    </>
  )
}

// ────────────────────────────────────────────────────────────
// 페이즈 3: 주사위 (선공 결정)
function PhaseRoll({ data, room, role }) {
  const dice = data.dice || { 1: null, 2: null }
  const myPlayer = role === 'p1' ? 1 : role === 'p2' ? 2 : null

  const roll = useCallback(async () => {
    if (!myPlayer || dice[myPlayer] != null) return
    const v = rollDie()
    const newDice = { ...dice, [myPlayer]: v }
    await room.patchRoom({ dice: newDice })
  }, [myPlayer, dice, room])

  const resetDice = useCallback(() => {
    if (role !== 'dealer') return
    room.patchRoom({ dice: { 1: null, 2: null } })
  }, [role, room])

  const bothRolled = dice[1] != null && dice[2] != null
  const tie = bothRolled && dice[1] === dice[2]
  const winner = bothRolled && !tie ? (dice[1] > dice[2] ? 1 : 2) : null

  const goPlay = useCallback(() => {
    if (role !== 'dealer' || !winner) return
    room.patchRoom({
      phase: 'play',
      currentPlayer: winner,
    })
  }, [role, room, winner])

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0.5rem' }}>
      <h3 style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', marginBottom: 14 }}>🎲 선공 결정</h3>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 14 }}>
        <DieBox
          player={1}
          value={dice[1]}
          canRoll={myPlayer === 1 && dice[1] == null}
          onRoll={roll}
        />
        <DieBox
          player={2}
          value={dice[2]}
          canRoll={myPlayer === 2 && dice[2] == null}
          onRoll={roll}
        />
      </div>

      {!bothRolled && (
        <div style={{ padding: 12, background: '#F8F4FF', borderRadius: 10, fontSize: 13, textAlign: 'center', color: '#666' }}>
          {myPlayer && dice[myPlayer] == null ? '주사위를 굴리세요!' : '다른 플레이어가 굴리길 기다리는 중...'}
        </div>
      )}

      {tie && (
        <div style={{ padding: 14, background: '#FFF4D6', borderRadius: 10, fontSize: 14, textAlign: 'center', marginBottom: 10 }}>
          😯 동률! 다시 굴려주세요.
          {role === 'dealer' && (
            <button onClick={resetDice} style={{ display: 'block', margin: '8px auto 0', padding: '6px 16px', background: '#F4A41B', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              초기화 (딜러)
            </button>
          )}
        </div>
      )}

      {winner && (
        <div style={{ padding: 14, background: winner === 1 ? '#E8F0FE' : '#FFE8EA', borderRadius: 10, fontSize: 15, fontWeight: 700, color: winner === 1 ? COLOR_P1 : COLOR_P2, textAlign: 'center', marginBottom: 10 }}>
          🏁 {winner}P 선공!
        </div>
      )}

      {role === 'dealer' && winner && (
        <button onClick={goPlay} style={bigBtn(COLOR_DEALER)}>게임 시작</button>
      )}
    </div>
  )
}

function DieBox({ player, value, canRoll, onRoll }) {
  const color = player === 1 ? COLOR_P1 : COLOR_P2
  return (
    <div style={{ flex: 1, maxWidth: 160, textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 6 }}>{player}P</div>
      <button onClick={onRoll} disabled={!canRoll} style={{
        width: '100%', aspectRatio: '1/1', maxWidth: 120, margin: '0 auto', display: 'block',
        background: value == null ? '#F8F8F8' : '#FFF',
        border: `3px solid ${value == null ? '#DDD' : color}`,
        borderRadius: 16, fontSize: 48, fontWeight: 800, color,
        cursor: canRoll ? 'pointer' : 'default',
        boxShadow: canRoll ? `0 4px 12px ${color}44` : 'none',
      }}>
        {value == null ? '?' : value}
      </button>
      {canRoll && <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>탭해서 굴리기</div>}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// 페이즈 4: 게임 진행
function PhasePlay({ data, room, role, state, visibleMines }) {
  const currentPlayer = data.currentPlayer || 1
  const myPlayer = role === 'p1' ? 1 : role === 'p2' ? 2 : null
  const myTurn = myPlayer === currentPlayer
  const vw = useViewportWidth()
  const cellSize = Math.max(24, Math.min(36, Math.floor((Math.min(vw, 520) - 28) / SIZE)))
  const [selected, setSelected] = useState(false)

  const event = data.event || null
  const treasuresLeft = 3 - state.treasureCount
  const mineCellsLeft = countMineCells(state.mines)

  // 이동 가능 칸
  const movableCells = useMemo(() => {
    if (!myTurn || event) return null
    if (!selected) return null
    const myK = state.pieces[myPlayer]
    const oppK = state.pieces[myPlayer === 1 ? 2 : 1]
    // 원작 룰: 지뢰 밟으면 출발지 인접 3칸 중 1칸
    if (state.pendingTeleport === myPlayer) {
      return getTeleportTargets(myPlayer, oppK)
    }
    const cells = new Set()
    const [mr, mc] = unkey(myK)
    for (const [dr, dc] of DIRS_8) {
      const nr = mr + dr, nc = mc + dc
      if (!inBounds(nr, nc)) continue
      const k = key(nr, nc)
      if (k === oppK) continue
      cells.add(k)
    }
    return cells
  }, [myTurn, selected, state, myPlayer, event])

  // 셀 탭
  const handleCellTap = useCallback(async (k) => {
    if (event || !myTurn) return
    const myK = state.pieces[myPlayer]
    if (k === myK) {
      setSelected(s => !s)
      return
    }
    if (selected && movableCells && movableCells.has(k)) {
      // 이동 처리: state 계산 → patchState + event
      const next = doMove(state, myPlayer, k)
      await room.patchState(serializeForWire(next.state))
      await room.publishEvent(next.event)
      setSelected(false)
    }
  }, [event, myTurn, state, myPlayer, selected, movableCells, room])

  // 이벤트 확인 (활성 플레이어만)
  const confirmEvent = useCallback(async () => {
    if (!event) return
    const isActor = event.player === myPlayer
    if (!isActor) return
    const next = { ...state }
    // 게임 종료 체크
    if (state.treasureCount >= 3) {
      await room.patchRoom({ phase: 'end', event: null })
      return
    }
    const nextPlayer = myPlayer === 1 ? 2 : 1
    await room.patchRoom({ event: null, currentPlayer: nextPlayer })
  }, [event, myPlayer, state, room])

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <ScoreCard player={1} score={state.scores[1]} active={currentPlayer === 1} />
        <ScoreCard player={2} score={state.scores[2]} active={currentPlayer === 2} />
      </div>
      <div style={{ fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 6 }}>
        💎 남은 보물 {treasuresLeft}/3 · 💣 지뢰칸 {mineCellsLeft}
      </div>

      <div style={{
        padding: '6px 10px', borderRadius: 8, marginBottom: 6,
        background: (myTurn ? ROLE_COLOR[role] : '#888') + '15',
        fontSize: 12, textAlign: 'center', fontWeight: 600,
        color: myTurn ? ROLE_COLOR[role] : '#888',
      }}>
        {role === 'dealer'
          ? `현재 차례: ${currentPlayer}P · 딜러 시야 (양쪽 지뢰 모두 보임)`
          : myTurn
            ? (state.pendingTeleport === myPlayer
              ? '🚀 지뢰를 밟았어요. 출발지 인접 3칸 중 한 곳으로 이동'
              : selected ? '이동할 칸을 탭하세요' : '본인 말을 탭하세요')
            : `상대 차례 (${currentPlayer}P) — 기다리는 중...`}
      </div>

      <BoardGrid cellSize={cellSize} renderCell={(r, c) => {
        const k = key(r, c)
        const isP1 = state.pieces[1] === k
        const isP2 = state.pieces[2] === k
        const trState = state.treasures[k]
        const hasFreeTreasure = (k in state.treasures) && trState === null
        const usedTreasure = (k in state.treasures) && trState !== null
        const isMovable = movableCells && movableCells.has(k)
        const isScored = state.scoredCells.has(k)
        const seeMine1 = visibleMines[1].has(k)
        const seeMine2 = visibleMines[2].has(k)

        let bg = '#FFF'
        if (hasFreeTreasure) bg = '#FFF4D6'
        if (usedTreasure) bg = '#F4ECDC'
        if (isScored && !isP1 && !isP2 && !hasFreeTreasure) bg = '#F5F5F5'
        let border = '1px solid #DDD'
        if (isMovable) border = '2px solid #4CAF50'
        const isMine = myPlayer && state.pieces[myPlayer] === k
        if (isMine && selected) border = `2px solid ${ROLE_COLOR[role]}`

        return (
          <div key={k} onClick={() => handleCellTap(k)} style={{
            ...cellBase(cellSize, bg),
            border,
            cursor: myTurn ? 'pointer' : 'default',
          }}>
            {isP1 && <PieceIcon player={1} size={cellSize * 0.7} />}
            {isP2 && <PieceIcon player={2} size={cellSize * 0.7} />}
            {!isP1 && !isP2 && hasFreeTreasure && <span style={{ filter: 'drop-shadow(0 0 4px #F4A41B88)' }}>💎</span>}
            {!isP1 && !isP2 && usedTreasure && <span style={{ opacity: 0.35, fontSize: cellSize * 0.5 }}>💎</span>}
            {!isP1 && !isP2 && !hasFreeTreasure && !usedTreasure && (seeMine1 || seeMine2) && (
              <div style={{
                position: 'absolute', bottom: 2, right: 2,
                width: cellSize * 0.3, height: cellSize * 0.3, borderRadius: '50%',
                background: seeMine1 && seeMine2 ? `linear-gradient(135deg, ${COLOR_P1} 50%, ${COLOR_P2} 50%)` : seeMine1 ? COLOR_P1 : COLOR_P2,
                opacity: role === 'dealer' ? 0.85 : 0.6,
                border: '1px solid #fff',
              }} />
            )}
            {isMovable && !isP1 && !isP2 && !hasFreeTreasure && !usedTreasure && (
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF50', opacity: 0.7 }} />
            )}
          </div>
        )
      }} />

      {event && <EventModal event={event} role={role} myPlayer={myPlayer} onConfirm={confirmEvent} />}
    </div>
  )
}

function doMove(state, player, tk) {
  // 결과 계산 (resolveMove와 동일하지만 직접 인라인 — Set 직렬화 명시적 처리)
  const newMines = { 1: new Set(state.mines[1]), 2: new Set(state.mines[2]) }
  const newScores = { ...state.scores }
  const newScoredCells = new Set(state.scoredCells)
  const newTreasures = { ...state.treasures }
  let newTreasureCount = state.treasureCount
  let newPendingTeleport = null
  let evt = null
  const [tr, tc] = unkey(tk)
  const isTrCell = (tk in newTreasures)
  const isFreeTr = isTrCell && newTreasures[tk] === null

  if (isFreeTr) {
    const order = newTreasureCount
    const pts = TREASURE_POINTS[order]
    newScores[player] += pts
    newTreasures[tk] = { player, order: order + 1 }
    newTreasureCount = order + 1
    evt = { type: 'treasure', player, points: pts, order: order + 1, cellId: toId(tr, tc) }
  } else if (isTrCell) {
    evt = { type: 'treasure-empty', player, cellId: toId(tr, tc) }
  } else if (newMines[1].has(tk) || newMines[2].has(tk)) {
    const cnt = (newMines[1].has(tk) ? 1 : 0) + (newMines[2].has(tk) ? 1 : 0)
    newScores[player] += MINE_PENALTY
    newMines[1].delete(tk); newMines[2].delete(tk)
    newPendingTeleport = player
    evt = { type: 'mine', player, mineCount: cnt, penalty: MINE_PENALTY, cellId: toId(tr, tc) }
  } else {
    const already = newScoredCells.has(tk)
    let s = 0
    if (!already) {
      let count = 0
      for (const [dr, dc] of ADJ_8) {
        const nr = tr + dr, nc = tc + dc
        if (!inBounds(nr, nc)) continue
        const nk = key(nr, nc)
        if (newMines[1].has(nk)) count++
        if (newMines[2].has(nk)) count++
      }
      s = count
      newScoredCells.add(tk)
    }
    newScores[player] += s
    evt = { type: 'score', player, points: s, already, cellId: toId(tr, tc) }
  }

  const nextState = {
    pieces: { ...state.pieces, [player]: tk },
    mines: newMines,
    scores: newScores,
    scoredCells: newScoredCells,
    treasures: newTreasures,
    treasureCount: newTreasureCount,
    pendingTeleport: newPendingTeleport,
  }
  return { state: nextState, event: evt }
}

function EventModal({ event, role, myPlayer, onConfirm }) {
  const color = event.player === 1 ? COLOR_P1 : COLOR_P2
  const isActor = event.player === myPlayer
  let icon, title, body
  if (event.type === 'treasure') {
    icon = '💎'; title = `${event.order}번째 보물 획득!`
    body = `${event.cellId} → +${event.points}점`
  } else if (event.type === 'treasure-empty') {
    icon = '🪙'; title = '빈 보물칸'
    body = `${event.cellId} · 0점`
  } else if (event.type === 'mine') {
    icon = '💥'; title = '지뢰 폭발!'
    body = event.mineCount > 1
      ? `${event.cellId}에 지뢰 ${event.mineCount}개 (모두 제거) · ${event.penalty}점\n다음 턴: 출발지 인접 3칸 강제 이동`
      : `${event.cellId}에서 지뢰 폭발 · ${event.penalty}점\n다음 턴: 출발지 인접 3칸 강제 이동`
  } else {
    icon = '🎯'
    title = event.already ? '이미 점수 받은 칸 (0점)' : `+${event.points}점`
    body = event.already ? `${event.cellId}` : `${event.cellId} · 주변 8칸 지뢰 ${event.points}개`
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 320, width: '100%', textAlign: 'center', boxShadow: '0 10px 30px #0004' }}>
        <div style={{ display: 'inline-block', padding: '2px 10px', background: color, color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>
          {event.player}P
        </div>
        <div style={{ fontSize: 64, marginBottom: 4 }}>{icon}</div>
        <h3 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 6px' }}>{title}</h3>
        <p style={{ fontSize: 13, color: '#555', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{body}</p>
        {isActor ? (
          <button onClick={onConfirm} style={bigBtn('#7E57C2')}>확인 (다음 차례)</button>
        ) : (
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#F8F8F8', borderRadius: 8, fontSize: 12, color: '#888' }}>
            {role === 'dealer' ? '활성 플레이어 확인 대기' : '잠시만요...'}
          </div>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// 페이즈 5: 종료
function PhaseEnd({ data, room, role, state }) {
  const winner = state.scores[1] > state.scores[2] ? 1 : state.scores[1] < state.scores[2] ? 2 : 0
  const wcolor = winner === 1 ? COLOR_P1 : winner === 2 ? COLOR_P2 : '#888'
  const vw = useViewportWidth()
  const cellSize = Math.max(24, Math.min(36, Math.floor((Math.min(vw, 520) - 28) / SIZE)))

  const restart = useCallback(() => {
    if (role !== 'dealer') return
    room.patchRoom({
      phase: 'setup',
      setupStartedAt: Date.now(),
      state: serializeForWire(initialGameState()),
      dice: { 1: null, 2: null, who: 1 },
      event: null,
      eventSeq: 0,
    })
  }, [role, room])

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <div style={{ fontSize: 60 }}>🏆</div>
        {winner === 0 ? (
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#888' }}>무승부!</h2>
        ) : (
          <h2 style={{ fontSize: 24, fontWeight: 800, color: wcolor }}>{winner}P 승리!</h2>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
          <ScoreCard player={1} score={state.scores[1]} active={winner === 1} />
          <ScoreCard player={2} score={state.scores[2]} active={winner === 2} />
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 4 }}>
        지뢰 위치 공개 (<span style={{ color: COLOR_P1 }}>● 1P</span> / <span style={{ color: COLOR_P2 }}>● 2P</span>)
      </div>
      <BoardGrid cellSize={cellSize} renderCell={(r, c) => {
        const k = key(r, c)
        const has1 = state.mines[1].has(k)
        const has2 = state.mines[2].has(k)
        const trState = state.treasures[k]
        const usedTr = (k in state.treasures) && trState !== null
        const isTr = (k in state.treasures)
        return (
          <div key={k} style={cellBase(cellSize, isTr ? (usedTr ? '#F4ECDC' : '#FFF4D6') : '#FFF')}>
            {isTr && <span style={{ position: 'absolute', fontSize: cellSize * 0.4, opacity: 0.4 }}>💎</span>}
            {(has1 || has2) && (
              <div style={{
                width: cellSize * 0.5, height: cellSize * 0.5, borderRadius: '50%',
                background: has1 && has2 ? `linear-gradient(135deg, ${COLOR_P1} 50%, ${COLOR_P2} 50%)` : has1 ? COLOR_P1 : COLOR_P2,
                border: '1px solid #fff', zIndex: 1,
              }} />
            )}
          </div>
        )
      }} />

      {role === 'dealer' && (
        <button onClick={restart} style={bigBtn(COLOR_DEALER)}>🔄 다시 하기 (딜러)</button>
      )}
      {role !== 'dealer' && (
        <div style={{ marginTop: 14, padding: 12, background: '#F8F4FF', borderRadius: 10, fontSize: 13, textAlign: 'center', color: '#666' }}>
          딜러가 "다시 하기"를 누를 때까지 기다리세요. 또는 "나가기"로 종료.
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// 공유 UI
function BoardGrid({ cellSize, renderCell }) {
  return (
    <div style={{ display: 'inline-block', padding: 4, background: '#FAF9F6', borderRadius: 8, boxShadow: '0 2px 8px #0001', overflow: 'auto', maxWidth: '100%' }}>
      <div style={{ display: 'flex', marginBottom: 2 }}>
        <div style={{ width: cellSize * 0.5 }} />
        {Array.from({ length: SIZE }, (_, c) => (
          <div key={c} style={{ width: cellSize, textAlign: 'center', fontSize: 10, color: '#999' }}>
            {String.fromCharCode(97 + c)}
          </div>
        ))}
      </div>
      {Array.from({ length: SIZE }, (_, r) => (
        <div key={r} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: cellSize * 0.5, textAlign: 'center', fontSize: 10, color: '#999' }}>{r + 1}</div>
          {Array.from({ length: SIZE }, (_, c) => renderCell(r, c))}
        </div>
      ))}
    </div>
  )
}

function cellBase(cellSize, bg) {
  return {
    width: cellSize, height: cellSize, boxSizing: 'border-box',
    border: '1px solid #DDD', background: bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: cellSize * 0.55,
    userSelect: 'none', position: 'relative',
    transition: 'background 0.15s, border 0.1s',
  }
}

function PieceIcon({ player, size }) {
  const color = player === 1 ? COLOR_P1 : COLOR_P2
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 30% 30%, #fff8, ${color})`,
      border: `2px solid ${color}`, boxShadow: `0 2px 4px ${color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: size * 0.5, zIndex: 2,
    }}>{player}</div>
  )
}

function ScoreCard({ player, score, active }) {
  const color = player === 1 ? COLOR_P1 : COLOR_P2
  return (
    <div style={{
      flex: 1, padding: '8px 12px', borderRadius: 10,
      background: active ? color + '22' : '#F8F8F8',
      border: active ? `2px solid ${color}` : '2px solid transparent',
    }}>
      <div style={{ fontSize: 11, color, fontWeight: 700 }}>{player}P{active ? ' · 차례' : ''}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#222' }}>{score}</div>
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
  return (
    <div style={{ marginTop: 12, padding: 12, background: '#FFF5F5', borderRadius: 10, fontSize: 13, color: '#E74C3C', textAlign: 'center' }}>
      ⚠️ {text}
    </div>
  )
}

function bigBtn(color, disabled = false) {
  return {
    width: '100%', padding: '14px 16px',
    background: disabled ? '#CCC' : color,
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 15, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginTop: 12, boxShadow: disabled ? 'none' : `0 2px 6px ${color}44`,
  }
}
