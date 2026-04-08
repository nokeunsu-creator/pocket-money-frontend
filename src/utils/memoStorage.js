const STORAGE_KEY = 'quick-memos'

function getLocalDateTimeStr() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

export const MEMO_COLORS = [
  { key: 'default', color: '#FFF', border: '#E0E0E0' },
  { key: 'red', color: '#FFEBEE', border: '#EF9A9A' },
  { key: 'yellow', color: '#FFF9C4', border: '#FFF176' },
  { key: 'green', color: '#E8F5E9', border: '#A5D6A7' },
  { key: 'blue', color: '#E3F2FD', border: '#90CAF9' },
]

export function generateId() {
  return 'memo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5)
}

function loadMemos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveMemos(memos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos))
}

function sortMemos(memos) {
  return [...memos].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

export function getMemos() {
  return sortMemos(loadMemos())
}

export function getMemo(id) {
  const memos = loadMemos()
  return memos.find(m => m.id === id) || null
}

export function addMemo(memo) {
  const memos = loadMemos()
  const now = getLocalDateTimeStr()
  const newMemo = {
    id: generateId(),
    title: memo.title || '',
    content: memo.content || '',
    color: memo.color || 'default',
    pinned: memo.pinned || false,
    createdAt: now,
    updatedAt: now,
  }
  memos.push(newMemo)
  saveMemos(memos)
  return newMemo
}

export function updateMemo(id, updates) {
  const memos = loadMemos()
  const idx = memos.findIndex(m => m.id === id)
  if (idx >= 0) {
    memos[idx] = {
      ...memos[idx],
      ...updates,
      updatedAt: getLocalDateTimeStr(),
    }
    saveMemos(memos)
    return memos[idx]
  }
  return null
}

export function deleteMemo(id) {
  const memos = loadMemos()
  const filtered = memos.filter(m => m.id !== id)
  saveMemos(filtered)
}

export function togglePin(id) {
  const memos = loadMemos()
  const memo = memos.find(m => m.id === id)
  if (memo) {
    memo.pinned = !memo.pinned
    memo.updatedAt = getLocalDateTimeStr()
    saveMemos(memos)
    return memo
  }
  return null
}

export function searchMemos(query) {
  if (!query || !query.trim()) return getMemos()
  const q = query.trim().toLowerCase()
  const memos = loadMemos()
  const filtered = memos.filter(m =>
    (m.title || '').toLowerCase().includes(q) ||
    (m.content || '').toLowerCase().includes(q)
  )
  return sortMemos(filtered)
}
