import { useState, useEffect } from 'react'

const STORAGE_KEY = 'growth-tracker'

const PASSWORDS = {
  '노건우': '150324',
  '노승우': '170410',
}

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

function LineChart({ data, color, unit }) {
  if (!data || data.length === 0) return null
  const W = 320, H = 160
  const padTop = 24, padBottom = 28, padLeft = 8, padRight = 8
  const chartW = W - padLeft - padRight
  const chartH = H - padTop - padBottom

  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = data.map((d, i) => {
    const x = padLeft + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW)
    const y = padTop + chartH - ((d.value - min) / range) * chartH * 0.8 - chartH * 0.1
    return { x, y, ...d }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = linePath + ` L${points[points.length - 1].x},${H - padBottom} L${points[0].x},${H - padBottom} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* 배경 가이드라인 */}
      {[0, 0.25, 0.5, 0.75, 1].map(r => {
        const y = padTop + chartH - r * chartH * 0.8 - chartH * 0.1
        return <line key={r} x1={padLeft} y1={y} x2={W - padRight} y2={y} stroke="#F0F0F0" strokeWidth="1" />
      })}
      {/* 영역 채우기 */}
      {data.length > 1 && <path d={areaPath} fill={color} opacity="0.1" />}
      {/* 라인 */}
      {data.length > 1 && <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {/* 점 + 값 */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="5" fill="#FFF" stroke={color} strokeWidth="2.5" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fill={color} fontSize="10" fontWeight="700">
            {p.value}
          </text>
          <text x={p.x} y={H - padBottom + 14} textAnchor="middle" fill="#AAA" fontSize="9">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function GrowthTracker({ onBack }) {
  const [screen, setScreen] = useState('select') // select | main | add
  const [person, setPerson] = useState(null) // '노건우' | '노승우'
  const [records, setRecords] = useState([])
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(getToday())
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [pendingPerson, setPendingPerson] = useState(null)
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState(false)

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

  const handleProfileClick = (name) => {
    setPendingPerson(name)
    setPassword('')
    setPwError(false)
    setShowModal(true)
  }

  const handlePwSubmit = (val) => {
    const pw = val || password
    if (pw === PASSWORDS[pendingPerson]) {
      setShowModal(false)
      setPerson(pendingPerson)
      const data = getData()
      setRecords((data[pendingPerson] || []).sort((a, b) => a.date.localeCompare(b.date)))
      setScreen('main')
    } else {
      setPwError(true)
    }
  }

  const handlePwChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    setPassword(val)
    setPwError(false)
    if (val.length === 6) {
      setTimeout(() => handlePwSubmit(val), 100)
    }
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
            <button key={p.name} onClick={() => handleProfileClick(p.name)}
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

        {showModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', display: 'flex',
            alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh', zIndex: 200,
          }} onClick={() => setShowModal(false)}>
            <div className="card pop-in"
              style={{ padding: 24, width: 280, textAlign: 'center' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
              <h3 style={{ fontSize: 16, color: 'var(--brown)', marginBottom: 16 }}>
                {pendingPerson}의 비밀번호를 입력하세요
              </h3>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={password}
                onChange={handlePwChange}
                onKeyDown={e => e.key === 'Enter' && handlePwSubmit()}
                autoFocus
                placeholder="비밀번호 6자리"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: `2px solid ${pwError ? '#EF476F' : '#EEE'}`,
                  fontSize: 18, textAlign: 'center', letterSpacing: 8,
                  boxSizing: 'border-box', minWidth: 0,
                }}
              />
              {pwError && (
                <p style={{ color: '#EF476F', fontSize: 13, marginTop: 8 }}>비밀번호가 틀렸어요!</p>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'var(--light-gray)', fontSize: 14, color: 'var(--gray)' }}>
                  취소
                </button>
                <button onClick={() => handlePwSubmit()}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'var(--blue)', fontSize: 14, color: '#FFF' }}>
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
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

        {/* 키 그래프 (SVG 라인) */}
        {heightRecords.length >= 1 && (
          <div style={{
            background: '#FFF', borderRadius: 14, padding: '16px 16px 8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 14,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#333' }}>📏 키 변화</div>
            <div style={{ fontSize: 11, color: '#AAA', marginBottom: 8 }}>
              {minHeight === maxHeight ? `${maxHeight} cm` : `${minHeight} ~ ${maxHeight} cm`}
            </div>
            <LineChart data={heightRecords.map(r => ({ value: r.height, label: r.date.slice(5) }))} color="#06D6A0" unit="cm" />
          </div>
        )}

        {/* 몸무게 그래프 (SVG 라인) */}
        {weightRecords.length >= 1 && (
          <div style={{
            background: '#FFF', borderRadius: 14, padding: '16px 16px 8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 14,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#333' }}>⚖️ 몸무게 변화</div>
            <div style={{ fontSize: 11, color: '#AAA', marginBottom: 8 }}>
              {minWeight === maxWeight ? `${maxWeight} kg` : `${minWeight} ~ ${maxWeight} kg`}
            </div>
            <LineChart data={weightRecords.map(r => ({ value: r.weight, label: r.date.slice(5) }))} color="#4895EF" unit="kg" />
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
