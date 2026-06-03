// 받아쓰기 진행/기록 저장 (localStorage)
// - 연속출석(streak), 회차별 최고 점수/완료 여부, 오답노트
const STORAGE_KEY = 'dictation-progress'

const DEFAULT_DATA = {
  streak: 0,
  lastPlayDate: null,
  totalCleared: 0,     // 만점(10/10) 받은 회차 누적 횟수
  rounds: {},          // '3-0': { best: 9, cleared: false }
  wrongNotes: [],      // { id, grade, round, idx, answer, input, date }
}

const MAX_WRONG_NOTES = 120

export function getData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const data = { ...DEFAULT_DATA, rounds: {}, wrongNotes: [] }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      return data
    }
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_DATA,
      ...parsed,
      rounds: { ...(parsed.rounds || {}) },
      wrongNotes: Array.isArray(parsed.wrongNotes) ? parsed.wrongNotes : [],
    }
  } catch {
    return { ...DEFAULT_DATA, rounds: {}, wrongNotes: [] }
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // storage full or unavailable
  }
}

// 하루 1회 출석 → 연속일 갱신 (mathStorage와 동일한 규칙)
export function updateStreak() {
  const data = getData()
  const today = new Date().toISOString().slice(0, 10)
  if (data.lastPlayDate === today) return data

  if (data.lastPlayDate) {
    const last = new Date(data.lastPlayDate)
    const now = new Date(today)
    const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) data.streak += 1
    else if (diffDays > 1) data.streak = 1
  } else {
    data.streak = 1
  }
  data.lastPlayDate = today
  saveData(data)
  return data
}

export function roundKey(grade, round) {
  return `${grade}-${round}`
}

export function getRoundRecord(grade, round) {
  const data = getData()
  return data.rounds[roundKey(grade, round)] || null
}

// 한 회차 완료 → 최고점 갱신 + 완료 표시
export function recordRound(grade, round, correct, total) {
  const data = getData()
  const key = roundKey(grade, round)
  const prev = data.rounds[key] || { best: 0, cleared: false }
  const best = Math.max(prev.best || 0, correct)
  const cleared = prev.cleared || correct === total
  if (correct === total && !prev.cleared) data.totalCleared += 1
  data.rounds[key] = { best, cleared }
  saveData(data)
  return data
}

// 오답 1건 기록 (같은 문장은 갱신)
export function addWrongNote({ grade, round, idx, answer, input }) {
  const data = getData()
  const id = `${grade}-${round}-${idx}`
  const filtered = data.wrongNotes.filter(w => w.id !== id)
  filtered.unshift({ id, grade, round, idx, answer, input, date: new Date().toISOString().slice(0, 10) })
  data.wrongNotes = filtered.slice(0, MAX_WRONG_NOTES)
  saveData(data)
  return data
}

export function getWrongNotes() {
  return getData().wrongNotes
}

export function removeWrongNote(id) {
  const data = getData()
  data.wrongNotes = data.wrongNotes.filter(w => w.id !== id)
  saveData(data)
  return data
}

export function clearWrongNotes() {
  const data = getData()
  data.wrongNotes = []
  saveData(data)
  return data
}

export function resetData() {
  const data = { ...DEFAULT_DATA, rounds: {}, wrongNotes: [] }
  saveData(data)
  return data
}
