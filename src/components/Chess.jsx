import { useState, useCallback, useEffect, useRef } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

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

// --- AI Engine (Minimax with alpha-beta pruning) ---
const PIECE_VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 }

// Piece-square tables (from black's perspective; flipped for white)
const PST_PAWN = [
  [  0,  0,  0,  0,  0,  0,  0,  0],
  [ 50, 50, 50, 50, 50, 50, 50, 50],
  [ 10, 10, 20, 30, 30, 20, 10, 10],
  [  5,  5, 10, 25, 25, 10,  5,  5],
  [  0,  0,  0, 20, 20,  0,  0,  0],
  [  5, -5,-10,  0,  0,-10, -5,  5],
  [  5, 10, 10,-20,-20, 10, 10,  5],
  [  0,  0,  0,  0,  0,  0,  0,  0],
]

const PST_KNIGHT = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
]

const PST_BISHOP = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20],
]

const PST_ROOK = [
  [  0,  0,  0,  0,  0,  0,  0,  0],
  [  5, 10, 10, 10, 10, 10, 10,  5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [  0,  0,  0,  5,  5,  0,  0,  0],
]

const PST_QUEEN = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [ -5,  0,  5,  5,  5,  5,  0, -5],
  [  0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20],
]

const PST_KING = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [ 20, 20,  0,  0,  0,  0, 20, 20],
  [ 20, 30, 10,  0,  0, 10, 30, 20],
]

const PST = { P: PST_PAWN, N: PST_KNIGHT, B: PST_BISHOP, R: PST_ROOK, Q: PST_QUEEN, K: PST_KING }

function getPST(pieceType, r, c, white) {
  const table = PST[pieceType]
  if (!table) return 0
  // Tables are from black's perspective (row 0 = black's back rank)
  // For white pieces, flip the row
  const row = white ? (7 - r) : r
  return table[row][c]
}

function evaluateBoard(board) {
  let score = 0
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]
      if (!p) continue
      const type = p.toUpperCase()
      const val = PIECE_VALUES[type] || 0
      const pst = getPST(type, r, c, isWhite(p))
      if (isWhite(p)) {
        score += val + pst
      } else {
        score -= val + pst
      }
    }
  }
  return score
}

// Execute a move on a board clone and return the new state
function executeMove(board, fromR, fromC, toR, toC, enPassant, castling) {
  const nb = cloneBoard(board)
  const piece = nb[fromR][fromC]
  const capturedPiece = nb[toR][toC]
  const white = isWhite(piece)

  // En passant capture
  let epCapture = null
  if (piece.toUpperCase() === 'P' && enPassant && toR === enPassant[0] && toC === enPassant[1]) {
    const capturedRow = white ? toR + 1 : toR - 1
    epCapture = nb[capturedRow][toC]
    nb[capturedRow][toC] = null
  }

  nb[toR][toC] = piece
  nb[fromR][fromC] = null

  // Castling rook move
  const newCastling = { ...castling }
  if (piece.toUpperCase() === 'K') {
    if (white) { newCastling.whiteK = false; newCastling.whiteQ = false }
    else { newCastling.blackK = false; newCastling.blackQ = false }
    if (Math.abs(toC - fromC) === 2) {
      if (toC === 6) { nb[toR][5] = nb[toR][7]; nb[toR][7] = null }
      if (toC === 2) { nb[toR][3] = nb[toR][0]; nb[toR][0] = null }
    }
  }
  if (piece.toUpperCase() === 'R') {
    if (fromR === 7 && fromC === 0) newCastling.whiteQ = false
    if (fromR === 7 && fromC === 7) newCastling.whiteK = false
    if (fromR === 0 && fromC === 0) newCastling.blackQ = false
    if (fromR === 0 && fromC === 7) newCastling.blackK = false
  }

  // New en passant target
  let newEP = null
  if (piece.toUpperCase() === 'P' && Math.abs(toR - fromR) === 2) {
    newEP = [(toR + fromR) / 2, toC]
  }

  // Promotion (AI always promotes to queen)
  if (piece.toUpperCase() === 'P' && (toR === 0 || toR === 7)) {
    nb[toR][toC] = white ? 'Q' : 'q'
  }

  return { board: nb, castling: newCastling, enPassant: newEP, captured: capturedPiece || epCapture }
}

