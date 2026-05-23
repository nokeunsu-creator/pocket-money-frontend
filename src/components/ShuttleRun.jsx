// 🏃 셔틀런 (PAPS 왕복오래달리기 15m) — 측정 + 기록 + 등급표
import { useState, useEffect, useRef, useMemo } from 'react'
import { CHILD1, CHILD2 } from '../config/names'
import {
  buildBeepTimeline,
  buildFixedTimeline,
  LEVELS,
  LAP_SEC_OPTIONS,
  REST_SEC_OPTIONS,
  GRADE_TABLE,
  GRADE_OPTIONS,
  lookupGrade,
  loadRecords,
  addRecord,
  deleteRecord,
  todayStr,
} from '../data/shuttleRunData'

const PAGE_BG = '#F4F9FD'
const ACCENT = '#1F6FB8'
const ACCENT_SOFT = '#3498DB'
const CARD_BORDER = '#D4E6F1'
const URGENT = '#E67E22'      // 1.5초 이하 경고 (다급함)
const REST_COLOR = '#16A085'  // 쉬는 시간 (참고용, PAPS 표준 모드에선 안 씀)

const USER_DEFAULTS = {
  [CHILD1]: { gradeKey: 'E5', gender: 'male' },
  [CHILD2]: { gradeKey: 'E3', gender: 'male' },
}

// === 자체 비프음 (Web Audio API) ===
let _audioCtx = null
function ensureAudioCtx() {
  if (_audioCtx) return _audioCtx
  try {
    const C = window.AudioContext || window.webkitAudioContext
    if (C) _audioCtx = new C()
  } catch { /* no audio */ }
  return _audioCtx
}
function beep(freq, duration = 0.12, gain = 0.3) {
  const ctx = ensureAudioCtx()
  if (!ctx) return
  try {
    if (ctx.state === 'suspended') ctx.resume()
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    g.gain.setValueAtTime(gain, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(g).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration + 0.02)
  } catch { /* ignore */ }
}
const beepLap = () => beep(880, 0.12, 0.3)
const beepLevelUp = () => { beep(1320, 0.18, 0.35); setTimeout(() => beep(1760, 0.18, 0.35), 200) }
const beepCount = () => beep(660, 0.08, 0.2)
const beepGo = () => beep(990, 0.3, 0.35)
const beepFinish = () => { beep(440, 0.25, 0.3); setTimeout(() => beep(330, 0.4, 0.3), 250) }

// === 화면 깨움 (모바일에서 화면 꺼짐 방지) ===
function useWakeLock(active) {
  const lockRef = useRef(null)
  useEffect(() => {
    if (!active) return
    let cancelled = false
    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock?.request('screen')
        if (cancelled) lock?.release()
        else lockRef.current = lock
      } catch { /* unsupported */ }
    }
    acquire()
    return () => {
      cancelled = true
      try { lockRef.current?.release() } catch {}
      lockRef.current = null
    }
  }, [active])
}

export default function ShuttleRun({ onBack }) {
  const [view, setView] = useState('list') // 'list' | 'measure' | 'table'
  const [records, setRecords] = useState([])

  useEffect(() => { setRecords(loadRecords()) }, [])

  const refresh = () => setRecords(loadRecords())

  if (view === 'measure') {
    return <MeasureView onBack={() => { setView('list'); refresh() }} />
  }
  if (view === 'table') {
    return <TableView onBack={() => setView('list')} />
  }
  return (
    <ListView
      records={records}
      onBack={onBack}
      onMeasure={() => setView('measure')}
      onTable={() => setView('table')}
      onDelete={(id) => { deleteRecord(id); refresh() }}
    />
  )
}

// ========== 헤더 ==========
function Header({ title, subtitle, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, maxWidth: 480, margin: '0 auto 16px' }}>
      <button onClick={onBack}
        style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555', padding: '4px 8px' }}>
        ←
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#2C3E50' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{subtitle}</div>}
      </div>
    </div>
  )
}

