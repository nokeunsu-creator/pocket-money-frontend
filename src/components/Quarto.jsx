import { useState, useEffect, useRef } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

function attr(p, bit) { return (p >> bit) & 1 }

function shareAttribute(pieces) {
  if (pieces.length < 4) return false
  for (let b = 0; b < 4; b++) {
    const v = attr(pieces[0], b)
    if (pieces.every(p => attr(p, b) === v)) return true
  }
  return false
}

const LINES = (() => {
  const arr = []
  for (let r = 0; r < 4; r++) arr.push([r * 4, r * 4 + 1, r * 4 + 2, r * 4 + 3])
  for (let c = 0; c < 4; c++) arr.push([c, c + 4, c + 8, c + 12])
  arr.push([0, 5, 10, 15])
  arr.push([3, 6, 9, 12])
  return arr
})()

function checkWin(board) {
  for (const line of LINES) {
    const pcs = line.map(i => board[i]).filter(v => v !== null)
    if (pcs.length === 4 && shareAttribute(pcs)) return line
  }
  return null
}

// Firebase는 null 가득한 배열을 비워버릴 수 있으니 안전한 직렬화 사용
function boardToFlat(board) {
  // 16 칸을 ',' 구분 (null → '')
  return board.map(c => c === null ? '' : String(c)).join(',')
}
function flatToBoard(flat) {
  if (typeof flat !== 'string') return Array(16).fill(null)
  return flat.split(',').map(s => s === '' ? null : parseInt(s, 10))
}
function availToFlat(available) {
  return available.join(',')
}
function flatToAvail(flat) {
  if (typeof flat !== 'string') return Array.from({ length: 16 }, (_, i) => i)
  if (flat === '') return []
  return flat.split(',').map(Number)
}

function canWinWith(board, piece) {
  for (let i = 0; i < 16; i++) {
    if (board[i] !== null) continue
    const nb = [...board]; nb[i] = piece
    if (checkWin(nb)) return true
  }
  return false
}

function aiPickPieceForOpponent(board, available) {
  const safe = available.filter(piece => !canWinWith(board, piece))
  const pool = safe.length > 0 ? safe : available
  return pool[Math.floor(Math.random() * pool.length)]
}

function aiPickPlace(board, piece) {
  for (let i = 0; i < 16; i++) {
    if (board[i] !== null) continue
    const nb = [...board]; nb[i] = piece
    if (checkWin(nb)) return i
  }
  const empty = []
  for (let i = 0; i < 16; i++) if (board[i] === null) empty.push(i)
  empty.sort((a, b) => {
    const da = Math.abs(Math.floor(a / 4) - 1.5) + Math.abs(a % 4 - 1.5)
    const db = Math.abs(Math.floor(b / 4) - 1.5) + Math.abs(b % 4 - 1.5)
    return da - db
  })
  return empty[0]
}

function pieceLabel(p) {
  return {
    tall: attr(p, 0) === 1,
    dark: attr(p, 1) === 1,
    square: attr(p, 2) === 1,
    solid: attr(p, 3) === 1,
  }
}

function PieceVisual({ piece, size = 36 }) {
  if (piece === null || piece === undefined) return null
  const a = pieceLabel(piece)
  const w = size * (a.tall ? 0.9 : 0.65)
  const h = size * (a.tall ? 0.95 : 0.55)
  const color = a.dark ? '#3E2723' : '#D7CCC8'
  return (
    <div style={{
      width: w, height: h,
      background: a.solid ? color : 'transparent',
      border: `3px solid ${color}`,
      borderRadius: a.square ? 3 : '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {!a.solid && <div style={{
        width: '40%', height: '40%',
        borderRadius: a.square ? 2 : '50%',
        background: a.dark ? '#FFF' : '#3E2723',
        opacity: 0.3,
      }} />}
    </div>
  )
}

