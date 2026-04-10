import { useState, useEffect, useCallback, useRef } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

// ─── Constants ───────────────────────────────────────────────────────────────
const ROWS = 10
const COLS = 9

const CHO = 'cho'  // red, goes first
const HAN = 'han'  // blue

// Piece types
const KING = 'king'
const CHARIOT = 'chariot'
const CANNON = 'cannon'
const HORSE = 'horse'
const ELEPHANT = 'elephant'
const ADVISOR = 'advisor'
const SOLDIER = 'soldier'

const PIECE_NAMES = {
  [KING]: { [CHO]: '楚', [HAN]: '漢' },
  [CHARIOT]: { [CHO]: '車', [HAN]: '車' },
  [CANNON]: { [CHO]: '包', [HAN]: '包' },
  [HORSE]: { [CHO]: '馬', [HAN]: '馬' },
  [ELEPHANT]: { [CHO]: '象', [HAN]: '象' },
  [ADVISOR]: { [CHO]: '士', [HAN]: '士' },
  [SOLDIER]: { [CHO]: '兵', [HAN]: '卒' },
}

const PIECE_VALUES = {
  [KING]: 0,
  [CHARIOT]: 13,
  [CANNON]: 7,
  [HORSE]: 5,
  [ELEPHANT]: 3,
  [ADVISOR]: 3,
  [SOLDIER]: 2,
}

// Palace boundaries
const PALACES = {
  [CHO]: { rMin: 7, rMax: 9, cMin: 3, cMax: 5 },
  [HAN]: { rMin: 0, rMax: 2, cMin: 3, cMax: 5 },
}

// ─── Initial Board Setup ─────────────────────────────────────────────────────
function createInitialBoard() {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null))

  // HAN pieces (top, blue) - rows 0-4
  board[0][0] = { type: CHARIOT, side: HAN }
  board[0][1] = { type: ELEPHANT, side: HAN }
  board[0][2] = { type: HORSE, side: HAN }
  board[0][3] = { type: ADVISOR, side: HAN }
  board[0][5] = { type: ADVISOR, side: HAN }
  board[0][6] = { type: ELEPHANT, side: HAN }
  board[0][7] = { type: HORSE, side: HAN }
  board[0][8] = { type: CHARIOT, side: HAN }
  board[1][4] = { type: KING, side: HAN }
  board[2][1] = { type: CANNON, side: HAN }
  board[2][7] = { type: CANNON, side: HAN }
  board[3][0] = { type: SOLDIER, side: HAN }
  board[3][2] = { type: SOLDIER, side: HAN }
  board[3][4] = { type: SOLDIER, side: HAN }
  board[3][6] = { type: SOLDIER, side: HAN }
  board[3][8] = { type: SOLDIER, side: HAN }

  // CHO pieces (bottom, red) - rows 5-9
  board[9][0] = { type: CHARIOT, side: CHO }
  board[9][1] = { type: ELEPHANT, side: CHO }
  board[9][2] = { type: HORSE, side: CHO }
  board[9][3] = { type: ADVISOR, side: CHO }
  board[9][5] = { type: ADVISOR, side: CHO }
  board[9][6] = { type: ELEPHANT, side: CHO }
  board[9][7] = { type: HORSE, side: CHO }
  board[9][8] = { type: CHARIOT, side: CHO }
  board[8][4] = { type: KING, side: CHO }
  board[7][1] = { type: CANNON, side: CHO }
  board[7][7] = { type: CANNON, side: CHO }
  board[6][0] = { type: SOLDIER, side: CHO }
  board[6][2] = { type: SOLDIER, side: CHO }
  board[6][4] = { type: SOLDIER, side: CHO }
  board[6][6] = { type: SOLDIER, side: CHO }
  board[6][8] = { type: SOLDIER, side: CHO }

  return board
}

// ─── Serialization for online sync ───────────────────────────────────────────
function boardToFlat(board) {
  return board.map(row =>
    row.map(cell => cell ? `${cell.type}:${cell.side}` : '').join(',')
  ).join('|')
}

function flatToBoard(flat) {
  if (!flat) return createInitialBoard()
  return flat.split('|').map(row =>
    row.split(',').map(cell => {
      if (!cell) return null
      const [type, side] = cell.split(':')
      return { type, side }
    })
  )
}

// ─── Helper: in bounds ───────────────────────────────────────────────────────
function inBounds(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS
}

function inPalace(r, c, side) {
  const p = PALACES[side]
  return r >= p.rMin && r <= p.rMax && c >= p.cMin && c <= p.cMax
}

// Palace diagonal directions from center and corners
const PALACE_DIAG_MAP = (() => {
  // For each palace position, store which diagonal moves are valid
  // Palace coords relative: (0,0) to (2,2) mapped to actual board
  // Diagonals exist: corners to center, center to corners
  const dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
  return dirs
})()

function isPalaceDiagonal(r1, c1, r2, c2, side) {
  // A diagonal move within palace is valid only along palace diagonal lines
  // Palace diagonals connect corners through center
  const p = PALACES[side]
  const cr = p.rMin + 1, cc = p.cMin + 1 // center
  // Both positions must be in palace
  if (!inPalace(r1, c1, side) || !inPalace(r2, c2, side)) return false
  // Diagonal = 1 step diag
  if (Math.abs(r2 - r1) !== 1 || Math.abs(c2 - c1) !== 1) return false
  // Valid if one of them is center, or both are corners (with center in between for 2-step)
  // Actually: the diagonals go corner-center-corner. So a 1-step diagonal is valid
  // only if at least one of the two squares is the center.
  if ((r1 === cr && c1 === cc) || (r2 === cr && c2 === cc)) return true
  return false
}

