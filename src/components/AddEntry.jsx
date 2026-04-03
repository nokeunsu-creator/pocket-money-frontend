import { useState } from 'react'
import { createEntry, updateEntry } from '../api/api'

const CATEGORIES = {
  INCOME: [
    { emoji: '🎁', label: '용돈' },
    { emoji: '⭐', label: '상금' },
    { emoji: '🧧', label: '세뱃돈' },
    { emoji: '💰', label: '기타' },
  ],
  EXPENSE: [
    { emoji: '🍭', label: '간식' },
    { emoji: '📖', label: '학용품' },
    { emoji: '🎮', label: '장난감' },
    { emoji: '🎪', label: '놀이' },
    { emoji: '🎁', label: '선물' },
    { emoji: '💝', label: '저축' },
    { emoji: '📦', label: '기타' },
  ]
}

const QUICK_AMOUNTS = [500, 1000, 5000, 10000]
const fmt = (n) => n.toLocaleString('ko-KR')

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AddEntry({ user, onDone, onCancel, editEntry }) {
  const isEdit = !!editEntry
  const [type, setType] = useState(editEntry?.type || 'INCOME')
  const [amount, setAmount] = useState(editEntry ? fmt(editEntry.amount) : '')
  const [category, setCategory] = useState(editEntry?.category || null)
  const [memo, setMemo] = useState(editEntry?.memo || '')
  const [date, setDate] = useState(editEntry?.entryDate || getToday())
  const [saving, setSaving] = useState(false)

  const cats = CATEGORIES[type]

  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    setAmount(raw ? fmt(parseInt(raw)) : '')
  }

  const handleQuickAmount = (v) => {
    const current = parseInt((amount || '0').replace(/,/g, ''))
    setAmount(fmt(current + v))
  }

  const handleSubmit = async () => {
    if (!amount || !category || saving) return
    const parsed = parseInt(amount.replace(/,/g, ''))
    if (isNaN(parsed) || parsed <= 0) return

    setSaving(true)
    try {
      const data = {
        userName: user,
        type: type,
        amount: parsed,
        category: category,
        memo: memo || null,
        entryDate: date,
      }
      if (isEdit) {
        await updateEntry(editEntry.id, data)
      } else {
        await createEntry(data)
      }
      onDone()
    } catch (err) {
      alert('저장에 실패했어요. 다시 시도해 주세요.')
      setSaving(false)
    }
  }

  const isValid = amount && category && !saving

  return (
    <div className="page pop-in" style={{ paddingTop: 16 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={onCancel}
          style={{ background: 'none', fontSize: 16, color: 'var(--gray)', padding: '8px 0' }}>
          ← 돌아가기
        </button>
        <h2 style={{ fontSize: 18, color: 'var(--brown)' }}>{isEdit ? '기록 수정' : '새로운 기록'}</h2>
        <div style={{ width: 80 }} />
      </div>

      {/* 수입/지출 토글 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => { setType('INCOME'); setCategory(null) }}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 15,
            background: type === 'INCOME' ? 'var(--blue)' : 'var(--light-gray)',
            color: type === 'INCOME' ? '#FFF' : 'var(--gray)',
          }}
        >
          💵 받은 돈
        </button>
        <button
          onClick={() => { setType('EXPENSE'); setCategory(null) }}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 15,
            background: type === 'EXPENSE' ? 'var(--pink)' : 'var(--light-gray)',
            color: type === 'EXPENSE' ? '#FFF' : 'var(--gray)',
          }}
        >
          🛒 쓴 돈
        </button>
      </div>

      {/* 날짜 */}
      <div className="card">
        <label style={{ fontSize: 14, color: 'var(--gray)', display: 'block', marginBottom: 8 }}>
          📅 날짜
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10,
            border: '2px solid #EEE', fontSize: 16, color: '#333'
          }}
        />
      </div>

      {/* 금액 */}
      <div className="card">
        <label style={{ fontSize: 14, color: 'var(--gray)', display: 'block', marginBottom: 8 }}>
          💲 얼마?
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={handleAmountChange}
            style={{
              flex: 1, padding: '12px 14px', borderRadius: 10,
              border: '2px solid #EEE', fontSize: 24, textAlign: 'right',
              color: type === 'INCOME' ? 'var(--blue)' : 'var(--pink)',
            }}
          />
          <span style={{ fontSize: 20, color: 'var(--brown)' }}>원</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {QUICK_AMOUNTS.map(v => (
            <button key={v} onClick={() => handleQuickAmount(v)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8,
                background: 'var(--light-gray)', fontSize: 13, color: '#555'
              }}
            >
              +{fmt(v)}
            </button>
          ))}
        </div>
      </div>

      {/* 카테고리 */}
      <div className="card">
        <label style={{ fontSize: 14, color: 'var(--gray)', display: 'block', marginBottom: 10 }}>
          🏷️ 무엇?
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
        }}>
          {cats.map(c => {
            const selected = category === c.label
            return (
              <button key={c.label} onClick={() => setCategory(c.label)}
                style={{
                  padding: '12px 4px', borderRadius: 12,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  background: selected
                    ? (type === 'INCOME' ? 'var(--blue)' : 'var(--pink)')
                    : 'var(--light-gray)',
                  color: selected ? '#FFF' : '#555',
                  transform: selected ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                <span style={{ fontSize: 22 }}>{c.emoji}</span>
                <span style={{ fontSize: 12 }}>{c.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 메모 */}
      <div className="card">
        <label style={{ fontSize: 14, color: 'var(--gray)', display: 'block', marginBottom: 8 }}>
          📝 메모 (선택)
        </label>
        <input
          type="text"
          placeholder="예: 엄마한테 받음"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={50}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10,
            border: '2px solid #EEE', fontSize: 15
          }}
        />
      </div>

      {/* 저장 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={!isValid}
        style={{
          width: '100%', padding: '16px 0', borderRadius: 14, fontSize: 17,
          color: '#FFF', marginTop: 4,
          background: type === 'INCOME'
            ? 'linear-gradient(135deg, #4895EF, #3A86FF)'
            : 'linear-gradient(135deg, #EF476F, #E5383B)',
          opacity: isValid ? 1 : 0.5,
          boxShadow: isValid ? '0 4px 16px rgba(0,0,0,0.15)' : 'none',
        }}
      >
        {saving ? '저장 중...' : isEdit ? '✏️ 수정 완료!' : (type === 'INCOME' ? '💵 받은 돈 기록!' : '🛒 쓴 돈 기록!')}
      </button>
    </div>
  )
}
