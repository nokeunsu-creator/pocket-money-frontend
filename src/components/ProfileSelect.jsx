import { useState } from 'react'

const PASSWORDS = {
  '노건우': '150324',
  '노승우': '170410',
}

const MENU_PASSWORDS = {
  'budget': '1219',
  'game': '5431',
}

export default function ProfileSelect({ onSelect }) {
  const profiles = [
    { name: '노건우', photo: '/profiles/nogunwoo.jpg', color: '#4895EF' },
    { name: '노승우', photo: '/profiles/noseungwoo.jpg', color: '#EF476F' },
  ]

  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedMenu, setSelectedMenu] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleClick = (name) => {
    if (PASSWORDS[name]) {
      setSelectedUser(name)
      setSelectedMenu(null)
      setPassword('')
      setError(false)
      setShowModal(true)
    } else {
      onSelect(name, 'money')
    }
  }

  const handleMenuClick = (category) => {
    if (MENU_PASSWORDS[category]) {
      setSelectedUser(null)
      setSelectedMenu(category)
      setPassword('')
      setError(false)
      setShowModal(true)
    } else {
      onSelect(null, category)
    }
  }

  const handleSubmit = () => {
    if (selectedMenu) {
      if (password === MENU_PASSWORDS[selectedMenu]) {
        setShowModal(false)
        onSelect(null, selectedMenu)
      } else {
        setError(true)
      }
    } else if (selectedUser) {
      if (password === PASSWORDS[selectedUser]) {
        setShowModal(false)
        onSelect(selectedUser, 'money')
      } else {
        setError(true)
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="profile-page fade-in">
      <div style={{ fontSize: 64, marginBottom: 16, animation: 'float 3s ease-in-out infinite' }}>
        🎁
      </div>
      <h1 className="profile-title">우리집 보물상자</h1>
      <p className="profile-subtitle">누구의 보물상자를 열까요?</p>
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

      {/* 공통 메뉴 */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24, padding: '0 20px', maxWidth: 320, width: '100%' }}>
        <button
          onClick={() => onSelect(null, 'travel')}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '16px 0', borderRadius: 16,
            background: '#FFF',
            color: '#333', border: '3px solid #2D6A4F', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            transition: 'transform 0.1s',
          }}
          onPointerDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onPointerUp={e => e.currentTarget.style.transform = ''}
          onPointerLeave={e => e.currentTarget.style.transform = ''}
        >
          <img src="/sportage.png" alt="스포티지" style={{ width: 60, height: 'auto', objectFit: 'contain' }} />
          <span>여행</span>
        </button>
        <button
          onClick={() => handleMenuClick('game')}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '16px 0', borderRadius: 16,
            background: 'linear-gradient(135deg, #1565C0, #1976D2)',
            color: '#FFF', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            transition: 'transform 0.1s',
          }}
          onPointerDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onPointerUp={e => e.currentTarget.style.transform = ''}
          onPointerLeave={e => e.currentTarget.style.transform = ''}
        >
          <span style={{ fontSize: 28 }}>🎮</span>
          <span>게임</span>
        </button>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12, padding: '0 20px', maxWidth: 320, width: '100%' }}>
        <button
          onClick={() => onSelect(null, 'todo')}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '16px 0', borderRadius: 16,
            background: 'linear-gradient(135deg, #06D6A0, #05B384)',
            color: '#FFF', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            transition: 'transform 0.1s',
          }}
          onPointerDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onPointerUp={e => e.currentTarget.style.transform = ''}
          onPointerLeave={e => e.currentTarget.style.transform = ''}
        >
          <span style={{ fontSize: 28 }}>✅</span>
          <span>할 일</span>
        </button>
        <button
          onClick={() => onSelect(null, 'timer')}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '16px 0', borderRadius: 16,
            background: 'linear-gradient(135deg, #E74C3C, #C0392B)',
            color: '#FFF', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            transition: 'transform 0.1s',
          }}
          onPointerDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onPointerUp={e => e.currentTarget.style.transform = ''}
          onPointerLeave={e => e.currentTarget.style.transform = ''}
        >
          <span style={{ fontSize: 28 }}>⏱</span>
          <span>공부 타이머</span>
        </button>
        <button
          onClick={() => onSelect(null, 'memo')}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '16px 0', borderRadius: 16,
            background: 'linear-gradient(135deg, #F39C12, #E67E22)',
            color: '#FFF', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            transition: 'transform 0.1s',
          }}
          onPointerDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onPointerUp={e => e.currentTarget.style.transform = ''}
          onPointerLeave={e => e.currentTarget.style.transform = ''}
        >
          <span style={{ fontSize: 28 }}>📝</span>
          <span>메모</span>
        </button>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12, padding: '0 20px', maxWidth: 320, width: '100%' }}>
        <button
          onClick={() => handleMenuClick('budget')}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '16px 0', borderRadius: 16,
            background: 'linear-gradient(135deg, #2C3E50, #3498DB)',
            color: '#FFF', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            transition: 'transform 0.1s',
          }}
          onPointerDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onPointerUp={e => e.currentTarget.style.transform = ''}
          onPointerLeave={e => e.currentTarget.style.transform = ''}
        >
          <span style={{ fontSize: 28 }}>💰</span>
          <span>가계부</span>
        </button>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh', zIndex: 200,
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
              {selectedMenu
                ? (selectedMenu === 'budget' ? '가계부' : '게임') + ' 비밀번호를 입력하세요'
                : selectedUser + '의 비밀번호를 입력하세요'}
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
