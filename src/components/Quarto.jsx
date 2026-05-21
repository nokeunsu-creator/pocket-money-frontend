import { useState, useEffect } from 'react'

// 16개 조각: 4비트 (높이 H/L, 색 D/W, 모양 S/C, 속 F/E)
// piece idx 0~15 = 4비트
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

// 사람에게 줄 다음 조각을 AI가 고르는 함수: 사람이 둬서 이길 수 없는 조각 선택
function aiPickPieceForHuman(board, available) {
  // 사람이 받을 조각: 사람이 어디에 두든 이기지 못하는 조각 우선
  const safe = available.filter(piece => {
    return !canWinWith(board, piece)
  })
  const pool = safe.length > 0 ? safe : available
  return pool[Math.floor(Math.random() * pool.length)]
}

// AI가 자기 차례에 조각을 놓을 자리 선택
function aiPickPlace(board, piece) {
  // 1) 이길 수 있는 자리
  for (let i = 0; i < 16; i++) {
    if (board[i] !== null) continue
    const nb = [...board]; nb[i] = piece
    if (checkWin(nb)) return i
  }
  // 2) 그 외엔 휴리스틱: 가운데 우선
  const empty = []
  for (let i = 0; i < 16; i++) if (board[i] === null) empty.push(i)
  empty.sort((a, b) => {
    const da = Math.abs(Math.floor(a / 4) - 1.5) + Math.abs(a % 4 - 1.5)
    const db = Math.abs(Math.floor(b / 4) - 1.5) + Math.abs(b % 4 - 1.5)
    return da - db
  })
  return empty[0]
}

function canWinWith(board, piece) {
  for (let i = 0; i < 16; i++) {
    if (board[i] !== null) continue
    const nb = [...board]; nb[i] = piece
    if (checkWin(nb)) return true
  }
  return false
}

