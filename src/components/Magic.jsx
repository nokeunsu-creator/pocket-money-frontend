import { useState, useEffect } from 'react'
import magicTricks from '../data/magicTricks'
import MagicSvg from './MagicSvg'

const CATEGORIES = [
  { key: 'card',   icon: '🃏', title: '카드 마술',     color: '#1565C0', desc: '카드 한 벌로 부리는 마술' },
  { key: 'coin',   icon: '🪙', title: '동전 마술',     color: '#FB8C00', desc: '동전이 사라지고 늘어나요' },
  { key: 'rope',   icon: '🧵', title: '끈·고무줄',     color: '#8D6E63', desc: '끈과 매듭의 신기함' },
  { key: 'paper',  icon: '📄', title: '종이·물체',     color: '#43A047', desc: '종이·컵·펜 마술' },
  { key: 'mental', icon: '🔮', title: '멘탈·예측',     color: '#7B1FA2', desc: '마음을 읽고 미래를 예측' },
]

const LEVEL_STARS = ['★', '★★', '★★★']

export default function Magic({ onBack, userId = 'default' }) {
  const [view, setView] = useState('home') // 'home' | 'list' | 'detail'
  const [categoryKey, setCategoryKey] = useState(null)
  const [trickId, setTrickId] = useState(null)
  const [learned, setLearned] = useState(() => loadLearned(userId))
  const [showSecret, setShowSecret] = useState(false)

  useEffect(() => { setLearned(loadLearned(userId)) }, [userId])

  const trick = trickId ? magicTricks.find(t => t.id === trickId) : null
  const tricksInCategory = categoryKey ? magicTricks.filter(t => t.category === categoryKey) : []
  const totalCount = magicTricks.length
  const learnedCount = learned.size

  const toggleLearned = (id) => {
    setLearned(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveLearned(userId, next)
      return next
    })
  }

  const goCategory = (key) => { setCategoryKey(key); setView('list') }
  const goDetail = (id) => { setTrickId(id); setShowSecret(false); setView('detail') }
  const back = () => {
    if (view === 'detail') { setView('list'); setTrickId(null) }
    else if (view === 'list') { setView('home'); setCategoryKey(null) }
    else onBack()
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={back}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>←</button>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
          {view === 'home' ? '🎩 마술'
            : view === 'list' ? CATEGORIES.find(c => c.key === categoryKey)?.title
              : trick?.title}
        </h2>
        <div style={{ width: 22 }} />
      </div>

      {view === 'home' && <HomeView learnedCount={learnedCount} totalCount={totalCount} onPick={goCategory} learned={learned} />}
      {view === 'list' && <ListView category={CATEGORIES.find(c => c.key === categoryKey)} tricks={tricksInCategory} learned={learned} onPick={goDetail} />}
      {view === 'detail' && trick && (
        <DetailView trick={trick} learned={learned.has(trick.id)}
          onToggleLearned={() => toggleLearned(trick.id)}
          showSecret={showSecret} setShowSecret={setShowSecret} />
      )}
    </div>
  )
}

