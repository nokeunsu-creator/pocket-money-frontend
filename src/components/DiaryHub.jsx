// 📖 그림일기 — 일기를 웹툰으로 만들어 가족 보물상자에 모아두는 화면
import { useState, useEffect, useMemo } from 'react'
import { CHILD1, CHILD2 } from '../config/names'
import {
  FAMILY_CHARACTERS,
  SAMPLE_DIARIES,
  loadDiaries,
  saveDiaries,
} from '../data/sampleDiaries'

const PAGE_BG = '#FEFCF6'
const ACCENT = '#FF9F1C'
const SOFT_LINE = '#F2E6CC'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(s) {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${Number(m)}월 ${Number(d)}일`
}

export default function DiaryHub({ onBack }) {
  const [view, setView] = useState('list') // 'list' | 'write' | 'viewer'
  const [diaries, setDiaries] = useState([])
  const [currentId, setCurrentId] = useState(null)

  useEffect(() => {
    setDiaries(loadDiaries())
  }, [])

  const sorted = useMemo(
    () => [...diaries].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [diaries]
  )

  const current = useMemo(
    () => diaries.find(d => d.id === currentId) || null,
    [diaries, currentId]
  )

  const handleSave = (entry) => {
    const next = entry.id
      ? diaries.map(d => d.id === entry.id ? entry : d)
      : [...diaries, { ...entry, id: `diary_${Date.now()}` }]
    setDiaries(next)
    saveDiaries(next)
    setView('list')
  }

  const handleDelete = (id) => {
    if (!confirm('이 일기를 삭제할까요?')) return
    const next = diaries.filter(d => d.id !== id)
    setDiaries(next)
    saveDiaries(next)
    setView('list')
  }

  const goWrite = () => { setCurrentId(null); setView('write') }
  const goEdit  = (id) => { setCurrentId(id); setView('write') }
  const goView  = (id) => { setCurrentId(id); setView('viewer') }

  return (
    <div className="fade-in" style={{ minHeight: '100vh', background: PAGE_BG, padding: '1rem' }}>
      <Header
        title={view === 'write' ? '✍️ 일기 쓰기' : view === 'viewer' ? '📖 웹툰 보기' : '📖 그림일기'}
        subtitle={view === 'list' ? '오늘의 일기를 웹툰으로' : ''}
        onBack={() => view === 'list' ? onBack() : setView('list')}
      />

      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {view === 'list' && (
          <DiaryList
            diaries={sorted}
            onAdd={goWrite}
            onView={goView}
          />
        )}
        {view === 'write' && (
          <DiaryWrite
            initial={current}
            onCancel={() => setView('list')}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}
        {view === 'viewer' && current && (
          <DiaryViewer
            diary={current}
            onEdit={() => goEdit(current.id)}
          />
        )}
      </div>
    </div>
  )
}

function Header({ title, subtitle, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, maxWidth: 480, margin: '0 auto 20px' }}>
      <button onClick={onBack}
        style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555', padding: '4px 8px' }}>
        ←
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#2C3E50' }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────── 목록 ───────────────────────────────────────
function DiaryList({ diaries, onAdd, onView }) {
  return (
    <div>
      <button
        onClick={onAdd}
        style={{
          width: '100%', padding: '16px', borderRadius: 14, marginBottom: 16,
          background: `linear-gradient(135deg, ${ACCENT}, #FFBF69)`,
          color: '#FFF', fontWeight: 800, fontSize: 16,
          border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(255,159,28,0.25)',
        }}
        onPointerDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
        onPointerUp={e => e.currentTarget.style.transform = ''}
        onPointerLeave={e => e.currentTarget.style.transform = ''}
      >
        ✍️ 오늘의 일기 쓰기
      </button>

      {diaries.length === 0 && (
        <div style={{ textAlign: 'center', color: '#999', padding: '40px 0', fontSize: 14 }}>
          아직 일기가 없어요. 첫 일기를 써봐요!
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {diaries.map(d => (
          <DiaryCard key={d.id} diary={d} onClick={() => onView(d.id)} />
        ))}
      </div>
    </div>
  )
}

function DiaryCard({ diary, onClick }) {
  const thumb = diary.panels?.[0]?.image
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', gap: 12, alignItems: 'center',
        padding: 12, borderRadius: 14,
        background: '#FFF', border: `1px solid ${SOFT_LINE}`,
        cursor: 'pointer', textAlign: 'left', width: '100%',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'transform 0.1s',
      }}
      onPointerDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
      onPointerUp={e => e.currentTarget.style.transform = ''}
      onPointerLeave={e => e.currentTarget.style.transform = ''}
    >
      {thumb ? (
        <img src={thumb} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 64, height: 64, borderRadius: 12, background: '#F4E9D8',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 28 }}>📖</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, marginBottom: 2 }}>
          {diary.isStory && <span style={{ marginRight: 4 }}>🪄 소설 ·</span>}
          {formatDate(diary.date)} · {diary.author}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#2C3E50',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {diary.title || '제목 없음'}
        </div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {(diary.body || '').slice(0, 40)}
        </div>
      </div>
    </button>
  )
}

