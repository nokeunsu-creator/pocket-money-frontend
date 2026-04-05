import { useState, useEffect } from 'react'
import { getStats, getEntries } from '../api/api'

const fmt = (n) => n.toLocaleString('ko-KR')

const EMOJI_MAP = {
  '용돈': '🎁', '상금': '⭐', '세뱃돈': '🧧',
  '간식': '🍭', '학용품': '📖', '장난감': '🎮',
  '놀이': '🎪', '선물': '🎁', '저축': '💝', '헌금': '⛪', '기타': '📦',
}

const PIGGY = ['😊', '😄', '🤩', '😍', '🥳']
function piggyFace(balance) {
  if (balance >= 50000) return PIGGY[4]
  if (balance >= 30000) return PIGGY[3]
  if (balance >= 10000) return PIGGY[2]
  if (balance >= 5000) return PIGGY[1]
  return PIGGY[0]
}

export default function Home({ user, refreshKey, onNavigate, onSwitchUser, onEdit }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [stats, setStats] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getStats(user, year, month).catch(() => null),
      getEntries(user, year, month).catch(() => []),
    ]).then(([s, e]) => {
      setStats(s)
      setEntries(e)
    }).finally(() => setLoading(false))
  }, [user, year, month, refreshKey])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const balance = stats?.totalBalance ?? 0
  const income = stats?.monthIncome ?? 0
  const expense = stats?.monthExpense ?? 0
  const expCats = stats?.expenseByCategory ?? []

  return (
    <div className="page fade-in">
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 12px' }}>
        <h1 style={{ fontSize: 20, color: 'var(--brown)' }}>
          {user}의 용돈기입장
        </h1>
        <button
          onClick={onSwitchUser}
          style={{ background: 'var(--light-gray)', padding: '6px 14px', borderRadius: 20, fontSize: 13, color: 'var(--gray)' }}
        >
          👤 전환
        </button>
      </div>

      {/* 돼지저금통 카드 */}
      <div className="card" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: -20, right: -20,
          fontSize: 80, opacity: 0.06, transform: 'rotate(15deg)'
        }}>🐷</div>

        <div style={{ fontSize: 56, animation: 'float 3s ease-in-out infinite', marginBottom: 4 }}>
          {piggyFace(balance)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 4 }}>
          지금 내 돈
        </div>
        <div style={{
          fontSize: 32, fontWeight: 'bold',
          color: balance >= 0 ? 'var(--green)' : 'var(--pink)'
        }}>
          {loading ? '...' : `${fmt(balance)}원`}
        </div>
      </div>

      {/* 월 선택 */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: 20, margin: '12px 0'
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

      {/* 이번 달 요약 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 4 }}>▲ 받은 돈</div>
            <div style={{ fontSize: 20, color: 'var(--blue)' }}>
              {loading ? '...' : `${fmt(income)}원`}
            </div>
          </div>
          <div style={{ width: 1, background: '#EEE' }} />
          <div>
            <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 4 }}>▼ 쓴 돈</div>
            <div style={{ fontSize: 20, color: 'var(--pink)' }}>
              {loading ? '...' : `${fmt(expense)}원`}
            </div>
          </div>
        </div>
      </div>

      {/* 카테고리별 지출 */}
      {expCats.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 15, color: 'var(--brown)', marginBottom: 14 }}>
            📊 이번 달 어디에 썼을까?
          </h3>
          {expCats.map((cat, i) => {
            const pct = expense > 0 ? Math.round((cat.amount / expense) * 100) : 0
            return (
              <div key={cat.category} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                  <span>{cat.category}</span>
                  <span style={{ color: 'var(--pink)' }}>{fmt(cat.amount)}원 ({pct}%)</span>
                </div>
                <div style={{
                  height: 8, background: '#F0F0F0', borderRadius: 4, overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: `hsl(${340 + i * 30}, 70%, 60%)`,
                    borderRadius: 4,
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 최근 기록 */}
      {!loading && entries.length > 0 && (
        <div className="card" style={{ padding: '16px 16px 8px' }}>
          <h3 style={{ fontSize: 15, color: 'var(--brown)', marginBottom: 14 }}>
            📝 이번 달 기록
          </h3>
          {entries.map(entry => {
            const isIncome = entry.type === 'INCOME'
            const emoji = EMOJI_MAP[entry.category] || '📌'
            const d = new Date(entry.entryDate)
            const dateStr = `${d.getMonth() + 1}/${d.getDate()}`
            return (
              <div key={entry.id}
                onClick={() => onEdit && onEdit(entry)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0', borderBottom: '1px solid #F0F0F0',
                  cursor: 'pointer',
                }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: isIncome ? '#E8F4FD' : '#FDE8ED',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 17, flexShrink: 0,
                }}>
                  {emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{entry.category}</span>
                    <span style={{ fontSize: 11, color: 'var(--gray)' }}>{dateStr}</span>
                  </div>
                  {entry.memo && (
                    <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>
                      {entry.memo}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: 15, fontWeight: 'bold', flexShrink: 0,
                  color: isIncome ? 'var(--blue)' : 'var(--pink)',
                }}>
                  {isIncome ? '+' : '-'}{fmt(entry.amount)}원
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && income === 0 && expense === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray)' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🐷</div>
          <p style={{ fontFamily: 'Gaegu, cursive', fontSize: 17 }}>
            이번 달 기록이 없어요!<br />
            아래 ⊕ 버튼을 눌러 기록해 보세요
          </p>
        </div>
      )}
    </div>
  )
}
