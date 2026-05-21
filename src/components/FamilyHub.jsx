// 우리 가족 허브 — 가족 관련 메뉴 모음 (비밀번호 3396으로 진입)
// 가계도 / 할 일 / 공부 타이머 / 공부 기록 / 메모 / 성장 기록

const EXTERNAL_APPS = [
  { name: 'quizarena', label: '퀴즈 아레나', emoji: '🎯', url: 'https://quizarena-omega.vercel.app/' },
  { name: 'betking', label: '한판해', emoji: '👑', url: 'https://betking-pi.vercel.app' },
  { name: 'final-choice', label: '최우의 선택', emoji: '🎲', url: 'https://final-choice.vercel.app' },
  { name: 'chonmap', label: '촌맵', emoji: '🗺️', url: 'https://chonmap.vercel.app' },
  { name: 'jumal-muhae', label: '주말 뭐해', emoji: '🌅', url: 'https://jumal-muhae-frontend.vercel.app' },
  { name: 'pocket-pet', label: '포켓 펫', emoji: '🐾', url: 'https://pocket-pet-alpha.vercel.app' },
  { name: 'just-speak', label: '그냥 말해', emoji: '🗣️', url: 'https://just-speak.vercel.app' },
]

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
        {btn('dojo', '🥊 도장', '🥊', 'linear-gradient(135deg, #E63946, #B91D47)', true)}
      </div>

      <div style={{ maxWidth: 480, margin: '24px auto 0' }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: '#2C3E50',
          marginBottom: 8, paddingLeft: 4,
        }}>
          🔗 다른 앱들
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}>
          {EXTERNAL_APPS.map(app => (
            <a
              key={app.name}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 6, padding: '14px 6px', borderRadius: 14,
                background: '#FFF', border: '1px solid #E8E0D0',
                color: '#2C3E50', textDecoration: 'none',
                fontSize: 12, fontWeight: 600, textAlign: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'transform 0.1s',
              }}
              onPointerDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
              onPointerUp={e => e.currentTarget.style.transform = ''}
              onPointerLeave={e => e.currentTarget.style.transform = ''}
            >
              <span style={{ fontSize: 26 }}>{app.emoji}</span>
              <span style={{ lineHeight: 1.2 }}>{app.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
