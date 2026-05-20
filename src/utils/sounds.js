// 사운드 효과 모듈 — Web Audio API로 톤 합성 (파일 없음)
// 사용: import { playClick, playSuccess, ... } from '../utils/sounds'
// 토글: setSoundEnabled(true/false), isSoundEnabled()

const STORAGE_KEY = 'pocket-money-sound-enabled'

let audioCtx = null
let _enabled = (() => {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v !== 'false' // 기본 true
  } catch (_) { return true }
})()

function ctx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    audioCtx = new AC()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

// 단일 톤 (ADSR-lite envelope)
function tone({ freq, duration = 0.1, type = 'sine', volume = 0.2, attack = 0.005, release = 0.04, startTime = 0 }) {
  if (!_enabled) return
  const c = ctx()
  if (!c) return
  try {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = type
    const t0 = c.currentTime + startTime
    osc.frequency.setValueAtTime(freq, t0)
    gain.gain.setValueAtTime(0, t0)
    gain.gain.linearRampToValueAtTime(volume, t0 + attack)
    gain.gain.setValueAtTime(volume, t0 + duration)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration + release)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(t0)
    osc.stop(t0 + duration + release + 0.02)
  } catch (_) {}
}

// 주파수 스윕 (폭발/실패 등)
function sweep({ start, end, duration = 0.3, type = 'sawtooth', volume = 0.2 }) {
  if (!_enabled) return
  const c = ctx()
  if (!c) return
  try {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = type
    const t0 = c.currentTime
    osc.frequency.setValueAtTime(start, t0)
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), t0 + duration)
    gain.gain.setValueAtTime(volume, t0)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(t0)
    osc.stop(t0 + duration + 0.02)
  } catch (_) {}
}

// 노이즈 버스트 (지뢰 폭발 등)
function noise({ duration = 0.2, volume = 0.18, type = 'lowpass', freq = 800 }) {
  if (!_enabled) return
  const c = ctx()
  if (!c) return
  try {
    const bufferSize = Math.floor(c.sampleRate * duration)
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) // 페이드아웃
    }
    const src = c.createBufferSource()
    src.buffer = buffer
    const filter = c.createBiquadFilter()
    filter.type = type
    filter.frequency.setValueAtTime(freq, c.currentTime)
    const gain = c.createGain()
    gain.gain.setValueAtTime(volume, c.currentTime)
    src.connect(filter).connect(gain).connect(c.destination)
    src.start()
  } catch (_) {}
}

// ────────────────────────────────────────────────────────────
// 효과음 (게임 이벤트별)

// UI 탭/클릭 (짧고 부드러운 블립)
export function playClick() {
  tone({ freq: 700, duration: 0.03, type: 'sine', volume: 0.1 })
}

// 타일/돌 놓기
export function playPlace() {
  tone({ freq: 500, duration: 0.06, type: 'triangle', volume: 0.15 })
}

// 정답/성공 (밝은 상승 3음)
export function playSuccess() {
  tone({ freq: 523, duration: 0.08, type: 'triangle', volume: 0.22, startTime: 0 })       // C5
  tone({ freq: 659, duration: 0.08, type: 'triangle', volume: 0.22, startTime: 0.08 })    // E5
  tone({ freq: 784, duration: 0.14, type: 'triangle', volume: 0.22, startTime: 0.16 })    // G5
}

// 오답/실패 (하강 톤)
export function playFail() {
  sweep({ start: 380, end: 160, duration: 0.25, type: 'sawtooth', volume: 0.14 })
}

// 게임 승리 (팡파레)
export function playWin() {
  const notes = [523, 659, 784, 1047] // C, E, G, C
  notes.forEach((f, i) => tone({ freq: f, duration: 0.12, type: 'triangle', volume: 0.26, startTime: i * 0.1 }))
  tone({ freq: 784, duration: 0.3, type: 'triangle', volume: 0.2, startTime: 0.5 })
}

// 게임 패배
export function playLose() {
  const notes = [440, 392, 349, 294] // 하강 (A, G, F, D)
  notes.forEach((f, i) => tone({ freq: f, duration: 0.18, type: 'triangle', volume: 0.2, startTime: i * 0.16 }))
}

// 점수 획득 (작은 딩)
export function playScore() {
  tone({ freq: 988, duration: 0.06, type: 'sine', volume: 0.18 })
  tone({ freq: 1319, duration: 0.08, type: 'sine', volume: 0.15, startTime: 0.04 })
}

// 보물 획득 (반짝)
export function playTreasure() {
  const notes = [784, 988, 1175, 1568] // G5 B5 D6 G6
  notes.forEach((f, i) => tone({ freq: f, duration: 0.1, type: 'sine', volume: 0.22, startTime: i * 0.05 }))
}

// 지뢰 폭발
export function playMine() {
  noise({ duration: 0.4, volume: 0.25, type: 'lowpass', freq: 1200 })
  sweep({ start: 220, end: 60, duration: 0.4, type: 'sawtooth', volume: 0.18 })
}

// 무효/오류 (짧은 부저)
export function playError() {
  tone({ freq: 180, duration: 0.12, type: 'square', volume: 0.13 })
}

// 라운드 시작 (베어 알림)
export function playRoundStart() {
  tone({ freq: 660, duration: 0.08, type: 'square', volume: 0.16 })
  tone({ freq: 880, duration: 0.12, type: 'square', volume: 0.16, startTime: 0.08 })
}

// 차례 전환 (소프트 클릭)
export function playTurn() {
  tone({ freq: 480, duration: 0.05, type: 'triangle', volume: 0.12 })
}

// ────────────────────────────────────────────────────────────
// 토글 / 상태 관리

export function setSoundEnabled(v) {
  _enabled = !!v
  try { localStorage.setItem(STORAGE_KEY, v ? 'true' : 'false') } catch (_) {}
}

export function isSoundEnabled() {
  return _enabled
}

export function toggleSound() {
  setSoundEnabled(!_enabled)
  return _enabled
}
