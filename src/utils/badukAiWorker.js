// AI 계산을 메인 스레드 밖으로 옮기는 Web Worker
// 메시지 타입:
//   1) 정규: { board, size, strategy, prevBoardStr, color, requestId }
//      → 응답: { move, requestId }
//   2) ponder: { type: 'ponder', board, size, strategy, prevBoardStr, userColor, requestId }
//      → 사용자(userColor) best move + 그 응수 후 AI 응답까지 한 번에 계산
//      → 응답: { type: 'ponder', requestId, hit: true/false, userMove, aiMove }

import { getAiMove, simulateMove, boardToString } from './badukEngine.js'

self.onmessage = (e) => {
  const { type, board, size, strategy, prevBoardStr, color, userColor, requestId } = e.data
  try {
    if (type === 'ponder') {
      // 사용자 best move 추측 + AI 응답 계산
      // 2026-05-15 5차: 3초 캡 시대에는 사용자 추측은 1/3, AI 응답은 2/3로 비대칭 분배
      // (AI 본 응답 품질이 더 중요하므로)
      const aiColor = userColor === 'black' ? 'white' : 'black'
      const baseBudget = strategy.search?.timeBudgetMs ?? 2000
      const userBudget = Math.max(400, Math.floor(baseBudget * 0.33))
      const aiBudget = Math.max(800, Math.floor(baseBudget * 0.67))
      const userStrategy = {
        ...strategy,
        search: strategy.search ? { ...strategy.search, timeBudgetMs: userBudget } : strategy.search,
      }
      const userMove = getAiMove(board, size, userStrategy, prevBoardStr, userColor)
      if (!userMove) {
        self.postMessage({ type: 'ponder', requestId, hit: false })
        return
      }
      // 사용자 응수 적용
      const [ur, uc] = userMove
      const afterUser = simulateMove(board, ur, uc, userColor, size)
      const newPrev = boardToString(board)
      const aiStrategy = {
        ...strategy,
        search: strategy.search ? { ...strategy.search, timeBudgetMs: aiBudget } : strategy.search,
      }
      const aiMove = getAiMove(afterUser.board, size, aiStrategy, newPrev, aiColor)
      self.postMessage({
        type: 'ponder', requestId, hit: true,
        userMove, aiMove,
      })
    } else {
      // 정규 응답
      const move = getAiMove(board, size, strategy, prevBoardStr, color)
      self.postMessage({ move, requestId })
    }
  } catch (err) {
    self.postMessage({ error: err.message, requestId, type })
  }
}
