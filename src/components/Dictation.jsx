import { useState, useEffect, useRef, useCallback } from 'react'
import { GRADES, GRADE_INFO, DICTATION, roundCount, getRound } from '../data/dictationData'
import {
  getData, updateStreak, recordRound, getRoundRecord,
  addWrongNote, getWrongNotes, removeWrongNote, clearWrongNotes,
} from '../utils/dictationStorage'

// ── TTS ─────────────────────────────────────────────────────────────
let cachedKoVoice = null
function pickKoVoice() {
  if (cachedKoVoice) return cachedKoVoice
  try {
    const voices = window.speechSynthesis.getVoices() || []
    cachedKoVoice = voices.find(v => v.lang === 'ko-KR') ||
      voices.find(v => (v.lang || '').toLowerCase().startsWith('ko')) || null
  } catch { cachedKoVoice = null }
  return cachedKoVoice
}
function speak(text, { rate = 0.9, chunk = false } = {}) {
  try {
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
    const parts = chunk ? text.split(/\s+/).filter(Boolean) : [text]
    const ko = pickKoVoice()
    for (const p of parts) {
      const u = new SpeechSynthesisUtterance(p)
      u.lang = 'ko-KR'
      u.rate = rate
      u.pitch = 1
      if (ko) u.voice = ko
      synth.speak(u)
    }
  } catch { /* TTS 미지원 */ }
}
function ttsSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// 채점용 정규화: 앞뒤 공백 제거 + 연속 공백 1칸으로
function normalize(s) {
  return (s || '').trim().replace(/\s+/g, ' ')
}
// 글자 단위 비교 (위치별)
function diffChars(input, answer) {
  const g = [...(input || '')]
  const a = [...(answer || '')]
  return g.map((ch, i) => ({ ch, ok: ch === a[i] }))
}

const SUPPORTED = ttsSupported()