function pieceLabel(p) {
  // 디스플레이용
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
  const [board, setBoard] = useState(() => Array(16).fill(null))
  const [available, setAvailable] = useState(() => Array.from({ length: 16 }, (_, i) => i))
  // phase: 'place' (현재 plyer가 조각을 보드에 놓기) | 'give' (다음 사람에게 줄 조각 고르기)
  const [phase, setPhase] = useState('give')
  const [currentPiece, setCurrentPiece] = useState(null) // 손에 든 조각
  // 누가 둘 차례인지 (조각을 보드에 놓는 사람)
  const [placer, setPlacer] = useState('black') // 사람 먼저 두기
  // 누가 다음 조각을 골라 줄 차례인지 (give 단계)
  const [giver, setGiver] = useState('white') // AI가 먼저 사람에게 조각 준다
  const [winner, setWinner] = useState(null)
  const [winLine, setWinLine] = useState(null)

  // AI가 사람에게 조각을 주는 단계
  useEffect(() => {
    if (winner) return
    if (phase !== 'give' || giver !== 'white') return
    const t = setTimeout(() => {
      const piece = aiPickPieceForHuman(board, available)
      setCurrentPiece(piece)
      setAvailable(available.filter(p => p !== piece))
      setPhase('place')
      setPlacer('black')
    }, 600)
    return () => clearTimeout(t)
  }, [phase, giver, board, available, winner])

  // AI가 조각을 보드에 놓는 단계 (사람이 준 조각으로)
  useEffect(() => {
    if (winner) return
    if (phase !== 'place' || placer !== 'white') return
    if (currentPiece === null) return
    const t = setTimeout(() => {
      const idx = aiPickPlace(board, currentPiece)
      const nb = [...board]; nb[idx] = currentPiece
      setBoard(nb)
      const wl = checkWin(nb)
      if (wl) { setWinner('white'); setWinLine(wl); return }
      if (available.length === 0) { setWinner('draw'); return }
      setCurrentPiece(null)
      setPhase('give')
      setGiver('white') // AI는 자기가 둔 다음, 사람한테 줄 조각을 고름
      setPlacer('black')
      // 그런데 AI가 자기 차례에 둔 직후엔 AI가 사람한테 줄 차례
      // 위에 phase=give, giver=white로 설정했으므로 첫 effect가 실행됨
    }, 600)
    return () => clearTimeout(t)
  }, [phase, placer, currentPiece, board, available, winner])

  // 사람이 조각을 놓음
  const handlePlace = (i) => {
    if (winner) return
    if (phase !== 'place' || placer !== 'black') return
    if (board[i] !== null) return
    if (currentPiece === null) return
    const nb = [...board]; nb[i] = currentPiece
    setBoard(nb)
    const wl = checkWin(nb)
    if (wl) { setWinner('black'); setWinLine(wl); return }
    if (available.length === 0) { setWinner('draw'); return }
    setCurrentPiece(null)
    setPhase('give')
    setGiver('black') // 사람이 두고나면 사람이 AI에게 조각을 줘야 함
    setPlacer('white')
  }

  // 사람이 AI에게 줄 조각 선택
  const handleGive = (piece) => {
    if (winner) return
    if (phase !== 'give' || giver !== 'black') return
    setCurrentPiece(piece)
    setAvailable(available.filter(p => p !== piece))
    setPhase('place')
    setPlacer('white')
  }

  const reset = () => {
    setBoard(Array(16).fill(null))
    setAvailable(Array.from({ length: 16 }, (_, i) => i))
    setPhase('give')
    setCurrentPiece(null)
    setPlacer('black')
    setGiver('white')
    setWinner(null)
    setWinLine(null)
  }

  const statusText = () => {
    if (winner === 'black') return '🎉 4개 일치 완성!'
    if (winner === 'white') return '😵 AI가 4개 완성'
    if (winner === 'draw') return '🤝 무승부'
    if (phase === 'give') {
      if (giver === 'white') return 'AI가 줄 조각을 고르는 중...'
      return 'AI에게 줄 조각을 골라주세요'
    }
    if (placer === 'white') return `AI 생각 중...`
    return '받은 조각을 놓을 자리 선택'
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>🔲 퀀토</h2>
        <button onClick={reset}
          style={{ background: '#F0F0F0', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>리셋</button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 13, fontWeight: 700, minHeight: 18 }}>
        {statusText()}
      </div>

      {/* 손에 든 조각 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginBottom: 10, padding: 8, background: '#FFF3E0', borderRadius: 8, minHeight: 60,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>받은 조각:</span>
        {currentPiece !== null
          ? <PieceVisual piece={currentPiece} size={44} />
          : <span style={{ fontSize: 12, color: '#888' }}>(없음)</span>}
      </div>

      {/* 보드 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
        background: '#5D4037', padding: 6, borderRadius: 8,
      }}>
        {board.map((cell, i) => {
          const placeable = !winner && phase === 'place' && placer === 'black' && cell === null
          const isWin = winLine?.includes(i)
          return (
            <div key={i} onClick={() => handlePlace(i)}
              style={{
                aspectRatio: '1/1', background: isWin ? '#FFD54F' : '#D7CCC8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 4, cursor: placeable ? 'pointer' : 'default',
              }}>
              {cell !== null && <PieceVisual piece={cell} size={Math.min(50, (Math.min(window.innerWidth, 480) - 80) / 4)} />}
            </div>
          )
        })}
      </div>

      {/* 사용 가능 조각 (AI에게 줄 때) */}
      <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
        남은 조각 ({available.length}/16)
        {phase === 'give' && giver === 'black' && ' — AI에게 줄 조각 선택'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {available.map(p => {
          const givable = !winner && phase === 'give' && giver === 'black'
          return (
            <div key={p} onClick={() => givable && handleGive(p)}
              style={{
                padding: 4, borderRadius: 8, background: '#FAFAFA',
                cursor: givable ? 'pointer' : 'default',
                border: '1px solid #DDD',
                width: 50, height: 50,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <PieceVisual piece={p} size={32} />
            </div>
          )
        })}
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 12 }}>
        조각엔 4속성(키/색/모양/속) · 한 줄(가로/세로/대각)에 한 속성이라도 같은 조각 4개면 승리 · 내가 둘 조각은 상대가 골라줌
      </p>
    </div>
  )
}
