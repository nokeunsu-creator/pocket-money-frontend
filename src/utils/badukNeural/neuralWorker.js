// 신경망 AI Web Worker
// 메시지: { board, size, color, prevBoardStr, komi, simulations, timeBudgetMs, requestId }
// 응답:   { move: [r,c]|null, requestId, simulations, value }

import { neuralSearch } from './neuralMcts.js'
import { buildWeights } from './weights.js'

// 가중치는 한 번만 빌드 (재사용)
let weightsCache = null
function getWeights() {
  if (!weightsCache) weightsCache = buildWeights(20260517)
  return weightsCache
}

self.onmessage = (e) => {
  const {
    board, size, color, prevBoardStr, komi,
    simulations, timeBudgetMs, rootTopK, childTopK, rolloutDepth,
    requestId,
  } = e.data
  try {
    const weights = getWeights()
    const move = neuralSearch(
      { board, size, color, prevBoardStr: prevBoardStr || '', komi: komi ?? 6.5 },
      weights,
      {
        simulations: simulations ?? 120,
        timeBudgetMs: timeBudgetMs ?? 1800,
        rootTopK, childTopK, rolloutDepth,
      },
    )
    self.postMessage({ move, requestId })
  } catch (err) {
    self.postMessage({ error: err.message || String(err), requestId })
  }
}
