import { useState, useEffect, useCallback } from 'react'
import {
  getStudyDay, checkStudy, uncheckStudy, getStudyHistory,
  getStudySchedule, updateStudySchedule,
  getReadBooks, addReadBook, deleteReadBook,
} from '../api/api'
import { CHILD1, CHILD2 } from '../config/names'

const DAY_LABELS = {
  MONDAY: '월', TUESDAY: '화', WEDNESDAY: '수', THURSDAY: '목',
  FRIDAY: '금', SATURDAY: '토', SUNDAY: '일',
}
const DAYS_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatKoreanDate(str) {
  if (!str) return ''
  const [y, m, d] = str.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  const dow = DAY_LABELS[DAYS_ORDER[(date.getDay() + 6) % 7]]
  return `${y}년 ${Number(m)}월 ${Number(d)}일 (${dow})`
}

export default function StudyMain({ onBack }) {
  const [user, setUser] = useState(null)
  const [screen, setScreen] = useState('today') // today | schedule | books | history
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [dayData, setDayData] = useState(null) // { subjects, checks }
  const [loading, setLoading] = useState(false)
  const [durationInput, setDurationInput] = useState({}) // subject -> minutes string

  const loadDay = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getStudyDay(user, selectedDate)
      setDayData(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [user, selectedDate])

  useEffect(() => {
    if (screen === 'today' && user) loadDay()
  }, [screen, user, loadDay])

  // 프로필 선택 화면
  if (!user) {
    const profiles = [
      { name: CHILD1, photo: '/profiles/nogunwoo.jpg', color: '#4895EF' },
      { name: CHILD2, photo: '/profiles/noseungwoo.jpg', color: '#EF476F' },
    ]
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 56, marginBottom: 12 }}>📋</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>공부 기록</h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>누구의 공부 기록을 볼까요?</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          {profiles.map(p => (
            <button key={p.name} onClick={() => setUser(p.name)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '20px 28px', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: '#FFF', boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              }}>
              <img src={p.photo} alt={p.name}
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${p.color}` }} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const checkedMap = {}
  if (dayData?.checks) {
    for (const c of dayData.checks) checkedMap[c.subject] = c
  }

  const toggleCheck = async (subject) => {
    const existing = checkedMap[subject]
    if (existing) {
      await uncheckStudy(user, selectedDate, subject)
    } else {
      const d = durationInput[subject]
      const duration = d ? parseInt(d, 10) : null
      await checkStudy(user, selectedDate, subject, duration)
      setDurationInput(prev => ({ ...prev, [subject]: '' }))
    }
    loadDay()
  }

  const updateDuration = async (subject, minutesStr) => {
    const minutes = minutesStr ? parseInt(minutesStr, 10) : null
    if (!minutes || minutes <= 0) return
    await checkStudy(user, selectedDate, subject, minutes)
    loadDay()
  }

  // ========== 오늘 화면 ==========
  if (screen === 'today') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={onBack}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>
            ←
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#2C3E50' }}>📋 {user}의 공부 기록</div>
          </div>
        </div>

        {/* 날짜 선택 */}
        <div style={{
          background: '#FFF', borderRadius: 14, padding: '12px 16px', marginBottom: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>📅</span>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{
              flex: 1, minWidth: 0, boxSizing: 'border-box',
              border: 'none', background: 'transparent',
              fontSize: 15, fontWeight: 600, color: '#2C3E50',
            }}
          />
          <button onClick={() => setSelectedDate(todayStr())}
            style={{
              background: '#EBF5FB', color: '#3498DB', border: 'none',
              borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
            오늘
          </button>
        </div>

        <div style={{ fontSize: 13, color: '#888', marginBottom: 8, textAlign: 'center' }}>
          {formatKoreanDate(selectedDate)}
        </div>

        {/* 체크리스트 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>불러오는 중...</div>
        ) : dayData && dayData.subjects.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dayData.subjects.map(subject => {
              const c = checkedMap[subject]
              const checked = !!c
              return (
                <div key={subject} style={{
                  background: checked ? '#E8F8F0' : '#FFF',
                  border: `2px solid ${checked ? '#27AE60' : '#EEE'}`,
                  borderRadius: 14, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'all 0.2s',
                }}>
                  <button onClick={() => toggleCheck(subject)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      border: `2px solid ${checked ? '#27AE60' : '#BBB'}`,
                      background: checked ? '#27AE60' : '#FFF',
                      color: '#FFF', fontSize: 16, fontWeight: 800,
                      cursor: 'pointer', flexShrink: 0,
                    }}>
                    {checked ? '✓' : ''}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 16, fontWeight: 700,
                      color: checked ? '#27AE60' : '#2C3E50',
                      textDecoration: checked ? 'line-through' : 'none',
                    }}>
                      {subject}
                    </div>
                    {checked && c.durationMinutes && (
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                        {c.durationMinutes}분 공부함
                      </div>
                    )}
                  </div>
                  {checked ? (
                    <input
                      type="number"
                      min={1}
                      placeholder="분"
                      defaultValue={c.durationMinutes || ''}
                      onBlur={e => updateDuration(subject, e.target.value)}
                      style={{
                        width: 60, minWidth: 0, boxSizing: 'border-box',
                        border: '1px solid #DDD', borderRadius: 8,
                        padding: '6px 8px', fontSize: 14, textAlign: 'center',
                      }}
                    />
                  ) : (
                    <input
                      type="number"
                      min={1}
                      placeholder="분"
                      inputMode="numeric"
                      value={durationInput[subject] || ''}
                      onChange={e => setDurationInput(prev => ({ ...prev, [subject]: e.target.value }))}
                      style={{
                        width: 60, minWidth: 0, boxSizing: 'border-box',
                        border: '1px solid #DDD', borderRadius: 8,
                        padding: '6px 8px', fontSize: 14, textAlign: 'center',
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{
            textAlign: 'center', padding: 40, color: '#999',
            background: '#F8F9FA', borderRadius: 14,
          }}>
            이 요일에는 과목이 없어요.<br/>
            <button onClick={() => setScreen('schedule')}
              style={{
                marginTop: 12, background: '#3498DB', color: '#FFF', border: 'none',
                borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>
              ⚙ 요일별 과목 설정
            </button>
          </div>
        )}

        {/* 하단 메뉴 */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={() => setScreen('schedule')}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12,
              background: '#FFF', border: '2px solid #3498DB', color: '#3498DB',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
            ⚙ 스케줄
          </button>
          <button onClick={() => setScreen('books')}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12,
              background: '#FFF', border: '2px solid #E67E22', color: '#E67E22',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
            📖 읽은 책
          </button>
          <button onClick={() => setScreen('history')}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12,
              background: '#FFF', border: '2px solid #9B59B6', color: '#9B59B6',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
            📊 기록
          </button>
        </div>
      </div>
    )
  }

  if (screen === 'schedule') return <ScheduleEditor user={user} onBack={() => setScreen('today')} />
  if (screen === 'books') return <BookLog user={user} onBack={() => setScreen('today')} />
  if (screen === 'history') return <HistoryView user={user} onBack={() => setScreen('today')} />
  return null
}

// ========== 스케줄 편집 ==========
function ScheduleEditor({ user, onBack }) {
  const [schedules, setSchedules] = useState([])
  const [editingDay, setEditingDay] = useState(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    getStudySchedule(user).then(setSchedules)
  }, [user])

  const saveDay = async (day) => {
    await updateStudySchedule(user, day, editValue)
    const updated = await getStudySchedule(user)
    setSchedules(updated)
    setEditingDay(null)
  }

  const getSchedule = (day) => schedules.find(s => s.dayOfWeek === day)

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>⚙ 요일별 과목 설정</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>쉼표로 구분 (예: 수학,영어,독서)</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {DAYS_ORDER.map(day => {
          const s = getSchedule(day)
          const subjects = s?.subjects || ''
          const isEditing = editingDay === day
          return (
            <div key={day} style={{
              background: '#FFF', borderRadius: 14, padding: '12px 16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isEditing ? 8 : 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#3498DB', color: '#FFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 800, flexShrink: 0,
                }}>
                  {DAY_LABELS[day]}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    autoFocus
                    style={{
                      flex: 1, minWidth: 0, boxSizing: 'border-box',
                      border: '1px solid #3498DB', borderRadius: 8,
                      padding: '6px 10px', fontSize: 15,
                    }}
                  />
                ) : (
                  <div style={{
                    flex: 1, minWidth: 0, fontSize: 14, color: subjects ? '#333' : '#AAA',
                  }}>
                    {subjects || '(없음)'}
                  </div>
                )}
                {isEditing ? (
                  <>
                    <button onClick={() => saveDay(day)}
                      style={{
                        background: '#27AE60', color: '#FFF', border: 'none',
                        borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}>
                      저장
                    </button>
                    <button onClick={() => setEditingDay(null)}
                      style={{
                        background: '#EEE', color: '#666', border: 'none',
                        borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer',
                      }}>
                      취소
                    </button>
                  </>
                ) : (
                  <button onClick={() => { setEditingDay(day); setEditValue(subjects) }}
                    style={{
                      background: '#EBF5FB', color: '#3498DB', border: 'none',
                      borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>
                    수정
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ========== 책 기록 ==========
function BookLog({ user, onBack }) {
  const [books, setBooks] = useState([])
  const [title, setTitle] = useState('')
  const [readDate, setReadDate] = useState(todayStr())

  const load = async () => setBooks(await getReadBooks(user))
  useEffect(() => { load() }, [user]) // eslint-disable-line

  const add = async () => {
    if (!title.trim()) return
    await addReadBook({ userName: user, title: title.trim(), readDate })
    setTitle('')
    setReadDate(todayStr())
    load()
  }

  const del = async (id) => {
    if (!window.confirm('삭제할까요?')) return
    await deleteReadBook(id)
    load()
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>
          ←
        </button>
        <div style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>📖 {user}의 읽은 책</div>
      </div>

      <div style={{
        background: '#FFF', borderRadius: 14, padding: '14px', marginBottom: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <input
          type="text"
          placeholder="책 제목"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: '1px solid #DDD', borderRadius: 10,
            padding: '10px 12px', fontSize: 15, marginBottom: 8,
          }}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="date"
            value={readDate}
            onChange={e => setReadDate(e.target.value)}
            style={{
              flex: 1, minWidth: 0, boxSizing: 'border-box',
              border: '1px solid #DDD', borderRadius: 10,
              padding: '10px 12px', fontSize: 14,
            }}
          />
          <button onClick={add} disabled={!title.trim()}
            style={{
              background: title.trim() ? '#E67E22' : '#CCC', color: '#FFF', border: 'none',
              borderRadius: 10, padding: '10px 20px', fontSize: 15, fontWeight: 700,
              cursor: title.trim() ? 'pointer' : 'default', flexShrink: 0,
            }}>
            추가
          </button>
        </div>
      </div>

      {books.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          아직 읽은 책이 없어요 📚
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {books.map(b => (
            <div key={b.id} style={{
              background: '#FFF', borderRadius: 12, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <span style={{ fontSize: 22 }}>📖</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>{b.title}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{b.readDate}</div>
              </div>
              <button onClick={() => del(b.id)}
                style={{
                  background: 'none', border: 'none', color: '#E74C3C',
                  cursor: 'pointer', fontSize: 18, padding: 4,
                }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ========== 히스토리 ==========
function HistoryView({ user, onBack }) {
  const [checks, setChecks] = useState([])
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [to, setTo] = useState(todayStr())

  const load = useCallback(async () => {
    const data = await getStudyHistory(user, from, to)
    setChecks(data)
  }, [user, from, to])

  useEffect(() => { load() }, [load])

  // 날짜별 그룹핑
  const grouped = {}
  for (const c of checks) {
    if (!grouped[c.date]) grouped[c.date] = []
    grouped[c.date].push(c)
  }
  const dates = Object.keys(grouped).sort().reverse()

  const totalDays = dates.length
  const totalMinutes = checks.reduce((s, c) => s + (c.durationMinutes || 0), 0)

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>
          ←
        </button>
        <div style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>📊 {user}의 공부 기록</div>
      </div>

      <div style={{
        background: '#FFF', borderRadius: 14, padding: '12px 16px', marginBottom: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
          style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', border: '1px solid #DDD', borderRadius: 8, padding: '6px 10px', fontSize: 13 }} />
        <span>~</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)}
          style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', border: '1px solid #DDD', borderRadius: 8, padding: '6px 10px', fontSize: 13 }} />
      </div>

      <div style={{
        display: 'flex', gap: 10, marginBottom: 16,
      }}>
        <div style={{ flex: 1, background: '#EBF5FB', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#3498DB', fontWeight: 700 }}>공부한 날</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2C3E50' }}>{totalDays}일</div>
        </div>
        <div style={{ flex: 1, background: '#FEF5E7', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#E67E22', fontWeight: 700 }}>총 시간</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2C3E50' }}>{totalMinutes}분</div>
        </div>
      </div>

      {dates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>이 기간에 기록이 없어요</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dates.map(date => (
            <div key={date} style={{
              background: '#FFF', borderRadius: 12, padding: '12px 16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 8, fontWeight: 600 }}>
                {formatKoreanDate(date)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {grouped[date].map(c => (
                  <div key={c.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 14, padding: '4px 0',
                  }}>
                    <span style={{ color: '#2C3E50', fontWeight: 600 }}>✓ {c.subject}</span>
                    {c.durationMinutes ? (
                      <span style={{ color: '#888', fontSize: 13 }}>{c.durationMinutes}분</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
