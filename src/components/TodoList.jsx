import { useState, useEffect, useCallback } from 'react'
import { getTodosForDate, getWeekStats, toggleComplete, deleteTodo, CATEGORIES } from '../utils/todoStorage'
import TodoAdd from './TodoAdd'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']
const DAY_NAMES_SHORT = ['월', '화', '수', '목', '금', '토', '일']

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${DAY_NAMES[d.getDay()]}`
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function getEndOfWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const sundayOffset = day === 0 ? 0 : 7 - day
  const sunday = new Date(d)
  sunday.setDate(d.getDate() + sundayOffset)
  return sunday.toISOString().slice(0, 10)
}

function getCategoryIcon(key) {
  const cat = CATEGORIES.find(c => c.key === key)
  return cat ? cat.icon : '📌'
}

export default function TodoList({ onBack }) {
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [showAdd, setShowAdd] = useState(false)
  const [editTodo, setEditTodo] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [collapsed, setCollapsed] = useState({ tomorrow: true, week: true, stats: true })
  const [animatingId, setAnimatingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  // Get todos for selected date, tomorrow, and rest of week
  const todayTodos = getTodosForDate(selectedDate)
  const tomorrowDate = addDays(selectedDate, 1)
  const tomorrowTodos = getTodosForDate(tomorrowDate)
  const endOfWeek = getEndOfWeek(selectedDate)

  // Rest of week (after tomorrow until Sunday)
  const weekTodos = []
  const dayAfterTomorrow = addDays(selectedDate, 2)
  if (dayAfterTomorrow <= endOfWeek) {
    let d = dayAfterTomorrow
    while (d <= endOfWeek) {
      const todos = getTodosForDate(d)
      if (todos.length > 0) {
        weekTodos.push({ date: d, todos })
      }
      d = addDays(d, 1)
    }
  }

  // Sort: important first, then incomplete, then completed
  const sortTodos = (list) => {
    return [...list].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      if (a.important !== b.important) return a.important ? -1 : 1
      return 0
    })
  }

  const sortedToday = sortTodos(todayTodos)
  const completedCount = todayTodos.filter(t => t.completed).length
  const totalCount = todayTodos.length
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  // Weekly stats
  const weekStats = getWeekStats()
  const weekTotal = weekStats.reduce((s, d) => s + d.total, 0)
  const weekCompleted = weekStats.reduce((s, d) => s + d.completed, 0)
  const weekPct = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0

  // Consecutive perfect days
  let perfectStreak = 0
  for (let i = weekStats.length - 1; i >= 0; i--) {
    const s = weekStats[i]
    if (s.date > today) continue
    if (s.total > 0 && s.completed === s.total) perfectStreak++
    else if (s.total > 0) break
  }

  const handleToggle = (id, dateStr) => {
    setAnimatingId(id)
    toggleComplete(id, dateStr)
    refresh()
    setTimeout(() => setAnimatingId(null), 400)
  }

  const handleDelete = (id) => {
    setDeletingId(id)
    setTimeout(() => {
      deleteTodo(id)
      setDeletingId(null)
      refresh()
    }, 300)
  }

  const prevDay = () => setSelectedDate(d => addDays(d, -1))
  const nextDay = () => setSelectedDate(d => addDays(d, 1))

  const toggleSection = (key) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (showAdd || editTodo) {
    return (
      <TodoAdd
        editTodo={editTodo}
        defaultDate={selectedDate}
        onDone={() => { setShowAdd(false); setEditTodo(null); refresh() }}
        onCancel={() => { setShowAdd(false); setEditTodo(null) }}
      />
    )
  }

  const maxBarHeight = 60
  const maxBar = Math.max(...weekStats.map(s => s.total), 1)

  return (
    <div className="page fade-in">
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #06D6A0 0%, #05B384 100%)',
        borderRadius: 20,
        padding: '20px 20px 18px',
        marginBottom: 16,
        marginTop: 12,
        color: '#FFF',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -10, right: -5,
          fontSize: 60, opacity: 0.12, transform: 'rotate(10deg)',
        }}>✅</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <button onClick={onBack} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 12,
            padding: '4px 10px', fontSize: 16, color: '#FFF', cursor: 'pointer',
          }}>←</button>
          <h1 style={{ fontSize: 20, fontWeight: 'bold' }}>✅ 할 일</h1>
        </div>

        {/* Date navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <button onClick={prevDay} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10,
            padding: '6px 12px', fontSize: 16, color: '#FFF', cursor: 'pointer',
          }}>{'<'}</button>
          <span style={{ fontSize: 17, fontWeight: 'bold', minWidth: 140, textAlign: 'center' }}>
            {formatDate(selectedDate)}
          </span>
          <button onClick={nextDay} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10,
            padding: '6px 12px', fontSize: 16, color: '#FFF', cursor: 'pointer',
          }}>{'>'}</button>
        </div>
        {selectedDate === today && (
          <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.8, marginTop: 4 }}>오늘</div>
        )}
      </div>

      {/* Progress bar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: '#555' }}>
            오늘 <b style={{ color: '#06D6A0' }}>{completedCount}</b>/{totalCount} 완료
          </span>
          {totalCount > 0 && completedCount === totalCount && (
            <span style={{ fontSize: 13 }}>🎉 완벽해요!</span>
          )}
        </div>
        <div style={{
          background: '#EEF7F3', borderRadius: 10, height: 12, overflow: 'hidden',
        }}>
          <div style={{
            background: 'linear-gradient(90deg, #06D6A0, #05B384)',
            height: '100%',
            borderRadius: 10,
            width: `${progressPct}%`,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Today section */}
      <div style={{ marginBottom: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 4px 6px', fontSize: 15, fontWeight: 'bold', color: 'var(--brown)',
        }}>
          <span>📋 오늘</span>
          <span style={{ fontSize: 12, color: 'var(--gray)' }}>{todayTodos.length}개</span>
        </div>
        {sortedToday.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '28px 20px', color: 'var(--gray)' }}>
            <div style={{ fontSize: 36, marginBottom: 6 }}>📭</div>
            <p style={{ fontFamily: 'Gaegu, cursive', fontSize: 16 }}>할 일이 없어요!</p>
          </div>
        ) : (
          sortedToday.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              animating={animatingId === todo.id}
              deleting={deletingId === todo.id}
              onToggle={() => handleToggle(todo.id, selectedDate)}
              onDelete={() => handleDelete(todo.id)}
              onEdit={() => setEditTodo(todo)}
            />
          ))
        )}
      </div>

      {/* Tomorrow section */}
      {tomorrowTodos.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => toggleSection('tomorrow')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
              padding: '10px 4px 6px', fontSize: 15, fontWeight: 'bold', color: 'var(--brown)',
              background: 'none',
            }}
          >
            <span>📅 내일</span>
            <span style={{ fontSize: 12, color: 'var(--gray)' }}>
              {tomorrowTodos.length}개 {collapsed.tomorrow ? '▸' : '▾'}
            </span>
          </button>
          {!collapsed.tomorrow && tomorrowTodos.map(todo => (
            <TodoItem
              key={todo.id + '-tmr'}
              todo={todo}
              animating={false}
              deleting={false}
              onToggle={() => handleToggle(todo.id, tomorrowDate)}
              onDelete={() => handleDelete(todo.id)}
              onEdit={() => setEditTodo(todo)}
              dimmed
            />
          ))}
        </div>
      )}

      {/* This week section */}
      {weekTodos.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => toggleSection('week')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
              padding: '10px 4px 6px', fontSize: 15, fontWeight: 'bold', color: 'var(--brown)',
              background: 'none',
            }}
          >
            <span>📆 이번 주</span>
            <span style={{ fontSize: 12, color: 'var(--gray)' }}>
              {weekTodos.reduce((s, d) => s + d.todos.length, 0)}개 {collapsed.week ? '▸' : '▾'}
            </span>
          </button>
          {!collapsed.week && weekTodos.map(group => (
            <div key={group.date}>
              <div style={{ fontSize: 12, color: 'var(--gray)', padding: '8px 4px 2px' }}>
                {formatDate(group.date)}
              </div>
              {group.todos.map(todo => (
                <TodoItem
                  key={todo.id + '-' + group.date}
                  todo={todo}
                  animating={false}
                  deleting={false}
                  onToggle={() => handleToggle(todo.id, group.date)}
                  onDelete={() => handleDelete(todo.id)}
                  onEdit={() => setEditTodo(todo)}
                  dimmed
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Weekly stats */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => toggleSection('stats')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
            padding: '10px 4px 6px', fontSize: 15, fontWeight: 'bold', color: 'var(--brown)',
            background: 'none',
          }}
        >
          <span>📊 이번 주 통계</span>
          <span style={{ fontSize: 12, color: 'var(--gray)' }}>{collapsed.stats ? '▸' : '▾'}</span>
        </button>
        {!collapsed.stats && (
          <div className="card" style={{ padding: '18px 16px' }}>
            {/* Bar chart */}
            <div style={{
              display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
              height: maxBarHeight + 30, marginBottom: 14,
            }}>
              {weekStats.map((s, i) => {
                const barH = s.total > 0 ? (s.total / maxBar) * maxBarHeight : 4
                const completedH = s.total > 0 ? (s.completed / maxBar) * maxBarHeight : 0
                const isToday = s.date === today
                return (
                  <div key={s.date} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1,
                  }}>
                    <span style={{ fontSize: 10, color: '#999' }}>
                      {s.total > 0 ? `${s.completed}/${s.total}` : '-'}
                    </span>
                    <div style={{
                      width: 24, height: barH, borderRadius: 6,
                      background: '#E8F5E9', position: 'relative', overflow: 'hidden',
                    }}>
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        height: completedH, borderRadius: 6,
                        background: isToday
                          ? 'linear-gradient(180deg, #06D6A0, #05B384)'
                          : '#A5D6A7',
                        transition: 'height 0.5s ease',
                      }} />
                    </div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: isToday ? 'bold' : 'normal',
                      color: isToday ? '#06D6A0' : '#888',
                    }}>
                      {DAY_NAMES_SHORT[i]}
                    </span>
                  </div>
                )
              })}
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#555',
            }}>
              <span>이번 주 완료율: <b style={{ color: '#06D6A0' }}>{weekPct}%</b></span>
              <span>연속 완벽한 날: <b style={{ color: '#FF9800' }}>{perfectStreak}일</b></span>
            </div>
          </div>
        )}
      </div>

      {/* Floating add button */}
      <button
        onClick={() => setShowAdd(true)}
        style={{
          position: 'fixed',
          bottom: 28,
          right: 'calc(50% - 200px)',
          width: 56, height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #06D6A0, #05B384)',
          color: '#FFF',
          fontSize: 28,
          border: 'none',
          boxShadow: '0 4px 16px rgba(6,214,160,0.4)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50,
          transition: 'transform 0.15s',
        }}
        onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.9)' }}
        onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        +
      </button>
    </div>
  )
}

function TodoItem({ todo, animating, deleting, onToggle, onDelete, onEdit, dimmed }) {
  return (
    <div
      className="card"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', marginBottom: 8,
        opacity: deleting ? 0 : dimmed ? 0.7 : todo.completed ? 0.55 : 1,
        transition: 'opacity 0.3s, transform 0.3s',
        transform: deleting ? 'translateX(60px)' : 'none',
        cursor: 'pointer',
      }}
      onClick={onEdit}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        style={{
          width: 28, height: 28, borderRadius: '50%',
          border: todo.completed ? 'none' : '2.5px solid #CCC',
          background: todo.completed ? '#06D6A0' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: '#FFF', flexShrink: 0,
          transition: 'transform 0.2s, background 0.2s',
          transform: animating ? 'scale(1.3)' : 'scale(1)',
        }}
      >
        {todo.completed ? '✓' : ''}
      </button>

      {/* Category icon */}
      <span style={{ fontSize: 18, flexShrink: 0 }}>{getCategoryIcon(todo.category)}</span>

      {/* Title */}
      <span style={{
        flex: 1, fontSize: 15,
        textDecoration: todo.completed ? 'line-through' : 'none',
        color: todo.completed ? '#AAA' : '#333',
      }}>
        {todo.title}
      </span>

      {/* Badges */}
      {todo.important && <span style={{ fontSize: 14 }}>⭐</span>}
      {todo.repeat && <span style={{ fontSize: 13 }}>🔁</span>}

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        style={{
          background: 'none', border: 'none', fontSize: 16,
          color: '#CCC', padding: '2px 4px', cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}
