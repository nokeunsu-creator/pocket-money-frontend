// "AI 바둑" — Baduk.jsx의 vs 컴퓨터 모드만 발췌해 별도 컴포넌트로 분리.
// 차이점:
//   - 모드 선택 없음 (AI 전용)
//   - 로컬2인/온라인 코드 모두 제거
//   - badukRankStrong의 강화 파라미터 사용 (후보 폭 ↑, 4~1급도 수읽기)
//   - 진행도 localStorage 키 분리: 'baduk-ai-progress'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useViewportWidth } from '../utils/useViewportWidth'
import { unlock } from '../utils/achievements'
import {
  rankToStrategyStrong as rankToStrategy,
  getRank,
  getRankColorStrong as getRankColor,
  getRankDescriptionStrong as getRankDescription,
  getAiDelayStrong as getAiDelay,
  getKyuRanks,
  getDanRanks,
} from '../utils/badukRankStrong'
import {
  createBoard,
  getGroup,
  removeDeadStones,
  boardToString,
  countTerritory,
  STAR_POINTS,
  getAiMove,
} from '../utils/badukEngine'

const BADUK_AI_PROGRESS_KEY = 'baduk-ai-progress'
const KYU_ALWAYS_UNLOCKED = 10 // 30~20급 자동 활성
const DEFAULT_PROGRESS = { kyu: KYU_ALWAYS_UNLOCKED, dan: 29 }

