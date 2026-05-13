// 바둑 게임 로직 + AI 엔진 (UI/React 의존 없음, 테스트 가능)

export const STAR_POINTS = {
  9: [[2, 2], [2, 6], [4, 4], [6, 2], [6, 6]],
  13: [[3, 3], [3, 6], [3, 9], [6, 3], [6, 6], [6, 9], [9, 3], [9, 6], [9, 9]],
  19: [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]],
}

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]]

export function createBoard(size) {
  return Array.from({ length: size }, () => Array(size).fill(null))
}

export function getGroup(board, r, c, size) {
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

export function removeDeadStones(board, color, size) {
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

export function boardToString(board) {
  return board.map(row => row.map(c => c || '.').join('')).join('|')
}

export function countTerritory(board, size, komi = 6.5) {
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

export function isLegalMove(board, r, c, color, size, prevBoardStr) {
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

export function simulateMove(board, r, c, color, size) {
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

// 정적 보드 평가: 돌수 + 영토 영향력 (minimax leaf용, 실제 점수에 더 가까움)
function staticBoardEval(board, size, color) {
  const opp = color === 'black' ? 'white' : 'black'
  let myStones = 0, oppStones = 0
  let myInfluence = 0, oppInfluence = 0

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === color) myStones++
      else if (board[r][c] === opp) oppStones++
      else {
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
  }
  return (myStones - oppStones) + (myInfluence - oppInfluence)
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

// 통합 휴리스틱 탐색기. 강한 등급일수록 oppLookCount/myFollowupCount가 큼.
// - oppLookCount: 상대 응수 후보 개수 (정렬해서 진짜 최선 응수를 찾음)
// - myFollowupCount > 0: 상대 응수 후 우리 후속수까지 평가 (2-ply 효과)
function pickByHeuristic({
  board, size, color, prevBoardStr, legalMoves,
  oppLookCount, myFollowupCount, topN,
}) {
  const opp = color === 'black' ? 'white' : 'black'
  const newPrev = boardToString(board)

  const scored = legalMoves.map(([r, c]) => {
    let score = advancedEval(board, r, c, color, size, prevBoardStr)
    const result = simulateMove(board, r, c, color, size)

    // 상대 응수 후보를 정렬해서 진짜 최선을 찾음 (이게 핵심 개선)
    const oppCandidates = getCandidateMoves(result.board, size, 2)
      .filter(([or, oc]) => isLegalMove(result.board, or, oc, opp, size, newPrev))
      .map(([or, oc]) => {
        const oppResult = simulateMove(result.board, or, oc, opp, size)
        const oppScore = staticBoardEval(oppResult.board, size, opp) + oppResult.captured * 5
        return { or, oc, oppScore, oppResult }
      })
      .sort((a, b) => b.oppScore - a.oppScore)
      .slice(0, oppLookCount)

    let bestOpp = null
    for (const cand of oppCandidates) {
      if (!bestOpp || cand.oppScore > bestOpp.oppScore) bestOpp = cand
    }
    if (bestOpp) score -= bestOpp.oppScore * 0.5

    // 2-ply: 상대 최선 응수 후 우리 후속수까지 본다
    if (myFollowupCount > 0 && bestOpp) {
      const followups = getCandidateMoves(bestOpp.oppResult.board, size, 2)
        .filter(([fr, fc]) => isLegalMove(bestOpp.oppResult.board, fr, fc, color, size, ''))
        .slice(0, myFollowupCount)
      let bestFollowup = -Infinity
      for (const [fr, fc] of followups) {
        const fScore = advancedEval(bestOpp.oppResult.board, fr, fc, color, size, '')
        if (fScore > bestFollowup) bestFollowup = fScore
      }
      if (bestFollowup > -Infinity) score += bestFollowup * 0.3
    }

    return { r, c, score }
  })
  scored.sort((a, b) => b.score - a.score)
  if (scored.length === 0) return null

  const pick = scored[Math.floor(Math.random() * Math.min(topN, scored.length))]
  return [pick.r, pick.c]
}

// 메인 진입점. color는 'black' 또는 'white' (테스트에서 양쪽 모두 사용).
export function getAiMove(board, size, strategy, prevBoardStr, color = 'white') {
  const opp = color === 'black' ? 'white' : 'black'
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

  if (tier === 'random') {
    const mistakeRate = 1 - subLevel * 0.8
    if (Math.random() < mistakeRate) return pickRand(legalMoves)
    return pickRand(decentPool)
  }

  if (tier === 'capture') {
    const mistakeRate = 0.4 * (1 - subLevel)
    if (Math.random() < mistakeRate) return pickRand(decentPool)
    const captures = findCaptures(board, color, size, legalMoves, prevBoardStr)
    if (captures.length > 0) return [captures[0].r, captures[0].c]
    const saves = findSaveMoves(board, color, size, legalMoves, prevBoardStr)
    if (saves.length > 0) return pickRand(saves)
    return pickRand(decentPool)
  }

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

  if (tier === 'lookahead1') {
    const captures = findCaptures(board, color, size, legalMoves, prevBoardStr)
    if (captures.length > 0 && captures[0].captured >= 3) return [captures[0].r, captures[0].c]
    const saves = findSaveMoves(board, color, size, legalMoves, prevBoardStr)
    if (saves.length > 0) return saves[0]

    // 1~3단: 상대 응수 4~8개 정렬해서 평가, top 3~1 중 선택
    const move = pickByHeuristic({
      board, size, color, prevBoardStr, legalMoves,
      oppLookCount: Math.round(4 + subLevel * 4),
      myFollowupCount: 0,
      topN: Math.max(1, Math.round(3 - subLevel * 2)),
    })
    if (move) return move
    return pickRand(decentPool)
  }

  if (tier === 'lookahead2') {
    const captures = findCaptures(board, color, size, legalMoves, prevBoardStr)
    if (captures.length > 0 && captures[0].captured >= 3) return [captures[0].r, captures[0].c]
    const saves = findSaveMoves(board, color, size, legalMoves, prevBoardStr)
    if (saves.length > 0) return saves[0]

    // 4~6단: 상대 응수 10~14개 정렬, 항상 최선 선택
    const move = pickByHeuristic({
      board, size, color, prevBoardStr, legalMoves,
      oppLookCount: Math.round(10 + subLevel * 4),
      myFollowupCount: 0,
      topN: 1,
    })
    if (move) return move
    return pickRand(decentPool)
  }

  // deep (7~9단): 더 넓은 상대 응수 + 우리 후속수까지 (2-ply 효과)
  {
    const captures = findCaptures(board, color, size, legalMoves, prevBoardStr)
    if (captures.length > 0 && captures[0].captured >= 2) return [captures[0].r, captures[0].c]
    const saves = findSaveMoves(board, color, size, legalMoves, prevBoardStr)
    if (saves.length > 0) return saves[0]

    const move = pickByHeuristic({
      board, size, color, prevBoardStr, legalMoves,
      oppLookCount: Math.round(14 + subLevel * 6),
      myFollowupCount: Math.round(4 + subLevel * 4),
      topN: 1,
    })
    if (move) return move
    return pickRand(decentPool)
  }
}
