import { useState, useEffect } from 'react'
import {
  getSavingsGoals, createSavingsGoal, updateSavingsGoal,
  addSavingsAmount, deleteSavingsGoal,
} from '../api/api'
import { fmt } from '../constants'

const EMOJI_CHOICES = ['🎮', '🎁', '📚', '🧸', '🎨', '🚲', '⚽', '🎧', '📱', '💰', '🎂', '🍭']

export default function SavingsGoals({ user }) {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showAmountPrompt, setShowAmountPrompt] = useState(null) // {goalId, mode: 'add'|'sub'}

  const load = async () => {
    try {
      const data = await getSavingsGoals(user)
      setGoals(data)
    } catch (_) { /* skip */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [user])

  const openCreate = () => {
    setEditing({ userName: user, title: '', emoji: '🎮', targetAmount: 10000, currentAmount: 0 })
    setShowModal(true)
  }
  const openEdit = (goal) => {
    setEditing({ ...goal })
    setShowModal(true)
  }
  const saveGoal = async () => {
    if (!editing.title.trim()) return alert('목표 이름을 입력해주세요')
    if (!editing.targetAmount || editing.targetAmount <= 0) return alert('목표 금액은 0보다 커야 해요')
    try {
      if (editing.id) {
        await updateSavingsGoal(editing.id, editing)
      } else {
        await createSavingsGoal({ ...editing, currentAmount: editing.currentAmount || 0 })
      }
      setShowModal(false)
      setEditing(null)
      await load()
    } catch (e) {
      alert('저장 실패: ' + (e.message || e))
    }
  }
  const removeGoal = async (id) => {
    if (!window.confirm('이 목표를 삭제할까요?')) return
    await deleteSavingsGoal(id)
    await load()
  }
  const applyDelta = async (goalId, delta) => {
    try {
      await addSavingsAmount(goalId, delta)
      await load()
    } catch (e) {
      alert('수정 실패: ' + (e.message || e))
    }
    setShowAmountPrompt(null)
  }

  if (loading) return null

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, color: 'var(--brown)', margin: 0 }}>🎯 저축 목표</h3>
        <button onClick={openCreate}
          style={{ background: 'var(--blue)', color: '#FFF', padding: '5px 12px', borderRadius: 16, fontSize: 12, border: 'none' }}>
          + 추가
        </button>
      </div>

      {goals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--gray)', fontSize: 13 }}>
          아직 목표가 없어요.<br />"+ 추가" 버튼으로 저축 목표를 만들어 보세요!
        </div>
      ) : (
        goals.map(g => {
          const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
          const done = g.currentAmount >= g.targetAmount
          return (
            <div key={g.id} style={{
              background: done ? 'linear-gradient(135deg, #FFF9E6, #FFF3CD)' : '#F9F9F9',
              border: done ? '2px solid #F1C40F' : '1px solid #EEE',
              borderRadius: 12, padding: 12, marginBottom: 8, position: 'relative',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 28 }}>{g.emoji || '🎯'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--brown)' }}>
                    {g.title} {done && '🏆'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>
                    {fmt(g.currentAmount)} / {fmt(g.targetAmount)}원
                    <span style={{ marginLeft: 6, color: done ? '#D4AC0D' : 'var(--blue)', fontWeight: 700 }}>
                      ({pct}%)
                    </span>
                  </div>
                </div>
                <button onClick={() => openEdit(g)}
                  style={{ background: 'none', border: 'none', fontSize: 14, color: 'var(--gray)', padding: '2px 6px' }}>
                  ✏️
                </button>
                <button onClick={() => removeGoal(g.id)}
                  style={{ background: 'none', border: 'none', fontSize: 14, color: 'var(--gray)', padding: '2px 6px' }}>
                  🗑️
                </button>
              </div>

              <div style={{
                marginTop: 8, height: 8, background: '#E8E6E1',
                borderRadius: 4, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: done ? 'linear-gradient(90deg, #F1C40F, #E67E22)' : 'linear-gradient(90deg, #4895EF, #06D6A0)',
                  transition: 'width 0.4s ease',
                }} />
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button onClick={() => setShowAmountPrompt({ goalId: g.id, mode: 'add' })}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: 'none', background: '#E7F5FF', color: '#1971C2', fontSize: 12, fontWeight: 700 }}>
                  + 저금
                </button>
                <button onClick={() => setShowAmountPrompt({ goalId: g.id, mode: 'sub' })}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: 'none', background: '#FFF5F5', color: '#C92A2A', fontSize: 12, fontWeight: 700 }}>
                  − 사용
                </button>
              </div>
            </div>
          )
        })
      )}

      {/* 저금/사용 금액 입력 프롬프트 */}
      {showAmountPrompt && (
        <AmountPrompt
          mode={showAmountPrompt.mode}
          onCancel={() => setShowAmountPrompt(null)}
          onConfirm={(amount) => applyDelta(
            showAmountPrompt.goalId,
            showAmountPrompt.mode === 'add' ? amount : -amount,
          )}
        />
      )}

      {/* 목표 생성/수정 모달 */}
      {showModal && editing && (
        <GoalModal
          goal={editing}
          onChange={setEditing}
          onCancel={() => { setShowModal(false); setEditing(null) }}
          onSave={saveGoal}
        />
      )}
    </div>
  )
}

