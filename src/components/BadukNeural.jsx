// 신경망 AI 바둑 — CNN 정책망/가치망 + MCTS (AlphaGo 스타일 PUCT)
// - 사전학습 모델 없음. 도메인 사전(prior) 지식이 입혀진 CNN 가중치 + 휴리스틱 mix
// - 9×9 / 13×13 / 19×19 지원, 단 신경망 추론은 9×9가 가장 빠름
// - 강도: 시뮬레이션 수로 조절 (얕음/보통/깊음)
import { useState, useCallback, useEffect, useRef } from 'react'
import { useViewportWidth } from '../utils/useViewportWidth'
import { unlock } from '../utils/achievements'
import {
  createBoard, getGroup, removeDeadStones, boardToString, countTerritory, STAR_POINTS,
} from '../utils/badukEngine'

const STRENGTHS = [
  { key: 'light',  label: '얕은 사고', desc: '빠른 추론 · 120 sim',  sims: 120,  timeMs: 1500, color: '#06D6A0' },
  { key: 'normal', label: '보통 사고', desc: '균형 잡힌 · 300 sim',  sims: 300,  timeMs: 2800, color: '#4895EF' },
  { key: 'deep',   label: '깊은 사고', desc: '강한 탐색 · 700 sim',  sims: 700,  timeMs: 5000, color: '#8E44AD' },
  { key: 'max',    label: '최강',     desc: '최대 깊이 · 1400 sim', sims: 1400, timeMs: 8000, color: '#C0392B' },
]

function getDepth(size, strength) {
  if (!size) return 0
  if (!strength) return 1
  return 2
}

