const STORAGE_KEY = 'pocket-money-todos'

const DEFAULT_DATA = {
  todos: [],
  completedHistory: [], // { id, title, completedAt }
}

// Todo object: { id, title, category, date, important, repeat, completed, completedAt, completedDates, createdAt }

export const CATEGORIES = [
  { key: 'homework', label: '숙제', icon: '📚' },
  { key: 'chore', label: '집안일', icon: '🏠' },
  { key: 'study', label: '공부', icon: '📖' },
  { key: 'goal', label: '목표', icon: '🎯' },
  { key: 'travel', label: '여행준비', icon: '🧳' },
  { key: 'etc', label: '기타', icon: '📌' },
]

export function generateId() {
  return 'todo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5)
}

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

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function addTodo(todo) {
  const data = getData()
  const newTodo = {
    id: generateId(),
    title: todo.title || '',
    category: todo.category || 'etc',
    date: todo.date || new Date().toISOString().slice(0, 10),
    important: todo.important || false,
    repeat: todo.repeat || null, // null | 'daily' | 'weekday'
    completed: false,
    completedAt: null,
    completedDates: [], // for repeat todos
    createdAt: new Date().toISOString(),
  }
  data.todos.push(newTodo)
  saveData(data)
  return newTodo
}

export function updateTodo(id, updates) {
  const data = getData()
  const idx = data.todos.findIndex(t => t.id === id)
  if (idx >= 0) {
    data.todos[idx] = { ...data.todos[idx], ...updates }
    saveData(data)
    return data.todos[idx]
  }
  return null
}

export function deleteTodo(id) {
  const data = getData()
  data.todos = data.todos.filter(t => t.id !== id)
  saveData(data)
}

export function toggleComplete(id, dateStr) {
  const data = getData()
  const todo = data.todos.find(t => t.id === id)
  if (!todo) return null

  const targetDate = dateStr || new Date().toISOString().slice(0, 10)

  if (todo.repeat) {
    // For repeat todos, toggle the date in completedDates
    if (!todo.completedDates) todo.completedDates = []
    const dateIdx = todo.completedDates.indexOf(targetDate)
    if (dateIdx >= 0) {
      todo.completedDates.splice(dateIdx, 1)
    } else {
      todo.completedDates.push(targetDate)
      // Add to history
      data.completedHistory.push({
        id: todo.id,
        title: todo.title,
        completedAt: targetDate,
      })
    }
  } else {
    // For non-repeat todos, toggle completed boolean
    todo.completed = !todo.completed
    if (todo.completed) {
      todo.completedAt = new Date().toISOString()
      data.completedHistory.push({
        id: todo.id,
        title: todo.title,
        completedAt: targetDate,
      })
    } else {
      todo.completedAt = null
    }
  }

  saveData(data)
  return todo
}

export function getTodosForDate(dateStr) {
  const data = getData()
  const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay() // 0=Sun, 1=Mon...
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5

  return data.todos.filter(todo => {
    if (todo.repeat === 'daily') return true
    if (todo.repeat === 'weekday') return isWeekday
    // Non-repeat: match exact date
    return todo.date === dateStr
  }).map(todo => {
    // For repeat todos, check if completed on this specific date
    if (todo.repeat) {
      const isCompleted = (todo.completedDates || []).includes(dateStr)
      return { ...todo, completed: isCompleted, _forDate: dateStr }
    }
    return { ...todo, _forDate: dateStr }
  })
}

export function getWeekStats() {
  // Get current week Mon-Sun
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)

  const stats = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const todos = getTodosForDate(dateStr)
    stats.push({
      date: dateStr,
      total: todos.length,
      completed: todos.filter(t => t.completed).length,
    })
  }
  return stats
}

export function resetData() {
  localStorage.removeItem(STORAGE_KEY)
}
