import { useState, useEffect, useMemo, useCallback } from 'react'

/**
 * 스도쿠 — 4x4(쉬움) / 6x6(중간) / 9x9(어려움)
 * - 랜덤 퍼즐 생성 (유효한 판 생성 + 셀 일부 제거)
 * - 힌트, 오답 체크, 타이머
 */

const STORAGE_KEY = 'sudoku-best-times'

function loadBestTimes() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} }
  catch { return {} }
}

function saveBestTime(difficulty, seconds) {
  const all = loadBestTimes()
  if (!all[difficulty] || seconds < all[difficulty]) {
    all[difficulty] = seconds
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    return true
  }
  return false
}

// --- Sudoku generator ---

function makeSolved(size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(0))
  const boxH = size === 4 ? 2 : size === 6 ? 2 : 3
  const boxW = size === 4 ? 2 : size === 6 ? 3 : 3
  solve(grid, 0, 0, size, boxH, boxW, true)
  return grid
}

function solve(grid, r, c, size, boxH, boxW, randomize) {
  if (r === size) return true
  const nr = c === size - 1 ? r + 1 : r
  const nc = c === size - 1 ? 0 : c + 1
  const nums = Array.from({ length: size }, (_, i) => i + 1)
  if (randomize) shuffle(nums)
  for (const n of nums) {
    if (valid(grid, r, c, n, size, boxH, boxW)) {
      grid[r][c] = n
      if (solve(grid, nr, nc, size, boxH, boxW, randomize)) return true
      grid[r][c] = 0
    }
  }
  return false
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
}

function valid(grid, r, c, n, size, boxH, boxW) {
  for (let i = 0; i < size; i++) {
    if (grid[r][i] === n || grid[i][c] === n) return false
  }
  const br = Math.floor(r / boxH) * boxH
  const bc = Math.floor(c / boxW) * boxW
  for (let i = 0; i < boxH; i++)
    for (let j = 0; j < boxW; j++)
      if (grid[br + i][bc + j] === n) return false
  return true
}

function makePuzzle(size, emptyCount) {
  const solved = makeSolved(size)
  // Deep copy
  const puzzle = solved.map(row => [...row])
  const positions = []
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) positions.push([r, c])
  shuffle(positions)
  let removed = 0
  for (const [r, c] of positions) {
    if (removed >= emptyCount) break
    puzzle[r][c] = 0
    removed++
  }
  return { puzzle, solved }
}

const DIFFICULTIES = {
  easy: { size: 4, empty: 6, label: '쉬움 (4×4)', color: '#06D6A0' },
  medium: { size: 6, empty: 14, label: '중간 (6×6)', color: '#F39C12' },
  hard: { size: 9, empty: 45, label: '어려움 (9×9)', color: '#EF476F' },
}

