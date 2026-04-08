import { useState } from 'react'
import { addEntry, updateEntry, deleteEntry, CATEGORIES } from '../utils/budgetStorage'

const INCOME_CATS = [
  { key: 'salary', label: '월급', icon: '💵' },
  { key: 'side', label: '부수입', icon: '💰' },
  { key: 'allowance', label: '용돈', icon: '🎁' },
  { key: 'etc', label: '기타', icon: '📌' },
]

const REPEAT_OPTIONS = [
  { key: null, label: '안함' },
  { key: 'monthly', label: '매월' },
]

function formatAmount(num) { return num.toLocaleString() }
function parseAmount(str) { return parseInt(str.replace(/[^0-9]/g, '')) || 0 }

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getYesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function BudgetAdd({ editEntry: editEntryProp, defaultDate, onDone, onCancel }) {
  const today = getToday()
  const yesterday = getYesterday()
  const isEdit = !!editEntryProp

  const [type, setType] = useState(editEntryProp?.type || 'expense')
  const [amountStr, setAmountStr] = useState(
    editEntryProp ? formatAmount(editEntryProp.amount) : ''
  )
  const [category, setCategory] = useState(editEntryProp?.category || (type === 'income' ? 'etc' : ''))
  const [memo, setMemo] = useState(editEntryProp?.memo || '')
  const [date, setDate] = useState(editEntryProp?.date || defaultDate || today)
  const [repeat, setRepeat] = useState(editEntryProp?.repeat || null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const amount = parseAmount(amountStr)
  const isExpense = type === 'expense'
  const accentColor = isExpense ? '#E74C3C' : '#2ECC71'
  const accentGradient = isExpense
    ? 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)'
    : 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)'

  const cats = isExpense ? CATEGORIES : INCOME_CATS

  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    if (!raw) {
      setAmountStr('')
      return
    }
    setAmountStr(formatAmount(parseInt(raw)))
  }

  const handleTypeChange = (newType) => {
    setType(newType)
    if (newType === 'income' && !INCOME_CATS.find(c => c.key === category)) {
      setCategory('etc')
    } else if (newType === 'expense' && !CATEGORIES.find(c => c.key === category)) {
      setCategory('')
    }
  }

  const canSave = amount > 0 && (isExpense ? !!category : true)

  const handleSave = () => {
    if (!canSave) return

    const entryData = {
      type,
      amount,
      category: category || 'etc',
      memo: memo.trim(),
      date,
      repeat,
    }

    if (isEdit) {
      updateEntry(editEntryProp.id, entryData)
    } else {
      addEntry(entryData)
    }
    onDone()
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    deleteEntry(editEntryProp.id)
    onDone()
  }

  return (
    <div className="page fade-in" style={{ maxWidth: 480, margin: '0 auto' }}>
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
          {isEdit ? '✏️ 기록 수정' : '➕ 기록 추가'}
        </h1>
      </div>

      {/* Type toggle */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 12 }}>
        <div style={{
          display: 'flex', borderRadius: 14, overflow: 'hidden',
          background: '#F0F0F0',
        }}>
          <button
            onClick={() => handleTypeChange('expense')}
            style={{
              flex: 1, padding: '12px 0', border: 'none', fontSize: 15,
              fontWeight: 'bold', cursor: 'pointer',
              background: isExpense ? '#E74C3C' : 'transparent',
              color: isExpense ? '#FFF' : '#888',
              transition: 'all 0.2s',
              borderRadius: isExpense ? 14 : 0,
            }}
          >
            지출 {isExpense ? '●' : '○'}
          </button>
          <button
            onClick={() => handleTypeChange('income')}
            style={{
              flex: 1, padding: '12px 0', border: 'none', fontSize: 15,
              fontWeight: 'bold', cursor: 'pointer',
              background: !isExpense ? '#2ECC71' : 'transparent',
              color: !isExpense ? '#FFF' : '#888',
              transition: 'all 0.2s',
              borderRadius: !isExpense ? 14 : 0,
            }}
          >
            수입 {!isExpense ? '●' : '○'}
          </button>
        </div>
      </div>

      {/* Amount input */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 6, display: 'block' }}>
          💰 금액
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="text"
            inputMode="numeric"
            value={amountStr}
            onChange={handleAmountChange}
            placeholder="0"
            autoFocus
            style={{
              flex: 1, minWidth: 0, border: 'none', borderBottom: `2px solid ${accentColor}`,
              fontSize: 22, padding: '8px 0', background: 'transparent',
              color: '#333', fontFamily: 'Jua, sans-serif',
              textAlign: 'right', maxWidth: '100%',
            }}
          />
          <span style={{ fontSize: 16, color: '#888', fontWeight: 'bold', flexShrink: 0 }}>원</span>
        </div>
      </div>

      {/* Category grid */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 10, display: 'block' }}>
          📂 카테고리
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isExpense ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)',
          gap: 8,
        }}>
          {cats.map(cat => {
            const selected = category === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                style={{
                  padding: '12px 4px', borderRadius: 14, border: 'none',
                  background: selected ? (isExpense ? '#FDEDEC' : '#E8F8F0') : '#F8F8F8',
                  boxShadow: selected ? `0 0 0 2px ${accentColor}` : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 22 }}>{cat.icon}</span>
                <span style={{
                  fontSize: 11,
                  color: selected ? accentColor : '#666',
                  fontWeight: selected ? 'bold' : 'normal',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}>
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Memo input */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 6, display: 'block' }}>
          📝 메모
        </label>
        <input
          type="text"
          value={memo}
          onChange={e => setMemo(e.target.value)}
          placeholder="메모 (선택)"
          style={{
            width: '100%', border: 'none', borderBottom: '2px solid #DDD',
            fontSize: 16, padding: '8px 0', background: 'transparent',
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
          <button
            onClick={() => { setDate(today); setShowDatePicker(false) }}
            style={{
              padding: '8px 18px', borderRadius: 20, fontSize: 14, border: 'none',
              background: date === today && !showDatePicker ? accentColor : '#F0F0F0',
              color: date === today && !showDatePicker ? '#FFF' : '#555',
              fontWeight: date === today && !showDatePicker ? 'bold' : 'normal',
              cursor: 'pointer',
            }}
          >
            오늘
          </button>
          <button
            onClick={() => { setDate(yesterday); setShowDatePicker(false) }}
            style={{
              padding: '8px 18px', borderRadius: 20, fontSize: 14, border: 'none',
              background: date === yesterday && !showDatePicker ? accentColor : '#F0F0F0',
              color: date === yesterday && !showDatePicker ? '#FFF' : '#555',
              fontWeight: date === yesterday && !showDatePicker ? 'bold' : 'normal',
              cursor: 'pointer',
            }}
          >
            어제
          </button>
          <button
            onClick={() => setShowDatePicker(true)}
            style={{
              padding: '8px 18px', borderRadius: 20, fontSize: 14, border: 'none',
              background: showDatePicker ? accentColor : '#F0F0F0',
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
              border: `2px solid ${accentColor}`, fontSize: 14, width: '100%',
              fontFamily: 'Jua, sans-serif',
            }}
          />
        )}
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
                background: repeat === opt.key ? (isExpense ? '#FDEDEC' : '#E8F8F0') : '#F8F8F8',
                boxShadow: repeat === opt.key ? `0 0 0 2px ${accentColor}` : 'none',
                fontSize: 13, cursor: 'pointer',
                color: repeat === opt.key ? accentColor : '#888',
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
        disabled={!canSave}
        style={{
          width: '100%', padding: '16px', borderRadius: 16, border: 'none',
          background: canSave ? accentGradient : '#DDD',
          color: canSave ? '#FFF' : '#AAA',
          fontSize: 17, fontWeight: 'bold',
          cursor: canSave ? 'pointer' : 'default',
          marginBottom: 12,
          boxShadow: canSave ? `0 4px 16px ${isExpense ? 'rgba(231,76,60,0.3)' : 'rgba(46,204,113,0.3)'}` : 'none',
          transition: 'all 0.2s',
        }}
      >
        저장하기
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
