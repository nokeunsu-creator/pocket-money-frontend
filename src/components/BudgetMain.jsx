import { useState, useEffect, useCallback } from 'react'
import BudgetAdd from './BudgetAdd'
import BudgetList from './BudgetList'
import {
  CATEGORIES,
  getMonthSummary,
  getRecentEntries,
  getBudget,
  setBudget as saveBudget,
  getFixedExpenses,
  setFixedExpenses as saveFixedExpenses,
  applyFixedExpenses,
  deleteEntry,
  resetData,
  getData,
} from '../utils/budgetStorage'
import { downloadBudgetPdf } from '../utils/budgetPdf'

function fmt(n) {
  return Number(n).toLocaleString()
}

function getCategoryInfo(key) {
  return CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1]
}

export default function BudgetMain({ onBack }) {
  const now = new Date()
  const [screen, setScreen] = useState('main') // 'main' | 'add' | 'edit' | 'list' | 'settings'
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0, byCategory: {} })
  const [recent, setRecent] = useState([])
  const [budget, setBudgetState] = useState(0)
  const [editEntry, setEditEntry] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Settings state
  const [budgetInput, setBudgetInput] = useState('')
  const [fixedExpenses, setFixedExpensesState] = useState([])
  const [newFixed, setNewFixed] = useState({ category: 'housing', memo: '', amount: '' })

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  useEffect(() => {
    applyFixedExpenses(year, month)
    const s = getMonthSummary(year, month)
    setSummary(s)
    setRecent(getRecentEntries(5))
    setBudgetState(getBudget())
  }, [year, month, refreshKey])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const openSettings = () => {
    setBudgetInput(String(getBudget() || ''))
    setFixedExpensesState(getFixedExpenses())
    setNewFixed({ category: 'housing', memo: '', amount: '' })
    setScreen('settings')
  }

  const handleSaveBudget = () => {
    saveBudget(Number(budgetInput) || 0)
    setBudgetState(Number(budgetInput) || 0)
  }

  const handleAddFixed = () => {
    if (!newFixed.amount || Number(newFixed.amount) <= 0) return
    const updated = [...fixedExpenses, { ...newFixed, amount: Number(newFixed.amount), id: Date.now() }]
    saveFixedExpenses(updated)
    setFixedExpensesState(updated)
    setNewFixed({ category: 'housing', memo: '', amount: '' })
  }

  const handleRemoveFixed = (id) => {
    const updated = fixedExpenses.filter(f => f.id !== id)
    saveFixedExpenses(updated)
    setFixedExpensesState(updated)
  }

  const handleReset = () => {
    if (window.confirm('모든 가계부 데이터를 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) {
      resetData()
      refresh()
      setScreen('main')
    }
  }

  const handleEdit = (entry) => {
    setEditEntry(entry)
    setScreen('edit')
  }

  const handleDelete = (id) => {
    if (window.confirm('이 기록을 삭제할까요?')) {
      deleteEntry(id)
      refresh()
    }
  }

  // --- Sub-screens ---
  if (screen === 'add' || screen === 'edit') {
    return (
      <BudgetAdd
        entry={screen === 'edit' ? editEntry : null}
        onSave={() => { refresh(); setScreen('main'); setEditEntry(null) }}
        onBack={() => { setScreen('main'); setEditEntry(null) }}
      />
    )
  }

  if (screen === 'list') {
    return (
      <BudgetList
        onBack={() => setScreen('main')}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={refresh}
      />
    )
  }

  if (screen === 'settings') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <button onClick={() => { refresh(); setScreen('main') }} style={styles.backBtn}>←</button>
            <h1 style={styles.title}>⚙️ 설정</h1>
          </div>
        </div>
        <div style={styles.body}>
          {/* Budget setting */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>월 예산 설정</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number"
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                placeholder="예산 금액"
                style={styles.input}
              />
              <span style={{ whiteSpace: 'nowrap' }}>원</span>
              <button onClick={handleSaveBudget} style={styles.saveBtn}>저장</button>
            </div>
          </div>

          {/* Fixed expenses */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>고정 지출 관리</h3>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 12px' }}>
              매월 자동으로 추가되는 고정 지출 항목입니다.
            </p>
            {fixedExpenses.map(f => {
              const cat = getCategoryInfo(f.category)
              return (
                <div key={f.id} style={styles.fixedRow}>
                  <span>{cat.icon} {cat.label}</span>
                  <span style={{ flex: 1, marginLeft: 8, color: '#555' }}>{f.memo}</span>
                  <span style={{ fontWeight: 600 }}>{fmt(f.amount)}원</span>
                  <button onClick={() => handleRemoveFixed(f.id)} style={styles.deleteSmall}>✕</button>
                </div>
              )
            })}
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <select
                value={newFixed.category}
                onChange={e => setNewFixed(p => ({ ...p, category: e.target.value }))}
                style={{ ...styles.input, flex: '1 1 100px' }}
              >
                {CATEGORIES.map(c => (
                  <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={newFixed.memo}
                onChange={e => setNewFixed(p => ({ ...p, memo: e.target.value }))}
                placeholder="메모"
                style={{ ...styles.input, flex: '1 1 80px' }}
              />
              <input
                type="number"
                value={newFixed.amount}
                onChange={e => setNewFixed(p => ({ ...p, amount: e.target.value }))}
                placeholder="금액"
                style={{ ...styles.input, flex: '1 1 80px' }}
              />
              <button onClick={handleAddFixed} style={styles.addFixedBtn}>추가</button>
            </div>
          </div>

          {/* Reset */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>데이터 초기화</h3>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 12px' }}>
              모든 가계부 데이터가 삭제됩니다.
            </p>
            <button onClick={handleReset} style={styles.dangerBtn}>🗑️ 데이터 초기화</button>
          </div>
        </div>
      </div>
    )
  }

  // --- Main dashboard ---
  const usageRatio = budget > 0 ? summary.expense / budget : 0
  const usagePercent = Math.min(Math.round(usageRatio * 100), 999)
  const barColor = usageRatio < 0.6 ? '#2ECC71' : usageRatio < 0.8 ? '#F1C40F' : '#E74C3C'

  const categoryBreakdown = Object.entries(summary.byCategory)
    .map(([key, amount]) => ({ ...getCategoryInfo(key), amount }))
    .sort((a, b) => b.amount - a.amount)

  const maxCategoryAmount = categoryBreakdown.length > 0 ? categoryBreakdown[0].amount : 0

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <button onClick={onBack} style={styles.backBtn}>←</button>
          <h1 style={styles.title}>💰 가계부</h1>
        </div>
        <div style={styles.ownerName}>노성미</div>
        <div style={styles.monthNav}>
          <button onClick={prevMonth} style={styles.navBtn}>◀</button>
          <span style={styles.monthLabel}>{year}년 {month}월</span>
          <button onClick={nextMonth} style={styles.navBtn}>▶</button>
        </div>
      </div>

      <div style={styles.body}>
        {/* Summary card */}
        <div style={styles.card}>
          <div style={styles.summaryRow}>
            <span style={{ color: '#555' }}>수입</span>
            <span style={{ color: '#27AE60', fontWeight: 600 }}>+{fmt(summary.income)}원</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={{ color: '#555' }}>지출</span>
            <span style={{ color: '#E74C3C', fontWeight: 600 }}>-{fmt(summary.expense)}원</span>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '8px 0' }} />
          <div style={styles.summaryRow}>
            <span style={{ fontWeight: 700 }}>잔액</span>
            <span style={{
              fontWeight: 700,
              fontSize: 18,
              color: summary.balance >= 0 ? '#27AE60' : '#E74C3C',
            }}>
              {summary.balance >= 0 ? '+' : ''}{fmt(summary.balance)}원
            </span>
          </div>
        </div>

        {/* Budget progress */}
        {budget > 0 && (
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>예산 사용률: {usagePercent}%</span>
            </div>
            <div style={styles.progressBg}>
              <div style={{
                ...styles.progressBar,
                width: `${Math.min(usagePercent, 100)}%`,
                backgroundColor: barColor,
              }} />
            </div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>
              예산 {fmt(budget)}원 중 {fmt(summary.expense)}원 사용
            </div>
          </div>
        )}

        {/* Category breakdown */}
        {categoryBreakdown.length > 0 && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>카테고리별 지출</h3>
            {categoryBreakdown.map(cat => (
              <div key={cat.key} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 14 }}>{cat.icon} {cat.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{fmt(cat.amount)}원</span>
                </div>
                <div style={styles.catBarBg}>
                  <div style={{
                    height: '100%',
                    borderRadius: 4,
                    backgroundColor: cat.color,
                    width: maxCategoryAmount > 0 ? `${(cat.amount / maxCategoryAmount) * 100}%` : '0%',
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent entries */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>최근 기록</h3>
          {recent.length === 0 ? (
            <p style={{ color: '#aaa', textAlign: 'center', padding: 16 }}>아직 기록이 없습니다.</p>
          ) : (
            <>
              {recent.map(entry => {
                const cat = getCategoryInfo(entry.category)
                const isIncome = entry.type === 'income'
                return (
                  <div key={entry.id} style={styles.recentRow}>
                    <span style={{ color: '#999', fontSize: 13, minWidth: 52 }}>{entry.date.slice(5)}</span>
                    <span style={{ fontSize: 18, marginRight: 6 }}>{cat.icon}</span>
                    <span style={{ flex: 1, fontSize: 14, color: '#333' }}>{entry.memo || cat.label}</span>
                    <span style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: isIncome ? '#27AE60' : '#E74C3C',
                    }}>
                      {isIncome ? '+' : '-'}{fmt(entry.amount)}원
                    </span>
                  </div>
                )
              })}
              <button
                onClick={() => setScreen('list')}
                style={styles.moreLink}
              >
                더보기 →
              </button>
            </>
          )}
        </div>

        {/* Bottom buttons */}
        <div style={styles.bottomButtons}>
          <button onClick={() => setScreen('add')} style={styles.primaryBtn}>
            + 기록 추가
          </button>
          <button onClick={() => setScreen('list')} style={styles.secondaryBtn}>
            📋 전체 목록
          </button>
          <button onClick={openSettings} style={styles.secondaryBtn}>
            ⚙️ 설정
          </button>
          <button onClick={() => downloadBudgetPdf(year, month)} style={styles.pdfBtn}>
            📄 PDF 다운로드
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    minHeight: '100vh',
    backgroundColor: '#F5F6FA',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    background: 'linear-gradient(135deg, #2C3E50 0%, #3498DB 100%)',
    padding: '18px 16px 16px',
    color: '#fff',
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: '#fff',
    fontSize: 20,
    borderRadius: 8,
    width: 36,
    height: 36,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
  },
  ownerName: {
    fontSize: 14,
    opacity: 0.85,
    marginTop: 4,
    marginLeft: 44,
  },
  monthNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 14,
  },
  navBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: '#fff',
    fontSize: 16,
    borderRadius: 6,
    width: 32,
    height: 32,
    cursor: 'pointer',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: 600,
  },
  body: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  cardTitle: {
    margin: '0 0 12px',
    fontSize: 16,
    fontWeight: 700,
    color: '#2C3E50',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    fontSize: 15,
  },
  progressBg: {
    width: '100%',
    height: 12,
    backgroundColor: '#ECF0F1',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
    transition: 'width 0.3s',
  },
  catBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#ECF0F1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  recentRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f2f2f2',
    gap: 4,
  },
  moreLink: {
    display: 'block',
    width: '100%',
    textAlign: 'center',
    padding: '10px 0',
    background: 'none',
    border: 'none',
    color: '#3498DB',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  },
  bottomButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 4,
    marginBottom: 24,
  },
  primaryBtn: {
    padding: '14px 0',
    border: 'none',
    borderRadius: 10,
    backgroundColor: '#27AE60',
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '12px 0',
    border: '1px solid #ddd',
    borderRadius: 10,
    backgroundColor: '#fff',
    color: '#2C3E50',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  // Settings styles
  input: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 15,
    outline: 'none',
  },
  saveBtn: {
    padding: '10px 18px',
    border: 'none',
    borderRadius: 8,
    backgroundColor: '#3498DB',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  fixedRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f2f2f2',
    gap: 6,
    fontSize: 14,
  },
  deleteSmall: {
    background: 'none',
    border: 'none',
    color: '#E74C3C',
    fontSize: 16,
    cursor: 'pointer',
    padding: '2px 6px',
  },
  addFixedBtn: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: 8,
    backgroundColor: '#27AE60',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  dangerBtn: {
    padding: '12px 20px',
    border: 'none',
    borderRadius: 8,
    backgroundColor: '#E74C3C',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
  pdfBtn: {
    padding: '12px 0',
    border: '1px solid #bbb',
    borderRadius: 10,
    backgroundColor: '#7F8C8D',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
