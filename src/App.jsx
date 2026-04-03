import { useState } from 'react'
import ProfileSelect from './components/ProfileSelect'
import Home from './components/Home'
import AddEntry from './components/AddEntry'
import EntryList from './components/EntryList'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('home')
  const [refreshKey, setRefreshKey] = useState(0)
  const [editEntry, setEditEntry] = useState(null)

  const refresh = () => setRefreshKey(k => k + 1)

  // 프로필 미선택 시
  if (!currentUser) {
    return <ProfileSelect onSelect={setCurrentUser} />
  }

  const switchUser = () => {
    setCurrentUser(null)
    setCurrentPage('home')
  }

  return (
    <div>
      {/* 페이지 렌더링 */}
      {currentPage === 'home' && (
        <Home
          user={currentUser}
          refreshKey={refreshKey}
          onNavigate={setCurrentPage}
          onSwitchUser={switchUser}
          onEdit={(entry) => { setEditEntry(entry); setCurrentPage('add'); }}
        />
      )}
      {currentPage === 'add' && (
        <AddEntry
          user={currentUser}
          editEntry={editEntry}
          onDone={() => { refresh(); setEditEntry(null); setCurrentPage('home'); }}
          onCancel={() => { setEditEntry(null); setCurrentPage('home'); }}
        />
      )}
      {currentPage === 'list' && (
        <EntryList
          user={currentUser}
          refreshKey={refreshKey}
          onRefresh={refresh}
          onNavigate={setCurrentPage}
          onSwitchUser={switchUser}
          onEdit={(entry) => { setEditEntry(entry); setCurrentPage('add'); }}
        />
      )}

      {/* 하단 네비게이션 (add 페이지에서는 숨김) */}
      {currentPage !== 'add' && (
        <nav className="bottom-nav">
          <button
            className={`nav-item ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => {
              if (currentPage === 'home') {
                refresh()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              } else {
                setCurrentPage('home')
              }
            }}
          >
            <span className="nav-icon">🏠</span>
            <span>홈</span>
          </button>
          <button
            className="nav-item"
            onClick={() => setCurrentPage('add')}
            style={{ color: 'var(--blue)' }}
          >
            <span className="nav-icon" style={{ fontSize: 30, lineHeight: '30px' }}>⊕</span>
            <span>기록하기</span>
          </button>
          <button
            className={`nav-item ${currentPage === 'list' ? 'active' : ''}`}
            onClick={() => setCurrentPage('list')}
          >
            <span className="nav-icon">📋</span>
            <span>기록목록</span>
          </button>
        </nav>
      )}
    </div>
  )
}
