// smokeRender.test.mjs 실행 준비:
// 1) .jsx를 변환하는 로더 등록
// 2) 브라우저 전용 API 스텁 (컴포넌트가 useState 초기화에서 localStorage 등을 읽는다)
// 3) Firebase 스텁 — 실제 네트워크를 타지 않게 한다

import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

// ── Vite 환경변수 (가족 실명은 VITE_*로 주입된다) ──
globalThis.__VITE_ENV__ = {
  VITE_CHILD1_NAME: '첫째',
  VITE_CHILD2_NAME: '둘째',
  VITE_MOM_NAME: '엄마',
  VITE_DAD_NAME: '아빠',
  VITE_ME_NAME: '나',
  VITE_WIFE_NAME: '아내',
  VITE_API_URL: '',
  MODE: 'test',
  DEV: false,
  PROD: true,
}

// ── localStorage ──
class MemoryStorage {
  constructor() { this.map = new Map() }
  getItem(k) { return this.map.has(String(k)) ? this.map.get(String(k)) : null }
  setItem(k, v) { this.map.set(String(k), String(v)) }
  removeItem(k) { this.map.delete(String(k)) }
  clear() { this.map.clear() }
  key(i) { return [...this.map.keys()][i] ?? null }
  get length() { return this.map.size }
}
const storage = new MemoryStorage()

// ── 최소 DOM/브라우저 스텁 ──
const noop = () => {}
const makeCanvasCtx = () => new Proxy({}, {
  get: (_t, prop) => {
    if (prop === 'canvas') return { width: 300, height: 150 }
    if (prop === 'measureText') return () => ({ width: 10 })
    if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) })
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
      return () => ({ addColorStop: noop })
    }
    return noop
  },
})

const makeElement = () => ({
  style: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  appendChild: noop, removeChild: noop, remove: noop,
  setAttribute: noop, getAttribute: () => null, removeAttribute: noop,
  addEventListener: noop, removeEventListener: noop,
  getContext: () => makeCanvasCtx(),
  getBoundingClientRect: () => ({ x: 0, y: 0, width: 300, height: 300, top: 0, left: 0, right: 300, bottom: 300 }),
  focus: noop, blur: noop, click: noop, scrollIntoView: noop,
  querySelector: () => null, querySelectorAll: () => [],
  children: [], childNodes: [], parentNode: null,
  toDataURL: () => 'data:image/png;base64,',
})

const documentStub = {
  createElement: () => makeElement(),
  createElementNS: () => makeElement(),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: noop,
  removeEventListener: noop,
  body: makeElement(),
  documentElement: makeElement(),
  head: makeElement(),
  visibilityState: 'visible',
  hidden: false,
  fonts: { ready: Promise.resolve(), load: () => Promise.resolve() },
  cookie: '',
}

class AudioContextStub {
  constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {} }
  createOscillator() { return { connect: noop, start: noop, stop: noop, frequency: { value: 0, setValueAtTime: noop }, type: 'sine' } }
  createGain() { return { connect: noop, gain: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop, linearRampToValueAtTime: noop } } }
  createBuffer() { return { getChannelData: () => new Float32Array(1) } }
  createBufferSource() { return { connect: noop, start: noop, stop: noop, buffer: null } }
  resume() { return Promise.resolve() }
  close() { return Promise.resolve() }
}

const windowStub = {
  localStorage: storage,
  sessionStorage: new MemoryStorage(),
  document: documentStub,
  location: { href: 'http://localhost/', origin: 'http://localhost', pathname: '/', search: '', hash: '' },
  navigator: { userAgent: 'node-smoke-test', language: 'ko-KR', onLine: true, serviceWorker: undefined, vibrate: noop },
  history: { pushState: noop, replaceState: noop, back: noop, state: null },
  addEventListener: noop,
  removeEventListener: noop,
  matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }),
  requestAnimationFrame: (cb) => setTimeout(() => cb(Date.now()), 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  innerWidth: 390,
  innerHeight: 844,
  devicePixelRatio: 2,
  AudioContext: AudioContextStub,
  webkitAudioContext: AudioContextStub,
  speechSynthesis: { speak: noop, cancel: noop, getVoices: () => [], addEventListener: noop, removeEventListener: noop },
  SpeechSynthesisUtterance: class { constructor(t) { this.text = t } },
  scrollTo: noop,
  alert: noop,
  confirm: () => true,
  prompt: () => null,
  Worker: class { constructor() {} postMessage() {} terminate() {} addEventListener() {} removeEventListener() {} },
}
windowStub.window = windowStub
windowStub.self = windowStub
windowStub.top = windowStub

for (const [k, v] of Object.entries(windowStub)) {
  if (!(k in globalThis)) globalThis[k] = v
}
globalThis.window = windowStub
globalThis.document = documentStub
globalThis.localStorage = storage
// node 22의 globalThis.navigator는 getter 전용이라 대입이 안 된다.
// 브라우저에만 있는 필드(serviceWorker/vibrate 등)를 쓰는 코드가 있어 defineProperty로 덮는다.
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { ...windowStub.navigator }, configurable: true, writable: true,
  })
} catch { /* 덮지 못하면 node 기본 navigator를 그대로 쓴다 */ }
windowStub.navigator = globalThis.navigator
globalThis.Image = class { constructor() { this.onload = null; this.onerror = null } set src(_v) {} }
globalThis.Audio = class { constructor() {} play() { return Promise.resolve() } pause() {} addEventListener() {} }

register(new URL('./jsxLoader.mjs', import.meta.url))
