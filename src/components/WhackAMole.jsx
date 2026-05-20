import { useState, useEffect, useRef, useCallback } from 'react'
import { CHILD1, CHILD2 } from '../config/names'
import { submitQuizScore } from '../api/api'
import { unlock } from '../utils/achievements'
import { playSuccess, playWin } from '../utils/sounds'

const GAME_SECONDS = 30
const GRID = 9 // 3x3
const PLAYER_KEY = 'whack-mole-player'
const BEST_KEY_PREFIX = 'whack-mole-best-'

function thisYearMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function loadBest(player) {
  try { return Number(localStorage.getItem(BEST_KEY_PREFIX + player)) || 0 }
  catch { return 0 }
}

function saveBest(player, score) {
  try { localStorage.setItem(BEST_KEY_PREFIX + player, String(score)) } catch (_) {}
}

export default function WhackAMole({ onBack }) {
  const [player, setPlayer] = useState(() => {
    try { return localStorage.getItem(PLAYER_KEY) } catch { return null }
  })
  const [phase, setPhase] = useState('menu') // menu | playing | result
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS)
  const [activeIdx, setActiveIdx] = useState(-1) // 현재 두더지 위치
  const [hits, setHits] = useState({}) // idx -> timestamp for visual 'whacked' feedback
  const [best, setBest] = useState(0)
  const gameTimerRef = useRef(null)
  const moleTimerRef = useRef(null)

  useEffect(() => { if (player) setBest(loadBest(player)) }, [player])

  const choosePlayer = (name) => {
    setPlayer(name)
    try { localStorage.setItem(PLAYER_KEY, name) } catch (_) {}
    setBest(loadBest(name))
  }

  const start = useCallback(() => {
    setScore(0)
    setTimeLeft(GAME_SECONDS)
    setActiveIdx(-1)
    setHits({})
    setPhase('playing')
  }, [])

  // 게임 타이머
  useEffect(() => {
    if (phase !== 'playing') return
    gameTimerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(gameTimerRef.current)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(gameTimerRef.current)
  }, [phase])

  // 두더지 스폰 타이머
  useEffect(() => {
    if (phase !== 'playing' || timeLeft === 0) return
    const spawn = () => {
      setActiveIdx(Math.floor(Math.random() * GRID))
    }
    spawn()
    moleTimerRef.current = setInterval(() => {
      setActiveIdx(prev => {
        let next
        do { next = Math.floor(Math.random() * GRID) } while (next === prev)
        return next
      })
    }, 800)
    return () => clearInterval(moleTimerRef.current)
  }, [phase, timeLeft])

  // 시간 종료 → 결과
  useEffect(() => {
    if (phase !== 'playing' || timeLeft > 0) return
    clearInterval(moleTimerRef.current)
    setActiveIdx(-1)
    const finalScore = score
    if (finalScore > best) {
      saveBest(player, finalScore)
      setBest(finalScore)
    }
    // 서버 리더보드 기록
    if (player) {
      submitQuizScore({
        userName: player,
        quizId: 'whack-mole',
        grade: null,
        score: finalScore,
        maxScore: 100,
        yearMonth: thisYearMonth(),
      }).catch(() => { /* skip */ })
    }
    // 업적
    if (finalScore >= 20) unlock('whack_mole_20')
    if (finalScore >= 40) unlock('whack_mole_40')
    playWin()
    setPhase('result')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase])

  const whack = (idx) => {
    if (phase !== 'playing' || idx !== activeIdx) return
    playSuccess()
    setScore(s => s + 1)
    setHits(h => ({ ...h, [idx]: Date.now() }))
    setActiveIdx(-1)
    setTimeout(() => setHits(h => { const x = { ...h }; delete x[idx]; return x }), 200)
  }

  // 플레이어 선택 화면
  if (!player) {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🐹</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>두더지 게임</h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>누가 플레이하나요?</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {[CHILD1, CHILD2].map((name, i) => (
            <button key={name} onClick={() => choosePlayer(name)}
              style={{
                padding: '18px 28px', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: i === 0 ? 'linear-gradient(135deg, #4895EF, #3A7BD5)' : 'linear-gradient(135deg, #EF476F, #D63B5C)',
                color: '#FFF', fontSize: 17, fontWeight: 700, minWidth: 120,
              }}>
              {name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 메뉴
  if (phase === 'menu') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={onBack}
            style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer' }}>
            ← 돌아가기
          </button>
          <button onClick={() => { try { localStorage.removeItem(PLAYER_KEY) } catch (_) {}; setPlayer(null) }}
            style={{ background: '#F5F5F5', border: 'none', borderRadius: 12, fontSize: 12, padding: '5px 12px', cursor: 'pointer', color: '#666' }}>
            👤 {player} (바꾸기)
          </button>
        </div>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🐹</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>두더지 게임</h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 8, lineHeight: 1.6 }}>
          30초 동안 두더지를 빨리 때려보세요!<br />
          나온 두더지를 탭하면 +1점
        </p>
        <div style={{
          display: 'inline-block', padding: '8px 16px', borderRadius: 20,
          background: '#FFF3CD', fontSize: 13, fontWeight: 600, color: '#856404', marginBottom: 24,
        }}>
          최고 점수: {best}점
        </div>
        <div style={{ maxWidth: 300, margin: '0 auto' }}>
          <button onClick={start}
            style={{
              width: '100%', padding: '18px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
              fontSize: 17, fontWeight: 700, color: '#FFF',
              background: 'linear-gradient(135deg, #E67E22, #D35400)',
            }}>
            🎯 시작!
          </button>
        </div>
      </div>
    )
  }

  // 결과
  if (phase === 'result') {
    const isNewBest = score >= best && score > 0
    const emoji = score >= 40 ? '🏆' : score >= 25 ? '🥇' : score >= 15 ? '🥈' : score >= 5 ? '🥉' : '💪'
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{
          textAlign: 'center', padding: '32px 20px', borderRadius: 20,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          border: '2px solid #F1C40F', marginBottom: 20,
        }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>{emoji}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{player}의 기록</div>
          <div style={{ fontSize: 48, fontWeight: 700, color: '#E67E22' }}>{score}점</div>
          {isNewBest && (
            <div style={{ fontSize: 13, color: '#B7950B', fontWeight: 700, marginTop: 8 }}>
              🎉 신기록!
            </div>
          )}
          <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
            최고: {best}점
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={start}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#E67E22', color: '#FFF', fontSize: 15, fontWeight: 700,
            }}>
            다시 도전
          </button>
          <button onClick={() => setPhase('menu')}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#F0F0F0', color: '#555', fontSize: 15, fontWeight: 700,
            }}>
            메뉴로
          </button>
        </div>
      </div>
    )
  }

  // 플레이 화면
  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', background: 'linear-gradient(135deg, #E67E22, #D35400)',
        borderRadius: 14, color: '#FFF', marginBottom: 16,
      }}>
        <div style={{ fontSize: 15 }}>
          ⏱ <b>{timeLeft}초</b>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>🎯 {score}점</div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        padding: '16px',
        background: 'linear-gradient(180deg, #7CB342, #558B2F)',
        borderRadius: 20,
      }}>
        {Array.from({ length: GRID }).map((_, idx) => {
          const isActive = idx === activeIdx
          const wasHit = hits[idx]
          return (
            <button key={idx} onClick={() => whack(idx)}
              style={{
                aspectRatio: '1 / 1', borderRadius: '50%', border: 'none',
                background: 'radial-gradient(circle at 30% 30%, #6D4C2A, #3E2614)',
                position: 'relative', cursor: 'pointer',
                boxShadow: 'inset 0 6px 12px rgba(0,0,0,0.4)',
                overflow: 'hidden',
                transition: 'transform 0.1s',
                transform: wasHit ? 'scale(0.92)' : 'scale(1)',
              }}>
              {isActive && (
                <div style={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 44, lineHeight: 1,
                  animation: 'molePop 0.15s ease-out',
                }}>
                  🐹
                </div>
              )}
              {wasHit && (
                <div style={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 40,
                }}>
                  💥
                </div>
              )}
            </button>
          )
        })}
      </div>
      <style>{`
        @keyframes molePop {
          0% { transform: translate(-50%, 20%); opacity: 0.5; }
          100% { transform: translate(-50%, -50%); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
