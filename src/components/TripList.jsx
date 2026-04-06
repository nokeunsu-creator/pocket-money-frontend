import { useState, useEffect } from 'react'
import { getTrips, deleteTrip } from '../utils/tripStorage'

export default function TripList({ onBack, onView, onAdd }) {
  const [trips, setTrips] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    setTrips(getTrips())
  }, [])

  const handleDelete = (id) => {
    deleteTrip(id)
    setTrips(getTrips())
    setDeleteTarget(null)
  }

  const getDday = (startDate) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const diff = Math.ceil((start - today) / (1000 * 60 * 60 * 24))
    if (diff > 0) return `D-${diff}`
    if (diff === 0) return 'D-DAY'
    return `D+${Math.abs(diff)}`
  }

  const getDayCount = (startDate, endDate) => {
    const s = new Date(startDate)
    const e = new Date(endDate)
    const nights = Math.ceil((e - s) / (1000 * 60 * 60 * 24))
    return `${nights}박 ${nights + 1}일`
  }

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onBack}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}>
            ←
          </button>
          <h1 style={{ fontSize: 20, color: 'var(--brown)' }}>✈️ 여행 스케줄</h1>
        </div>
        <button
          onClick={onAdd}
          style={{ background: 'var(--blue)', color: '#FFF', padding: '8px 16px', borderRadius: 20, fontSize: 13, border: 'none' }}
        >
          + 새 여행
        </button>
      </div>

      {trips.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gray)' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>✈️</div>
          <p style={{ fontFamily: 'Gaegu, cursive', fontSize: 17 }}>
            여행 계획이 없어요!<br />
            위의 + 새 여행 버튼을 눌러 추가해 보세요
          </p>
        </div>
      ) : (
        trips.map(trip => {
          const dday = getDday(trip.startDate)
          const isDone = dday.startsWith('D+')
          const isToday = dday === 'D-DAY'
          return (
            <div key={trip.id}
              className="card"
              style={{
                padding: 0, marginBottom: 12, overflow: 'hidden', cursor: 'pointer',
                position: 'relative',
              }}
              onClick={() => onView(trip.id)}
            >
              <div style={{
                background: 'linear-gradient(135deg, #4A3F8A 0%, #6B5FBF 100%)',
                padding: '18px 20px 14px',
                color: '#FFF',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: -15, right: -10,
                  fontSize: 60, opacity: 0.1, transform: 'rotate(15deg)'
                }}>✈️</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 'bold' }}>{trip.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                      {trip.startDate} ~ {trip.endDate} · {getDayCount(trip.startDate, trip.endDate)}
                    </div>
                  </div>
                  <div style={{
                    background: isToday ? '#FF6B6B' : isDone ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.25)',
                    padding: '4px 12px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 'bold',
                    animation: isToday ? 'float 2s ease-in-out infinite' : 'none',
                  }}>
                    {dday}
                  </div>
                </div>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--gray)' }}>
                  {trip.familyInfo || ''}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(trip.id) }}
                  style={{ background: 'none', border: 'none', fontSize: 14, color: 'var(--gray)', padding: '4px 8px' }}
                >
                  🗑️
                </button>
              </div>
            </div>
          )
        })
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
            <p style={{ fontSize: 16, marginBottom: 20 }}>이 여행을 삭제할까요?</p>
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
