import { useState, useCallback, useEffect, useRef } from 'react'
import { LESSONS_1 } from '../data/badukLessons1'
import { LESSONS_2 } from '../data/badukLessons2'
import { LESSONS_3 } from '../data/badukLessons3'
import { LESSONS_4 } from '../data/badukLessons4'

const ALL_LESSONS = [...LESSONS_1, ...LESSONS_2, ...LESSONS_3, ...LESSONS_4]

const STORAGE_KEY = 'baduk-classroom-progress'

const CATEGORIES = [
  { name: '입문', emoji: '🌱', color: '#27AE60' },
  { name: '기초', emoji: '⭐', color: '#F39C12' },
  { name: '연결', emoji: '🔗', color: '#3498DB' },
  { name: '영토', emoji: '🏠', color: '#8E44AD' },
  { name: '눈', emoji: '👁️', color: '#1ABC9C' },
  { name: '사활', emoji: '💀', color: '#E74C3C' },
  { name: '규칙', emoji: '📖', color: '#2C3E50' },
  { name: '전략', emoji: '🎯', color: '#E67E22' },
  { name: '중급사활', emoji: '🔥', color: '#C0392B' },
  { name: '실전', emoji: '🏆', color: '#D4AC0D' },
]

const STAR_POINTS = {
  5: [[2, 2]],
  7: [[3, 3]],
  9: [[2, 2], [2, 6], [4, 4], [6, 2], [6, 6]],
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed.completedLessons || []
    }
  } catch (e) { /* ignore */ }
  return []
}

function saveProgress(completedLessons) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedLessons }))
}

// ============================================================
// SVG Board Component
// ============================================================

