export default function GameHub({ onBack, onSelectGame }) {
  const games = [
    { key: 'baseball', icon: '⚾', title: '숫자 야구', desc: '1~9 숫자 맞추기', color: '#4895EF' },
    { key: 'memory', icon: '🃏', title: '카드 뒤집기', desc: '같은 그림 찾기', color: '#06D6A0' },
    { key: 'multiply', icon: '✖️', title: '구구단 챌린지', desc: '구구단 타임어택', color: '#F39C12' },
    { key: 'mathquiz', icon: '🧮', title: '사칙연산 퀴즈', desc: '스피드 연산 대결', color: '#EF476F' },
    { key: 'onecard', icon: '🃏', title: '원카드', desc: '컴퓨터와 1:1 대결', color: '#4A3F8A' },
    { key: 'hula', icon: '♠️', title: '훌라', desc: '카드 조합 맞추기', color: '#2D6A4F' },
    { key: 'chess', icon: '♟️', title: '체스', desc: 'AI · 2인 · 온라인', color: '#5D4037' },
    { key: 'janggi', icon: '將', title: '장기', desc: 'AI · 2인 · 온라인', color: '#8B0000' },
    { key: 'omok', icon: '⚫', title: '오목', desc: 'AI · 2인 · 온라인', color: '#333' },
    { key: 'baduk', icon: '⚪', title: '바둑', desc: 'AI 1~10단계 · 2인 · 온라인', color: '#1a1a1a' },
    { key: 'baduk-classroom', icon: '🎓', title: '바둑 교실', desc: '50레슨 · 초보부터 실전까지', color: '#2D6A4F' },
  ]

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={onBack}
        style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
        ← 돌아가기
      </button>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎮</div>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>게임</h2>
        <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>재미있는 게임을 골라보세요!</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {games.map(g => (
          <button key={g.key}
            onClick={() => onSelectGame(g.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '18px 20px', borderRadius: 16, border: 'none', cursor: 'pointer',
              background: '#FFF', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              textAlign: 'left', transition: 'transform 0.1s',
            }}
            onPointerDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onPointerUp={e => e.currentTarget.style.transform = ''}
            onPointerLeave={e => e.currentTarget.style.transform = ''}
          >
            <div style={{
              width: 50, height: 50, borderRadius: 14,
              background: g.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, flexShrink: 0,
            }}>
              {g.icon}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{g.title}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{g.desc}</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 18, color: '#CCC' }}>›</div>
          </button>
        ))}
      </div>
    </div>
  )
}
