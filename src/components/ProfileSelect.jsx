import { useState } from 'react'

const PASSWORDS = {
  '노건우': '150324',
  '노승우': '170410',
}

export default function ProfileSelect({ onSelect }) {
  const profiles = [
    { name: '김대성', photo: '/profiles/kimdaesung.jpg', color: '#06D6A0' },
    { name: '노건우', photo: '/profiles/nogunwoo.jpg', color: '#4895EF' },
    { name: '노승우', photo: '/profiles/noseungwoo.jpg', color: '#EF476F' },
  ]

  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleClick = (name) => {
    if (PASSWORDS[name]) {
      setSelectedUser(name)
      setPassword('')
      setError(false)
      setShowModal(true)
    } else {
      onSelect(name)
    }
  }

  const handleSubmit = () => {
    if (password === PASSWORDS[selectedUser]) {
      setShowModal(false)
      onSelect(selectedUser)
    } else {
      setError(true)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

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
            onClick={() => handleClick(p.name)}
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

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="card pop-in"
            style={{ padding: 24, width: 280, textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
            <h3 style={{ fontSize: 16, color: 'var(--brown)', marginBottom: 16 }}>
              {selectedUser}의 비밀번호를 입력하세요
            </h3>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={password}
              onChange={(e) => { setPassword(e.target.value.replace(/[^0-9]/g, '')); setError(false) }}
              onKeyDown={handleKeyDown}
              autoFocus
              placeholder="비밀번호 6자리"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: `2px solid ${error ? '#EF476F' : '#EEE'}`,
                fontSize: 18, textAlign: 'center', letterSpacing: 8,
              }}
            />
            {error && (
              <p style={{ color: '#EF476F', fontSize: 13, marginTop: 8 }}>
                비밀번호가 틀렸어요!
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  background: 'var(--light-gray)', fontSize: 14, color: 'var(--gray)',
                }}
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  background: 'var(--blue)', fontSize: 14, color: '#FFF',
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
