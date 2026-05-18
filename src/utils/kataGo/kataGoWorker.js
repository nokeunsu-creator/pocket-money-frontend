// KataGo (b10c128) TF.js Worker — 19x19 전용
// 메시지:
//   { type: 'preload', requestId }                                       → 모델 미리 로드
//   { type: 'move', board, color, history, prevBoardStr, komi, requestId } → 한 수 추천
// 응답:
//   { type: 'progress', stage, requestId }   ('backend-ready'|'model-loading'|'model-ready')
//   { type: 'ready', requestId }
//   { type: 'move', move: [r,c]|null, requestId }
//   { type: 'error', error, requestId }

import * as tf from '@tensorflow/tfjs-core'
import { loadGraphModel } from '@tensorflow/tfjs-converter'
import '@tensorflow/tfjs-backend-cpu'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import '@tensorflow/tfjs-backend-wasm'

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/maksimKorzh/kata-model-js@main/model/b10c128-s1141046784-d204142634/model.json'
const SIZE = 19
const HW = SIZE * SIZE
const CHANNELS = 22
const GLOBAL_CHANNELS = 19

let model = null
let loadingPromise = null

async function ensureBackend() {
  // 레퍼런스 구현(maksimKorzh/kata-model-js)이 CPU 백엔드 전용으로 검증되어 있어
  // WASM에서 일부 op이 누락되거나 executeAsync가 실패해 매번 패스로 떨어지는 사례가 있음.
  // 안정성 우선 → CPU 먼저 시도, 그 다음 WASM 폴백.
  try {
    await tf.setBackend('cpu')
  } catch (e) {
    try {
      setWasmPaths(`https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${tf.version_core}/dist/`)
      await tf.setBackend('wasm')
    } catch (_) {}
  }
  await tf.ready()
}

async function getModel(progressCb) {
  if (model) return model
  if (loadingPromise) return loadingPromise
  loadingPromise = (async () => {
    await ensureBackend()
    progressCb?.('backend-ready')
    progressCb?.('model-loading')
    model = await loadGraphModel(MODEL_URL)
    progressCb?.('model-ready')
    return model
  })()
  return loadingPromise
}

function countLiberties(board, r, c) {
  const color = board[r][c]
  if (!color) return 0
  const visited = new Uint8Array(HW)
  const stack = [[r, c]]
  const libs = new Set()
  while (stack.length) {
    const [y, x] = stack.pop()
    const k = y * SIZE + x
    if (visited[k]) continue
    visited[k] = 1
    for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const ny = y + dy, nx = x + dx
      if (ny < 0 || ny >= SIZE || nx < 0 || nx >= SIZE) continue
      const v = board[ny][nx]
      if (v === null) libs.add(ny * SIZE + nx)
      else if (v === color) stack.push([ny, nx])
    }
  }
  return libs.size
}

// board: 2D[19][19] 'black'|'white'|null,  color: AI 색
// history: [{r,c,color,pass?}] — 가장 최근이 마지막
function makeInputs(board, color, history, komi) {
  const opp = color === 'black' ? 'white' : 'black'
  const bin = new Float32Array(HW * CHANNELS)
  const global = new Float32Array(GLOBAL_CHANNELS)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const base = (y * SIZE + x) * CHANNELS
      bin[base + 0] = 1.0
      const v = board[y][x]
      if (v === color) bin[base + 1] = 1.0
      else if (v === opp) bin[base + 2] = 1.0
      if (v) {
        const libs = countLiberties(board, y, x)
        if (libs === 1) bin[base + 3] = 1.0
        else if (libs === 2) bin[base + 4] = 1.0
        else if (libs === 3) bin[base + 5] = 1.0
      }
    }
  }
  // ko 채널 (6) — 직접 추적 안 함, 0 유지
  // 이전 5수: ch 9~13 (최근 → 과거)
  const chs = [9, 10, 11, 12, 13]
  for (let i = 0; i < Math.min(5, history.length); i++) {
    const h = history[history.length - 1 - i]
    if (!h) continue
    if (h.pass) {
      global[i] = 1.0
    } else {
      const base = (h.r * SIZE + h.c) * CHANNELS
      bin[base + chs[i]] = 1.0
    }
  }
  const selfKomi = color === 'white' ? komi + 1 : -komi
  global[5] = selfKomi / 20.0
  return { bin, global }
}

let loggedShapes = false

// 단 → { topK, temperature }
// 9단: 정책망 top-1 (모델 자연 상한 ~ 실제 1~2단)
// 1단: top-50을 높은 온도로 거의 무작위 선택
const LEVEL_TABLE = {
  9: { topK: 1,  temp: 0 },
  8: { topK: 3,  temp: 0.5 },
  7: { topK: 5,  temp: 0.8 },
  6: { topK: 8,  temp: 1.2 },
  5: { topK: 12, temp: 1.5 },
  4: { topK: 18, temp: 2.0 },
  3: { topK: 25, temp: 2.5 },
  2: { topK: 35, temp: 3.0 },
  1: { topK: 50, temp: 4.0 },
}

function pickFromCandidates(candidates, temp) {
  if (candidates.length === 0) return null
  if (candidates.length === 1 || temp <= 0) {
    return [candidates[0].r, candidates[0].c]
  }
  // softmax(weight = (p - max) / temp)
  const maxP = candidates[0].p
  const weights = candidates.map(({ p }) => Math.exp((p - maxP) / temp))
  const sum = weights.reduce((a, b) => a + b, 0)
  if (!isFinite(sum) || sum <= 0) return [candidates[0].r, candidates[0].c]
  let rand = Math.random() * sum
  for (let k = 0; k < candidates.length; k++) {
    rand -= weights[k]
    if (rand <= 0) return [candidates[k].r, candidates[k].c]
  }
  return [candidates[0].r, candidates[0].c]
}