function getProgress() {
  try {
    const raw = localStorage.getItem(BADUK_AI_PROGRESS_KEY)
    if (!raw) return { ...DEFAULT_PROGRESS }
    const p = JSON.parse(raw)
    return {
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
  localStorage.setItem(BADUK_AI_PROGRESS_KEY, JSON.stringify(p))
  return p
}

function isRankUnlocked(strength, progress) {
  if (strength <= KYU_ALWAYS_UNLOCKED) return true
  if (strength < 30) return strength <= progress.kyu + 1
  return strength <= progress.dan + 1
}

function isRankCleared(strength, progress) {
  if (strength < 30) return strength <= progress.kyu
  return strength <= progress.dan
}

// 화면 깊이 (안드로이드 뒤로가기용)
//  0: 사이즈 선택 (진입점)
//  1: 등급 선택
//  2: 게임 중
function getDepth(size, aiRank) {
  if (!size) return 0
  if (aiRank == null) return 1
  return 2
}

const KYU_RANKS = getKyuRanks()
const DAN_RANKS = getDanRanks()

export default function BadukAI({ onBack }) {
  const [size, setSize] = useState(null)
  const [aiRank, setAiRank] = useState(null)
  const [rankTab, setRankTab] = useState('kyu')
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
  const [aiThinking, setAiThinking] = useState(false)
  const [komi, setKomi] = useState(6.5)
  const [progress, setProgress] = useState(getProgress)
  const [aiEndProposal, setAiEndProposal] = useState(false)

  const vw = useViewportWidth()
  const opponent = turn === 'black' ? 'white' : 'black'

  // 업적 + 진행도 기록 (강화판도 같은 업적 키 재사용)
  useEffect(() => {
    if (gameOver && score && score.black > score.white && aiRank != null) {
      unlock('baduk_ai_win')
      if (aiRank === 38) unlock('baduk_dan9')
      setProgress(recordWin(aiRank))
    }
  }, [gameOver, score, aiRank])

  // AI Worker (정규 + ponder)
  const aiThinkingRef = useRef(false)
  const aiWorkerRef = useRef(null)
  const aiRequestIdRef = useRef(0)
  const ponderWorkerRef = useRef(null)
  const ponderRequestIdRef = useRef(0)
  const ponderCacheRef = useRef(null)

  useEffect(() => {
    if (aiWorkerRef.current) return
    try {
      aiWorkerRef.current = new Worker(
        new URL('../utils/badukAiWorker.js', import.meta.url),
        { type: 'module' },
      )
      ponderWorkerRef.current = new Worker(
        new URL('../utils/badukAiWorker.js', import.meta.url),
        { type: 'module' },
      )
    } catch (e) {
      console.error('Worker 생성 실패, 동기 fallback:', e)
      aiWorkerRef.current = null
      ponderWorkerRef.current = null
    }
    return () => {
      if (aiWorkerRef.current) { aiWorkerRef.current.terminate(); aiWorkerRef.current = null }
      if (ponderWorkerRef.current) { ponderWorkerRef.current.terminate(); ponderWorkerRef.current = null }
      ponderCacheRef.current = null
    }
  }, [])

  const startPonder = useCallback((boardForPonder, prevForPonder) => {
    if (!ponderWorkerRef.current || aiRank == null) return
    ponderCacheRef.current = null
    const strategy = rankToStrategy(aiRank, size)
    strategy.komi = komi
    const requestId = ++ponderRequestIdRef.current
    const handler = (e) => {
      if (e.data.requestId !== requestId) return
      ponderWorkerRef.current.removeEventListener('message', handler)
      if (!e.data.hit || !e.data.userMove || !e.data.aiMove) return
      const [ur, uc] = e.data.userMove
      const tempBoard = boardForPonder.map(row => [...row])
      tempBoard[ur][uc] = 'black'
      const afterUser = removeDeadStones(tempBoard, 'white', size)
      ponderCacheRef.current = {
        boardKey: boardToString(afterUser.board),
        aiMove: e.data.aiMove,
        userMove: e.data.userMove,
      }
    }
    ponderWorkerRef.current.addEventListener('message', handler)
    ponderWorkerRef.current.postMessage({
      type: 'ponder',
      board: boardForPonder, size, strategy,
      prevBoardStr: prevForPonder,
      userColor: 'black',
      requestId,
    })
  }, [aiRank, size, komi])

  useEffect(() => {
    if (turn !== 'white' || gameOver) return
    if (!size || board.length === 0 || aiRank == null) return
    if (aiThinkingRef.current) return

    aiThinkingRef.current = true
    setAiThinking(true)
    const strategy = rankToStrategy(aiRank, size)
    strategy.komi = komi
    const delay = getAiDelay(aiRank)

    const applyMove = (move) => {
      if (move === null) {
        setAiEndProposal(true)
        setMessage('⚪ 백(AI) 종료 제안')
        setTurn('black')
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
        startPonder(newBoard, newPrevBoardStr)
      }
      aiThinkingRef.current = false
      setAiThinking(false)
    }

    const requestId = ++aiRequestIdRef.current
    const worker = aiWorkerRef.current

    // ponder 캐시 매칭 → 즉시 응답
    const ponderCache = ponderCacheRef.current
    if (ponderCache && ponderCache.aiMove) {
      const currentBoardKey = boardToString(board)
      if (ponderCache.boardKey === currentBoardKey) {
        const cachedMove = ponderCache.aiMove
        ponderCacheRef.current = null
        const t = setTimeout(() => applyMove(cachedMove), 300)
        return () => clearTimeout(t)
      }
    }

    const timer = setTimeout(() => {
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
          const move = getAiMove(board, size, strategy, prevBoardStr, 'white')
          applyMove(move)
        } catch (e) {
          console.error('AI error:', e)
          applyMove(null)
        }
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [turn, gameOver, board, size, aiRank, prevBoardStr, passCount, captures, komi, startPonder])

  const handleResetProgress = () => {
    if (window.confirm('진행도를 초기화하면 모든 등급이 다시 잠깁니다. 계속할까요?')) {
      localStorage.removeItem(BADUK_AI_PROGRESS_KEY)
      setProgress({ ...DEFAULT_PROGRESS })
    }
  }

  const startAiGame = (s, rankStrength) => {
    setSize(s)
    setAiRank(rankStrength)
    setKomi(6.5)
    setBoard(createBoard(s))
    setTurn('black') // 강화판은 핸디캡 없음, 흑(사람) 선
    setCaptures({ black: 0, white: 0 })
    setLastMove(null)
    setPrevBoardStr('')
    setPassCount(0)
    setGameOver(false)
    setScore(null)
    setHistory([])
    setMessage('')
    setAiThinking(false)
    setAiEndProposal(false)
  }

  const place = useCallback((r, c) => {
    if (!size || board[r][c] || gameOver) return
    if (turn !== 'black' || aiThinking) return

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

    setHistory([...history, { board: board.map(r => [...r]), turn, captures: { ...captures }, prevBoardStr }])
    setPrevBoardStr(newPrevBoardStr)
    setBoard(newBoard)
    setLastMove([r, c])
    setCaptures(newCaptures)
    setPassCount(0)
    setTurn(opponent)
    setMessage('')
  }, [board, turn, opponent, gameOver, prevBoardStr, captures, history, size, aiThinking])

  const pass = () => {
    if (gameOver) return
    if (turn !== 'black' || aiThinking) return

    const newPassCount = passCount + 1
    let newGameOver = false
    let newScore = null
    if (newPassCount >= 2) {
      newScore = countTerritory(board, size, komi)
      newGameOver = true
    }
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

  const acceptAiEnd = () => {
    setAiEndProposal(false)
    const finalScore = countTerritory(board, size, komi)
    setScore(finalScore)
    setGameOver(true)
    setMessage('')
  }

  const rejectAiEnd = () => {
    setAiEndProposal(false)
    const newPassCount = passCount + 1
    setPassCount(newPassCount)
    setMessage('⚪ 백(AI) 패스 — 계속 두세요')
  }

  const resign = () => {
    if (gameOver) return
    if (turn !== 'black' || aiThinking) return
    if (!window.confirm('정말 기권하시겠어요?')) return
    const winnerScore = {
      black: 0, white: 999, komi: 6.5,
      blackStones: 0, whiteStones: 0, blackTerritory: 0, whiteTerritory: 0,
      resignedBy: 'black',
    }
    setScore(winnerScore)
    setGameOver(true)
    setMessage('')
  }

  const undo = () => {
    if (history.length === 0 || gameOver || aiThinking) return
    if (history.length >= 2) {
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
    if (aiRank != null) startAiGame(size, aiRank)
  }

  const navigateBackInternal = useCallback(() => {
    if (aiRank != null) { setAiRank(null); return }
    if (size != null) { setSize(null); return }
    onBack()
  }, [size, aiRank, onBack])

  const handleBack = useCallback(() => {
    if (depthRef.current > 0) {
      window.history.back()
    } else {
      onBack()
    }
  }, [onBack])

  const depthRef = useRef(0)
  const currentDepth = getDepth(size, aiRank)
  useEffect(() => {
    if (currentDepth > depthRef.current) {
      const prev = window.history.state || {}
      window.history.pushState({ ...prev, badukAi: currentDepth }, '')
    }
    depthRef.current = currentDepth
  }, [currentDepth])

  useEffect(() => {
    const handler = () => {
      if (depthRef.current > 0) navigateBackInternal()
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [navigateBackInternal])

  // ----- 사이즈 선택 -----
  if (!size) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🧠</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>AI 바둑</h2>
        <p style={{ fontSize: 12, color: '#8E44AD', fontWeight: 600, marginBottom: 8 }}>
          강화 모드 · 같은 등급이라도 더 강함
        </p>
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

  // ----- 등급 선택 -----
  if (size && aiRank == null) {
    const ranks = rankTab === 'kyu' ? KYU_RANKS : DAN_RANKS
    const cols = rankTab === 'kyu' ? 6 : 3
    const currentTrackMax = rankTab === 'kyu' ? progress.kyu : progress.dan
    const currentTarget = currentTrackMax + 1
    const currentRank = ranks.find(r => r.strength === currentTarget)
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 크기 선택
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🧠</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>등급 선택</h2>
        <p style={{ fontSize: 11, color: '#8E44AD', fontWeight: 600, marginBottom: 8 }}>강화 AI</p>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
          {size}×{size} · 약한 등급부터 차례로 도전!
        </p>

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

        {currentRank && (
          <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
            지금 도전할 차례: <strong style={{ color: getRankColor(currentRank.strength) }}>{currentRank.label}</strong>
          </div>
        )}

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
          ※ 강화 AI는 같은 등급이라도 기존 바둑보다 후보 수읽기 폭이 넓어 더 강해요.<br/>
          ※ 핸디캡(접바둑) 없음 — 9단까지 호선으로 도전.
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

  // ----- 게임 -----
  if (!size) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <p style={{ fontSize: 14, color: '#888' }}>게임 정보를 불러오는 중...</p>
      </div>
    )
  }

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
    if (aiThinking) return 'AI 생각중...'
    return turn === 'black' ? '내 차례' : 'AI 차례'
  })()

  return (
    <div className="fade-in" style={{ maxWidth: 520, margin: '0 auto', paddingBottom: '1rem' }}>
      <div style={{
        background: `linear-gradient(135deg, ${getRankColor(aiRank ?? 0)}, ${getRankColor(Math.max(0, (aiRank ?? 0) - 5))})`,
        color: '#FFF', padding: '1rem 1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={handleBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 등급 선택
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>
            AI 바둑 ({size}×{size})
            {aiRankObj && ` · ${aiRankObj.label}`}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={undo}
              disabled={aiThinking}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 12, borderRadius: 20, padding: '4px 10px', cursor: 'pointer', opacity: aiThinking ? 0.4 : 1 }}>
              ↩
            </button>
            <button onClick={resetGame}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 12, borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}>
              새 게임
            </button>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-around', padding: '10px 16px',
        background: '#F7F6F3', fontSize: 13,
      }}>
        <div style={{ textAlign: 'center', fontWeight: turn === 'black' && !gameOver ? 700 : 400 }}>
          ⚫ 흑(나) <span style={{ fontSize: 11, color: '#888' }}>잡은돌 {captures.black}</span>
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
          ⚪ 백(AI) <span style={{ fontSize: 11, color: '#888' }}>잡은돌 {captures.white}</span>
        </div>
      </div>

      {aiRankObj && (
        <div style={{ textAlign: 'center', padding: '4px', fontSize: 11, color: '#888', background: '#F0F0F0' }}>
          <strong>{aiRankObj.label}</strong> · {getRankDescription(aiRank)}
        </div>
      )}

      {message && (
        <div style={{ textAlign: 'center', padding: '6px', fontSize: 13, fontWeight: 600, color: '#E74C3C', background: '#FFF5F5' }}>
          {message}
        </div>
      )}

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
                style={{ cursor: turn === 'black' && !aiThinking ? 'pointer' : 'default' }}
                onClick={() => place(r, c)} />
            )
          }))}
        </svg>
      </div>

      {aiEndProposal && !gameOver && (
        <div style={{
          margin: '12px', padding: 16, borderRadius: 12,
          background: 'linear-gradient(135deg, #E8F4FD, #D1E9FB)',
          border: '2px solid #3498DB', textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
            ⚪ AI가 게임을 끝내자고 제안합니다
          </div>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>
            더 둘 곳이 없다고 판단했어요. 지금 점수를 계산할까요?
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={acceptAiEnd} style={{
              padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: '#27AE60', color: '#FFF', fontSize: 14, fontWeight: 600,
            }}>
              수락 (종료)
            </button>
            <button onClick={rejectAiEnd} style={{
              padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: '#7F8C8D', color: '#FFF', fontSize: 14, fontWeight: 600,
            }}>
              거절 (계속)
            </button>
          </div>
        </div>
      )}

      {!gameOver && (
        <div style={{ textAlign: 'center', padding: '8px 0', display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={pass}
            disabled={turn !== 'black' || aiThinking}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: (turn !== 'black' || aiThinking) ? '#AAA' : '#555',
              color: '#FFF', fontSize: 14, fontWeight: 600,
            }}>
            패스 {passCount >= 1 ? '(양쪽 패스 시 종료)' : ''}
          </button>
          <button onClick={resign}
            disabled={turn !== 'black' || aiThinking}
            style={{
              padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: (turn !== 'black' || aiThinking) ? '#C8A0A0' : '#C0392B',
              color: '#FFF', fontSize: 14, fontWeight: 600,
            }}>
            기권
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
            {score.resignedBy === 'black'
              ? `⚪ AI ${aiRankObj ? aiRankObj.label : ''} 승리! (기권)`
              : score.black > score.white
              ? `⚫ 승리! AI ${aiRankObj ? aiRankObj.label : ''}을(를) 이겼습니다!`
              : `⚪ AI ${aiRankObj ? aiRankObj.label : ''} 승리! 다시 도전하세요!`}
          </div>
          {!score.resignedBy && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16, fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 20 }}>{score.black}</div>
                <div style={{ color: '#888' }}>⚫ 흑(나)</div>
                <div style={{ fontSize: 11, color: '#AAA' }}>돌 {score.blackStones} + 집 {score.blackTerritory}</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 20 }}>{score.white}</div>
                <div style={{ color: '#888' }}>⚪ 백(AI)</div>
                <div style={{ fontSize: 11, color: '#AAA' }}>
                  돌 {score.whiteStones} + 집 {score.whiteTerritory} + 덤{score.komi}
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={resetGame}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#333', color: '#FFF', fontSize: 14, fontWeight: 600 }}>
              다시 하기
            </button>
            <button onClick={handleBack}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
              등급 변경
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