// Generate all legal moves for a side, ordered: captures first (MVV-LVA), then non-captures
function generateOrderedMoves(board, turn, enPassant, castling) {
  const captures = []
  const quiet = []
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (!isAlly(board[r][c], turn)) continue
      const moves = getLegalMoves(board, r, c, turn, enPassant, castling)
      for (const [toR, toC] of moves) {
        const victim = board[toR][toC]
        if (victim) {
          // MVV-LVA: sort by victim value desc, attacker value asc
          const victimVal = PIECE_VALUES[victim.toUpperCase()] || 0
          const attackerVal = PIECE_VALUES[board[r][c].toUpperCase()] || 0
          captures.push({ from: [r, c], to: [toR, toC], score: victimVal * 10 - attackerVal })
        } else if (enPassant && board[r][c].toUpperCase() === 'P' && toR === enPassant[0] && toC === enPassant[1]) {
          captures.push({ from: [r, c], to: [toR, toC], score: 100 })
        } else {
          quiet.push({ from: [r, c], to: [toR, toC] })
        }
      }
    }
  }
  captures.sort((a, b) => b.score - a.score)
  return [...captures, ...quiet]
}

function minimax(board, depth, alpha, beta, maximizing, turn, enPassant, castling) {
  if (depth === 0) {
    return { score: evaluateBoard(board) }
  }

  const moves = generateOrderedMoves(board, turn, enPassant, castling)

  if (moves.length === 0) {
    // No legal moves: checkmate or stalemate
    if (isInCheck(board, turn)) {
      // Checkmate: very bad for the side to move
      return { score: maximizing ? -100000 + (3 - depth) : 100000 - (3 - depth) }
    }
    return { score: 0 } // Stalemate
  }

  let bestMove = null

  if (maximizing) {
    let maxEval = -Infinity
    for (const move of moves) {
      const result = executeMove(board, move.from[0], move.from[1], move.to[0], move.to[1], enPassant, castling)
      const nextTurn = turn === 'white' ? 'black' : 'white'
      const { score } = minimax(result.board, depth - 1, alpha, beta, false, nextTurn, result.enPassant, result.castling)
      if (score > maxEval) {
        maxEval = score
        bestMove = move
      }
      alpha = Math.max(alpha, score)
      if (beta <= alpha) break
    }
    return { score: maxEval, move: bestMove }
  } else {
    let minEval = Infinity
    for (const move of moves) {
      const result = executeMove(board, move.from[0], move.from[1], move.to[0], move.to[1], enPassant, castling)
      const nextTurn = turn === 'white' ? 'black' : 'white'
      const { score } = minimax(result.board, depth - 1, alpha, beta, true, nextTurn, result.enPassant, result.castling)
      if (score < minEval) {
        minEval = score
        bestMove = move
      }
      beta = Math.min(beta, score)
      if (beta <= alpha) break
    }
    return { score: minEval, move: bestMove }
  }
}

function getAIMove(board, enPassant, castling) {
  // AI plays black (minimizing)
  const result = minimax(board, 3, -Infinity, Infinity, false, 'black', enPassant, castling)
  return result.move
}

// --- Serialization helpers for Firebase ---
function boardToFlat(board) {
  return board.map(row => row.map(c => c || '').join(',')).join('|')
}

function flatToBoard(flat) {
  if (!flat) return cloneBoard(INIT_BOARD)
  return flat.split('|').map(row => row.split(',').map(c => c || null))
}

function serializeState({ board, turn, castling, enPassant, lastMove, gameOver, inCheck, captured, promotion }) {
  return {
    board: boardToFlat(board),
    turn,
    castling: castling || { whiteK: true, whiteQ: true, blackK: true, blackQ: true },
    enPassant: enPassant || '',
    lastMove: lastMove || '',
    gameOver: gameOver || '',
    inCheck: inCheck || false,
    capturedWhite: (captured && captured.white) ? captured.white.join(',') : '',
    capturedBlack: (captured && captured.black) ? captured.black.join(',') : '',
    promotion: promotion ? `${promotion.r},${promotion.c},${promotion.from[0]},${promotion.from[1]}` : '',
  }
}

