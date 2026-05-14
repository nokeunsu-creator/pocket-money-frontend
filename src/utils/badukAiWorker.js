// AI 계산을 메인 스레드 밖으로 옮기는 Web Worker
// Baduk.jsx에서 new Worker(new URL(...))로 임포트해서 사용
//
// 사용:
//   const worker = new Worker(new URL('./badukAiWorker.js', import.meta.url), { type: 'module' })
//   worker.postMessage({ board, size, strategy, prevBoardStr, color })
//   worker.onmessage = (e) => { const move = e.data.move; ... }

import { getAiMove } from './badukEngine.js'

self.onmessage = (e) => {
  const { board, size, strategy, prevBoardStr, color, requestId } = e.data
  try {
    const move = getAiMove(board, size, strategy, prevBoardStr, color)
    self.postMessage({ move, requestId })
  } catch (err) {
    self.postMessage({ error: err.message, requestId })
  }
}
