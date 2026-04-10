import { useState, useCallback, useEffect, useRef } from 'react'
import { useGameRoom } from '../utils/useGameRoom'

function createBoard(size) {
  return Array.from({ length: size }, () => Array(size).fill(null))
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

function countTerritory(board, size) {
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
    white: whiteStones + whiteTerritory + 6.5,
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
    // Opening: return center and star points
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
  const opp = color === 'black' ? 'white' : 'black'
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
  // Find own groups with only 1 liberty and extend them
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
        // Find the liberty point
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
  // Consider it opponent's territory if surrounded mostly by opponent
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

// Advanced evaluation: territory + liberties + connectivity
function advancedEval(board, r, c, color, size, prevBoardStr) {
  const result = simulateMove(board, r, c, color, size)
  let score = 0
  // Territory
  score += evaluateTerritory(result.board, size, color) * 2
  // Captures are very valuable
  score += result.captured * 10
  // Own group liberties after move
  const group = getGroup(result.board, r, c, size)
  score += Math.min(group.liberties, 6) * 2
  // Group size bonus
  score += Math.min(group.stones.length, 8)
  // Near own stones bonus
  if (isNearExistingGroup(board, r, c, color, size)) score += 3
  // Avoid opponent territory
  if (isInOpponentTerritory(board, r, c, color, size)) score -= 8
  // Edge penalty (corners and edges are less valuable early)
  if (r === 0 || r === size - 1 || c === 0 || c === size - 1) score -= 2
  // Self-atari penalty
  if (group.liberties === 1 && result.captured === 0) score -= 15
  return score
}

function getAiMove(board, size, aiLevel, prevBoardStr) {
  const color = 'white'
  const opp = 'black'
  const radius = aiLevel >= 7 ? 3 : 2
  const allCandidates = getCandidateMoves(board, size, radius)
  const legalMoves = allCandidates.filter(([r, c]) => isLegalMove(board, r, c, color, size, prevBoardStr))

  if (legalMoves.length === 0) return null // pass

  // Level 1-2: Random legal moves, avoid obvious bad moves
  if (aiLevel <= 2) {
    // Filter out self-atari and moves in opponent's strong territory
    const decent = legalMoves.filter(([r, c]) => {
      const result = simulateMove(board, r, c, color, size)
      const selfGroup = getGroup(result.board, r, c, size)
      return selfGroup.liberties >= 2 || result.captured > 0
    })
    const pool = decent.length > 0 ? decent : legalMoves
    return pool[Math.floor(Math.random() * pool.length)]
  }

  // Level 3-4: Capture + save + random
  if (aiLevel <= 4) {
    // Priority 1: Capture opponent stones
    const captures = findCaptures(board, color, size, legalMoves, prevBoardStr)
    if (captures.length > 0) {
      return aiLevel === 3
        ? [captures[0].r, captures[0].c]
        : [captures[Math.floor(Math.random() * Math.min(2, captures.length))].r,
           captures[Math.floor(Math.random() * Math.min(2, captures.length))].c]
    }

    // Priority 2: Save own groups in atari
    const saves = findSaveMoves(board, color, size, legalMoves, prevBoardStr)
    if (saves.length > 0) return saves[Math.floor(Math.random() * saves.length)]

    // Random from decent moves
    const decent = legalMoves.filter(([r, c]) => {
      const result = simulateMove(board, r, c, color, size)
      const selfGroup = getGroup(result.board, r, c, size)
      return selfGroup.liberties >= 2 || result.captured > 0
    })
    const pool = decent.length > 0 ? decent : legalMoves
    return pool[Math.floor(Math.random() * pool.length)]
  }

  // Level 5-6: Territory evaluation
  if (aiLevel <= 6) {
    const captures = findCaptures(board, color, size, legalMoves, prevBoardStr)
    if (captures.length > 0) return [captures[0].r, captures[0].c]

    const saves = findSaveMoves(board, color, size, legalMoves, prevBoardStr)
    if (saves.length > 0) return saves[0]

    // Score moves by territory influence
    const scored = legalMoves
      .filter(([r, c]) => !isInOpponentTerritory(board, r, c, color, size))
      .map(([r, c]) => ({
        r, c,
        score: scoreMoveByTerritory(board, r, c, color, size),
      }))
    scored.sort((a, b) => b.score - a.score)

    if (scored.length === 0) return legalMoves[Math.floor(Math.random() * legalMoves.length)]

    // Pick from top moves with some randomness
    const topN = Math.min(aiLevel === 5 ? 5 : 3, scored.length)
    const pick = scored[Math.floor(Math.random() * topN)]
    return [pick.r, pick.c]
  }

  // Level 7-8: Advanced evaluation with deeper analysis
  if (aiLevel <= 8) {
    const captures = findCaptures(board, color, size, legalMoves, prevBoardStr)
    if (captures.length > 0 && captures[0].captured >= 2) return [captures[0].r, captures[0].c]

    const saves = findSaveMoves(board, color, size, legalMoves, prevBoardStr)
    if (saves.length > 0) return saves[0]

    const scored = legalMoves.map(([r, c]) => ({
      r, c,
      score: advancedEval(board, r, c, color, size, prevBoardStr),
    }))
    scored.sort((a, b) => b.score - a.score)
    if (scored.length === 0) return null

    // Level 7: pick from top 3, Level 8: pick best
    const topN = aiLevel === 7 ? Math.min(3, scored.length) : 1
    const pick = scored[Math.floor(Math.random() * topN)]
    return [pick.r, pick.c]
  }

  // Level 9-10: Advanced evaluation + look-ahead (simulate opponent response)
  {
    const captures = findCaptures(board, color, size, legalMoves, prevBoardStr)
    if (captures.length > 0 && captures[0].captured >= 3) return [captures[0].r, captures[0].c]

    const saves = findSaveMoves(board, color, size, legalMoves, prevBoardStr)
    if (saves.length > 0) return saves[0]

    // Score all moves with advanced eval
    const scored = legalMoves.map(([r, c]) => {
      let score = advancedEval(board, r, c, color, size, prevBoardStr)

      // Look-ahead: simulate opponent's best response
      if (aiLevel === 10) {
        const result = simulateMove(board, r, c, color, size)
        const oppMoves = getCandidateMoves(result.board, size, 2)
          .filter(([or, oc]) => isLegalMove(result.board, or, oc, opp, size, ''))
          .slice(0, 8) // limit for speed
        let bestOppScore = -Infinity
        for (const [or, oc] of oppMoves) {
          const oppResult = simulateMove(result.board, or, oc, opp, size)
          const oppScore = evaluateTerritory(oppResult.board, size, opp) + oppResult.captured * 5
          if (oppScore > bestOppScore) bestOppScore = oppScore
        }
        if (bestOppScore > -Infinity) score -= bestOppScore * 0.5
      }

      return { r, c, score }
    })
    scored.sort((a, b) => b.score - a.score)
    if (scored.length === 0) return null

    return [scored[0].r, scored[0].c]
  }
}

// ============================================================
// Component
// ============================================================

const AI_LEVEL_LABELS = [
  { range: '1-2', label: '입문', levels: [1, 2] },
  { range: '3-4', label: '초급', levels: [3, 4] },
  { range: '5-6', label: '중급', levels: [5, 6] },
  { range: '7-8', label: '상급', levels: [7, 8] },
  { range: '9-10', label: '고수', levels: [9, 10] },
]

function getLevelColor(level) {
  const colors = [
    '#2ECC71', '#27AE60', // 1-2 green
    '#F1C40F', '#F39C12', // 3-4 yellow
    '#E67E22', '#D35400', // 5-6 orange
    '#E74C3C', '#C0392B', // 7-8 red
    '#8E44AD', '#6C3483', // 9-10 purple/dark
  ]
  return colors[level - 1] || '#333'
}

function getLevelLabel(level) {
  if (level <= 2) return '입문'
  if (level <= 4) return '초급'
  if (level <= 6) return '중급'
  if (level <= 8) return '상급'
  return '고수'
}

export default function Baduk({ onBack }) {
  const [mode, setMode] = useState(null) // null | 'local' | 'ai' | 'online'
  const [size, setSize] = useState(null)
  const [aiLevel, setAiLevel] = useState(null)
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

  const room = useGameRoom('baduk')
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
    if (!size || board.length === 0) return
    if (aiThinkingRef.current) return

    aiThinkingRef.current = true
    setAiThinking(true)
    const delay = aiLevel <= 4 ? 300 : aiLevel <= 6 ? 400 : 500

    const timer = setTimeout(() => {
      try {
        const move = getAiMove(board, size, aiLevel, prevBoardStr)

        if (move === null) {
          const newPassCount = passCount + 1
          if (newPassCount >= 2) {
            const newScore = countTerritory(board, size)
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
  }, [mode, turn, gameOver, board, size, aiLevel, prevBoardStr, passCount, captures])

  const startGame = (s) => {
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

    // AI mode: only allow player (black) to play
    if (mode === 'ai') {
      if (turn !== 'black' || aiThinking) return
    }

    // 온라인: 자기 턴만 가능
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

    // AI mode: only player can pass
    if (mode === 'ai') {
      if (turn !== 'black' || aiThinking) return
    }

    // 온라인: 자기 턴만 가능
    if (mode === 'online') {
      if (!room.connected) return
      if (turn !== room.myColor) return
    }

    const newPassCount = passCount + 1
    let newGameOver = false
    let newScore = null

    if (newPassCount >= 2) {
      newScore = countTerritory(board, size)
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
    if (mode === 'online') return // 온라인은 무르기 불가
    if (history.length === 0 || gameOver) return

    if (mode === 'ai' && aiThinking) return

    // In AI mode, undo both AI move and player move
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
    } else {
      startGame(size)
    }
  }

  const handleBack = () => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    if (mode === 'online') room.leaveRoom()
    if (mode === 'ai') {
      setAiLevel(null)
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

  // AI 모드: 레벨 선택
  if (mode === 'ai' && size && !aiLevel) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={() => setSize(null)}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 크기 선택
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🤖</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>난이도 선택</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>{size}×{size} · 나는 ⚫ 흑 (선공)</p>
        <div style={{ maxWidth: 300, margin: '0 auto' }}>
          {AI_LEVEL_LABELS.map(({ range, label, levels }) => (
            <div key={range} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textAlign: 'left', paddingLeft: 4 }}>
                {label}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {levels.map(lv => (
                  <button key={lv} onClick={() => { setAiLevel(lv); startGame(size) }}
                    style={{
                      flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                      fontSize: 18, fontWeight: 700, color: '#FFF',
                      background: getLevelColor(lv),
                      boxShadow: `0 2px 8px ${getLevelColor(lv)}44`,
                      transition: 'transform 0.1s',
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
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

  // 사이즈가 아직 없으면 (온라인 게스트가 아직 상태를 받지 못한 경우)
  if (!size) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <p style={{ fontSize: 14, color: '#888' }}>게임 정보를 불러오는 중...</p>
      </div>
    )
  }

  const isMyTurn = mode === 'local' || mode === 'ai' ? turn === 'black' || mode === 'local' : turn === room.myColor
  const maxCell = size === 19 ? 20 : size === 13 ? 28 : 38
  const cellSize = Math.min(Math.floor((window.innerWidth - 32) / size), maxCell)
  const boardPx = cellSize * (size - 1)
  const padding = cellSize

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
        background: mode === 'ai' ? 'linear-gradient(135deg, #4a1a6b, #6C3483)' : 'linear-gradient(135deg, #1a1a1a, #333)',
        color: '#FFF', padding: '1rem 1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={handleBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← {mode === 'online' ? '나가기' : '크기선택'}
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>
            바둑 ({size}×{size})
            {mode === 'ai' && ` · AI Lv.${aiLevel}`}
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

      {mode === 'ai' && (
        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0' }}>
          난이도: <strong>Lv.{aiLevel}</strong> ({getLevelLabel(aiLevel)})
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
              ? mode === 'ai' ? '⚫ 승리! AI를 이겼습니다!' : '⚫ 흑 승리!'
              : mode === 'ai' ? '⚪ AI 승리! 다시 도전하세요!' : '⚪ 백 승리!'}
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
              <div style={{ fontSize: 11, color: '#AAA' }}>돌 {score.whiteStones} + 집 {score.whiteTerritory} + 덤6.5</div>
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
              <button onClick={() => { setAiLevel(null); setSize(null) }}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
                난이도 변경
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