export default function Quarto({ onBack }) {
  const [mode, setMode] = useState(null)
  const [board, setBoard] = useState(() => Array(16).fill(null))
  const [available, setAvailable] = useState(() => Array.from({ length: 16 }, (_, i) => i))
  const [phase, setPhase] = useState('give') // 'give' | 'place'
  const [currentPiece, setCurrentPiece] = useState(null)
  const [placer, setPlacer] = useState('black')
  const [giver, setGiver] = useState('white')
  const [winner, setWinner] = useState(null)
  const [winLine, setWinLine] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const aiBusyRef = useRef(false)

  const room = useGameRoom('quarto')

  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = room.gameState
    setBoard(typeof s.board === 'string' ? flatToBoard(s.board) : (s.board || Array(16).fill(null)))
    setAvailable(typeof s.available === 'string' ? flatToAvail(s.available) : (s.available || Array.from({ length: 16 }, (_, i) => i)))
    setPhase(s.phase || 'give')
    setCurrentPiece(s.currentPiece === '' || s.currentPiece === undefined ? null : (typeof s.currentPiece === 'number' ? s.currentPiece : null))
    setPlacer(s.placer || 'black')
    setGiver(s.giver || 'white')
    setWinner(s.winner || null)
    setWinLine(s.winLine ? (typeof s.winLine === 'string' ? s.winLine.split(',').map(Number) : s.winLine) : null)
  }, [room.gameState, mode])

  const myColor = mode === 'local' ? null // local에선 placer/giver로 판단
    : mode === 'ai' ? 'black'
    : mode === 'online' ? room.myColor : null

  const canIPlace = !winner && phase === 'place' && (
    mode === 'local'
    || (mode === 'ai' && placer === 'black')
    || (mode === 'online' && room.connected && placer === room.myColor)
  )
  const canIGive = !winner && phase === 'give' && (
    mode === 'local'
    || (mode === 'ai' && giver === 'black')
    || (mode === 'online' && room.connected && giver === room.myColor)
  )

  const sync = (next) => {
    if (mode === 'online') {
      room.updateState({
        board: boardToFlat(next.board),
        available: availToFlat(next.available),
        phase: next.phase,
        currentPiece: next.currentPiece ?? '',
        placer: next.placer, giver: next.giver,
        winner: next.winner || '',
        winLine: next.winLine ? next.winLine.join(',') : '',
      })
    }
    setBoard(next.board); setAvailable(next.available)
    setPhase(next.phase); setCurrentPiece(next.currentPiece ?? null)
    setPlacer(next.placer); setGiver(next.giver)
    if (next.winner) setWinner(next.winner)
    if (next.winLine) setWinLine(next.winLine)
  }

  // AI: give 단계
  useEffect(() => {
    if (mode !== 'ai' || winner) return
    if (phase !== 'give' || giver !== 'white') return
    if (aiBusyRef.current) return
    aiBusyRef.current = true
    const t = setTimeout(() => {
      const piece = aiPickPieceForOpponent(board, available)
      sync({
        board, available: available.filter(p => p !== piece),
        phase: 'place', currentPiece: piece, placer: 'black', giver: 'white',
      })
      aiBusyRef.current = false
    }, 600)
    return () => { clearTimeout(t); aiBusyRef.current = false }
  }, [phase, giver, board, available, winner, mode])

  // AI: place 단계
  useEffect(() => {
    if (mode !== 'ai' || winner) return
    if (phase !== 'place' || placer !== 'white' || currentPiece === null) return
    if (aiBusyRef.current) return
    aiBusyRef.current = true
    const t = setTimeout(() => {
      const idx = aiPickPlace(board, currentPiece)
      const nb = [...board]; nb[idx] = currentPiece
      const wl = checkWin(nb)
      if (wl) {
        sync({ board: nb, available, phase, currentPiece, placer: 'white', giver, winner: 'white', winLine: wl })
        aiBusyRef.current = false
        return
      }
      if (available.length === 0) {
        sync({ board: nb, available, phase, currentPiece: null, placer: 'white', giver, winner: 'draw' })
        aiBusyRef.current = false
        return
      }
      sync({ board: nb, available, phase: 'give', currentPiece: null, placer: 'black', giver: 'white' })
      aiBusyRef.current = false
    }, 600)
    return () => { clearTimeout(t); aiBusyRef.current = false }
  }, [phase, placer, currentPiece, board, available, winner, mode])

  const handlePlace = (i) => {
    if (!canIPlace) return
    if (board[i] !== null || currentPiece === null) return
    const nb = [...board]; nb[i] = currentPiece
    const wl = checkWin(nb)
    const myC = mode === 'local' ? placer : (mode === 'ai' ? 'black' : room.myColor)
    if (wl) {
      sync({ board: nb, available, phase, currentPiece, placer: myC, giver, winner: myC, winLine: wl })
      return
    }
    if (available.length === 0) {
      sync({ board: nb, available, phase, currentPiece: null, placer: myC, giver, winner: 'draw' })
      return
    }
    const next = myC === 'black' ? 'white' : 'black'
    sync({ board: nb, available, phase: 'give', currentPiece: null, placer: next, giver: myC })
  }

  const handleGive = (piece) => {
    if (!canIGive) return
    const myC = mode === 'local' ? giver : (mode === 'ai' ? 'black' : room.myColor)
    const next = myC === 'black' ? 'white' : 'black'
    sync({
      board, available: available.filter(p => p !== piece),
      phase: 'place', currentPiece: piece, placer: next, giver: myC,
    })
  }

  const reset = () => {
    sync({
      board: Array(16).fill(null),
      available: Array.from({ length: 16 }, (_, i) => i),
      phase: 'give', currentPiece: null,
      placer: 'black', giver: 'white',
      winner: null, winLine: null,
    })
    setWinner(null); setWinLine(null)
    aiBusyRef.current = false
  }

  const handleBack = () => {
    if (mode === 'online') room.leaveRoom()
    if (mode) { setMode(null); reset(); return }
    onBack()
  }

  const createOnline = async () => {
    await room.createRoom({
      board: boardToFlat(Array(16).fill(null)),
      available: availToFlat(Array.from({ length: 16 }, (_, i) => i)),
      phase: 'give', currentPiece: '',
      placer: 'black', giver: 'white',
      winner: '', winLine: '',
    })
    setMode('online')
  }
  const joinOnline = async () => {
    if (joinCode.length !== 2) { room.setError('2자리 코드를 입력하세요'); return }
    const ok = await room.joinRoom(joinCode)
    if (ok) setMode('online')
  }

  if (!mode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 15, color: '#888', cursor: 'pointer', marginBottom: 16 }}>← 돌아가기</button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🔲</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>퀀토</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => setMode('local')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #6D4C41, #4E342E)' }}>📱 같은 기기에서 (2인)</button>
          <button onClick={() => setMode('ai')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #E67E22, #D35400)' }}>🤖 vs 컴퓨터</button>
          <button onClick={createOnline}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #4895EF, #3A7BD5)' }}>🌐 온라인 방 만들기</button>
          <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>또는 코드로 참가</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.replace(/[^0-9]/g, ''))}
              maxLength={2} placeholder="방 코드 2자리" inputMode="numeric"
              style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '12px', borderRadius: 10, border: '2px solid #DDD', fontSize: 16, fontWeight: 700, textAlign: 'center', letterSpacing: 4, fontFamily: 'monospace' }} />
            <button onClick={joinOnline}
              style={{ padding: '0 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#4895EF', color: '#FFF', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 52, flexShrink: 0 }}>참가</button>
          </div>
          {room.error && <div style={{ color: '#E74C3C', fontSize: 13 }}>{room.error}</div>}
        </div>
      </div>
    )
  }

  if (mode === 'online' && !room.connected) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack} style={{ background: 'none', border: 'none', fontSize: 15, color: '#888', cursor: 'pointer', marginBottom: 24 }}>← 취소</button>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>상대를 기다리는 중...</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>상대방에게 아래 코드를 알려주세요</p>
        <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 8, padding: '16px 24px', background: '#F7F6F3', borderRadius: 14, display: 'inline-block', fontFamily: 'monospace' }}>{room.roomCode}</div>
        <p style={{ fontSize: 12, color: '#AAA', marginTop: 16 }}>나는 ⚫ (선공: 조각을 놓는 사람)</p>
      </div>
    )
  }

  const statusText = () => {
    if (winner === 'draw') return '🤝 무승부'
    if (winner) {
      if (mode === 'online') return winner === room.myColor ? '🎉 승리!' : '😵 패배'
      if (mode === 'ai') return winner === 'black' ? '🎉 4개 일치!' : '😵 AI가 완성'
      return winner === 'black' ? '⚫ 승리!' : '⚪ 승리!'
    }
    if (phase === 'give') {
      if (canIGive) return '상대에게 줄 조각을 골라주세요'
      return mode === 'ai' ? 'AI가 줄 조각 고르는 중...' : '상대가 조각을 고르는 중...'
    }
    // place
    if (canIPlace) return '받은 조각을 놓을 자리 선택'
    return mode === 'ai' ? 'AI 생각 중...' : '상대가 놓는 중...'
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={handleBack} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>
          🔲 퀀토 {mode === 'online' ? '(온라인)' : mode === 'ai' ? '(vs AI)' : '(2인)'}
        </h2>
        <button onClick={reset} style={{ background: '#F0F0F0', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>리셋</button>
      </div>

      {mode === 'online' && (
        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0', borderRadius: 6, marginBottom: 6 }}>
          방 코드: <strong>{room.roomCode}</strong> · 나는 {room.myColor === 'black' ? '⚫' : '⚪'}
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 13, fontWeight: 700, minHeight: 18 }}>
        {statusText()}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginBottom: 10, padding: 8, background: '#FFF3E0', borderRadius: 8, minHeight: 60,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>받은 조각:</span>
        {currentPiece !== null
          ? <PieceVisual piece={currentPiece} size={44} />
          : <span style={{ fontSize: 12, color: '#888' }}>(없음)</span>}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
        background: '#5D4037', padding: 6, borderRadius: 8,
      }}>
        {board.map((cell, i) => {
          const placeable = canIPlace && cell === null
          const isWin = winLine?.includes(i)
          return (
            <div key={i} onClick={() => handlePlace(i)}
              style={{
                aspectRatio: '1/1', background: isWin ? '#FFD54F' : '#D7CCC8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 4, cursor: placeable ? 'pointer' : 'default',
              }}>
              {cell !== null && <PieceVisual piece={cell} size={Math.min(50, (Math.min(typeof window !== 'undefined' ? window.innerWidth : 360, 480) - 80) / 4)} />}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
        남은 조각 ({available.length}/16){canIGive && ' — 상대에게 줄 조각 선택'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {available.map(p => (
          <div key={p} onClick={() => canIGive && handleGive(p)}
            style={{
              padding: 4, borderRadius: 8, background: '#FAFAFA',
              cursor: canIGive ? 'pointer' : 'default',
              border: '1px solid #DDD',
              width: 50, height: 50,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <PieceVisual piece={p} size={32} />
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 12 }}>
        조각엔 4속성(키/색/모양/속) · 한 줄에 한 속성이라도 같은 조각 4개면 승리 · 내가 둘 조각은 상대가 골라줌
      </p>
    </div>
  )
}
