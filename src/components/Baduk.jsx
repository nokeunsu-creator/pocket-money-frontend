import { useState, useCallback, useEffect, useRef } from 'react'
import { useGameRoom } from '../utils/useGameRoom'
import { useViewportWidth } from '../utils/useViewportWidth'
import { unlock } from '../utils/achievements'
import {
  getRank,
  rankToStrategy,
  getHandicapStones,
  getKomi,
  getRankColor,
  getRankDescription,
  getAiDelay,
  getKyuRanks,
  getDanRanks,
} from '../utils/badukRank'

function createBoard(size) {
  return Array.from({ length: size }, () => Array(size).fill(null))
}

function applyHandicap(board, stones) {
  const newBoard = board.map(row => [...row])
  stones.forEach(([r, c]) => { newBoard[r][c] = 'black' })
  return newBoard
}

function boardToFlat(board) {
  return board.map(row => row.map(c => c || '').join(',')).join('|')
}

function flatToBoard(flat, size) {
  if (!flat) return createBoard(size)
  return flat.split('|').map(row => row.split(',').map(c => c || null))
}

function getGroup(board, r, c, size) {
  const color = board[r][c]
  if (!color) return { stones: [], liberties: 0 }
  const visited = new Set()
  const stones = []
  const liberties = new Set()

  const dfs = (rr, cc) => {
    const key = `${rr},${cc}`
    if (visited.has(key)) return
    if (rr < 0 || rr >= size || cc < 0 || cc >= size) return
    if (board[rr][cc] === null) { liberties.add(key); return }
    if (board[rr][cc] !== color) return
    visited.add(key)
    stones.push([rr, cc])
    dfs(rr - 1, cc); dfs(rr + 1, cc); dfs(rr, cc - 1); dfs(rr, cc + 1)
  }
  dfs(r, c)
  return { stones, liberties: liberties.size }
}

function removeDeadStones(board, color, size) {
  const newBoard = board.map(row => [...row])
  let captured = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (newBoard[r][c] === color) {
        const group = getGroup(newBoard, r, c, size)
        if (group.liberties === 0) {
          group.stones.forEach(([sr, sc]) => { newBoard[sr][sc] = null })
          captured += group.stones.length
        }
      }
    }
  }
  return { board: newBoard, captured }
}

function boardToString(board) {
  return board.map(row => row.map(c => c || '.').join('')).join('|')
}

function countTerritory(board, size, komi = 6.5) {
  const visited = Array.from({ length: size }, () => Array(size).fill(false))
  let blackTerritory = 0, whiteTerritory = 0, blackStones = 0, whiteStones = 0

  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 'black') blackStones++
      else if (board[r][c] === 'white') whiteStones++
    }

  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (board[r][c] !== null || visited[r][c]) continue
      const territory = []
      let touchBlack = false, touchWhite = false

      const dfs = (rr, cc) => {
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) return
        if (visited[rr][cc]) return
        if (board[rr][cc] === 'black') { touchBlack = true; return }
        if (board[rr][cc] === 'white') { touchWhite = true; return }
        visited[rr][cc] = true
        territory.push([rr, cc])
        dfs(rr - 1, cc); dfs(rr + 1, cc); dfs(rr, cc - 1); dfs(rr, cc + 1)
      }
      dfs(r, c)
      if (touchBlack && !touchWhite) blackTerritory += territory.length
      else if (touchWhite && !touchBlack) whiteTerritory += territory.length
    }

  return {
    black: blackStones + blackTerritory,
    white: whiteStones + whiteTerritory + komi,
    komi,
    blackStones, whiteStones, blackTerritory, whiteTerritory,
  }
}

const STAR_POINTS = {
  9: [[2, 2], [2, 6], [4, 4], [6, 2], [6, 6]],
  13: [[3, 3], [3, 6], [3, 9], [6, 3], [6, 6], [6, 9], [9, 3], [9, 6], [9, 9]],
  19: [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]],
}

// ============================================================
// AI Engine
// ============================================================

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]]

function isLegalMove(board, r, c, color, size, prevBoardStr) {
  if (r < 0 || r >= size || c < 0 || c >= size) return false
  if (board[r][c] !== null) return false
  const testBoard = board.map(row => [...row])
  testBoard[r][c] = color
  const opp = color === 'black' ? 'white' : 'black'
  const afterCapture = removeDeadStones(testBoard, opp, size)
  const newBoard = afterCapture.board
  const selfGroup = getGroup(newBoard, r, c, size)
  if (selfGroup.liberties === 0) return false
  if (prevBoardStr && boardToString(newBoard) === prevBoardStr) return false
  return true
}

function simulateMove(board, r, c, color, size) {
  const testBoard = board.map(row => [...row])
  testBoard[r][c] = color
  const opp = color === 'black' ? 'white' : 'black'
  const afterCapture = removeDeadStones(testBoard, opp, size)
  return { board: afterCapture.board, captured: afterCapture.captured }
}

function getCandidateMoves(board, size, radius) {
  const hasStones = []
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (board[r][c] !== null) hasStones.push([r, c])

  if (hasStones.length === 0) {
    const center = Math.floor(size / 2)
    const moves = [[center, center]]
    ;(STAR_POINTS[size] || []).forEach(p => moves.push(p))
    return moves
  }

  const candidates = new Set()
  for (const [sr, sc] of hasStones) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const nr = sr + dr, nc = sc + dc
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null) {
          candidates.add(`${nr},${nc}`)
        }
      }
    }
  }
  return Array.from(candidates).map(s => s.split(',').map(Number))
}

