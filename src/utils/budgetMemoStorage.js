const STORAGE_KEY = 'budget-memos'

function loadMemos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveMemos(memos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos))
}

function nowDateString() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

export function getMemos() {
  const memos = loadMemos()
  return memos.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.updatedAt > a.updatedAt ? 1 : b.updatedAt < a.updatedAt ? -1 : 0
  })
}

export function addMemo({ title, content, pinned }) {
  const memos = loadMemos()
  const now = nowDateString()
  const memo = {
    id: Date.now(),
    title: title || '',
    content: content || '',
    pinned: !!pinned,
    createdAt: now,
    updatedAt: now,
  }
  memos.push(memo)
  saveMemos(memos)
  return memo
}

export function updateMemo(id, updates) {
  const memos = loadMemos()
  const idx = memos.findIndex(m => m.id === id)
  if (idx === -1) return null
  const now = nowDateString()
  memos[idx] = { ...memos[idx], ...updates, updatedAt: now }
  saveMemos(memos)
  return memos[idx]
}

export function deleteMemo(id) {
  const memos = loadMemos()
  const filtered = memos.filter(m => m.id !== id)
  saveMemos(filtered)
}

export function togglePin(id) {
  const memos = loadMemos()
  const idx = memos.findIndex(m => m.id === id)
  if (idx === -1) return null
  memos[idx].pinned = !memos[idx].pinned
  memos[idx].updatedAt = nowDateString()
  saveMemos(memos)
  return memos[idx]
}