export default function Dictation({ onBack }) {
  const [screen, setScreen] = useState('home') // home | play | result | review
  const [grade, setGrade] = useState(3)
  const [round, setRound] = useState(0)
  const [rate, setRate] = useState(0.9) // 0.9 보통 / 0.6 느리게
  const [, setTick] = useState(0)
  const refresh = useCallback(() => setTick(t => t + 1), [])

  // 진행 상태
  const [qIdx, setQIdx] = useState(0)
  const [input, setInput] = useState('')
  const [checked, setChecked] = useState(false)
  const [results, setResults] = useState([]) // { answer, input, correct }
  const inputRef = useRef(null)

  useEffect(() => {
    updateStreak()
    // 보이스 미리 로드
    if (SUPPORTED) {
      pickKoVoice()
      window.speechSynthesis.onvoiceschanged = () => { cachedKoVoice = null; pickKoVoice() }
    }
    return () => { if (SUPPORTED) window.speechSynthesis.cancel() }
  }, [])

  const data = getData()
  const sentences = getRound(grade, round)
  const current = sentences[qIdx] || ''

  const startRound = (g, r) => {
    setGrade(g); setRound(r)
    setQIdx(0); setInput(''); setChecked(false); setResults([])
    setScreen('play')
    // 사용자 탭(제스처) 직후 → TTS 잠금 해제됨. 약간의 지연 후 첫 문장 읽기
    setTimeout(() => speak(getRound(g, r)[0] || '', { rate }), 250)
  }

  const replay = (chunk = false) => speak(current, { rate, chunk })

  const submit = () => {
    if (!input.trim()) return
    const correct = normalize(input) === normalize(current)
    if (!correct) addWrongNote({ grade, round, idx: qIdx, answer: current, input: input.trim() })
    setResults(rs => [...rs, { answer: current, input: input.trim(), correct }])
    setChecked(true)
  }

  const next = () => {
    if (qIdx + 1 >= sentences.length) {
      const correctCount = results.filter(r => r.correct).length
      recordRound(grade, round, correctCount, sentences.length)
      setScreen('result')
      if (SUPPORTED) window.speechSynthesis.cancel()
      return
    }
    const ni = qIdx + 1
    setQIdx(ni); setInput(''); setChecked(false)
    setTimeout(() => { speak(sentences[ni], { rate }); inputRef.current?.focus() }, 200)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (checked) next(); else submit()
    }
  }

  // ── 화면: 오답노트 ──
  if (screen === 'review') {
    const notes = getWrongNotes()
    return (
      <Shell onBack={() => setScreen('home')} title="📒 오답노트" color="#E67E22">
        {notes.length === 0 ? (
          <Empty text="아직 오답이 없어요. 잘하고 있어요! 👍" />
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button onClick={() => { clearWrongNotes(); refresh() }} style={ghostBtn}>전체 비우기</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notes.map(n => (
                <div key={n.id} style={card}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>
                    {GRADE_INFO[n.grade]?.label} · {n.round + 1}회 · {n.date}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#2C3E50', wordBreak: 'keep-all' }}>
                    {n.answer}
                  </div>
                  <div style={{ fontSize: 13, color: '#E74C3C', marginTop: 4 }}>
                    내가 쓴 답: {n.input || '(빈칸)'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={() => speak(n.answer, { rate })} style={miniBtn} disabled={!SUPPORTED}>🔊 듣기</button>
                    <button onClick={() => { removeWrongNote(n.id); refresh() }} style={{ ...miniBtn, background: '#F5F5F5', color: '#888' }}>지움</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Shell>
    )
  }

  // ── 화면: 결과 ──
  if (screen === 'result') {
    const correctCount = results.filter(r => r.correct).length
    const total = results.length
    const perfect = correctCount === total
    const wrongs = results.filter(r => !r.correct)
    return (
      <Shell onBack={() => setScreen('home')} title="결과" color={GRADE_INFO[grade].color}>
        <div style={{ ...card, textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: 48 }}>{perfect ? '🎉' : correctCount >= total * 0.7 ? '😊' : '💪'}</div>
          <div style={{ fontSize: 30, fontWeight: 800, margin: '8px 0', color: GRADE_INFO[grade].color }}>
            {correctCount} / {total}
          </div>
          <div style={{ fontSize: 14, color: '#666' }}>
            {perfect ? '완벽해요! 만점이에요!' : correctCount >= total * 0.7 ? '아주 잘했어요!' : '조금만 더 연습하면 돼요!'}
          </div>
        </div>

        {wrongs.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#E74C3C' }}>틀린 문장 다시 보기</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {wrongs.map((w, i) => (
                <div key={i} style={card}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#2C3E50', wordBreak: 'keep-all' }}>{w.answer}</div>
                  <div style={{ fontSize: 13, color: '#E74C3C', marginTop: 3 }}>내 답: {w.input || '(빈칸)'}</div>
                  <button onClick={() => speak(w.answer, { rate })} style={{ ...miniBtn, marginTop: 8 }} disabled={!SUPPORTED}>🔊 듣기</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={() => startRound(grade, round)} style={{ ...primaryBtn, background: GRADE_INFO[grade].color }}>다시 풀기</button>
          <button onClick={() => setScreen('home')} style={{ ...primaryBtn, background: '#95A5A6' }}>회차 목록</button>
        </div>
      </Shell>
    )
  }

  // ── 화면: 풀이 ──
  if (screen === 'play') {
    const last = results[results.length - 1]
    return (
      <Shell onBack={() => { if (SUPPORTED) window.speechSynthesis.cancel(); setScreen('home') }}
        title={`${GRADE_INFO[grade].label} ${round + 1}회`} color={GRADE_INFO[grade].color}>
        {/* 진행 바 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 8, background: '#EAEDF0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(qIdx / sentences.length) * 100}%`, background: GRADE_INFO[grade].color, transition: 'width .3s' }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#666', flexShrink: 0 }}>{qIdx + 1} / {sentences.length}</div>
        </div>

        {/* 듣기 카드 */}
        <div style={{ ...card, textAlign: 'center', padding: '24px 16px' }}>
          {!SUPPORTED && (
            <div style={{ fontSize: 13, color: '#E74C3C', marginBottom: 10 }}>
              ⚠️ 이 기기는 음성 읽기를 지원하지 않아요. 부모님이 읽어 주세요.
            </div>
          )}
          <button onClick={() => replay(false)} disabled={!SUPPORTED} style={{
            fontSize: 40, width: 84, height: 84, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: GRADE_INFO[grade].color, color: '#FFF', boxShadow: '0 4px 14px rgba(0,0,0,.18)',
          }}>🔊</button>
          <div style={{ fontSize: 12, color: '#999', marginTop: 10 }}>버튼을 누르면 문장을 다시 들려줘요</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
            <button onClick={() => replay(true)} disabled={!SUPPORTED} style={chipBtn}>또박또박 끊어 듣기</button>
            <button onClick={() => { const r = rate === 0.9 ? 0.6 : 0.9; setRate(r); speak(current, { rate: r }) }} disabled={!SUPPORTED} style={chipBtn}>
              {rate === 0.9 ? '느리게 ▶' : '보통 ▶'}
            </button>
          </div>
        </div>

        {/* 입력 */}
        {!checked ? (
          <div style={{ marginTop: 16 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="들은 문장을 그대로 써 보세요"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box', minWidth: 0,
                padding: '14px 14px', fontSize: 18, borderRadius: 12,
                border: '2px solid #E0E0E0', outline: 'none',
              }}
            />
            <button onClick={submit} style={{ ...primaryBtn, background: GRADE_INFO[grade].color, marginTop: 12 }}>
              제출하기
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <div style={{
              ...card, borderLeft: `4px solid ${last?.correct ? '#2ECC71' : '#E74C3C'}`,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: last?.correct ? '#2ECC71' : '#E74C3C' }}>
                {last?.correct ? '⭕ 정답!' : '❌ 다시 볼까요?'}
              </div>
              {!last?.correct && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: '#999' }}>내가 쓴 답</div>
                  <div style={{ fontSize: 17, fontWeight: 600 }}>
                    {diffChars(last.input, last.answer).map((c, i) => (
                      <span key={i} style={{ color: c.ok ? '#2ECC71' : '#E74C3C', background: c.ok ? 'transparent' : '#FDEDEC' }}>
                        {c.ch === ' ' ? ' ' : c.ch}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontSize: 12, color: '#999' }}>정답</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#2C3E50', wordBreak: 'keep-all' }}>{last?.answer}</div>
            </div>
            <button onClick={next} style={{ ...primaryBtn, background: GRADE_INFO[grade].color, marginTop: 12 }}>
              {qIdx + 1 >= sentences.length ? '결과 보기' : '다음 문장 ▶'}
            </button>
          </div>
        )}
      </Shell>
    )
  }

  // ── 화면: 홈 (학년/회차 선택) ──
  const wrongCount = data.wrongNotes.length
  return (
    <Shell onBack={onBack} title="✏️ 받아쓰기" color="#5B8DEF"
      headerExtra={
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <span style={badge}>🔥 연속 {data.streak}일</span>
          <button onClick={() => setScreen('review')} style={{ ...badge, border: 'none', cursor: 'pointer' }}>
            📒 오답노트 {wrongCount > 0 ? `(${wrongCount})` : ''}
          </button>
        </div>
      }>
      {/* 학년 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {GRADES.map(g => (
          <button key={g} onClick={() => setGrade(g)} style={{
            flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 700,
            background: grade === g ? GRADE_INFO[g].color : '#FFF',
            color: grade === g ? '#FFF' : '#888',
            boxShadow: grade === g ? '0 2px 8px rgba(0,0,0,.12)' : '0 1px 3px rgba(0,0,0,.06)',
          }}>
            {GRADE_INFO[g].emoji}<br />{GRADE_INFO[g].label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 14, textAlign: 'center' }}>
        {GRADE_INFO[grade].focus} · 1회 10문제
      </div>

      {/* 회차 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {Array.from({ length: roundCount(grade) }, (_, r) => {
          const rec = getRoundRecord(grade, r)
          return (
            <button key={r} onClick={() => startRound(grade, r)} style={{
              padding: '16px 12px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: '#FFF', boxShadow: '0 2px 8px rgba(0,0,0,.06)', textAlign: 'left',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>{r + 1}회</div>
                <div style={{ fontSize: 11, color: rec ? GRADE_INFO[grade].color : '#BBB', marginTop: 3 }}>
                  {rec ? `최고 ${rec.best}/10` : '아직 안 풀었어요'}
                </div>
              </div>
              <div style={{ fontSize: 22 }}>{rec?.cleared ? '⭐' : rec ? '✏️' : '▶'}</div>
            </button>
          )
        })}
      </div>
    </Shell>
  )
}

// ── 공통 레이아웃/스타일 ──────────────────────────────────────────────
function Shell({ onBack, title, color, headerExtra, children }) {
  return (
    <div className="fade-in" style={{ minHeight: '100vh', background: '#F5F7FA' }}>
      <div style={{ background: `linear-gradient(135deg, ${color}, ${shade(color)})`, padding: '18px 16px 24px', borderRadius: '0 0 22px 22px' }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 10,
          padding: '7px 12px', fontSize: 14, color: '#FFF', cursor: 'pointer',
        }}>← 돌아가기</button>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#FFF', marginTop: 12 }}>{title}</div>
        {headerExtra}
      </div>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px' }}>{children}</div>
    </div>
  )
}
function Empty({ text }) {
  return <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '40px 0' }}>{text}</div>
}
// 색 살짝 어둡게
function shade(hex) {
  try {
    const n = parseInt(hex.slice(1), 16)
    const r = Math.max(0, (n >> 16) - 28), g = Math.max(0, ((n >> 8) & 255) - 28), b = Math.max(0, (n & 255) - 28)
    return `rgb(${r},${g},${b})`
  } catch { return hex }
}

const card = { background: '#FFF', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }
const primaryBtn = { flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer', color: '#FFF', fontSize: 16, fontWeight: 700, width: '100%' }
const miniBtn = { padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#EEF2F7', color: '#2C3E50', fontSize: 13, fontWeight: 600 }
const chipBtn = { padding: '8px 14px', borderRadius: 20, border: '1px solid #DDD', cursor: 'pointer', background: '#FFF', color: '#555', fontSize: 13, fontWeight: 600 }
const ghostBtn = { padding: '6px 12px', borderRadius: 10, border: '1px solid #E0E0E0', cursor: 'pointer', background: '#FFF', color: '#888', fontSize: 12 }
const badge = { fontSize: 12, fontWeight: 700, color: '#FFF', background: 'rgba(255,255,255,.22)', borderRadius: 20, padding: '5px 12px' }