// ─── Movement Logic ──────────────────────────────────────────────────────────

function getKingMoves(board, r, c, side) {
  const moves = []
  // Orthogonal moves within palace
  for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const nr = r + dr, nc = c + dc
    if (inPalace(nr, nc, side)) {
      const target = board[nr][nc]
      if (!target || target.side !== side) moves.push([nr, nc])
    }
  }
  // Diagonal moves along palace diagonals
  for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const nr = r + dr, nc = c + dc
    if (isPalaceDiagonal(r, c, nr, nc, side)) {
      const target = board[nr][nc]
      if (!target || target.side !== side) moves.push([nr, nc])
    }
  }
  return moves
}

function getAdvisorMoves(board, r, c, side) {
  // Same as king: 1 step within palace (orthogonal + palace diagonals)
  return getKingMoves(board, r, c, side)
}

function getChariotMoves(board, r, c, side) {
  const moves = []
  // Orthogonal sliding
  for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    for (let i = 1; i < 10; i++) {
      const nr = r + dr * i, nc = c + dc * i
      if (!inBounds(nr, nc)) break
      const target = board[nr][nc]
      if (!target) { moves.push([nr, nc]); continue }
      if (target.side !== side) moves.push([nr, nc])
      break
    }
  }
  // Diagonal sliding within palace (along diagonal lines)
  const palaceSide = inPalace(r, c, CHO) ? CHO : inPalace(r, c, HAN) ? HAN : null
  if (palaceSide) {
    const p = PALACES[palaceSide]
    const cr = p.rMin + 1, cc = p.cMin + 1
    for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      // Can only move diag if on a diagonal line (center or corner)
      if (r === cr && c === cc) {
        // From center, can go to any corner
        const nr = r + dr, nc = c + dc
        if (inPalace(nr, nc, palaceSide)) {
          const target = board[nr][nc]
          if (!target || target.side !== side) moves.push([nr, nc])
        }
      } else if (r !== cr && c !== cc) {
        // From corner, can go through center
        const mr = r + dr, mc = c + dc
        if (mr === cr && mc === cc) {
          // Check center
          const centerPiece = board[mr][mc]
          if (!centerPiece) {
            // Can continue to opposite corner
            const nr = mr + dr, nc = mc + dc
            if (inPalace(nr, nc, palaceSide)) {
              const target = board[nr][nc]
              if (!target || target.side !== side) moves.push([nr, nc])
            }
          }
          // Center itself
          if (!centerPiece || centerPiece.side !== side) moves.push([mr, mc])
        }
      }
    }
  }
  return moves
}

function getCannonMoves(board, r, c, side) {
  const moves = []
  // Cannon jumps over exactly one piece (not another cannon) to move/capture
  for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    let jumped = false
    for (let i = 1; i < 10; i++) {
      const nr = r + dr * i, nc = c + dc * i
      if (!inBounds(nr, nc)) break
      const target = board[nr][nc]
      if (!jumped) {
        if (target) {
          if (target.type === CANNON) break // cannot jump over cannon
          jumped = true
        }
      } else {
        if (target) {
          if (target.side !== side && target.type !== CANNON) moves.push([nr, nc])
          break
        }
        moves.push([nr, nc])
      }
    }
  }
  // Cannon diagonal in palace
  const palaceSide = inPalace(r, c, CHO) ? CHO : inPalace(r, c, HAN) ? HAN : null
  if (palaceSide) {
    const p = PALACES[palaceSide]
    const cr = p.rMin + 1, cc = p.cMin + 1
    for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      if (r === cr && c === cc) continue // cannon at center can't jump diag in 1 step
      if (r !== cr && c !== cc) {
        // Corner: check center as hurdle, then opposite corner
        const mr = r + dr, mc = c + dc
        if (mr === cr && mc === cc) {
          const hurdlePiece = board[mr][mc]
          if (hurdlePiece && hurdlePiece.type !== CANNON) {
            const nr = mr + dr, nc = mc + dc
            if (inPalace(nr, nc, palaceSide)) {
              const target = board[nr][nc]
              if (!target) moves.push([nr, nc])
              else if (target.side !== side && target.type !== CANNON) moves.push([nr, nc])
            }
          }
        }
      }
    }
  }
  return moves
}

function getHorseMoves(board, r, c, side) {
  const moves = []
  // Horse: 1 step orthogonal then 1 step diagonal outward. Blocked if orthogonal step is occupied.
  const steps = [
    { dr1: -1, dc1: 0, legs: [[-1, -1], [-1, 1]] },
    { dr1: 1, dc1: 0, legs: [[1, -1], [1, 1]] },
    { dr1: 0, dc1: -1, legs: [[-1, -1], [1, -1]] },
    { dr1: 0, dc1: 1, legs: [[-1, 1], [1, 1]] },
  ]
  for (const { dr1, dc1, legs } of steps) {
    const mr = r + dr1, mc = c + dc1
    if (!inBounds(mr, mc) || board[mr][mc]) continue // blocked
    for (const [dr2, dc2] of legs) {
      const nr = r + dr1 + dr2, nc = c + dc1 + dc2
      if (!inBounds(nr, nc)) continue
      const target = board[nr][nc]
      if (!target || target.side !== side) moves.push([nr, nc])
    }
  }
  return moves
}