function findCaptures(board, color, size, candidates, prevBoardStr) {
  const captureMoves = []
  for (const [r, c] of candidates) {
    if (!isLegalMove(board, r, c, color, size, prevBoardStr)) continue
    const result = simulateMove(board, r, c, color, size)
    if (result.captured > 0) captureMoves.push({ r, c, captured: result.captured })
  }
  captureMoves.sort((a, b) => b.captured - a.captured)
  return captureMoves
}

function findSaveMoves(board, color, size, candidates, prevBoardStr) {
  const saves = []
  const checked = new Set()
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] !== color) continue
      const key = `${r},${c}`
      if (checked.has(key)) continue
      const group = getGroup(board, r, c, size)
      group.stones.forEach(([sr, sc]) => checked.add(`${sr},${sc}`))
      if (group.liberties === 1) {
        for (const [sr, sc] of group.stones) {
          for (const [dr, dc] of DIRS) {
            const nr = sr + dr, nc = sc + dc
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null) {
              if (isLegalMove(board, nr, nc, color, size, prevBoardStr)) {
                saves.push([nr, nc])
              }
            }
          }
        }
      }
    }
  }
  return saves
}

function evaluateTerritory(board, size, color) {
  const opp = color === 'black' ? 'white' : 'black'
  let myInfluence = 0, oppInfluence = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] !== null) continue
      let myAdj = 0, oppAdj = 0
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (board[nr][nc] === color) myAdj++
          else if (board[nr][nc] === opp) oppAdj++
        }
      }
      if (myAdj > 0 && oppAdj === 0) myInfluence++
      else if (oppAdj > 0 && myAdj === 0) oppInfluence++
    }
  }
  return myInfluence - oppInfluence
}

function scoreMoveByTerritory(board, r, c, color, size) {
  const result = simulateMove(board, r, c, color, size)
  return evaluateTerritory(result.board, size, color)
}

function isInOpponentTerritory(board, r, c, color, size) {
  const opp = color === 'black' ? 'white' : 'black'
  let oppAdj = 0, myAdj = 0
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      if (board[nr][nc] === opp) oppAdj++
      else if (board[nr][nc] === color) myAdj++
    }
  }
  return oppAdj >= 3 && myAdj === 0
}

function isNearExistingGroup(board, r, c, color, size) {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === color) {
        return true
      }
    }
  }
  return false
}

function advancedEval(board, r, c, color, size, prevBoardStr) {
  const result = simulateMove(board, r, c, color, size)
  let score = 0
  score += evaluateTerritory(result.board, size, color) * 2
  score += result.captured * 10
  const group = getGroup(result.board, r, c, size)
  score += Math.min(group.liberties, 6) * 2
  score += Math.min(group.stones.length, 8)
  if (isNearExistingGroup(board, r, c, color, size)) score += 3
  if (isInOpponentTerritory(board, r, c, color, size)) score -= 8
  if (r === 0 || r === size - 1 || c === 0 || c === size - 1) score -= 2
  if (group.liberties === 1 && result.captured === 0) score -= 15
  return score
}

// Opening: 빈 화점을 우선 (수가 5수 이하일 때만 적용)
function getOpeningMove(board, size, color, prevBoardStr) {
  let stoneCount = 0
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) if (board[r][c]) stoneCount++

  if (stoneCount > 6) return null

  const stars = STAR_POINTS[size] || []
  const emptyStars = stars.filter(([r, c]) =>
    !board[r][c] && isLegalMove(board, r, c, color, size, prevBoardStr)
  )
  if (emptyStars.length === 0) return null
  return emptyStars[Math.floor(Math.random() * emptyStars.length)]
}

// 2-ply minimax with alpha-beta. score는 항상 `color`의 관점.
function minimaxScore(board, size, color, toMove, depth, alpha, beta, prevBoardStr) {
  if (depth === 0) {
    return evaluateTerritory(board, size, color) * 2
  }
  const candidates = getCandidateMoves(board, size, 2)
    .filter(([r, c]) => isLegalMove(board, r, c, toMove, size, prevBoardStr))

  if (candidates.length === 0) return evaluateTerritory(board, size, color) * 2

  const ordered = candidates.map(([r, c]) => {
    const result = simulateMove(board, r, c, toMove, size)
    const sign = toMove === color ? 1 : -1
    const quick = sign * (result.captured * 5 + evaluateTerritory(result.board, size, color))
    return { r, c, quick, result }
  }).sort((a, b) => b.quick - a.quick).slice(0, 6)

  const isMax = toMove === color
  const newPrev = boardToString(board)
  const nextToMove = toMove === 'black' ? 'white' : 'black'

  let best = isMax ? -Infinity : Infinity
  for (const cand of ordered) {
    const child = minimaxScore(cand.result.board, size, color, nextToMove, depth - 1, alpha, beta, newPrev)
    const captureBonus = (toMove === color ? 1 : -1) * cand.result.captured * 5
    const score = child + captureBonus
    if (isMax) {
      if (score > best) best = score
      if (best > alpha) alpha = best
    } else {
      if (score < best) best = score
      if (best < beta) beta = best
    }
    if (beta <= alpha) break
  }
  return best
}

