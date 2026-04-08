import { useState, useEffect } from 'react'
import { ACHIEVEMENTS, getUnlocked, getProgress, resetAchievements } from '../utils/achievements'

const CATEGORY_LABELS = {
  board: '🧩 보드게임',
  card: '🃏 카드게임',
  brain: '🧠 두뇌게임',
  learn: '📚 학습',
  general: '🌟 일반',
}

const CATEGORY_ORDER = ['board', 'card', 'brain', 'learn', 'general']

function formatDate(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function AchievementList({ onBack }) {
  const [unlocked, setUnlocked] = useState({})
  const [progress, setProgress] = useState({ total: 0, unlocked: 0 })
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  useEffect(() => {
    setUnlocked(getUnlocked())
    setProgress(getProgress())
  }, [])

  function handleReset() {
    if (!showResetConfirm) {
      setShowResetConfirm(true)
      return
    }
    resetAchievements()
    setUnlocked({})
    setProgress({ total: ACHIEVEMENTS.length, unlocked: 0 })
    setShowResetConfirm(false)
  }

  const pct = progress.total > 0 ? Math.round((progress.unlocked / progress.total) * 100) : 0

  const grouped = CATEGORY_ORDER.map(cat => ({
    cat,
    label: CATEGORY_LABELS[cat],
    items: ACHIEVEMENTS.filter(a => a.category === cat),
  }))

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem 3rem' }}>
      {/* Back button */}
      <button onClick={onBack}
        style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
        ← 돌아가기
      </button>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🏅</div>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>업적</h2>
        <p style={{ fontSize: 14, color: 'var(--gray)', marginTop: 4 }}>
          {progress.unlocked}/{progress.total} 달성
        </p>
      </div>

      {/* Progress bar */}
      <div style={{
        background: '#EEE', borderRadius: 10, height: 14, overflow: 'hidden',
        marginBottom: 28, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: 'linear-gradient(90deg, #4895EF, #56CFE1)',
          borderRadius: 10,
          transition: 'width 0.6s ease',
        }} />
      </div>

      {/* Grouped achievements */}
      {grouped.map(group => (
        <div key={group.cat} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, paddingLeft: 4 }}>
            {group.label}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {group.items.map(ach => {
              const isOpen = !!unlocked[ach.id]
              return (
                <div key={ach.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 14,
                  background: isOpen ? '#FFF' : '#F5F5F5',
                  boxShadow: isOpen
                    ? '0 0 12px rgba(72,149,239,0.25), 0 1px 4px rgba(0,0,0,0.05)'
                    : '0 1px 4px rgba(0,0,0,0.03)',
                  opacity: isOpen ? 1 : 0.65,
                  transition: 'all 0.2s ease',
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: isOpen ? 'linear-gradient(135deg, #FFD700, #FFA500)' : '#DDD',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                    filter: isOpen ? 'none' : 'grayscale(1)',
                  }}>
                    {isOpen ? ach.icon : '🔒'}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: isOpen ? '#333' : '#999' }}>
                      {ach.title}
                    </div>
                    <div style={{ fontSize: 11, color: isOpen ? '#666' : '#BBB', marginTop: 2 }}>
                      {isOpen ? ach.desc : '???'}
                    </div>
                  </div>

                  {/* Unlock date or lock indicator */}
                  {isOpen ? (
                    <div style={{ fontSize: 10, color: '#AAA', whiteSpace: 'nowrap' }}>
                      {formatDate(unlocked[ach.id])}
                    </div>
                  ) : (
                    <div style={{ fontSize: 16, color: '#CCC' }}>🔒</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Reset button */}
      <div style={{ textAlign: 'center', marginTop: 16, paddingBottom: 24 }}>
        <button
          onClick={handleReset}
          style={{
            background: showResetConfirm ? '#EF476F' : '#F5F5F5',
            color: showResetConfirm ? '#FFF' : '#999',
            border: 'none', borderRadius: 10, padding: '10px 24px',
            fontSize: 13, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {showResetConfirm ? '정말 초기화할까요?' : '🔄 초기화'}
        </button>
        {showResetConfirm && (
          <button
            onClick={() => setShowResetConfirm(false)}
            style={{
              background: '#EEE', color: '#666',
              border: 'none', borderRadius: 10, padding: '10px 20px',
              fontSize: 13, cursor: 'pointer', marginLeft: 8,
            }}
          >
            취소
          </button>
        )}
      </div>
    </div>
  )
}

/** Toast component for newly unlocked achievements. Render in App.jsx. */
export function AchievementToast({ achievement, onDone }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Slide in
    requestAnimationFrame(() => setVisible(true))

    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDone && onDone(), 400)
    }, 3000)

    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      display: 'flex', justifyContent: 'center',
      zIndex: 9999, pointerEvents: 'none',
      padding: '16px 16px 0',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #FFD700, #FFA500)',
        color: '#333', borderRadius: 16,
        padding: '14px 24px',
        boxShadow: '0 4px 20px rgba(255,165,0,0.4)',
        display: 'flex', alignItems: 'center', gap: 12,
        maxWidth: 360,
        transform: visible ? 'translateY(0)' : 'translateY(-100px)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease',
        pointerEvents: 'auto',
      }}>
        <div style={{ fontSize: 28 }}>🏅</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8 }}>업적 달성!</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {achievement.icon} {achievement.title}
          </div>
        </div>
      </div>
    </div>
  )
}