// ─── 홈 ───
function HomeView({ learnedCount, totalCount, onPick, learned }) {
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 56, marginBottom: 4 }}>🎩</div>
        <p style={{ fontSize: 13, color: '#888', margin: 0 }}>친구·가족 앞에서 마술쇼!</p>
      </div>

      {/* 진도 바 */}
      <div style={{
        background: '#F3E5F5', borderRadius: 12, padding: '12px 16px', marginBottom: 18,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#7B1FA2' }}>배운 마술</span>
          <span style={{ fontSize: 13, color: '#7B1FA2' }}>{learnedCount} / {totalCount}</span>
        </div>
        <div style={{ background: '#FFF', height: 8, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            background: '#7B1FA2', height: '100%',
            width: `${Math.min(100, (learnedCount / totalCount) * 100)}%`,
          }} />
        </div>
      </div>

      {/* 카테고리 카드 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CATEGORIES.map(cat => {
          const tricks = magicTricks.filter(t => t.category === cat.key)
          const done = tricks.filter(t => learned.has(t.id)).length
          return (
            <button key={cat.key} onClick={() => onPick(cat.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: '#FFF', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textAlign: 'left',
              }}>
              <div style={{
                width: 46, height: 46, borderRadius: 12, background: cat.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: '#FFF',
              }}>{cat.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{cat.title}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{cat.desc}</div>
              </div>
              <div style={{ fontSize: 12, color: cat.color, fontWeight: 700 }}>{done}/{tricks.length}</div>
            </button>
          )
        })}
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 16 }}>
        ✨ 배운 마술은 체크박스에 표시해서 진도 확인하기
      </p>
    </>
  )
}

// ─── 목록 ───
function ListView({ category, tricks, learned, onPick }) {
  return (
    <>
      <div style={{
        background: category.color, color: '#FFF', padding: '12px 16px',
        borderRadius: 12, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 26 }}>{category.icon}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{tricks.length}개 마술</div>
          <div style={{ fontSize: 11, opacity: 0.9 }}>{category.desc}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tricks.map(t => {
          const isLearned = learned.has(t.id)
          return (
            <button key={t.id} onClick={() => onPick(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: isLearned ? '#E8F5E9' : '#FFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textAlign: 'left',
              }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: isLearned ? '#43A047' : '#EEE',
                color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700,
              }}>{isLearned ? '✓' : ''}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{t.title}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                  {LEVEL_STARS[t.level - 1]} · ⏱ {t.duration} · 🎒 {t.props.join(', ')}
                </div>
              </div>
              <div style={{ fontSize: 14, color: '#CCC' }}>›</div>
            </button>
          )
        })}
      </div>
    </>
  )
}

// ─── 상세 ───
function DetailView({ trick, learned, onToggleLearned, showSecret, setShowSecret }) {
  const cat = CATEGORIES.find(c => c.key === trick.category)
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(trick.youtubeQuery || trick.title + ' 마술')}`

  return (
    <>
      {/* 헤더 카드 */}
      <div style={{
        background: cat?.color || '#888', color: '#FFF', padding: '14px 16px',
        borderRadius: 12, marginBottom: 14,
      }}>
        <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 4 }}>
          {LEVEL_STARS[trick.level - 1]} · ⏱ {trick.duration}
        </div>
        <div style={{ fontSize: 14, marginBottom: 8 }}>{trick.effect}</div>
        <div style={{ fontSize: 12, opacity: 0.9 }}>
          🎒 준비물: {trick.props.join(', ')}
        </div>
      </div>

      {/* 배웠어요 체크 */}
      <button onClick={onToggleLearned}
        style={{
          width: '100%', padding: '10px 14px', marginBottom: 14, borderRadius: 12, border: 'none',
          background: learned ? '#43A047' : '#F0F0F0',
          color: learned ? '#FFF' : '#333',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
        {learned ? '✅ 배웠어요!' : '⭕ 아직 안 배웠어요'}
      </button>

      {/* 단계별 */}
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>📋 단계별로</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {trick.steps.map((step, i) => (
          <div key={i} style={{
            background: '#FFF', borderRadius: 12, padding: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: cat?.color || '#888', color: '#FFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, flexShrink: 0,
            }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>{step.text}</div>
              {step.svgKey && (
                <div style={{ textAlign: 'center', marginTop: 4 }}>
                  <MagicSvg svgKey={step.svgKey} size={100} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 비밀 (탭하면 펼침) */}
      <button onClick={() => setShowSecret(s => !s)}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: 12, border: 'none',
          background: showSecret ? '#FFE0B2' : '#FFCC80',
          color: '#5D4037', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          marginBottom: showSecret ? 0 : 14,
          textAlign: 'left',
        }}>
        🤫 {showSecret ? '비밀 숨기기' : '비밀이 궁금하면 탭하세요'}
      </button>
      {showSecret && (
        <div style={{
          background: '#FFF8E1', borderLeft: '4px solid #FB8C00',
          padding: 12, marginBottom: 14, borderRadius: '0 8px 8px 0',
          fontSize: 13, lineHeight: 1.6,
        }}>{trick.secret}</div>
      )}

      {/* 팁 */}
      {trick.tips?.length > 0 && (
        <div style={{
          background: '#E3F2FD', borderRadius: 12, padding: 12, marginBottom: 14,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1565C0', marginBottom: 6 }}>💡 연습 팁</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: '#1565C0' }}>
            {trick.tips.map((tip, i) => <li key={i}>{tip}</li>)}
          </ul>
        </div>
      )}

      {/* 주의 */}
      {trick.warning && (
        <div style={{
          background: '#FFEBEE', borderRadius: 12, padding: 12, marginBottom: 14,
          fontSize: 12, color: '#C62828',
        }}>
          ⚠️ {trick.warning}
        </div>
      )}

      {/* 유튜브 검색 */}
      <a href={youtubeUrl} target="_blank" rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '12px 14px', borderRadius: 12, background: '#C62828', color: '#FFF',
          textDecoration: 'none', fontSize: 14, fontWeight: 700, marginBottom: 8,
        }}>
        ▶️ 유튜브에서 영상 보기
      </a>
      <p style={{ textAlign: 'center', fontSize: 11, color: '#888' }}>
        영상 본 후 다시 와서 연습해 보세요
      </p>
    </>
  )
}

// ─── localStorage ───
function loadLearned(userId) {
  try {
    const raw = localStorage.getItem(`magic-learned-${userId}`)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch { return new Set() }
}
function saveLearned(userId, set) {
  try {
    localStorage.setItem(`magic-learned-${userId}`, JSON.stringify([...set]))
  } catch {}
}
