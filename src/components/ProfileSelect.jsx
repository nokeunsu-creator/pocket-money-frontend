import { useState, useEffect, useRef } from 'react'
import { CHILD1, CHILD2 } from '../config/names'
import { getProfilePhotos, saveProfilePhoto } from '../api/api'

const PASSWORDS = {
  [CHILD1]: '15',
  [CHILD2]: '17',
}

const MENU_PASSWORDS = {
  'game': '54',
  'familyHub': '33',
}

const PHOTO_CHANGE_PASSWORD = '33'

export default function ProfileSelect({ onSelect }) {
  const defaultPhotos = { [CHILD1]: '/profiles/nogunwoo.jpg', [CHILD2]: '/profiles/noseungwoo.jpg' }
  const [photos, setPhotos] = useState({})
  const getPhoto = (name) => photos[name] || defaultPhotos[name] || ''

  useEffect(() => {
    getProfilePhotos()
      .then(list => {
        const map = {}
        for (const p of list) if (p.photoData) map[p.userName] = p.photoData
        setPhotos(map)
      })
      .catch(() => {})
  }, [])

  const handlePhotoChange = (name, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const data = reader.result
      setPhotos(prev => ({ ...prev, [name]: data }))
      try { await saveProfilePhoto(name, data) } catch (err) { console.error(err) }
    }
    reader.readAsDataURL(file)
  }

  const profiles = [
    { name: CHILD1, color: '#4895EF' },
    { name: CHILD2, color: '#EF476F' },
  ]

  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedMenu, setSelectedMenu] = useState(null)
  const [photoChangeUser, setPhotoChangeUser] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const fileInputRefs = useRef({})

  const handlePhotoChangeClick = (name) => {
    setSelectedUser(null)
    setSelectedMenu(null)
    setPhotoChangeUser(name)
    setPassword('')
    setError(false)
    setShowModal(true)
  }

  const handleClick = (name) => {
    if (PASSWORDS[name]) {
      setSelectedUser(name)
      setSelectedMenu(null)
      setPhotoChangeUser(null)
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
      setPhotoChangeUser(null)
      setPassword('')
      setError(false)
      setShowModal(true)
    } else {
      onSelect(null, category)
    }
  }

  const handleSubmit = () => {
    if (photoChangeUser) {
      if (password === PHOTO_CHANGE_PASSWORD) {
        const target = photoChangeUser
        setShowModal(false)
        setPhotoChangeUser(null)
        fileInputRefs.current[target]?.click()
      } else {
        setError(true)
        setPassword('')
      }
    } else if (selectedMenu) {
      if (password === MENU_PASSWORDS[selectedMenu]) {
        setShowModal(false)
        onSelect(null, selectedMenu)
      } else {
        setError(true)
        setPassword('')
      }
    } else if (selectedUser) {
      if (password === PASSWORDS[selectedUser]) {
        setShowModal(false)
        onSelect(selectedUser, 'money')
      } else {
        setError(true)
        setPassword('')
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="profile-page fade-in" style={{ paddingTop: 16 }}>
      <div style={{ fontSize: 40, marginBottom: 8, animation: 'float 3s ease-in-out infinite' }}>
        🎁
      </div>
      <h1 className="profile-title" style={{ marginBottom: 8 }}>우리집 보물상자</h1>
      <div className="profile-cards">
        {profiles.map((p, i) => (
          <div key={p.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button
              className="profile-card"
              onClick={() => handleClick(p.name)}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <img
                src={getPhoto(p.name)}
                alt={p.name}
                style={{
                  width: 80, height: 80, borderRadius: '50%',
                  objectFit: 'cover', border: `3px solid ${p.color}`,
                  animation: 'float 3s ease-in-out infinite',
                  animationDelay: `${i * 0.5}s`,
                }}
              />
              <div className="name">{p.name}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: -2 }}>용돈기입장</div>
            </button>
            <button
              type="button"
              onClick={() => handlePhotoChangeClick(p.name)}
              style={{
                fontSize: 11, color: '#AAA', cursor: 'pointer', padding: '2px 8px',
                borderRadius: 8, background: '#F0F0F0', border: 'none',
              }}
            >
              📷 사진변경
            </button>
            <input
              type="file"
              accept="image/*"
              hidden
              ref={(el) => { fileInputRefs.current[p.name] = el }}
              onChange={(e) => handlePhotoChange(p.name, e)}
            />
          </div>
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
          onClick={() => handleMenuClick('familyHub')}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '16px 0', borderRadius: 16,
            background: 'linear-gradient(135deg, #E07A5F, #F2A07B)',
            color: '#FFF', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            transition: 'transform 0.1s',
          }}
          onPointerDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onPointerUp={e => e.currentTarget.style.transform = ''}
          onPointerLeave={e => e.currentTarget.style.transform = ''}
        >
          <span style={{ fontSize: 28 }}>👨‍👩‍👦‍👦</span>
          <span>우리 가족</span>
        </button>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh', zIndex: 200,
        }}
          onClick={() => { setShowModal(false); setPhotoChangeUser(null) }}
        >
          <div
            className="card pop-in"
            style={{ padding: 24, width: 280, textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
            <h3 style={{ fontSize: 16, color: 'var(--brown)', marginBottom: 16 }}>
              {photoChangeUser
                ? photoChangeUser + ' 사진 변경 비밀번호를 입력하세요'
                : selectedMenu
                ? ({ game: '게임', familyHub: '우리 가족' }[selectedMenu] || '') + ' 비밀번호를 입력하세요'
                : selectedUser + '의 비밀번호를 입력하세요'}
            </h3>
            <input
              type="password"
              inputMode="numeric"
              maxLength={
                selectedMenu ? MENU_PASSWORDS[selectedMenu].length
                : photoChangeUser ? PHOTO_CHANGE_PASSWORD.length
                : selectedUser ? PASSWORDS[selectedUser].length
                : 2
              }
              value={password}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '')
                setPassword(val)
                setError(false)
                const maxLen =
                  selectedMenu ? MENU_PASSWORDS[selectedMenu].length
                  : photoChangeUser ? PHOTO_CHANGE_PASSWORD.length
                  : selectedUser ? PASSWORDS[selectedUser].length
                  : 2
                if (val.length === maxLen) {
                  setTimeout(() => {
                    // Auto submit
                    if (photoChangeUser) {
                      if (val === PHOTO_CHANGE_PASSWORD) {
                        const target = photoChangeUser
                        setShowModal(false)
                        setPhotoChangeUser(null)
                        fileInputRefs.current[target]?.click()
                      } else {
                        setError(true)
                        setPassword('')
                      }
                    } else if (selectedMenu) {
                      if (val === MENU_PASSWORDS[selectedMenu]) {
                        setShowModal(false)
                        onSelect(null, selectedMenu)
                      } else {
                        setError(true)
                        setPassword('')
                      }
                    } else if (selectedUser) {
                      if (val === PASSWORDS[selectedUser]) {
                        setShowModal(false)
                        onSelect(selectedUser, 'money')
                      } else {
                        setError(true)
                        setPassword('')
                      }
                    }
                  }, 100)
                }
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              placeholder={
                selectedMenu ? `비밀번호 ${MENU_PASSWORDS[selectedMenu].length}자리`
                : photoChangeUser ? `비밀번호 ${PHOTO_CHANGE_PASSWORD.length}자리`
                : selectedUser ? `비밀번호 ${PASSWORDS[selectedUser].length}자리`
                : '비밀번호'
              }
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
                onClick={() => { setShowModal(false); setPhotoChangeUser(null) }}
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
