// 우리 가족 허브 — 가족 관련 메뉴 모음 (비밀번호 3396으로 진입)
// 가계도 / 할 일 / 공부 타이머 / 공부 기록 / 메모 / 성장 기록

export default function FamilyHub({ onBack, onSelect }) {
  const items = [
    { key: 'familyTree', label: '가계도', emoji: '🌳', color: 'linear-gradient(135deg, #2D6A4F, #52B788)' },
    { key: 'todo', label: '할 일', emoji: '✅', color: 'linear-gradient(135deg, #06D6A0, #05B384)' },
    { key: 'timer', label: '공부 타이머', emoji: '⏱', color: 'linear-gradient(135deg, #E74C3C, #C0392B)' },
    { key: 'study', label: '공부 기록', emoji: '📋', color: 'linear-gradient(135deg, #3498DB, #2980B9)' },
    { key: 'memo', label: '메모', emoji: '📝', color: 'linear-gradient(135deg, #F39C12, #E67E22)' },
    { key: 'growth', label: '성장 기록', emoji: '📏', color: 'linear-gradient(135deg, #06D6A0, #05B384)' },
  ]

  return (
    <div className="fade-in" style={{ minHeight: '100vh', background: '#FEFCF6', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, maxWidth: 480, margin: '0 auto 20px' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555', padding: '4px 8px' }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#2C3E50' }}>👨‍👩‍👦‍👦 우리 가족</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>가족 관련 메뉴</div>
        </div>
      </div>

      <div style={{
        maxWidth: 480, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 12,
      }}>
        {items.map(item => (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              padding: '24px 12px', borderRadius: 16,
              background: item.color,
              color: '#FFF', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'transform 0.1s',
            }}
            onPointerDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onPointerUp={e => e.currentTarget.style.transform = ''}
            onPointerLeave={e => e.currentTarget.style.transform = ''}
          >
            <span style={{ fontSize: 36 }}>{item.emoji}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
