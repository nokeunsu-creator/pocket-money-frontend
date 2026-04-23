import { useState, useEffect, useRef, useCallback } from 'react'
import { CHILD1, CHILD2 } from '../config/names'

const TIME_PER_TURN = 20

// 한국어 자모 마지막 글자 추출 (두음법칙 살짝 허용: 리/이, 라/나 등)
function lastChar(word) {
  if (!word) return ''
  const ch = word.trim().slice(-1)
  return ch
}

// 두음법칙 허용 매핑 (마지막 글자로 다음 단어 시작할 때)
// 예: "녹색" → 녹 ← "녹음/놀이" OK. 실제 국어사전 두음법칙은 복잡하므로 간단 규칙만 제공
const DUEUM_MAP = {
  '녀': '여', '뇨': '요', '뉴': '유', '니': '이',
  '랴': '야', '려': '여', '례': '예', '료': '요', '류': '유', '리': '이',
  '라': '나', '래': '내', '로': '노', '뢰': '뇌', '루': '누', '르': '느',
}

function canFollow(prevWord, nextWord) {
  if (!prevWord || !nextWord) return false
  const last = lastChar(prevWord)
  const first = nextWord.trim().charAt(0)
  if (last === first) return true
  // 두음법칙 허용
  if (DUEUM_MAP[last] === first) return true
  return false
}

