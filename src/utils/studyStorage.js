const STORAGE_KEY = 'study-timer-data'

const SUBJECTS = [
  { key: 'korean', label: '국어', icon: '📕', color: '#E74C3C' },
  { key: 'math', label: '수학', icon: '📐', color: '#3498DB' },
  { key: 'english', label: '영어', icon: '📗', color: '#2ECC71' },
  { key: 'science', label: '과학', icon: '🔬', color: '#9B59B6' },
  { key: 'social', label: '사회', icon: '🌍', color: '#F39C12' },
  { key: 'etc', label: '기타', icon: '📚', color: '#95A5A6' },
]

function getLocalDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toDateStr(dt) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

const DEFAULT_DATA = {
  records: [],
  weeklyGoal: 120,
}

export { SUBJECTS }

export function getData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_DATA }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_DATA, ...parsed }
  } catch {
    return { ...DEFAULT_DATA }
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function addRecord(subject, minutes) {
  const data = getData()
  data.records.push({
    date: getLocalDateStr(),
    subject,
    minutes,
    createdAt: new Date().toISOString(),
  })
  saveData(data)
}

export function getTodayRecords() {
  const data = getData()
  const today = getLocalDateStr()
  return data.records.filter(r => r.date === today)
}

export function getTodayTotal() {
  const records = getTodayRecords()
  return records.reduce((sum, r) => sum + r.minutes, 0)
}

export function getWeekStats() {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset)

  const data = getData()
  const stats = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    const dateStr = toDateStr(d)
    const dayRecords = data.records.filter(r => r.date === dateStr)
    const total = dayRecords.reduce((sum, r) => sum + r.minutes, 0)

    const bySubject = {}
    for (const r of dayRecords) {
      bySubject[r.subject] = (bySubject[r.subject] || 0) + r.minutes
    }

    stats.push({ date: dateStr, total, bySubject })
  }

  return stats
}

export function getSubjectStats() {
  const weekStats = getWeekStats()
  const totals = {}

  for (const day of weekStats) {
    for (const [subject, minutes] of Object.entries(day.bySubject)) {
      totals[subject] = (totals[subject] || 0) + minutes
    }
  }

  return totals
}

export function resetData() {
  localStorage.removeItem(STORAGE_KEY)
}