// ========== 목록 화면 ==========
function ListView({ records, onBack, onMeasure, onTable, onDelete }) {
  const [filterUser, setFilterUser] = useState('all') // 'all' | CHILD1 | CHILD2

  const filtered = useMemo(() => {
    const list = filterUser === 'all' ? records : records.filter(r => r.user === filterUser)
    return [...list].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.id || '').localeCompare(a.id || ''))
  }, [records, filterUser])

  const bestByUser = useMemo(() => {
    const m = {}
    for (const r of records) {
      if (!m[r.user] || r.laps > m[r.user].laps) m[r.user] = r
    }
    return m
  }, [records])

  return (
    <div className="fade-in" style={{ minHeight: '100vh', background: PAGE_BG, padding: '1rem' }}>
      <Header title="🏃 셔틀런" subtitle="15m 왕복오래달리기" onBack={onBack} />

      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {/* 최고 기록 카드 */}
        {(bestByUser[CHILD1] || bestByUser[CHILD2]) && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {[CHILD1, CHILD2].map(name => {
              const best = bestByUser[name]
              if (!best) return (
                <div key={name} style={{
                  flex: 1, background: '#FFF', borderRadius: 14, padding: '12px',
                  border: `1px solid ${CARD_BORDER}`, textAlign: 'center', color: '#BBB', fontSize: 13,
                }}>
                  <div style={{ fontWeight: 700, color: '#888', marginBottom: 4 }}>{name}</div>
                  기록 없음
                </div>
              )
              const g = lookupGrade(best.gradeKey, best.gender, best.laps)
              return (
                <div key={name} style={{
                  flex: 1, background: '#FFF', borderRadius: 14, padding: '12px',
                  border: `1px solid ${CARD_BORDER}`, textAlign: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ fontSize: 12, color: '#888', fontWeight: 700, marginBottom: 2 }}>{name} 최고</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: ACCENT }}>{best.laps}<span style={{ fontSize: 14, color: '#888', marginLeft: 4 }}>회</span></div>
                  {g && <div style={{ fontSize: 12, color: '#888' }}>{g.grade}등급 · {g.label}</div>}
                </div>
              )
            })}
          </div>
        )}

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={onMeasure}
            style={{
              flex: 2, padding: '16px 0', borderRadius: 14,
              background: `linear-gradient(135deg, ${ACCENT_SOFT}, ${ACCENT})`,
              border: 'none', color: '#FFF', fontSize: 16, fontWeight: 800,
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(201,42,42,0.25)',
            }}>
            ▶ 측정 시작
          </button>
          <button onClick={onTable}
            style={{
              flex: 1, padding: '16px 0', borderRadius: 14,
              background: '#FFF', border: `2px solid ${ACCENT}`,
              color: ACCENT, fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
            📋 등급표
          </button>
        </div>

        {/* 필터 탭 */}
        {records.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {[
              { key: 'all', label: '전체' },
              { key: CHILD1, label: CHILD1 },
              { key: CHILD2, label: CHILD2 },
            ].map(t => (
              <button key={t.key} onClick={() => setFilterUser(t.key)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 10,
                  background: filterUser === t.key ? ACCENT : '#FFF',
                  border: `1px solid ${filterUser === t.key ? ACCENT : '#E0D0D0'}`,
                  color: filterUser === t.key ? '#FFF' : '#666',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* 기록 목록 */}
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 40, color: '#999',
            background: '#FFF', borderRadius: 14, border: `1px solid ${CARD_BORDER}`,
          }}>
            아직 기록이 없어요.<br/>
            <span style={{ fontSize: 12 }}>▶ 측정 시작을 눌러 첫 기록을 만들어 보세요</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(r => <RecordRow key={r.id} record={r} onDelete={() => onDelete(r.id)} />)}
          </div>
        )}

        <div style={{ marginTop: 20, fontSize: 11, color: '#AAA', textAlign: 'center', lineHeight: 1.5 }}>
          이 기기에만 저장됩니다.<br/>
          신호음 간격은 표준 다단계 셔틀런(MSFT) 패턴 근사값이에요.<br/>
          학교 공식 음원과 차이가 있을 수 있어요.
        </div>
      </div>
    </div>
  )
}

