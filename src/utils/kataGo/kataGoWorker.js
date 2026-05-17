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
  try {
    setWasmPaths(`https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${tf.version_core}/dist/`)
    await tf.setBackend('wasm')
  } catch (e) {
    try { await tf.setBackend('cpu') } catch (_) {}
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

async function pickMove({ board, color, history, prevBoardStr, komi }) {
  const m = await getModel()
  const { bin, global } = makeInputs(board, color, history || [], komi ?? 7.5)
  const binTensor = tf.tensor(bin, [1, HW, CHANNELS], 'float32')
  const globalTensor = tf.tensor(global, [1, GLOBAL_CHANNELS], 'float32')
  const results = await m.executeAsync({
    'swa_model/bin_inputs': binTensor,
    'swa_model/global_inputs': globalTensor,
  })
  const arr = Array.isArray(results) ? results : [results]
  // results[1] = policy (361)
  const policy = arr[1]
  const flat = await policy.reshape([-1]).array()
  binTensor.dispose()
  globalTensor.dispose()
  arr.forEach(t => t.dispose())

  // top-30 후보 → 합법수 + 자살수 아닌 첫 번째
  const ranked = flat.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p).slice(0, 30)
  for (const { i } of ranked) {
    const r = Math.floor(i / SIZE)
    const c = i % SIZE
    if (board[r][c] !== null) continue
    if (!isLegal(board, r, c, color, prevBoardStr)) continue
    return [r, c]
  }
  return null // 패스
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
