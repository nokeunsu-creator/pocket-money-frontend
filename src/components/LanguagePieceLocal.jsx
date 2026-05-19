// 언어의 조각 (Pieces of Language) — 단일 기기 2인 패스앤플레이
// 데스게임: 천만원을 걸어라 4회차 게임 룰 재현
//
// 룰:
// - 1라운드 = 3글자, 라운드마다 +1, 5라운드까지
// - 각 라운드 정답 단어 결정 → 자모 타일 풀(정답에 쓰이는 자모만, 셔플) 제공
// - P1·P2가 각자 1분 안에 타일을 슬롯에 배치 → 등록
// - 등록 결과: 본인은 위치별 색(🟢/🟡/🔴), 라운드 결과 화면에선 양쪽 결과 전부 공개
// - 모든 칸 초록 = 라운드 승점 (글자 수)
// - 13점 먼저 도달 = 게임 승

import { useState, useCallback, useEffect } from 'react'
import {
  decomposeWord, slotsToWord, shuffle, evaluateGuess, jamoKind,
} from '../utils/hangulJamo'
import { pickRandomWord } from '../data/languagePieceWords'

const ROUND_LEN = [3, 4, 5, 6, 7] // 라운드 1~5
const TARGET_SCORE = 13
const TURN_SECONDS = 60

const COLOR_P1 = '#3A7BD5'
const COLOR_P2 = '#E63946'
const ACCENT = '#7E57C2'

// 정답 단어로부터 빈 슬롯 + 셔플된 타일 풀 생성
function buildRoundData(word) {
  const chars = decomposeWord(word) // [{cho, jung, jong}]
  const slots = chars.map(() => ({ cho: null, jung: null, jong: null }))
  // 타일은 자모 단위
  const tileJamos = []
  for (const ch of chars) {
    tileJamos.push(ch.cho, ch.jung)
    if (ch.jong) tileJamos.push(ch.jong)
  }
  // tilePool: 각 타일에 고유 id 부여 (중복 자모 구분)
  const tilePool = tileJamos.map((j, idx) => ({ id: idx, jamo: j, kind: jamoKind(j) }))
  return { slots, tilePool: shuffle(tilePool), answer: word, hasJong: chars.map(c => !!c.jong) }
}

// 슬롯 배열을 단어 비슷한 형태로 조립 (등록 검증용)
function trySlotsToWord(slots) {
  return slotsToWord(slots)
}