// ─────────────────────────────────────── 작성 ───────────────────────────────────────
function DiaryWrite({ initial, onCancel, onSave, onDelete }) {
  const [author, setAuthor] = useState(initial?.author || CHILD1)
  const [date, setDate]     = useState(initial?.date   || todayStr())
  const [title, setTitle]   = useState(initial?.title  || '')
  const [body, setBody]     = useState(initial?.body   || '')

  const submit = () => {
    if (!body.trim()) { alert('일기 내용을 적어주세요!'); return }
    onSave({
      ...(initial || {}),
      id: initial?.id,
      author, date, title: title.trim() || '제목 없음', body: body.trim(),
      panels: initial?.panels || [], // AI 연동 전까지는 빈 배열, 추후 자동 생성
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 작성자 */}
      <Field label="누가 썼어요?">
        <div style={{ display: 'flex', gap: 8 }}>
          {[CHILD1, CHILD2].map(name => (
            <button
              key={name}
              onClick={() => setAuthor(name)}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 10,
                border: `2px solid ${author === name ? ACCENT : '#E8E0D0'}`,
                background: author === name ? '#FFF7E6' : '#FFF',
                fontSize: 14, fontWeight: 700,
                color: author === name ? ACCENT : '#666',
                cursor: 'pointer',
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </Field>

      {/* 날짜 */}
      <Field label="언제예요?">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={inputStyle()}
        />
      </Field>

      {/* 제목 */}
      <Field label="제목 (안 써도 돼요)">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="예: 친할아버지 생신"
          maxLength={40}
          style={inputStyle()}
        />
      </Field>

      {/* 본문 */}
      <Field label="오늘 있었던 일">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="오늘은..."
          rows={10}
          style={{
            ...inputStyle(),
            resize: 'vertical',
            minHeight: 200,
            lineHeight: 1.6,
          }}
        />
      </Field>

      {/* 안내 */}
      <div style={{
        padding: 12, borderRadius: 10, background: '#FFF7E6',
        fontSize: 12, color: '#A0680E', lineHeight: 1.5,
      }}>
        💡 일기를 저장하면, 나중에 AI가 자동으로 웹툰 컷을 만들어줘요. (지금은 글만 저장돼요)
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '14px 0', borderRadius: 10,
            background: '#EEE', color: '#666', border: 'none',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          취소
        </button>
        <button
          onClick={submit}
          style={{
            flex: 2, padding: '14px 0', borderRadius: 10,
            background: `linear-gradient(135deg, ${ACCENT}, #FFBF69)`,
            color: '#FFF', border: 'none',
            fontSize: 15, fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(255,159,28,0.25)',
          }}
        >
          💾 저장
        </button>
      </div>

      {initial?.id && (
        <button
          onClick={() => onDelete(initial.id)}
          style={{
            marginTop: 8, padding: '10px 0', borderRadius: 10,
            background: 'transparent', color: '#C0392B',
            border: '1px solid #FCE4DC',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          🗑️ 일기 삭제
        </button>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#7E6B4D', marginBottom: 6, paddingLeft: 2 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function inputStyle() {
  return {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #E8E0D0',
    background: '#FFF',
    fontSize: 16,
    color: '#2C3E50',
    fontFamily: 'inherit',
  }
}

// ─────────────────────────────────────── 뷰어 ───────────────────────────────────────
function DiaryViewer({ diary, onEdit }) {
  const [showBody, setShowBody] = useState(false)
  const panels = diary.panels || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 32 }}>
      {/* 헤더 카드 */}
      <div style={{
        padding: 16, borderRadius: 14,
        background: `linear-gradient(135deg, ${ACCENT}, #FFBF69)`,
        color: '#FFF',
      }}>
        <div style={{ fontSize: 13, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 6 }}>
          {diary.isStory && (
            <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 6, padding: '1px 7px', fontWeight: 800, fontSize: 11 }}>🪄 소설</span>
          )}
          {formatDate(diary.date)} · {diary.author}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{diary.title}</div>
        {diary.subtitle && (
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.92, marginTop: 2 }}>— {diary.subtitle}</div>
        )}
      </div>

      {/* 웹툰 컷 */}
      {panels.length === 0 ? (
        <div style={{
          padding: 24, borderRadius: 14, background: '#FFF7E6',
          textAlign: 'center', color: '#A0680E', fontSize: 13, lineHeight: 1.6,
        }}>
          🎨 웹툰 컷은 아직 만들어지지 않았어요.<br />
          나중에 AI가 자동으로 그려줄 예정이에요.
        </div>
      ) : (
        panels.map((p, i) => (
          <Panel key={i} index={i + 1} panel={p} />
        ))
      )}

      {/* 원본 일기 토글 */}
      <button
        onClick={() => setShowBody(s => !s)}
        style={{
          padding: '12px 16px', borderRadius: 10,
          background: '#FFF', border: `1px solid ${SOFT_LINE}`,
          color: '#7E6B4D', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        {diary.isStory
          ? (showBody ? '▼ 원작 소설 닫기' : '▶ 원작 소설 보기')
          : (showBody ? '▼ 원본 일기 닫기' : '▶ 원본 일기 보기')}
      </button>
      {showBody && (
        <div style={{
          padding: 16, borderRadius: 12, background: '#FFFCF4',
          border: `1px solid ${SOFT_LINE}`,
          fontSize: 14, color: '#3A3A3A', lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
        }}>
          {diary.body}
        </div>
      )}

      {/* 수정 버튼 */}
      <button
        onClick={onEdit}
        style={{
          marginTop: 8, padding: '12px 0', borderRadius: 10,
          background: '#FFF', border: `2px solid ${ACCENT}`,
          color: ACCENT, fontSize: 14, fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        ✏️ 일기 수정
      </button>
    </div>
  )
}

// 9방향 위치 → 절대좌표 스타일
function posStyle(position = 'bottom-left') {
  const [v, h] = position.split('-')
  const s = {}
  if (v === 'top') s.top = '6%'
  else if (v === 'middle') { s.top = '46%'; s.transform = 'translateY(-50%)' }
  else s.bottom = '6%'
  if (h === 'left') s.left = '5%'
  else if (h === 'right') s.right = '5%'
  else { s.left = '50%'; s.transform = (s.transform ? s.transform + ' ' : '') + 'translateX(-50%)' }
  return s
}

// 말풍선 (speech / thought / shout)
function Bubble({ bubble }) {
  const { text, position = 'bottom-left', type = 'speech', tail = 'down-left', color } = bubble
  const accentColor = color || '#1a1a1a'
  const isShout = type === 'shout'
  const isThought = type === 'thought'
  const isNarration = type === 'narration'

  const base = {
    position: 'absolute',
    ...posStyle(position),
    maxWidth: '70%',
    background: isNarration ? '#FFF9E0' : '#FFF',
    padding: isNarration ? '8px 14px' : '10px 14px',
    border: `${isShout ? 3 : 2.5}px solid ${accentColor}`,
    borderRadius: isThought ? 28 : isShout ? 8 : 18,
    fontSize: isShout ? 16 : 14,
    color: accentColor,
    fontWeight: isShout ? 900 : 700,
    lineHeight: 1.35,
    boxShadow: `3px 3px 0 ${accentColor}`,
    fontFamily: '"Nanum Gothic", "Malgun Gothic", sans-serif',
    zIndex: 5,
  }

  // 꼬리 방향
  const tailDir = tail || (position.startsWith('top') ? 'up-left' : 'down-left')
  const tailStyle = bubbleTail(tailDir, accentColor)

  return (
    <div style={base}>
      {text}
      {!isNarration && <span style={tailStyle.outer} />}
      {!isNarration && <span style={tailStyle.inner} />}
    </div>
  )
}

function bubbleTail(dir, color) {
  // 4 방향 + 대각선 4 방향 (총 8가지 꼬리 위치)
  const tails = {
    'down-left':   { outerEdge: 'borderTop', innerEdge: 'borderTop',
                    outer: { bottom: -14, left: 18 }, inner: { bottom: -9, left: 22 } },
    'down-right':  { outerEdge: 'borderTop', innerEdge: 'borderTop',
                    outer: { bottom: -14, right: 18 }, inner: { bottom: -9, right: 22 } },
    'up-left':     { outerEdge: 'borderBottom', innerEdge: 'borderBottom',
                    outer: { top: -14, left: 18 }, inner: { top: -9, left: 22 } },
    'up-right':    { outerEdge: 'borderBottom', innerEdge: 'borderBottom',
                    outer: { top: -14, right: 18 }, inner: { top: -9, right: 22 } },
    'left':        { outerEdge: 'borderRight', innerEdge: 'borderRight',
                    outer: { top: '40%', left: -14 }, inner: { top: 'calc(40% + 4px)', left: -9 } },
    'right':       { outerEdge: 'borderLeft', innerEdge: 'borderLeft',
                    outer: { top: '40%', right: -14 }, inner: { top: 'calc(40% + 4px)', right: -9 } },
  }
  const t = tails[dir] || tails['down-left']
  const triangleBase = { position: 'absolute', width: 0, height: 0 }
  // 화살표 모양 만들기 (위/아래 꼬리)
  if (dir.startsWith('down')) {
    return {
      outer: { ...triangleBase, ...t.outer,
        borderLeft: '11px solid transparent', borderRight: '11px solid transparent',
        borderTop: `15px solid ${color}` },
      inner: { ...triangleBase, ...t.inner,
        borderLeft: '7px solid transparent', borderRight: '7px solid transparent',
        borderTop: '11px solid #FFF' },
    }
  } else if (dir.startsWith('up')) {
    return {
      outer: { ...triangleBase, ...t.outer,
        borderLeft: '11px solid transparent', borderRight: '11px solid transparent',
        borderBottom: `15px solid ${color}` },
      inner: { ...triangleBase, ...t.inner,
        borderLeft: '7px solid transparent', borderRight: '7px solid transparent',
        borderBottom: '11px solid #FFF' },
    }
  } else if (dir === 'left') {
    return {
      outer: { ...triangleBase, ...t.outer,
        borderTop: '11px solid transparent', borderBottom: '11px solid transparent',
        borderRight: `15px solid ${color}` },
      inner: { ...triangleBase, ...t.inner,
        borderTop: '7px solid transparent', borderBottom: '7px solid transparent',
        borderRight: '11px solid #FFF' },
    }
  } else {
    return {
      outer: { ...triangleBase, ...t.outer,
        borderTop: '11px solid transparent', borderBottom: '11px solid transparent',
        borderLeft: `15px solid ${color}` },
      inner: { ...triangleBase, ...t.inner,
        borderTop: '7px solid transparent', borderBottom: '7px solid transparent',
        borderLeft: '11px solid #FFF' },
    }
  }
}

// 효과음 텍스트 (큰 글씨, 회전, 외곽선)
function Sfx({ sfx }) {
  const { text, position = 'middle-right', color = '#E63946', rotation = -8 } = sfx
  return (
    <div style={{
      position: 'absolute',
      ...posStyle(position),
      fontSize: 38,
      fontWeight: 900,
      color: '#FFF',
      WebkitTextStroke: `3px ${color}`,
      textShadow: `4px 4px 0 ${color}, 0 0 12px rgba(0,0,0,0.3)`,
      transform: (posStyle(position).transform || '') + ` rotate(${rotation}deg)`,
      fontFamily: '"Black Han Sans", "Jua", "Nanum Gothic", sans-serif',
      pointerEvents: 'none',
      letterSpacing: '-1px',
      zIndex: 6,
    }}>
      {text}
    </div>
  )
}

function Panel({ index, panel }) {
  // 새 구조 — bubbles[] (여러 말풍선) / narration (상단 띠) / sfx (효과음)
  // 기존 구조 — dialog (한 줄) 도 호환
  const bubbles = panel.bubbles ||
    (panel.dialog ? [{ text: panel.dialog, position: 'bottom-left', type: 'speech' }] : [])

  return (
    <div style={{
      borderRadius: 4,
      overflow: 'hidden',
      background: '#FFF',
      border: '3px solid #1a1a1a',
      boxShadow: '6px 6px 0 #1a1a1a',
    }}>
      {/* 상단 내레이션 박스 (있을 때) */}
      {panel.narration && (
        <div style={{
          background: '#FFF6CC',
          borderBottom: '2.5px solid #1a1a1a',
          padding: '8px 12px',
          fontSize: 13, fontWeight: 700, color: '#5a3e00',
          lineHeight: 1.4,
          fontFamily: '"Nanum Gothic", "Malgun Gothic", sans-serif',
        }}>
          {panel.narration}
        </div>
      )}

      <div style={{ position: 'relative', background: '#F8F4EB' }}>
        <img
          src={panel.image}
          alt={panel.scene}
          onError={e => {
            if (panel._fallback && !e.currentTarget.dataset.fb) {
              e.currentTarget.dataset.fb = '1'
              e.currentTarget.src = panel._fallback
            }
          }}
          style={{ width: '100%', display: 'block', aspectRatio: '4 / 5', objectFit: 'cover' }}
        />
        {/* 컷 번호 */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: '#1a1a1a', color: '#FFF',
          padding: '3px 12px', border: '2px solid #FFF',
          fontSize: 11, fontWeight: 800,
          zIndex: 7,
        }}>
          {index}
        </div>

        {/* 말풍선들 */}
        {bubbles.map((b, i) => <Bubble key={i} bubble={b} />)}

        {/* 효과음 */}
        {panel.sfx && <Sfx sfx={panel.sfx} />}
      </div>

      {/* 장면 설명 (캡션) */}
      {panel.scene && (
        <div style={{
          padding: '8px 14px', fontSize: 12, color: '#5a5a5a',
          borderTop: '2.5px solid #1a1a1a', background: '#FFFCF4',
          fontStyle: 'italic',
        }}>
          {panel.scene}
        </div>
      )}
    </div>
  )
}
