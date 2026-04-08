const STORAGE_KEY = 'household-budget'

export const CATEGORIES = [
  { key: 'food', label: '식비', icon: '🍔', color: '#E74C3C' },
  { key: 'housing', label: '주거/관리비', icon: '🏠', color: '#3498DB' },
  { key: 'transport', label: '교통', icon: '🚗', color: '#2ECC71' },
  { key: 'education', label: '교육', icon: '📚', color: '#9B59B6' },
  { key: 'living', label: '생활용품', icon: '🛒', color: '#F39C12' },
  { key: 'leisure', label: '여가/문화', icon: '🎉', color: '#E67E22' },
  { key: 'medical', label: '의료', icon: '💊', color: '#1ABC9C' },
  { key: 'telecom', label: '통신', icon: '📱', color: '#34495E' },
  { key: 'saving', label: '저축', icon: '🏦', color: '#2980B9' },
  { key: 'etc', label: '기타', icon: '📌', color: '#95A5A6' },
]

const DEFAULT_DATA = {
  entries: [],
  budget: 0,
  fixedExpenses: [],
}

function getLocalDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function generateId() {
  return 'budget-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5)
}

export function getData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_DATA, entries: [], fixedExpenses: [] }
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_DATA,
      ...parsed,
      entries: parsed.entries || [],
      fixedExpenses: parsed.fixedExpenses || [],
    }
  } catch {
    return { ...DEFAULT_DATA, entries: [], fixedExpenses: [] }
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function addEntry(entry) {
  const data = getData()
  const newEntry = {
    id: generateId(),
    type: entry.type || 'expense', // 'income' | 'expense'
    amount: Number(entry.amount) || 0,
    category: entry.category || 'etc',
    memo: entry.memo || '',
    date: entry.date || getLocalDateStr(),
    repeat: entry.repeat || null, // null | 'monthly'
    createdAt: new Date().toISOString(),
  }
  data.entries.push(newEntry)
  saveData(data)
  return newEntry
}

export function updateEntry(id, updates) {
  const data = getData()
  const idx = data.entries.findIndex(e => e.id === id)
  if (idx >= 0) {
    if (updates.amount !== undefined) updates.amount = Number(updates.amount)
    data.entries[idx] = { ...data.entries[idx], ...updates }
    saveData(data)
    return data.entries[idx]
  }
  return null
}

export function deleteEntry(id) {
  const data = getData()
  data.entries = data.entries.filter(e => e.id !== id)
  saveData(data)
}

export function getEntriesForMonth(year, month) {
  const data = getData()
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return data.entries.filter(e => e.date && e.date.startsWith(prefix))
}

export function getMonthSummary(year, month) {
  const entries = getEntriesForMonth(year, month)
  let income = 0
  let expense = 0
  const byCategory = {}

  entries.forEach(e => {
    if (e.type === 'income') {
      income += e.amount
    } else {
      expense += e.amount
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
    }
  })

  return {
    income,
    expense,
    balance: income - expense,
    byCategory,
  }
}

export function getRecentEntries(limit = 5) {
  const data = getData()
  return [...data.entries]
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
    .slice(0, limit)
}

export function setBudget(amount) {
  const data = getData()
  data.budget = Number(amount) || 0
  saveData(data)
}

export function getBudget() {
  const data = getData()
  return data.budget || 0
}

export function setFixedExpenses(list) {
  const data = getData()
  data.fixedExpenses = list || []
  saveData(data)
}

export function getFixedExpenses() {
  const data = getData()
  return data.fixedExpenses || []
}

export function applyFixedExpenses(year, month) {
  const data = getData()
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const fixed = data.fixedExpenses || []
  if (fixed.length === 0) return

  // Check if fixed expenses already applied for this month
  const alreadyApplied = data.entries.some(
    e => e.date && e.date.startsWith(prefix) && e._fixed === true
  )
  if (alreadyApplied) return

  const dateStr = `${prefix}-01`
  fixed.forEach(f => {
    const newEntry = {
      id: generateId(),
      type: 'expense',
      amount: Number(f.amount) || 0,
      category: f.category || 'etc',
      memo: f.memo || '고정 지출',
      date: dateStr,
      repeat: null,
      _fixed: true,
      createdAt: new Date().toISOString(),
    }
    data.entries.push(newEntry)
  })
  saveData(data)
}

export function searchEntries(query) {
  if (!query || !query.trim()) return []
  const data = getData()
  const q = query.trim().toLowerCase()
  return data.entries.filter(e => e.memo && e.memo.toLowerCase().includes(q))
}

export function resetData() {
  localStorage.removeItem(STORAGE_KEY)
}