export default function LanguagePieceLocal({ onBack }) {
  const [phase, setPhase] = useState('intro')
  // intro → round-intro → p-turn(player) → result-self → handoff → round-end → end

  const [round, setRound] = useState(1)
  const [scores, setScores] = useState({ 1: 0, 2: 0 })
  const [firstPlayer, setFirstPlayer] = useState(1) // 라운드 선공
  const [usedWords, setUsedWords] = useState(() => new Set())

  // 라운드 데이터
  const [roundData, setRoundData] = useState(null)
  // P1/P2 시도 상태
  const [attempt, setAttempt] = useState({
    1: { slots: null, tilePool: null, submitted: false, result: null },
    2: { slots: null, tilePool: null, submitted: false, result: null },
  })
  // 현재 플레이어 ('turn' 페이즈에서)
  const [currentPlayer, setCurrentPlayer] = useState(1)
  const [selectedTile, setSelectedTile] = useState(null) // 풀에서 고른 타일 id

  // ── 라운드 시작 ──────────────────────────────
  const startRound = useCallback((rIdx, fp, exclude) => {
    const len = ROUND_LEN[rIdx - 1]
    const ex = exclude || usedWords
    const word = pickRandomWord(len, ex)
    setUsedWords(prev => new Set(prev).add(word))
    const data = buildRoundData(word)
    setRoundData(data)
    // 두 플레이어 동일한 초기 시도 상태
    setAttempt({
      1: { slots: data.slots.map(s => ({ ...s })), tilePool: data.tilePool.map(t => ({ ...t, used: false })), submitted: false, result: null },
      2: { slots: data.slots.map(s => ({ ...s })), tilePool: data.tilePool.map(t => ({ ...t, used: false })), submitted: false, result: null },
    })
    setCurrentPlayer(fp)
    setSelectedTile(null)
    setPhase('round-intro')
  }, [usedWords])

  // ── 게임 시작 ──────────────────────────────
  const startGame = useCallback(() => {
    setRound(1)
    setScores({ 1: 0, 2: 0 })
    setFirstPlayer(1)
    setUsedWords(new Set())
    startRound(1, 1, new Set()) // 명시적 빈 exclude로 재시작 시 stale closure 회피
  }, [startRound])

  // ── 타일 클릭 (풀 → 선택) ──────────────────────────────
  const pickTile = useCallback((tileId) => {
    setSelectedTile(prev => (prev === tileId ? null : tileId))
  }, [])

  // ── 슬롯 클릭 ──────────────────────────────
  // - 비어있고 선택된 타일이 있으면 → 타일 배치 (kind에 맞는 자리에)
  // - 채워져 있으면 → 타일 풀로 되돌림
  const placeOrRemove = useCallback((charIdx, kind) => {
    if (!roundData) return
    const cp = currentPlayer
    setAttempt(prev => {
      const a = prev[cp]
      const slots = a.slots.map(s => ({ ...s }))
      const pool = a.tilePool.map(t => ({ ...t }))
      const slot = slots[charIdx]
      const currentTileId = slot[kind] // slot[kind] = tile id 또는 null (실제 자모 X)
      if (currentTileId != null) {
        // 슬롯에 있던 타일 제거 → 풀로 복귀
        pool.find(t => t.id === currentTileId).used = false
        slot[kind] = null
        setSelectedTile(null)
        return { ...prev, [cp]: { ...a, slots, tilePool: pool } }
      }
      // 빈 슬롯 + 선택 타일 → 배치 (kind 맞아야)
      if (selectedTile == null) return prev
      const tile = pool.find(t => t.id === selectedTile)
      if (!tile || tile.used) return prev
      // kind 매칭: 모음 → 'jung'만 / 자음 → 'cho' or 'jong'만
      if (tile.kind === 'vowel' && kind !== 'jung') return prev
      if (tile.kind === 'consonant' && kind === 'jung') return prev
      tile.used = true
      slot[kind] = tile.id
      setSelectedTile(null)
      return { ...prev, [cp]: { ...a, slots, tilePool: pool } }
    })
  }, [currentPlayer, roundData, selectedTile])

  // 슬롯에서 실제 자모 가져오기
  const tileJamoOfSlot = useCallback((player, charIdx, kind) => {
    const a = attempt[player]
    if (!a?.slots) return null
    const tileId = a.slots[charIdx]?.[kind]
    if (tileId == null) return null
    const tile = a.tilePool.find(t => t.id === tileId)
    return tile?.jamo || null
  }, [attempt])

  // ── 등록 ──────────────────────────────
  const submit = useCallback(() => {
    if (!roundData) return
    const cp = currentPlayer
    const a = attempt[cp]
    if (!a) return
    // 자모만 슬롯에 추출 (id를 jamo로 변환)
    const slotsWithJamo = a.slots.map(s => ({
      cho: s.cho != null ? a.tilePool.find(t => t.id === s.cho)?.jamo : null,
      jung: s.jung != null ? a.tilePool.find(t => t.id === s.jung)?.jamo : null,
      jong: s.jong != null ? a.tilePool.find(t => t.id === s.jong)?.jamo : null,
    }))
    const guess = trySlotsToWord(slotsWithJamo)
    if (!guess) {
      alert('완성된 글자가 아닙니다. 모든 글자의 자음·모음을 채워주세요.')
      return
    }
    const result = evaluateGuess(guess, roundData.answer)
    setAttempt(prev => ({
      ...prev,
      [cp]: { ...prev[cp], submitted: true, result, guess },
    }))
    setPhase('result-self')
  }, [attempt, currentPlayer, roundData])

  // 결과 모달 닫기 → 다음 단계
  const dismissResult = useCallback(() => {
    const cp = currentPlayer
    const fp = firstPlayer
    const other = cp === 1 ? 2 : 1
    if (attempt[other].submitted) {
      // 둘 다 끝남 → 라운드 결과
      setPhase('round-end')
    } else {
      // 상대 차례로 핸드오프
      setPhase('handoff')
    }
  }, [currentPlayer, firstPlayer, attempt])

  const goToOtherPlayer = useCallback(() => {
    const cp = currentPlayer
    const other = cp === 1 ? 2 : 1
    setCurrentPlayer(other)
    setSelectedTile(null)
    setPhase('p-turn')
  }, [currentPlayer])

  // 라운드 결과 → 다음 라운드 또는 게임 종료
  const proceedNextRound = useCallback(() => {
    const newScores = { ...scores }
    const r1 = attempt[1]?.result
    const r2 = attempt[2]?.result
    const win1 = r1 && r1.colors.every(c => c === 'green')
    const win2 = r2 && r2.colors.every(c => c === 'green')
    if (win1) newScores[1] += ROUND_LEN[round - 1]
    if (win2) newScores[2] += ROUND_LEN[round - 1]
    setScores(newScores)
    // 종료 체크
    if (newScores[1] >= TARGET_SCORE || newScores[2] >= TARGET_SCORE || round >= 5) {
      setPhase('end')
      return
    }
    const nextRound = round + 1
    const nextFp = firstPlayer === 1 ? 2 : 1
    setRound(nextRound)
    setFirstPlayer(nextFp)
    startRound(nextRound, nextFp)
  }, [scores, attempt, round, firstPlayer, startRound])

  const restart = useCallback(() => {
    setPhase('intro')
  }, [])

  // ── 페이즈 라우팅 ──────────────────────────────
  if (phase === 'intro') return <IntroScreen onBack={onBack} onStart={startGame} />

  if (phase === 'round-intro') return (
    <RoundIntro
      round={round}
      len={ROUND_LEN[round - 1]}
      firstPlayer={firstPlayer}
      scores={scores}
      onNext={() => setPhase('p-turn')}
    />
  )

  if (phase === 'p-turn') return (
    <TurnScreen
      round={round}
      currentPlayer={currentPlayer}
      attempt={attempt[currentPlayer]}
      roundData={roundData}
      selectedTile={selectedTile}
      tileJamoOfSlot={tileJamoOfSlot}
      onPickTile={pickTile}
      onPlaceSlot={placeOrRemove}
      onSubmit={submit}
      onBack={onBack}
    />
  )

  if (phase === 'result-self') return (
    <ResultModal
      player={currentPlayer}
      attempt={attempt[currentPlayer]}
      onClose={dismissResult}
    />
  )

  if (phase === 'handoff') return (
    <HandoffScreen
      from={currentPlayer}
      to={currentPlayer === 1 ? 2 : 1}
      onNext={goToOtherPlayer}
    />
  )

  if (phase === 'round-end') return (
    <RoundEndScreen
      round={round}
      answer={roundData?.answer}
      attempt={attempt}
      scores={scores}
      len={ROUND_LEN[round - 1]}
      onNext={proceedNextRound}
    />
  )

  if (phase === 'end') return (
    <EndScreen scores={scores} onRestart={restart} onBack={onBack} />
  )

  return null
}

