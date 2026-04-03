export default function ProfileSelect({ onSelect }) {
  const profiles = [
    { name: '김대성', photo: '/profiles/kimdaesung.jpg', color: '#06D6A0' },
    { name: '노건우', photo: '/profiles/nogunwoo.jpg', color: '#4895EF' },
    { name: '노승우', photo: '/profiles/noseungwoo.jpg', color: '#EF476F' },
  ]

  return (
    <div className="profile-page fade-in">
      <div style={{ fontSize: 64, marginBottom: 16, animation: 'float 3s ease-in-out infinite' }}>
        🐷
      </div>
      <h1 className="profile-title">용돈기입장</h1>
      <p className="profile-subtitle">누구의 용돈기입장을 열까요?</p>
      <div className="profile-cards">
        {profiles.map((p, i) => (
          <button
            key={p.name}
            className="profile-card"
            onClick={() => onSelect(p.name)}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <img
              src={p.photo}
              alt={p.name}
              style={{
                width: 80, height: 80, borderRadius: '50%',
                objectFit: 'cover', border: `3px solid ${p.color}`,
                animation: 'float 3s ease-in-out infinite',
                animationDelay: `${i * 0.5}s`,
              }}
            />
            <div className="name">{p.name}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
