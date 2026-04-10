import { useState, useEffect } from 'react'

const STORAGE_KEY = 'growth-tracker'

function getData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch { return {} }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(str) {
  if (!str) return ''
  const [y, m, d] = str.split('-')
  return `${y}년 ${Number(m)}월 ${Number(d)}일`
}

export default function GrowthTracker({ onBack }) {
  const [screen, setScreen] = useState('select') // select | main | add
  const [person, setPerson] = useState(null) // '노건우' | '노승우'
  const [records, setRecords] = useState([])
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(getToday())
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    if (!person) return
    const data = getData()
    setRecords((data[person] || []).sort((a, b) => a.date.localeCompare(b.date)))
  }, [person])

  const handleSave = () => {
    if (!height && !weight) return
    const entry = {
      id: Date.now(),
      date,
      height: height ? Number(height) : null,
      weight: weight ? Number(weight) : null,
    }
    const data = getData()
    const list = data[person] || []
    // 같은 날짜가 있으면 교체
    const existing = list.findIndex(r => r.date === date)
    if (existing >= 0) list[existing] = entry
    else list.push(entry)
    list.sort((a, b) => a.date.localeCompare(b.date))
    data[person] = list
    saveData(data)
    setRecords([...list])
    setHeight('')
    setWeight('')
    setScreen('main')
  }

  const handleDelete = (id) => {
    if (confirmDelete !== id) { setConfirmDelete(id); return }
    const data = getData()
    data[person] = (data[person] || []).filter(r => r.id !== id)
    saveData(data)
    setRecords([...data[person]])
    setConfirmDelete(null)
  }

  const selectPerson = (name) => {
    setPerson(name)
    const data = getData()
    setRecords((data[name] || []).sort((a, b) => a.date.localeCompare(b.date)))
    setScreen('main')
  }

  // 성장 통계
  const getStats = () => {
    if (records.length < 2) return null
    const first = records[0]
    const last = records[records.length - 1]
    const heightDiff = (first.height && last.height) ? (last.height - first.height).toFixed(1) : null
    const weightDiff = (first.weight && last.weight) ? (last.weight - first.weight).toFixed(1) : null
    return { first, last, heightDiff, weightDiff }
  }

  // 프로필 선택
  if (screen === 'select') {
    const profiles = [
      { name: '노건우', photo: '/profiles/nogunwoo.jpg', color: '#4895EF' },
      { name: '노승우', photo: '/profiles/noseungwoo.jpg', color: '#EF476F' },
    ]
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 56, marginBottom: 12 }}>📏</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>성장 기록</h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>누구의 성장 기록을 볼까요?</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          {profiles.map(p => (
            <button key={p.name} onClick={() => selectPerson(p.name)}
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

  // 기록 추가
  if (screen === 'add') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #06D6A0, #05B384)',
          color: '#FFF', padding: '16px', borderRadius: 16, marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <button onClick={() => setScreen('main')}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
              ← 돌아가기
            </button>
            <span style={{ fontSize: 18, fontWeight: 700 }}>📏 기록 추가</span>
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginLeft: 44 }}>{person}</div>
        </div>

        <div style={{ background: '#FFF', borderRadius: 14, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 8 }}>📅 날짜</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '2px solid #E0E0E0', fontSize: 15, boxSizing: 'border-box' }} />
        </div>

        <div style={{ background: '#FFF', borderRadius: 14, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 8 }}>📏 키 (cm)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="text" inputMode="decimal" value={height}
              onChange={e => setHeight(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="예: 135.5"
              style={{ flex: 1, minWidth: 0, padding: '12px', borderRadius: 10, border: '2px solid #E0E0E0', fontSize: 18, fontWeight: 700, textAlign: 'center', boxSizing: 'border-box' }} />
            <span style={{ fontSize: 14, color: '#888', fontWeight: 600, flexShrink: 0 }}>cm</span>
          </div>
        </div>

        <div style={{ background: '#FFF', borderRadius: 14, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 20 }}>
          <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 8 }}>⚖️ 몸무게 (kg)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="text" inputMode="decimal" value={weight}
              onChange={e => setWeight(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="예: 32.0"
              style={{ flex: 1, minWidth: 0, padding: '12px', borderRadius: 10, border: '2px solid #E0E0E0', fontSize: 18, fontWeight: 700, textAlign: 'center', boxSizing: 'border-box' }} />
            <span style={{ fontSize: 14, color: '#888', fontWeight: 600, flexShrink: 0 }}>kg</span>
          </div>
        </div>

        <button onClick={handleSave} disabled={!height && !weight}
          style={{
            width: '100%', padding: '16px', borderRadius: 14, border: 'none',
            background: (height || weight) ? 'linear-gradient(135deg, #06D6A0, #05B384)' : '#DDD',
            color: (height || weight) ? '#FFF' : '#AAA',
            fontSize: 16, fontWeight: 700, cursor: (height || weight) ? 'pointer' : 'default',
          }}>
          저장하기
        </button>
      </div>
    )
  }

  // 메인 화면
  const stats = getStats()
  const latest = records.length > 0 ? records[records.length - 1] : null

  // 간단한 그래프 계산
  const heightRecords = records.filter(r => r.height)
  const weightRecords = records.filter(r => r.weight)
  const maxHeight = heightRecords.length > 0 ? Math.max(...heightRecords.map(r => r.height)) : 0
  const minHeight = heightRecords.length > 0 ? Math.min(...heightRecords.map(r => r.height)) : 0
  const maxWeight = weightRecords.length > 0 ? Math.max(...weightRecords.map(r => r.weight)) : 0
  const minWeight = weightRecords.length > 0 ? Math.min(...weightRecords.map(r => r.weight)) : 0

  const heightRange = maxHeight - minHeight || 10
  const weightRange = maxWeight - minWeight || 5

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #06D6A0, #05B384)',
        color: '#FFF', padding: '16px 16px 14px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <button onClick={() => { setScreen('select'); setPerson(null) }}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 돌아가기
          </button>
          <span style={{ fontSize: 13, opacity: 0.85 }}>{person}</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>📏 성장 기록</div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* 현재 상태 카드 */}
        {latest && (
          <div style={{
            background: '#FFF', borderRadius: 14, padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 14,
          }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>현재 ({formatDate(latest.date)})</div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              {latest.height && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#06D6A0' }}>{latest.height}</div>
                  <div style={{ fontSize: 13, color: '#888' }}>cm</div>
                </div>
              )}
              {latest.height && latest.weight && (
                <div style={{ width: 1, background: '#EEE', margin: '0 8px' }} />
              )}
              {latest.weight && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#4895EF' }}>{latest.weight}</div>
                  <div style={{ fontSize: 13, color: '#888' }}>kg</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 성장 통계 */}
        {stats && (
          <div style={{
            background: '#FFF', borderRadius: 14, padding: '16px 20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 14,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#333' }}>📊 성장 변화</div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
              {formatDate(stats.first.date)} ~ {formatDate(stats.last.date)}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {stats.heightDiff !== null && (
                <div style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  background: Number(stats.heightDiff) >= 0 ? '#F0FFF4' : '#FFF5F5',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>키 변화</div>
                  <div style={{
                    fontSize: 20, fontWeight: 700,
                    color: Number(stats.heightDiff) >= 0 ? '#06D6A0' : '#EF476F',
                  }}>
                    {Number(stats.heightDiff) > 0 ? '+' : ''}{stats.heightDiff}cm
                  </div>
                </div>
              )}
              {stats.weightDiff !== null && (
                <div style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  background: '#F0F4FF', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>몸무게 변화</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#4895EF' }}>
                    {Number(stats.weightDiff) > 0 ? '+' : ''}{stats.weightDiff}kg
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 키 그래프 */}
        {heightRecords.length >= 2 && (
          <div style={{
            background: '#FFF', borderRadius: 14, padding: '16px 20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 14,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#333' }}>📏 키 변화</div>
            <div style={{ position: 'relative', height: 120, display: 'flex', alignItems: 'flex-end', gap: 2, padding: '0 4px' }}>
              {heightRecords.map((r, i) => {
                const pct = heightRange > 0 ? ((r.height - minHeight) / heightRange) * 80 + 20 : 50
                return (
                  <div key={r.id || i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: '#06D6A0', fontWeight: 700 }}>{r.height}</span>
                    <div style={{
                      width: '100%', maxWidth: 28, borderRadius: '6px 6px 0 0',
                      background: 'linear-gradient(180deg, #06D6A0, #05B384)',
                      height: `${pct}%`, minHeight: 8,
                      transition: 'height 0.3s',
                    }} />
                    <span style={{ fontSize: 9, color: '#AAA', whiteSpace: 'nowrap' }}>
                      {r.date.slice(5)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 몸무게 그래프 */}
        {weightRecords.length >= 2 && (
          <div style={{
            background: '#FFF', borderRadius: 14, padding: '16px 20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 14,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#333' }}>⚖️ 몸무게 변화</div>
            <div style={{ position: 'relative', height: 120, display: 'flex', alignItems: 'flex-end', gap: 2, padding: '0 4px' }}>
              {weightRecords.map((r, i) => {
                const pct = weightRange > 0 ? ((r.weight - minWeight) / weightRange) * 80 + 20 : 50
                return (
                  <div key={r.id || i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: '#4895EF', fontWeight: 700 }}>{r.weight}</span>
                    <div style={{
                      width: '100%', maxWidth: 28, borderRadius: '6px 6px 0 0',
                      background: 'linear-gradient(180deg, #4895EF, #3A7BD5)',
                      height: `${pct}%`, minHeight: 8,
                      transition: 'height 0.3s',
                    }} />
                    <span style={{ fontSize: 9, color: '#AAA', whiteSpace: 'nowrap' }}>
                      {r.date.slice(5)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 기록 추가 버튼 */}
        <button onClick={() => { setDate(getToday()); setHeight(''); setWeight(''); setScreen('add') }}
          style={{
            width: '100%', padding: '16px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, #06D6A0, #05B384)',
            color: '#FFF', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            marginBottom: 14,
          }}>
          + 기록 추가
        </button>

        {/* 기록 목록 */}
        {records.length > 0 && (
          <div style={{
            background: '#FFF', borderRadius: 14, padding: '16px 20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 14,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#333' }}>📋 전체 기록</div>
            {[...records].reverse().map(r => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: '1px solid #F2F2F2',
              }}>
                <div>
                  <div style={{ fontSize: 13, color: '#999' }}>{formatDate(r.date)}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
                    {r.height && <span style={{ color: '#06D6A0' }}>{r.height}cm</span>}
                    {r.height && r.weight && <span style={{ color: '#DDD' }}> · </span>}
                    {r.weight && <span style={{ color: '#4895EF' }}>{r.weight}kg</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(r.id)}
                  style={{
                    background: confirmDelete === r.id ? '#EF476F' : 'none',
                    border: confirmDelete === r.id ? 'none' : '1px solid #EEE',
                    color: confirmDelete === r.id ? '#FFF' : '#CCC',
                    fontSize: 12, borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                  }}>
                  {confirmDelete === r.id ? '확인' : '삭제'}
                </button>
              </div>
            ))}
          </div>
        )}

        {records.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#BBB' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📏</div>
            <div style={{ fontSize: 14 }}>아직 기록이 없어요</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>위 버튼을 눌러 첫 기록을 추가해보세요!</div>
          </div>
        )}
      </div>
    </div>
  )
}
