import { useState, useEffect, useCallback } from 'react'
import ProfileSelect from './components/ProfileSelect'
import Home from './components/Home'
import AddEntry from './components/AddEntry'
import AddBankEntry from './components/AddBankEntry'
import EntryList from './components/EntryList'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('home')
  const [refreshKey, setRefreshKey] = useState(0)
  const [editEntry, setEditEntry] = useState(null)

  const refresh = () => setRefreshKey(k => k + 1)

  // 페이지 이동 시 히스토리에 push
  const navigate = useCallback((page, user, edit) => {
    const state = { page, user, edit: edit || null }
    window.history.pushState(state, '', '')
    setCurrentPage(page)
    if (user !== undefined) setCurrentUser(user)
    if (edit !== undefined) setEditEntry(edit)
  }, [])

  // 브라우저 뒤로가기 처리
  useEffect(() => {
    // 초기 상태 저장
    window.history.replaceState({ page: 'profile', user: null, edit: null }, '', '')

    const handlePopState = (e) => {
      const state = e.state
      if (!state || !state.user) {
        // 프로필 선택 화면으로
        setCurrentUser(null)
        setCurrentPage('home')
        setEditEntry(null)
      } else {
        setCurrentUser(state.user)
        setCurrentPage(state.page || 'home')
        setEditEntry(state.edit || null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // 프로필 선택
  const selectUser = (user) => {
    setCurrentUser(user)
    setCurrentPage('home')
    window.history.pushState({ page: 'home', user, edit: null }, '', '')
  }

  // 프로필 미선택 시
  if (!currentUser) {
    return <ProfileSelect onSelect={selectUser} />
  }

  const switchUser = () => {
    setCurrentUser(null)
    setCurrentPage('home')
    setEditEntry(null)
    window.history.pushState({ page: 'profile', user: null, edit: null }, '', '')
  }

  const goToPage = (page) => {
    navigate(page, currentUser)
  }

  const goToEdit = (entry) => {
    setEditEntry(entry)
    setCurrentPage('add')
    window.history.pushState({ page: 'add', user: currentUser, edit: entry }, '', '')
  }

  const goToBankEdit = (entry) => {
    setEditEntry(entry)
    setCurrentPage('addBank')
    window.history.pushState({ page: 'addBank', user: currentUser, edit: entry }, '', '')
  }

  const goBack = () => {
    window.history.back()
  }

  return (
    <div>
      {/* 페이지 렌더링 */}
      {currentPage === 'home' && (
        <Home
          user={currentUser}
          refreshKey={refreshKey}
          onNavigate={goToPage}
          onSwitchUser={switchUser}
          onEdit={goToEdit}
          onBankEdit={goToBankEdit}
        />
      )}
      {currentPage === 'add' && (
        <AddEntry
          user={currentUser}
          editEntry={editEntry}
          onDone={() => { refresh(); setEditEntry(null); goBack(); }}
          onCancel={goBack}
        />
      )}
      {currentPage === 'addBank' && (
        <AddBankEntry
          user={currentUser}
          editEntry={editEntry}
          onDone={() => { refresh(); setEditEntry(null); goBack(); }}
          onCancel={goBack}
        />
      )}
      {currentPage === 'list' && (
        <EntryList
          user={currentUser}
          refreshKey={refreshKey}
          onRefresh={refresh}
          onNavigate={goToPage}
          onSwitchUser={switchUser}
          onEdit={goToEdit}
          onBankEdit={goToBankEdit}
        />
      )}

      {/* 하단 네비게이션 (add 페이지에서는 숨김) */}
      {currentPage !== 'add' && currentPage !== 'addBank' && (
        <nav className="bottom-nav">
          <button
            className={`nav-item ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => {
              if (currentPage === 'home') {
                refresh()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              } else {
                goToPage('home')
              }
            }}
          >
            <span className="nav-icon">🏠</span>
            <span>홈</span>
          </button>
          <button
            className="nav-item"
            onClick={() => goToPage('add')}
            style={{ color: 'var(--blue)' }}
          >
            <span className="nav-icon" style={{ fontSize: 30, lineHeight: '30px' }}>⊕</span>
            <span>기록하기</span>
          </button>
          <button
            className="nav-item"
            onClick={() => goToPage('addBank')}
            style={{ color: '#2D6A4F' }}
          >
            <span className="nav-icon" style={{ fontSize: 26, lineHeight: '30px' }}>🏦</span>
            <span>통장기록</span>
          </button>
          <button
            className={`nav-item ${currentPage === 'list' ? 'active' : ''}`}
            onClick={() => goToPage('list')}
          >
            <span className="nav-icon">📋</span>
            <span>기록목록</span>
          </button>
        </nav>
      )}
    </div>
  )
}
