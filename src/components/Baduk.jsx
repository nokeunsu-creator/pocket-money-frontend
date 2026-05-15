import { useState, useCallback, useEffect, useRef } from 'react'
import { useGameRoom } from '../utils/useGameRoom'
import { useViewportWidth } from '../utils/useViewportWidth'
import { unlock } from '../utils/achievements'
import {
  getRank,
  rankToStrategy,
  getHandicapStones,
  getKomi,
  getRankColor,
  getRankDescription,
  getAiDelay,
  getKyuRanks,
  getDanRanks,
} from '../utils/badukRank'
import {
  createBoard,
  getGroup,
  removeDeadStones,
  boardToString,
  countTerritory,
  STAR_POINTS,
  getAiMove,
} from '../utils/badukEngine'

function applyHandicap(board, stones) {
  const newBoard = board.map(row => [...row])
  stones.forEach(([r, c]) => { newBoard[r][c] = 'black' })
  return newBoard
}

// 등급별 진행도. 급 트랙(30급→1급)과 단 트랙(1단→9단)은 분리.
// 30~20급(strength 0~10)은 입문 단계라 무조건 활성. dan=29: 1단(strength 30)만 활성.
const BADUK_PROGRESS_KEY = 'baduk-progress'
const KYU_ALWAYS_UNLOCKED = 10 // strength 10 = 20급. 0~10은 기본 활성.
const DEFAULT_PROGRESS = { kyu: KYU_ALWAYS_UNLOCKED, dan: 29 }
function getProgress() {
  try {
    const raw = localStorage.getItem(BADUK_PROGRESS_KEY)
    if (!raw) return { ...DEFAULT_PROGRESS }
    const p = JSON.parse(raw)
    return {
      // 기존 사용자도 30~20급은 자동 활성 — kyu 최솟값을 KYU_ALWAYS_UNLOCKED로 보정
      kyu: Math.max(
        typeof p.kyu === 'number' ? p.kyu : DEFAULT_PROGRESS.kyu,
        KYU_ALWAYS_UNLOCKED,
      ),
      dan: typeof p.dan === 'number' ? p.dan : DEFAULT_PROGRESS.dan,
    }
  } catch { return { ...DEFAULT_PROGRESS } }
}
function recordWin(strength) {
  const p = getProgress()
  if (strength < 30) {
    if (strength > p.kyu) p.kyu = strength
  } else {
    if (strength > p.dan) p.dan = strength
  }
  localStorage.setItem(BADUK_PROGRESS_KEY, JSON.stringify(p))
  return p
}
function isRankUnlocked(strength, progress) {
  if (strength <= KYU_ALWAYS_UNLOCKED) return true // 30~20급 항상 활성
  if (strength < 30) return strength <= progress.kyu + 1
  return strength <= progress.dan + 1
}
function isRankCleared(strength, progress) {
  if (strength < 30) return strength <= progress.kyu
  return strength <= progress.dan
}

// 화면 깊이(안드로이드 뒤로가기 단계 관리용).
//  0: 모드 선택 (Baduk 진입점)
//  1: 사이즈 선택 또는 online-create
//  2: AI 등급 선택, 로컬/온라인 게임, 온라인 대기
//  3: AI 게임 또는 온라인 게임(접속됨)
function getDepth(mode, size, aiRank, roomConnected) {
  if (!mode) return 0
  if (mode === 'online-create') return 1
  if (mode === 'online') return roomConnected ? 3 : 2
  if (mode === 'ai') {
    if (!size) return 1
    if (aiRank == null) return 2
    return 3
  }
  if (mode === 'local') return size ? 2 : 1
  return 1
}

function boardToFlat(board) {
  return board.map(row => row.map(c => c || '').join(',')).join('|')
}

function flatToBoard(flat, size) {
  if (!flat) return createBoard(size)
  return flat.split('|').map(row => row.split(',').map(c => c || null))
}

// ============================================================
// Component
// ============================================================

const KYU_RANKS = getKyuRanks()
const DAN_RANKS = getDanRanks()

