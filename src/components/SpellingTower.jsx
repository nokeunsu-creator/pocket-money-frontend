import { useState, useEffect, useRef, useCallback } from 'react'
import { WORD_TOPICS } from '../data/englishWords'
import { getData, addScore, addDiamonds, updateRecord, updateDailyChallenge, addWrongWord } from '../utils/englishStorage'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getAllWords() {
  const all = []
  for (const topic of WORD_TOPICS) {
    for (const w of topic.words) {
      all.push(w)
    }
  }
  return all
}

function getWordsForFloor(floor, allWords) {
  let minLen, maxLen
  if (floor <= 5) { minLen = 3; maxLen = 4 }
  else if (floor <= 10) { minLen = 4; maxLen = 5 }
  else if (floor <= 15) { minLen = 5; maxLen = 6 }
  else if (floor <= 20) { minLen = 6; maxLen = 7 }
  else { minLen = 7; maxLen = 999 }
  const filtered = allWords.filter(w => w.en.length >= minLen && w.en.length <= maxLen)
  return filtered.length > 0 ? filtered : allWords
}

function generateDecoyLetters(word, count) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'
  const wordLetters = new Set(word.split(''))
  const available = alphabet.split('').filter(c => !wordLetters.has(c))
  const decoys = shuffle(available).slice(0, count)
  return decoys
}