async function pickMove({ board, color, history, prevBoardStr, komi, level }) {
  const m = await getModel()
  const { bin, global } = makeInputs(board, color, history || [], komi ?? 7.5)
  const binTensor = tf.tensor(bin, [1, HW, CHANNELS], 'float32')
  const globalTensor = tf.tensor(global, [1, GLOBAL_CHANNELS], 'float32')
  const results = await m.executeAsync({
    'swa_model/bin_inputs': binTensor,
    'swa_model/global_inputs': globalTensor,
  })
  const arr = Array.isArray(results) ? results : [results]

  // KataGo 출력 시그니처 (4개):
  //   [0] ownership_output  shape [1, 19, 19]   size 361
  //   [1] policy_output     shape [1, 2, 362]   size 724  ← 이걸 써야 함
  //   [2] miscvalues_output shape [1, 10]       size 10
  //   [3] value_output      shape [1, 3]        size 3
  // policy는 두 head(메인, 상대) × 362 위치. 메인 head의 보드 영역(인덱스 0~360)만 사용.
  // 자동감지: size 724인 텐서를 우선, 없으면 arr[1] 폴백
  let policy = arr.find(t => t.size === 724) || arr[1] || arr[0]

  if (!loggedShapes) {
    loggedShapes = true
    const shapes = arr.map((t, i) => `[${i}]=${JSON.stringify(t.shape)}(size=${t.size})`).join(', ')
    // eslint-disable-next-line no-console
    console.log(`[KataGo] backend=${tf.getBackend()} outputs: ${shapes}`)
  }

  // 주의: @tensorflow/tfjs-core만 import하면 Tensor.prototype.reshape이 없음.
  // namespaced tf.reshape를 사용해야 함. (예전엔 매번 TypeError → JSX가 패스로 폴백 → "백이 계속 패스" 버그)
  const flatTensor = tf.reshape(policy, [-1])
  const flat = await flatTensor.array()
  flatTensor.dispose()
  binTensor.dispose()
  globalTensor.dispose()
  arr.forEach(t => t.dispose())

  // 메인 정책 head의 보드 영역만 [0..360]. 361은 메인 pass, 362+는 상대 head라 제외.
  const boardLogits = flat.slice(0, HW)

  // 단(난이도) 결정: 1~9. 기본 9단 (top-1 greedy).
  const lvl = Math.max(1, Math.min(9, Number(level) || 9))
  const cfg = LEVEL_TABLE[lvl]

  // 합법수 + 자살수 아닌 후보를 정책 순으로 최대 topK개까지 수집
  const sortedAll = boardLogits
    .map((p, i) => ({ p, i }))
    .sort((a, b) => b.p - a.p)
  const candidates = []
  for (const { p, i } of sortedAll) {
    if (candidates.length >= cfg.topK) break
    const r = Math.floor(i / SIZE)
    const c = i % SIZE
    if (board[r][c] !== null) continue
    if (!isLegal(board, r, c, color, prevBoardStr)) continue
    candidates.push({ p, i, r, c })
  }
  if (candidates.length === 0) return null // 합법수 없음 → 패스

  return pickFromCandidates(candidates, cfg.temp)
}

// 자살수/패 검증 — badukEngine과 호환되게 단순화
function isLegal(board, r, c, color, prevBoardStr) {
  if (board[r][c] !== null) return false
  const opp = color === 'black' ? 'white' : 'black'
  // 가상으로 두기
  const next = board.map(row => row.slice())
  next[r][c] = color
  // 상대 죽음 처리
  const captured = removeDead(next, opp)
  // 자기 group liberty 체크
  const libs = countLiberties(next, r, c)
  if (libs === 0) return false // 자살수
  // 패 (단일 돌 잡은 직후 같은 모양 반복)
  if (prevBoardStr) {
    const str = boardToString(next)
    if (str === prevBoardStr) return false
  }
  return true
  // captured 변수 사용 안 함 — eslint 무시
}

function removeDead(board, color) {
  let captured = 0
  const visited = new Uint8Array(HW)
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== color) continue
      const k = r * SIZE + c
      if (visited[k]) continue
      // BFS
      const group = []
      const stack = [[r, c]]
      let hasLib = false
      const seen = new Uint8Array(HW)
      while (stack.length) {
        const [y, x] = stack.pop()
        const kk = y * SIZE + x
        if (seen[kk]) continue
        seen[kk] = 1
        group.push([y, x])
        for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const ny = y + dy, nx = x + dx
          if (ny < 0 || ny >= SIZE || nx < 0 || nx >= SIZE) continue
          const v = board[ny][nx]
          if (v === null) hasLib = true
          else if (v === color && !seen[ny * SIZE + nx]) stack.push([ny, nx])
        }
      }
      for (const [y, x] of group) visited[y * SIZE + x] = 1
      if (!hasLib) {
        for (const [y, x] of group) { board[y][x] = null; captured++ }
      }
    }
  }
  return captured
}

function boardToString(board) {
  let s = ''
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = board[r][c]
      s += v === 'black' ? 'B' : v === 'white' ? 'W' : '.'
    }
  }
  return s
}

self.onmessage = async (e) => {
  const { type, requestId } = e.data
  const reply = (msg) => self.postMessage({ ...msg, requestId })
  try {
    if (type === 'preload') {
      await getModel((stage) => reply({ type: 'progress', stage }))
      reply({ type: 'ready' })
      return
    }
    if (type === 'move') {
      const move = await pickMove(e.data)
      reply({ type: 'move', move })
      return
    }
  } catch (err) {
    reply({ type: 'error', error: err?.message || String(err) })
  }
}