function getElephantMoves(board, r, c, side) {
  const moves = []
  // Elephant: 1 step orthogonal, then 2 steps diagonal outward. Both intermediate squares must be clear.
  const steps = [
    { dr1: -1, dc1: 0, legs: [[-1, -1, -1, -1], [-1, 1, -1, 1]] },  // up, then up-left or up-right (but we need 2 diag steps)
    { dr1: 1, dc1: 0, legs: [[1, -1, 1, -1], [1, 1, 1, 1]] },
    { dr1: 0, dc1: -1, legs: [[-1, -1, -1, -1], [1, -1, 1, -1]] },
    { dr1: 0, dc1: 1, legs: [[-1, 1, -1, 1], [1, 1, 1, 1]] },
  ]
  // Actually let me redo this more clearly
  // Elephant moves: 1 ortho + 2 diagonal in same outward direction
  // Total displacement: if ortho is up(-1,0), diag can be (-1,-1) twice => final (-3,-2) or (-1,+1) twice => (-3,+2)
  const elephantPaths = [
    // ortho up
    { path: [[-1, 0], [-1, -1], [-1, -1]] }, // -> (-3, -2)
    { path: [[-1, 0], [-1, 1], [-1, 1]] },   // -> (-3, +2)
    // ortho down
    { path: [[1, 0], [1, -1], [1, -1]] },    // -> (3, -2)
    { path: [[1, 0], [1, 1], [1, 1]] },      // -> (3, +2)
    // ortho left
    { path: [[0, -1], [-1, -1], [-1, -1]] }, // -> (-2, -3)
    { path: [[0, -1], [1, -1], [1, -1]] },   // -> (2, -3)
    // ortho right
    { path: [[0, 1], [-1, 1], [-1, 1]] },    // -> (-2, +3)
    { path: [[0, 1], [1, 1], [1, 1]] },      // -> (2, +3)
  ]

  for (const { path } of elephantPaths) {
    let cr = r, cc = c
    let blocked = false
    for (let i = 0; i < path.length - 1; i++) {
      cr += path[i][0]
      cc += path[i][1]
      if (!inBounds(cr, cc) || board[cr][cc]) { blocked = true; break }
    }
    if (blocked) continue
    cr += path[path.length - 1][0]
    cc += path[path.length - 1][1]
    if (!inBounds(cr, cc)) continue
    const target = board[cr][cc]
    if (!target || target.side !== side) moves.push([cr, cc])
  }
  return moves
}

function getSoldierMoves(board, r, c, side) {
  const moves = []
  const forward = side === CHO ? -1 : 1
  // Forward and sideways
  for (const [dr, dc] of [[forward, 0], [0, -1], [0, 1]]) {
    const nr = r + dr, nc = c + dc
    if (!inBounds(nr, nc)) continue
    const target = board[nr][nc]
    if (!target || target.side !== side) moves.push([nr, nc])
  }
  // Diagonal moves within enemy palace
  const enemySide = side === CHO ? HAN : CHO
  if (inPalace(r, c, enemySide)) {
    for (const [dr, dc] of [[forward, -1], [forward, 1]]) {
      const nr = r + dr, nc = c + dc
      if (isPalaceDiagonal(r, c, nr, nc, enemySide)) {
        const target = board[nr][nc]
        if (!target || target.side !== side) moves.push([nr, nc])
      }
    }
  }
  return moves
}

function getLegalMoves(board, r, c) {
  const piece = board[r][c]
  if (!piece) return []
  switch (piece.type) {
    case KING: return getKingMoves(board, r, c, piece.side)
    case ADVISOR: return getAdvisorMoves(board, r, c, piece.side)
    case CHARIOT: return getChariotMoves(board, r, c, piece.side)
    case CANNON: return getCannonMoves(board, r, c, piece.side)
    case HORSE: return getHorseMoves(board, r, c, piece.side)
    case ELEPHANT: return getElephantMoves(board, r, c, piece.side)
    case SOLDIER: return getSoldierMoves(board, r, c, piece.side)
    default: return []
  }
}

// ─── Game state checks ───────────────────────────────────────────────────────

function findKing(board, side) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] && board[r][c].type === KING && board[r][c].side === side)
        return [r, c]
  return null
}

function isInCheck(board, side) {
  const kingPos = findKing(board, side)
  if (!kingPos) return true
  const opp = side === CHO ? HAN : CHO
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] && board[r][c].side === opp) {
        const moves = getLegalMoves(board, r, c)
        if (moves.some(([mr, mc]) => mr === kingPos[0] && mc === kingPos[1])) return true
      }
  return false
}

function applyMove(board, fromR, fromC, toR, toC) {
  const newBoard = board.map(row => row.map(cell => cell ? { ...cell } : null))
  newBoard[toR][toC] = newBoard[fromR][fromC]
  newBoard[fromR][fromC] = null
  return newBoard
}

function getValidMoves(board, r, c) {
  const piece = board[r][c]
  if (!piece) return []
  const raw = getLegalMoves(board, r, c)
  // Filter moves that would leave own king in check
  return raw.filter(([tr, tc]) => {
    const newBoard = applyMove(board, r, c, tr, tc)
    return !isInCheck(newBoard, piece.side)
  })
}

function hasAnyMoves(board, side) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] && board[r][c].side === side)
        if (getValidMoves(board, r, c).length > 0) return true
  return false
}