function deserializeState(s) {
  if (!s) return null
  return {
    board: flatToBoard(s.board),
    turn: s.turn || 'white',
    castling: s.castling || { whiteK: true, whiteQ: true, blackK: true, blackQ: true },
    enPassant: s.enPassant ? (typeof s.enPassant === 'string' && s.enPassant.length > 0 ? s.enPassant.split(',').map(Number) : null) : null,
    lastMove: s.lastMove ? (typeof s.lastMove === 'string' && s.lastMove.length > 0 ? deserializeLastMove(s.lastMove) : null) : null,
    gameOver: s.gameOver || null,
    inCheck: s.inCheck || false,
    captured: {
      white: s.capturedWhite ? s.capturedWhite.split(',').filter(Boolean) : [],
      black: s.capturedBlack ? s.capturedBlack.split(',').filter(Boolean) : [],
    },
    promotion: s.promotion ? deserializePromotion(s.promotion) : null,
  }
}

function deserializeLastMove(str) {
  if (!str || str.length === 0) return null
  const parts = str.split(',').map(Number)
  if (parts.length === 4) return [[parts[0], parts[1]], [parts[2], parts[3]]]
  return null
}

function deserializePromotion(str) {
  if (!str || str.length === 0) return null
  const parts = str.split(',').map(Number)
  if (parts.length === 4) return { r: parts[0], c: parts[1], from: [parts[2], parts[3]] }
  return null
}

function serializeLastMove(lm) {
  if (!lm) return ''
  return `${lm[0][0]},${lm[0][1]},${lm[1][0]},${lm[1][1]}`
}

function serializeEnPassant(ep) {
  if (!ep) return ''
  return `${ep[0]},${ep[1]}`
}

function serializePromotion(p) {
  if (!p) return ''
  return `${p.r},${p.c},${p.from[0]},${p.from[1]}`
}

function makeInitialOnlineState() {
  return serializeState({
    board: cloneBoard(INIT_BOARD),
    turn: 'white',
    castling: { whiteK: true, whiteQ: true, blackK: true, blackQ: true },
    enPassant: null,
    lastMove: null,
    gameOver: null,
    inCheck: false,
    captured: { white: [], black: [] },
    promotion: null,
  })
}