function BadukBoard({
  boardSize,
  setup,
  onCellClick,
  hoverCell,
  onHoverCell,
  placedStone,
  correctCell,
  wrongCell,
  interactive,
  playerColor = 'black',
}) {
  const size = boardSize
  const maxCell = size <= 5 ? 56 : size <= 7 ? 44 : 36
  const cellSize = Math.min(Math.floor((Math.min(window.innerWidth, 480) - 48) / size), maxCell)
  const boardPx = cellSize * (size - 1)
  const padding = cellSize
  const stoneRadius = cellSize * 0.44
  const svgSize = boardPx + padding * 2

  return (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      style={{ background: '#DCB35C', borderRadius: 10, display: 'block', margin: '0 auto', maxWidth: '100%' }}
    >
      {/* Grid lines */}
      {Array.from({ length: size }).map((_, i) => (
        <g key={`line-${i}`}>
          <line
            x1={padding} y1={padding + i * cellSize}
            x2={padding + (size - 1) * cellSize} y2={padding + i * cellSize}
            stroke="#8B6914" strokeWidth={0.8}
          />
          <line
            x1={padding + i * cellSize} y1={padding}
            x2={padding + i * cellSize} y2={padding + (size - 1) * cellSize}
            stroke="#8B6914" strokeWidth={0.8}
          />
        </g>
      ))}

      {/* Star points */}
      {(STAR_POINTS[size] || []).map(([r, c]) => (
        <circle
          key={`dot-${r}-${c}`}
          cx={padding + c * cellSize} cy={padding + r * cellSize}
          r={2.5} fill="#8B6914"
        />
      ))}

      {/* Setup stones - black */}
      {(setup.black || []).map(([r, c]) => (
        <circle
          key={`sb-${r}-${c}`}
          cx={padding + c * cellSize} cy={padding + r * cellSize}
          r={stoneRadius}
          fill="#222" stroke="#000" strokeWidth={0.8}
        />
      ))}

      {/* Setup stones - white */}
      {(setup.white || []).map(([r, c]) => (
        <circle
          key={`sw-${r}-${c}`}
          cx={padding + c * cellSize} cy={padding + r * cellSize}
          r={stoneRadius}
          fill="#FFF" stroke="#AAA" strokeWidth={0.8}
        />
      ))}

      {/* Placed stone (correct answer) */}
      {placedStone && (
        <g>
          <circle
            cx={padding + placedStone[1] * cellSize} cy={padding + placedStone[0] * cellSize}
            r={stoneRadius}
            fill={playerColor === 'black' ? '#222' : '#FFF'}
            stroke={playerColor === 'black' ? '#000' : '#AAA'}
            strokeWidth={0.8}
          >
            <animate attributeName="r" from={stoneRadius * 0.5} to={stoneRadius} dur="0.25s" fill="freeze" />
            <animate attributeName="opacity" from="0.5" to="1" dur="0.25s" fill="freeze" />
          </circle>
          {/* Green glow for correct */}
          {correctCell && correctCell[0] === placedStone[0] && correctCell[1] === placedStone[1] && (
            <circle
              cx={padding + placedStone[1] * cellSize} cy={padding + placedStone[0] * cellSize}
              r={stoneRadius + 4}
              fill="none" stroke="#27AE60" strokeWidth={3} opacity={0.7}
            >
              <animate attributeName="opacity" from="0.9" to="0" dur="1s" fill="freeze" />
              <animate attributeName="r" from={stoneRadius + 2} to={stoneRadius + 10} dur="1s" fill="freeze" />
            </circle>
          )}
        </g>
      )}

      {/* Wrong cell red flash */}
      {wrongCell && (
        <circle
          cx={padding + wrongCell[1] * cellSize} cy={padding + wrongCell[0] * cellSize}
          r={stoneRadius}
          fill="#E74C3C" opacity={0.5}
        >
          <animate attributeName="opacity" from="0.6" to="0" dur="0.6s" fill="freeze" />
        </circle>
      )}

      {/* Hover preview stone */}
      {interactive && hoverCell && !placedStone && (
        <circle
          cx={padding + hoverCell[1] * cellSize} cy={padding + hoverCell[0] * cellSize}
          r={stoneRadius}
          fill={playerColor === 'black' ? '#222' : '#FFF'}
          stroke={playerColor === 'black' ? '#000' : '#AAA'}
          strokeWidth={0.8}
          opacity={0.35}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Click targets */}
      {interactive && !placedStone && Array.from({ length: size }).map((_, r) =>
        Array.from({ length: size }).map((_, c) => {
          // Skip cells that have setup stones
          const hasBlack = (setup.black || []).some(([br, bc]) => br === r && bc === c)
          const hasWhite = (setup.white || []).some(([wr, wc]) => wr === r && wc === c)
          if (hasBlack || hasWhite) return null
          return (
            <rect
              key={`click-${r}-${c}`}
              x={padding + c * cellSize - cellSize / 2}
              y={padding + r * cellSize - cellSize / 2}
              width={cellSize} height={cellSize}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={() => onCellClick && onCellClick(r, c)}
              onMouseEnter={() => onHoverCell && onHoverCell([r, c])}
              onMouseLeave={() => onHoverCell && onHoverCell(null)}
              onTouchStart={(e) => {
                e.preventDefault()
                onHoverCell && onHoverCell([r, c])
              }}
              onTouchEnd={(e) => {
                e.preventDefault()
                onCellClick && onCellClick(r, c)
                onHoverCell && onHoverCell(null)
              }}
            />
          )
        })
      )}
    </svg>
  )
}

// ============================================================
// Number Picker for 'count' type puzzles
// ============================================================

function NumberPicker({ onSelect, selected, disabled }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, padding: '12px 0',
    }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <button
          key={i}
          onClick={() => !disabled && onSelect(i)}
          disabled={disabled}
          style={{
            width: 48, height: 48, borderRadius: 12, border: '2px solid',
            borderColor: selected === i ? '#3498DB' : '#DDD',
            background: selected === i ? '#EBF5FB' : '#FFF',
            fontSize: 20, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
            color: '#2C3E50',
            transition: 'all 0.15s',
            transform: selected === i ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          {i}
        </button>
      ))}
    </div>
  )
}

// ============================================================
// Confetti Effect
// ============================================================

