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
      // 사용자 best move 추측 + AI 응답 계산 (budget 절반씩)
      const aiColor = userColor === 'black' ? 'white' : 'black'
      const baseBudget = strategy.search?.timeBudgetMs ?? 2000
      const halfBudget = Math.max(500, Math.floor(baseBudget * 0.5))
      const userStrategy = {
        ...strategy,
        search: strategy.search ? { ...strategy.search, timeBudgetMs: halfBudget } : strategy.search,
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
        search: strategy.search ? { ...strategy.search, timeBudgetMs: halfBudget } : strategy.search,
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
