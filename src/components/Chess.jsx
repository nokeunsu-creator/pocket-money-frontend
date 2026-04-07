import { useState, useCallback } from 'react'

const PIECES = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
}

const INIT_BOARD = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
]

function cloneBoard(b) { return b.map(r => [...r]) }

function isWhite(p) { return p && p === p.toUpperCase() }
function isBlack(p) { return p && p === p.toLowerCase() }
function isAlly(p, turn) { return turn === 'white' ? isWhite(p) : isBlack(p) }
function isEnemy(p, turn) { return turn === 'white' ? isBlack(p) : isWhite(p) }

function findKing(board, turn) {
  const k = turn === 'white' ? 'K' : 'k'
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] === k) return [r, c]
  return null
}

function getRawMoves(board, r, c, enPassant, castling) {
  const piece = board[r][c]
  if (!piece) return []
  const moves = []
  const white = isWhite(piece)
  const type = piece.toUpperCase()

  const addIf = (nr, nc) => {
    if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) return false
    if (white ? isWhite(board[nr][nc]) : isBlack(board[nr][nc])) return false
    moves.push([nr, nc])
    return !board[nr][nc]
  }

  const slide = (dr, dc) => {
    for (let i = 1; i < 8; i++) {
      if (!addIf(r + dr * i, c + dc * i)) break
    }
  }

  if (type === 'P') {
    const dir = white ? -1 : 1
    const start = white ? 6 : 1
    // 전진
    if (r + dir >= 0 && r + dir < 8 && !board[r + dir][c]) {
      moves.push([r + dir, c])
      if (r === start && !board[r + dir * 2][c]) moves.push([r + dir * 2, c])
    }
    // 대각선 잡기
    for (const dc of [-1, 1]) {
      const nr = r + dir, nc = c + dc
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (white ? isBlack(board[nr][nc]) : isWhite(board[nr][nc])) moves.push([nr, nc])
        // 앙파상
        if (enPassant && enPassant[0] === nr && enPassant[1] === nc) moves.push([nr, nc])
      }
    }
  }
  if (type === 'R') { slide(0, 1); slide(0, -1); slide(1, 0); slide(-1, 0) }
  if (type === 'B') { slide(1, 1); slide(1, -1); slide(-1, 1); slide(-1, -1) }
  if (type === 'Q') { slide(0, 1); slide(0, -1); slide(1, 0); slide(-1, 0); slide(1, 1); slide(1, -1); slide(-1, 1); slide(-1, -1) }
  if (type === 'N') {
    for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) addIf(r + dr, c + dc)
  }
  if (type === 'K') {
    for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) addIf(r + dr, c + dc)
    // 캐슬링
    if (castling) {
      const row = white ? 7 : 0
      if (r === row && c === 4) {
        const side = white ? 'white' : 'black'
        // 킹사이드
        if (castling[side + 'K'] && !board[row][5] && !board[row][6] && board[row][7] === (white ? 'R' : 'r')) {
          if (!isSquareAttacked(board, row, 4, white ? 'black' : 'white') &&
              !isSquareAttacked(board, row, 5, white ? 'black' : 'white') &&
              !isSquareAttacked(board, row, 6, white ? 'black' : 'white')) {
            moves.push([row, 6])
          }
        }
        // 퀸사이드
        if (castling[side + 'Q'] && !board[row][3] && !board[row][2] && !board[row][1] && board[row][0] === (white ? 'R' : 'r')) {
          if (!isSquareAttacked(board, row, 4, white ? 'black' : 'white') &&
              !isSquareAttacked(board, row, 3, white ? 'black' : 'white') &&
              !isSquareAttacked(board, row, 2, white ? 'black' : 'white')) {
            moves.push([row, 2])
          }
        }
      }
    }
  }
  return moves
}

function isSquareAttacked(board, r, c, byColor) {
  for (let rr = 0; rr < 8; rr++)
    for (let cc = 0; cc < 8; cc++) {
      const p = board[rr][cc]
      if (!p) continue
      if (byColor === 'white' ? !isWhite(p) : !isBlack(p)) continue
      const moves = getRawMoves(board, rr, cc, null, null)
      if (moves.some(([mr, mc]) => mr === r && mc === c)) return true
    }
  return false
}