function checkBikjang(board) {
  // Bikjang: kings face each other on same column with no pieces in between
  const choKing = findKing(board, CHO)
  const hanKing = findKing(board, HAN)
  if (!choKing || !hanKing) return false
  if (choKing[1] !== hanKing[1]) return false
  const col = choKing[1]
  const minR = Math.min(choKing[0], hanKing[0])
  const maxR = Math.max(choKing[0], hanKing[0])
  for (let r = minR + 1; r < maxR; r++)
    if (board[r][col]) return false
  return true
}

// ─── AI (Minimax with alpha-beta) ────────────────────────────────────────────

function evaluateBoard(board, aiSide) {
  let score = 0
  const opp = aiSide === CHO ? HAN : CHO
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c]
      if (!piece) continue
      const val = PIECE_VALUES[piece.type]
      // Positional bonus: soldiers advanced, pieces toward center
      let posBonus = 0
      if (piece.type === SOLDIER) {
        // Bonus for advancement
        posBonus = piece.side === CHO ? (9 - r) * 0.1 : r * 0.1
      }
      // Slight center preference
      posBonus += (4.5 - Math.abs(c - 4)) * 0.05

      if (piece.side === aiSide) score += val + posBonus
      else score -= val + posBonus
    }
  return score
}

function getAllMoves(board, side) {
  const moves = []
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] && board[r][c].side === side) {
        const valid = getValidMoves(board, r, c)
        for (const [tr, tc] of valid) moves.push([r, c, tr, tc])
      }
  return moves
}

function minimax(board, depth, alpha, beta, maximizing, aiSide) {
  const opp = aiSide === CHO ? HAN : CHO
  const currentSide = maximizing ? aiSide : opp

  if (depth === 0) return evaluateBoard(board, aiSide)

  const moves = getAllMoves(board, currentSide)
  if (moves.length === 0) {
    // No moves = loss for currentSide
    return maximizing ? -1000 : 1000
  }

  if (maximizing) {
    let maxEval = -Infinity
    for (const [fr, fc, tr, tc] of moves) {
      const newBoard = applyMove(board, fr, fc, tr, tc)
      const ev = minimax(newBoard, depth - 1, alpha, beta, false, aiSide)
      maxEval = Math.max(maxEval, ev)
      alpha = Math.max(alpha, ev)
      if (beta <= alpha) break
    }
    return maxEval
  } else {
    let minEval = Infinity
    for (const [fr, fc, tr, tc] of moves) {
      const newBoard = applyMove(board, fr, fc, tr, tc)
      const ev = minimax(newBoard, depth - 1, alpha, beta, true, aiSide)
      minEval = Math.min(minEval, ev)
      beta = Math.min(beta, ev)
      if (beta <= alpha) break
    }
    return minEval
  }
}

function getBestAIMove(board, aiSide, level) {
  const moves = getAllMoves(board, aiSide)
  if (moves.length === 0) return null

  // Level 1-2: mostly random
  if (level <= 2) {
    // Capture if obvious, otherwise random
    const captures = moves.filter(([fr, fc, tr, tc]) => board[tr][tc] !== null)
    if (level === 2 && captures.length > 0 && Math.random() < 0.5) {
      return captures[Math.floor(Math.random() * captures.length)]
    }
    return moves[Math.floor(Math.random() * moves.length)]
  }

  // Level 3-4: depth 1
  if (level <= 4) {
    const depth = 1
    let bestMove = moves[0]
    let bestVal = -Infinity
    // Shuffle for variety
    const shuffled = [...moves].sort(() => Math.random() - 0.5)
    for (const [fr, fc, tr, tc] of shuffled) {
      const newBoard = applyMove(board, fr, fc, tr, tc)
      let val = minimax(newBoard, depth - 1, -Infinity, Infinity, false, aiSide)
      // Add randomness
      val += (Math.random() - 0.5) * (level === 3 ? 3 : 1.5)
      if (val > bestVal) { bestVal = val; bestMove = [fr, fc, tr, tc] }
    }
    return bestMove
  }

  // Level 5-6: depth 2
  if (level <= 6) {
    const depth = 2
    let bestMove = moves[0]
    let bestVal = -Infinity
    const shuffled = [...moves].sort(() => Math.random() - 0.5)
    for (const [fr, fc, tr, tc] of shuffled) {
      const newBoard = applyMove(board, fr, fc, tr, tc)
      let val = minimax(newBoard, depth - 1, -Infinity, Infinity, false, aiSide)
      val += (Math.random() - 0.5) * (level === 5 ? 1 : 0.5)
      if (val > bestVal) { bestVal = val; bestMove = [fr, fc, tr, tc] }
    }
    return bestMove
  }

  // Level 7-8: depth 2 with move ordering
  if (level <= 8) {
    const depth = 2
    // Sort: captures first
    const sorted = [...moves].sort((a, b) => {
      const capA = board[a[2]][a[3]] ? PIECE_VALUES[board[a[2]][a[3]].type] : 0
      const capB = board[b[2]][b[3]] ? PIECE_VALUES[board[b[2]][b[3]].type] : 0
      return capB - capA
    })
    let bestMove = sorted[0]
    let bestVal = -Infinity
    for (const [fr, fc, tr, tc] of sorted) {
      const newBoard = applyMove(board, fr, fc, tr, tc)
      const val = minimax(newBoard, depth - 1, -Infinity, Infinity, false, aiSide)
      if (val > bestVal) { bestVal = val; bestMove = [fr, fc, tr, tc] }
    }
    return bestMove
  }

  // Level 9-10: depth 3 with move ordering
  {
    const depth = level === 9 ? 2 : 3
    const sorted = [...moves].sort((a, b) => {
      const capA = board[a[2]][a[3]] ? PIECE_VALUES[board[a[2]][a[3]].type] : 0
      const capB = board[b[2]][b[3]] ? PIECE_VALUES[board[b[2]][b[3]].type] : 0
      return capB - capA
    })
    let bestMove = sorted[0]
    let bestVal = -Infinity
    for (const [fr, fc, tr, tc] of sorted) {
      const newBoard = applyMove(board, fr, fc, tr, tc)
      const val = minimax(newBoard, depth - 1, -Infinity, Infinity, false, aiSide)
      if (val > bestVal) { bestVal = val; bestMove = [fr, fc, tr, tc] }
    }
    return bestMove
  }
}