function chooseMoveDeep(board, size, color, prevBoardStr, depth, timeLimit) {
  const candidates = getCandidateMoves(board, size, 2)
    .filter(([r, c]) => isLegalMove(board, r, c, color, size, prevBoardStr))
  if (candidates.length === 0) return null

  const preScored = candidates.map(([r, c]) => ({
    r, c, pre: advancedEval(board, r, c, color, size, prevBoardStr),
  })).sort((a, b) => b.pre - a.pre)

  const evalCount = Math.min(depth >= 2 ? 8 : 12, preScored.length)
  const topMoves = preScored.slice(0, evalCount)
  const opp = color === 'black' ? 'white' : 'black'
  const newPrev = boardToString(board)
  const startTime = Date.now()

  let bestScore = -Infinity
  let bestMove = [topMoves[0].r, topMoves[0].c]

  for (const cand of topMoves) {
    if (Date.now() - startTime > timeLimit) break
    const result = simulateMove(board, cand.r, cand.c, color, size)
    const child = minimaxScore(result.board, size, color, opp, depth - 1, -Infinity, Infinity, newPrev)
    const score = child + result.captured * 10
    if (score > bestScore) {
      bestScore = score
      bestMove = [cand.r, cand.c]
    }
  }
  return bestMove
}

function getAiMove(board, size, strategy, prevBoardStr) {
  const color = 'white'
  const opp = 'black'
  const { tier, subLevel } = strategy

  if (tier === 'deep') {
    const opening = getOpeningMove(board, size, color, prevBoardStr)
    if (opening) return opening
  }

  const radius = (tier === 'lookahead2' || tier === 'deep') ? 3 : 2
  const allCandidates = getCandidateMoves(board, size, radius)
  const legalMoves = allCandidates.filter(([r, c]) => isLegalMove(board, r, c, color, size, prevBoardStr))

  if (legalMoves.length === 0) return null

  const decent = legalMoves.filter(([r, c]) => {
    const result = simulateMove(board, r, c, color, size)
    const selfGroup = getGroup(result.board, r, c, size)
    return selfGroup.liberties >= 2 || result.captured > 0
  })
  const decentPool = decent.length > 0 ? decent : legalMoves
  const pickRand = pool => pool[Math.floor(Math.random() * pool.length)]

  // Tier: random  (30~21급)
  if (tier === 'random') {
    const mistakeRate = 1 - subLevel * 0.8
    if (Math.random() < mistakeRate) return pickRand(legalMoves)
    return pickRand(decentPool)
  }

  // Tier: capture  (20~13급)
  if (tier === 'capture') {
    const mistakeRate = 0.4 * (1 - subLevel)
    if (Math.random() < mistakeRate) return pickRand(decentPool)
    const captures = findCaptures(board, color, size, legalMoves, prevBoardStr)
    if (captures.length > 0) return [captures[0].r, captures[0].c]
    const saves = findSaveMoves(board, color, size, legalMoves, prevBoardStr)
    if (saves.length > 0) return pickRand(saves)
    return pickRand(decentPool)
  }

  // Tier: territory  (12~7급)
  if (tier === 'territory') {
    const captures = findCaptures(board, color, size, legalMoves, prevBoardStr)
    if (captures.length > 0) return [captures[0].r, captures[0].c]
    const saves = findSaveMoves(board, color, size, legalMoves, prevBoardStr)
    if (saves.length > 0) return saves[0]

    const scored = legalMoves
      .filter(([r, c]) => !isInOpponentTerritory(board, r, c, color, size))
      .map(([r, c]) => ({ r, c, score: scoreMoveByTerritory(board, r, c, color, size) }))
    scored.sort((a, b) => b.score - a.score)
    if (scored.length === 0) return pickRand(decentPool)

    const topN = Math.max(2, Math.round(6 - subLevel * 4))
    const pick = scored[Math.floor(Math.random() * Math.min(topN, scored.length))]
    return [pick.r, pick.c]
  }

  // Tier: advanced  (6~1급)
  if (tier === 'advanced') {
    const captures = findCaptures(board, color, size, legalMoves, prevBoardStr)
    if (captures.length > 0 && captures[0].captured >= 2) return [captures[0].r, captures[0].c]
    const saves = findSaveMoves(board, color, size, legalMoves, prevBoardStr)
    if (saves.length > 0) return saves[0]

    const scored = legalMoves.map(([r, c]) => ({
      r, c, score: advancedEval(board, r, c, color, size, prevBoardStr),
    }))
    scored.sort((a, b) => b.score - a.score)
    if (scored.length === 0) return null

    const topN = Math.max(1, Math.round(4 - subLevel * 3))
    const pick = scored[Math.floor(Math.random() * Math.min(topN, scored.length))]
    return [pick.r, pick.c]
  }

  // Tier: lookahead1  (1~3단) — 1-ply
  if (tier === 'lookahead1') {
    const captures = findCaptures(board, color, size, legalMoves, prevBoardStr)
    if (captures.length > 0 && captures[0].captured >= 3) return [captures[0].r, captures[0].c]
    const saves = findSaveMoves(board, color, size, legalMoves, prevBoardStr)
    if (saves.length > 0) return saves[0]

    const oppLookCount = Math.round(6 + subLevel * 4)
    const scored = legalMoves.map(([r, c]) => {
      let score = advancedEval(board, r, c, color, size, prevBoardStr)
      const result = simulateMove(board, r, c, color, size)
      const oppMoves = getCandidateMoves(result.board, size, 2)
        .filter(([or, oc]) => isLegalMove(result.board, or, oc, opp, size, ''))
        .slice(0, oppLookCount)
      let bestOppScore = -Infinity
      for (const [or, oc] of oppMoves) {
        const oppResult = simulateMove(result.board, or, oc, opp, size)
        const oppScore = evaluateTerritory(oppResult.board, size, opp) + oppResult.captured * 5
        if (oppScore > bestOppScore) bestOppScore = oppScore
      }
      if (bestOppScore > -Infinity) score -= bestOppScore * 0.5
      return { r, c, score }
    })
    scored.sort((a, b) => b.score - a.score)
    if (scored.length === 0) return null

    const topN = Math.max(1, Math.round(3 - subLevel * 2))
    const pick = scored[Math.floor(Math.random() * Math.min(topN, scored.length))]
    return [pick.r, pick.c]
  }

  // Tier: lookahead2 (4~6단) — 2-ply
  if (tier === 'lookahead2') {
    const captures = findCaptures(board, color, size, legalMoves, prevBoardStr)
    if (captures.length > 0 && captures[0].captured >= 3) return [captures[0].r, captures[0].c]
    const saves = findSaveMoves(board, color, size, legalMoves, prevBoardStr)
    if (saves.length > 0) return saves[0]

    const move = chooseMoveDeep(board, size, color, prevBoardStr, 2, 800 + subLevel * 400)
    if (move) return move
    return pickRand(decentPool)
  }

  // Tier: deep (7~9단) — 2-ply + 정석 + 더 많은 후보
  {
    const captures = findCaptures(board, color, size, legalMoves, prevBoardStr)
    if (captures.length > 0 && captures[0].captured >= 2) return [captures[0].r, captures[0].c]
    const saves = findSaveMoves(board, color, size, legalMoves, prevBoardStr)
    if (saves.length > 0) return saves[0]

    const move = chooseMoveDeep(board, size, color, prevBoardStr, 2, 1200 + subLevel * 600)
    if (move) return move
    return pickRand(decentPool)
  }
}