function isInCheck(board, turn) {
  const kp = findKing(board, turn)
  if (!kp) return false
  return isSquareAttacked(board, kp[0], kp[1], turn === 'white' ? 'black' : 'white')
}

function getLegalMoves(board, r, c, turn, enPassant, castling) {
  const piece = board[r][c]
  if (!piece || !isAlly(piece, turn)) return []
  const raw = getRawMoves(board, r, c, enPassant, castling)
  return raw.filter(([nr, nc]) => {
    const nb = cloneBoard(board)
    nb[nr][nc] = nb[r][c]
    nb[r][c] = null
    // 앙파상 잡기
    if (piece.toUpperCase() === 'P' && enPassant && nr === enPassant[0] && nc === enPassant[1]) {
      const capturedRow = isWhite(piece) ? nr + 1 : nr - 1
      nb[capturedRow][nc] = null
    }
    return !isInCheck(nb, turn)
  })
}

function hasAnyLegalMove(board, turn, enPassant, castling) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      if (isAlly(board[r][c], turn)) {
        if (getLegalMoves(board, r, c, turn, enPassant, castling).length > 0) return true
      }
    }
  return false
}

export default function Chess({ onBack }) {
  const [board, setBoard] = useState(cloneBoard(INIT_BOARD))
  const [turn, setTurn] = useState('white')
  const [selected, setSelected] = useState(null)
  const [legalMoves, setLegalMoves] = useState([])
  const [enPassant, setEnPassant] = useState(null)
  const [castling, setCastling] = useState({ whiteK: true, whiteQ: true, blackK: true, blackQ: true })
  const [gameOver, setGameOver] = useState(null) // 'checkmate-white' | 'checkmate-black' | 'stalemate'
  const [inCheck, setInCheck] = useState(false)
  const [lastMove, setLastMove] = useState(null)
  const [promotion, setPromotion] = useState(null) // { r, c, from: [r,c] }
  const [history, setHistory] = useState([])
  const [captured, setCaptured] = useState({ white: [], black: [] })

  const reset = () => {
    setBoard(cloneBoard(INIT_BOARD))
    setTurn('white')
    setSelected(null)
    setLegalMoves([])
    setEnPassant(null)
    setCastling({ whiteK: true, whiteQ: true, blackK: true, blackQ: true })
    setGameOver(null)
    setInCheck(false)
    setLastMove(null)
    setPromotion(null)
    setHistory([])
    setCaptured({ white: [], black: [] })
  }

  const undo = () => {
    if (history.length === 0 || gameOver) return
    const last = history[history.length - 1]
    setBoard(last.board)
    setTurn(last.turn)
    setEnPassant(last.enPassant)
    setCastling(last.castling)
    setCaptured(last.captured)
    setInCheck(last.inCheck)
    setHistory(history.slice(0, -1))
    setSelected(null)
    setLegalMoves([])
    setLastMove(null)
    setGameOver(null)
    setPromotion(null)
  }

  const handleClick = useCallback((r, c) => {
    if (gameOver || promotion) return

    // 이미 선택된 말이 있고, 클릭한 곳이 이동 가능한 곳
    if (selected && legalMoves.some(([mr, mc]) => mr === r && mc === c)) {
      // 이동 실행
      const nb = cloneBoard(board)
      const piece = nb[selected[0]][selected[1]]
      const capturedPiece = nb[r][c]
      const newCaptured = { white: [...captured.white], black: [...captured.black] }

      // 히스토리 저장
      setHistory([...history, { board: cloneBoard(board), turn, enPassant, castling: { ...castling }, captured: { white: [...captured.white], black: [...captured.black] }, inCheck }])

      // 앙파상 잡기
      if (piece.toUpperCase() === 'P' && enPassant && r === enPassant[0] && c === enPassant[1]) {
        const capturedRow = isWhite(piece) ? r + 1 : r - 1
        const ep = nb[capturedRow][c]
        if (ep) newCaptured[isWhite(piece) ? 'white' : 'black'].push(ep)
        nb[capturedRow][c] = null
      }

      if (capturedPiece) {
        newCaptured[isWhite(piece) ? 'white' : 'black'].push(capturedPiece)
      }

      nb[r][c] = piece
      nb[selected[0]][selected[1]] = null

      // 캐슬링 이동
      const newCastling = { ...castling }
      if (piece.toUpperCase() === 'K') {
        if (isWhite(piece)) { newCastling.whiteK = false; newCastling.whiteQ = false }
        else { newCastling.blackK = false; newCastling.blackQ = false }
        // 룩 이동
        if (Math.abs(c - selected[1]) === 2) {
          if (c === 6) { nb[r][5] = nb[r][7]; nb[r][7] = null }
          if (c === 2) { nb[r][3] = nb[r][0]; nb[r][0] = null }
        }
      }
      if (piece.toUpperCase() === 'R') {
        if (selected[0] === 7 && selected[1] === 0) newCastling.whiteQ = false
        if (selected[0] === 7 && selected[1] === 7) newCastling.whiteK = false
        if (selected[0] === 0 && selected[1] === 0) newCastling.blackQ = false
        if (selected[0] === 0 && selected[1] === 7) newCastling.blackK = false
      }

      // 앙파상 설정
      let newEP = null
      if (piece.toUpperCase() === 'P' && Math.abs(r - selected[0]) === 2) {
        newEP = [(r + selected[0]) / 2, c]
      }

      // 프로모션 체크
      if (piece.toUpperCase() === 'P' && (r === 0 || r === 7)) {
        setBoard(nb)
        setPromotion({ r, c, from: selected })
        setEnPassant(newEP)
        setCastling(newCastling)
        setCaptured(newCaptured)
        setLastMove([selected, [r, c]])
        setSelected(null)
        setLegalMoves([])
        return
      }

      setBoard(nb)
      setCastling(newCastling)
      setEnPassant(newEP)
      setCaptured(newCaptured)
      setLastMove([selected, [r, c]])
      setSelected(null)
      setLegalMoves([])

      const nextTurn = turn === 'white' ? 'black' : 'white'
      const check = isInCheck(nb, nextTurn)
      setInCheck(check)
      setTurn(nextTurn)

      if (!hasAnyLegalMove(nb, nextTurn, newEP, newCastling)) {
        setGameOver(check ? `checkmate-${turn}` : 'stalemate')
      }
      return
    }

    // 자기 말 선택
    const piece = board[r][c]
    if (piece && isAlly(piece, turn)) {
      const moves = getLegalMoves(board, r, c, turn, enPassant, castling)
      setSelected([r, c])
      setLegalMoves(moves)
    } else {
      setSelected(null)
      setLegalMoves([])
    }
  }, [board, turn, selected, legalMoves, enPassant, castling, gameOver, promotion, history, captured, inCheck])

  const promote = (piece) => {
    if (!promotion) return
    const nb = cloneBoard(board)
    nb[promotion.r][promotion.c] = turn === 'white' ? piece.toUpperCase() : piece.toLowerCase()
    setBoard(nb)
    setPromotion(null)

    const nextTurn = turn === 'white' ? 'black' : 'white'
    const check = isInCheck(nb, nextTurn)
    setInCheck(check)
    setTurn(nextTurn)

    if (!hasAnyLegalMove(nb, nextTurn, enPassant, castling)) {
      setGameOver(check ? `checkmate-${turn}` : 'stalemate')
    }
  }

  const cellSize = Math.min(Math.floor((window.innerWidth - 32) / 8), 50)

  const renderPiece = (p) => {
    if (!p) return null
    return <span style={{ fontSize: cellSize * 0.65, lineHeight: 1 }}>{PIECES[p]}</span>
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '1rem' }}>
      <div style={{
        background: 'linear-gradient(135deg, #5D4037, #795548)',
        color: '#FFF', padding: '1rem 1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 돌아가기
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>체스</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={undo}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 12, borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}>
              ↩
            </button>
            <button onClick={reset}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 12, borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}>
              새 게임
            </button>
          </div>
        </div>
      </div>

      {/* 정보 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 16px', background: '#F7F6F3', fontSize: 13,
      }}>
        <div>
          ⚪ 백 잡은말: {captured.white.map((p, i) => <span key={i} style={{ fontSize: 16 }}>{PIECES[p]}</span>)}
        </div>
        <div style={{
          padding: '2px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: gameOver ? '#F1C40F' : turn === 'white' ? '#FFF' : '#333',
          color: gameOver ? '#333' : turn === 'white' ? '#333' : '#FFF',
          border: '1px solid #DDD',
        }}>
          {gameOver
            ? gameOver === 'stalemate' ? '무승부' : '체크메이트!'
            : inCheck ? `${turn === 'white' ? '백' : '흑'} 체크!` : `${turn === 'white' ? '백' : '흑'} 차례`
          }
        </div>
        <div>
          ⚫ 흑 잡은말: {captured.black.map((p, i) => <span key={i} style={{ fontSize: 16 }}>{PIECES[p]}</span>)}
        </div>
      </div>

      {/* 체스판 */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <div style={{ border: '3px solid #5D4037', borderRadius: 4 }}>
          {board.map((row, r) => (
            <div key={r} style={{ display: 'flex' }}>
              {row.map((cell, c) => {
                const isDark = (r + c) % 2 === 1
                const isSelected = selected && selected[0] === r && selected[1] === c
                const isLegal = legalMoves.some(([mr, mc]) => mr === r && mc === c)
                const isLast = lastMove && ((lastMove[0][0] === r && lastMove[0][1] === c) || (lastMove[1][0] === r && lastMove[1][1] === c))
                const isKingCheck = inCheck && cell && cell.toUpperCase() === 'K' && isAlly(cell, turn)

                let bg = isDark ? '#B58863' : '#F0D9B5'
                if (isSelected) bg = '#7B61FF'
                else if (isLast) bg = isDark ? '#AAA23A' : '#CDD26A'
                else if (isKingCheck) bg = '#E74C3C'

                return (
                  <div key={c}
                    onClick={() => handleClick(r, c)}
                    style={{
                      width: cellSize, height: cellSize,
                      background: bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', position: 'relative',
                    }}
                  >
                    {renderPiece(cell)}
                    {isLegal && !cell && (
                      <div style={{
                        position: 'absolute', width: cellSize * 0.25, height: cellSize * 0.25,
                        borderRadius: '50%', background: 'rgba(0,0,0,0.2)',
                      }} />
                    )}
                    {isLegal && cell && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        border: `3px solid rgba(0,0,0,0.3)`, borderRadius: '50%',
                      }} />
                    )}
                    {/* 좌표 */}
                    {c === 0 && (
                      <span style={{ position: 'absolute', top: 1, left: 2, fontSize: 8, color: isDark ? '#F0D9B5' : '#B58863' }}>
                        {8 - r}
                      </span>
                    )}
                    {r === 7 && (
                      <span style={{ position: 'absolute', bottom: 1, right: 2, fontSize: 8, color: isDark ? '#F0D9B5' : '#B58863' }}>
                        {'abcdefgh'[c]}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 프로모션 선택 */}
      {promotion && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 8, padding: '12px',
          background: '#FFF9E6', borderRadius: 12, margin: '0 12px',
          border: '2px solid #F1C40F',
        }}>
          <span style={{ alignSelf: 'center', fontSize: 13, fontWeight: 600 }}>승급:</span>
          {['Q', 'R', 'B', 'N'].map(p => (
            <button key={p} onClick={() => promote(p)}
              style={{
                width: 48, height: 48, borderRadius: 10, border: '2px solid #DDD',
                background: '#FFF', fontSize: 30, cursor: 'pointer',
              }}>
              {PIECES[turn === 'white' ? p : p.toLowerCase()]}
            </button>
          ))}
        </div>
      )}

      {/* 게임 오버 */}
      {gameOver && (
        <div style={{
          margin: '12px', padding: '20px', borderRadius: 14, textAlign: 'center',
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          border: '2px solid #F1C40F',
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>
            {gameOver === 'stalemate' ? '🤝' : '🏆'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            {gameOver === 'stalemate' ? '스테일메이트 — 무승부'
              : gameOver === 'checkmate-white' ? '⚪ 백 승리! (체크메이트)'
              : '⚫ 흑 승리! (체크메이트)'}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={reset}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#5D4037', color: '#FFF', fontSize: 14, fontWeight: 600 }}>
              다시 하기
            </button>
            <button onClick={onBack}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
              게임 목록
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
