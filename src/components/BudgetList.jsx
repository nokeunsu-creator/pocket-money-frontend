import { useState, useMemo, useCallback } from 'react'
import { getEntriesForMonth, deleteEntry, CATEGORIES } from '../utils/budgetStorage'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

const INCOME_CATS = [
  { key: 'salary', label: '월급', icon: '💵' },
  { key: 'side', label: '부수입', icon: '💰' },
  { key: 'allowance', label: '용돈', icon: '🎁' },
  { key: 'etc', label: '기타', icon: '📌' },
]

function getCategoryInfo(key, type) {
  if (type === 'income') {
    const ic = INCOME_CATS.find(c => c.key === key)
    if (ic) return ic
  }
  const cat = CATEGORIES.find(c => c.key === key)
  return cat || { key: 'etc', label: '기타', icon: '📌' }
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${m}월 ${d}일 (${DAY_NAMES[dt.getDay()]})`
}

export default function BudgetList({ onBack, onEdit }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [deletingId, setDeletingId] = useState(null)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const { grouped, totalIncome, totalExpense, filteredCount } = useMemo(() => {
    let entries = getEntriesForMonth(year, month)

    // Apply filters
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      entries = entries.filter(e => {
        const catInfo = getCategoryInfo(e.category, e.type)
        return (e.memo && e.memo.toLowerCase().includes(q)) ||
               catInfo.label.toLowerCase().includes(q)
      })
    }
    if (filterType !== 'all') {
      entries = entries.filter(e => e.type === filterType)
    }
    if (filterCategory !== 'all') {
      entries = entries.filter(e => e.category === filterCategory)
    }

    // Calculate totals from filtered entries
    let inc = 0
    let exp = 0
    entries.forEach(e => {
      if (e.type === 'income') inc += e.amount
      else exp += e.amount
    })

    // Sort by date descending, then by createdAt descending
    entries.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

    // Group by date
    const groups = []
    let currentDate = null
    let currentGroup = null

    entries.forEach(e => {
      if (e.date !== currentDate) {
        currentDate = e.date
        currentGroup = { date: e.date, entries: [], subtotal: 0 }
        groups.push(currentGroup)
      }
      currentGroup.entries.push(e)
      if (e.type === 'income') currentGroup.subtotal += e.amount
      else currentGroup.subtotal -= e.amount
    })

    return { grouped: groups, totalIncome: inc, totalExpense: exp, filteredCount: entries.length }
  }, [year, month, search, filterCategory, filterType, refreshKey])

  const handleDelete = (id) => {
    setDeletingId(id)
    setTimeout(() => {
      deleteEntry(id)
      setDeletingId(null)
      refresh()
    }, 300)
  }

  const allCategories = [{ key: 'all', label: '전체' }, ...CATEGORIES]

  return (
    <div className="page fade-in" style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #3498DB 0%, #2980B9 100%)',
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
        }}>📋</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <button onClick={onBack} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 12,
            padding: '4px 10px', fontSize: 16, color: '#FFF', cursor: 'pointer',
          }}>←</button>
          <h1 style={{ fontSize: 20, fontWeight: 'bold' }}>📋 기록 목록</h1>
        </div>

        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <button onClick={prevMonth} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10,
            padding: '6px 12px', fontSize: 16, color: '#FFF', cursor: 'pointer',
          }}>{'<'}</button>
          <span style={{ fontSize: 17, fontWeight: 'bold', minWidth: 140, textAlign: 'center' }}>
            {year}년 {month}월
          </span>
          <button onClick={nextMonth} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10,
            padding: '6px 12px', fontSize: 16, color: '#FFF', cursor: 'pointer',
          }}>{'>'}</button>
        </div>
      </div>

      {/* Month totals */}
      <div className="card" style={{
        padding: '14px 20px', marginBottom: 12,
        display: 'flex', justifyContent: 'center', gap: 16, fontSize: 14,
      }}>
        <span>
          수입 <b style={{ color: '#2ECC71' }}>+{totalIncome.toLocaleString()}</b>
        </span>
        <span style={{ color: '#DDD' }}>|</span>
        <span>
          지출 <b style={{ color: '#E74C3C' }}>-{totalExpense.toLocaleString()}</b>
        </span>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 12 }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#F5F5F5', borderRadius: 12, padding: '8px 12px',
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="검색..."
            style={{
              flex: 1, border: 'none', background: 'transparent',
              fontSize: 14, padding: 0, color: '#333',
              fontFamily: 'Jua, sans-serif',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                background: 'none', border: 'none', fontSize: 14,
                color: '#999', cursor: 'pointer', padding: '0 4px',
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Type filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {[
            { key: 'all', label: '전체' },
            { key: 'income', label: '수입' },
            { key: 'expense', label: '지출' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setFilterType(opt.key)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                fontSize: 13, cursor: 'pointer',
                background: filterType === opt.key ? '#3498DB' : '#F0F0F0',
                color: filterType === opt.key ? '#FFF' : '#666',
                fontWeight: filterType === opt.key ? 'bold' : 'normal',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto',
          paddingBottom: 4,
          WebkitOverflowScrolling: 'touch',
        }}>
          {allCategories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setFilterCategory(cat.key)}
              style={{
                padding: '6px 12px', borderRadius: 16, border: 'none',
                fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                flexShrink: 0,
                background: filterCategory === cat.key ? '#3498DB' : '#F0F0F0',
                color: filterCategory === cat.key ? '#FFF' : '#666',
                fontWeight: filterCategory === cat.key ? 'bold' : 'normal',
                transition: 'all 0.15s',
              }}
            >
              {cat.icon ? `${cat.icon} ` : ''}{cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Entry list grouped by date */}
      {grouped.length === 0 ? (
        <div className="card" style={{
          textAlign: 'center', padding: '40px 20px', color: 'var(--gray)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
          <p style={{ fontFamily: 'Gaegu, cursive', fontSize: 18 }}>
            이번 달 기록이 없어요
          </p>
          <p style={{ fontSize: 13, color: '#BBB', marginTop: 4 }}>
            새로운 기록을 추가해 보세요!
          </p>
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          {grouped.map(group => (
            <div key={group.date} style={{ marginBottom: 8 }}>
              {/* Date header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 4px 6px', fontSize: 13, color: '#888',
              }}>
                <span style={{ fontWeight: 'bold' }}>
                  ━━ {formatDate(group.date)} ━━
                </span>
                <span style={{
                  fontSize: 12,
                  color: group.subtotal >= 0 ? '#2ECC71' : '#E74C3C',
                  fontWeight: 'bold',
                }}>
                  소계: {group.subtotal >= 0 ? '+' : ''}{group.subtotal.toLocaleString()}원
                </span>
              </div>

              {/* Entries for this date */}
              {group.entries.map(entry => {
                const catInfo = getCategoryInfo(entry.category, entry.type)
                const isIncome = entry.type === 'income'
                const deleting = deletingId === entry.id

                return (
                  <div
                    key={entry.id}
                    className="card"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px', marginBottom: 6,
                      cursor: 'pointer',
                      opacity: deleting ? 0 : 1,
                      transform: deleting ? 'translateX(60px)' : 'none',
                      transition: 'opacity 0.3s, transform 0.3s',
                    }}
                    onClick={() => onEdit(entry)}
                  >
                    {/* Category icon */}
                    <span style={{
                      fontSize: 22, flexShrink: 0,
                      width: 36, height: 36,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isIncome ? '#E8F8F0' : '#FFF0EE',
                      borderRadius: 10,
                    }}>
                      {catInfo.icon}
                    </span>

                    {/* Middle: memo + category */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 15, color: '#333',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {entry.memo || catInfo.label}
                      </div>
                      {entry.memo && (
                        <div style={{ fontSize: 12, color: '#AAA', marginTop: 2 }}>
                          {catInfo.label}
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <span style={{
                      fontSize: 15, fontWeight: 'bold', flexShrink: 0,
                      color: isIncome ? '#2ECC71' : '#E74C3C',
                    }}>
                      {isIncome ? '+' : '-'}{entry.amount.toLocaleString()}원
                    </span>

                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(entry.id) }}
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
              })}
            </div>
          ))}

          {/* Result count */}
          <div style={{
            textAlign: 'center', fontSize: 12, color: '#BBB',
            padding: '8px 0 16px',
          }}>
            총 {filteredCount}건
          </div>
        </div>
      )}
    </div>
  )
}