export default function Chess({ onBack }) {
  const [mode, setMode] = useState(null) // null | 'local' | 'ai' | 'online'
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
  const [joinCode, setJoinCode] = useState('')
  // Override color: host=white, guest=black for chess (hook defaults opposite)
  const [onlineColor, setOnlineColor] = useState(null)
  const [aiThinking, setAiThinking] = useState(false)
  const aiTimerRef = useRef(null)

  const room = useGameRoom('chess')

  // Effective color for online mode
  const myColor = onlineColor || room.myColor

  // Sync state from Firebase
  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = deserializeState(room.gameState)
    if (!s) return
    setBoard(s.board)
    setTurn(s.turn)
    setCastling(s.castling)
    setEnPassant(s.enPassant)
    setLastMove(s.lastMove)
    setGameOver(s.gameOver)
    setInCheck(s.inCheck)
    setCaptured(s.captured)
    setPromotion(s.promotion)
    setSelected(null)
    setLegalMoves([])
  }, [room.gameState, mode])

  // Cleanup AI timer on unmount or mode change
  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    }
  }, [mode])

  // AI move effect: when it's black's turn in AI mode, compute and play
  useEffect(() => {
    if (mode !== 'ai') return
    if (turn !== 'black') return
    if (gameOver) return
    if (promotion) return

    setAiThinking(true)
    aiTimerRef.current = setTimeout(() => {
      const aiMove = getAIMove(board, enPassant, castling)
      if (!aiMove) {
        setAiThinking(false)
        return
      }

      const { from, to } = aiMove
      const [fromR, fromC] = from
      const [toR, toC] = to

      const nb = cloneBoard(board)
      const piece = nb[fromR][fromC]
      const capturedPiece = nb[toR][toC]
      const newCaptured = { white: [...captured.white], black: [...captured.black] }

      // En passant capture
      if (piece.toUpperCase() === 'P' && enPassant && toR === enPassant[0] && toC === enPassant[1]) {
        const capturedRow = isWhite(piece) ? toR + 1 : toR - 1
        const ep = nb[capturedRow][toC]
        if (ep) newCaptured[isWhite(piece) ? 'white' : 'black'].push(ep)
        nb[capturedRow][toC] = null
      }

      if (capturedPiece) {
        newCaptured[isWhite(piece) ? 'white' : 'black'].push(capturedPiece)
      }

      nb[toR][toC] = piece
      nb[fromR][fromC] = null

      // Castling
      const newCastling = { ...castling }
      if (piece.toUpperCase() === 'K') {
        if (isWhite(piece)) { newCastling.whiteK = false; newCastling.whiteQ = false }
        else { newCastling.blackK = false; newCastling.blackQ = false }
        if (Math.abs(toC - fromC) === 2) {
          if (toC === 6) { nb[toR][5] = nb[toR][7]; nb[toR][7] = null }
          if (toC === 2) { nb[toR][3] = nb[toR][0]; nb[toR][0] = null }
        }
      }
      if (piece.toUpperCase() === 'R') {
        if (fromR === 7 && fromC === 0) newCastling.whiteQ = false
        if (fromR === 7 && fromC === 7) newCastling.whiteK = false
        if (fromR === 0 && fromC === 0) newCastling.blackQ = false
        if (fromR === 0 && fromC === 7) newCastling.blackK = false
      }

      // En passant
      let newEP = null
      if (piece.toUpperCase() === 'P' && Math.abs(toR - fromR) === 2) {
        newEP = [(toR + fromR) / 2, toC]
      }

      // Promotion (AI always promotes to queen)
      if (piece.toUpperCase() === 'P' && (toR === 0 || toR === 7)) {
        nb[toR][toC] = isWhite(piece) ? 'Q' : 'q'
      }

      const newLastMove = [from, to]
      const nextTurn = 'white'
      const check = isInCheck(nb, nextTurn)
      let newGameOver = null
      if (!hasAnyLegalMove(nb, nextTurn, newEP, newCastling)) {
        newGameOver = check ? 'checkmate-black' : 'stalemate'
      }

      setBoard(nb)
      setCastling(newCastling)
      setEnPassant(newEP)
      setCaptured(newCaptured)
      setLastMove(newLastMove)
      setSelected(null)
      setLegalMoves([])
      setInCheck(check)
      setTurn(nextTurn)
      setGameOver(newGameOver)
      setAiThinking(false)
    }, 500)

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    }
  }, [mode, turn, gameOver, promotion, board, enPassant, castling, captured])

  const reset = () => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    setAiThinking(false)
    if (mode === 'online') {
      room.updateState(makeInitialOnlineState())
    } else {
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
  }

  const undo = () => {
    if (mode === 'online' || mode === 'ai') return
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

  const pushOnlineState = useCallback((newBoard, newTurn, newCastling, newEP, newLastMove, newGameOver, newInCheck, newCaptured, newPromotion) => {
    room.updateState({
      board: boardToFlat(newBoard),
      turn: newTurn,
      castling: newCastling,
      enPassant: serializeEnPassant(newEP),
      lastMove: serializeLastMove(newLastMove),
      gameOver: newGameOver || '',
      inCheck: newInCheck || false,
      capturedWhite: newCaptured.white.join(','),
      capturedBlack: newCaptured.black.join(','),
      promotion: serializePromotion(newPromotion),
    })
  }, [room])

  const handleClick = useCallback((r, c) => {
    if (gameOver) return
    // In AI mode, only allow moves when it's white's turn and AI is not thinking
    if (mode === 'ai') {
      if (turn !== 'white') return
      if (aiThinking) return
    }
    // In online mode, only allow moves on your turn
    if (mode === 'online') {
      if (!room.connected) return
      if (turn !== myColor) return
    }
    // If in promotion state, ignore board clicks
    if (promotion) return

    // 이미 선택된 말이 있고, 클릭한 곳이 이동 가능한 곳
    if (selected && legalMoves.some(([mr, mc]) => mr === r && mc === c)) {
      // 이동 실행
      const nb = cloneBoard(board)
      const piece = nb[selected[0]][selected[1]]
      const capturedPiece = nb[r][c]
      const newCaptured = { white: [...captured.white], black: [...captured.black] }

      // 히스토리 저장 (local only)
      if (mode === 'local') {
        setHistory([...history, { board: cloneBoard(board), turn, enPassant, castling: { ...castling }, captured: { white: [...captured.white], black: [...captured.black] }, inCheck }])
      }

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

      const newLastMove = [selected, [r, c]]

      // 프로모션 체크
      if (piece.toUpperCase() === 'P' && (r === 0 || r === 7)) {
        const newPromotion = { r, c, from: selected }
        if (mode === 'online') {
          pushOnlineState(nb, turn, newCastling, newEP, newLastMove, null, inCheck, newCaptured, newPromotion)
        } else if (mode === 'ai') {
          // In AI mode, player (white) still gets promotion UI
          setBoard(nb)
          setPromotion(newPromotion)
          setEnPassant(newEP)
          setCastling(newCastling)
          setCaptured(newCaptured)
          setLastMove(newLastMove)
          setSelected(null)
          setLegalMoves([])
        } else {
          setBoard(nb)
          setPromotion(newPromotion)
          setEnPassant(newEP)
          setCastling(newCastling)
          setCaptured(newCaptured)
          setLastMove(newLastMove)
          setSelected(null)
          setLegalMoves([])
        }
        return
      }

      const nextTurn = turn === 'white' ? 'black' : 'white'
      const check = isInCheck(nb, nextTurn)
      let newGameOver = null
      if (!hasAnyLegalMove(nb, nextTurn, newEP, newCastling)) {
        newGameOver = check ? `checkmate-${turn}` : 'stalemate'
      }

      if (mode === 'online') {
        pushOnlineState(nb, nextTurn, newCastling, newEP, newLastMove, newGameOver, check, newCaptured, null)
      } else {
        setBoard(nb)
        setCastling(newCastling)
        setEnPassant(newEP)
        setCaptured(newCaptured)
        setLastMove(newLastMove)
        setSelected(null)
        setLegalMoves([])
        setInCheck(check)
        setTurn(nextTurn)
        setGameOver(newGameOver)
      }
      return
    }

    // 자기 말 선택
    const piece = board[r][c]
    // In AI mode, only allow selecting white pieces
    if (mode === 'ai') {
      if (piece && isWhite(piece)) {
        const moves = getLegalMoves(board, r, c, turn, enPassant, castling)
        setSelected([r, c])
        setLegalMoves(moves)
      } else {
        setSelected(null)
        setLegalMoves([])
      }
    } else if (piece && isAlly(piece, turn)) {
      const moves = getLegalMoves(board, r, c, turn, enPassant, castling)
      setSelected([r, c])
      setLegalMoves(moves)
    } else {
      setSelected(null)
      setLegalMoves([])
    }
  }, [board, turn, selected, legalMoves, enPassant, castling, gameOver, promotion, history, captured, inCheck, mode, myColor, room.connected, pushOnlineState, aiThinking])

  const promote = (piece) => {
    if (!promotion) return
    // In online mode, only the promoting player can pick the piece
    if (mode === 'online' && turn !== myColor) return

    const nb = cloneBoard(board)
    nb[promotion.r][promotion.c] = turn === 'white' ? piece.toUpperCase() : piece.toLowerCase()

    const nextTurn = turn === 'white' ? 'black' : 'white'
    const check = isInCheck(nb, nextTurn)
    let newGameOver = null
    if (!hasAnyLegalMove(nb, nextTurn, enPassant, castling)) {
      newGameOver = check ? `checkmate-${turn}` : 'stalemate'
    }

    if (mode === 'online') {
      pushOnlineState(nb, nextTurn, castling, enPassant, lastMove, newGameOver, check, captured, null)
    } else {
      setBoard(nb)
      setPromotion(null)
      setInCheck(check)
      setTurn(nextTurn)
      setGameOver(newGameOver)
    }
  }

  const handleBack = () => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    setAiThinking(false)
    if (mode === 'online') room.leaveRoom()
    if (mode) { setMode(null); setOnlineColor(null); return }
    onBack()
  }

  const createOnline = async () => {
    await room.createRoom(makeInitialOnlineState())
    setOnlineColor('white') // host = white for chess
    setMode('online')
    // Reset local state to initial
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

  const joinOnline = async () => {
    if (joinCode.length !== 2) { room.setError('2자리 코드를 입력하세요'); return }
    const ok = await room.joinRoom(joinCode)
    if (ok) {
      setOnlineColor('black') // guest = black for chess
      setMode('online')
    }
  }

  const startAI = () => {
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
    setAiThinking(false)
    setMode('ai')
  }

  // Mode selection screen
  if (!mode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>♟</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>체스</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => setMode('local')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #5D4037, #795548)' }}>
            같은 기기에서 (2인)
          </button>
          <button onClick={startAI}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #43A047, #66BB6A)' }}>
            vs 컴퓨터
          </button>
          <button onClick={createOnline}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #4895EF, #3A7BD5)' }}>
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

  // Online: waiting for opponent
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
          나는 ⚪ 백 (선공)
        </p>
      </div>
    )
  }

  const isMyTurn = mode === 'local' || mode === 'ai' ? turn === 'white' || mode === 'local' : turn === myColor
  const cellSize = Math.min(Math.floor((window.innerWidth - 32) / 8), 50)

  const renderPiece = (p) => {
    if (!p) return null
    return <span style={{ fontSize: cellSize * 0.65, lineHeight: 1 }}>{PIECES[p]}</span>
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '1rem' }}>
      <div style={{
        background: mode === 'ai'
          ? 'linear-gradient(135deg, #2E7D32, #43A047)'
          : 'linear-gradient(135deg, #5D4037, #795548)',
        color: '#FFF', padding: '1rem 1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={handleBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← {mode === 'online' ? '나가기' : '돌아가기'}
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>
            체스 {mode === 'online' ? '(온라인)' : mode === 'ai' ? '(vs 컴퓨터)' : ''}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {mode === 'local' && (
              <button onClick={undo}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 12, borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}>
                ↩
              </button>
            )}
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
            : mode === 'online'
              ? (isMyTurn
                ? `내 차례 (${myColor === 'white' ? '백' : '흑'})`
                : '상대 차례')
              : mode === 'ai'
                ? (aiThinking
                  ? '컴퓨터 생각 중...'
                  : inCheck
                    ? `${turn === 'white' ? '백' : '흑'} 체크!`
                    : turn === 'white' ? '내 차례 (백)' : '컴퓨터 차례')
                : inCheck ? `${turn === 'white' ? '백' : '흑'} 체크!` : `${turn === 'white' ? '백' : '흑'} 차례`
          }
        </div>
        <div>
          ⚫ 흑 잡은말: {captured.black.map((p, i) => <span key={i} style={{ fontSize: 16 }}>{PIECES[p]}</span>)}
        </div>
      </div>

      {mode === 'online' && (
        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0' }}>
          방 코드: <strong>{room.roomCode}</strong> · 나는 {myColor === 'white' ? '⚪ 백' : '⚫ 흑'}
          {inCheck && !gameOver && ` · ${turn === 'white' ? '백' : '흑'} 체크!`}
        </div>
      )}

      {mode === 'ai' && (
        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0' }}>
          나: ⚪ 백 (선공) · 컴퓨터: ⚫ 흑
          {inCheck && !gameOver && ` · ${turn === 'white' ? '백' : '흑'} 체크!`}
        </div>
      )}

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
                      cursor: (mode === 'ai' ? turn === 'white' && !aiThinking : isMyTurn) && !gameOver ? 'pointer' : 'default', position: 'relative',
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
      {promotion && (mode === 'local' || mode === 'ai' || turn === myColor) && (
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

      {/* 프로모션 대기 (온라인 - 상대가 선택 중) */}
      {promotion && mode === 'online' && turn !== myColor && (
        <div style={{
          textAlign: 'center', padding: '12px',
          background: '#FFF9E6', borderRadius: 12, margin: '0 12px',
          border: '2px solid #F1C40F', fontSize: 13, fontWeight: 600,
        }}>
          상대방이 승급할 기물을 선택하는 중...
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
              : gameOver === 'checkmate-white'
                ? mode === 'ai' ? '축하합니다! 승리! (체크메이트)' : '⚪ 백 승리! (체크메이트)'
                : mode === 'ai' ? '컴퓨터 승리! (체크메이트)' : '⚫ 흑 승리! (체크메이트)'}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={reset}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#5D4037', color: '#FFF', fontSize: 14, fontWeight: 600 }}>
              다시 하기
            </button>
            <button onClick={handleBack}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
              {mode === 'online' ? '나가기' : '게임 목록'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
