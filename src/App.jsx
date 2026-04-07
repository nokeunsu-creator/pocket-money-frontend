import { useState, useEffect, useCallback } from 'react'
import ProfileSelect from './components/ProfileSelect'
import MainHub from './components/MainHub'
import Home from './components/Home'
import AddEntry from './components/AddEntry'
import AddBankEntry from './components/AddBankEntry'
import EntryList from './components/EntryList'
import DeletedList from './components/DeletedList'
import TripList from './components/TripList'
import TripDetail from './components/TripDetail'
import TripEdit from './components/TripEdit'
import NumberBaseball from './components/NumberBaseball'
import GameHub from './components/GameHub'
import MemoryCard from './components/MemoryCard'
import MultiplyChallenge from './components/MultiplyChallenge'
import MathSpeedQuiz from './components/MathSpeedQuiz'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('hub')
  const [refreshKey, setRefreshKey] = useState(0)
  const [editEntry, setEditEntry] = useState(null)
  const [activeTab, setActiveTab] = useState('cash') // 'cash' | 'bank'
  const [tripId, setTripId] = useState(null)

  const refresh = () => setRefreshKey(k => k + 1)

  // 페이지 이동 시 히스토리에 push
  const navigate = useCallback((page, user, edit, tab, trip) => {
    const state = { page, user, edit: edit || null, tab: tab || null, tripId: trip || null }
    window.history.pushState(state, '', '')
    setCurrentPage(page)
    if (user !== undefined) setCurrentUser(user)
    if (edit !== undefined) setEditEntry(edit)
    if (trip !== undefined) setTripId(trip)
  }, [])

  // 브라우저 뒤로가기 처리
  useEffect(() => {
    window.history.replaceState({ page: 'profile', user: null, edit: null, tab: null, tripId: null }, '', '')

    const handlePopState = (e) => {
      const state = e.state
      if (!state || !state.user) {
        setCurrentUser(null)
        setCurrentPage('hub')
        setEditEntry(null)
        setTripId(null)
      } else {
        setCurrentUser(state.user)
        setCurrentPage(state.page || 'hub')
        setEditEntry(state.edit || null)
        if (state.tab) setActiveTab(state.tab)
        setTripId(state.tripId || null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const HUB_USERS = ['노건우', '노승우']

  // 프로필 선택
  const selectUser = (user, category) => {
    if (category === 'travel') {
      setCurrentUser('__common__')
      setCurrentPage('trips')
      window.history.pushState({ page: 'trips', user: '__common__', edit: null, tab: null, tripId: null }, '', '')
      return
    }
    if (category === 'game') {
      setCurrentUser('__common__')
      setCurrentPage('game')
      window.history.pushState({ page: 'game', user: '__common__', edit: null, tab: null, tripId: null }, '', '')
      return
    }
    setCurrentUser(user)
    setCurrentPage('home')
    window.history.pushState({ page: 'home', user, edit: null, tab: 'cash', tripId: null }, '', '')
  }

  if (!currentUser) {
    return <ProfileSelect onSelect={selectUser} />
  }

  const switchUser = () => {
    setCurrentUser(null)
    setCurrentPage('hub')
    setEditEntry(null)
    setTripId(null)
    window.history.pushState({ page: 'profile', user: null, edit: null, tab: null, tripId: null }, '', '')
  }

  const pushState = (page, extra = {}) => {
    const state = { page, user: currentUser, edit: null, tab: activeTab, tripId: null, ...extra }
    window.history.pushState(state, '', '')
  }

  const goToPage = (page) => {
    setCurrentPage(page)
    pushState(page)
  }

  const goToEdit = (entry) => {
    setEditEntry(entry)
    setCurrentPage('add')
    pushState('add', { edit: entry })
  }

  const goToBankEdit = (entry) => {
    setEditEntry(entry)
    setCurrentPage('addBank')
    pushState('addBank', { edit: entry })
  }

  const goBack = () => {
    window.history.back()
  }

  // ⊕ 버튼: 현재 탭에 따라 내돈/통장 기록으로 이동
  const goToAdd = () => {
    if (activeTab === 'bank') {
      goToPage('addBank')
    } else {
      goToPage('add')
    }
  }

  // 메인 허브 카테고리 선택
  const handleHubSelect = (category) => {
    if (category === 'money') {
      setCurrentPage('home')
      pushState('home')
    } else if (category === 'travel') {
      setCurrentPage('trips')
      pushState('trips')
    }
  }

  // 여행 관련
  const goToTripDetail = (id) => {
    setTripId(id)
    setCurrentPage('tripDetail')
    pushState('tripDetail', { tripId: id })
  }

  const goToTripEdit = (id) => {
    setTripId(id || null)
    setCurrentPage('tripEdit')
    pushState('tripEdit', { tripId: id || null })
  }

  // 용돈기입장 하단네비 표시 여부
  const moneyPages = ['home', 'list']
  const showMoneyNav = moneyPages.includes(currentPage)

  return (
    <div>
      {currentPage === 'hub' && (
        <MainHub
          user={currentUser}
          onSelect={handleHubSelect}
          onSwitchUser={switchUser}
        />
      )}
      {currentPage === 'home' && (
        <Home
          user={currentUser}
          refreshKey={refreshKey}
          onSwitchUser={HUB_USERS.includes(currentUser) ? () => goToPage('hub') : switchUser}
          onEdit={goToEdit}
          onBankEdit={goToBankEdit}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}
      {currentPage === 'add' && (
        <AddEntry
          user={currentUser}
          editEntry={editEntry}
          onDone={() => { refresh(); setEditEntry(null); goBack() }}
          onCancel={goBack}
        />
      )}
      {currentPage === 'addBank' && (
        <AddBankEntry
          user={currentUser}
          editEntry={editEntry}
          onDone={() => { refresh(); setEditEntry(null); goBack() }}
          onCancel={goBack}
        />
      )}
      {currentPage === 'list' && (
        <EntryList
          user={currentUser}
          refreshKey={refreshKey}
          onRefresh={refresh}
          onSwitchUser={HUB_USERS.includes(currentUser) ? () => goToPage('hub') : switchUser}
          onEdit={goToEdit}
          onBankEdit={goToBankEdit}
          onDeleted={() => goToPage('deleted')}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}
      {currentPage === 'deleted' && (
        <DeletedList
          user={currentUser}
          onBack={goBack}
        />
      )}
      {currentPage === 'trips' && (
        <TripList
          onBack={switchUser}
          onView={goToTripDetail}
          onAdd={() => goToTripEdit(null)}
        />
      )}
      {currentPage === 'tripDetail' && (
        <TripDetail
          tripId={tripId}
          onBack={() => goToPage('trips')}
          onEdit={goToTripEdit}
        />
      )}
      {currentPage === 'tripEdit' && (
        <TripEdit
          tripId={tripId}
          onDone={() => { goBack() }}
          onCancel={goBack}
        />
      )}
      {currentPage === 'game' && (
        <GameHub onBack={switchUser} onSelectGame={(g) => goToPage('game-' + g)} />
      )}
      {currentPage === 'game-baseball' && (
        <NumberBaseball onBack={() => goToPage('game')} />
      )}
      {currentPage === 'game-memory' && (
        <MemoryCard onBack={() => goToPage('game')} />
      )}
      {currentPage === 'game-multiply' && (
        <MultiplyChallenge onBack={() => goToPage('game')} />
      )}
      {currentPage === 'game-mathquiz' && (
        <MathSpeedQuiz onBack={() => goToPage('game')} />
      )}

      {/* 하단 네비게이션 (용돈기입장) */}
      {showMoneyNav && (
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
            onClick={goToAdd}
            style={{ color: activeTab === 'bank' ? '#2D6A4F' : 'var(--blue)' }}
          >
            <span className="nav-icon" style={{ fontSize: 30, lineHeight: '30px' }}>⊕</span>
            <span>{activeTab === 'bank' ? '통장기록' : '기록하기'}</span>
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
