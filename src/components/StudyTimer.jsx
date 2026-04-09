import { useState, useEffect, useRef, useCallback } from 'react'
import {
  SUBJECTS,
  getTodayTotal,
  getTodayRecords,
  getWeekStats,
  getSubjectStats,
  addRecord,
} from '../utils/studyStorage'

const POMODORO_WORK = 25 * 60
const POMODORO_BREAK = 5 * 60
const POMODORO_LONG_BREAK = 15 * 60
const POMODORO_SETS = 4

const FREE_OPTIONS = [
  { label: '10분', minutes: 10 },
  { label: '20분', minutes: 20 },
  { label: '30분', minutes: 30 },
  { label: '45분', minutes: 45 },
  { label: '60분', minutes: 60 },
]

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

function formatMinutes(m) {
  if (m < 60) return `${m}분`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r > 0 ? `${h}시간 ${r}분` : `${h}시간`
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function StudyTimer({ onBack }) {
  // Screen: 'main' | 'selectFreeTime' | 'timer' | 'complete'
  const [screen, setScreen] = useState('main')
  const [mode, setMode] = useState(null) // 'pomodoro' | 'free'
  const [subject, setSubject] = useState(null)
  const [showStats, setShowStats] = useState(false)
  const [customMinutes, setCustomMinutes] = useState('')

  // Timer state
  const [timeLeft, setTimeLeft] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [phase, setPhase] = useState('work') // 'work' | 'break'
  const [pomodoroSet, setPomodoroSet] = useState(1)
  const [completedSets, setCompletedSets] = useState(0)
  const [workedSeconds, setWorkedSeconds] = useState(0)

  // Stats
  const [todayTotal, setTodayTotal] = useState(0)
  const [todayRecords, setTodayRecords] = useState([])
  const [weekStats, setWeekStats] = useState([])
  const [subjectStats, setSubjectStats] = useState({})

  const timerRef = useRef(null)
  const workedRef = useRef(0)

  const refreshStats = useCallback(() => {
    setTodayTotal(getTodayTotal())
    setTodayRecords(getTodayRecords())
    setWeekStats(getWeekStats())
    setSubjectStats(getSubjectStats())
  }, [])

  useEffect(() => {
    refreshStats()
  }, [refreshStats])

  // Timer tick
  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            handleTimerEnd()
            return 0
          }
          if (phase === 'work') {
            workedRef.current += 1
            setWorkedSeconds(workedRef.current)
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [isRunning, isPaused, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTimerEnd = useCallback(() => {
    // Vibrate if available
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200])
    }

    if (mode === 'free') {
      // Free timer done - save and show complete
      const minutes = Math.round(workedRef.current / 60)
      if (minutes > 0) {
        addRecord(subject, minutes)
      }
      setIsRunning(false)
      setScreen('complete')
      refreshStats()
      return
    }

    // Pomodoro mode
    if (phase === 'work') {
      const newCompleted = completedSets + 1
      setCompletedSets(newCompleted)

      if (newCompleted >= POMODORO_SETS) {
        // All sets done - save and show complete
        const minutes = Math.round(workedRef.current / 60)
        if (minutes > 0) {
          addRecord(subject, minutes)
        }
        setIsRunning(false)
        setScreen('complete')
        refreshStats()
      } else {
        // Start break
        const isLongBreak = newCompleted % POMODORO_SETS === 0
        const breakTime = isLongBreak ? POMODORO_LONG_BREAK : POMODORO_BREAK
        setPhase('break')
        setTimeLeft(breakTime)
        setTotalTime(breakTime)
      }
    } else {
      // Break done - start next work session
      const nextSet = pomodoroSet + 1
      setPomodoroSet(nextSet)
      setPhase('work')
      setTimeLeft(POMODORO_WORK)
      setTotalTime(POMODORO_WORK)
    }
  }, [mode, phase, completedSets, pomodoroSet, subject, refreshStats]) // eslint-disable-line react-hooks/exhaustive-deps

  const startPomodoro = (subjectKey) => {
    setSubject(subjectKey)
    setMode('pomodoro')
    setPhase('work')
    setPomodoroSet(1)
    setCompletedSets(0)
    workedRef.current = 0
    setWorkedSeconds(0)
    setTimeLeft(POMODORO_WORK)
    setTotalTime(POMODORO_WORK)
    setIsRunning(true)
    setIsPaused(false)
    setScreen('timer')
  }

  const startFreeTimer = (minutes) => {
    const seconds = minutes * 60
    workedRef.current = 0
    setWorkedSeconds(0)
    setPhase('work')
    setTimeLeft(seconds)
    setTotalTime(seconds)
    setIsRunning(true)
    setIsPaused(false)
    setScreen('timer')
  }

  const togglePause = () => {
    setIsPaused(p => !p)
  }

  const handleGiveUp = () => {
    clearInterval(timerRef.current)
    setIsRunning(false)
    setIsPaused(false)
    setScreen('main')
  }

  const handleAgain = () => {
    if (mode === 'pomodoro') {
      startPomodoro(subject)
    } else {
      setScreen('selectFreeTime')
    }
  }

  const handleDifferentSubject = () => {
    setMode(null)
    setSubject(null)
    setScreen('main')
  }

  const getSubjectInfo = (key) => SUBJECTS.find(s => s.key === key) || SUBJECTS[5]

  // ─── Circular Timer SVG ───
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const progress = totalTime > 0 ? timeLeft / totalTime : 0
  const dashOffset = circumference * (1 - progress)
  const timerColor = phase === 'work' ? '#2ECC71' : '#3498DB'

  // ─── Render: Main Screen ───
  if (screen === 'main') {
    const weekTotal = weekStats.reduce((s, d) => s + d.total, 0)
    const maxDay = Math.max(...weekStats.map(d => d.total), 1)

    return (
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button onClick={onBack} style={styles.backBtn}>&#8592;</button>
          <h2 style={styles.headerTitle}>&#x23F1; 공부 타이머</h2>
        </div>

        {/* Today summary */}
        <div style={styles.todaySummary}>
          <div style={styles.todayIcon}>&#x1F4D6;</div>
          <div style={styles.todayText}>
            오늘 <strong>{formatMinutes(todayTotal)}</strong> 공부했어요!
          </div>
        </div>

        {/* Today subject bars */}
        {todayRecords.length > 0 && (
          <div style={styles.subjectBars}>
            {SUBJECTS.map(subj => {
              const mins = todayRecords
                .filter(r => r.subject === subj.key)
                .reduce((s, r) => s + r.minutes, 0)
              if (mins === 0) return null
              return (
                <div key={subj.key} style={styles.subjectBarRow}>
                  <span style={styles.subjectBarLabel}>{subj.icon} {subj.label}</span>
                  <div style={styles.subjectBarTrack}>
                    <div
                      style={{
                        ...styles.subjectBarFill,
                        width: `${Math.min((mins / Math.max(todayTotal, 1)) * 100, 100)}%`,
                        background: subj.color,
                      }}
                    />
                  </div>
                  <span style={styles.subjectBarMins}>{mins}분</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Mode selection */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>공부 모드 선택</h3>
          <div style={styles.modeButtons}>
            <button
              style={{
                ...styles.modeBtn,
                border: mode === 'pomodoro' ? '2px solid #E74C3C' : '2px solid #eee',
                background: mode === 'pomodoro' ? '#FFF5F5' : '#fff',
              }}
              onClick={() => setMode('pomodoro')}
            >
              <span style={{ fontSize: 24 }}>&#x1F345;</span>
              <div style={styles.modeBtnLabel}>뽀모도로</div>
              <div style={styles.modeBtnSub}>25분 + 5분 휴식</div>
            </button>
            <button
              style={{
                ...styles.modeBtn,
                border: mode === 'free' ? '2px solid #3498DB' : '2px solid #eee',
                background: mode === 'free' ? '#F0F8FF' : '#fff',
              }}
              onClick={() => setMode('free')}
            >
              <span style={{ fontSize: 24 }}>&#x23F1;</span>
              <div style={styles.modeBtnLabel}>자유 타이머</div>
              <div style={styles.modeBtnSub}>시간 직접 선택</div>
            </button>
          </div>
        </div>

        {/* Subject selection */}
        {mode && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>과목 선택</h3>
            <div style={styles.subjectGrid}>
              {SUBJECTS.map(subj => (
                <button
                  key={subj.key}
                  style={{
                    ...styles.subjectBtn,
                    border: `2px solid ${subj.color}`,
                    background: subject === subj.key ? subj.color : '#fff',
                    color: subject === subj.key ? '#fff' : '#333',
                  }}
                  onClick={() => {
                    setSubject(subj.key)
                    if (mode === 'pomodoro') {
                      startPomodoro(subj.key)
                    } else {
                      setSubject(subj.key)
                      setScreen('selectFreeTime')
                    }
                  }}
                >
                  <span style={{ fontSize: 22 }}>{subj.icon}</span>
                  <span>{subj.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Weekly stats (collapsible) */}
        <div style={styles.section}>
          <button
            style={styles.statsToggle}
            onClick={() => setShowStats(s => !s)}
          >
            &#x1F4CA; 이번 주 통계 {showStats ? '▲' : '▼'}
          </button>

          {showStats && (
            <div style={styles.statsContent}>
              <div style={styles.weekTotal}>
                이번 주 총 <strong>{formatMinutes(weekTotal)}</strong>
              </div>

              {/* Bar chart Mon-Sun */}
              <div style={styles.barChart}>
                {weekStats.map((day, i) => (
                  <div key={day.date} style={styles.barCol}>
                    <div style={styles.barValue}>{day.total > 0 ? `${day.total}` : ''}</div>
                    <div style={styles.barTrack}>
                      <div
                        style={{
                          ...styles.barFill,
                          height: `${(day.total / maxDay) * 100}%`,
                        }}
                      />
                    </div>
                    <div style={styles.barLabel}>{DAY_LABELS[i]}</div>
                  </div>
                ))}
              </div>

              {/* Subject breakdown */}
              <div style={styles.subjectBreakdown}>
                <h4 style={{ margin: '12px 0 8px', fontSize: 14 }}>과목별</h4>
                {SUBJECTS.map(subj => {
                  const mins = subjectStats[subj.key] || 0
                  if (mins === 0) return null
                  return (
                    <div key={subj.key} style={styles.breakdownRow}>
                      <span>{subj.icon} {subj.label}</span>
                      <div style={styles.breakdownBar}>
                        <div
                          style={{
                            height: '100%',
                            borderRadius: 4,
                            background: subj.color,
                            width: `${Math.min((mins / Math.max(weekTotal, 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 13, minWidth: 50, textAlign: 'right' }}>
                        {formatMinutes(mins)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Render: Free Time Selection ───
  if (screen === 'selectFreeTime') {
    const subInfo = getSubjectInfo(subject)
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => setScreen('main')} style={styles.backBtn}>&#8592;</button>
          <h2 style={styles.headerTitle}>&#x23F1; 시간 선택</h2>
        </div>
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <span style={{ fontSize: 32 }}>{subInfo.icon}</span>
          <div style={{ fontSize: 16, marginTop: 4, color: '#555' }}>{subInfo.label}</div>
        </div>
        <div style={styles.freeTimeGrid}>
          {FREE_OPTIONS.map(opt => (
            <button
              key={opt.minutes}
              style={styles.freeTimeBtn}
              onClick={() => startFreeTimer(opt.minutes)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>또는 직접 입력</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={3}
              value={customMinutes}
              onChange={e => setCustomMinutes(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="분"
              style={{
                width: 80, padding: '10px 8px', borderRadius: 10,
                border: '2px solid #DDD', fontSize: 18, fontWeight: 700,
                textAlign: 'center', outline: 'none',
              }}
            />
            <span style={{ fontSize: 14, color: '#888' }}>분</span>
            <button
              onClick={() => { const m = parseInt(customMinutes); if (m > 0 && m <= 180) startFreeTimer(m) }}
              disabled={!customMinutes || parseInt(customMinutes) <= 0}
              style={{
                padding: '10px 20px', borderRadius: 10, border: 'none',
                background: customMinutes && parseInt(customMinutes) > 0 ? '#3498DB' : '#DDD',
                color: '#FFF', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              시작
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Render: Timer Running ───
  if (screen === 'timer') {
    const subInfo = getSubjectInfo(subject)
    const isWork = phase === 'work'

    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <span style={{ fontSize: 18, color: subInfo.color, fontWeight: 600 }}>
            {subInfo.icon} {subInfo.label}
          </span>
          <div style={{ fontSize: 15, color: '#888', marginTop: 4 }}>
            {isWork ? '공부 중 \uD83C\uDF45' : '휴식 중 \u2615'}
          </div>
        </div>

        {/* SVG circular timer */}
        <div style={{ textAlign: 'center', margin: '16px 0' }}>
          <svg width="200" height="200" viewBox="0 0 200 200">
            {/* Background circle */}
            <circle
              cx="100" cy="100" r={radius}
              fill="none"
              stroke="#eee"
              strokeWidth="10"
            />
            {/* Progress arc */}
            <circle
              cx="100" cy="100" r={radius}
              fill="none"
              stroke={timerColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 0.5s linear' }}
            />
            {/* Time text */}
            <text
              x="100" y="95"
              textAnchor="middle"
              fontSize="36"
              fontWeight="700"
              fill="#333"
              fontFamily="monospace"
            >
              {formatTime(timeLeft)}
            </text>
            <text
              x="100" y="120"
              textAnchor="middle"
              fontSize="13"
              fill="#999"
            >
              {isPaused ? '일시정지' : (isWork ? '집중!' : '쉬세요~')}
            </text>
          </svg>
        </div>

        {/* Pomodoro set indicator */}
        {mode === 'pomodoro' && (
          <div style={{ textAlign: 'center', margin: '8px 0', fontSize: 18 }}>
            {Array.from({ length: POMODORO_SETS }).map((_, i) => (
              <span key={i}>{i < completedSets ? '\uD83C\uDF45' : '\u25CB'}</span>
            ))}
            <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
              {completedSets}/{POMODORO_SETS}세트
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={styles.timerControls}>
          <button
            style={{
              ...styles.controlBtn,
              background: isPaused ? '#2ECC71' : '#F39C12',
            }}
            onClick={togglePause}
          >
            {isPaused ? '▶ 계속' : '⏸ 일시정지'}
          </button>
          <button
            style={{ ...styles.controlBtn, background: '#E74C3C' }}
            onClick={handleGiveUp}
          >
            ✕ 포기
          </button>
        </div>

        {/* Worked time so far */}
        <div style={{ textAlign: 'center', color: '#aaa', fontSize: 13, marginTop: 12 }}>
          공부한 시간: {formatTime(workedSeconds)}
        </div>
      </div>
    )
  }

  // ─── Render: Complete ───
  if (screen === 'complete') {
    const subInfo = getSubjectInfo(subject)
    const savedMinutes = Math.round(workedRef.current / 60)

    return (
      <div style={styles.container}>
        <div style={styles.completeBox}>
          <div style={{ fontSize: 48 }}>&#x1F389;</div>
          <h2 style={{ margin: '8px 0' }}>수고했어요!</h2>
          <div style={{ fontSize: 16, color: '#555' }}>
            {subInfo.icon} {subInfo.label} - {formatMinutes(savedMinutes)} 완료
          </div>
          {mode === 'pomodoro' && (
            <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
              &#x1F345; {completedSets}세트 완료
            </div>
          )}
        </div>

        <div style={styles.completeActions}>
          <button style={{ ...styles.actionBtn, background: '#2ECC71' }} onClick={handleAgain}>
            &#x1F504; 한 번 더
          </button>
          <button style={{ ...styles.actionBtn, background: '#3498DB' }} onClick={handleDifferentSubject}>
            &#x1F4DA; 다른 과목
          </button>
          <button style={{ ...styles.actionBtn, background: '#95A5A6' }} onClick={onBack}>
            &#x2190; 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return null
}

// ─── Styles ───
const styles = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: 16,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    minHeight: '100vh',
    background: '#FAFAFA',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 0',
    borderBottom: '2px solid #2ECC71',
    marginBottom: 16,
    background: 'linear-gradient(135deg, #E8F8F0 0%, #F0FFF4 100%)',
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 12,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    fontSize: 22,
    cursor: 'pointer',
    padding: '4px 8px',
    color: '#333',
  },
  headerTitle: {
    margin: 0,
    fontSize: 18,
    color: '#2C3E50',
  },
  todaySummary: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#fff',
    borderRadius: 12,
    padding: '16px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: 16,
  },
  todayIcon: {
    fontSize: 32,
  },
  todayText: {
    fontSize: 16,
    color: '#333',
  },
  subjectBars: {
    background: '#fff',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: 16,
  },
  subjectBarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  subjectBarLabel: {
    fontSize: 13,
    minWidth: 60,
  },
  subjectBarTrack: {
    flex: 1,
    height: 10,
    background: '#f0f0f0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  subjectBarFill: {
    height: '100%',
    borderRadius: 5,
    transition: 'width 0.3s',
  },
  subjectBarMins: {
    fontSize: 12,
    color: '#888',
    minWidth: 32,
    textAlign: 'right',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#2C3E50',
    marginBottom: 10,
  },
  modeButtons: {
    display: 'flex',
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    padding: '14px 8px',
    borderRadius: 12,
    cursor: 'pointer',
    textAlign: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
    transition: 'all 0.2s',
  },
  modeBtnLabel: {
    fontSize: 15,
    fontWeight: 600,
    marginTop: 4,
  },
  modeBtnSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  subjectGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  subjectBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '12px 8px',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  freeTimeGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    padding: '10px 0',
  },
  freeTimeBtn: {
    padding: '14px 24px',
    borderRadius: 12,
    border: '2px solid #3498DB',
    background: '#fff',
    color: '#3498DB',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  timerControls: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    marginTop: 16,
  },
  controlBtn: {
    padding: '12px 24px',
    borderRadius: 10,
    border: 'none',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  completeBox: {
    textAlign: 'center',
    background: '#fff',
    borderRadius: 16,
    padding: '32px 20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    marginTop: 40,
    marginBottom: 24,
  },
  completeActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  actionBtn: {
    padding: '14px',
    borderRadius: 10,
    border: 'none',
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
  },
  statsToggle: {
    width: '100%',
    padding: '12px',
    borderRadius: 10,
    border: '1px solid #ddd',
    background: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    color: '#555',
  },
  statsContent: {
    background: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  weekTotal: {
    textAlign: 'center',
    fontSize: 15,
    color: '#333',
    marginBottom: 16,
  },
  barChart: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 6,
    height: 120,
    padding: '0 4px',
  },
  barCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
  },
  barValue: {
    fontSize: 10,
    color: '#888',
    marginBottom: 2,
  },
  barTrack: {
    flex: 1,
    width: '100%',
    background: '#f0f0f0',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'flex-end',
  },
  barFill: {
    width: '100%',
    background: 'linear-gradient(180deg, #2ECC71 0%, #27AE60 100%)',
    borderRadius: 4,
    transition: 'height 0.3s',
  },
  barLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  subjectBreakdown: {},
  breakdownRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    fontSize: 13,
  },
  breakdownBar: {
    flex: 1,
    height: 8,
    background: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
}