// Level labels/colors
const JANGGI_LEVELS = [
  { range: '1-2', label: '입문', levels: [1, 2], color: '#2ECC71' },
  { range: '3-4', label: '초급', levels: [3, 4], color: '#F1C40F' },
  { range: '5-6', label: '중급', levels: [5, 6], color: '#E67E22' },
  { range: '7-8', label: '상급', levels: [7, 8], color: '#E74C3C' },
  { range: '9-10', label: '고수', levels: [9, 10], color: '#8E44AD' },
]

function getLevelColor(lv) {
  const colors = ['#2ECC71','#27AE60','#F1C40F','#F39C12','#E67E22','#D35400','#E74C3C','#C0392B','#8E44AD','#6C3483']
  return colors[lv - 1] || '#333'
}

function getLevelLabel(lv) {
  if (lv <= 2) return '입문'
  if (lv <= 4) return '초급'
  if (lv <= 6) return '중급'
  if (lv <= 8) return '상급'
  return '고수'
}

// Win record storage
const JANGGI_WINS_KEY = 'janggi-wins'
function getWins() {
  try { return JSON.parse(localStorage.getItem(JANGGI_WINS_KEY)) || {} } catch { return {} }
}
function saveWin(level) {
  const wins = getWins()
  wins[level] = true
  localStorage.setItem(JANGGI_WINS_KEY, JSON.stringify(wins))
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Janggi({ onBack }) {
  const [mode, setMode] = useState(null) // null | 'ai' | 'ai-level' | 'local' | 'online'
  const [aiLevel, setAiLevel] = useState(1)
  const [board, setBoard] = useState(createInitialBoard())
  const [turn, setTurn] = useState(CHO) // cho goes first
  const [selected, setSelected] = useState(null) // [r, c]
  const [validMoves, setValidMoves] = useState([])
  const [winner, setWinner] = useState(null)
  const [lastMove, setLastMove] = useState(null) // { from: [r,c], to: [r,c] }
  const [moveHistory, setMoveHistory] = useState([]) // for undo
  const [joinCode, setJoinCode] = useState('')
  const [inCheck, setInCheck] = useState(null) // side that is in check
  const aiThinking = useRef(false)

  const room = useGameRoom('janggi')

  // Online: sync game state
  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = room.gameState
    setBoard(flatToBoard(s.board))
    setTurn(s.turn || CHO)
    setWinner(s.winner || null)
    setLastMove(s.lastMove ? { from: s.lastMove.from, to: s.lastMove.to } : null)
    setInCheck(s.inCheck || null)
  }, [room.gameState, mode])

  // AI move
  useEffect(() => {
    if (mode !== 'ai' || turn !== HAN || winner || aiThinking.current) return
    aiThinking.current = true
    const delay = aiLevel <= 4 ? 300 : 500
    const timer = setTimeout(() => {
      const move = getBestAIMove(board, HAN, aiLevel)
      if (move) {
        const [fr, fc, tr, tc] = move
        const newBoard = applyMove(board, fr, fc, tr, tc)
        const check = isInCheck(newBoard, CHO) ? CHO : isInCheck(newBoard, HAN) ? HAN : null
        const newTurn = CHO
        let newWinner = null
        if (!hasAnyMoves(newBoard, CHO)) newWinner = HAN
        if (!findKing(newBoard, CHO)) newWinner = HAN
        if (checkBikjang(newBoard)) newWinner = 'draw'

        setMoveHistory(prev => [...prev, { board: board.map(row => row.map(cell => cell ? { ...cell } : null)), turn, lastMove, inCheck }])
        setBoard(newBoard)
        setTurn(newTurn)
        setLastMove({ from: [fr, fc], to: [tr, tc] })
        setInCheck(check)
        setWinner(newWinner)
        setSelected(null)
        setValidMoves([])
      }
      aiThinking.current = false
    }, delay)
    return () => { clearTimeout(timer); aiThinking.current = false }
  }, [mode, turn, winner, board, aiLevel])

  // Save win record when player wins in AI mode
  useEffect(() => {
    if (mode === 'ai' && winner === CHO && aiLevel) {
      saveWin(aiLevel)
    }
  }, [mode, winner, aiLevel])

  const handleClick = useCallback((r, c) => {
    if (winner) return
    if (mode === 'online') {
      if (!room.connected) return
      const mySide = room.role === 'host' ? CHO : HAN
      if (turn !== mySide) return
    }
    if (mode === 'ai' && turn === HAN) return // AI's turn

    const currentSide = turn
    const piece = board[r][c]

    if (selected) {
      // Try to move
      const isValid = validMoves.some(([mr, mc]) => mr === r && mc === c)
      if (isValid) {
        const newBoard = applyMove(board, selected[0], selected[1], r, c)
        const nextTurn = turn === CHO ? HAN : CHO
        const check = isInCheck(newBoard, CHO) ? CHO : isInCheck(newBoard, HAN) ? HAN : null
        let newWinner = null
        if (!hasAnyMoves(newBoard, nextTurn)) newWinner = turn
        if (!findKing(newBoard, nextTurn)) newWinner = turn
        if (checkBikjang(newBoard)) newWinner = 'draw'

        const moveData = { from: [selected[0], selected[1]], to: [r, c] }

        if (mode === 'online') {
          room.updateState({
            board: boardToFlat(newBoard),
            turn: nextTurn,
            winner: newWinner || '',
            lastMove: moveData,
            inCheck: check || '',
          })
        } else {
          setMoveHistory(prev => [...prev, { board: board.map(row => row.map(cell => cell ? { ...cell } : null)), turn, lastMove, inCheck }])
          setBoard(newBoard)
          setTurn(nextTurn)
          setLastMove(moveData)
          setInCheck(check)
          setWinner(newWinner)
        }
        setSelected(null)
        setValidMoves([])
        return
      }
      // Clicked on own piece -> reselect
      if (piece && piece.side === currentSide) {
        setSelected([r, c])
        setValidMoves(getValidMoves(board, r, c))
        return
      }
      // Clicked elsewhere -> deselect
      setSelected(null)
      setValidMoves([])
      return
    }

    // Select piece
    if (piece && piece.side === currentSide) {
      setSelected([r, c])
      setValidMoves(getValidMoves(board, r, c))
    }
  }, [board, turn, selected, validMoves, winner, mode, room])

  const undo = () => {
    if (mode === 'online') return
    if (moveHistory.length === 0 || winner) return
    if (aiThinking.current) return

    // AI 모드: 내 수 + AI 수 2개 되돌리기
    const stepsBack = (mode === 'ai' && moveHistory.length >= 2) ? 2 : 1
    const prev = moveHistory[moveHistory.length - stepsBack]
    setBoard(prev.board)
    setTurn(prev.turn)
    setLastMove(prev.lastMove)
    setInCheck(prev.inCheck)
    setWinner(null)
    setSelected(null)
    setValidMoves([])
    setMoveHistory(moveHistory.slice(0, -stepsBack))
  }

  const reset = () => {
    const initial = createInitialBoard()
    setMoveHistory([])
    if (mode === 'online') {
      room.updateState({
        board: boardToFlat(initial),
        turn: CHO,
        winner: '',
        lastMove: null,
        inCheck: '',
      })
    } else {
      setBoard(initial)
      setTurn(CHO)
      setWinner(null)
      setLastMove(null)
      setInCheck(null)
      setSelected(null)
      setValidMoves([])
      aiThinking.current = false
    }
  }

  const handleBack = () => {
    if (mode === 'online') room.leaveRoom()
    if (mode) { setMode(null); setSelected(null); setValidMoves([]); return }
    onBack()
  }

  const createOnline = async () => {
    await room.createRoom({
      board: boardToFlat(createInitialBoard()),
      turn: CHO,
      winner: '',
      lastMove: null,
      inCheck: '',
    })
    setMode('online')
  }

  const joinOnline = async () => {
    if (joinCode.length !== 2) { room.setError('2자리 코드를 입력하세요'); return }
    const ok = await room.joinRoom(joinCode.toUpperCase())
    if (ok) setMode('online')
  }

  // ─── Mode select screen ─────────────────────────────────────────────────────
  if (!mode || mode === 'ai-level') {
    const wins = getWins()
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={() => { if (mode === 'ai-level') { setMode(null); return } onBack() }}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 56, marginBottom: 12 }}>♟</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>장기</h2>

        {mode === 'ai-level' ? (
          <div style={{ maxWidth: 280, margin: '0 auto' }}>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>난이도를 선택하세요</p>
            {Object.keys(wins).length > 0 && (
              <button onClick={() => { localStorage.removeItem(JANGGI_WINS_KEY); setMode('ai-level') }}
                style={{ fontSize: 11, color: '#AAA', background: 'none', border: '1px solid #DDD', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', marginBottom: 12 }}>
                🔄 기록 초기화
              </button>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(lv => (
                <button key={lv}
                  onClick={() => {
                    setAiLevel(lv)
                    setMode('ai')
                    setBoard(createInitialBoard())
                    setTurn(CHO)
                    setWinner(null)
                    setLastMove(null)
                    setInCheck(null)
                  }}
                  style={{
                    padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                    fontSize: 14, fontWeight: 700, color: '#FFF',
                    background: getLevelColor(lv),
                    position: 'relative',
                  }}>
                  Lv.{lv} {getLevelLabel(lv)}
                  {wins[lv] && <span style={{ position: 'absolute', top: 4, right: 8, fontSize: 12 }}>🏆</span>}
                </button>
              ))}
            </div>
          </div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => setMode('ai-level')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #E74C3C, #C0392B)' }}>
            🤖 vs 컴퓨터
          </button>
          <button onClick={() => { setMode('local'); setBoard(createInitialBoard()); setTurn(CHO); setWinner(null); setLastMove(null); setInCheck(null) }}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #333, #555)' }}>
            📱 같은 기기 (2인)
          </button>
          <button onClick={createOnline}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #4895EF, #3A7BD5)' }}>
            🌐 온라인 방 만들기
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
        )}
      </div>
    )
  }

  // ─── Online waiting screen ───────────────────────────────────────────────────
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
          나는 초 (빨강, 선공)
        </p>
      </div>
    )
  }

  // ─── Game Board ──────────────────────────────────────────────────────────────
  const mySide = mode === 'online' ? (room.role === 'host' ? CHO : HAN) : null
  const isMyTurn = mode === 'local' || mode === 'ai'
    ? true
    : turn === mySide

  const cellSize = Math.min(Math.floor((window.innerWidth - 48) / (COLS - 1)), 44)
  const boardW = cellSize * (COLS - 1)
  const boardH = cellSize * (ROWS - 1)
  const pad = cellSize * 0.8
  const baseR = cellSize * 0.4

  // 말별 크기 비율
  const PIECE_SIZE = {
    [KING]: 1.0,
    [CHARIOT]: 0.9,
    [CANNON]: 0.85,
    [HORSE]: 0.8,
    [ELEPHANT]: 0.8,
    [ADVISOR]: 0.75,
    [SOLDIER]: 0.65,
  }

  // 팔각형 경로 생성
  function octagonPath(cx, cy, w, h) {
    const cut = Math.min(w, h) * 0.25
    return `M${cx - w + cut},${cy - h} L${cx + w - cut},${cy - h} L${cx + w},${cy - h + cut} L${cx + w},${cy + h - cut} L${cx + w - cut},${cy + h} L${cx - w + cut},${cy + h} L${cx - w},${cy + h - cut} L${cx - w},${cy - h + cut} Z`
  }
  const svgW = boardW + pad * 2
  const svgH = boardH + pad * 2

  const turnLabel = turn === CHO ? '초 (빨강)' : '한 (파랑)'
  const modeLabel = mode === 'ai' ? 'vs AI' : mode === 'online' ? '온라인' : ''

  const statusText = winner
    ? winner === 'draw'
      ? '무승부 (빅장)!'
      : mode === 'ai'
        ? (winner === CHO ? `🏆 Lv.${aiLevel} 승리!` : `Lv.${aiLevel} AI 승리...`)
        : `${winner === CHO ? '초 (빨강)' : '한 (파랑)'} 승리!`
    : mode === 'online'
      ? isMyTurn
        ? `내 차례 (${mySide === CHO ? '초' : '한'})`
        : '상대 차례'
      : mode === 'ai' && turn === HAN
        ? 'AI 생각 중...'
        : `${turnLabel}의 차례`

  return (
    <div className="fade-in" style={{ maxWidth: 520, margin: '0 auto', paddingBottom: '1rem' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #8B4513, #A0522D)',
        color: '#FFF', padding: '0.75rem 1rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={handleBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← {mode === 'online' ? '나가기' : '돌아가기'}
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>
            장기 {modeLabel && `(${modeLabel})`}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {mode !== 'online' && (
              <button onClick={undo}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 12, borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}>
                ↩ 무르기
              </button>
            )}
            <button onClick={reset}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 12, borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}>
              새 게임
            </button>
          </div>
        </div>
      </div>

      {/* Status */}
      <div style={{
        textAlign: 'center', padding: '8px 0',
        fontSize: 14, fontWeight: 600,
        color: winner ? (winner === 'draw' ? '#F39C12' : '#E74C3C') : '#333',
        background: winner ? '#FFF9E6' : (inCheck ? '#FFE8E8' : '#F7F6F3'),
      }}>
        {statusText}
        {inCheck && !winner && ` (${inCheck === CHO ? '초' : '한'} 장군!)`}
      </div>

      {mode === 'online' && (
        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0' }}>
          방 코드: <strong>{room.roomCode}</strong> · 나는 {mySide === CHO ? '초 (빨강)' : '한 (파랑)'}
        </div>
      )}

      {/* SVG Board */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', overflow: 'auto' }}>
        <svg width={svgW} height={svgH} style={{ borderRadius: 8 }}>
          {/* Board background */}
          <rect x={0} y={0} width={svgW} height={svgH} fill="#DCB35C" rx={8} />

          {/* Grid lines - horizontal */}
          {Array.from({ length: ROWS }).map((_, i) => (
            <line key={`h-${i}`}
              x1={pad} y1={pad + i * cellSize}
              x2={pad + boardW} y2={pad + i * cellSize}
              stroke="#8B6914" strokeWidth={1} />
          ))}

          {/* Grid lines - vertical */}
          {Array.from({ length: COLS }).map((_, i) => (
            <line key={`v-${i}`}
              x1={pad + i * cellSize} y1={pad}
              x2={pad + i * cellSize} y2={pad + boardH}
              stroke="#8B6914" strokeWidth={1} />
          ))}

          {/* River (gap between row 4 and 5 visual indicator) */}
          <rect x={pad + 1} y={pad + 4 * cellSize + 1} width={boardW - 2} height={cellSize - 2} fill="#DCB35C" />
          {/* Redraw top/bottom river lines */}
          <line x1={pad} y1={pad + 4 * cellSize} x2={pad + boardW} y2={pad + 4 * cellSize} stroke="#8B6914" strokeWidth={1} />
          <line x1={pad} y1={pad + 5 * cellSize} x2={pad + boardW} y2={pad + 5 * cellSize} stroke="#8B6914" strokeWidth={1} />
          {/* River left/right borders */}
          <line x1={pad} y1={pad + 4 * cellSize} x2={pad} y2={pad + 5 * cellSize} stroke="#8B6914" strokeWidth={1} />
          <line x1={pad + boardW} y1={pad + 4 * cellSize} x2={pad + boardW} y2={pad + 5 * cellSize} stroke="#8B6914" strokeWidth={1} />
          {/* River text */}
          <text x={pad + boardW / 2} y={pad + 4.55 * cellSize} textAnchor="middle" dominantBaseline="middle"
            fontSize={cellSize * 0.35} fill="#8B6914" fontWeight="bold" opacity={0.5}>
            楚 河 漢 界
          </text>

          {/* Palace diagonals - HAN (top) */}
          <line x1={pad + 3 * cellSize} y1={pad + 0 * cellSize} x2={pad + 5 * cellSize} y2={pad + 2 * cellSize} stroke="#8B6914" strokeWidth={0.8} />
          <line x1={pad + 5 * cellSize} y1={pad + 0 * cellSize} x2={pad + 3 * cellSize} y2={pad + 2 * cellSize} stroke="#8B6914" strokeWidth={0.8} />

          {/* Palace diagonals - CHO (bottom) */}
          <line x1={pad + 3 * cellSize} y1={pad + 7 * cellSize} x2={pad + 5 * cellSize} y2={pad + 9 * cellSize} stroke="#8B6914" strokeWidth={0.8} />
          <line x1={pad + 5 * cellSize} y1={pad + 7 * cellSize} x2={pad + 3 * cellSize} y2={pad + 9 * cellSize} stroke="#8B6914" strokeWidth={0.8} />

          {/* Last move indicators */}
          {lastMove && (
            <>
              <circle cx={pad + lastMove.from[1] * cellSize} cy={pad + lastMove.from[0] * cellSize}
                r={baseR * 0.3} fill="none" stroke="#F39C12" strokeWidth={2} opacity={0.6} />
              <circle cx={pad + lastMove.to[1] * cellSize} cy={pad + lastMove.to[0] * cellSize}
                r={baseR + 3} fill="none" stroke="#F39C12" strokeWidth={2.5} opacity={0.7} />
            </>
          )}

          {/* Valid move indicators */}
          {validMoves.map(([mr, mc]) => {
            const hasPiece = board[mr][mc]
            return hasPiece ? (
              <circle key={`vm-${mr}-${mc}`}
                cx={pad + mc * cellSize} cy={pad + mr * cellSize}
                r={baseR + 2} fill="none" stroke="#E74C3C" strokeWidth={2.5} strokeDasharray="4,3" opacity={0.8} />
            ) : (
              <circle key={`vm-${mr}-${mc}`}
                cx={pad + mc * cellSize} cy={pad + mr * cellSize}
                r={cellSize * 0.12} fill="#4CAF50" opacity={0.6} />
            )
          })}

          {/* Selected highlight */}
          {selected && (() => {
            const sp = board[selected[0]][selected[1]]
            const sc = PIECE_SIZE[sp?.type] || 0.8
            const sw = baseR * sc + 4
            const sh = baseR * sc * 1.1 + 4
            return <path d={octagonPath(pad + selected[1] * cellSize, pad + selected[0] * cellSize, sw, sh)}
              fill="none" stroke="#FFD700" strokeWidth={3} />
          })()}

          {/* Pieces */}
          {board.map((row, r) => row.map((piece, c) => {
            if (!piece) return null
            const cx = pad + c * cellSize
            const cy = pad + r * cellSize
            const isCho = piece.side === CHO
            const scale = PIECE_SIZE[piece.type] || 0.8
            const pw = baseR * scale  // half width
            const ph = baseR * scale * 1.1 // half height (slightly taller)
            const strokeColor = isCho ? '#C0392B' : '#1A6B4A'
            const textColor = isCho ? '#C0392B' : '#1A6B4A'
            const name = PIECE_NAMES[piece.type][piece.side]
            const fontSize = baseR * scale * 1.05

            return (
              <g key={`p-${r}-${c}`} style={{ cursor: 'pointer' }}>
                {/* Shadow */}
                <path d={octagonPath(cx + 1, cy + 2, pw, ph)} fill="rgba(0,0,0,0.12)" />
                {/* Body - wood color */}
                <path d={octagonPath(cx, cy, pw, ph)}
                  fill="#DEB887" stroke={strokeColor} strokeWidth={2} />
                {/* Inner border */}
                <path d={octagonPath(cx, cy, pw * 0.82, ph * 0.82)}
                  fill="none" stroke={strokeColor} strokeWidth={0.8} opacity={0.6} />
                {/* Text */}
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                  fontSize={fontSize} fontWeight="bold" fill={textColor}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}>
                  {name}
                </text>
              </g>
            )
          }))}

          {/* Click targets (invisible overlay) */}
          {board.map((row, r) => row.map((_, c) => (
            <rect key={`click-${r}-${c}`}
              x={pad + c * cellSize - cellSize / 2} y={pad + r * cellSize - cellSize / 2}
              width={cellSize} height={cellSize} fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={() => handleClick(r, c)} />
          )))}
        </svg>
      </div>
    </div>
  )
}