export default function Baduk({ onBack }) {
  const [mode, setMode] = useState(null) // null | 'local' | 'ai' | 'online'
  const [size, setSize] = useState(null)
  const [aiRank, setAiRank] = useState(null) // strength 정수 0~38
  const [rankTab, setRankTab] = useState('kyu') // 'kyu' | 'dan'
  const [board, setBoard] = useState([])
  const [turn, setTurn] = useState('black')
  const [captures, setCaptures] = useState({ black: 0, white: 0 })
  const [lastMove, setLastMove] = useState(null)
  const [prevBoardStr, setPrevBoardStr] = useState('')
  const [passCount, setPassCount] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(null)
  const [history, setHistory] = useState([])
  const [message, setMessage] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [aiThinking, setAiThinking] = useState(false)
  const [handicapCount, setHandicapCount] = useState(0)
  const [komi, setKomi] = useState(6.5)
  const [progress, setProgress] = useState(getProgress)

  const room = useGameRoom('baduk')
  const vw = useViewportWidth()

  // 업적 + 진행도 기록: AI 모드에서 승리 (바둑에서 플레이어는 흑)
  useEffect(() => {
    if (mode === 'ai' && gameOver && score && score.black > score.white && aiRank != null) {
      unlock('baduk_ai_win')
      if (aiRank === 38) unlock('baduk_dan9')
      setProgress(recordWin(aiRank))
    }
  }, [gameOver, mode, score, aiRank])
  const aiTimerRef = useRef(null)

  const opponent = turn === 'black' ? 'white' : 'black'

  // 온라인: 게임 상태 수신
  useEffect(() => {
    if (mode !== 'online' || !room.gameState) return
    const s = room.gameState
    const sz = s.size || 9
    if (!size) setSize(sz)
    setBoard(flatToBoard(s.board, sz))
    setTurn(s.turn || 'black')
    setCaptures(s.captures || { black: 0, white: 0 })
    setLastMove(s.lastMove || null)
    setPassCount(s.passCount || 0)
    setPrevBoardStr(s.prevBoardStr || '')
    setGameOver(s.gameOver || false)
    setScore(s.score || null)
  }, [room.gameState, mode])

  // AI move effect — Web Worker로 분리해서 UI 안 멈추게 함
  const aiThinkingRef = useRef(false)
  const aiWorkerRef = useRef(null)
  const aiRequestIdRef = useRef(0)

  // Worker 1회 초기화 (mode가 ai일 때만)
  useEffect(() => {
    if (mode !== 'ai') return
    if (aiWorkerRef.current) return
    try {
      aiWorkerRef.current = new Worker(
        new URL('../utils/badukAiWorker.js', import.meta.url),
        { type: 'module' },
      )
    } catch (e) {
      console.error('Worker 생성 실패, 동기 fallback:', e)
      aiWorkerRef.current = null
    }
    return () => {
      if (aiWorkerRef.current) {
        aiWorkerRef.current.terminate()
        aiWorkerRef.current = null
      }
    }
  }, [mode])

  useEffect(() => {
    if (mode !== 'ai' || turn !== 'white' || gameOver) return
    if (!size || board.length === 0 || aiRank == null) return
    if (aiThinkingRef.current) return

    aiThinkingRef.current = true
    setAiThinking(true)
    const strategy = rankToStrategy(aiRank, size)
    strategy.komi = komi
    const delay = getAiDelay(aiRank)

    const applyMove = (move) => {
      if (move === null) {
        const newPassCount = passCount + 1
        if (newPassCount >= 2) {
          const newScore = countTerritory(board, size, komi)
          setScore(newScore)
          setGameOver(true)
          setMessage('')
        } else {
          setPassCount(newPassCount)
          setTurn('black')
          setMessage('⚪ 백(AI) 패스')
        }
      } else {
        const [r, c] = move
        const testBoard = board.map(row => [...row])
        testBoard[r][c] = 'white'
        const afterCapture = removeDeadStones(testBoard, 'black', size)
        const newBoard = afterCapture.board
        const newCaptured = afterCapture.captured
        const newCaptures = { ...captures, white: captures.white + newCaptured }
        const newPrevBoardStr = boardToString(board)

        setHistory(prev => [...prev, { board: board.map(row => [...row]), turn: 'white', captures: { ...captures }, prevBoardStr }])
        setPrevBoardStr(newPrevBoardStr)
        setBoard(newBoard)
        setLastMove([r, c])
        setCaptures(newCaptures)
        setPassCount(0)
        setTurn('black')
        setMessage('')
      }
      aiThinkingRef.current = false
      setAiThinking(false)
    }

    const requestId = ++aiRequestIdRef.current
    const worker = aiWorkerRef.current

    const timer = setTimeout(() => {
      // Worker 사용 가능하면 비동기로, 아니면 동기 fallback
      if (worker) {
        const handler = (e) => {
          if (e.data.requestId !== requestId) return
          worker.removeEventListener('message', handler)
          if (e.data.error) {
            console.error('AI worker error:', e.data.error)
            applyMove(null)
            return
          }
          applyMove(e.data.move)
        }
        worker.addEventListener('message', handler)
        worker.postMessage({
          board, size, strategy, prevBoardStr, color: 'white', requestId,
        })
      } else {
        try {
          const move = getAiMove(board, size, strategy, prevBoardStr)
          applyMove(move)
        } catch (e) {
          console.error('AI error:', e)
          applyMove(null)
        }
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [mode, turn, gameOver, board, size, aiRank, prevBoardStr, passCount, captures, komi])

  // 진행도(잠금/해제) 초기화: 30급/1단부터 다시 도전
  const handleResetProgress = () => {
    if (window.confirm('진행도를 초기화하면 모든 등급이 다시 잠깁니다. 계속할까요?')) {
      localStorage.removeItem(BADUK_PROGRESS_KEY)
      setProgress({ ...DEFAULT_PROGRESS })
    }
  }

  // AI 모드 시작 (rank 기반 핸디캡 적용)
  const startAiGame = (s, rankStrength) => {
    const stones = getHandicapStones(rankStrength, s)
    const k = getKomi(rankStrength, s)
    const initialBoard = applyHandicap(createBoard(s), stones)
    setSize(s)
    setAiRank(rankStrength)
    setHandicapCount(stones.length)
    setKomi(k)
    setBoard(initialBoard)
    setTurn(stones.length > 0 ? 'white' : 'black')
    setCaptures({ black: 0, white: 0 })
    setLastMove(null)
    setPrevBoardStr('')
    setPassCount(0)
    setGameOver(false)
    setScore(null)
    setHistory([])
    setMessage('')
    setAiThinking(false)
  }

  const startGame = (s) => {
    setSize(s)
    setHandicapCount(0)
    setKomi(6.5)
    setBoard(createBoard(s))
    setTurn('black')
    setCaptures({ black: 0, white: 0 })
    setLastMove(null)
    setPrevBoardStr('')
    setPassCount(0)
    setGameOver(false)
    setScore(null)
    setHistory([])
    setMessage('')
    setAiThinking(false)
  }

  const getInitialOnlineState = (s) => ({
    board: boardToFlat(createBoard(s)),
    turn: 'black',
    captures: { black: 0, white: 0 },
    lastMove: null,
    passCount: 0,
    prevBoardStr: '',
    gameOver: false,
    score: null,
    size: s,
  })

  const createOnlineWithSize = async (s) => {
    await room.createRoom(getInitialOnlineState(s))
    setSize(s)
    setBoard(createBoard(s))
    setTurn('black')
    setCaptures({ black: 0, white: 0 })
    setLastMove(null)
    setPrevBoardStr('')
    setPassCount(0)
    setGameOver(false)
    setScore(null)
    setHistory([])
    setMessage('')
    setMode('online')
  }

  const joinOnline = async () => {
    if (joinCode.length !== 2) { room.setError('2자리 코드를 입력하세요'); return }
    const ok = await room.joinRoom(joinCode.toUpperCase())
    if (ok) setMode('online')
  }

  const place = useCallback((r, c) => {
    if (!size || board[r][c] || gameOver) return

    if (mode === 'ai') {
      if (turn !== 'black' || aiThinking) return
    }

    if (mode === 'online') {
      if (!room.connected) return
      if (turn !== room.myColor) return
    }

    const testBoard = board.map(row => [...row])
    testBoard[r][c] = turn

    const afterCapture = removeDeadStones(testBoard, opponent, size)
    let newBoard = afterCapture.board
    let newCaptured = afterCapture.captured

    const selfGroup = getGroup(newBoard, r, c, size)
    if (selfGroup.liberties === 0) {
      setMessage('자충수! 놓을 수 없어요')
      setTimeout(() => setMessage(''), 1500)
      return
    }

    const newBoardStr = boardToString(newBoard)
    if (newBoardStr === prevBoardStr) {
      setMessage('패! 같은 형태 반복 금지')
      setTimeout(() => setMessage(''), 1500)
      return
    }

    const newCaptures = { ...captures, [turn]: captures[turn] + newCaptured }
    const newPrevBoardStr = boardToString(board)
    const newTurn = opponent

    if (mode === 'online') {
      room.updateState({
        board: boardToFlat(newBoard),
        turn: newTurn,
        captures: newCaptures,
        lastMove: [r, c],
        passCount: 0,
        prevBoardStr: newPrevBoardStr,
        gameOver: false,
        score: null,
        size,
      })
    } else {
      setHistory([...history, { board: board.map(r => [...r]), turn, captures: { ...captures }, prevBoardStr }])
      setPrevBoardStr(newPrevBoardStr)
      setBoard(newBoard)
      setLastMove([r, c])
      setCaptures(newCaptures)
      setPassCount(0)
      setTurn(newTurn)
      setMessage('')
    }
  }, [board, turn, opponent, gameOver, prevBoardStr, captures, history, size, mode, room, aiThinking])

  const pass = () => {
    if (gameOver) return

    if (mode === 'ai') {
      if (turn !== 'black' || aiThinking) return
    }

    if (mode === 'online') {
      if (!room.connected) return
      if (turn !== room.myColor) return
    }

    const newPassCount = passCount + 1
    let newGameOver = false
    let newScore = null
    const useKomi = mode === 'ai' ? komi : 6.5

    if (newPassCount >= 2) {
      newScore = countTerritory(board, size, useKomi)
      newGameOver = true
    }

    if (mode === 'online') {
      room.updateState({
        board: boardToFlat(board),
        turn: opponent,
        captures,
        lastMove,
        passCount: newPassCount,
        prevBoardStr,
        gameOver: newGameOver,
        score: newScore,
        size,
      })
    } else {
      setHistory([...history, { board: board.map(r => [...r]), turn, captures: { ...captures }, prevBoardStr }])
      setPassCount(newPassCount)
      setTurn(opponent)
      setMessage(`${turn === 'black' ? '⚫ 흑' : '⚪ 백'} 패스`)
      if (newGameOver) {
        setScore(newScore)
        setGameOver(true)
        setMessage('')
      }
    }
  }

  const undo = () => {
    if (mode === 'online') return
    if (history.length === 0 || gameOver) return
    if (mode === 'ai' && aiThinking) return

    if (mode === 'ai' && history.length >= 2) {
      const prev = history[history.length - 2]
      setBoard(prev.board)
      setTurn(prev.turn)
      setCaptures(prev.captures)
      setPrevBoardStr(prev.prevBoardStr)
      setHistory(history.slice(0, -2))
    } else {
      const last = history[history.length - 1]
      setBoard(last.board)
      setTurn(last.turn)
      setCaptures(last.captures)
      setPrevBoardStr(last.prevBoardStr)
      setHistory(history.slice(0, -1))
    }
    setPassCount(0)
    setLastMove(null)
    setMessage('')
  }

  const resetGame = () => {
    if (!window.confirm('현재 게임을 종료하고 새 게임을 시작할까요?')) return
    if (mode === 'online') {
      room.updateState(getInitialOnlineState(size))
    } else if (mode === 'ai' && aiRank != null) {
      startAiGame(size, aiRank)
    } else {
      startGame(size)
    }
  }

  // 한 단계 뒤로 (상태만 변경, history 변경 없음)
  const navigateBackInternal = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    if (mode === 'online') {
      room.leaveRoom()
      setMode(null); setSize(null); setAiRank(null)
      return
    }
    if (mode === 'online-create') { setMode(null); return }
    if (mode === 'ai') {
      if (aiRank != null) { setAiRank(null); return }
      if (size != null) { setSize(null); return }
      setMode(null); return
    }
    if (mode === 'local') {
      if (size != null) { setSize(null); return }
      setMode(null); return
    }
    onBack() // depth 0에서 뒤로 → Baduk 종료
  }, [mode, size, aiRank, room, onBack])

  // 인앱 뒤로가기 버튼: history.back()을 통해 popstate 트리거 → navigateBackInternal
  const handleBack = useCallback(() => {
    if (depthRef.current > 0) {
      window.history.back()
    } else {
      onBack()
    }
  }, [onBack])

  // 깊이 변화 추적 + 깊어질 때 history push
  // App.jsx도 자체 popstate 핸들러로 user/page를 관리하므로, 그 상태를 보존하며
  // baduk 마커만 덧붙여야 함. 안 그러면 뒤로가기 시 user 필드 없음 → 프로필로 가버림.
  const depthRef = useRef(0)
  const currentDepth = getDepth(mode, size, aiRank, room.connected)
  useEffect(() => {
    if (currentDepth > depthRef.current) {
      const prev = window.history.state || {}
      window.history.pushState({ ...prev, baduk: currentDepth }, '')
    }
    depthRef.current = currentDepth
  }, [currentDepth])

  // 안드로이드 하드웨어 뒤로가기 / 브라우저 뒤로가기 처리
  // baduk 마커가 있는 push에서 뒤로 갈 때만 처리 (App.jsx가 관리하는 페이지 전환에는 관여 안 함)
  useEffect(() => {
    const handler = (e) => {
      // 우리가 push한 상태에서 뒤로 갈 때만 한 단계 뒤로 이동
      if (depthRef.current > 0) {
        navigateBackInternal()
      }
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [navigateBackInternal])

  // 모드 선택 화면
  if (!mode) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>⚪</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>바둑</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => setMode('ai')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #8E44AD, #6C3483)' }}>
            🤖 vs 컴퓨터
          </button>
          <button onClick={() => setMode('local')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #1a1a1a, #444)' }}>
            📱 같은 기기에서 (2인)
          </button>
          <button onClick={() => setMode('online-create')}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #4895EF, #3A7BD5)' }}>
            🌐 온라인 방 만들기
          </button>
          <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>또는 코드로 참가</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.replace(/[^0-9]/g, ''))}
              maxLength={2}
              placeholder="방 코드 2자리"
              inputMode="numeric"
              style={{
                flex: 1, padding: '12px', borderRadius: 10, border: '2px solid #DDD',
                fontSize: 16, fontWeight: 700, textAlign: 'center', letterSpacing: 4,
                fontFamily: 'monospace', minWidth: 0, boxSizing: 'border-box',
              }}
            />
            <button onClick={joinOnline}
              style={{ padding: '0 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#4895EF', color: '#FFF', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 52 }}>
              참가
            </button>
          </div>
          {room.error && <div style={{ color: '#E74C3C', fontSize: 13 }}>{room.error}</div>}
        </div>
      </div>
    )
  }

  // AI 모드: 사이즈 선택
  if (mode === 'ai' && !size) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🤖</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>vs 컴퓨터</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 32 }}>판 크기를 선택하세요</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => setSize(9)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #06D6A0, #05B384)' }}>
            9×9 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>입문</span>
          </button>
          <button onClick={() => setSize(13)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #4895EF, #3A7BD5)' }}>
            13×13 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>중급</span>
          </button>
          <button onClick={() => setSize(19)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #1a1a1a, #444)' }}>
            19×19 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>정식</span>
          </button>
        </div>
      </div>
    )
  }

  // AI 모드: 등급(급/단) 선택
  if (mode === 'ai' && size && aiRank == null) {
    const ranks = rankTab === 'kyu' ? KYU_RANKS : DAN_RANKS
    const cols = rankTab === 'kyu' ? 6 : 3
    const currentTrackMax = rankTab === 'kyu' ? progress.kyu : progress.dan
    const currentTarget = currentTrackMax + 1 // 지금 도전할 등급 strength
    const currentRank = ranks.find(r => r.strength === currentTarget)
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 크기 선택
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🤖</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>등급 선택</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
          {size}×{size} · 약한 등급부터 차례로 도전!
        </p>

        {/* 급/단 탭 */}
        <div style={{ display: 'flex', gap: 8, maxWidth: 300, margin: '0 auto 16px' }}>
          <button onClick={() => setRankTab('kyu')}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 700,
              background: rankTab === 'kyu' ? '#333' : '#F0F0F0',
              color: rankTab === 'kyu' ? '#FFF' : '#666',
            }}>
            급 (30~1급)
          </button>
          <button onClick={() => setRankTab('dan')}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 700,
              background: rankTab === 'dan' ? '#333' : '#F0F0F0',
              color: rankTab === 'dan' ? '#FFF' : '#666',
            }}>
            단 (1~9단)
          </button>
        </div>

        {/* 현재 도전 안내 */}
        {currentRank && (
          <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
            지금 도전할 차례: <strong style={{ color: getRankColor(currentRank.strength) }}>{currentRank.label}</strong>
          </div>
        )}

        {/* 등급 버튼 그리드 (약한 등급이 위: 30급/1단부터) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 6,
          maxWidth: 320,
          margin: '0 auto',
        }}>
          {ranks.map(rank => {
            const locked = !isRankUnlocked(rank.strength, progress)
            const cleared = isRankCleared(rank.strength, progress)
            const isCurrent = rank.strength === currentTarget
            const mark = locked ? '🔒' : cleared ? '✓' : ''
            return (
              <button key={rank.strength}
                onClick={() => !locked && startAiGame(size, rank.strength)}
                disabled={locked}
                title={locked ? '먼저 이전 등급을 이겨주세요' : getRankDescription(rank.strength)}
                style={{
                  padding: '12px 0', borderRadius: 10, border: 'none',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  fontSize: 14, fontWeight: 700,
                  color: locked ? '#999' : '#FFF',
                  background: locked ? '#E0E0E0' : getRankColor(rank.strength),
                  boxShadow: locked ? 'none'
                    : isCurrent ? `0 0 0 2px #F1C40F, 0 2px 6px ${getRankColor(rank.strength)}66`
                    : `0 2px 6px ${getRankColor(rank.strength)}44`,
                  opacity: locked ? 0.55 : 1,
                }}>
                {mark} {rank.label}
              </button>
            )
          })}
        </div>

        <p style={{ fontSize: 11, color: '#AAA', marginTop: 16, lineHeight: 1.5, maxWidth: 320, margin: '16px auto 0' }}>
          ※ 단(段)에서는 플레이어가 미리 흑돌을 화점에 놓고 시작합니다 (접바둑).
        </p>

        <button onClick={handleResetProgress}
          style={{
            marginTop: 20, padding: '8px 16px',
            fontSize: 12, color: '#888',
            background: 'none', border: '1px solid #DDD', borderRadius: 8,
            cursor: 'pointer',
          }}>
          ↻ 진행도 초기화
        </button>
      </div>
    )
  }

  // 온라인 방 만들기: 사이즈 선택
  if (mode === 'online-create') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🌐</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>온라인 바둑</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 32 }}>판 크기를 선택하세요</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => createOnlineWithSize(9)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #06D6A0, #05B384)' }}>
            9×9 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>입문</span>
          </button>
          <button onClick={() => createOnlineWithSize(13)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #4895EF, #3A7BD5)' }}>
            13×13 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>중급</span>
          </button>
          <button onClick={() => createOnlineWithSize(19)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #1a1a1a, #444)' }}>
            19×19 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>정식</span>
          </button>
        </div>
      </div>
    )
  }

  // 로컬 모드: 사이즈 선택
  if (mode === 'local' && !size) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>⚪</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>바둑</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 32 }}>판 크기를 선택하세요</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          <button onClick={() => startGame(9)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #06D6A0, #05B384)' }}>
            9×9 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>입문</span>
          </button>
          <button onClick={() => startGame(13)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #4895EF, #3A7BD5)' }}>
            13×13 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>중급</span>
          </button>
          <button onClick={() => startGame(19)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #1a1a1a, #444)' }}>
            19×19 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>정식</span>
          </button>
        </div>
      </div>
    )
  }

  // 온라인: 대기 화면
  if (mode === 'online' && !room.connected) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 24 }}>
          ← 취소
        </button>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>상대를 기다리는 중...</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
          상대방에게 아래 코드를 알려주세요
        </p>
        <div style={{
          fontSize: 36, fontWeight: 700, letterSpacing: 8,
          padding: '16px 24px', background: '#F7F6F3', borderRadius: 14,
          display: 'inline-block', fontFamily: 'monospace',
        }}>
          {room.roomCode}
        </div>
        <p style={{ fontSize: 12, color: '#AAA', marginTop: 16 }}>
          나는 ⚫ 흑 (선공) · {size}×{size}
        </p>
      </div>
    )
  }

  if (!size) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <p style={{ fontSize: 14, color: '#888' }}>게임 정보를 불러오는 중...</p>
      </div>
    )
  }

  const isMyTurn = mode === 'local' || mode === 'ai' ? turn === 'black' || mode === 'local' : turn === room.myColor
  const isPC = vw >= 768
  const maxCell = isPC
    ? (size === 19 ? 36 : size === 13 ? 50 : 64)
    : (size === 19 ? 20 : size === 13 ? 28 : 38)
  const effectiveWidth = isPC ? Math.min(vw - 40, 900) : vw - 32
  const cellSize = Math.min(Math.floor(effectiveWidth / size), maxCell)
  const boardPx = cellSize * (size - 1)
  const padding = cellSize

  const aiRankObj = aiRank != null ? getRank(aiRank) : null

  const turnLabel = (() => {
    if (gameOver) return '종료'
    if (mode === 'ai') {
      if (aiThinking) return 'AI 생각중...'
      return turn === 'black' ? '내 차례' : 'AI 차례'
    }
    if (mode === 'online') return isMyTurn ? '내 차례' : '상대 차례'
    return `${turn === 'black' ? '흑' : '백'} 차례`
  })()

  return (
    <div className="fade-in" style={{ maxWidth: 520, margin: '0 auto', paddingBottom: '1rem' }}>
      <div style={{
        background: mode === 'ai'
          ? `linear-gradient(135deg, ${getRankColor(aiRank ?? 0)}, ${getRankColor(Math.max(0, (aiRank ?? 0) - 5))})`
          : 'linear-gradient(135deg, #1a1a1a, #333)',
        color: '#FFF', padding: '1rem 1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={handleBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← {mode === 'online' ? '나가기' : mode === 'ai' ? '등급 선택' : '크기 선택'}
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>
            바둑 ({size}×{size})
            {mode === 'ai' && aiRankObj && ` · AI ${aiRankObj.label}`}
            {mode === 'online' && ' · 온라인'}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(mode === 'local' || mode === 'ai') && (
              <button onClick={undo}
                disabled={mode === 'ai' && aiThinking}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 12, borderRadius: 20, padding: '4px 10px', cursor: 'pointer', opacity: (mode === 'ai' && aiThinking) ? 0.4 : 1 }}>
                ↩
              </button>
            )}
            <button onClick={resetGame}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 12, borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}>
              새 게임
            </button>
          </div>
        </div>
      </div>

      {/* 정보 바 */}
      <div style={{
        display: 'flex', justifyContent: 'space-around', padding: '10px 16px',
        background: '#F7F6F3', fontSize: 13,
      }}>
        <div style={{ textAlign: 'center', fontWeight: turn === 'black' && !gameOver ? 700 : 400 }}>
          ⚫ 흑{mode === 'ai' ? '(나)' : ''} <span style={{ fontSize: 11, color: '#888' }}>잡은돌 {captures.black}</span>
        </div>
        <div style={{
          padding: '2px 12px', borderRadius: 10,
          background: gameOver ? '#F1C40F' : aiThinking ? '#8E44AD' : turn === 'black' ? '#333' : '#FFF',
          color: gameOver ? '#333' : aiThinking ? '#FFF' : turn === 'black' ? '#FFF' : '#333',
          border: '1px solid #DDD', fontSize: 12, fontWeight: 600,
        }}>
          {turnLabel}
        </div>
        <div style={{ textAlign: 'center', fontWeight: turn === 'white' && !gameOver ? 700 : 400 }}>
          ⚪ 백{mode === 'ai' ? '(AI)' : ''} <span style={{ fontSize: 11, color: '#888' }}>잡은돌 {captures.white}</span>
        </div>
      </div>

      {mode === 'ai' && aiRankObj && (
        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0' }}>
          <strong>{aiRankObj.label}</strong> · {getRankDescription(aiRank)}
          {handicapCount > 0 && ` · 접바둑 ${handicapCount}점`}
        </div>
      )}

      {mode === 'online' && (
        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0' }}>
          방 코드: <strong>{room.roomCode}</strong> · 나는 {room.myColor === 'black' ? '⚫ 흑' : '⚪ 백'}
        </div>
      )}

      {message && (
        <div style={{ textAlign: 'center', padding: '6px', fontSize: 13, fontWeight: 600, color: '#E74C3C', background: '#FFF5F5' }}>
          {message}
        </div>
      )}

      {/* 바둑판 */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', overflow: 'auto' }}>
        <svg
          width={boardPx + padding * 2}
          height={boardPx + padding * 2}
          style={{ background: '#DCB35C', borderRadius: 8 }}
        >
          {Array.from({ length: size }).map((_, i) => (
            <g key={`line-${i}`}>
              <line x1={padding} y1={padding + i * cellSize} x2={padding + (size - 1) * cellSize} y2={padding + i * cellSize} stroke="#8B6914" strokeWidth={0.8} />
              <line x1={padding + i * cellSize} y1={padding} x2={padding + i * cellSize} y2={padding + (size - 1) * cellSize} stroke="#8B6914" strokeWidth={0.8} />
            </g>
          ))}

          {(STAR_POINTS[size] || []).map(([r, c]) => (
            <circle key={`dot-${r}-${c}`} cx={padding + c * cellSize} cy={padding + r * cellSize} r={size === 19 ? 2 : 2.5} fill="#8B6914" />
          ))}

          {board.map((row, r) => row.map((cell, c) => {
            if (!cell) return null
            const isLast = lastMove && lastMove[0] === r && lastMove[1] === c
            return (
              <g key={`stone-${r}-${c}`}>
                <circle cx={padding + c * cellSize} cy={padding + r * cellSize} r={cellSize * 0.44}
                  fill={cell === 'black' ? '#222' : '#FFF'} stroke={cell === 'black' ? '#000' : '#AAA'} strokeWidth={0.8} />
                {isLast && <circle cx={padding + c * cellSize} cy={padding + r * cellSize} r={size === 19 ? 2 : 3} fill="#E74C3C" />}
              </g>
            )
          }))}

          {!gameOver && board.map((row, r) => row.map((cell, c) => {
            if (cell) return null
            return (
              <rect key={`click-${r}-${c}`}
                x={padding + c * cellSize - cellSize / 2} y={padding + r * cellSize - cellSize / 2}
                width={cellSize} height={cellSize} fill="transparent"
                style={{ cursor: (mode === 'ai' ? (turn === 'black' && !aiThinking) : isMyTurn) ? 'pointer' : 'default' }}
                onClick={() => place(r, c)} />
            )
          }))}
        </svg>
      </div>

      {!gameOver && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <button onClick={pass}
            disabled={mode === 'ai' && (turn !== 'black' || aiThinking)}
            style={{
              padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: (mode === 'online' && !isMyTurn) || (mode === 'ai' && (turn !== 'black' || aiThinking)) ? '#AAA' : '#555',
              color: '#FFF', fontSize: 14, fontWeight: 600,
            }}>
            패스 {passCount >= 1 ? '(양쪽 패스 시 종료)' : ''}
          </button>
        </div>
      )}

      {gameOver && score && (
        <div style={{
          margin: '8px 12px', padding: '20px', borderRadius: 14,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          border: '2px solid #F1C40F', textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
            {score.black > score.white
              ? mode === 'ai'
                ? `⚫ 승리! AI ${aiRankObj ? aiRankObj.label : ''}을(를) 이겼습니다!`
                : '⚫ 흑 승리!'
              : mode === 'ai'
                ? `⚪ AI ${aiRankObj ? aiRankObj.label : ''} 승리! 다시 도전하세요!`
                : '⚪ 백 승리!'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16, fontSize: 13 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{score.black}</div>
              <div style={{ color: '#888' }}>⚫ 흑{mode === 'ai' ? '(나)' : ''}</div>
              <div style={{ fontSize: 11, color: '#AAA' }}>돌 {score.blackStones} + 집 {score.blackTerritory}</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{score.white}</div>
              <div style={{ color: '#888' }}>⚪ 백{mode === 'ai' ? '(AI)' : ''}</div>
              <div style={{ fontSize: 11, color: '#AAA' }}>
                돌 {score.whiteStones} + 집 {score.whiteTerritory} + 덤{score.komi}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={resetGame}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#333', color: '#FFF', fontSize: 14, fontWeight: 600 }}>
              다시 하기
            </button>
            {mode === 'local' && (
              <button onClick={handleBack}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
                크기 변경
              </button>
            )}
            {mode === 'ai' && (
              <button onClick={handleBack}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
                등급 변경
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
