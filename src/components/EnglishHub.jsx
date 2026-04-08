import { useState, useEffect, useCallback } from 'react'
import { getData, updateStreak, isDailyChallengeComplete, getLevelTitle, resetData } from '../utils/englishStorage'

const GAMES = [
  { key: 'wordSprint', icon: '📝', title: '단어 스프린트', desc: '30초 단어 퀴즈', color: '#4895EF' },
  { key: 'spellingTower', icon: '🔠', title: '스펠링 타워', desc: '단어 철자 맞추기', color: '#06D6A0' },
  { key: 'sentenceRush', icon: '🎯', title: '문장 타임어택', desc: '문장 순서 맞추기', color: '#F39C12' },
  { key: 'wordBattle', icon: '🃏', title: '단어 배틀', desc: '한글↔영어 카드 매칭', color: '#7B2FF7' },
  { key: 'championship', icon: '🏆', title: '영어 왕 선발전', desc: '종합 도전!', color: '#D4A017' },
]

const DAILY_CHALLENGES = [
  { key: 'wordSprint', icon: '📝', label: '단어 퀴즈' },
  { key: 'spellingTower', icon: '🔠', label: '스펠링' },
  { key: 'sentenceRush', icon: '🎯', label: '문장' },
]

export default function EnglishHub({ onBack, onSelectGame }) {
  const [recordsOpen, setRecordsOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [, setTick] = useState(0)

  useEffect(() => {
    updateStreak()
  }, [])

  const refresh = useCallback(() => setTick(t => t + 1), [])

  const data = getData()
  const { level = 1, xp = 0, totalScore = 0, diamonds = 0, streak = 0, records = {} } = data

  const levelTitle = getLevelTitle(level)
  const xpForNext = level * 100
  const xpProgress = Math.min(xp / xpForNext, 1)

  const dailyDone = DAILY_CHALLENGES.map(c => isDailyChallengeComplete(c.key))
  const allDailyDone = dailyDone.every(Boolean)

  const getBestRecord = (key) => {
    const r = records[key]
    if (!r) return null
    switch (key) {
      case 'wordSprint':
        if (r.bestScore != null) return `최고 ${r.bestScore}점`
        return null
      case 'spellingTower':
        if (r.bestFloor != null) return `최고 ${r.bestFloor}층`
        return null
      case 'sentenceRush':
        if (r.bestCount != null) return `최고 ${r.bestCount}문장`
        return null
      case 'wordBattle':
        if (r.wins != null || r.losses != null) return `${r.wins || 0}승 ${r.losses || 0}패`
        return null
      case 'championship':
        if (r.medals) {
          const total = Object.values(r.medals).reduce((a, b) => a + b, 0)
          return total > 0 ? `메달 ${total}개` : null
        }
        return null
      default:
        return null
    }
  }

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    resetData()
    setConfirmReset(false)
    refresh()
  }

  return (
    <div className="fade-in" style={{
      maxWidth: 480, margin: '0 auto', padding: 0,
      minHeight: '100vh', background: '#F5F7FA',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #4895EF 0%, #3A7BD5 100%)',
        padding: '20px 16px 28px',
        borderRadius: '0 0 24px 24px',
        position: 'relative',
      }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 12,
          padding: '8px 14px', fontSize: 14, color: '#FFF', cursor: 'pointer',
          marginBottom: 12,
        }}>
          ← 돌아가기
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 4 }}>🔤</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#FFF', margin: 0 }}>영어나라</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
            매일 영어를 배워보자!
          </p>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Profile Card */}
        <div style={{
          background: '#FFF', borderRadius: 20, padding: '20px 20px 16px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginTop: -16,
          position: 'relative', zIndex: 1,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
            }}>
              {levelTitle.emoji}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>
                {levelTitle.emoji} {levelTitle.name} Lv.{level}
              </div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                다음 레벨까지 {Math.max(0, xpForNext - xp)} XP
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{
            height: 8, borderRadius: 4, background: '#EEF2F7',
            marginBottom: 16, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: 'linear-gradient(90deg, #4895EF, #3A7BD5)',
              width: `${xpProgress * 100}%`,
              transition: 'width 0.5s ease',
            }} />
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex', justifyContent: 'space-around', textAlign: 'center',
          }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>⭐ {totalScore}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>총점수</div>
            </div>
            <div style={{ width: 1, background: '#EEF2F7' }} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>💎 {diamonds}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>다이아</div>
            </div>
            <div style={{ width: 1, background: '#EEF2F7' }} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>🔥 {streak}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>연속출석</div>
            </div>
          </div>
        </div>

        {/* Daily Challenge Card */}
        <div style={{
          background: allDailyDone
            ? 'linear-gradient(135deg, #E8F5E9, #C8E6C9)'
            : 'linear-gradient(135deg, #E3F2FD, #BBDEFB)',
          borderRadius: 20, padding: '18px 20px', marginTop: 16,
          border: allDailyDone ? '2px solid #66BB6A' : '2px solid transparent',
        }}>
          <div style={{
            fontSize: 16, fontWeight: 700, marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 20 }}>📋</span>
            오늘의 도전
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            {DAILY_CHALLENGES.map((c, i) => (
              <div key={c.key} style={{
                flex: 1, background: '#FFF', borderRadius: 12, padding: '12px 8px',
                textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>
                  {dailyDone[i] ? '✅' : '○'}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  {c.icon} {c.label}
                </div>
              </div>
            ))}
          </div>

          {allDailyDone ? (
            <div style={{
              textAlign: 'center', fontSize: 15, fontWeight: 700,
              color: '#2E7D32', padding: '8px 0',
              animation: 'pulse 1.5s ease infinite',
            }}>
              🎉 오늘의 도전 완료!
            </div>
          ) : (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#666' }}>
              전부 완료 시 💎×3 보너스!
            </div>
          )}
        </div>

        {/* Game Menu */}
        <div style={{ marginTop: 24, marginBottom: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            🎮 게임 선택
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {GAMES.map(g => {
            const best = getBestRecord(g.key)
            return (
              <button key={g.key}
                onClick={() => onSelectGame(g.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 18px', borderRadius: 16, border: 'none',
                  cursor: 'pointer', background: '#FFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  textAlign: 'left', transition: 'transform 0.1s',
                  width: '100%',
                }}
                onPointerDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                onPointerUp={e => e.currentTarget.style.transform = ''}
                onPointerLeave={e => e.currentTarget.style.transform = ''}
              >
                <div style={{
                  width: 50, height: 50, borderRadius: 14,
                  background: g.color, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 24, flexShrink: 0,
                  color: '#FFF',
                }}>
                  {g.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{g.title}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{g.desc}</div>
                  {best && (
                    <div style={{ fontSize: 11, color: g.color, fontWeight: 600, marginTop: 3 }}>
                      🏅 {best}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 20, color: '#CCC', flexShrink: 0 }}>›</div>
              </button>
            )
          })}
        </div>

        {/* Records Section */}
        <div style={{ marginTop: 28 }}>
          <button
            onClick={() => setRecordsOpen(o => !o)}
            style={{
              width: '100%', background: '#FFF', border: 'none',
              borderRadius: 16, padding: '16px 20px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              fontSize: 16, fontWeight: 700,
            }}
          >
            <span>🏆 나의 기록</span>
            <span style={{
              transform: recordsOpen ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s',
              fontSize: 14, color: '#999',
            }}>
              ▼
            </span>
          </button>

          {recordsOpen && (
            <div style={{
              background: '#FFF', borderRadius: '0 0 16px 16px',
              padding: '4px 20px 16px', marginTop: -8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              {/* Word Sprint records */}
              <RecordSection title="📝 단어 스프린트" color="#4895EF">
                {records.wordSprint?.topicScores ? (
                  Object.entries(records.wordSprint.topicScores).map(([topic, score]) => (
                    <div key={topic} style={recordRow}>
                      <span>{topic}</span>
                      <span style={{ fontWeight: 600 }}>{score}점</span>
                    </div>
                  ))
                ) : (
                  <div style={emptyRecord}>기록 없음</div>
                )}
                {records.wordSprint?.bestScore != null && (
                  <div style={{ ...recordRow, fontWeight: 700, color: '#4895EF' }}>
                    <span>최고 점수</span>
                    <span>{records.wordSprint.bestScore}점</span>
                  </div>
                )}
              </RecordSection>

              {/* Spelling Tower records */}
              <RecordSection title="🔠 스펠링 타워" color="#06D6A0">
                {records.spellingTower?.bestFloor != null ? (
                  <div style={recordRow}>
                    <span>최고 층수</span>
                    <span style={{ fontWeight: 600 }}>{records.spellingTower.bestFloor}층</span>
                  </div>
                ) : (
                  <div style={emptyRecord}>기록 없음</div>
                )}
              </RecordSection>

              {/* Sentence Rush records */}
              <RecordSection title="🎯 문장 타임어택" color="#F39C12">
                {records.sentenceRush?.bestCount != null ? (
                  <div style={recordRow}>
                    <span>최고 문장 수</span>
                    <span style={{ fontWeight: 600 }}>{records.sentenceRush.bestCount}문장</span>
                  </div>
                ) : (
                  <div style={emptyRecord}>기록 없음</div>
                )}
              </RecordSection>

              {/* Word Battle records */}
              <RecordSection title="🃏 단어 배틀" color="#7B2FF7">
                {(records.wordBattle?.wins != null || records.wordBattle?.losses != null) ? (
                  <div style={recordRow}>
                    <span>전적</span>
                    <span style={{ fontWeight: 600 }}>
                      {records.wordBattle?.wins || 0}승 {records.wordBattle?.losses || 0}패
                    </span>
                  </div>
                ) : (
                  <div style={emptyRecord}>기록 없음</div>
                )}
              </RecordSection>

              {/* Championship records */}
              <RecordSection title="🏆 영어 왕 선발전" color="#D4A017">
                {records.championship?.medals ? (
                  Object.entries(records.championship.medals).map(([diff, count]) => (
                    <div key={diff} style={recordRow}>
                      <span>{diff}</span>
                      <span style={{ fontWeight: 600 }}>🏅 ×{count}</span>
                    </div>
                  ))
                ) : (
                  <div style={emptyRecord}>기록 없음</div>
                )}
              </RecordSection>
            </div>
          )}
        </div>

        {/* Footer - Reset */}
        <div style={{ textAlign: 'center', padding: '28px 0 40px' }}>
          <button
            onClick={handleReset}
            style={{
              background: confirmReset ? '#FF6B6B' : '#EEF2F7',
              color: confirmReset ? '#FFF' : '#999',
              border: 'none', borderRadius: 12,
              padding: '10px 20px', fontSize: 13, cursor: 'pointer',
              fontWeight: confirmReset ? 700 : 400,
              transition: 'all 0.2s',
            }}
          >
            {confirmReset ? '⚠️ 정말 초기화할까요?' : '🔄 기록 초기화'}
          </button>
          {confirmReset && (
            <button
              onClick={() => setConfirmReset(false)}
              style={{
                background: 'none', border: 'none', color: '#999',
                fontSize: 13, cursor: 'pointer', marginLeft: 8,
              }}
            >
              취소
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
      `}</style>
    </div>
  )
}

function RecordSection({ title, color, children }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{
        fontSize: 14, fontWeight: 700, color,
        marginBottom: 6, paddingBottom: 4,
        borderBottom: `2px solid ${color}22`,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

const recordRow = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '6px 0', fontSize: 13, borderBottom: '1px solid #F5F5F5',
}

const emptyRecord = {
  fontSize: 12, color: '#BBB', padding: '6px 0', fontStyle: 'italic',
}
