// KataGo TF.js (b10c128 ~약 1~2단) — 19x19 전용
import { useState, useCallback, useEffect, useRef } from 'react'
import { useViewportWidth } from '../utils/useViewportWidth'
import { unlock } from '../utils/achievements'
import {
  createBoard, getGroup, removeDeadStones, boardToString, countTerritory, STAR_POINTS,
} from '../utils/badukEngine'

const SIZE = 19
const KOMI = 7.5

export default function BadukKataGo({ onBack }) {
  const [level, setLevel] = useState(null) // 1~9, null이면 단 선택 화면
  const [board, setBoard] = useState(() => createBoard(SIZE))
  const [turn, setTurn] = useState('black')
  const [captures, setCaptures] = useState({ black: 0, white: 0 })
  const [lastMove, setLastMove] = useState(null)
  const [prevBoardStr, setPrevBoardStr] = useState('')
  const [passCount, setPassCount] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(null)
  const [history, setHistory] = useState([])
  const [moveLog, setMoveLog] = useState([]) // KataGo 입력용 최근 5수 [{r,c,color,pass?}]
  const [message, setMessage] = useState('')
  const [aiThinking, setAiThinking] = useState(false)
  const [loadStage, setLoadStage] = useState('init') // init|backend-ready|model-loading|model-ready|error
  const [loadError, setLoadError] = useState(null)

  const vw = useViewportWidth()
  const aiThinkingRef = useRef(false)
  const workerRef = useRef(null)
  const reqIdRef = useRef(0)

  useEffect(() => {
    try {
      const w = new Worker(
        new URL('../utils/kataGo/kataGoWorker.js', import.meta.url),
        { type: 'module' },
      )
      workerRef.current = w
      const handler = (e) => {
        const { type, stage, error, requestId } = e.data
        if (type === 'progress') {
          setLoadStage(stage)
          return
        }
        if (type === 'ready' && requestId === 'preload') {
          setLoadStage('model-ready')
          return
        }
        if (type === 'error' && requestId === 'preload') {
          setLoadError(error || '모델 로드 실패')
          setLoadStage('error')
        }
      }
      w.addEventListener('message', handler)
      w.postMessage({ type: 'preload', requestId: 'preload' })
      return () => {
        w.removeEventListener('message', handler)
        w.terminate()
        workerRef.current = null
      }
    } catch (e) {
      setLoadError(e.message || '엔진 초기화 실패')
      setLoadStage('error')
    }
  }, [])

  useEffect(() => {
    if (gameOver && score && score.black > score.white) {
      unlock('baduk_ai_win')
    }
  }, [gameOver, score])

  // AI 차례
  useEffect(() => {
    if (level == null) return
    if (turn !== 'white' || gameOver) return
    if (board.length === 0) return
    if (aiThinkingRef.current) return
    if (loadStage !== 'model-ready') return
    if (!workerRef.current) return

    aiThinkingRef.current = true
    setAiThinking(true)

    const applyMove = (move) => {
      if (move === null) {
        const newPassCount = passCount + 1
        let newGameOver = false
        let newScore = null
        if (newPassCount >= 2) {
          newScore = countTerritory(board, SIZE, KOMI)
          newGameOver = true
        }
        setHistory(prev => [...prev, { board: board.map(r => [...r]), turn: 'white', captures: { ...captures }, prevBoardStr, moveLog: [...moveLog] }])
        setMoveLog(prev => [...prev, { pass: true, color: 'white' }].slice(-5))
        setPassCount(newPassCount)
        setTurn('black')
        setMessage('⚪ 백(KataGo) 패스')
        if (newGameOver) { setScore(newScore); setGameOver(true); setMessage('') }
      } else {
        const [r, c] = move
        const testBoard = board.map(row => [...row])
        testBoard[r][c] = 'white'
        const afterCapture = removeDeadStones(testBoard, 'black', SIZE)
        const newBoard = afterCapture.board
        const newCaptured = afterCapture.captured
        const newCaptures = { ...captures, white: captures.white + newCaptured }
        const newPrevBoardStr = boardToString(board)

        setHistory(prev => [...prev, { board: board.map(r => [...r]), turn: 'white', captures: { ...captures }, prevBoardStr, moveLog: [...moveLog] }])
        setMoveLog(prev => [...prev, { r, c, color: 'white' }].slice(-5))
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
      if (e.data.type === 'error') {
        console.error('KataGo 추론 오류:', e.data.error)
        setMessage('AI 추론 오류 — 패스')
        applyMove(null)
        return
      }
      if (e.data.type === 'move') applyMove(e.data.move)
    }
    worker.addEventListener('message', handler)
    worker.postMessage({
      type: 'move',
      board, color: 'white',
      history: moveLog,
      prevBoardStr,
      komi: KOMI,
      level: level ?? 9,
      requestId,
    })

    return () => worker.removeEventListener('message', handler)
  }, [turn, gameOver, board, prevBoardStr, captures, passCount, moveLog, loadStage, level])

  const place = useCallback((r, c) => {
    if (loadStage !== 'model-ready') return
    if (level == null) return
    if (board[r][c] || gameOver) return
    if (turn !== 'black' || aiThinking) return

    const opp = 'white'
    const testBoard = board.map(row => [...row])
    testBoard[r][c] = turn
    const afterCapture = removeDeadStones(testBoard, opp, SIZE)
    const newBoard = afterCapture.board
    const newCaptured = afterCapture.captured

    const selfGroup = getGroup(newBoard, r, c, SIZE)
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

    setHistory([...history, { board: board.map(r => [...r]), turn, captures: { ...captures }, prevBoardStr, moveLog: [...moveLog] }])
    setMoveLog(prev => [...prev, { r, c, color: 'black' }].slice(-5))
    setPrevBoardStr(newPrevBoardStr)
    setBoard(newBoard)
    setLastMove([r, c])
    setCaptures(newCaptures)
    setPassCount(0)
    setTurn('white')
    setMessage('')
  }, [board, turn, gameOver, prevBoardStr, captures, history, moveLog, aiThinking, loadStage, level])

  const pass = () => {
    if (gameOver) return
    if (turn !== 'black' || aiThinking) return
    const newPassCount = passCount + 1
    let newGameOver = false; let newScore = null
    if (newPassCount >= 2) {
      newScore = countTerritory(board, SIZE, KOMI); newGameOver = true
    }
    setHistory([...history, { board: board.map(r => [...r]), turn, captures: { ...captures }, prevBoardStr, moveLog: [...moveLog] }])
    setMoveLog(prev => [...prev, { pass: true, color: 'black' }].slice(-5))
    setPassCount(newPassCount)
    setTurn('white')
    setMessage('⚫ 흑 패스')
    if (newGameOver) { setScore(newScore); setGameOver(true); setMessage('') }
  }

  const resign = () => {
    if (gameOver) return
    if (turn !== 'black' || aiThinking) return
    if (!window.confirm('정말 기권하시겠어요?')) return
    setScore({
      black: 0, white: 999, komi: KOMI,
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
      setMoveLog(prev.moveLog || [])
      setHistory(history.slice(0, -2))
    } else {
      const last = history[history.length - 1]
      setBoard(last.board); setTurn(last.turn)
      setCaptures(last.captures); setPrevBoardStr(last.prevBoardStr)
      setMoveLog(last.moveLog || [])
      setHistory(history.slice(0, -1))
    }
    setPassCount(0); setLastMove(null); setMessage('')
  }

  const resetGame = () => {
    if (!window.confirm('현재 게임을 종료하고 새 게임을 시작할까요?')) return
    setBoard(createBoard(SIZE))
    setTurn('black')
    setCaptures({ black: 0, white: 0 })
    setLastMove(null)
    setPrevBoardStr('')
    setPassCount(0)
    setGameOver(false)
    setScore(null)
    setHistory([])
    setMoveLog([])
    setMessage('')
    setAiThinking(false)
  }

  const changeLevel = () => {
    if (!gameOver && history.length > 0) {
      if (!window.confirm('현재 게임을 끝내고 단을 다시 고를까요?')) return
    }
    setLevel(null)
    setBoard(createBoard(SIZE))
    setTurn('black')
    setCaptures({ black: 0, white: 0 })
    setLastMove(null)
    setPrevBoardStr('')
    setPassCount(0)
    setGameOver(false)
    setScore(null)
    setHistory([])
    setMoveLog([])
    setMessage('')
    setAiThinking(false)
  }

  const LEVELS = [
    { v: 1, label: '1단', desc: '거의 무작위 · 입문자' },
    { v: 2, label: '2단', desc: '실수 잦음' },
    { v: 3, label: '3단', desc: '약함' },
    { v: 4, label: '4단', desc: '초·중급' },
    { v: 5, label: '5단', desc: '중급' },
    { v: 6, label: '6단', desc: '중상급' },
    { v: 7, label: '7단', desc: '상급' },
    { v: 8, label: '8단', desc: '최선에 가까움' },
    { v: 9, label: '9단', desc: '모델 한계 (top-1) · 가장 강함' },
  ]

  const isPC = vw >= 768
  const maxCell = isPC ? 36 : 20
  const effectiveWidth = isPC ? Math.min(vw - 40, 900) : vw - 32
  const cellSize = Math.min(Math.floor(effectiveWidth / SIZE), maxCell)
  const boardPx = cellSize * (SIZE - 1)
  const padding = cellSize

  // 로딩 화면
  if (loadStage !== 'model-ready') {
    const stageText = {
      'init': '엔진 초기화 중...',
      'backend-ready': 'WASM 백엔드 준비 완료',
      'model-loading': '모델 다운로드 중 (~12MB, 첫 1회만)...',
      'error': '오류',
    }[loadStage] || '준비 중...'
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>⚡</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>KataGo AI 바둑</h2>
        <p style={{ fontSize: 12, color: '#9B59B6', fontWeight: 600, marginBottom: 4 }}>
          KataGo 정책망 (b10c128) · 19×19 전용
        </p>
        <p style={{ fontSize: 11, color: '#888', marginBottom: 24 }}>
          약 1~2단 수준 · 한 수 ~5초
        </p>
        {loadError ? (
          <div style={{ padding: 14, background: '#FFF5F5', borderRadius: 10, fontSize: 13, color: '#E74C3C', marginBottom: 16 }}>
            ⚠️ {loadError}
          </div>
        ) : (
          <div style={{ padding: 14, background: '#F8F4FF', borderRadius: 10, fontSize: 13, color: '#6A1B9A', marginBottom: 16 }}>
            ⏳ {stageText}
          </div>
        )}
        <p style={{ fontSize: 11, color: '#AAA', lineHeight: 1.6 }}>
          ※ 모델 파일 첫 다운로드만 시간이 걸려요 (브라우저 캐시 후 즉시 사용)<br/>
          ※ 무료 · 오픈소스 KataGo 가중치 사용
        </p>
      </div>
    )
  }

  // 단 선택 화면
  if (level == null) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 12 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 56, marginBottom: 8 }}>⚡</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>KataGo · 단 선택</h2>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>19×19 · 같은 모델을 무작위성으로 약화</p>
        <p style={{ fontSize: 10, color: '#AAA', marginBottom: 16 }}>※ 상대적 난이도 표시 (실제 단급 ≠ 정확히 일치)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, maxWidth: 360, margin: '0 auto' }}>
          {LEVELS.map(l => {
            const intensity = l.v / 9
            const bg = `rgb(${Math.round(180 - 130*intensity)}, ${Math.round(120 - 90*intensity)}, ${Math.round(220 - 100*intensity)})`
            return (
              <button key={l.v} onClick={() => setLevel(l.v)}
                style={{
                  padding: '14px 4px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: bg, color: '#FFF',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  boxShadow: `0 2px 6px ${bg}55`,
                }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{l.label}</div>
                <div style={{ fontSize: 9, opacity: 0.95, lineHeight: 1.2 }}>{l.desc}</div>
              </button>
            )
          })}
        </div>
        <p style={{ fontSize: 11, color: '#AAA', marginTop: 16, lineHeight: 1.5 }}>
          9단: 정책망 그대로 (가장 강함)<br/>
          1단: top-50을 무작위로 → 입문자용
        </p>
      </div>
    )
  }

  const turnLabel = (() => {
    if (gameOver) return '종료'
    if (aiThinking) return '⚡ KataGo 수읽기...'
    return turn === 'black' ? '내 차례' : 'AI 차례'
  })()
  const headerColor = '#6A1B9A'

  return (
    <div className="fade-in" style={{ maxWidth: 520, margin: '0 auto', paddingBottom: '1rem' }}>
      <div style={{
        background: `linear-gradient(135deg, ${headerColor}, ${headerColor}CC)`,
        color: '#FFF', padding: '1rem 1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={changeLevel}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', fontSize: 14, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
            ← 단 변경
          </button>
          <span style={{ fontSize: 14, fontWeight: 700 }}>⚡ KataGo · {level}단</span>
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
          {Array.from({ length: SIZE }).map((_, i) => (
            <g key={`line-${i}`}>
              <line x1={padding} y1={padding + i * cellSize} x2={padding + (SIZE - 1) * cellSize} y2={padding + i * cellSize} stroke="#8B6914" strokeWidth={0.8} />
              <line x1={padding + i * cellSize} y1={padding} x2={padding + i * cellSize} y2={padding + (SIZE - 1) * cellSize} stroke="#8B6914" strokeWidth={0.8} />
            </g>
          ))}
          {(STAR_POINTS[SIZE] || []).map(([r, c]) => (
            <circle key={`dot-${r}-${c}`} cx={padding + c * cellSize} cy={padding + r * cellSize} r={2} fill="#8B6914" />
          ))}
          {board.map((row, r) => row.map((cell, c) => {
            if (!cell) return null
            const isLast = lastMove && lastMove[0] === r && lastMove[1] === c
            return (
              <g key={`stone-${r}-${c}`}>
                <circle cx={padding + c * cellSize} cy={padding + r * cellSize} r={cellSize * 0.44}
                  fill={cell === 'black' ? '#222' : '#FFF'} stroke={cell === 'black' ? '#000' : '#AAA'} strokeWidth={0.8} />
                {isLast && <circle cx={padding + c * cellSize} cy={padding + r * cellSize} r={2} fill="#E74C3C" />}
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
              ? `⚪ KataGo 승리! (기권)`
              : score.black > score.white
              ? `⚫ 승리! KataGo를 이겼습니다!`
              : `⚪ KataGo 승리! 다시 도전하세요!`}
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
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={resetGame}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#333', color: '#FFF', fontSize: 14, fontWeight: 600 }}>
              다시 하기
            </button>
            <button onClick={changeLevel}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#6A1B9A', color: '#FFF', fontSize: 14, fontWeight: 600 }}>
              단 변경
            </button>
            <button onClick={onBack}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F0F0F0', color: '#666', fontSize: 14, fontWeight: 600 }}>
              나가기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
