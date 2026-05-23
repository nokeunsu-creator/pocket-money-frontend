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
        <div style={{ fontSize: 13, opacity: 0.9 }}>{formatDate(diary.date)} · {diary.author}</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{diary.title}</div>
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
        {showBody ? '▼ 원본 일기 닫기' : '▶ 원본 일기 보기'}
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

function Panel({ index, panel }) {
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      background: '#FFF', border: `1px solid ${SOFT_LINE}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <div style={{ position: 'relative', background: '#F8F4EB' }}>
        <img
          src={panel.image}
          alt={panel.scene}
          onError={e => {
            // 장면별 이미지 아직 안 만들어졌으면 캐릭터 이미지로 fallback
            if (panel._fallback && e.currentTarget.src !== window.location.origin + panel._fallback) {
              e.currentTarget.src = panel._fallback
            }
          }}
          style={{ width: '100%', display: 'block', aspectRatio: '1 / 1', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: 'rgba(0,0,0,0.65)', color: '#FFF',
          padding: '3px 10px', borderRadius: 99,
          fontSize: 11, fontWeight: 700,
        }}>
          {index}컷
        </div>
        {panel.dialog && (
          <div style={{
            position: 'absolute', bottom: 12, left: 12, right: 12,
            background: 'rgba(255,255,255,0.95)',
            padding: '10px 14px', borderRadius: 14,
            fontSize: 14, color: '#2C3E50', fontWeight: 600,
            lineHeight: 1.4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            "{panel.dialog}"
          </div>
        )}
      </div>
      {panel.scene && (
        <div style={{
          padding: '10px 14px', fontSize: 12, color: '#7E6B4D',
          borderTop: `1px solid ${SOFT_LINE}`, background: '#FFFCF4',
        }}>
          {panel.scene}
        </div>
      )}
    </div>
  )
}
