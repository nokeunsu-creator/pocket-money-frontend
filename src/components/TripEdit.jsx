import { useState, useEffect } from 'react'
import { getTrip, saveTrip, generateId } from '../utils/tripStorage'

const emptyItem = () => ({ time: '', name: '', desc: '', cost: '', costType: 'normal', tag: '' })
const emptyDay = (num) => ({ dayNum: num, title: '', date: '', weather: '', items: [emptyItem()] })
const emptyBudgetItem = () => ({ label: '', value: '', detail: '', type: '' })

export default function TripEdit({ tripId, onDone, onCancel }) {
  const isNew = !tripId
  const [trip, setTrip] = useState({
    id: generateId(),
    title: '',
    subtitle: '',
    startDate: '',
    endDate: '',
    familyInfo: '',
    days: [emptyDay(1)],
    budget: {
      distance: '', fuelEff: '', fuelPrice: '', fuelTotal: '',
      items: [emptyBudgetItem()],
      total: '',
    },
    notes: '',
  })
  const [openDay, setOpenDay] = useState(0) // 열린 일자 인덱스
  const [section, setSection] = useState('info') // 'info' | 'days' | 'budget'

  useEffect(() => {
    if (tripId) {
      const existing = getTrip(tripId)
      if (existing) setTrip(existing)
    }
  }, [tripId])

  const updateTrip = (field, value) => {
    setTrip(prev => ({ ...prev, [field]: value }))
  }

  // 날짜 변경시 days 자동 생성
  useEffect(() => {
    if (trip.startDate && trip.endDate) {
      const s = new Date(trip.startDate)
      const e = new Date(trip.endDate)
      const nights = Math.ceil((e - s) / (1000 * 60 * 60 * 24))
      if (nights > 0 && nights <= 30) {
        const dayNames = ['일', '월', '화', '수', '목', '금', '토']
        setTrip(prev => {
          const newDays = []
          for (let i = 0; i <= nights; i++) {
            const d = new Date(s)
            d.setDate(d.getDate() + i)
            const existing = prev.days[i]
            newDays.push({
              dayNum: i + 1,
              title: existing?.title || '',
              date: `${d.getMonth() + 1}월 ${d.getDate()}일 (${dayNames[d.getDay()]})`,
              weather: existing?.weather || '',
              items: existing?.items || [emptyItem()],
            })
          }
          return { ...prev, days: newDays }
        })
      }
    }
  }, [trip.startDate, trip.endDate])

  const updateDay = (dayIdx, field, value) => {
    setTrip(prev => {
      const days = [...prev.days]
      days[dayIdx] = { ...days[dayIdx], [field]: value }
      return { ...prev, days }
    })
  }

  const updateItem = (dayIdx, itemIdx, field, value) => {
    setTrip(prev => {
      const days = [...prev.days]
      const items = [...days[dayIdx].items]
      items[itemIdx] = { ...items[itemIdx], [field]: value }
      days[dayIdx] = { ...days[dayIdx], items }
      return { ...prev, days }
    })
  }

  const addItem = (dayIdx) => {
    setTrip(prev => {
      const days = [...prev.days]
      days[dayIdx] = { ...days[dayIdx], items: [...days[dayIdx].items, emptyItem()] }
      return { ...prev, days }
    })
  }

  const removeItem = (dayIdx, itemIdx) => {
    setTrip(prev => {
      const days = [...prev.days]
      const items = days[dayIdx].items.filter((_, i) => i !== itemIdx)
      days[dayIdx] = { ...days[dayIdx], items: items.length ? items : [emptyItem()] }
      return { ...prev, days }
    })
  }

  const updateBudget = (field, value) => {
    setTrip(prev => ({
      ...prev,
      budget: { ...prev.budget, [field]: value }
    }))
  }

  const updateBudgetItem = (idx, field, value) => {
    setTrip(prev => {
      const items = [...prev.budget.items]
      items[idx] = { ...items[idx], [field]: value }
      return { ...prev, budget: { ...prev.budget, items } }
    })
  }

  const addBudgetItem = () => {
    setTrip(prev => ({
      ...prev,
      budget: { ...prev.budget, items: [...prev.budget.items, emptyBudgetItem()] }
    }))
  }

  const removeBudgetItem = (idx) => {
    setTrip(prev => {
      const items = prev.budget.items.filter((_, i) => i !== idx)
      return { ...prev, budget: { ...prev.budget, items: items.length ? items : [emptyBudgetItem()] } }
    })
  }

  const handleSave = () => {
    if (!trip.title.trim()) {
      alert('여행 제목을 입력해 주세요.')
      return
    }
    if (!trip.startDate || !trip.endDate) {
      alert('날짜를 입력해 주세요.')
      return
    }
    saveTrip(trip)
    onDone()
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '2px solid #EEE', fontSize: 14, outline: 'none',
    fontFamily: 'inherit',
  }

  const labelStyle = {
    fontSize: 12, color: 'var(--gray)', marginBottom: 4, display: 'block',
  }

  const tabs = [
    { key: 'info', label: '기본정보' },
    { key: 'days', label: `일정 (${trip.days.length}일)` },
    { key: 'budget', label: '예산' },
  ]

  return (
    <div className="page fade-in">
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onCancel}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}>
            ←
          </button>
          <h1 style={{ fontSize: 20, color: 'var(--brown)' }}>
            {isNew ? '✈️ 새 여행' : '✏️ 여행 수정'}
          </h1>
        </div>
        <button onClick={handleSave}
          style={{
            background: 'linear-gradient(135deg, #4A3F8A 0%, #6B5FBF 100%)',
            color: '#FFF', padding: '8px 20px', borderRadius: 20, fontSize: 14, border: 'none',
          }}>
          저장
        </button>
      </div>

      {/* 섹션 탭 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 10, overflow: 'hidden', border: '2px solid #EEE' }}>
        {tabs.map(t => (
          <button key={t.key}
            onClick={() => setSection(t.key)}
            style={{
              flex: 1, padding: '10px 0', fontSize: 13, border: 'none',
              background: section === t.key ? '#4A3F8A' : '#FFF',
              color: section === t.key ? '#FFF' : 'var(--gray)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* === 기본정보 === */}
      {section === 'info' && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>여행 제목 *</label>
            <input style={inputStyle} value={trip.title} placeholder="예: 거제도 가족여행"
              onChange={e => updateTrip('title', e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>부제목</label>
            <input style={inputStyle} value={trip.subtitle || ''} placeholder="예: 3박 4일"
              onChange={e => updateTrip('subtitle', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>시작일 *</label>
              <input type="date" style={inputStyle} value={trip.startDate}
                onChange={e => updateTrip('startDate', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>종료일 *</label>
              <input type="date" style={inputStyle} value={trip.endDate}
                onChange={e => updateTrip('endDate', e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>인원 정보</label>
            <input style={inputStyle} value={trip.familyInfo} placeholder="예: 성인 2 + 어린이 2"
              onChange={e => updateTrip('familyInfo', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>참고사항</label>
            <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
              value={trip.notes} placeholder="메모, 주의사항 등"
              onChange={e => updateTrip('notes', e.target.value)} />
          </div>
        </div>
      )}

      {/* === 일정 === */}
      {section === 'days' && (
        <div>
          {trip.days.map((day, dayIdx) => (
            <div key={dayIdx} className="card" style={{ padding: 0, marginBottom: 12, overflow: 'hidden' }}>
              {/* 일자 헤더 (클릭으로 토글) */}
              <div
                onClick={() => setOpenDay(openDay === dayIdx ? -1 : dayIdx)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', cursor: 'pointer',
                  background: openDay === dayIdx ? '#4A3F8A' : '#F7F6F3',
                  color: openDay === dayIdx ? '#FFF' : undefined,
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    background: openDay === dayIdx ? 'rgba(255,255,255,0.2)' : '#4A3F8A',
                    color: '#FFF', fontSize: 11, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 6,
                  }}>
                    DAY {day.dayNum}
                  </span>
                  <span style={{ fontSize: 13 }}>
                    {day.title || day.date || '(제목 없음)'}
                  </span>
                </div>
                <span style={{ fontSize: 12 }}>
                  {day.items.length}개 · {openDay === dayIdx ? '▲' : '▼'}
                </span>
              </div>

              {/* 일자 상세 (펼침) */}
              {openDay === dayIdx && (
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <div style={{ flex: 2 }}>
                      <label style={labelStyle}>일자 제목</label>
                      <input style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }}
                        value={day.title} placeholder="예: 서울 → 거제"
                        onChange={e => updateDay(dayIdx, 'title', e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>날씨</label>
                      <input style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }}
                        value={day.weather} placeholder="17°/8°C"
                        onChange={e => updateDay(dayIdx, 'weather', e.target.value)} />
                    </div>
                  </div>

                  {/* 일정 아이템들 */}
                  {day.items.map((item, itemIdx) => (
                    <div key={itemIdx} style={{
                      background: '#F9F9F9', borderRadius: 10, padding: 12, marginBottom: 8,
                      position: 'relative',
                    }}>
                      <button
                        onClick={() => removeItem(dayIdx, itemIdx)}
                        style={{
                          position: 'absolute', top: 8, right: 8,
                          background: 'none', border: 'none', fontSize: 14, color: '#CCC', cursor: 'pointer',
                        }}
                      >✕</button>

                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 70 }}>
                          <input style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }}
                            value={item.time} placeholder="09:00"
                            onChange={e => updateItem(dayIdx, itemIdx, 'time', e.target.value)} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <input style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }}
                            value={item.name} placeholder="일정 이름"
                            onChange={e => updateItem(dayIdx, itemIdx, 'name', e.target.value)} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <textarea style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, minHeight: 40, resize: 'vertical' }}
                          value={item.desc} placeholder="설명"
                          onChange={e => updateItem(dayIdx, itemIdx, 'desc', e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <input style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }}
                            value={item.cost} placeholder="비용 (예: 30,000)"
                            onChange={e => updateItem(dayIdx, itemIdx, 'cost', e.target.value)} />
                        </div>
                        <select style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, width: 80 }}
                          value={item.costType}
                          onChange={e => updateItem(dayIdx, itemIdx, 'costType', e.target.value)}>
                          <option value="normal">확정</option>
                          <option value="est">추정</option>
                          <option value="free">무료</option>
                          <option value="none">없음</option>
                        </select>
                        <select style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, width: 80 }}
                          value={item.tag || ''}
                          onChange={e => updateItem(dayIdx, itemIdx, 'tag', e.target.value)}>
                          <option value="">태그</option>
                          <option value="추천">추천</option>
                          <option value="미정">미정</option>
                        </select>
                      </div>
                    </div>
                  ))}

                  <button onClick={() => addItem(dayIdx)}
                    style={{
                      width: '100%', padding: 10, borderRadius: 10,
                      border: '2px dashed #DDD', background: 'none',
                      fontSize: 13, color: 'var(--gray)', cursor: 'pointer',
                    }}>
                    + 일정 추가
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* === 예산 === */}
      {section === 'budget' && (
        <div>
          {/* 연료비 */}
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 14, color: 'var(--brown)', marginBottom: 12 }}>🚗 유류비 계산</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>총 거리</label>
                <input style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }}
                  value={trip.budget.distance} placeholder="~850km"
                  onChange={e => updateBudget('distance', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>연비</label>
                <input style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }}
                  value={trip.budget.fuelEff} placeholder="15km/L"
                  onChange={e => updateBudget('fuelEff', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>기름값</label>
                <input style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }}
                  value={trip.budget.fuelPrice} placeholder="2,000원/L"
                  onChange={e => updateBudget('fuelPrice', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>유류비 합계</label>
                <input style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }}
                  value={trip.budget.fuelTotal} placeholder="약 113,000원"
                  onChange={e => updateBudget('fuelTotal', e.target.value)} />
              </div>
            </div>
          </div>

          {/* 예산 항목 */}
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 14, color: 'var(--brown)', marginBottom: 12 }}>💸 예산 항목</h3>
            {trip.budget.items.map((item, idx) => (
              <div key={idx} style={{
                background: '#F9F9F9', borderRadius: 10, padding: 12, marginBottom: 8,
                position: 'relative',
              }}>
                <button
                  onClick={() => removeBudgetItem(idx)}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'none', border: 'none', fontSize: 14, color: '#CCC', cursor: 'pointer',
                  }}
                >✕</button>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 2 }}>
                    <input style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }}
                      value={item.label} placeholder="항목명"
                      onChange={e => updateBudgetItem(idx, 'label', e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }}
                      value={item.value} placeholder="금액"
                      onChange={e => updateBudgetItem(idx, 'value', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <textarea style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, minHeight: 36, resize: 'vertical' }}
                      value={item.detail || ''} placeholder="상세 (선택)"
                      onChange={e => updateBudgetItem(idx, 'detail', e.target.value)} />
                  </div>
                  <select style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, width: 80 }}
                    value={item.type || ''}
                    onChange={e => updateBudgetItem(idx, 'type', e.target.value)}>
                    <option value="">일반</option>
                    <option value="free">무료</option>
                    <option value="sub">보조</option>
                  </select>
                </div>
              </div>
            ))}
            <button onClick={addBudgetItem}
              style={{
                width: '100%', padding: 10, borderRadius: 10,
                border: '2px dashed #DDD', background: 'none',
                fontSize: 13, color: 'var(--gray)', cursor: 'pointer',
              }}>
              + 항목 추가
            </button>
          </div>

          {/* 총 예산 */}
          <div className="card" style={{ padding: 16 }}>
            <label style={labelStyle}>예상 총 경비</label>
            <input style={{ ...inputStyle, fontSize: 18, fontWeight: 'bold', color: '#4A3F8A', textAlign: 'center' }}
              value={trip.budget.total} placeholder="약 000,000원"
              onChange={e => updateBudget('total', e.target.value)} />
          </div>
        </div>
      )}

      {/* 하단 여백 */}
      <div style={{ height: 40 }} />
    </div>
  )
}