export default function WordChain({ onBack }) {
  const [phase, setPhase] = useState('menu') // menu | playing | result
  const [players, setPlayers] = useState([CHILD1, CHILD2])
  const [turn, setTurn] = useState(0) // 0 or 1
  const [words, setWords] = useState([]) // { word, by }
  const [input, setInput] = useState('')
  const [timeLeft, setTimeLeft] = useState(TIME_PER_TURN)
  const [winner, setWinner] = useState(null) // '{name}' or null
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const currentPlayer = players[turn]
  const prevWord = words.length > 0 ? words[words.length - 1].word : null
  const requiredFirst = prevWord ? [lastChar(prevWord), DUEUM_MAP[lastChar(prevWord)]].filter(Boolean) : null

  const start = useCallback(() => {
    setTurn(0)
    setWords([])
    setInput('')
    setTimeLeft(TIME_PER_TURN)
    setWinner(null)
    setError(null)
    setPhase('playing')
  }, [])

  // 턴 타이머
  useEffect(() => {
    if (phase !== 'playing') return
    if (timeLeft <= 0) {
      setWinner(players[(turn + 1) % 2])  // 시간 초과 → 상대 승
      setPhase('result')
      return
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [phase, timeLeft, turn, players])

  // 플레이 진입 시 입력창 포커스
  useEffect(() => {
    if (phase === 'playing' && inputRef.current) inputRef.current.focus()
  }, [phase, turn])

  const submit = () => {
    setError(null)
    const w = input.trim()
    if (!w) return
    // 한글 1~8자만
    if (!/^[가-힣]{1,8}$/.test(w)) {
      setError('한글 단어만 입력할 수 있어요')
      return
    }
    // 연결 검사
    if (prevWord && !canFollow(prevWord, w)) {
      setError(`"${lastChar(prevWord)}"로 시작해야 해요` +
        (DUEUM_MAP[lastChar(prevWord)] ? ` ("${DUEUM_MAP[lastChar(prevWord)]}"도 OK)` : ''))
      return
    }
    // 중복 체크
    if (words.some(x => x.word === w)) {
      setError('이미 쓴 단어예요')
      return
    }
    // 1글자는 반칙
    if (w.length < 2) {
      setError('두 글자 이상 단어를 써주세요')
      return
    }
    // 성공
    setWords(prev => [...prev, { word: w, by: currentPlayer }])
    setInput('')
    setTurn((turn + 1) % 2)
    setTimeLeft(TIME_PER_TURN)
  }

  const giveUp = () => {
    setWinner(players[(turn + 1) % 2])
    setPhase('result')
  }

  // 메뉴
  if (phase === 'menu') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🔤</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>끝말잇기</h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
          2명이 번갈아 단어 이어가기!<br />
          20초 안에 단어를 못 대면 져요 😬
        </p>

        <div style={{ maxWidth: 280, margin: '0 auto 20px' }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>플레이어</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={players[0]} onChange={e => setPlayers([e.target.value, players[1]])}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '2px solid #EEE', fontSize: 14, minWidth: 0, boxSizing: 'border-box' }} />
            <span style={{ alignSelf: 'center', color: '#888' }}>vs</span>
            <input value={players[1]} onChange={e => setPlayers([players[0], e.target.value])}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '2px solid #EEE', fontSize: 14, minWidth: 0, boxSizing: 'border-box' }} />
          </div>
        </div>

        <button onClick={start}
          style={{
            width: '100%', maxWidth: 280, padding: '16px 0', borderRadius: 14,
            border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#FFF',
            background: 'linear-gradient(135deg, #4895EF, #3A7BD5)',
          }}>
          🎯 시작!
        </button>
      </div>
    )
  }

  // 결과
  if (phase === 'result') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{
          textAlign: 'center', padding: '32px 20px', borderRadius: 20,
          background: 'linear-gradient(135deg, #FFF9E6, #FFF3CD)',
          border: '2px solid #F1C40F', marginBottom: 20,
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#E67E22' }}>{winner} 승리!</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>총 {words.length}개 단어</div>
        </div>
        {words.length > 0 && (
          <div style={{ marginBottom: 20, maxHeight: 240, overflowY: 'auto' }}>
            {words.map((w, i) => (
              <div key={i} style={{
                padding: '10px 14px', marginBottom: 6, borderRadius: 10,
                background: w.by === players[0] ? '#E3F2FD' : '#FCE4EC',
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span style={{ fontWeight: 600 }}>{w.word}</span>
                <span style={{ fontSize: 12, color: '#888' }}>{w.by}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={start}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#4895EF', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            다시 하기
          </button>
          <button onClick={() => setPhase('menu')}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#F0F0F0', color: '#555', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            메뉴
          </button>
        </div>
      </div>
    )
  }

  // 플레이
  const timerPct = (timeLeft / TIME_PER_TURN) * 100
  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setPhase('menu')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>
          ←
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>🔤 끝말잇기</h2>
        <div style={{ fontSize: 13, color: '#666' }}>{words.length}번째</div>
      </div>

      {/* 현재 플레이어 */}
      <div style={{
        background: turn === 0 ? 'linear-gradient(135deg, #4895EF, #3A7BD5)' : 'linear-gradient(135deg, #EF476F, #D63B5C)',
        color: '#FFF', padding: '16px', borderRadius: 14, marginBottom: 12, textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>현재 차례</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{currentPlayer}</div>
        <div style={{ marginTop: 10, height: 6, background: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            width: `${timerPct}%`, height: '100%',
            background: timeLeft <= 5 ? '#FFD54F' : '#FFF',
            transition: 'width 1s linear',
          }} />
        </div>
        <div style={{ fontSize: 12, marginTop: 6, opacity: 0.9 }}>⏱ {timeLeft}초</div>
      </div>

      {/* 이어야 할 글자 */}
      {requiredFirst && (
        <div style={{
          background: '#FFF3CD', borderRadius: 12, padding: '10px 14px', marginBottom: 10,
          textAlign: 'center', fontSize: 14, color: '#856404',
        }}>
          "<b>{requiredFirst.join('" 또는 "')}</b>" 로 시작하는 단어!
        </div>
      )}

      {/* 입력 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="단어를 입력하세요"
          style={{
            flex: 1, padding: '14px 16px', borderRadius: 12, border: '2px solid #EEE',
            fontSize: 18, fontWeight: 600, minWidth: 0, boxSizing: 'border-box',
          }} />
        <button onClick={submit}
          style={{
            padding: '0 20px', borderRadius: 12, border: 'none',
            background: '#06D6A0', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}>
          제출
        </button>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 10,
          background: '#FFF5F5', color: '#C0392B', fontSize: 13,
          border: '1px solid #FED7D7',
        }}>
          ⚠️ {error}
        </div>
      )}

      <button onClick={giveUp}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
          background: '#F5F5F5', color: '#888', fontSize: 13, cursor: 'pointer', marginBottom: 14,
        }}>
        😢 포기하기
      </button>

      {/* 단어 기록 */}
      {words.length > 0 && (
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 6, paddingLeft: 4 }}>
            지금까지 나온 단어
          </div>
          {[...words].reverse().map((w, i) => (
            <div key={i} style={{
              padding: '8px 12px', marginBottom: 4, borderRadius: 8,
              background: w.by === players[0] ? '#E3F2FD' : '#FCE4EC',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 13,
            }}>
              <span style={{ fontWeight: 600 }}>{w.word}</span>
              <span style={{ fontSize: 11, color: '#888' }}>{w.by}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