function AmountPrompt({ mode, onCancel, onConfirm }) {
  const [val, setVal] = useState('')
  const num = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0
  return (
    <Modal onClose={onCancel}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>
        {mode === 'add' ? '얼마를 저금할까요?' : '얼마를 사용했나요?'}
      </div>
      <input
        type="number"
        inputMode="numeric"
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder="금액"
        autoFocus
        style={{
          width: '100%', padding: '12px', fontSize: 16, borderRadius: 10,
          border: '2px solid #EEE', textAlign: 'center', marginBottom: 12,
          minWidth: 0, boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel}
          style={{ flex: 1, padding: 12, borderRadius: 10, background: '#F0F0F0', fontSize: 14 }}>
          취소
        </button>
        <button onClick={() => num > 0 && onConfirm(num)}
          disabled={num <= 0}
          style={{ flex: 1, padding: 12, borderRadius: 10, background: mode === 'add' ? 'var(--blue)' : '#C92A2A', color: '#FFF', fontSize: 14, opacity: num > 0 ? 1 : 0.5 }}>
          확인
        </button>
      </div>
    </Modal>
  )
}

function GoalModal({ goal, onChange, onCancel, onSave }) {
  const input = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '2px solid #EEE', fontSize: 14, outline: 'none',
    minWidth: 0, boxSizing: 'border-box',
  }
  return (
    <Modal onClose={onCancel}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, textAlign: 'center' }}>
        {goal.id ? '목표 수정' : '새 저축 목표'}
      </div>

      <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>이모지</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {EMOJI_CHOICES.map(e => (
          <button key={e} onClick={() => onChange({ ...goal, emoji: e })}
            style={{
              width: 38, height: 38, borderRadius: 10, border: goal.emoji === e ? '2px solid var(--blue)' : '2px solid #EEE',
              background: '#FFF', fontSize: 20, cursor: 'pointer',
            }}>
            {e}
          </button>
        ))}
      </div>

      <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>목표 이름</label>
      <input style={{ ...input, marginBottom: 12 }}
        value={goal.title}
        onChange={e => onChange({ ...goal, title: e.target.value })}
        placeholder="예: 닌텐도 게임 사기" />

      <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>목표 금액(원)</label>
      <input style={{ ...input, marginBottom: 16 }}
        type="number"
        inputMode="numeric"
        value={goal.targetAmount}
        onChange={e => onChange({ ...goal, targetAmount: parseInt(e.target.value) || 0 })} />

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel}
          style={{ flex: 1, padding: 12, borderRadius: 10, background: '#F0F0F0', fontSize: 14 }}>
          취소
        </button>
        <button onClick={onSave}
          style={{ flex: 1, padding: 12, borderRadius: 10, background: 'var(--blue)', color: '#FFF', fontSize: 14 }}>
          저장
        </button>
      </div>
    </Modal>
  )
}

function Modal({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.4)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background: '#FFF', borderRadius: 16, padding: 20,
          width: '88%', maxWidth: 340,
        }}>
        {children}
      </div>
    </div>
  )
}
