import { useState, useEffect } from 'react'
import { getEntries, deleteEntry } from '../api/api'

const fmt = (n) => n.toLocaleString('ko-KR')

const EMOJI_MAP = {
  '용돈': '🎁', '상금': '⭐', '세뱃돈': '🧧',
  '간식': '🍭', '학용품': '📖', '장난감': '🎮',
  '놀이': '🎪', '선물': '🎁', '저축': '💝', '기타': '📦',
}

export default function EntryList({ user, refreshKey, onRefresh, onNavigate, onSwitchUser, onEdit }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    setLoading(true)
    getEntries(user, year, month)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [user, year, month, refreshKey])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const handleDelete = async (id) => {
    try {
      await deleteEntry(id)
      setDeleteTarget(null)
      onRefresh()
    } catch {
      alert('삭제에 실패했어요.')
    }
  }

  // 날짜별 그룹핑
  const grouped = {}
  entries.forEach(e => {
    const d = new Date(e.entryDate)
    const key = `${d.getMonth() + 1}월 ${d.getDate()}일`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(e)
  })

  return (
    <div className="page fade-in">
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 12px' }}>
        <h1 style={{ fontSize: 20, color: 'var(--brown)' }}>📋 기록 목록</h1>
        <button
          onClick={onSwitchUser}
          style={{ background: 'var(--light-gray)', padding: '6px 14px', borderRadius: 20, fontSize: 13, color: 'var(--gray)' }}
        >
          👤 전환
        </button>
      </div>

      {/* 월 선택 */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: 20, margin: '0 0 16px'
      }}>
        <button onClick={prevMonth}
          style={{ background: 'var(--light-gray)', width: 36, height: 36, borderRadius: '50%', fontSize: 16 }}>
          ◀
        </button>
        <span style={{ fontSize: 17, color: 'var(--brown)' }}>
          {year}년 {month}월
        </span>
        <button onClick={nextMonth}
          style={{ background: 'var(--light-gray)', width: 36, height: 36, borderRadius: '50%', fontSize: 16 }}>
          ▶
        </button>
      </div>

      {/* 기록 목록 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray)' }}>
          불러오는 중...
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray)' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🐷</div>
          <p style={{ fontFamily: 'Gaegu, cursive', fontSize: 17 }}>
            이번 달 기록이 없어요!
          </p>
        </div>
      ) : (
        Object.keys(grouped).map(dateKey => (
          <div key={dateKey} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 13, color: 'var(--gray)', padding: '4px 4px 8px',
              fontFamily: 'Gaegu, cursive',
            }}>
              {dateKey}
            </div>
            {grouped[dateKey].map(entry => {
              const isIncome = entry.type === 'INCOME'
              const emoji = EMOJI_MAP[entry.category] || '📌'
              return (
                <div key={entry.id}
                  className="card"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', marginBottom: 8, cursor: 'pointer',
                    position: 'relative',
                  }}
                  onClick={() => onEdit && onEdit(entry)}
                >
                  {/* 아이콘 */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: isIncome ? '#E8F4FD' : '#FDE8ED',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>
                    {emoji}
                  </div>

                  {/* 정보 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15 }}>
                      {entry.category}
                      {entry.memo && (
                        <span style={{ fontSize: 12, color: 'var(--gray)', marginLeft: 6 }}>
                          {entry.memo}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 금액 */}
                  <div style={{
                    fontSize: 16, fontWeight: 'bold', flexShrink: 0,
                    color: isIncome ? 'var(--blue)' : 'var(--pink)',
                  }}>
                    {isIncome ? '+' : '-'}{fmt(entry.amount)}원
                  </div>

                  {/* 삭제 버튼 */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(entry.id) }}
                    style={{
                      background: 'none', border: 'none', fontSize: 16,
                      color: 'var(--gray)', padding: '4px 8px', flexShrink: 0,
                    }}
                  >
                    🗑️
                  </button>
                </div>
              )
            })}
          </div>
        ))
      )}

      {/* 삭제 확인 */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setDeleteTarget(null)}>
          <div style={{
            background: '#FFF', borderRadius: 16, padding: 24, width: '80%', maxWidth: 300,
            textAlign: 'center',
          }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, marginBottom: 20 }}>이 기록을 삭제할까요?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, padding: 12, borderRadius: 10, background: 'var(--light-gray)', fontSize: 15 }}>
                취소
              </button>
              <button onClick={() => handleDelete(deleteTarget)}
                style={{ flex: 1, padding: 12, borderRadius: 10, background: '#FF4444', color: '#FFF', fontSize: 15 }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