function Confetti() {
  const colors = ['#F1C40F', '#E74C3C', '#3498DB', '#27AE60', '#9B59B6', '#E67E22', '#1ABC9C']
  const particles = useRef(
    Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random() * 1.5,
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    }))
  ).current

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 999, overflow: 'hidden' }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: -20,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.size > 10 ? '50%' : 2,
            transform: `rotate(${p.rotation}deg)`,
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function BadukClassroom({ onBack }) {
  const [completedLessons, setCompletedLessons] = useState(() => loadProgress())
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [phase, setPhase] = useState('list') // 'list' | 'explanation' | 'puzzle' | 'complete'
  const [currentPuzzleIdx, setCurrentPuzzleIdx] = useState(0)
  const [hoverCell, setHoverCell] = useState(null)
  const [placedStone, setPlacedStone] = useState(null)
  const [correctCell, setCorrectCell] = useState(null)
  const [wrongCell, setWrongCell] = useState(null)
  const [showHint, setShowHint] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState(null)
  const [feedbackType, setFeedbackType] = useState(null) // 'correct' | 'wrong'
  const [countAnswer, setCountAnswer] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const isLessonUnlocked = useCallback((lessonId) => {
    if (lessonId === 1) return true
    return completedLessons.includes(lessonId - 1)
  }, [completedLessons])

  const completeLesson = useCallback((lessonId) => {
    setCompletedLessons(prev => {
      if (prev.includes(lessonId)) return prev
      const next = [...prev, lessonId]
      saveProgress(next)
      return next
    })
  }, [])

  const resetProgress = useCallback(() => {
    if (window.confirm('모든 진행도를 초기화할까요?')) {
      setCompletedLessons([])
      saveProgress([])
    }
  }, [])

  const selectLesson = useCallback((lesson) => {
    if (!isLessonUnlocked(lesson.id)) return
    setSelectedLesson(lesson)
    setPhase('explanation')
    setCurrentPuzzleIdx(0)
    setPlacedStone(null)
    setCorrectCell(null)
    setWrongCell(null)
    setShowHint(false)
    setFeedbackMsg(null)
    setFeedbackType(null)
    setCountAnswer(null)
  }, [isLessonUnlocked])

  const startPuzzles = useCallback(() => {
    setPhase('puzzle')
    setCurrentPuzzleIdx(0)
    resetPuzzleState()
  }, [])

  const resetPuzzleState = () => {
    setPlacedStone(null)
    setCorrectCell(null)
    setWrongCell(null)
    setShowHint(false)
    setFeedbackMsg(null)
    setFeedbackType(null)
    setCountAnswer(null)
    setHoverCell(null)
  }

  const currentPuzzle = selectedLesson?.puzzles?.[currentPuzzleIdx] || null

  const handleCellClick = useCallback((r, c) => {
    if (!currentPuzzle || currentPuzzle.type !== 'place') return
    if (feedbackType === 'correct') return

    const answer = currentPuzzle.answer
    if (r === answer[0] && c === answer[1]) {
      setPlacedStone([r, c])
      setCorrectCell([r, c])
      setFeedbackMsg(currentPuzzle.correctMsg || '정답입니다!')
      setFeedbackType('correct')
      setWrongCell(null)
    } else {
      setWrongCell([r, c])
      setFeedbackMsg(currentPuzzle.wrongMsg || '다시 해보세요!')
      setFeedbackType('wrong')
      setTimeout(() => setWrongCell(null), 700)
    }
  }, [currentPuzzle, feedbackType])

  const handleCountSelect = useCallback((num) => {
    if (!currentPuzzle || currentPuzzle.type !== 'count') return
    if (feedbackType === 'correct') return

    setCountAnswer(num)
    if (num === currentPuzzle.answer) {
      setFeedbackMsg(currentPuzzle.correctMsg || '정답입니다!')
      setFeedbackType('correct')
    } else {
      setFeedbackMsg(currentPuzzle.wrongMsg || '다시 해보세요!')
      setFeedbackType('wrong')
    }
  }, [currentPuzzle, feedbackType])

  const nextPuzzle = useCallback(() => {
    if (!selectedLesson) return
    const nextIdx = currentPuzzleIdx + 1
    if (nextIdx >= selectedLesson.puzzles.length) {
      completeLesson(selectedLesson.id)
      setPhase('complete')
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3500)
    } else {
      setCurrentPuzzleIdx(nextIdx)
      resetPuzzleState()
    }
  }, [currentPuzzleIdx, selectedLesson, completeLesson])

  const goToList = useCallback(() => {
    setPhase('list')
    setSelectedLesson(null)
  }, [])

  // Group lessons by category
  const groupedLessons = CATEGORIES.map(cat => ({
    ...cat,
    lessons: ALL_LESSONS.filter(l => l.category === cat.name),
  })).filter(g => g.lessons.length > 0)

  // ============================================================
  // Render: Lesson List
  // ============================================================
  if (phase === 'list') {
    const completedCount = completedLessons.length
    const totalCount = ALL_LESSONS.length
    const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

    return (
      <div style={{ minHeight: '100vh', background: '#FEFCF6', padding: '0 0 40px 0' }}>
        {/* Header */}
        <div style={{
          background: '#FFF', borderBottom: '1px solid #EEE', padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10,
        }}>
          <button
            onClick={onBack}
            style={{
              background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
              padding: '4px 8px', borderRadius: 8, color: '#555',
            }}
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#2C3E50' }}>바둑 교실</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              {completedCount}/{totalCount} 완료
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '16px 16px 8px' }}>
          <div style={{
            background: '#EEE', borderRadius: 10, height: 10, overflow: 'hidden',
          }}>
            <div style={{
              background: 'linear-gradient(90deg, #F1C40F, #E67E22)',
              width: `${progressPct}%`,
              height: '100%',
              borderRadius: 10,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Category groups */}
        <div style={{ padding: '8px 16px' }}>
          {groupedLessons.map(group => (
            <div key={group.name} style={{ marginBottom: 20 }}>
              {/* Category header */}
              <div style={{
                display: 'inline-block',
                background: group.color,
                color: '#FFF',
                padding: '4px 14px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 10,
              }}>
                {group.emoji} {group.name}
              </div>

              {/* Lesson cards grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 10,
              }}>
                {group.lessons.map(lesson => {
                  const unlocked = isLessonUnlocked(lesson.id)
                  const completed = completedLessons.includes(lesson.id)
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => selectLesson(lesson)}
                      disabled={!unlocked}
                      style={{
                        background: unlocked ? '#FFF' : '#F0EFED',
                        border: completed ? '2px solid #F1C40F' : '1px solid #E8E6E1',
                        borderRadius: 12,
                        padding: '14px 10px',
                        cursor: unlocked ? 'pointer' : 'default',
                        textAlign: 'center',
                        opacity: unlocked ? 1 : 0.5,
                        boxShadow: unlocked ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        position: 'relative',
                      }}
                      onMouseEnter={e => { if (unlocked) e.currentTarget.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
                    >
                      {completed && (
                        <div style={{
                          position: 'absolute', top: 6, right: 8,
                          fontSize: 16, color: '#F1C40F',
                        }}>
                          ⭐
                        </div>
                      )}
                      {!unlocked && (
                        <div style={{
                          position: 'absolute', top: 6, right: 8,
                          fontSize: 14, color: '#AAA',
                        }}>
                          🔒
                        </div>
                      )}
                      <div style={{
                        fontSize: 12, color: '#999', fontWeight: 600, marginBottom: 4,
                      }}>
                        #{lesson.id}
                      </div>
                      <div style={{
                        fontSize: 14, fontWeight: 700,
                        color: unlocked ? '#2C3E50' : '#AAA',
                        lineHeight: 1.3,
                      }}>
                        {lesson.title}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Reset button */}
        <div style={{ textAlign: 'center', padding: '24px 16px 0' }}>
          <button
            onClick={resetProgress}
            style={{
              background: 'none', border: 'none', color: '#BBB',
              fontSize: 13, cursor: 'pointer', padding: '8px 16px',
            }}
          >
            🔄 진행도 초기화
          </button>
        </div>
      </div>
    )
  }

  // ============================================================
  // Render: Explanation Phase
  // ============================================================
  if (phase === 'explanation') {
    return (
      <div style={{ minHeight: '100vh', background: '#FEFCF6', padding: '0 0 40px 0' }}>
        {/* Header */}
        <div style={{
          background: '#FFF', borderBottom: '1px solid #EEE', padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <button
            onClick={goToList}
            style={{
              background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
              padding: '4px 8px', borderRadius: 8, color: '#555',
            }}
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#999', fontWeight: 600 }}>레슨 #{selectedLesson.id}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#2C3E50' }}>{selectedLesson.title}</div>
          </div>
          <div style={{
            background: CATEGORIES.find(c => c.name === selectedLesson.category)?.color || '#888',
            color: '#FFF', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
          }}>
            {selectedLesson.category}
          </div>
        </div>

        {/* Explanation content */}
        <div style={{ padding: '24px 20px', maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: 15, color: '#888', fontWeight: 700, marginBottom: 8 }}>📖 설명</div>
          <div style={{
            background: '#FFF',
            borderRadius: 16,
            padding: '24px 20px',
            fontSize: 17,
            lineHeight: 1.8,
            color: '#333',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            whiteSpace: 'pre-line',
          }}>
            {selectedLesson.explanation}
          </div>

          {/* Start puzzles button */}
          <button
            onClick={startPuzzles}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 24,
              padding: '16px 0',
              borderRadius: 14,
              border: 'none',
              cursor: 'pointer',
              fontSize: 17,
              fontWeight: 800,
              color: '#FFF',
              background: 'linear-gradient(135deg, #4895EF, #3A7BD5)',
              boxShadow: '0 4px 12px rgba(72,149,239,0.3)',
            }}
          >
            연습 시작하기 →
          </button>
        </div>
      </div>
    )
  }

  // ============================================================
  // Render: Puzzle Phase
  // ============================================================
  if (phase === 'puzzle' && currentPuzzle) {
    const totalPuzzles = selectedLesson.puzzles.length
    const isCorrect = feedbackType === 'correct'
    const isWrong = feedbackType === 'wrong'

    return (
      <div style={{ minHeight: '100vh', background: '#FEFCF6', padding: '0 0 40px 0' }}>
        {/* Header */}
        <div style={{
          background: '#FFF', borderBottom: '1px solid #EEE', padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <button
            onClick={goToList}
            style={{
              background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
              padding: '4px 8px', borderRadius: 8, color: '#555',
            }}
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#999', fontWeight: 600 }}>
              레슨 #{selectedLesson.id} - {selectedLesson.title}
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 8, padding: '14px 0 6px',
        }}>
          {Array.from({ length: totalPuzzles }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 10, height: 10, borderRadius: '50%',
                background: i < currentPuzzleIdx ? '#27AE60'
                  : i === currentPuzzleIdx ? '#3498DB'
                  : '#DDD',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {/* Goal text */}
        <div style={{
          textAlign: 'center', padding: '10px 20px 14px',
          fontSize: 16, fontWeight: 700, color: '#2C3E50',
          lineHeight: 1.5,
        }}>
          {currentPuzzle.goal}
        </div>

        {/* Board */}
        <div style={{ padding: '0 12px', display: 'flex', justifyContent: 'center' }}>
          <BadukBoard
            boardSize={selectedLesson.boardSize}
            setup={currentPuzzle.setup || { black: [], white: [] }}
            onCellClick={currentPuzzle.type === 'place' ? handleCellClick : undefined}
            hoverCell={hoverCell}
            onHoverCell={currentPuzzle.type === 'place' ? setHoverCell : undefined}
            placedStone={placedStone}
            correctCell={correctCell}
            wrongCell={wrongCell}
            interactive={currentPuzzle.type === 'place' && !isCorrect}
          />
        </div>

        {/* Number picker for count type */}
        {currentPuzzle.type === 'count' && (
          <div style={{ padding: '12px 20px', maxWidth: 400, margin: '0 auto' }}>
            <NumberPicker
              onSelect={handleCountSelect}
              selected={countAnswer}
              disabled={isCorrect}
            />
          </div>
        )}

        {/* Hint button */}
        {!showHint && !isCorrect && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <button
              onClick={() => setShowHint(true)}
              style={{
                background: '#FFF8E1', border: '1px solid #F9E79F',
                borderRadius: 20, padding: '8px 20px', fontSize: 14,
                fontWeight: 600, color: '#F39C12', cursor: 'pointer',
              }}
            >
              💡 힌트
            </button>
          </div>
        )}

        {/* Hint text */}
        {showHint && !isCorrect && (
          <div style={{
            margin: '8px 20px', padding: '12px 16px',
            background: '#FFF8E1', borderRadius: 12, border: '1px solid #F9E79F',
            fontSize: 14, color: '#8B6914', textAlign: 'center',
            lineHeight: 1.5,
          }}>
            💡 {currentPuzzle.hint}
          </div>
        )}

        {/* Feedback message */}
        {feedbackMsg && (
          <div style={{
            margin: '12px 20px', padding: '16px 20px',
            background: isCorrect ? '#EAFAF1' : '#FDEDEC',
            borderRadius: 14,
            border: `1px solid ${isCorrect ? '#A9DFBF' : '#F5B7B1'}`,
            textAlign: 'center',
            animation: isWrong && !isCorrect ? 'shakeX 0.4s ease' : undefined,
          }}>
            <div style={{
              fontSize: 18, fontWeight: 800, marginBottom: 6,
              color: isCorrect ? '#27AE60' : '#E74C3C',
            }}>
              {isCorrect ? '정답! 🎉' : '다시 해보세요'}
            </div>
            <div style={{
              fontSize: 14, color: '#555', lineHeight: 1.5,
            }}>
              {feedbackMsg}
            </div>

            {isCorrect && (
              <button
                onClick={nextPuzzle}
                style={{
                  marginTop: 14, padding: '12px 32px',
                  borderRadius: 12, border: 'none', cursor: 'pointer',
                  fontSize: 15, fontWeight: 700, color: '#FFF',
                  background: 'linear-gradient(135deg, #27AE60, #229954)',
                  boxShadow: '0 3px 10px rgba(39,174,96,0.3)',
                }}
              >
                {currentPuzzleIdx + 1 >= totalPuzzles ? '완료하기 ⭐' : '다음 →'}
              </button>
            )}
          </div>
        )}

        {/* Shake animation */}
        <style>{`
          @keyframes shakeX {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-5px); }
            80% { transform: translateX(5px); }
          }
        `}</style>
      </div>
    )
  }

  // ============================================================
  // Render: Completion Phase
  // ============================================================
  if (phase === 'complete') {
    return (
      <div style={{
        minHeight: '100vh', background: '#FEFCF6',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px', textAlign: 'center',
      }}>
        {showConfetti && <Confetti />}

        <div style={{
          fontSize: 72, marginBottom: 16,
          animation: 'starPop 0.5s ease-out',
        }}>
          ⭐
        </div>

        <div style={{
          fontSize: 28, fontWeight: 900, color: '#2C3E50', marginBottom: 8,
        }}>
          레슨 완료!
        </div>

        <div style={{
          fontSize: 16, color: '#888', marginBottom: 8,
        }}>
          #{selectedLesson.id} {selectedLesson.title}
        </div>

        <div style={{
          fontSize: 15, color: '#AAA', marginBottom: 36,
        }}>
          모든 문제를 풀었어요!
        </div>

        {/* Next lesson button (if available) */}
        {(() => {
          const nextLesson = ALL_LESSONS.find(l => l.id === selectedLesson.id + 1)
          if (!nextLesson) return null
          return (
            <button
              onClick={() => selectLesson(nextLesson)}
              style={{
                width: '100%', maxWidth: 320, marginBottom: 12,
                padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                fontSize: 16, fontWeight: 800, color: '#FFF',
                background: 'linear-gradient(135deg, #4895EF, #3A7BD5)',
                boxShadow: '0 4px 12px rgba(72,149,239,0.3)',
              }}
            >
              다음 레슨 →
            </button>
          )
        })()}

        <button
          onClick={goToList}
          style={{
            width: '100%', maxWidth: 320,
            padding: '16px 0', borderRadius: 14,
            border: '2px solid #DDD', background: '#FFF',
            cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#666',
          }}
        >
          목록으로 돌아가기
        </button>

        <style>{`
          @keyframes starPop {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.3); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  // Fallback
  return null
}