function RecordRow({ record, onDelete }) {
  const g = lookupGrade(record.gradeKey, record.gender, record.laps)
  const gradeLabel = GRADE_OPTIONS.find(o => o.key === record.gradeKey)?.label || record.gradeKey
  return (
    <div style={{
      background: '#FFF', borderRadius: 12, padding: '12px 14px',
      border: `1px solid ${CARD_BORDER}`,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: g ? gradeColor(g.grade) : '#EEE',
        color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 800, flexShrink: 0,
      }}>
        {g ? `${g.grade}` : '-'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>
          {record.user} · {record.laps}회
        </div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
          {record.date} · {gradeLabel} · {fmtDur(record.durationSec)}
          {record.mode === 'fixed'
            ? ` · 고정 ${record.lapSec}초${record.restSec > 0 ? `+쉼${record.restSec}` : ''}`
            : (record.finalLevel ? ` · L${record.finalLevel}` : '')}
        </div>
      </div>
      <button onClick={onDelete}
        style={{ background: 'none', border: 'none', color: '#C0392B', fontSize: 18, padding: 4, cursor: 'pointer' }}>
        ×
      </button>
    </div>
  )
}

function gradeColor(grade) {
  return { 1: '#27AE60', 2: '#3498DB', 3: '#F39C12', 4: '#E67E22', 5: '#C0392B' }[grade] || '#888'
}
function fmtDur(sec) {
  if (!sec || sec < 0) return '-'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}분 ${s}초` : `${s}초`
}

// ========== 측정 화면 ==========
function MeasureView({ onBack }) {
  const [phase, setPhase] = useState('setup') // 'setup' | 'countdown' | 'running' | 'finished'
  const [user, setUser] = useState(CHILD1)
  const [gradeKey, setGradeKey] = useState(USER_DEFAULTS[CHILD1].gradeKey)
  const [gender, setGender] = useState(USER_DEFAULTS[CHILD1].gender)

  // 사용자 바뀌면 학년/성별 기본값 적용
  useEffect(() => {
    const d = USER_DEFAULTS[user]
    if (d) { setGradeKey(d.gradeKey); setGender(d.gender) }
  }, [user])

  // 측정 모드 설정
  const [mode, setMode] = useState('paps') // 'paps' (표준 점진) | 'fixed' (고정 페이스)
  const [lapSec, setLapSec] = useState(9)
  const [restSec, setRestSec] = useState(0)

  const [countdown, setCountdown] = useState(5)
  const [currentLap, setCurrentLap] = useState(0)
  const [currentLevel, setCurrentLevel] = useState(1)
  const [secondsToNext, setSecondsToNext] = useState(0)
  const [nextEventType, setNextEventType] = useState('lap')
  const [flash, setFlash] = useState(false)
  const [finalLaps, setFinalLaps] = useState(0)
  const [finalLevel, setFinalLevel] = useState(1)
  const [duration, setDuration] = useState(0)
  const [savedMsg, setSavedMsg] = useState('')

  const timelineRef = useRef([])
  const startTimeRef = useRef(0)
  const lapRef = useRef(0)
  const levelRef = useRef(1)
  const eventIdxRef = useRef(-1) // 마지막으로 발화한 이벤트 인덱스
  const timerRef = useRef(null)
  const stoppedRef = useRef(false)

  useWakeLock(phase === 'running' || phase === 'countdown')

  // 카운트다운
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown < 0) return
    if (countdown === 0) {
      beepGo()
      const t = setTimeout(() => beginRunning(), 800)
      return () => clearTimeout(t)
    }
    beepCount()
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, countdown])

  const beginCountdown = () => {
    // 첫 사용자 제스처에서 AudioContext 워밍업
    ensureAudioCtx()
    setCountdown(5)
    setCurrentLap(0)
    setCurrentLevel(1)
    setNextEventType('lap')
    lapRef.current = 0
    levelRef.current = 1
    eventIdxRef.current = -1
    stoppedRef.current = false
    setPhase('countdown')
  }

  const beginRunning = () => {
    timelineRef.current = mode === 'fixed'
      ? buildFixedTimeline(lapSec, restSec)
      : buildBeepTimeline()
    startTimeRef.current = Date.now()
    setPhase('running')
    scheduleNextBeep(0)
  }

  const scheduleNextBeep = (idx) => {
    if (stoppedRef.current) return
    const timeline = timelineRef.current
    if (idx >= timeline.length) {
      finishMeasurement('done')
      return
    }
    const ev = timeline[idx]
    const elapsed = Date.now() - startTimeRef.current
    const delay = Math.max(0, ev.timeMs - elapsed)
    timerRef.current = setTimeout(() => {
      if (stoppedRef.current) return
      if (ev.type === 'go') {
        beepGo()
      } else if (ev.isLevelStart && ev.level > 1) {
        beepLevelUp()
      } else {
        beepLap()
      }
      eventIdxRef.current = idx
      if (ev.type === 'lap') {
        lapRef.current = ev.lap
        setCurrentLap(ev.lap)
      }
      levelRef.current = ev.level
      setCurrentLevel(ev.level)
      setFlash(true)
      setTimeout(() => setFlash(false), 160)
      try { navigator.vibrate?.(60) } catch {}
      scheduleNextBeep(idx + 1)
    }, delay)
  }

  const finishMeasurement = () => {
    if (stoppedRef.current) return
    stoppedRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    beepFinish()
    const laps = lapRef.current
    const lvl = levelRef.current
    setFinalLaps(laps)
    setFinalLevel(lvl)
    setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
    setPhase('finished')
  }

  // 언마운트 시 타이머 정리
  useEffect(() => () => {
    stoppedRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  // 러닝 중 다음 신호음까지 남은 시간 갱신
  useEffect(() => {
    if (phase !== 'running') return
    const tick = () => {
      const timeline = timelineRef.current
      const nextIdx = eventIdxRef.current + 1
      const nextBeep = timeline[nextIdx]
      if (!nextBeep) { setSecondsToNext(0); return }
      const elapsed = Date.now() - startTimeRef.current
      setSecondsToNext(Math.max(0, (nextBeep.timeMs - elapsed) / 1000))
      setNextEventType(nextBeep.type || 'lap')
    }
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [phase])

  const handleSave = () => {
    addRecord({
      user, gradeKey, gender,
      date: todayStr(),
      laps: finalLaps,
      finalLevel,
      durationSec: duration,
      mode,
      lapSec: mode === 'fixed' ? lapSec : null,
      restSec: mode === 'fixed' ? restSec : null,
    })
    setSavedMsg('저장됐어요!')
    setTimeout(() => { onBack() }, 700)
  }

  // === 셋업 화면 ===
  if (phase === 'setup') {
    return (
      <div className="fade-in" style={{ minHeight: '100vh', background: PAGE_BG, padding: '1rem' }}>
        <Header title="🏃 측정 준비" subtitle="누가 / 학년 / 성별 선택" onBack={onBack} />
        <div style={{ maxWidth: 480, margin: '0 auto' }}>

          <Section label="누가 측정해요?">
            <div style={{ display: 'flex', gap: 10 }}>
              {[CHILD1, CHILD2].map(name => (
                <button key={name} onClick={() => setUser(name)}
                  style={pillStyle(user === name)}>
                  {name}
                </button>
              ))}
            </div>
          </Section>

          <Section label="학년">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {GRADE_OPTIONS.map(opt => (
                <button key={opt.key} onClick={() => setGradeKey(opt.key)}
                  style={pillStyle(gradeKey === opt.key)}>
                  {opt.label}
                  {GRADE_TABLE[opt.key]?.estimated && (
                    <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>참고</span>
                  )}
                </button>
              ))}
            </div>
          </Section>

          <Section label="측정 모드">
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setMode('paps')}
                style={{ ...pillStyle(mode === 'paps'), flex: 1, position: 'relative' }}>
                PAPS 표준
                <span style={{
                  position: 'absolute', top: -8, right: -6,
                  background: '#27AE60', color: '#FFF',
                  fontSize: 10, fontWeight: 800, padding: '2px 6px',
                  borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}>표준</span>
                <div style={{ fontSize: 10, opacity: 0.85, fontWeight: 400, marginTop: 2 }}>
                  점점 빨라짐 · 쉬는 시간 없음
                </div>
              </button>
              <button onClick={() => setMode('fixed')}
                style={{ ...pillStyle(mode === 'fixed'), flex: 1 }}>
                고정 페이스
                <div style={{ fontSize: 10, opacity: 0.85, fontWeight: 400, marginTop: 2 }}>
                  연습용 · 직접 설정
                </div>
              </button>
            </div>
          </Section>

          {mode === 'fixed' && (
            <>
              <Section label={`회당 시간 (편도 15m) · ${lapSec}초`}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                  {LAP_SEC_OPTIONS.map(s => (
                    <button key={s} onClick={() => setLapSec(s)}
                      style={{ ...pillStyle(lapSec === s), padding: '10px 0', fontSize: 13 }}>
                      {s}초
                    </button>
                  ))}
                </div>
              </Section>

              <Section label="쉬는 시간">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {REST_SEC_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setRestSec(opt.value)}
                      style={{ ...pillStyle(restSec === opt.value), padding: '10px 0', fontSize: 13, position: 'relative' }}>
                      {opt.label}
                      {opt.standard && (
                        <div style={{ fontSize: 9, opacity: 0.85, fontWeight: 600, marginTop: 1 }}>표준</div>
                      )}
                    </button>
                  ))}
                </div>
              </Section>
            </>
          )}

          <div style={{
            background: '#FFF8F0', borderRadius: 12, padding: '12px 14px',
            fontSize: 12, color: '#888', lineHeight: 1.6, marginBottom: 16,
            border: '1px solid #FFE6CC',
          }}>
            📍 <b>측정 방법</b><br/>
            · 15m 떨어진 두 선 사이를 신호음에 맞춰 달려요<br/>
            · 신호음마다 반대편 선에 도착해야 해요 (1회 = 편도 15m)<br/>
            {mode === 'paps' ? (
              <>
                · <b>PAPS 표준</b>: 첫 단계 9초/회 → 단계가 오르면서 점점 빨라짐<br/>
                · 별도 쉬는 시간 없음 (먼저 도착하면 신호 울릴 때까지 선에서 대기)<br/>
              </>
            ) : (
              <>
                · <b>고정 페이스</b>: {lapSec}초/회로 일정하게{restSec > 0 ? `, 회마다 ${restSec}초 쉬어요` : ', 쉬는 시간 없이 계속'}<br/>
              </>
            )}
            · 신호음 안에 도착 못 하면 <b>멈춤</b> 버튼을 눌러요<br/>
            · 화면 깜빡 + 진동으로도 신호를 보여줘요
          </div>

          <button onClick={beginCountdown}
            style={{
              width: '100%', padding: '18px 0', borderRadius: 14,
              background: `linear-gradient(135deg, ${ACCENT_SOFT}, ${ACCENT})`,
              border: 'none', color: '#FFF', fontSize: 18, fontWeight: 800,
              cursor: 'pointer', boxShadow: '0 4px 14px rgba(201,42,42,0.3)',
            }}>
            ▶ 시작 (5초 카운트다운)
          </button>
        </div>
      </div>
    )
  }

  // === 카운트다운 화면 ===
  if (phase === 'countdown') {
    return (
      <div className="fade-in" style={{
        minHeight: '100vh', background: PAGE_BG,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 18, color: '#888', marginBottom: 16 }}>{user} · 출발 준비</div>
        <div style={{
          fontSize: 180, fontWeight: 900, color: countdown === 0 ? ACCENT : '#2C3E50',
          lineHeight: 1, marginBottom: 12,
        }}>
          {countdown === 0 ? '출발!' : countdown}
        </div>
        <button onClick={() => { stoppedRef.current = true; onBack() }}
          style={{
            marginTop: 24, padding: '10px 20px', borderRadius: 10,
            background: '#EEE', border: 'none', color: '#888', fontSize: 14, cursor: 'pointer',
          }}>
          취소
        </button>
      </div>
    )
  }

  // === 러닝 화면 ===
  if (phase === 'running') {
    return (
      <div className="fade-in" style={{
        minHeight: '100vh',
        background: flash ? ACCENT : PAGE_BG,
        transition: 'background 0.1s',
        display: 'flex', flexDirection: 'column', padding: '1rem',
      }}>
        {(() => {
          const levelInfo = LEVELS.find(l => l.level === currentLevel)
          const lapSecCurrent = mode === 'fixed' ? lapSec : levelInfo?.sec
          const resting = nextEventType === 'go'
          const urgent = !resting && secondsToNext > 0 && secondsToNext < 1.5
          const displaySec = Math.max(0, Math.ceil(secondsToNext))
          return (
            <>
              <div style={{ fontSize: 14, color: flash ? '#FFF' : '#888', textAlign: 'center', marginTop: 8 }}>
                {user} · {mode === 'fixed' ? `고정 ${lapSec}초` : `Level ${currentLevel}`}
                {lapSecCurrent && ` · ${lapSecCurrent.toFixed(1)}초/회`}
                {mode === 'fixed' && restSec > 0 && ` · 쉼 ${restSec}초`}
              </div>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <div style={{ fontSize: 14, color: flash ? '#FFF' : '#888', fontWeight: 700, marginBottom: 4 }}>회수 (15m 편도)</div>
                <div style={{
                  fontSize: 140, fontWeight: 900, lineHeight: 1,
                  color: flash ? '#FFF' : ACCENT,
                  textShadow: flash ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                }}>
                  {currentLap}
                </div>

                <div style={{
                  marginTop: 20, padding: '16px 28px', borderRadius: 20,
                  background: flash ? '#FFF' : (urgent ? '#FFF4E6' : (resting ? '#E8F8F4' : '#FFF')),
                  border: `3px solid ${urgent ? URGENT : (resting ? REST_COLOR : ACCENT_SOFT)}`,
                  textAlign: 'center', minWidth: 220,
                  transition: 'border-color 0.15s, background 0.15s',
                }}>
                  <div style={{
                    fontSize: 13, fontWeight: 800, marginBottom: 4,
                    color: urgent ? URGENT : (resting ? REST_COLOR : ACCENT),
                    letterSpacing: 0.5,
                  }}>
                    {resting ? '😮‍💨 쉬어요 · 출발까지' : '다음 신호까지'}
                  </div>
                  <div style={{
                    fontSize: 96, fontWeight: 900, lineHeight: 1,
                    color: urgent ? URGENT : (resting ? REST_COLOR : '#1B4F72'),
                  }}>
                    {displaySec}<span style={{ fontSize: 28, color: '#888', marginLeft: 6 }}>초</span>
                  </div>
                </div>

                <div style={{ fontSize: 14, color: flash ? '#FFF' : '#888', marginTop: 16, fontWeight: 600 }}>
                  {currentLap === 0 ? '곧 첫 신호음이 울려요'
                    : resting ? '잠깐 숨을 골라요'
                    : '신호 전에 반대편 도착!'}
                </div>
              </div>
            </>
          )
        })()}

        <button onClick={finishMeasurement}
          style={{
            padding: '24px 0', borderRadius: 16,
            background: flash ? '#FFF' : ACCENT,
            color: flash ? ACCENT : '#FFF', border: 'none',
            fontSize: 22, fontWeight: 900, cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
          }}>
          ✋ 멈춤 (실패)
        </button>
      </div>
    )
  }

  // === 결과 화면 ===
  const grade = lookupGrade(gradeKey, gender, finalLaps)
  return (
    <div className="fade-in" style={{ minHeight: '100vh', background: PAGE_BG, padding: '1rem' }}>
      <Header title="🏁 완료!" subtitle={`${user} · ${todayStr()}`} onBack={onBack} />
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <div style={{
          background: '#FFF', borderRadius: 16, padding: '24px 20px',
          textAlign: 'center', border: `1px solid ${CARD_BORDER}`, marginBottom: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          <div style={{ fontSize: 13, color: '#888', fontWeight: 700, marginBottom: 4 }}>총 회수</div>
          <div style={{ fontSize: 80, fontWeight: 900, color: ACCENT, lineHeight: 1 }}>
            {finalLaps}<span style={{ fontSize: 28, color: '#888' }}> 회</span>
          </div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
            Level {finalLevel} · {fmtDur(duration)}
          </div>

          {grade ? (
            <div style={{
              marginTop: 20, padding: '14px 16px', borderRadius: 12,
              background: gradeColor(grade.grade),
              color: '#FFF',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                {GRADE_OPTIONS.find(o => o.key === gradeKey)?.label} 남자 기준
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, marginTop: 2 }}>
                {grade.grade}등급
              </div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>{grade.label}</div>
            </div>
          ) : (
            <div style={{ marginTop: 16, fontSize: 13, color: '#999' }}>등급 정보 없음</div>
          )}
          {GRADE_TABLE[gradeKey]?.estimated && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#C0392B' }}>
              ⚠ 이 학년 등급은 참고용 추정값입니다
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onBack}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12,
              background: '#FFF', border: '2px solid #DDD',
              color: '#666', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
            저장 안 함
          </button>
          <button onClick={handleSave}
            style={{
              flex: 2, padding: '14px 0', borderRadius: 12,
              background: ACCENT, border: 'none', color: '#FFF',
              fontSize: 16, fontWeight: 800, cursor: 'pointer',
            }}>
            💾 기록 저장
          </button>
        </div>

        {savedMsg && (
          <div style={{ textAlign: 'center', marginTop: 12, color: '#27AE60', fontWeight: 700 }}>
            ✓ {savedMsg}
          </div>
        )}
      </div>
    </div>
  )
}

// ========== 등급표 화면 ==========
function TableView({ onBack }) {
  const [gradeKey, setGradeKey] = useState('E5')
  const gender = 'male'

  const table = GRADE_TABLE[gradeKey]?.[gender] || []
  const estimated = GRADE_TABLE[gradeKey]?.estimated

  // 해당 학년 최고 기록 위치
  const records = loadRecords()
  const best = records
    .filter(r => r.gradeKey === gradeKey)
    .reduce((m, r) => (!m || r.laps > m.laps ? r : m), null)

  return (
    <div className="fade-in" style={{ minHeight: '100vh', background: PAGE_BG, padding: '1rem' }}>
      <Header title="📋 PAPS 등급표" subtitle="초등 15m 왕복오래달리기" onBack={onBack} />
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <Section label="학년 (남자 기준)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {GRADE_OPTIONS.map(opt => (
              <button key={opt.key} onClick={() => setGradeKey(opt.key)}
                style={pillStyle(gradeKey === opt.key)}>
                {opt.label}
                {GRADE_TABLE[opt.key]?.estimated && (
                  <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>참고</span>
                )}
              </button>
            ))}
          </div>
        </Section>

        {estimated && (
          <div style={{
            background: '#FFF3F3', border: '1px solid #F2C4C4', borderRadius: 10,
            padding: '10px 12px', fontSize: 12, color: '#C0392B', marginBottom: 12,
          }}>
            ⚠ 이 학년 표는 참고용 추정값입니다. 학교 통지표 받으시면 정확한 숫자로 교정 가능해요.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {table.map(row => {
            const inRange = best && (row.min == null || best.laps >= row.min) && (row.max == null || best.laps <= row.max)
            return (
              <div key={row.grade} style={{
                background: '#FFF', borderRadius: 12, padding: '14px 16px',
                border: `2px solid ${inRange ? gradeColor(row.grade) : CARD_BORDER}`,
                display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: inRange ? `0 0 0 4px ${gradeColor(row.grade)}22` : 'none',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: gradeColor(row.grade), color: '#FFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 800, flexShrink: 0,
                }}>
                  {row.grade}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>
                    {rangeLabel(row)}
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>{row.label}</div>
                </div>
                {inRange && (
                  <div style={{ fontSize: 11, color: gradeColor(row.grade), fontWeight: 700 }}>
                    📍 너의<br/>최고 기록
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {best && (
          <div style={{
            background: '#FFF', borderRadius: 12, padding: '12px 14px',
            textAlign: 'center', color: '#555', fontSize: 13,
            border: `1px solid ${CARD_BORDER}`,
          }}>
            <b>{best.user}</b> 최고 기록: <b style={{ color: ACCENT }}>{best.laps}회</b> ({best.date})
          </div>
        )}
      </div>
    </div>
  )
}

function rangeLabel(row) {
  if (row.min != null && row.max != null) return `${row.min}~${row.max}회`
  if (row.min != null) return `${row.min}회 이상`
  if (row.max != null) return `${row.max}회 이하`
  return '-'
}

// ========== 공통 ==========
function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: '#888', fontWeight: 700, marginBottom: 6, paddingLeft: 4 }}>{label}</div>
      {children}
    </div>
  )
}
function pillStyle(active) {
  return {
    padding: '12px 8px', borderRadius: 12,
    background: active ? ACCENT : '#FFF',
    border: `2px solid ${active ? ACCENT : '#E0D0D0'}`,
    color: active ? '#FFF' : '#666',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    transition: 'all 0.1s',
  }
}
