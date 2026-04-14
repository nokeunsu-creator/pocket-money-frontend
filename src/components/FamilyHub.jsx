// 우리 가족 허브 — 가족 관련 메뉴 모음 (비밀번호 3396으로 진입)
// 가계도 / 할 일 / 공부 타이머 / 공부 기록 / 메모 / 성장 기록

export default function FamilyHub({ onBack, onSelect }) {
  const btn = (key, label, emoji, color, wide) => (
    <button
      key={key}
      onClick={() => onSelect(key)}
      style={{
        gridColumn: wide ? '1 / -1' : undefined,
        display: 'flex', flexDirection: wide ? 'row' : 'column',
        alignItems: 'center', justifyContent: wide ? 'center' : undefined,
        gap: wide ? 14 : 8,
        padding: wide ? '20px 12px' : '24px 12px', borderRadius: 16,
        background: color,
        color: '#FFF', border: 'none', cursor: 'pointer',
        fontSize: wide ? 18 : 14, fontWeight: 700,
        boxShadow: wide ? '0 4px 14px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'transform 0.1s',
      }}
      onPointerDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
      onPointerUp={e => e.currentTarget.style.transform = ''}
      onPointerLeave={e => e.currentTarget.style.transform = ''}
    >
      <span style={{ fontSize: wide ? 40 : 36 }}>{emoji}</span>
      <span>{label}</span>
    </button>
  )

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
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
      }}>
        {btn('familyTree', '가계도', '🌳', 'linear-gradient(135deg, #2D6A4F, #52B788)')}
        {btn('growth', '성장 기록', '📏', 'linear-gradient(135deg, #06D6A0, #05B384)')}
        {btn('study', '공부 기록', '📋', 'linear-gradient(135deg, #3498DB, #2980B9)', true)}
        {btn('memo', '메모', '📝', 'linear-gradient(135deg, #F39C12, #E67E22)')}
        {btn('todo', '할 일', '✅', 'linear-gradient(135deg, #06D6A0, #05B384)')}
      </div>
    </div>
  )
}
