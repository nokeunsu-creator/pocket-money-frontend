export default function GameHub({ onBack, onSelectGame }) {
  const categories = [
    {
      label: '🧩 보드게임', games: [
        { key: 'omok', icon: '⚫', title: '오목', desc: 'AI · 2인 · 온라인', color: '#333' },
        { key: 'baduk', icon: '⚪', title: '바둑', desc: 'AI 1~10단계 · 2인 · 온라인', color: '#1a1a1a' },
        { key: 'chess', icon: '♟️', title: '체스', desc: 'AI · 2인 · 온라인', color: '#5D4037' },
        { key: 'janggi', icon: '將', title: '장기', desc: 'AI 10단계 · 2인 · 온라인', color: '#8B0000' },
      ],
    },
    {
      label: '🃏 카드게임', games: [
        { key: 'onecard', icon: '🃏', title: '원카드', desc: 'AI · 온라인 대전', color: '#4A3F8A' },
        { key: 'hula', icon: '♠️', title: '훌라', desc: 'AI · 온라인 대전', color: '#2D6A4F' },
        { key: 'memory', icon: '🎴', title: '카드 뒤집기', desc: '1인 · 온라인 대전', color: '#06D6A0' },
      ],
    },
    {
      label: '🧠 두뇌게임', games: [
        { key: 'baseball', icon: '⚾', title: '숫자 야구', desc: '1인 · 온라인 대결', color: '#4895EF' },
        { key: 'multiply', icon: '✖️', title: '구구단 챌린지', desc: '1인 · 온라인 대결', color: '#F39C12' },
        { key: 'mathquiz', icon: '🧮', title: '사칙연산 퀴즈', desc: '1인 · 온라인 대결', color: '#EF476F' },
      ],
    },
    {
      label: '📚 학습', games: [
        { key: 'baduk-classroom', icon: '🎓', title: '바둑 교실', desc: '50레슨 · 초보→실전', color: '#2D6A4F' },
        { key: 'english', icon: '🔤', title: '영어나라', desc: '단어·스펠링·문장·대전', color: '#4895EF' },
        { key: 'math', icon: '📐', title: '수학나라', desc: '연산·도형·분수·시계', color: '#E74C3C' },
        { key: 'science', icon: '🧪', title: '과학 퀴즈', desc: '10주제 200문제', color: '#9B59B6' },
        { key: 'history', icon: '🇰🇷', title: '한국사 퀴즈', desc: '10주제 200문제', color: '#8B4513' },
      ],
    },
    {
      label: '🏅 기타', games: [
        { key: 'achievements', icon: '🏅', title: '업적', desc: '도전 과제 달성하기', color: '#F1C40F' },
      ],
    },
  ]

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={onBack}
        style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
        ← 돌아가기
      </button>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎮</div>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>게임</h2>
        <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>재미있는 게임을 골라보세요!</p>
      </div>

      {categories.map(cat => (
        <div key={cat.label} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, paddingLeft: 4 }}>{cat.label}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cat.games.map(g => (
              <button key={g.key}
                onClick={() => onSelectGame(g.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: '#FFF', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  textAlign: 'left', transition: 'transform 0.1s',
                }}
                onPointerDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                onPointerUp={e => e.currentTarget.style.transform = ''}
                onPointerLeave={e => e.currentTarget.style.transform = ''}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: g.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0, color: '#FFF',
                }}>
                  {g.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{g.title}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{g.desc}</div>
                </div>
                <div style={{ fontSize: 16, color: '#CCC' }}>›</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
