import { useState, useEffect } from 'react'
import { getTrip } from '../utils/tripStorage'

export default function TripDetail({ tripId, onBack, onEdit }) {
  const [trip, setTrip] = useState(null)

  useEffect(() => {
    setTrip(getTrip(tripId))
  }, [tripId])

  if (!trip) {
    return (
      <div className="page fade-in" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gray)' }}>
        여행을 찾을 수 없어요.
        <br /><br />
        <button onClick={onBack} style={{ padding: '8px 20px', borderRadius: 10, background: 'var(--light-gray)' }}>
          돌아가기
        </button>
      </div>
    )
  }

  const costColor = (type) => {
    if (type === 'free') return '#185FA5'
    if (type === 'est') return '#888780'
    return '#1D9E75'
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: '2rem' }}>
      {/* 히어로 */}
      <div style={{
        background: 'linear-gradient(135deg, #4A3F8A 0%, #6B5FBF 50%, #8B7FDF 100%)',
        color: '#FFF',
        padding: '2.5rem 1.25rem 2rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-50%', right: '-30%',
          width: 200, height: 200,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '50%',
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <button onClick={onBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 16, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 목록
          </button>
          <button onClick={() => onEdit(trip.id)}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 13, borderRadius: 20, padding: '6px 14px', cursor: 'pointer' }}>
            ✏️ 편집
          </button>
        </div>
        <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: 2, textTransform: 'uppercase' }}>family trip</div>
        <div style={{ fontSize: 24, fontWeight: 700, margin: '6px 0 4px' }}>{trip.title}</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          {trip.startDate} ~ {trip.endDate}
        </div>
        {trip.familyInfo && (
          <div style={{
            marginTop: 16,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255,255,255,0.15)',
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: 12,
            backdropFilter: 'blur(4px)',
          }}>
            {trip.familyInfo}
          </div>
        )}
      </div>

      <div style={{ padding: '0 1rem' }}>
        {/* 일자별 카드 */}
        {trip.days.map(day => (
          <div key={day.dayNum} style={{
            background: '#FFF',
            borderRadius: 14,
            marginTop: '1.25rem',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            {/* 일자 헤더 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  background: '#4A3F8A', color: '#FFF',
                  fontSize: 11, fontWeight: 700,
                  padding: '3px 10px', borderRadius: 8,
                }}>
                  DAY {day.dayNum}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{day.title}</div>
                  <div style={{ fontSize: 11, color: '#888780', marginTop: 1 }}>{day.date}</div>
                </div>
              </div>
              {day.weather && (
                <span style={{
                  fontSize: 11, color: '#888780',
                  background: '#F7F6F3',
                  padding: '4px 10px', borderRadius: 8,
                  whiteSpace: 'nowrap',
                }}>
                  {day.weather}
                </span>
              )}
            </div>

            {/* 일정 아이템 */}
            <div style={{ padding: '4px 0' }}>
              {day.items.map((item, idx) => (
                <div key={idx} style={{
                  display: 'grid',
                  gridTemplateColumns: '56px 1fr auto',
                  gap: 6,
                  padding: '10px 16px',
                  alignItems: 'start',
                  borderBottom: idx < day.items.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                }}>
                  <span style={{ fontSize: 12, color: '#888780', fontWeight: 500, paddingTop: 1 }}>
                    {item.time}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {item.name}
                      {item.tag && (
                        <span style={{
                          display: 'inline-block',
                          fontSize: 10, fontWeight: 500,
                          padding: '1px 6px', borderRadius: 4,
                          marginLeft: 4,
                          background: item.tag === '추천' ? '#E1F5EE' : '#FAEEDA',
                          color: item.tag === '추천' ? '#1D9E75' : '#BA7517',
                        }}>
                          {item.tag}
                        </span>
                      )}
                    </div>
                    {item.desc && (
                      <div style={{ fontSize: 11, color: '#888780', marginTop: 2, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                        {item.desc}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: item.costType === 'normal' ? 700 : 500,
                    color: costColor(item.costType),
                    textAlign: 'right', whiteSpace: 'nowrap', paddingTop: 1,
                    fontStyle: item.costType === 'est' ? 'italic' : 'normal',
                  }}>
                    {item.cost}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* 예산 */}
        {trip.budget && (
          <div style={{
            background: '#FFF',
            borderRadius: 14,
            marginTop: '1.25rem',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              fontSize: 15, fontWeight: 700,
            }}>
              예산 총정리
            </div>

            {/* 연료 */}
            {trip.budget.distance && (
              <>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8, padding: '12px 16px',
                  background: '#F7F6F3', textAlign: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#B4B2A9' }}>총 주행거리</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{trip.budget.distance}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#B4B2A9' }}>연비</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{trip.budget.fuelEff}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#B4B2A9' }}>기름값</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{trip.budget.fuelPrice}</div>
                  </div>
                </div>
                <div style={{
                  textAlign: 'center', padding: '8px 16px 14px',
                  fontSize: 12, color: '#888780', background: '#F7F6F3',
                }}>
                  유류비 = <strong style={{ color: '#1D9E75', fontSize: 15 }}>{trip.budget.fuelTotal}</strong>
                </div>
              </>
            )}

            <div style={{ padding: '4px 16px' }}>
              {trip.budget.items.map((item, idx) => (
                <div key={idx}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: idx < trip.budget.items.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                    fontSize: 13,
                  }}>
                    <span style={{ color: '#888780', flex: 1 }}>{item.label}</span>
                    <span style={{
                      fontWeight: 700, whiteSpace: 'nowrap',
                      color: item.type === 'free' ? '#185FA5' : item.type === 'sub' ? '#888780' : undefined,
                    }}>
                      {item.value}
                    </span>
                  </div>
                  {item.detail && (
                    <div style={{ fontSize: 11, color: '#B4B2A9', padding: '0 0 8px', whiteSpace: 'pre-line' }}>
                      {item.detail}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: 16,
              background: '#EEEDFE',
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#4A3F8A' }}>예상 총 경비</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#4A3F8A' }}>{trip.budget.total}</span>
            </div>
          </div>
        )}

        {/* 참고사항 */}
        {trip.notes && (
          <div style={{
            marginTop: '1.25rem',
            padding: '14px 16px',
            background: '#FFF',
            borderRadius: 14,
            fontSize: 12,
            color: '#888780',
            lineHeight: 1.8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            whiteSpace: 'pre-line',
          }}>
            <strong style={{ color: '#2C2C2A', fontWeight: 500 }}>참고사항</strong>
            <br /><br />
            {trip.notes}
          </div>
        )}
      </div>
    </div>
  )
}