export default function BadukNeural({ onBack }) {
  const [size, setSize] = useState(null)
  const [strengthKey, setStrengthKey] = useState(null)
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
  const [komi] = useState(6.5)
  const [workerReady, setWorkerReady] = useState(false)
  const [workerError, setWorkerError] = useState(null)

  const vw = useViewportWidth()
  const opponent = turn === 'black' ? 'white' : 'black'
  const strength = STRENGTHS.find(s => s.key === strengthKey)

  // 신경망 Worker
  const aiThinkingRef = useRef(false)
  const workerRef = useRef(null)
  const reqIdRef = useRef(0)

  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL('../utils/badukNeural/neuralWorker.js', import.meta.url),
        { type: 'module' },
      )
      setWorkerReady(true)
    } catch (e) {
      console.error('신경망 Worker 생성 실패:', e)
      setWorkerError(e.message || '신경망 엔진을 불러올 수 없습니다')
    }
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (gameOver && score && score.black > score.white && strengthKey != null) {
      unlock('baduk_ai_win')
    }
  }, [gameOver, score, strengthKey])

  // AI 차례 처리
  useEffect(() => {
    if (turn !== 'white' || gameOver) return
    if (!size || board.length === 0 || !strength) return
    if (aiThinkingRef.current) return
    if (!workerRef.current) return

    aiThinkingRef.current = true
    setAiThinking(true)

    const applyMove = (move) => {
      if (move === null) {
        const newPassCount = passCount + 1
        let newGameOver = false
        let newScore = null
        if (newPassCount >= 2) {
          newScore = countTerritory(board, size, komi)
          newGameOver = true
        }
        setHistory(prev => [...prev, { board: board.map(r => [...r]), turn: 'white', captures: { ...captures }, prevBoardStr }])
        setPassCount(newPassCount)
        setTurn('black')
        setMessage('⚪ 백(AI) 패스')
        if (newGameOver) { setScore(newScore); setGameOver(true); setMessage('') }
      } else {
        const [r, c] = move
        const testBoard = board.map(row => [...row])
        testBoard[r][c] = 'white'
        const afterCapture = removeDeadStones(testBoard, 'black', size)
        const newBoard = afterCapture.board
        const newCaptured = afterCapture.captured
        const newCaptures = { ...captures, white: captures.white + newCaptured }
        const newPrevBoardStr = boardToString(board)

        setHistory(prev => [...prev, { board: board.map(r => [...r]), turn: 'white', captures: { ...captures }, prevBoardStr }])
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

    const requestId = ++reqIdRef.current
    const worker = workerRef.current
    const handler = (e) => {
      if (e.data.requestId !== requestId) return
      worker.removeEventListener('message', handler)
      if (e.data.error) {
        console.error('신경망 추론 오류:', e.data.error)
        applyMove(null)
        return
      }
      applyMove(e.data.move)
    }
    worker.addEventListener('message', handler)
    worker.postMessage({
      board, size, color: 'white', prevBoardStr, komi,
      simulations: strength.sims, timeBudgetMs: strength.timeMs,
      requestId,
    })

    return () => worker.removeEventListener('message', handler)
  }, [turn, gameOver, board, size, prevBoardStr, captures, passCount, komi, strength, strengthKey])

  const startGame = (s, stKey) => {
    setSize(s)
    setStrengthKey(stKey)
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
      setTimeout(() => setMessage(''), 1500); return
    }

    const newBoardStr = boardToString(newBoard)
    if (newBoardStr === prevBoardStr) {
      setMessage('패! 같은 형태 반복 금지')
      setTimeout(() => setMessage(''), 1500); return
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
    let newGameOver = false; let newScore = null
    if (newPassCount >= 2) {
      newScore = countTerritory(board, size, komi); newGameOver = true
    }
    setHistory([...history, { board: board.map(r => [...r]), turn, captures: { ...captures }, prevBoardStr }])
    setPassCount(newPassCount)
    setTurn(opponent)
    setMessage(`⚫ 흑 패스`)
    if (newGameOver) { setScore(newScore); setGameOver(true); setMessage('') }
  }

  const resign = () => {
    if (gameOver) return
    if (turn !== 'black' || aiThinking) return
    if (!window.confirm('정말 기권하시겠어요?')) return
    setScore({
      black: 0, white: 999, komi,
      blackStones: 0, whiteStones: 0, blackTerritory: 0, whiteTerritory: 0,
      resignedBy: 'black',
    })
    setGameOver(true); setMessage('')
  }

  const undo = () => {
    if (history.length === 0 || gameOver || aiThinking) return
    if (history.length >= 2) {
      const prev = history[history.length - 2]
      setBoard(prev.board); setTurn(prev.turn)
      setCaptures(prev.captures); setPrevBoardStr(prev.prevBoardStr)
      setHistory(history.slice(0, -2))
    } else {
      const last = history[history.length - 1]
      setBoard(last.board); setTurn(last.turn)
      setCaptures(last.captures); setPrevBoardStr(last.prevBoardStr)
      setHistory(history.slice(0, -1))
    }
    setPassCount(0); setLastMove(null); setMessage('')
  }

  const resetGame = () => {
    if (!window.confirm('현재 게임을 종료하고 새 게임을 시작할까요?')) return
    if (strengthKey != null) startGame(size, strengthKey)
  }

  const navigateBackInternal = useCallback(() => {
    if (strengthKey != null) { setStrengthKey(null); return }
    if (size != null) { setSize(null); return }
    onBack()
  }, [size, strengthKey, onBack])

  const depthRef = useRef(0)
  const currentDepth = getDepth(size, strengthKey)
  const handleBack = useCallback(() => {
    if (depthRef.current > 0) window.history.back()
    else onBack()
  }, [onBack])

  useEffect(() => {
    if (currentDepth > depthRef.current) {
      const prev = window.history.state || {}
      window.history.pushState({ ...prev, badukNeural: currentDepth }, '')
    }
    depthRef.current = currentDepth
  }, [currentDepth])

  useEffect(() => {
    const handler = () => { if (depthRef.current > 0) navigateBackInternal() }
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
        <div style={{ fontSize: 64, marginBottom: 12 }}>🧬</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>신경망 AI 바둑</h2>
        <p style={{ fontSize: 12, color: '#16A085', fontWeight: 600, marginBottom: 4 }}>
          CNN 정책망 + 가치망 + MCTS (PUCT)
        </p>
        <p style={{ fontSize: 11, color: '#888', marginBottom: 24 }}>
          WASM 모델 없이 브라우저 안에서 실시간 신경망 추론
        </p>
        {workerError && (
          <div style={{ padding: 10, background: '#FFF5F5', borderRadius: 8, fontSize: 12, color: '#E74C3C', marginBottom: 16 }}>
            ⚠️ {workerError}
          </div>
        )}
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>판 크기를 선택하세요</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 280, margin: '0 auto' }}>
          <button onClick={() => setSize(9)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #06D6A0, #05B384)' }}>
            9×9 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.9 }}>추천 (가장 빠름)</span>
          </button>
          <button onClick={() => setSize(13)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #4895EF, #3A7BD5)' }}>
            13×13 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.9 }}>중급</span>
          </button>
          <button onClick={() => setSize(19)}
            style={{ padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF', background: 'linear-gradient(135deg, #1a1a1a, #444)' }}>
            19×19 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.9 }}>정식 (느림)</span>
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#AAA', marginTop: 20, lineHeight: 1.5, maxWidth: 320, margin: '20px auto 0' }}>
          ※ 4-layer CNN (24 filter) + Residual + Policy/Value 헤드<br/>
          ※ 모바일에서도 가벼움. 사전 모델 다운로드 없음
        </p>
      </div>
    )
  }

  // ----- 강도 선택 -----
  if (size && strengthKey == null) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 크기 선택
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🧬</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>탐색 강도</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>{size}×{size} · 강도가 높을수록 느림</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320, margin: '0 auto' }}>
          {STRENGTHS.map(s => (
            <button key={s.key} onClick={() => startGame(size, s.key)}
              disabled={!workerReady}
              style={{
                padding: '14px 0', borderRadius: 14, border: 'none',
                cursor: workerReady ? 'pointer' : 'not-allowed',
                fontSize: 15, fontWeight: 700, color: '#FFF',
                background: s.color, opacity: workerReady ? 1 : 0.5,
                boxShadow: `0 2px 6px ${s.color}44`,
              }}>
              {s.label}
              <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2, opacity: 0.95 }}>{s.desc}</div>
            </button>
          ))}
        </div>
        {!workerReady && !workerError && (
          <p style={{ fontSize: 12, color: '#888', marginTop: 16 }}>⏳ 신경망 엔진 준비 중...</p>
        )}
      </div>
    )
  }

  // ----- 게임 -----
  const isPC = vw >= 768
  const maxCell = isPC
    ? (size === 19 ? 36 : size === 13 ? 50 : 64)
    : (size === 19 ? 20 : size === 13 ? 28 : 38)
  const effectiveWidth = isPC ? Math.min(vw - 40, 900) : vw - 32
  const cellSize = Math.min(Math.floor(effectiveWidth / size), maxCell)
  const boardPx = cellSize * (size - 1)
  const padding = cellSize

  const turnLabel = (() => {
    if (gameOver) return '종료'
    if (aiThinking) return '🧬 신경망 추론...'
    return turn === 'black' ? '내 차례' : 'AI 차례'
  })()

  const headerColor = strength?.color || '#16A085'

  return (
    <div className="fade-in" style={{ maxWidth: 520, margin: '0 auto', paddingBottom: '1rem' }}>
      <div style={{
        background: `linear-gradient(135deg, ${headerColor}, ${headerColor}CC)`,
        color: '#FFF', padding: '1rem 1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={handleBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 강도 선택
          </button>
          <span style={{ fontSize: 14, fontWeight: 700 }}>
            🧬 신경망 ({size}×{size})
            {strength && ` · ${strength.label}`}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={undo} disabled={aiThinking}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 12, borderRadius: 20, padding: '4px 10px', cursor: 'pointer', opacity: aiThinking ? 0.4 : 1 }}>↩</button>
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
          background: gameOver ? '#F1C40F' : aiThinking ? headerColor : turn === 'black' ? '#333' : '#FFF',
          color: gameOver ? '#333' : aiThinking ? '#FFF' : turn === 'black' ? '#FFF' : '#333',
          border: '1px solid #DDD', fontSize: 12, fontWeight: 600,
        }}>
          {turnLabel}
        </div>
        <div style={{ textAlign: 'center', fontWeight: turn === 'white' && !gameOver ? 700 : 400 }}>
          ⚪ 백(AI) <span style={{ fontSize: 11, color: '#888' }}>잡은돌 {captures.white}</span>
        </div>
      </div>

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

      {!gameOver && (
        <div style={{ textAlign: 'center', padding: '8px 0', display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={pass} disabled={turn !== 'black' || aiThinking}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: (turn !== 'black' || aiThinking) ? '#AAA' : '#555',
              color: '#FFF', fontSize: 14, fontWeight: 600,
            }}>
            패스 {passCount >= 1 ? '(양쪽 패스 시 종료)' : ''}
          </button>
          <button onClick={resign} disabled={turn !== 'black' || aiThinking}
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
              ? `⚪ 신경망 AI 승리! (기권)`
              : score.black > score.white
              ? `⚫ 승리! 신경망 AI를 이겼습니다!`
              : `⚪ 신경망 AI 승리! 다시 도전하세요!`}
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
                <div style={{ fontSize: 11, color: '#AAA' }}>돌 {score.whiteStones} + 집 {score.whiteTerritory} + 덤{score.komi}</div>
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
              강도 변경
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
