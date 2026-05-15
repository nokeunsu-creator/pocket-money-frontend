import { useState, useEffect, useCallback } from 'react'
import { HUB_USERS } from './config/names'
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
import OneCard from './components/OneCard'
import Hula from './components/Hula'
import Chess from './components/Chess'
import Janggi from './components/Janggi'
import Omok from './components/Omok'
import Baduk from './components/Baduk'
import BadukAI from './components/BadukAI'
import BadukClassroom from './components/BadukClassroom'
import EnglishHub from './components/EnglishHub'
import MathHub from './components/MathHub'
import ArithmeticSprint from './components/ArithmeticSprint'
import FractionMaster from './components/FractionMaster'
import ShapeQuiz from './components/ShapeQuiz'
import UnitConvert from './components/UnitConvert'
import ClockReading from './components/ClockReading'
import MathChampionship from './components/MathChampionship'
import AchievementList, { AchievementToast } from './components/AchievementList'
import QuizLeaderboard from './components/QuizLeaderboard'
import WhackAMole from './components/WhackAMole'
import TwentyFour from './components/TwentyFour'
import Sudoku from './components/Sudoku'
import WordChain from './components/WordChain'
import CollaborativeDrawing from './components/CollaborativeDrawing'
import WordMatching from './components/WordMatching'
import NumberMemory from './components/NumberMemory'
import dinosaurQuiz from './data/dinosaurQuiz'
import spaceQuiz from './data/spaceQuiz'
import { onAchievementUnlock } from './utils/achievements'
import TodoList from './components/TodoList'
import StudyTimer from './components/StudyTimer'
import QuickMemo from './components/QuickMemo'
import StudyMain from './components/StudyMain'
import FamilyHub from './components/FamilyHub'
import BudgetMain from './components/BudgetMain'
import ScienceQuiz from './components/ScienceQuiz'
import HistoryQuiz from './components/HistoryQuiz'
import NonsenseQuiz from './components/NonsenseQuiz'
import GradeQuiz from './components/GradeQuiz'
import badukQuiz from './data/badukQuiz'
import proverbQuiz from './data/proverbQuiz'
import spellingQuiz from './data/spellingQuiz'
import flagQuiz from './data/flagQuiz'
import continentQuiz from './data/continentQuiz'
import hanjaQuiz from './data/hanjaQuiz'
import logicQuiz from './data/logicQuiz'
import safetyQuiz from './data/safetyQuiz'
import WordSprint from './components/WordSprint'
import SpellingTower from './components/SpellingTower'
import SentenceRush from './components/SentenceRush'
import WordBattle from './components/WordBattle'
import EnglishChampionship from './components/EnglishChampionship'
import FamilyTree from './components/FamilyTree'
import GrowthTracker from './components/GrowthTracker'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('hub')
  const [refreshKey, setRefreshKey] = useState(0)
  const [editEntry, setEditEntry] = useState(null)
  const [activeTab, setActiveTab] = useState('cash') // 'cash' | 'bank'
  const [tripId, setTripId] = useState(null)
  const [achievementQueue, setAchievementQueue] = useState([])

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

  // 업적 해금 시 토스트 큐에 추가
  useEffect(() => {
    return onAchievementUnlock(ach => {
      setAchievementQueue(q => [...q, ach])
    })
  }, [])

  // HUB_USERS는 config/names에서 import

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
    if (category === 'todo') {
      setCurrentUser('__common__')
      setCurrentPage('todo')
      window.history.pushState({ page: 'todo', user: '__common__', edit: null, tab: null, tripId: null }, '', '')
      return
    }
    if (category === 'timer') {
      setCurrentUser('__common__')
      setCurrentPage('timer')
      window.history.pushState({ page: 'timer', user: '__common__', edit: null, tab: null, tripId: null }, '', '')
      return
    }
    if (category === 'budget') {
      setCurrentUser('__common__')
      setCurrentPage('budget')
      window.history.pushState({ page: 'budget', user: '__common__', edit: null, tab: null, tripId: null }, '', '')
      return
    }
    if (category === 'memo') {
      setCurrentUser('__common__')
      setCurrentPage('memo')
      window.history.pushState({ page: 'memo', user: '__common__', edit: null, tab: null, tripId: null }, '', '')
      return
    }
    if (category === 'family') {
      setCurrentUser('__common__')
      setCurrentPage('family')
      window.history.pushState({ page: 'family', user: '__common__', edit: null, tab: null, tripId: null }, '', '')
      return
    }
    if (category === 'familyHub') {
      setCurrentUser('__common__')
      setCurrentPage('familyHub')
      window.history.pushState({ page: 'familyHub', user: '__common__', edit: null, tab: null, tripId: null }, '', '')
      return
    }
    if (category === 'study') {
      setCurrentUser('__common__')
      setCurrentPage('study')
      window.history.pushState({ page: 'study', user: '__common__', edit: null, tab: null, tripId: null }, '', '')
      return
    }
    if (category === 'growth') {
      setCurrentUser('__common__')
      setCurrentPage('growth')
      window.history.pushState({ page: 'growth', user: '__common__', edit: null, tab: null, tripId: null }, '', '')
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
    } else if (category === 'family') {
      setCurrentPage('family')
      pushState('family')
    } else if (category === 'growth') {
      setCurrentPage('growth')
      pushState('growth')
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
      {currentPage === 'familyHub' && (
        <FamilyHub
          onBack={goBack}
          onSelect={(key) => {
            const pageMap = { familyTree: 'family', todo: 'todo', timer: 'timer', study: 'study', memo: 'memo', growth: 'growth' }
            const nextPage = pageMap[key]
            if (nextPage) {
              setCurrentPage(nextPage)
              window.history.pushState({ page: nextPage, user: '__common__', edit: null, tab: null, tripId: null }, '', '')
            }
          }}
        />
      )}
      {currentPage === 'family' && (
        <FamilyTree onBack={goBack} />
      )}
      {currentPage === 'growth' && (
        <GrowthTracker onBack={goBack} />
      )}
      {currentPage === 'study' && (
        <StudyMain onBack={goBack} />
      )}
      {currentPage === 'trips' && (
        <TripList
          onBack={goBack}
          onView={goToTripDetail}
          onAdd={() => goToTripEdit(null)}
        />
      )}
      {currentPage === 'tripDetail' && (
        <TripDetail
          tripId={tripId}
          onBack={goBack}
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
        <GameHub onBack={goBack} onSelectGame={(g) => goToPage('game-' + g)} />
      )}
      {currentPage === 'game-baseball' && (
        <NumberBaseball onBack={goBack} />
      )}
      {currentPage === 'game-memory' && (
        <MemoryCard onBack={goBack} />
      )}
      {currentPage === 'game-multiply' && (
        <MultiplyChallenge onBack={goBack} />
      )}
      {currentPage === 'game-mathquiz' && (
        <MathSpeedQuiz onBack={goBack} />
      )}
      {currentPage === 'game-onecard' && (
        <OneCard onBack={goBack} />
      )}
      {currentPage === 'game-hula' && (
        <Hula onBack={goBack} />
      )}
      {currentPage === 'game-chess' && (
        <Chess onBack={goBack} />
      )}
      {currentPage === 'game-janggi' && (
        <Janggi onBack={goBack} />
      )}
      {currentPage === 'game-omok' && (
        <Omok onBack={goBack} />
      )}
      {currentPage === 'game-baduk' && (
        <Baduk onBack={goBack} />
      )}
      {currentPage === 'game-baduk-ai' && (
        <BadukAI onBack={goBack} />
      )}
      {currentPage === 'game-baduk-classroom' && (
        <BadukClassroom onBack={goBack} />
      )}
      {currentPage === 'game-english' && (
        <EnglishHub onBack={goBack} onSelectGame={(g) => goToPage('game-eng-' + g)} />
      )}
      {currentPage === 'game-eng-wordSprint' && (
        <WordSprint onBack={goBack} />
      )}
      {currentPage === 'game-eng-spellingTower' && (
        <SpellingTower onBack={goBack} />
      )}
      {currentPage === 'game-eng-sentenceRush' && (
        <SentenceRush onBack={goBack} />
      )}
      {currentPage === 'game-eng-wordBattle' && (
        <WordBattle onBack={goBack} />
      )}
      {currentPage === 'game-eng-championship' && (
        <EnglishChampionship onBack={goBack} />
      )}
      {currentPage === 'game-math' && (
        <MathHub onBack={goBack} onSelectGame={(g) => goToPage('game-math-' + g)} />
      )}
      {currentPage === 'game-math-arithmeticSprint' && (
        <ArithmeticSprint onBack={goBack} />
      )}
      {currentPage === 'game-math-fractionMaster' && (
        <FractionMaster onBack={goBack} />
      )}
      {currentPage === 'game-math-shapeQuiz' && (
        <ShapeQuiz onBack={goBack} />
      )}
      {currentPage === 'game-math-unitConvert' && (
        <UnitConvert onBack={goBack} />
      )}
      {currentPage === 'game-math-clockReading' && (
        <ClockReading onBack={goBack} />
      )}
      {currentPage === 'game-math-championship' && (
        <MathChampionship onBack={goBack} />
      )}
      {currentPage === 'game-achievements' && (
        <AchievementList onBack={goBack} />
      )}
      {currentPage === 'game-leaderboard' && (
        <QuizLeaderboard onBack={goBack} />
      )}
      {currentPage === 'game-whackmole' && (
        <WhackAMole onBack={goBack} />
      )}
      {currentPage === 'game-24' && (
        <TwentyFour onBack={goBack} />
      )}
      {currentPage === 'game-sudoku' && (
        <Sudoku onBack={goBack} />
      )}
      {currentPage === 'game-wordchain' && (
        <WordChain onBack={goBack} />
      )}
      {currentPage === 'game-draw' && (
        <CollaborativeDrawing onBack={goBack} />
      )}
      {currentPage === 'game-wordmatch' && (
        <WordMatching onBack={goBack} />
      )}
      {currentPage === 'game-nummem' && (
        <NumberMemory onBack={goBack} />
      )}
      {currentPage === 'game-dinosaur' && (
        <GradeQuiz quizId="dinosaur" title="공룡 퀴즈" icon="🦖" color="#8B5A2B" grades={dinosaurQuiz} onBack={goBack} />
      )}
      {currentPage === 'game-space' && (
        <GradeQuiz quizId="space" title="우주 퀴즈" icon="🌌" color="#6A1B9A" grades={spaceQuiz} onBack={goBack} />
      )}
      {currentPage === 'todo' && (
        <TodoList onBack={goBack} />
      )}
      {currentPage === 'timer' && (
        <StudyTimer onBack={goBack} />
      )}
      {currentPage === 'memo' && (
        <QuickMemo onBack={goBack} />
      )}
      {currentPage === 'budget' && (
        <BudgetMain onBack={goBack} />
      )}
      {currentPage === 'game-science' && (
        <ScienceQuiz onBack={goBack} />
      )}
      {currentPage === 'game-history' && (
        <HistoryQuiz onBack={goBack} />
      )}
      {currentPage === 'game-nonsense' && (
        <NonsenseQuiz onBack={goBack} />
      )}
      {currentPage === 'game-baduk-quiz' && (
        <GradeQuiz
          quizId="baduk"
          title="바둑 퀴즈"
          icon="❓"
          color="#1a1a1a"
          grades={badukQuiz}
          gradeLabels={{ 1: '입문', 2: '기초', 3: '중급', 4: '고급' }}
          gradeCaption="난이도를 선택하세요"
          onBack={goBack}
        />
      )}
      {currentPage === 'game-proverb' && (
        <GradeQuiz quizId="proverb" title="사자성어/속담" icon="📜" color="#8B4513" grades={proverbQuiz} onBack={goBack} />
      )}
      {currentPage === 'game-spelling' && (
        <GradeQuiz quizId="spelling" title="맞춤법" icon="✏️" color="#2C3E50" grades={spellingQuiz} onBack={goBack} />
      )}
      {currentPage === 'game-flag' && (
        <GradeQuiz quizId="flag" title="세계 국기/수도" icon="🌍" color="#27AE60" grades={flagQuiz} onBack={goBack} />
      )}
      {currentPage === 'game-continent' && (
        <GradeQuiz quizId="continent" title="지도 나라 찾기" icon="🗺️" color="#16A085" grades={continentQuiz} onBack={goBack} />
      )}
      {currentPage === 'game-hanja' && (
        <GradeQuiz quizId="hanja" title="한자" icon="漢" color="#C0392B" grades={hanjaQuiz} onBack={goBack} />
      )}
      {currentPage === 'game-logic' && (
        <GradeQuiz quizId="logic" title="코딩/논리" icon="🧩" color="#8E44AD" grades={logicQuiz} onBack={goBack} />
      )}
      {currentPage === 'game-safety' && (
        <GradeQuiz quizId="safety" title="안전/생활상식" icon="🛡️" color="#E67E22" grades={safetyQuiz} onBack={goBack} />
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

      {/* 업적 해금 토스트 (큐의 첫 번째) */}
      {achievementQueue[0] && (
        <AchievementToast
          key={achievementQueue[0].id + '-' + achievementQueue.length}
          achievement={achievementQueue[0]}
          onDone={() => setAchievementQueue(q => q.slice(1))}
        />
      )}
    </div>
  )
}
