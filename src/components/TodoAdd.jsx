import { useState } from 'react'
import { addTodo, updateTodo, deleteTodo, CATEGORIES } from '../utils/todoStorage'

const REPEAT_OPTIONS = [
  { key: null, label: '안함' },
  { key: 'daily', label: '매일' },
  { key: 'weekday', label: '매주 월~금' },
]

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

function getEndOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const day = dt.getDay()
  const sundayOffset = day === 0 ? 0 : 7 - day
  const sunday = new Date(y, m - 1, d + sundayOffset)
  return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`
}

export default function TodoAdd({ editTodo, defaultDate, onDone, onCancel }) {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const isEdit = !!editTodo

  const [title, setTitle] = useState(editTodo?.title || '')
  const [date, setDate] = useState(editTodo?.date || defaultDate || today)
  const [category, setCategory] = useState(editTodo?.category || 'etc')
  const [important, setImportant] = useState(editTodo?.important || false)
  const [repeat, setRepeat] = useState(editTodo?.repeat || null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const tomorrow = addDays(today, 1)
  const endOfWeek = getEndOfWeek(today)

  const handleSave = () => {
    if (!title.trim()) return

    if (isEdit) {
      updateTodo(editTodo.id, {
        title: title.trim(),
        date,
        category,
        important,
        repeat,
      })
    } else {
      addTodo({
        title: title.trim(),
        date,
        category,
        important,
        repeat,
      })
    }
    onDone()
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    deleteTodo(editTodo.id)
    onDone()
  }

  return (
    <div className="page fade-in">
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '20px 0 16px',
      }}>
        <button onClick={onCancel} style={{
          background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
          padding: '4px 8px', color: 'var(--brown)',
        }}>←</button>
        <h1 style={{ fontSize: 20, color: 'var(--brown)' }}>
          {isEdit ? '✏️ 할 일 수정' : '➕ 할 일 추가'}
        </h1>
      </div>

      {/* Title input */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 6, display: 'block' }}>
          할 일
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="무엇을 해야 하나요?"
          autoFocus
          style={{
            width: '100%', border: 'none', borderBottom: '2px solid #06D6A0',
            fontSize: 18, padding: '8px 0', background: 'transparent',
            color: '#333', fontFamily: 'Jua, sans-serif',
          }}
        />
      </div>

      {/* Date selection */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 10, display: 'block' }}>
          📅 날짜
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { key: today, label: '오늘' },
            { key: tomorrow, label: '내일' },
            { key: endOfWeek, label: '이번주' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => { setDate(opt.key); setShowDatePicker(false) }}
              style={{
                padding: '8px 18px', borderRadius: 20, fontSize: 14, border: 'none',
                background: date === opt.key && !showDatePicker ? '#06D6A0' : '#F0F0F0',
                color: date === opt.key && !showDatePicker ? '#FFF' : '#555',
                fontWeight: date === opt.key && !showDatePicker ? 'bold' : 'normal',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setShowDatePicker(true)}
            style={{
              padding: '8px 18px', borderRadius: 20, fontSize: 14, border: 'none',
              background: showDatePicker ? '#06D6A0' : '#F0F0F0',
              color: showDatePicker ? '#FFF' : '#555',
              cursor: 'pointer',
            }}
          >
            직접 선택
          </button>
        </div>
        {showDatePicker && (
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              marginTop: 10, padding: '8px 12px', borderRadius: 10,
              border: '2px solid #06D6A0', fontSize: 14, width: '100%',
              fontFamily: 'Jua, sans-serif',
            }}
          />
        )}
      </div>

      {/* Category grid */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 10, display: 'block' }}>
          📂 카테고리
        </label>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
        }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              style={{
                padding: '12px 8px', borderRadius: 14, border: 'none',
                background: category === cat.key ? '#E8F5E9' : '#F8F8F8',
                boxShadow: category === cat.key ? '0 0 0 2px #06D6A0' : 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 22 }}>{cat.icon}</span>
              <span style={{
                fontSize: 12,
                color: category === cat.key ? '#06D6A0' : '#666',
                fontWeight: category === cat.key ? 'bold' : 'normal',
              }}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Important toggle */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 10, display: 'block' }}>
          중요도
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setImportant(false)}
            style={{
              flex: 1, padding: '12px 8px', borderRadius: 14, border: 'none',
              background: !important ? '#F0F0F0' : '#F8F8F8',
              boxShadow: !important ? '0 0 0 2px #CCC' : 'none',
              fontSize: 14, cursor: 'pointer',
              color: !important ? '#555' : '#AAA',
            }}
          >
            ☆ 보통
          </button>
          <button
            onClick={() => setImportant(true)}
            style={{
              flex: 1, padding: '12px 8px', borderRadius: 14, border: 'none',
              background: important ? '#FFF8E1' : '#F8F8F8',
              boxShadow: important ? '0 0 0 2px #FFB300' : 'none',
              fontSize: 14, cursor: 'pointer',
              color: important ? '#F57F17' : '#AAA',
            }}
          >
            ⭐ 중요
          </button>
        </div>
      </div>

      {/* Repeat options */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 10, display: 'block' }}>
          🔁 반복
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {REPEAT_OPTIONS.map(opt => (
            <button
              key={String(opt.key)}
              onClick={() => setRepeat(opt.key)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 14, border: 'none',
                background: repeat === opt.key ? '#E8F5E9' : '#F8F8F8',
                boxShadow: repeat === opt.key ? '0 0 0 2px #06D6A0' : 'none',
                fontSize: 13, cursor: 'pointer',
                color: repeat === opt.key ? '#06D6A0' : '#888',
                fontWeight: repeat === opt.key ? 'bold' : 'normal',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!title.trim()}
        style={{
          width: '100%', padding: '16px', borderRadius: 16, border: 'none',
          background: title.trim()
            ? 'linear-gradient(135deg, #06D6A0 0%, #05B384 100%)'
            : '#DDD',
          color: title.trim() ? '#FFF' : '#AAA',
          fontSize: 17, fontWeight: 'bold', cursor: title.trim() ? 'pointer' : 'default',
          marginBottom: 12,
          boxShadow: title.trim() ? '0 4px 16px rgba(6,214,160,0.3)' : 'none',
          transition: 'all 0.2s',
        }}
      >
        {isEdit ? '수정 완료' : '추가하기'}
      </button>

      {/* Delete button (edit mode only) */}
      {isEdit && (
        <button
          onClick={handleDelete}
          style={{
            width: '100%', padding: '14px', borderRadius: 16, border: 'none',
            background: confirmDelete ? '#FF4444' : '#FFF',
            color: confirmDelete ? '#FFF' : '#FF4444',
            fontSize: 15, cursor: 'pointer',
            boxShadow: confirmDelete ? 'none' : '0 0 0 1.5px #FF4444 inset',
            marginBottom: 20,
            transition: 'all 0.2s',
          }}
        >
          {confirmDelete ? '정말 삭제할까요?' : '🗑 삭제하기'}
        </button>
      )}
    </div>
  )
}