// ────────────────────────────────────────────────────────────
function IntroScreen({ onBack, onStart }) {
  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <button onClick={onBack} style={btnPlain}>← 돌아가기</button>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 56, marginBottom: 4 }}>🔤</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, background: `linear-gradient(135deg, ${ACCENT}, ${COLOR_P2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          언어의 조각
        </h2>
        <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>한글 자모 타일로 단어 맞히기 · 2인 패스앤플레이</p>
      </div>

      <RuleCard icon="🧩" title="자모 타일로 단어 조립" body="라운드마다 정답 단어에 쓰이는 자음·모음 타일이 주어집니다. 글자칸에 자음은 초성·종성 자리, 모음은 중성 자리에 배치하세요." />
      <RuleCard icon="📏" title="라운드별 글자 수 증가" body="1라운드 3글자 → 5라운드 7글자. 시간은 라운드당 1분." />
      <RuleCard icon="🎯" title="Wordle 스타일 피드백" body={'등록하면 자모마다 색이 떠요.\n🟢 위치 정확 / 🟡 자모는 맞지만 위치 다름 / 🔴 정답에 없음'} />
      <RuleCard icon="🏆" title="13점 먼저 = 승리" body="모든 칸 초록 = 라운드 승. 점수는 글자 수만큼." />

      <button onClick={onStart} style={btnPrimary(ACCENT)}>▶ 시작</button>
    </div>
  )
}

function RuleCard({ icon, title, body }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: 12, background: '#FAFAFA', borderRadius: 12, marginBottom: 8, alignItems: 'flex-start' }}>
      <div style={{ fontSize: 24, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{body}</div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
function RoundIntro({ round, len, firstPlayer, scores, onNext }) {
  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: 36, color: ACCENT, fontWeight: 800 }}>라운드 {round}</div>
      <div style={{ fontSize: 50, fontWeight: 900, margin: '8px 0' }}>{len}글자</div>
      <div style={{ fontSize: 14, color: '#555', marginBottom: 20 }}>
        선공: <b style={{ color: firstPlayer === 1 ? COLOR_P1 : COLOR_P2 }}>{firstPlayer}P</b>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
        <ScoreCard player={1} score={scores[1]} />
        <ScoreCard player={2} score={scores[2]} />
      </div>

      <button onClick={onNext} style={btnPrimary(ACCENT)}>{firstPlayer}P 시작</button>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
function TurnScreen({
  round, currentPlayer, attempt, roundData, selectedTile,
  tileJamoOfSlot, onPickTile, onPlaceSlot, onSubmit, onBack,
}) {
  const color = currentPlayer === 1 ? COLOR_P1 : COLOR_P2
  const [secondsLeft, setSecondsLeft] = useState(TURN_SECONDS)
  useEffect(() => {
    if (secondsLeft <= 0) return
    const iv = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(iv)
  }, [secondsLeft])
  const m = Math.floor(secondsLeft / 60), s = secondsLeft % 60
  const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  const timeOver = secondsLeft === 0

  if (!attempt || !roundData) return null
  const len = roundData.slots.length

  // 완성도: 자음·모음 모두 채워졌는지
  const isComplete = attempt.slots.every(s => s.cho != null && s.jung != null)

  return (
    <div className="fade-in" style={{ maxWidth: 520, margin: '0 auto', padding: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <button onClick={onBack} style={btnPlain}>← 나가기</button>
        <div style={{
          fontSize: 14, fontWeight: 800,
          color: timeOver ? '#E63946' : secondsLeft < 15 ? '#E67E22' : '#444',
        }}>⏱ {timeOver ? '시간 초과' : timeStr}</div>
      </div>

      <div style={{ padding: '8px 12px', borderRadius: 10, background: color + '15', textAlign: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, color, fontWeight: 700 }}>{currentPlayer}P</span>
        <span style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>라운드 {round} · {len}글자</span>
      </div>

      {/* 정답 슬롯 */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        {attempt.slots.map((slot, i) => (
          <SyllableSlot
            key={i}
            slot={slot}
            charIdx={i}
            jamoOf={(kind) => tileJamoOfSlot(currentPlayer, i, kind)}
            onSlotTap={(kind) => onPlaceSlot(i, kind)}
          />
        ))}
      </div>

      {/* 타일 풀 */}
      <div style={{ background: '#F8F4FF', padding: 10, borderRadius: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>자모 타일 (탭해서 선택 → 슬롯에 배치)</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {attempt.tilePool.map(t => (
            <Tile
              key={t.id}
              tile={t}
              selected={selectedTile === t.id && !t.used}
              onClick={() => !t.used && onPickTile(t.id)}
            />
          ))}
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={!isComplete}
        style={btnPrimary(color, !isComplete)}
      >
        {isComplete ? '✓ 등록' : '글자를 모두 완성하세요'}
      </button>

      <div style={{ fontSize: 11, color: '#888', marginTop: 8, lineHeight: 1.6 }}>
        ※ 자음 타일은 초성(위) / 종성(아래) 자리, 모음 타일은 중성(가운데) 자리에만 들어갑니다.<br/>
        ※ 종성(받침)이 없으면 그 자리는 비워두세요.
      </div>
    </div>
  )
}

function SyllableSlot({ slot, charIdx, jamoOf, onSlotTap }) {
  const cellSize = 38
  const slotStyle = (filled) => ({
    width: cellSize, height: cellSize, border: `2px dashed ${filled ? '#BBB' : '#DDD'}`,
    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, fontWeight: 700, cursor: 'pointer', userSelect: 'none',
    background: filled ? '#FFF' : '#FAFAFA',
    transition: 'all 0.1s',
  })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
      <div style={{ fontSize: 9, color: '#999' }}>{charIdx + 1}</div>
      <div onClick={() => onSlotTap('cho')} style={slotStyle(jamoOf('cho'))}>{jamoOf('cho') || '·'}</div>
      <div onClick={() => onSlotTap('jung')} style={slotStyle(jamoOf('jung'))}>{jamoOf('jung') || '·'}</div>
      <div onClick={() => onSlotTap('jong')} style={slotStyle(jamoOf('jong'))}>{jamoOf('jong') || ''}</div>
    </div>
  )
}

function Tile({ tile, selected, onClick }) {
  const isVowel = tile.kind === 'vowel'
  return (
    <button
      onClick={onClick}
      disabled={tile.used}
      style={{
        width: 38, height: 42, borderRadius: 8,
        background: tile.used ? '#EEE' : selected ? (isVowel ? '#FFE082' : '#BBDEFB') : '#FFF',
        border: selected ? '2px solid #1976D2' : '2px solid #DDD',
        fontSize: 20, fontWeight: 800, color: tile.used ? '#BBB' : (isVowel ? '#E65100' : '#0D47A1'),
        cursor: tile.used ? 'default' : 'pointer',
        boxShadow: selected ? '0 2px 6px #1976D266' : 'none',
        transition: 'all 0.1s',
      }}
    >
      {tile.jamo}
    </button>
  )
}

// ────────────────────────────────────────────────────────────
function ResultModal({ player, attempt, onClose }) {
  if (!attempt?.result) return null
  const color = player === 1 ? COLOR_P1 : COLOR_P2
  const { jamos, colors } = attempt.result
  const allGreen = colors.every(c => c === 'green')
  const summary = colors.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc }, {})
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}>
      <div style={{ background: '#FFF', borderRadius: 16, padding: 24, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 10px 30px #0004' }}>
        <div style={{ display: 'inline-block', padding: '2px 12px', background: color, color: '#FFF', borderRadius: 999, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>{player}P</div>
        <div style={{ fontSize: 48, marginBottom: 4 }}>{allGreen ? '🏆' : '📝'}</div>
        <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>
          {allGreen ? '모두 초록! 라운드 승!' : '결과'}
        </h3>
        <div style={{ fontSize: 14, color: '#555', marginBottom: 10 }}>
          등록한 단어: <b style={{ fontSize: 18 }}>{attempt.guess}</b>
        </div>
        {/* 자모별 색상 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginBottom: 12 }}>
          {jamos.map((j, i) => (
            <JamoBadge key={i} jamo={j} color={colors[i]} />
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#666' }}>
          🟢 {summary.green || 0}  🟡 {summary.yellow || 0}  🔴 {summary.red || 0}
        </div>
        <button onClick={onClose} style={btnPrimary(ACCENT)}>확인</button>
      </div>
    </div>
  )
}

function JamoBadge({ jamo, color }) {
  const bg = color === 'green' ? '#2E7D32' : color === 'yellow' ? '#F9A825' : '#C62828'
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 6, background: bg, color: '#FFF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 15, fontWeight: 800,
    }}>{jamo}</div>
  )
}

// ────────────────────────────────────────────────────────────
function HandoffScreen({ from, to, onNext }) {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '2rem 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>📱</div>
      <h2 style={{ fontSize: 22, fontWeight: 800 }}>{to}P에게 폰을 넘겨주세요</h2>
      <p style={{ fontSize: 14, color: '#666', marginTop: 8, marginBottom: 32 }}>
        {from}P의 결과는 보지 마세요!
      </p>
      <button onClick={onNext} style={{ ...btnPrimary(ACCENT), maxWidth: 280 }}>{to}P 시작</button>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
function RoundEndScreen({ round, answer, attempt, scores, len, onNext }) {
  const r1 = attempt[1].result
  const r2 = attempt[2].result
  const win1 = r1 && r1.colors.every(c => c === 'green')
  const win2 = r2 && r2.colors.every(c => c === 'green')
  const newP1 = scores[1] + (win1 ? len : 0)
  const newP2 = scores[2] + (win2 ? len : 0)
  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, color: ACCENT, fontWeight: 700 }}>라운드 {round} 결과</div>
        <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>정답</div>
        <div style={{ fontSize: 30, fontWeight: 900, margin: '4px 0' }}>{answer}</div>
      </div>

      <PlayerResultRow player={1} guess={attempt[1].guess} result={r1} win={win1} len={len} />
      <PlayerResultRow player={2} guess={attempt[2].guess} result={r2} win={win2} len={len} />

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <ScoreCard player={1} score={newP1} active={win1} delta={win1 ? len : 0} />
        <ScoreCard player={2} score={newP2} active={win2} delta={win2 ? len : 0} />
      </div>

      <button onClick={onNext} style={btnPrimary(ACCENT)}>
        {newP1 >= TARGET_SCORE || newP2 >= TARGET_SCORE || round >= 5 ? '게임 결과' : '다음 라운드'}
      </button>
    </div>
  )
}

function PlayerResultRow({ player, guess, result, win, len }) {
  const color = player === 1 ? COLOR_P1 : COLOR_P2
  return (
    <div style={{ padding: 12, border: `2px solid ${win ? '#2E7D32' : color + '44'}`, borderRadius: 12, marginBottom: 8, background: win ? '#E8F5E9' : '#FFF' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color }}>{player}P</div>
        <div style={{ fontSize: 13 }}>
          {win ? <span style={{ color: '#2E7D32', fontWeight: 700 }}>✓ +{len}점</span> : <span style={{ color: '#999' }}>0점</span>}
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{guess || '미등록'}</div>
      {result && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {result.jamos.map((j, i) => <JamoBadge key={i} jamo={j} color={result.colors[i]} />)}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
function EndScreen({ scores, onRestart, onBack }) {
  const winner = scores[1] > scores[2] ? 1 : scores[1] < scores[2] ? 2 : 0
  const wcolor = winner === 1 ? COLOR_P1 : winner === 2 ? COLOR_P2 : '#888'
  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: 60, marginBottom: 4 }}>🏆</div>
      {winner === 0 ? (
        <h2 style={{ fontSize: 24, color: '#888', fontWeight: 800 }}>무승부!</h2>
      ) : (
        <h2 style={{ fontSize: 26, color: wcolor, fontWeight: 800 }}>{winner}P 승리!</h2>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 }}>
        <ScoreCard player={1} score={scores[1]} active={winner === 1} />
        <ScoreCard player={2} score={scores[2]} active={winner === 2} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        <button onClick={onRestart} style={{ flex: 1, ...btnPrimary(ACCENT) }}>🔄 다시 하기</button>
        <button onClick={onBack} style={{ flex: 1, ...btnPrimary('#888') }}>나가기</button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
function ScoreCard({ player, score, active, delta }) {
  const color = player === 1 ? COLOR_P1 : COLOR_P2
  return (
    <div style={{
      flex: 1, padding: '8px 12px', borderRadius: 10,
      background: active ? color + '22' : '#F8F8F8',
      border: active ? `2px solid ${color}` : '2px solid transparent',
    }}>
      <div style={{ fontSize: 11, color, fontWeight: 700 }}>{player}P</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#222' }}>
        {score}{delta ? <span style={{ fontSize: 13, color: '#2E7D32', marginLeft: 4 }}>+{delta}</span> : ''}
      </div>
    </div>
  )
}

const btnPlain = { background: 'none', border: 'none', fontSize: 15, color: '#666', cursor: 'pointer', marginBottom: 12 }

function btnPrimary(color, disabled = false) {
  return {
    width: '100%', padding: '14px 16px',
    background: disabled ? '#CCC' : color, color: '#FFF',
    border: 'none', borderRadius: 10,
    fontSize: 15, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginTop: 12, boxShadow: disabled ? 'none' : `0 2px 6px ${color}44`,
  }
}
