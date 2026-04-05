import { useState } from 'react'
import { createBankEntry, updateBankEntry, deleteBankEntry } from '../api/api'

const CATEGORIES = {
  DEPOSIT: [
    { emoji: '💰', label: '저축' },
    { emoji: '🎁', label: '용돈입금' },
    { emoji: '⭐', label: '이자' },
    { emoji: '📦', label: '기타' },
  ],
  WITHDRAW: [
    { emoji: '💸', label: '인출' },
    { emoji: '🛒', label: '구매' },
    { emoji: '🎁', label: '선물' },
    { emoji: '📦', label: '기타' },
  ]
}

const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000]
const fmt = (n) => n.toLocaleString('ko-KR')

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AddBankEntry({ user, onDone, onCancel, editEntry }) {
  const isEdit = !!editEntry
  const [type, setType] = useState(editEntry?.type || 'DEPOSIT')
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
        await updateBankEntry(editEntry.id, data)
      } else {
        await createBankEntry(data)
      }
      onDone()
    } catch (err) {
      alert('저장에 실패했어요. 다시 시도해 주세요.')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('이 기록을 삭제할까요?')) return
    setSaving(true)
    try {
      await deleteBankEntry(editEntry.id)
      onDone()
    } catch {
      alert('삭제에 실패했어요.')
      setSaving(false)
    }
  }

  const isValid = amount && category && !saving

  return (
    <div className="page pop-in" style={{ paddingTop: 10, paddingBottom: 20 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={onCancel}
          style={{ background: 'none', fontSize: 15, color: 'var(--gray)', padding: '6px 0' }}>
          ← 돌아가기
        </button>
        <h2 style={{ fontSize: 17, color: 'var(--brown)' }}>🏦 {isEdit ? '통장 수정' : '통장 기록'}</h2>
        <div style={{ width: 70 }} />
      </div>

      {/* 입금/출금 토글 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => { setType('DEPOSIT'); setCategory(null) }}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 14,
            background: type === 'DEPOSIT' ? '#2D6A4F' : 'var(--light-gray)',
            color: type === 'DEPOSIT' ? '#FFF' : 'var(--gray)',
          }}
        >
          💰 입금
        </button>
        <button
          onClick={() => { setType('WITHDRAW'); setCategory(null) }}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 14,
            background: type === 'WITHDRAW' ? '#E76F51' : 'var(--light-gray)',
            color: type === 'WITHDRAW' ? '#FFF' : 'var(--gray)',
          }}
        >
          💸 출금
        </button>
      </div>

      {/* 날짜 + 금액 */}
      <div className="card" style={{ padding: 14, marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: '0 0 45%', minWidth: 0 }}>
            <label style={{ fontSize: 13, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>📅 날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                width: '100%', padding: '8px 6px', borderRadius: 8,
                border: '2px solid #EEE', fontSize: 13, color: '#333'
              }}
            />
          </div>
          <div style={{ flex: '1 1 0%', minWidth: 0 }}>
            <label style={{ fontSize: 13, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>💲 금액</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={handleAmountChange}
                style={{
                  width: '100%', flex: '1 1 0%', padding: '8px 8px', borderRadius: 8, minWidth: 0,
                  border: '2px solid #EEE', fontSize: 16, textAlign: 'right',
                  color: type === 'DEPOSIT' ? '#2D6A4F' : '#E76F51',
                }}
              />
              <span style={{ fontSize: 14, color: 'var(--brown)', flexShrink: 0 }}>원</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {QUICK_AMOUNTS.map(v => (
            <button key={v} onClick={() => handleQuickAmount(v)}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 8,
                background: 'var(--light-gray)', fontSize: 12, color: '#555'
              }}
            >
              +{fmt(v)}
            </button>
          ))}
        </div>
      </div>

      {/* 카테고리 */}
      <div className="card" style={{ padding: 14, marginBottom: 10 }}>
        <label style={{ fontSize: 13, color: 'var(--gray)', display: 'block', marginBottom: 8 }}>
          🏷️ 무엇?
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
        }}>
          {cats.map(c => {
            const selected = category === c.label
            return (
              <button key={c.label} onClick={() => setCategory(c.label)}
                style={{
                  padding: '10px 2px', borderRadius: 10,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  background: selected
                    ? (type === 'DEPOSIT' ? '#2D6A4F' : '#E76F51')
                    : 'var(--light-gray)',
                  color: selected ? '#FFF' : '#555',
                  transform: selected ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                <span style={{ fontSize: 20 }}>{c.emoji}</span>
                <span style={{ fontSize: 11 }}>{c.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 메모 */}
      <div className="card" style={{ padding: 14, marginBottom: 10 }}>
        <label style={{ fontSize: 13, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>
          📝 메모 (선택)
        </label>
        <input
          type="text"
          placeholder="예: 엄마가 넣어줌"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={50}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 8,
            border: '2px solid #EEE', fontSize: 14
          }}
        />
      </div>

      {/* 저장 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={!isValid}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 12, fontSize: 16,
          color: '#FFF', marginTop: 2,
          background: type === 'DEPOSIT'
            ? 'linear-gradient(135deg, #2D6A4F, #40916C)'
            : 'linear-gradient(135deg, #E76F51, #F4A261)',
          opacity: isValid ? 1 : 0.5,
          boxShadow: isValid ? '0 4px 16px rgba(0,0,0,0.15)' : 'none',
        }}
      >
        {saving ? '저장 중...' : isEdit ? '✏️ 수정 완료!' : (type === 'DEPOSIT' ? '💰 입금 기록!' : '💸 출금 기록!')}
      </button>

      {isEdit && (
        <button
          onClick={handleDelete}
          disabled={saving}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12, fontSize: 16,
            color: '#FF4444', marginTop: 8,
            background: 'var(--light-gray)',
            opacity: saving ? 0.5 : 1,
          }}
        >
          🗑️ 삭제
        </button>
      )}
    </div>
  )
}