// ============================================================
// Component
// ============================================================

const KYU_RANKS = getKyuRanks()
const DAN_RANKS = getDanRanks()

export default function Baduk({ onBack }) {
  const [mode, setMode] = useState(null) // null | 'local' | 'ai' | 'online'
  const [size, setSize] = useState(null)
  const [aiRank, setAiRank] = useState(null) // strength 정수 0~38
  const [rankTab, setRankTab] = useState('kyu') // 'kyu' | 'dan'
  const [board, setBoard] = useState([])
  const [turn, setTurn] = useState('black')
  const [captures, setCaptures] = useState({ black: 0, white: 0 })
  const [lastMove, setLastMove] = useState(null)
  const [prevBoardStr, setPrevBoardStr] = useState('')
  const [passCount, setPassCount] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(null)
  const [history, setHistory] = useState([])
  const [message, setMessage] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [aiThinking, setAiThinking] = useState(false)
  const [handicapCount, setHandicapCount] = useState(0)
  const [komi, setKomi] = useState(6.5)

  const room = useGameRoom('baduk')
  const vw = useViewportWidth()

  // 업적: AI 모드에서 승리 (바둑에서 플레이어는 흑)
  useEffect(() => {
    if (mode === 'ai' && gameOver && score && score.black > score.white) {
      unlock('baduk_ai_win')
      if (aiRank === 38) unlock('baduk_dan9')
    }
  }, [gameOver, mode, score, aiRank])
  const aiTimerRef = useRef(null)

  const opponent = turn === 'black' ? 'white' : 'black'

  // 온라인: 게임 상태 수신
  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = room.gameState
    const sz = s.size || 9
    if (!size) setSize(sz)
    setBoard(flatToBoard(s.board, sz))
    setTurn(s.turn || 'black')
    setCaptures(s.captures || { black: 0, white: 0 })
    setLastMove(s.lastMove || null)
    setPassCount(s.passCount || 0)
    setPrevBoardStr(s.prevBoardStr || '')
    setGameOver(s.gameOver || false)
    setScore(s.score || null)
  }, [room.gameState, mode])

  // AI move effect
  const aiThinkingRef = useRef(false)
  useEffect(() => {
    if (mode !== 'ai' || turn !== 'white' || gameOver) return
    if (!size || board.length === 0 || aiRank == null) return
    if (aiThinkingRef.current) return

    aiThinkingRef.current = true
    setAiThinking(true)
    const strategy = rankToStrategy(aiRank)
    const delay = getAiDelay(aiRank)

    const timer = setTimeout(() => {
      try {
        const move = getAiMove(board, size, strategy, prevBoardStr)

        if (move === null) {
          const newPassCount = passCount + 1
          if (newPassCount >= 2) {
            const newScore = countTerritory(board, size, komi)
            setScore(newScore)
            setGameOver(true)
            setMessage('')
          } else {
            setPassCount(newPassCount)
            setTurn('black')
            setMessage('⚪ 백(AI) 패스')
          }
        } else {
          const [r, c] = move
          const testBoard = board.map(row => [...row])
          testBoard[r][c] = 'white'
          const afterCapture = removeDeadStones(testBoard, 'black', size)
          const newBoard = afterCapture.board
          const newCaptured = afterCapture.captured
          const newCaptures = { ...captures, white: captures.white + newCaptured }
          const newPrevBoardStr = boardToString(board)

          setHistory(prev => [...prev, { board: board.map(row => [...row]), turn: 'white', captures: { ...captures }, prevBoardStr }])
          setPrevBoardStr(newPrevBoardStr)
          setBoard(newBoard)
          setLastMove([r, c])
          setCaptures(newCaptures)
          setPassCount(0)
          setTurn('black')
          setMessage('')
        }
      } catch (e) {
        console.error('AI error:', e)
      }
      aiThinkingRef.current = false
      setAiThinking(false)
    }, delay)

    return () => clearTimeout(timer)
  }, [mode, turn, gameOver, board, size, aiRank, prevBoardStr, passCount, captures, komi])

  // AI 모드 시작 (rank 기반 핸디캡 적용)
  const startAiGame = (s, rankStrength) => {
    const stones = getHandicapStones(rankStrength, s)
    const k = getKomi(rankStrength, s)
    const initialBoard = applyHandicap(createBoard(s), stones)
    setSize(s)
    setAiRank(rankStrength)
    setHandicapCount(stones.length)
    setKomi(k)
    setBoard(initialBoard)
    // 핸디캡이 있으면 백(AI)이 선공
    setTurn(stones.length > 0 ? 'white' : 'black')
    setCaptures({ black: 0, white: 0 })
    setLastMove(null)
    setPrevBoardStr('')
    setPassCount(0)
    setGameOver(false)
    setScore(null)
    setHistory([])
    setMessage('')
    setAiThinking(false)
  }

  // 일반(로컬/온라인) 시작
  const startGame = (s) => {
    setSize(s)
    setHandicapCount(0)
    setKomi(6.5)
    setBoard(createBoard(s))
    setTurn('black')
    setCaptures({ black: 0, white: 0 })
    setLastMove(null)
    setPrevBoardStr('')
    setPassCount(0)
    setGameOver(false)
    setScore(null)
    setHistory([])
    setMessage('')
    setAiThinking(false)
  }

  const getInitialOnlineState = (s) => ({
    board: boardToFlat(createBoard(s)),
    turn: 'black',
    captures: { black: 0, white: 0 },
    lastMove: null,
    passCount: 0,
    prevBoardStr: '',
    gameOver: false,
    score: null,
    size: s,
  })

  const createOnlineWithSize = async (s) => {
    await room.createRoom(getInitialOnlineState(s))
    setSize(s)
    setBoard(createBoard(s))
    setTurn('black')
    setCaptures({ black: 0, white: 0 })
    setLastMove(null)
    setPrevBoardStr('')
    setPassCount(0)
    setGameOver(false)
    setScore(null)
    setHistory([])
    setMessage('')
    setMode('online')
  }

  const joinOnline = async () => {
    if (joinCode.length !== 2) { room.setError('2자리 코드를 입력하세요'); return }
    const ok = await room.joinRoom(joinCode.toUpperCase())
    if (ok) setMode('online')
  }

  const place = useCallback((r, c) => {
    if (!size || board[r][c] || gameOver) return

    if (mode === 'ai') {
      if (turn !== 'black' || aiThinking) return
    }

    if (mode === 'online') {
      if (!room.connected) return
      if (turn !== room.myColor) return
    }

    const testBoard = board.map(row => [...row])
    testBoard[r][c] = turn

    const afterCapture = removeDeadStones(testBoard, opponent, size)
    let newBoard = afterCapture.board
    let newCaptured = afterCapture.captured

    const selfGroup = getGroup(newBoard, r, c, size)
    if (selfGroup.liberties === 0) {
      setMessage('자충수! 놓을 수 없어요')
      setTimeout(() => setMessage(''), 1500)
      return
    }

    const newBoardStr = boardToString(newBoard)
    if (newBoardStr === prevBoardStr) {
      setMessage('패! 같은 형태 반복 금지')
      setTimeout(() => setMessage(''), 1500)
      return
    }

    const newCaptures = { ...captures, [turn]: captures[turn] + newCaptured }
    const newPrevBoardStr = boardToString(board)
    const newTurn = opponent

    if (mode === 'online') {
      room.updateState({
        board: boardToFlat(newBoard),
        turn: newTurn,
        captures: newCaptures,
        lastMove: [r, c],
        passCount: 0,
        prevBoardStr: newPrevBoardStr,
        gameOver: false,
        score: null,
        size,
      })
    } else {
      setHistory([...history, { board: board.map(r => [...r]), turn, captures: { ...captures }, prevBoardStr }])
      setPrevBoardStr(newPrevBoardStr)
      setBoard(newBoard)
      setLastMove([r, c])
      setCaptures(newCaptures)
      setPassCount(0)
      setTurn(newTurn)
      setMessage('')
    }
  }, [board, turn, opponent, gameOver, prevBoardStr, captures, history, size, mode, room, aiThinking])

  const pass = () => {
    if (gameOver) return

    if (mode === 'ai') {
      if (turn !== 'black' || aiThinking) return
    }

    if (mode === 'online') {
      if (!room.connected) return
      if (turn !== room.myColor) return
    }

    const newPassCount = passCount + 1
    let newGameOver = false
    let newScore = null
    const useKomi = mode === 'ai' ? komi : 6.5

    if (newPassCount >= 2) {
      newScore = countTerritory(board, size, useKomi)
      newGameOver = true
    }

    if (mode === 'online') {
      room.updateState({
        board: boardToFlat(board),
        turn: opponent,
        captures,
        lastMove,
        passCount: newPassCount,
        prevBoardStr,
        gameOver: newGameOver,
        score: newScore,
        size,
      })
    } else {
      setHistory([...history, { board: board.map(r => [...r]), turn, captures: { ...captures }, prevBoardStr }])
      setPassCount(newPassCount)
      setTurn(opponent)
      setMessage(`${turn === 'black' ? '⚫ 흑' : '⚪ 백'} 패스`)
      if (newGameOver) {
        setScore(newScore)
        setGameOver(true)
        setMessage('')
      }
    }
  }

  const undo = () => {
    if (mode === 'online') return
    if (history.length === 0 || gameOver) return
    if (mode === 'ai' && aiThinking) return

    if (mode === 'ai' && history.length >= 2) {
      const prev = history[history.length - 2]
      setBoard(prev.board)
      setTurn(prev.turn)
      setCaptures(prev.captures)
      setPrevBoardStr(prev.prevBoardStr)
      setHistory(history.slice(0, -2))
    } else {
      const last = history[history.length - 1]
      setBoard(last.board)
      setTurn(last.turn)
      setCaptures(last.captures)
      setPrevBoardStr(last.prevBoardStr)
      setHistory(history.slice(0, -1))
    }
    setPassCount(0)
    setLastMove(null)
    setMessage('')
  }

  const resetGame = () => {
    if (!window.confirm('현재 게임을 종료하고 새 게임을 시작할까요?')) return
    if (mode === 'online') {
      room.updateState(getInitialOnlineState(size))
    } else if (mode === 'ai' && aiRank != null) {
      startAiGame(size, aiRank)
    } else {
      startGame(size)
    }
  }

  const handleBack = () => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    if (mode === 'online') room.leaveRoom()
    if (mode === 'ai') {
      setAiRank(null)
      setSize(null)
      setMode(null)
      return
    }
    if (mode) {
      setMode(null)
      setSize(null)
      return
    }
    onBack()
  }

  // 모드 선택 화면
  if (!mode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>⚪</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>바둑</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => setMode('ai')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #8E44AD, #6C3483)' }}>
            🤖 vs 컴퓨터
          </button>
          <button onClick={() => setMode('local')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #1a1a1a, #444)' }}>
            📱 같은 기기에서 (2인)
          </button>
          <button onClick={() => setMode('online-create')}
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
                fontFamily: 'monospace', minWidth: 0, boxSizing: 'border-box',
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

  // AI 모드: 사이즈 선택
  if (mode === 'ai' && !size) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={() => setMode(null)}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🤖</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>vs 컴퓨터</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 32 }}>판 크기를 선택하세요</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => setSize(9)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #06D6A0, #05B384)' }}>
            9×9 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>입문</span>
          </button>
          <button onClick={() => setSize(13)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #4895EF, #3A7BD5)' }}>
            13×13 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>중급</span>
          </button>
          <button onClick={() => setSize(19)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #1a1a1a, #444)' }}>
            19×19 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>정식</span>
          </button>
        </div>
      </div>
    )
  }

  // AI 모드: 등급(급/단) 선택
  if (mode === 'ai' && size && aiRank == null) {
    const ranks = rankTab === 'kyu' ? KYU_RANKS : DAN_RANKS
    const cols = rankTab === 'kyu' ? 6 : 3
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={() => setSize(null)}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 크기 선택
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🤖</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>등급 선택</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
          {size}×{size} · 30급(가장 약함) → 9단(가장 강함)
        </p>

        {/* 급/단 탭 */}
        <div style={{ display: 'flex', gap: 8, maxWidth: 300, margin: '0 auto 16px' }}>
          <button onClick={() => setRankTab('kyu')}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 700,
              background: rankTab === 'kyu' ? '#333' : '#F0F0F0',
              color: rankTab === 'kyu' ? '#FFF' : '#666',
            }}>
            급 (30~1급)
          </button>
          <button onClick={() => setRankTab('dan')}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 700,
              background: rankTab === 'dan' ? '#333' : '#F0F0F0',
              color: rankTab === 'dan' ? '#FFF' : '#666',
            }}>
            단 (1~9단)
          </button>
        </div>

        {/* 등급 버튼 그리드 (강한 등급이 위에 오도록 정렬: 1급/9단부터) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 6,
          maxWidth: 320,
          margin: '0 auto',
        }}>
          {[...ranks].reverse().map(rank => (
            <button key={rank.strength}
              onClick={() => startAiGame(size, rank.strength)}
              title={getRankDescription(rank.strength)}
              style={{
                padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 700, color: '#FFF',
                background: getRankColor(rank.strength),
                boxShadow: `0 2px 6px ${getRankColor(rank.strength)}44`,
              }}>
              {rank.label}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 11, color: '#AAA', marginTop: 16, lineHeight: 1.5, maxWidth: 320, margin: '16px auto 0' }}>
          ※ 단(段)에서는 플레이어가 미리 흑돌을 화점에 놓고 시작합니다 (접바둑).
        </p>
      </div>
    )
  }

  // 온라인 방 만들기: 사이즈 선택
  if (mode === 'online-create') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={() => setMode(null)}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🌐</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>온라인 바둑</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 32 }}>판 크기를 선택하세요</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => createOnlineWithSize(9)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #06D6A0, #05B384)' }}>
            9×9 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>입문</span>
          </button>
          <button onClick={() => createOnlineWithSize(13)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #4895EF, #3A7BD5)' }}>
            13×13 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>중급</span>
          </button>
          <button onClick={() => createOnlineWithSize(19)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #1a1a1a, #444)' }}>
            19×19 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>정식</span>
          </button>
        </div>
      </div>
    )
  }

  // 로컬 모드: 사이즈 선택
  if (mode === 'local' && !size) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={() => setMode(null)}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>⚪</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>바둑</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 32 }}>판 크기를 선택하세요</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => startGame(9)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #06D6A0, #05B384)' }}>
            9×9 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>입문</span>
          </button>
          <button onClick={() => startGame(13)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #4895EF, #3A7BD5)' }}>
            13×13 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>중급</span>
          </button>
          <button onClick={() => startGame(19)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #1a1a1a, #444)' }}>
            19×19 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>정식</span>
          </button>
        </div>
      </div>
    )
  }

  // 온라인: 대기 화면
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
          나는 ⚫ 흑 (선공) · {size}×{size}
        </p>
      </div>
    )
  }

  if (!size) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <p style={{ fontSize: 14, color: '#888' }}>게임 정보를 불러오는 중...</p>
      </div>
    )
  }

  const isMyTurn = mode === 'local' || mode === 'ai' ? turn === 'black' || mode === 'local' : turn === room.myColor
  const isPC = vw >= 768
  const maxCell = isPC
    ? (size === 19 ? 36 : size === 13 ? 50 : 64)
    : (size === 19 ? 20 : size === 13 ? 28 : 38)
  const effectiveWidth = isPC ? Math.min(vw - 40, 900) : vw - 32
  const cellSize = Math.min(Math.floor(effectiveWidth / size), maxCell)
  const boardPx = cellSize * (size - 1)
  const padding = cellSize

  const aiRankObj = aiRank != null ? getRank(aiRank) : null

  const turnLabel = (() => {
    if (gameOver) return '종료'
    if (mode === 'ai') {
      if (aiThinking) return 'AI 생각중...'
      return turn === 'black' ? '내 차례' : 'AI 차례'
    }
    if (mode === 'online') return isMyTurn ? '내 차례' : '상대 차례'
    return `${turn === 'black' ? '흑' : '백'} 차례`
  })()

  return (
    <div className="fade-in" style={{ maxWidth: 520, margin: '0 auto', paddingBottom: '1rem' }}>
      <div style={{
        background: mode === 'ai'
          ? `linear-gradient(135deg, ${getRankColor(aiRank ?? 0)}, ${getRankColor(Math.max(0, (aiRank ?? 0) - 5))})`
          : 'linear-gradient(135deg, #1a1a1a, #333)',
        color: '#FFF', padding: '1rem 1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={handleBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← {mode === 'online' ? '나가기' : '크기선택'}
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>
            바둑 ({size}×{size})
            {mode === 'ai' && aiRankObj && ` · AI ${aiRankObj.label}`}
            {mode === 'online' && ' · 온라인'}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(mode === 'local' || mode === 'ai') && (
              <button onClick={undo}
                disabled={mode === 'ai' && aiThinking}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 12, borderRadius: 20, padding: '4px 10px', cursor: 'pointer', opacity: (mode === 'ai' && aiThinking) ? 0.4 : 1 }}>
                ↩
              </button>
            )}
            <button onClick={resetGame}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 12, borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}>
              새 게임
            </button>
          </div>
        </div>
      </div>

      {/* 정보 바 */}
      <div style={{
        display: 'flex', justifyContent: 'space-around', padding: '10px 16px',
        background: '#F7F6F3', fontSize: 13,
      }}>
        <div style={{ textAlign: 'center', fontWeight: turn === 'black' && !gameOver ? 700 : 400 }}>
          ⚫ 흑{mode === 'ai' ? '(나)' : ''} <span style={{ fontSize: 11, color: '#888' }}>잡은돌 {captures.black}</span>
        </div>
        <div style={{
          padding: '2px 12px', borderRadius: 10,
          background: gameOver ? '#F1C40F' : aiThinking ? '#8E44AD' : turn === 'black' ? '#333' : '#FFF',
          color: gameOver ? '#333' : aiThinking ? '#FFF' : turn === 'black' ? '#FFF' : '#333',
          border: '1px solid #DDD', fontSize: 12, fontWeight: 600,
        }}>
          {turnLabel}
        </div>
        <div style={{ textAlign: 'center', fontWeight: turn === 'white' && !gameOver ? 700 : 400 }}>
          ⚪ 백{mode === 'ai' ? '(AI)' : ''} <span style={{ fontSize: 11, color: '#888' }}>잡은돌 {captures.white}</span>
        </div>
      </div>

      {mode === 'ai' && aiRankObj && (
        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0' }}>
          <strong>{aiRankObj.label}</strong> · {getRankDescription(aiRank)}
          {handicapCount > 0 && ` · 접바둑 ${handicapCount}점`}
        </div>
      )}

      {mode === 'online' && (
        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0' }}>
          방 코드: <strong>{room.roomCode}</strong> · 나는 {room.myColor === 'black' ? '⚫ 흑' : '⚪ 백'}
        </div>
      )}

      {message && (
        <div style={{ textAlign: 'center', padding: '6px', fontSize: 13, fontWeight: 600, color: '#E74C3C', background: '#FFF5F5' }}>
          {message}
        </div>
      )}

      {/* 바둑판 */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', overflow: 'auto' }}>
        <svg
          width={boardPx + padding * 2}
          height={boardPx + padding * 2}
          style={{ background: '#DCB35C', borderRadius: 8 }}
        >
          {Array.from({ length: size }).map((_, i) => (
            <g key={`line-${i}`}>
              <line x1={padding} y1={padding + i * cellSize} x2={padding + (size - 1) * cellSize} y2={padding + i * cellSize} stroke="#8B6914" strokeWidth={0.8} />
              <line x1={padding + i * cellSize} y1={padding} x2={padding + i * cellSize} y2={padding + (size - 1) * cellSize} stroke="#8B6914" strokeWidth={0.8} />
            </g>
          ))}

          {(STAR_POINTS[size] || []).map(([r, c]) => (
            <circle key={`dot-${r}-${c}`} cx={padding + c * cellSize} cy={padding + r * cellSize} r={size === 19 ? 2 : 2.5} fill="#8B6914" />
          ))}

          {board.map((row, r) => row.map((cell, c) => {
            if (!cell) return null
            const isLast = lastMove && lastMove[0] === r && lastMove[1] === c
            return (
              <g key={`stone-${r}-${c}`}>
                <circle cx={padding + c * cellSize} cy={padding + r * cellSize} r={cellSize * 0.44}
                  fill={cell === 'black' ? '#222' : '#FFF'} stroke={cell === 'black' ? '#000' : '#AAA'} strokeWidth={0.8} />
                {isLast && <circle cx={padding + c * cellSize} cy={padding + r * cellSize} r={size === 19 ? 2 : 3} fill="#E74C3C" />}
              </g>
            )
          }))}

          {!gameOver && board.map((row, r) => row.map((cell, c) => {
            if (cell) return null
            return (
              <rect key={`click-${r}-${c}`}
                x={padding + c * cellSize - cellSize / 2} y={padding + r * cellSize - cellSize / 2}
                width={cellSize} height={cellSize} fill="transparent"
                style={{ cursor: (mode === 'ai' ? (turn === 'black' && !aiThinking) : isMyTurn) ? 'pointer' : 'default' }}
                onClick={() => place(r, c)} />
            )
          }))}
        </svg>
      </div>

      {!gameOver && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <button onClick={pass}
            disabled={mode === 'ai' && (turn !== 'black' || aiThinking)}
            style={{
              padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: (mode === 'online' && !isMyTurn) || (mode === 'ai' && (turn !== 'black' || aiThinking)) ? '#AAA' : '#555',
              color: '#FFF', fontSize: 14, fontWeight: 600,
            }}>
            패스 {passCount >= 1 ? '(양쪽 패스 시 종료)' : ''}
          </button>
        </div>
      )}

      {gameOver && score && (
        <div style={{
          margin: '8px 12px', padding: '20px', borderRadius: 14,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          border: '2px solid #F1C40F', textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
            {score.black > score.white
              ? mode === 'ai'
                ? `⚫ 승리! AI ${aiRankObj ? aiRankObj.label : ''}을(를) 이겼습니다!`
                : '⚫ 흑 승리!'
              : mode === 'ai'
                ? `⚪ AI ${aiRankObj ? aiRankObj.label : ''} 승리! 다시 도전하세요!`
                : '⚪ 백 승리!'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16, fontSize: 13 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{score.black}</div>
              <div style={{ color: '#888' }}>⚫ 흑{mode === 'ai' ? '(나)' : ''}</div>
              <div style={{ fontSize: 11, color: '#AAA' }}>돌 {score.blackStones} + 집 {score.blackTerritory}</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{score.white}</div>
              <div style={{ color: '#888' }}>⚪ 백{mode === 'ai' ? '(AI)' : ''}</div>
              <div style={{ fontSize: 11, color: '#AAA' }}>
                돌 {score.whiteStones} + 집 {score.whiteTerritory} + 덤{score.komi}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={resetGame}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#333', color: '#FFF', fontSize: 14, fontWeight: 600 }}>
              다시 하기
            </button>
            {mode === 'local' && (
              <button onClick={() => setSize(null)}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
                크기 변경
              </button>
            )}
            {mode === 'ai' && (
              <button onClick={() => { setAiRank(null); setSize(null) }}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
                등급 변경
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
