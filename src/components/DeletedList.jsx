import { useState, useEffect } from 'react'
import { getDeletedEntries, getDeletedBankEntries } from '../api/api'

const fmt = (n) => n.toLocaleString('ko-KR')

const EMOJI_MAP = {
  '용돈': '🎁', '상금': '⭐', '세뱃돈': '🧧',
  '간식': '🍭', '학용품': '📖', '장난감': '🎮',
  '놀이': '🎪', '선물': '🎁', '저축': '💝', '헌금': '⛪', '기타': '📦',
}

const BANK_EMOJI_MAP = {
  '저축': '💰', '용돈입금': '🎁', '이자': '⭐',
  '인출': '💸', '구매': '🛒', '선물': '🎁', '기타': '📦',
}

function formatDateTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function DeletedList({ user, onBack }) {
  const [entries, setEntries] = useState([])
  const [bankEntries, setBankEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('cash')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getDeletedEntries(user).catch(() => []),
      getDeletedBankEntries(user).catch(() => []),
    ]).then(([e, be]) => {
      setEntries(e)
      setBankEntries(be)
    }).finally(() => setLoading(false))
  }, [user])

  const currentEntries = tab === 'cash' ? entries : bankEntries
  const emojiMap = tab === 'cash' ? EMOJI_MAP : BANK_EMOJI_MAP

  return (
    <div className="page fade-in">
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 12px' }}>
        <button onClick={onBack}
          style={{ background: 'none', fontSize: 15, color: 'var(--gray)', padding: '6px 0' }}>
          ← 돌아가기
        </button>
        <h1 style={{ fontSize: 20, color: 'var(--brown)' }}>🗑️ 삭제 내역</h1>
        <div style={{ width: 70 }} />
      </div>

      {/* 내돈/통장 탭 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 10, overflow: 'hidden', border: '2px solid #EEE' }}>
        <button
          onClick={() => setTab('cash')}
          style={{
            flex: 1, padding: '10px 0', fontSize: 14, border: 'none',
            background: tab === 'cash' ? '#999' : '#FFF',
            color: tab === 'cash' ? '#FFF' : 'var(--gray)',
          }}
        >
          💵 내돈 ({entries.length})
        </button>
        <button
          onClick={() => setTab('bank')}
          style={{
            flex: 1, padding: '10px 0', fontSize: 14, border: 'none',
            background: tab === 'bank' ? '#999' : '#FFF',
            color: tab === 'bank' ? '#FFF' : 'var(--gray)',
          }}
        >
          🏦 통장 ({bankEntries.length})
        </button>
      </div>

      {/* 목록 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray)' }}>
          불러오는 중...
        </div>
      ) : currentEntries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray)' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>✨</div>
          <p style={{ fontFamily: 'Gaegu, cursive', fontSize: 17 }}>
            삭제된 기록이 없어요!
          </p>
        </div>
      ) : (
        currentEntries.map(entry => {
          const isPositive = tab === 'cash' ? entry.type === 'INCOME' : entry.type === 'DEPOSIT'
          const emoji = emojiMap[entry.category] || '📌'
          const d = new Date(entry.entryDate)
          const dateStr = `${d.getMonth() + 1}/${d.getDate()}`
          return (
            <div key={entry.id}
              className="card"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', marginBottom: 8,
                opacity: 0.6,
              }}
            >
              {/* 아이콘 */}
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: '#F0F0F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>
                {emoji}
              </div>

              {/* 정보 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, textDecoration: 'line-through', color: '#999' }}>
                  {entry.category}
                  {entry.memo && (
                    <span style={{ fontSize: 12, marginLeft: 6 }}>
                      {entry.memo}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#BBB', marginTop: 2 }}>
                  {dateStr} 기록 · {formatDateTime(entry.deletedAt)} 삭제
                </div>
              </div>

              {/* 금액 */}
              <div style={{
                fontSize: 15, fontWeight: 'bold', flexShrink: 0,
                color: '#999', textDecoration: 'line-through',
              }}>
                {isPositive ? '+' : '-'}{fmt(entry.amount)}원
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