function pickWord(floor, allWords, usedWords) {
  const pool = getWordsForFloor(floor, allWords)
  const unused = pool.filter(w => !usedWords.has(w.en))
  const candidates = unused.length > 0 ? unused : pool
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export default function SpellingTower({ onBack }) {
  const [gameState, setGameState] = useState('playing') // 'playing' | 'gameover'
  const [floor, setFloor] = useState(1)
  const [lives, setLives] = useState(3)
  const [hints, setHints] = useState(3)
  const [score, setScore] = useState(0)
  const [diamonds, setDiamonds] = useState(0)
  const [currentWord, setCurrentWord] = useState(null)
  const [filledLetters, setFilledLetters] = useState([])
  const [availableLetters, setAvailableLetters] = useState([])
  const [disabledIndices, setDisabledIndices] = useState(new Set())
  const [shake, setShake] = useState(false)
  const [correctFlash, setCorrectFlash] = useState(false)
  const [wrongWords, setWrongWords] = useState([])
  const [bestRecord, setBestRecord] = useState(0)

  const allWordsRef = useRef(getAllWords())
  const usedWordsRef = useRef(new Set())

  // Load best record
  useEffect(() => {
    try {
      const data = getData()
      if (data?.records?.spellingTower) {
        setBestRecord(data.records.spellingTower)
      }
    } catch (e) { /* ignore */ }
  }, [])

  // Setup word for current floor
  const setupWord = useCallback((fl) => {
    const word = pickWord(fl, allWordsRef.current, usedWordsRef.current)
    usedWordsRef.current.add(word.en)
    const letters = word.en.split('')
    const decoyCount = Math.min(4, Math.max(3, Math.floor(Math.random() * 2) + 3))
    const decoys = generateDecoyLetters(word.en, decoyCount)
    const allLetters = shuffle([...letters, ...decoys])

    setCurrentWord(word)
    setFilledLetters([])
    setAvailableLetters(allLetters.map((ch, i) => ({ ch, id: i, disabled: false })))
    setDisabledIndices(new Set())
    setShake(false)
    setCorrectFlash(false)
  }, [])

  // Initialize first word
  useEffect(() => {
    setupWord(1)
  }, [setupWord])

  const handleLetterTap = useCallback((letterObj, index) => {
    if (gameState !== 'playing') return
    if (disabledIndices.has(index)) return

    const word = currentWord.en
    const nextPos = filledLetters.length
    const expectedLetter = word[nextPos]

    if (letterObj.ch === expectedLetter) {
      // Correct letter
      const newFilled = [...filledLetters, letterObj.ch]
      setFilledLetters(newFilled)
      const newDisabled = new Set(disabledIndices)
      newDisabled.add(index)
      setDisabledIndices(newDisabled)

      // Check if word complete
      if (newFilled.length === word.length) {
        setCorrectFlash(true)
        // Score: +20 per floor, +50 bonus every 5 floors
        let earned = 20
        if (floor % 5 === 0) earned += 50
        let earnedDiamonds = 0
        if (floor % 10 === 0) earnedDiamonds = 1
        setScore(s => s + earned)
        setDiamonds(d => d + earnedDiamonds)

        setTimeout(() => {
          const nextFloor = floor + 1
          setFloor(nextFloor)
          setupWord(nextFloor)
        }, 600)
      }
    } else {
      // Wrong letter
      setShake(true)
      setTimeout(() => setShake(false), 400)
      const newLives = lives - 1
      setLives(newLives)

      if (newLives <= 0) {
        // Track wrong word
        setWrongWords(prev => [...prev, currentWord])
        // Game over
        endGame(floor, score)
      }
    }
  }, [gameState, currentWord, filledLetters, disabledIndices, floor, lives, score, setupWord])

  const handleBackspace = useCallback(() => {
    if (gameState !== 'playing') return
    if (filledLetters.length === 0) return

    const lastFilled = filledLetters[filledLetters.length - 1]
    setFilledLetters(prev => prev.slice(0, -1))

    // Re-enable the last used letter button (find the last disabled one that matches)
    const newDisabled = new Set(disabledIndices)
    // Find the most recently disabled index matching the last letter
    const indices = Array.from(disabledIndices).filter(i => availableLetters[i].ch === lastFilled)
    if (indices.length > 0) {
      newDisabled.delete(indices[indices.length - 1])
    }
    setDisabledIndices(newDisabled)
  }, [gameState, filledLetters, disabledIndices, availableLetters])

  const handleHint = useCallback(() => {
    if (gameState !== 'playing') return
    if (hints <= 0) return
    if (!currentWord) return

    const word = currentWord.en
    const nextPos = filledLetters.length
    if (nextPos >= word.length) return

    const targetLetter = word[nextPos]
    // Find an available (not disabled) button with this letter
    const idx = availableLetters.findIndex((l, i) => l.ch === targetLetter && !disabledIndices.has(i))
    if (idx >= 0) {
      setHints(h => h - 1)
      handleLetterTap(availableLetters[idx], idx)
    }
  }, [gameState, hints, currentWord, filledLetters, availableLetters, disabledIndices, handleLetterTap])

  const endGame = useCallback((finalFloor, finalScore) => {
    const floorBonus = finalFloor * 2
    const totalScore = finalScore + floorBonus
    setScore(totalScore)
    setGameState('gameover')

    // Save results
    try {
      addScore(totalScore)
      if (diamonds > 0) addDiamonds(diamonds)
      updateRecord('spellingTower', null, finalFloor)
      updateDailyChallenge('spell')
      wrongWords.forEach(w => addWrongWord(w))
      // Refresh best record
      const data = getData()
      if (data?.records?.spellingTower) {
        setBestRecord(data.records.spellingTower)
      }
    } catch (e) { /* ignore if storage utils not ready */ }
  }, [diamonds, wrongWords])

  const handleRestart = () => {
    usedWordsRef.current = new Set()
    setGameState('playing')
    setFloor(1)
    setLives(3)
    setHints(3)
    setScore(0)
    setDiamonds(0)
    setWrongWords([])
    setupWord(1)
  }

  // ==================== GAME OVER SCREEN ====================
  if (gameState === 'gameover') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🏗️</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>게임 오버!</h2>

        <div style={{
          background: '#F8F9FA', borderRadius: 16, padding: '20px 24px',
          marginBottom: 20, textAlign: 'left',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 14, color: '#888' }}>최고 기록</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#4895EF' }}>{bestRecord}층</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 14, color: '#888' }}>이번 기록</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>{floor}층</span>
          </div>
          <div style={{ borderTop: '1px solid #E8E8E8', paddingTop: 10, marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: '#888' }}>획득 점수</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#06D6A0' }}>+{score}점</span>
            </div>
            {diamonds > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 14, color: '#888' }}>획득 다이아</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#A855F7' }}>+{diamonds}</span>
              </div>
            )}
          </div>
        </div>

        {wrongWords.length > 0 && (
          <div style={{
            background: '#FFF5F5', borderRadius: 12, padding: '14px 18px',
            marginBottom: 20, textAlign: 'left',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#E74C3C', marginBottom: 8 }}>틀린 단어</div>
            {wrongWords.map((w, i) => (
              <div key={i} style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
                <strong>{w.en}</strong> - {w.kr}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleRestart}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
              fontSize: 15, fontWeight: 700, color: '#FFF', background: '#4895EF',
            }}>
            다시 하기
          </button>
          <button onClick={onBack}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
              fontSize: 15, fontWeight: 700, color: '#555', background: '#F0F0F0',
            }}>
            돌아가기
          </button>
        </div>
      </div>
    )
  }

  // ==================== PLAYING SCREEN ====================
  const word = currentWord?.en || ''
  const wordLetters = word.split('')
  const towerHeight = Math.min(floor, 20)

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem', userSelect: 'none' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray, #888)', cursor: 'pointer' }}>
          ← 나가기
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>
          +{score}점
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20, padding: '10px 16px', background: '#F8F9FA', borderRadius: 12,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          🏗️ {floor}층
        </div>
        <div style={{ fontSize: 18, letterSpacing: 2 }}>
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} style={{ opacity: i < lives ? 1 : 0.2 }}>
              {i < lives ? '❤️' : '🤍'}
            </span>
          ))}
        </div>
        <button onClick={handleHint}
          style={{
            background: hints > 0 ? '#FFF8E1' : '#F0F0F0',
            border: hints > 0 ? '1px solid #FFD54F' : '1px solid #DDD',
            borderRadius: 8, padding: '4px 10px', cursor: hints > 0 ? 'pointer' : 'default',
            fontSize: 14, fontWeight: 600, color: hints > 0 ? '#F59E0B' : '#BBB',
          }}
          disabled={hints <= 0}
        >
          💡 {hints}/3
        </button>
      </div>

      {/* Tower visualization */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        marginBottom: 20, minHeight: 100,
      }}>
        {/* Tower blocks */}
        <div style={{
          display: 'flex', flexDirection: 'column-reverse', alignItems: 'center',
          gap: 2,
        }}>
          {Array.from({ length: towerHeight }, (_, i) => {
            const floorNum = i + 1
            const isCurrentFloor = floorNum === floor
            const width = Math.max(32, 80 - (floorNum - 1) * 2)
            return (
              <div key={floorNum} style={{
                width,
                height: 10,
                borderRadius: 2,
                background: isCurrentFloor
                  ? (correctFlash ? '#06D6A0' : '#4895EF')
                  : floorNum % 5 === 0 ? '#FFD54F' : '#A8D5FF',
                transition: 'all 0.3s',
                ...(isCurrentFloor && correctFlash ? { boxShadow: '0 0 12px rgba(6,214,160,0.6)' } : {}),
              }} />
            )
          })}
        </div>
        {/* Ground */}
        <div style={{
          width: 120, height: 6, background: '#8B7355', borderRadius: 2, marginTop: 2,
        }} />
      </div>

      {/* Korean meaning */}
      <div style={{
        textAlign: 'center', marginBottom: 16,
        fontSize: 22, fontWeight: 700, color: '#333',
        padding: '8px 20px', background: '#FFF8E1', borderRadius: 12,
        display: 'inline-block', width: '100%',
      }}>
        {currentWord?.kr}
      </div>

      {/* Letter boxes */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 6,
        marginBottom: 24, flexWrap: 'wrap',
        animation: shake ? 'shake 0.4s' : 'none',
      }}>
        {wordLetters.map((letter, i) => {
          const isFilled = i < filledLetters.length
          return (
            <div key={i} style={{
              width: 38, height: 44, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, fontFamily: 'monospace',
              textTransform: 'lowercase',
              background: isFilled ? '#E8F5E9' : '#F0F0F0',
              border: isFilled ? '2px solid #06D6A0' : '2px solid #DDD',
              color: isFilled ? '#2E7D32' : '#CCC',
              transition: 'all 0.2s',
            }}>
              {isFilled ? filledLetters[i] : '_'}
            </div>
          )
        })}
      </div>

      {/* Available letter buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))',
        gap: 8, marginBottom: 16,
        maxWidth: 360, margin: '0 auto 16px',
      }}>
        {availableLetters.map((letterObj, index) => {
          const isDisabled = disabledIndices.has(index)
          return (
            <button
              key={index}
              onClick={() => handleLetterTap(letterObj, index)}
              disabled={isDisabled}
              style={{
                minWidth: 44, minHeight: 48, borderRadius: 10,
                border: isDisabled ? '2px solid #E8E8E8' : '2px solid #4895EF',
                background: isDisabled ? '#F5F5F5' : '#FFF',
                color: isDisabled ? '#CCC' : '#333',
                fontSize: 20, fontWeight: 700, fontFamily: 'monospace',
                textTransform: 'lowercase',
                cursor: isDisabled ? 'default' : 'pointer',
                transition: 'all 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {letterObj.ch}
            </button>
          )
        })}
      </div>

      {/* Backspace button */}
      <div style={{ textAlign: 'center' }}>
        <button onClick={handleBackspace}
          disabled={filledLetters.length === 0}
          style={{
            padding: '10px 28px', borderRadius: 10,
            border: 'none', cursor: filledLetters.length > 0 ? 'pointer' : 'default',
            background: filledLetters.length > 0 ? '#FF6B6B' : '#E8E8E8',
            color: filledLetters.length > 0 ? '#FFF' : '#BBB',
            fontSize: 15, fontWeight: 700,
            transition: 'all 0.15s',
          }}>
          ← 지우기
        </button>
      </div>

      {/* Shake animation keyframes */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  )
}
