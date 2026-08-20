// 언어의 조각 (Pieces of Language) — 단일 기기 2인 패스앤플레이
// 데스게임: 천만원을 걸어라 4회차 게임 룰 재현
//
// 룰:
// - 1라운드 = 3글자, 라운드마다 +1, 3라운드까지
// - 각 라운드 정답 단어 결정 → 자모 타일 풀(정답에 쓰이는 자모만, 셔플) 제공
// - P1·P2가 각자 1분 안에 타일을 슬롯에 배치 → 등록
// - 등록 결과: 본인은 위치별 색(🟢/🟡/🔴), 라운드 결과 화면에선 양쪽 결과 전부 공개
// - 모든 칸 초록 = 라운드 승점 (글자 수)
// - 3라운드 종료 후 점수가 높은 사람이 게임 승

import { useState, useCallback, useEffect } from 'react'
import {
  decomposeWord, slotsToWord, shuffle, evaluateGuess, jamoKind, composeChar, autoPlaceTarget,
} from '../utils/hangulJamo'
import { pickRandomWord } from '../data/languagePieceWords'
import { playClick, playPlace, playSuccess, playFail, playWin, playLose, playError } from '../utils/sounds'

const ROUND_LEN = [3, 4, 5] // 라운드 1~3 (6글자 이상 단어 제외)
const TARGET_SCORE = 13 // 사실상 도달 불가 — 라운드 수 한계로 게임 종료
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
    1: { slots: null, tilePool: null, submitted: false, result: null, history: [] },
    2: { slots: null, tilePool: null, submitted: false, result: null, history: [] },
  })
  // 현재 플레이어 ('turn' 페이즈에서)
  const [currentPlayer, setCurrentPlayer] = useState(1)
  // 지정 배치용: 빈 칸을 먼저 누르면 다음 타일이 자동 배치 대신 그 칸으로 들어간다
  const [pendingSlot, setPendingSlot] = useState(null) // { charIdx, kind } | null

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
      1: { slots: data.slots.map(s => ({ ...s })), tilePool: data.tilePool.map(t => ({ ...t, used: false })), submitted: false, result: null, history: [] },
      2: { slots: data.slots.map(s => ({ ...s })), tilePool: data.tilePool.map(t => ({ ...t, used: false })), submitted: false, result: null, history: [] },
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
  // ── 타일 탭 = 자동 배치 ──────────────────────────────
  // 기본: 한글 입력기처럼 앞에서부터 차례대로(초성→중성→받침→다음 글자) 채운다.
  // 빈 칸을 먼저 눌러 pendingSlot이 있으면 그 칸에 넣는다.
  const tapTile = useCallback((tileId) => {
    if (!roundData) return
    const cp = currentPlayer
    setAttempt(prev => {
      const a = prev[cp]
      if (!a?.slots) return prev
      const pool = a.tilePool.map(t => ({ ...t }))
      const tile = pool.find(t => t.id === tileId)
      if (!tile || tile.used) return prev
      const slots = a.slots.map(s => ({ ...s }))

      let target = null
      if (pendingSlot) {
        const { charIdx, kind } = pendingSlot
        const kindOk = tile.kind === 'vowel' ? kind === 'jung' : kind !== 'jung'
        if (kindOk && slots[charIdx]?.[kind] == null) target = { charIdx, kind }
        else { playError(); return prev }
      } else {
        target = autoPlaceTarget(slots, tile.kind)
      }
      if (!target) { playError(); return prev }

      if (target.pullJongFrom != null) {
        slots[target.charIdx].cho = slots[target.pullJongFrom].jong
        slots[target.pullJongFrom].jong = null
      }
      tile.used = true
      slots[target.charIdx][target.kind] = tile.id
      setPendingSlot(null)
      playPlace()
      return { ...prev, [cp]: { ...a, slots, tilePool: pool } }
    })
  }, [currentPlayer, roundData, pendingSlot])

  // ── 슬롯 클릭 ──────────────────────────────
  // - 채워져 있으면 → 타일 풀로 되돌림
  // - 비어 있으면 → 그 칸을 '지정 배치' 대기로 표시 (다시 누르면 해제)
  const tapSlot = useCallback((charIdx, kind) => {
    if (!roundData) return
    const cp = currentPlayer
    let removed = false
    setAttempt(prev => {
      const a = prev[cp]
      if (!a?.slots) return prev
      const currentTileId = a.slots[charIdx]?.[kind]
      if (currentTileId == null) return prev
      const slots = a.slots.map(s => ({ ...s }))
      const pool = a.tilePool.map(t => ({ ...t }))
      pool.find(t => t.id === currentTileId).used = false
      slots[charIdx][kind] = null
      removed = true
      return { ...prev, [cp]: { ...a, slots, tilePool: pool } }
    })
    if (removed) { setPendingSlot(null); playClick(); return }
    setPendingSlot(prev =>
      prev && prev.charIdx === charIdx && prev.kind === kind ? null : { charIdx, kind }
    )
    playClick()
  }, [currentPlayer, roundData])

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
      playError()
      alert('완성된 글자가 아닙니다. 모든 글자의 자음·모음을 채워주세요.')
      return
    }
    const result = evaluateGuess(guess, roundData.answer)
    const allGreen = result.colors.every(c => c === 'green')
    if (allGreen) playSuccess()
    else playFail()
    setAttempt(prev => ({
      ...prev,
      [cp]: { ...prev[cp], submitted: true, result, guess },
    }))
    setPhase('result-self')
  }, [attempt, currentPlayer, roundData])

  // 결과 모달 닫기 → 다음 단계
  // 룰: 정답(올 초록) 맞출 때까지 라운드가 끝나지 않음.
  // - 정답이면 → round-end (해당 플레이어 승점)
  // - 아니면 → 본 플레이어 시도 초기화하고 차례 전환 (재시도 무한 반복)
  const dismissResult = useCallback(() => {
    const cp = currentPlayer
    const myAttempt = attempt[cp]
    const allGreen = myAttempt?.result?.colors?.every(c => c === 'green')
    if (allGreen) {
      setPhase('round-end')
      return
    }
    // 시도 초기화 (슬롯/타일 풀 다시 빈 상태로) + 시도 기록 누적
    if (roundData) {
      setAttempt(prev => ({
        ...prev,
        [cp]: {
          slots: roundData.slots.map(s => ({ ...s })),
          tilePool: roundData.tilePool.map(t => ({ ...t, used: false })),
          submitted: false,
          result: null,
          guess: undefined,
          history: [
            ...(prev[cp].history || []),
            { guess: prev[cp].guess, result: prev[cp].result },
          ],
        },
      }))
    }
    setPhase('handoff')
  }, [currentPlayer, attempt, roundData])

  const goToOtherPlayer = useCallback(() => {
    const cp = currentPlayer
    const other = cp === 1 ? 2 : 1
    setCurrentPlayer(other)
    setSelectedTile(null)
    setPhase('p-turn')
  }, [currentPlayer])

  // 라운드 결과 → 다음 라운드 또는 게임 종료
  // 새 룰: 라운드 승자(올초록 만든 사람)에게 +len 점
  const proceedNextRound = useCallback(() => {
    const newScores = { ...scores }
    const cp = currentPlayer
    const allGreen = attempt[cp]?.result?.colors?.every(c => c === 'green')
    if (allGreen) newScores[cp] += ROUND_LEN[round - 1]
    setScores(newScores)
    if (newScores[1] >= TARGET_SCORE || newScores[2] >= TARGET_SCORE || round >= ROUND_LEN.length) {
      const winner = newScores[1] > newScores[2] ? 1 : newScores[2] > newScores[1] ? 2 : 0
      if (winner) playWin()
      else playLose()
      setPhase('end')
      return
    }
    const nextRound = round + 1
    const nextFp = firstPlayer === 1 ? 2 : 1
    setRound(nextRound)
    setFirstPlayer(nextFp)
    startRound(nextRound, nextFp)
  }, [scores, attempt, currentPlayer, round, firstPlayer, startRound])

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
      pendingSlot={pendingSlot}
      tileJamoOfSlot={tileJamoOfSlot}
      onTapTile={tapTile}
      onTapSlot={tapSlot}
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

      <RuleCard icon="🧩" title="자모 타일로 단어 조립" body={'정답 단어에 쓰이는 자음·모음 타일이 주어집니다.\n한 글자 = 초성(자음) + 중성(모음) + 받침(자음·옵션).\n예: 강 = ㄱ + ㅏ + ㅇ / 아 = ㅇ + ㅏ (받침 없음)'} />
      <RuleCard icon="📏" title="라운드별 글자 수 증가" body="1라운드 3글자 → 5라운드 7글자. 시간은 라운드당 1분." />
      <RuleCard icon="🎯" title="Wordle 스타일 피드백" body={'등록하면 글자마다 색이 떠요.\n🟢 위치 정확 / 🟡 글자는 맞지만 위치 다름 / 🔴 정답에 없음'} />
      <RuleCard icon="🔁" title="정답 맞출 때까지" body="한 번에 못 맞히면 차례를 상대에게 넘기고, 다시 돌아오면 또 시도. 누군가 모두 초록 만들 때까지 라운드가 계속됩니다." />
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
  round, currentPlayer, attempt, roundData, pendingSlot,
  tileJamoOfSlot, onTapTile, onTapSlot, onSubmit, onBack,
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
            pendingKind={pendingSlot && pendingSlot.charIdx === i ? pendingSlot.kind : null}
            onSlotTap={(kind) => onTapSlot(i, kind)}
          />
        ))}
      </div>

      {/* 본인 이전 시도 (history) */}
      {attempt.history && attempt.history.length > 0 && (
        <div style={{ marginBottom: 10, padding: 8, background: '#FAFAFA', borderRadius: 10 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>내 이전 시도 ({attempt.history.length}회)</div>
          {attempt.history.map((h, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700, minWidth: 80 }}>{h.guess}</div>
              <div style={{ display: 'flex', gap: 2 }}>
                {h.result?.chars?.map((c, i) => <JamoBadge key={i} jamo={c} color={h.result.colors[i]} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 타일 풀 */}
      <div style={{ background: '#F8F4FF', padding: 10, borderRadius: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
          자모 타일 (탭하면 차례대로 자동 입력)
          {pendingSlot && (
            <b style={{ color: ACCENT, marginLeft: 6 }}>
              · {pendingSlot.charIdx + 1}번 글자 {SLOT_LABEL[pendingSlot.kind]} 칸에 넣기
            </b>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {attempt.tilePool.map(t => (
            <Tile
              key={t.id}
              tile={t}
              onClick={() => !t.used && onTapTile(t.id)}
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
        ※ 아래 타일을 누르면 위 칸에 <b>차례대로 자동</b>으로 들어갑니다(초성→중성→받침→다음 글자).<br/>
        ※ 받침에 들어간 자음 뒤에 모음을 누르면, 그 자음이 다음 글자 초성으로 넘어갑니다.<br/>
        ※ 채워진 칸을 누르면 빼고, 빈 칸을 먼저 누르면 그 칸에 지정해서 넣습니다.<br/>
        ※ 한 글자 = 초성(자음) + 중성(모음) + 받침(자음·옵션). 예: <b>강</b> = ㄱ + ㅏ + ㅇ / <b>아</b> = ㅇ + ㅏ
      </div>
    </div>
  )
}

const SLOT_LABEL = { cho: '초성', jung: '중성', jong: '받침' }

function SyllableSlot({ slot, charIdx, jamoOf, pendingKind, onSlotTap }) {
  const cho = jamoOf('cho')
  const jung = jamoOf('jung')
  const jong = jamoOf('jong')
  const preview = composeChar(cho, jung, jong) || (cho && jung ? null : (cho || jung))
  const slotStyle = (filled, accent, pending) => ({
    width: 36, height: 32, boxSizing: 'border-box',
    border: `2px ${filled ? 'solid' : 'dashed'} ${pending ? ACCENT : filled ? accent : '#DDD'}`,
    borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, fontWeight: 800, cursor: 'pointer', userSelect: 'none',
    background: pending ? ACCENT + '22' : filled ? '#FFF' : '#FAFAFA',
    color: filled ? '#222' : '#BBB',
    boxShadow: pending ? `0 0 0 2px ${ACCENT}44` : 'none',
  })
  const labelStyle = { fontSize: 9, color: '#888', textAlign: 'center', width: 36 }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 6, border: '1px solid #EEE', borderRadius: 10, background: '#FAFAFA' }}>
      <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>{charIdx + 1}번 글자</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: preview ? '#222' : '#CCC', minHeight: 32, marginBottom: 4 }}>
        {preview || '?'}
      </div>
      <div style={labelStyle}>초성</div>
      <div onClick={() => onSlotTap('cho')} style={slotStyle(cho, '#0D47A1', pendingKind === 'cho')}>{cho || ''}</div>
      <div style={{ ...labelStyle, marginTop: 3 }}>중성</div>
      <div onClick={() => onSlotTap('jung')} style={slotStyle(jung, '#E65100', pendingKind === 'jung')}>{jung || ''}</div>
      <div style={{ ...labelStyle, marginTop: 3 }}>받침</div>
      <div onClick={() => onSlotTap('jong')} style={slotStyle(jong, '#0D47A1', pendingKind === 'jong')}>{jong || ''}</div>
    </div>
  )
}

function Tile({ tile, onClick }) {
  const isVowel = tile.kind === 'vowel'
  return (
    <button
      onClick={onClick}
      disabled={tile.used}
      style={{
        width: 38, height: 42, borderRadius: 8,
        background: tile.used ? '#EEE' : isVowel ? '#FFF8E1' : '#E3F2FD',
        border: `2px solid ${tile.used ? '#DDD' : isVowel ? '#FFCC80' : '#90CAF9'}`,
        fontSize: 20, fontWeight: 800, color: tile.used ? '#BBB' : (isVowel ? '#E65100' : '#0D47A1'),
        cursor: tile.used ? 'default' : 'pointer',
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
  const { chars, colors } = attempt.result
  const allGreen = colors.every(c => c === 'green')
  const summary = colors.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc }, {})
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}>
      <div style={{ background: '#FFF', borderRadius: 16, padding: 24, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 10px 30px #0004' }}>
        <div style={{ display: 'inline-block', padding: '2px 12px', background: color, color: '#FFF', borderRadius: 999, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>{player}P</div>
        <div style={{ fontSize: 48, marginBottom: 4 }}>{allGreen ? '🏆' : '📝'}</div>
        <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>
          {allGreen ? '모두 초록! 라운드 승!' : '아직 정답 아님 — 상대 차례'}
        </h3>
        <div style={{ fontSize: 14, color: '#555', marginBottom: 10 }}>
          등록한 단어: <b style={{ fontSize: 18 }}>{attempt.guess}</b>
        </div>
        {/* 글자별 색상 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginBottom: 12 }}>
          {chars.map((c, i) => (
            <JamoBadge key={i} jamo={c} color={colors[i]} />
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#666' }}>
          🟢 {summary.green || 0}  🟡 {summary.yellow || 0}  🔴 {summary.red || 0}
        </div>
        {!allGreen && (
          <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
            ※ 누군가 모두 초록 만들 때까지 차례를 주고받으며 계속됩니다.
          </div>
        )}
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
  // 새 룰: 라운드 승자는 단 한 명 (마지막에 올초록 만든 사람)
  const r1 = attempt[1].result
  const r2 = attempt[2].result
  const win1 = r1 && r1.colors.every(c => c === 'green')
  const win2 = r2 && r2.colors.every(c => c === 'green')
  const newP1 = scores[1] + (win1 ? len : 0)
  const newP2 = scores[2] + (win2 ? len : 0)
  // 패자의 마지막 시도 (history)
  const p1Last = !r1 && attempt[1].history?.length ? attempt[1].history[attempt[1].history.length - 1] : null
  const p2Last = !r2 && attempt[2].history?.length ? attempt[2].history[attempt[2].history.length - 1] : null
  const p1Attempts = (attempt[1].history?.length || 0) + (r1 ? 1 : 0)
  const p2Attempts = (attempt[2].history?.length || 0) + (r2 ? 1 : 0)
  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, color: ACCENT, fontWeight: 700 }}>라운드 {round} 결과</div>
        <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>정답</div>
        <div style={{ fontSize: 30, fontWeight: 900, margin: '4px 0' }}>{answer}</div>
      </div>

      <PlayerResultRow
        player={1}
        guess={r1 ? attempt[1].guess : p1Last?.guess}
        result={r1 || p1Last?.result}
        win={!!win1}
        attempts={p1Attempts}
        len={len}
      />
      <PlayerResultRow
        player={2}
        guess={r2 ? attempt[2].guess : p2Last?.guess}
        result={r2 || p2Last?.result}
        win={!!win2}
        attempts={p2Attempts}
        len={len}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <ScoreCard player={1} score={newP1} active={win1} delta={win1 ? len : 0} />
        <ScoreCard player={2} score={newP2} active={win2} delta={win2 ? len : 0} />
      </div>

      <button onClick={onNext} style={btnPrimary(ACCENT)}>
        {newP1 >= TARGET_SCORE || newP2 >= TARGET_SCORE || round >= ROUND_LEN.length ? '게임 결과' : '다음 라운드'}
      </button>
    </div>
  )
}

function PlayerResultRow({ player, guess, result, win, len, attempts }) {
  const color = player === 1 ? COLOR_P1 : COLOR_P2
  return (
    <div style={{ padding: 12, border: `2px solid ${win ? '#2E7D32' : color + '44'}`, borderRadius: 12, marginBottom: 8, background: win ? '#E8F5E9' : '#FFF' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color }}>{player}P · {attempts || 0}번 시도</div>
        <div style={{ fontSize: 13 }}>
          {win ? <span style={{ color: '#2E7D32', fontWeight: 700 }}>✓ +{len}점</span> : <span style={{ color: '#999' }}>0점</span>}
        </div>
      </div>
      <div style={{ fontSize: 15, color: '#888', marginBottom: 4 }}>{win ? '✓ 정답' : '마지막 시도'}</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{guess || '미등록'}</div>
      {result && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {result.chars.map((c, i) => <JamoBadge key={i} jamo={c} color={result.colors[i]} />)}
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