export default function Sudoku({ onBack }) {
  const [difficulty, setDifficulty] = useState(null)
  const [phase, setPhase] = useState('menu') // menu | playing | win
  const [initial, setInitial] = useState(null) // 처음 주어진 퍼즐 (고정 셀 구분)
  const [board, setBoard] = useState(null)
  const [solution, setSolution] = useState(null)
  const [selected, setSelected] = useState(null) // [r, c]
  const [startTime, setStartTime] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [hintsLeft, setHintsLeft] = useState(3)
  const [wrongCells, setWrongCells] = useState({}) // key "r,c" -> true (for showing wrong)
  const [bestTimes, setBestTimes] = useState({})

  useEffect(() => { setBestTimes(loadBestTimes()) }, [])

  const start = useCallback((diff) => {
    const { size, empty } = DIFFICULTIES[diff]
    const { puzzle, solved } = makePuzzle(size, empty)
    setDifficulty(diff)
    setInitial(puzzle.map(row => [...row]))
    setBoard(puzzle.map(row => [...row]))
    setSolution(solved)
    setSelected(null)
    setStartTime(Date.now())
    setElapsed(0)
    setMistakes(0)
    setHintsLeft(diff === 'hard' ? 5 : 3)
    setWrongCells({})
    setPhase('playing')
  }, [])

  // 타이머
  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 500)
    return () => clearInterval(id)
  }, [phase, startTime])

  // 완료 체크
  useEffect(() => {
    if (phase !== 'playing' || !board || !solution) return
    for (let r = 0; r < board.length; r++)
      for (let c = 0; c < board.length; c++)
        if (board[r][c] !== solution[r][c]) return
    // 완성!
    saveBestTime(difficulty, elapsed)
    setBestTimes(loadBestTimes())
    setPhase('win')
  }, [board, solution, phase, difficulty, elapsed])

  const inputNumber = (n) => {
    if (!selected || !initial) return
    const [r, c] = selected
    if (initial[r][c] !== 0) return // 고정 셀 수정 불가
    setBoard(prev => {
      const next = prev.map(row => [...row])
      next[r][c] = n
      return next
    })
    // 오답 체크
    const key = `${r},${c}`
    const wasWrong = !!wrongCells[key]
    const isWrong = n !== 0 && n !== solution[r][c]
    setWrongCells(prev => {
      const nxt = { ...prev }
      if (isWrong) nxt[key] = true
      else delete nxt[key]
      return nxt
    })
    // 같은 셀에 오답 → 정답 → 오답 반복해도 처음 틀렸을 때만 카운트하려면 아래 조건 유지
    if (isWrong && !wasWrong) {
      setMistakes(m => m + 1)
    }
  }

  const erase = () => inputNumber(0)

  const useHint = () => {
    if (!selected || hintsLeft <= 0) return
    const [r, c] = selected
    if (initial[r][c] !== 0) return
    setBoard(prev => {
      const next = prev.map(row => [...row])
      next[r][c] = solution[r][c]
      return next
    })
    setWrongCells(prev => {
      const nxt = { ...prev }
      delete nxt[`${r},${c}`]
      return nxt
    })
    setHintsLeft(h => h - 1)
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  // 메뉴
  if (phase === 'menu') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🧩</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>스도쿠</h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>난이도를 선택하세요</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300, margin: '0 auto' }}>
          {Object.keys(DIFFICULTIES).map(key => {
            const d = DIFFICULTIES[key]
            const best = bestTimes[key]
            return (
              <button key={key} onClick={() => start(key)}
                style={{
                  padding: '18px 20px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: d.color, color: '#FFF', textAlign: 'left',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{d.label}</div>
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                    빈 칸 {d.empty}개
                  </div>
                </div>
                {best && (
                  <div style={{
                    background: 'rgba(255,255,255,0.25)', borderRadius: 10,
                    padding: '4px 10px', fontSize: 12, fontWeight: 700,
                  }}>
                    ⏱ {formatTime(best)}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 승리 화면
  if (phase === 'win') {
    const isBest = bestTimes[difficulty] === elapsed
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{
          textAlign: 'center', padding: '32px 20px', borderRadius: 20,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          border: '2px solid #F1C40F', marginBottom: 20,
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>완성!</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#E67E22', marginBottom: 8 }}>
            {formatTime(elapsed)}
          </div>
          {isBest && (
            <div style={{ fontSize: 13, color: '#B7950B', fontWeight: 700 }}>
              🏆 최고 기록!
            </div>
          )}
          <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
            실수 {mistakes}번
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => start(difficulty)}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: 'none',
              background: DIFFICULTIES[difficulty].color, color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
            다시 풀기
          </button>
          <button onClick={() => setPhase('menu')}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: 'none',
              background: '#F0F0F0', color: '#555', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
            메뉴
          </button>
        </div>
      </div>
    )
  }

  // 플레이
  const size = board?.length || 4
  const boxH = size === 4 ? 2 : size === 6 ? 2 : 3
  const boxW = size === 4 ? 2 : size === 6 ? 3 : 3
  const cellSize = Math.min(Math.floor((Math.min(window.innerWidth, 480) - 32) / size), 52)

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setPhase('menu')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>
          ←
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>🧩 {DIFFICULTIES[difficulty].label}</h2>
        <div style={{ fontSize: 13, color: '#666' }}>
          ⏱ {formatTime(elapsed)} · 실수 {mistakes}
        </div>
      </div>

      {/* 보드 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
          background: '#2C3E50', gap: 1, padding: 2, borderRadius: 6,
        }}>
          {board.map((row, r) => row.map((v, c) => {
            const isFixed = initial[r][c] !== 0
            const isSelected = selected && selected[0] === r && selected[1] === c
            const isWrong = wrongCells[`${r},${c}`]
            const rightBorder = (c + 1) % boxW === 0 && c < size - 1
            const bottomBorder = (r + 1) % boxH === 0 && r < size - 1
            return (
              <button key={`${r}-${c}`}
                onClick={() => setSelected([r, c])}
                style={{
                  width: cellSize, height: cellSize, border: 'none',
                  background: isSelected ? '#FEF3C7'
                    : isWrong ? '#FFE4E6'
                    : isFixed ? '#ECEFF1' : '#FFF',
                  fontSize: cellSize * 0.45, fontWeight: isFixed ? 800 : 600,
                  color: isWrong ? '#C92A2A' : isFixed ? '#2C3E50' : '#1565C0',
                  cursor: 'pointer', padding: 0,
                  borderRight: rightBorder ? '2px solid #2C3E50' : 'none',
                  borderBottom: bottomBorder ? '2px solid #2C3E50' : 'none',
                }}>
                {v !== 0 ? v : ''}
              </button>
            )
          }))}
        </div>
      </div>

      {/* 숫자 버튼 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gap: 6, marginBottom: 10,
      }}>
        {Array.from({ length: size }).map((_, i) => (
          <button key={i + 1} onClick={() => inputNumber(i + 1)}
            disabled={!selected}
            style={{
              padding: '14px 0', borderRadius: 10, border: 'none',
              background: selected ? DIFFICULTIES[difficulty].color : '#EEE',
              color: selected ? '#FFF' : '#999',
              fontSize: 18, fontWeight: 800, cursor: selected ? 'pointer' : 'default',
              opacity: selected ? 1 : 0.5,
            }}>
            {i + 1}
          </button>
        ))}
      </div>

      {/* 보조 버튼 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={erase} disabled={!selected}
          style={{
            padding: '12px 0', borderRadius: 10, border: 'none',
            background: '#FDECEA', color: '#C0392B', fontSize: 14, fontWeight: 700,
            cursor: selected ? 'pointer' : 'default', opacity: selected ? 1 : 0.5,
          }}>
          ⌫ 지우기
        </button>
        <button onClick={useHint} disabled={!selected || hintsLeft <= 0}
          style={{
            padding: '12px 0', borderRadius: 10, border: 'none',
            background: hintsLeft > 0 ? '#FFF3CD' : '#EEE',
            color: hintsLeft > 0 ? '#856404' : '#999',
            fontSize: 14, fontWeight: 700,
            cursor: (selected && hintsLeft > 0) ? 'pointer' : 'default',
            opacity: (selected && hintsLeft > 0) ? 1 : 0.5,
          }}>
          💡 힌트 ({hintsLeft})
        </button>
      </div>
    </div>
  )
}
