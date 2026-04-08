export default function MainHub({ user, onSelect, onSwitchUser }) {
  const categories = [
    {
      key: 'money',
      emoji: '💰',
      title: '용돈기입장',
      desc: '수입/지출 관리',
      color: '#4895EF',
      bg: 'linear-gradient(135deg, #4895EF 0%, #6BB3F7 100%)',
    },
    {
      key: 'travel',
      emoji: '✈️',
      title: '여행 스케줄',
      desc: '여행 계획 & 일정',
      color: '#4A3F8A',
      bg: 'linear-gradient(135deg, #4A3F8A 0%, #6B5FBF 100%)',
    },
    {
      key: 'family',
      emoji: '👨‍👩‍👦‍👦',
      title: '우리 가족',
      desc: '가계도 & 호칭',
      color: '#E07A5F',
      bg: 'linear-gradient(135deg, #E07A5F 0%, #F2A07B 100%)',
    },
    {
      key: 'game',
      emoji: '🎮',
      title: '게임',
      desc: '준비 중...',
      color: '#888',
      bg: 'linear-gradient(135deg, #AAA 0%, #CCC 100%)',
      disabled: true,
    },
  ]

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 12px' }}>
        <h1 style={{ fontSize: 20, color: 'var(--brown)' }}>
          {user}의 공간
        </h1>
        <button
          onClick={onSwitchUser}
          style={{ background: 'var(--light-gray)', padding: '6px 14px', borderRadius: 20, fontSize: 13, color: 'var(--gray)' }}
        >
          👤 전환
        </button>
      </div>

      <div style={{ padding: '20px 0' }}>
        {categories.map(cat => (
          <div
            key={cat.key}
            onClick={() => !cat.disabled && onSelect(cat.key)}
            style={{
              background: cat.bg,
              borderRadius: 20,
              padding: '28px 24px',
              marginBottom: 16,
              cursor: cat.disabled ? 'default' : 'pointer',
              opacity: cat.disabled ? 0.5 : 1,
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.15s',
            }}
            onPointerDown={e => { if (!cat.disabled) e.currentTarget.style.transform = 'scale(0.97)' }}
            onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <div style={{
              position: 'absolute', top: -20, right: -10,
              fontSize: 90, opacity: 0.12,
              transform: 'rotate(15deg)',
            }}>
              {cat.emoji}
            </div>
            <div style={{ fontSize: 36, marginBottom: 8 }}>{cat.emoji}</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 4 }}>
              {cat.title}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
              {cat.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
