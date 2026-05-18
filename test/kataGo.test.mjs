// KataGo 워커 추론 로직 회귀 테스트 (Node)
// 실행: node test/kataGo.test.mjs
import * as tf from '@tensorflow/tfjs-core'
import '@tensorflow/tfjs-backend-cpu'
import { loadGraphModel } from '@tensorflow/tfjs-converter'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOCAL_MODEL_DIR = resolve(__dirname, '.kata-model')

// Node에서 file:// 로드를 위한 io.IOHandler
function nodeFileIOHandler(modelDir) {
  return {
    load: async () => {
      const modelJSON = JSON.parse(readFileSync(resolve(modelDir, 'model.json'), 'utf8'))
      const manifest = modelJSON.weightsManifest
      const buffers = []
      for (const group of manifest) {
        for (const path of group.paths) {
          const buf = readFileSync(resolve(modelDir, path))
          buffers.push(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
        }
      }
      // 합치기
      const total = buffers.reduce((s, b) => s + b.byteLength, 0)
      const merged = new ArrayBuffer(total)
      const view = new Uint8Array(merged)
      let off = 0
      for (const b of buffers) {
        view.set(new Uint8Array(b), off)
        off += b.byteLength
      }
      return {
        modelTopology: modelJSON.modelTopology,
        weightSpecs: manifest.flatMap(g => g.weights),
        weightData: merged,
        format: modelJSON.format,
        generatedBy: modelJSON.generatedBy,
        convertedBy: modelJSON.convertedBy,
        signature: modelJSON.signature,
        userDefinedMetadata: modelJSON.userDefinedMetadata,
      }
    },
  }
}
const SIZE = 19
const HW = SIZE * SIZE
const CHANNELS = 22
const GLOBAL_CHANNELS = 19

// ===== 워커와 동일 로직 시작 (src/utils/kataGo/kataGoWorker.js) =====
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

function removeDead(board, color) {
  const visited = new Uint8Array(HW)
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== color) continue
      const k = r * SIZE + c
      if (visited[k]) continue
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
      if (!hasLib) for (const [y, x] of group) board[y][x] = null
    }
  }
}

function boardToString(board) {
  let s = ''
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const v = board[r][c]
    s += v === 'black' ? 'B' : v === 'white' ? 'W' : '.'
  }
  return s
}

function isLegal(board, r, c, color, prevBoardStr) {
  if (board[r][c] !== null) return false
  const opp = color === 'black' ? 'white' : 'black'
  const next = board.map(row => row.slice())
  next[r][c] = color
  removeDead(next, opp)
  const libs = countLiberties(next, r, c)
  if (libs === 0) return false
  if (prevBoardStr) {
    const str = boardToString(next)
    if (str === prevBoardStr) return false
  }
  return true
}

async function pickMove(model, { board, color, history, prevBoardStr, komi }) {
  const { bin, global } = makeInputs(board, color, history || [], komi ?? 7.5)
  const binTensor = tf.tensor(bin, [1, HW, CHANNELS], 'float32')
  const globalTensor = tf.tensor(global, [1, GLOBAL_CHANNELS], 'float32')
  const results = await model.executeAsync({
    'swa_model/bin_inputs': binTensor,
    'swa_model/global_inputs': globalTensor,
  })
  const arr = Array.isArray(results) ? results : [results]
  let policy = arr.find(t => t && t.size === 724) || arr[1] || arr[0]
  const flatTensor = tf.reshape(policy, [-1])
  const flat = await flatTensor.array()
  flatTensor.dispose()
  binTensor.dispose()
  globalTensor.dispose()
  arr.forEach(t => t.dispose())

  const boardLogits = flat.slice(0, HW)
  const ranked = boardLogits
    .map((p, i) => ({ p, i }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 30)
  const top3 = ranked.slice(0, 3).map(({ p, i }) => ({
    p: Number(p.toFixed(3)),
    r: Math.floor(i / SIZE),
    c: i % SIZE,
  }))
  for (const { i } of ranked) {
    const r = Math.floor(i / SIZE)
    const c = i % SIZE
    if (board[r][c] !== null) continue
    if (!isLegal(board, r, c, color, prevBoardStr)) continue
    return { move: [r, c], top3, arrInfo: arr.map((t, idx) => `[${idx}]size=${t.size}shape=${JSON.stringify(t.shape)}`) }
  }
  return { move: null, top3, arrInfo: arr.map((t, idx) => `[${idx}]size=${t.size}shape=${JSON.stringify(t.shape)}`) }
}
// ===== 워커 동일 로직 끝 =====

function createBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
}

function play(board, r, c, color) {
  const b = board.map(row => row.slice())
  b[r][c] = color
  removeDead(b, color === 'black' ? 'white' : 'black')
  return b
}

async function main() {
  await tf.setBackend('cpu')
  await tf.ready()
  console.log(`[backend] ${tf.getBackend()}`)
  console.log('[load] loading model from local file://')
  const model = await loadGraphModel(nodeFileIOHandler(LOCAL_MODEL_DIR))
  console.log('[load] model ready')

  let pass = 0
  let fail = 0

  // 5개 보드 시나리오: 흑이 둔 직후 → AI(백)가 응수
  const cases = [
    { name: '#1 빈판 + 흑 D4', moves: [[3, 3]] },
    { name: '#2 빈판 + 흑 천원',  moves: [[9, 9]] },
    { name: '#3 흑 D4, 백 Q16, 흑 D16 (백 차례)', moves: [[3, 3], [15, 15], [3, 15]] }, // 짝수 길이여야 백 차례... 실제로는 history만 보고 turn은 항상 white로 설정
    { name: '#4 흑 D4, 백 Q4', moves: [[3, 3], [3, 15]] },
    { name: '#5 4귀 + 백 응수 차례', moves: [[3, 3], [3, 15], [15, 15], [15, 3]] },
  ]

  for (const { name, moves } of cases) {
    let board = createBoard()
    const history = []
    for (let i = 0; i < moves.length; i++) {
      const [r, c] = moves[i]
      const color = i % 2 === 0 ? 'black' : 'white'
      board = play(board, r, c, color)
      history.push({ r, c, color })
    }
    const prevBoardStr = moves.length >= 2 ? boardToString(play(createBoard(), moves[0][0], moves[0][1], 'black')) : ''
    const result = await pickMove(model, {
      board,
      color: 'white',
      history,
      prevBoardStr,
      komi: 7.5,
    })
    const ok = result.move !== null
    const moveStr = ok ? `[${result.move[0]},${result.move[1]}]` : 'PASS(null)'
    const top3Str = result.top3.map(t => `(${t.r},${t.c})=${t.p}`).join(' ')
    console.log(`${ok ? '✓ PASS' : '✗ FAIL'} ${name} → AI plays ${moveStr}, top3 ${top3Str}`)
    if (ok) pass++; else fail++
  }

  console.log(`\n결과: ${pass}/${pass + fail} 성공`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch(e => {
  console.error('테스트 오류:', e)
  process.exit(2)
})
