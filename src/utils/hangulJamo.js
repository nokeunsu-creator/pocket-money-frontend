// 한글 자모 분해/조립 + Wordle 스타일 비교
// 음절 = 0xAC00..0xD7A3 ('가'..'힣')
// 음절 - 0xAC00 = 초성 × 588 + 중성 × 28 + 종성

export const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
export const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
export const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

// 자모 종류 판별: 'cho'(자음만 가능한 초성) / 'jung'(모음) / 'jong'(종성)
// 일부 자음은 초/종 둘 다 가능. 사용 편의상 자음은 'consonant', 모음은 'vowel'로 둠.
export function jamoKind(j) {
  if (JUNG.includes(j)) return 'vowel'
  return 'consonant'
}

// 음절 → { cho, jung, jong | null }
export function decomposeChar(c) {
  const code = c.charCodeAt(0) - 0xAC00
  if (code < 0 || code >= 19 * 21 * 28) return null
  const cho = Math.floor(code / (21 * 28))
  const rest = code % (21 * 28)
  const jung = Math.floor(rest / 28)
  const jong = rest % 28
  return {
    cho: CHO[cho],
    jung: JUNG[jung],
    jong: jong === 0 ? null : JONG[jong],
  }
}

// 단어 → 음절별 {cho, jung, jong} 배열
export function decomposeWord(word) {
  return [...word].map(decomposeChar).filter(Boolean)
}

// 단어 → 자모 시퀀스 (받침이 있는 글자는 3개, 없으면 2개)
// 예: "사람" → ['ㅅ','ㅏ','ㄹ','ㅏ','ㅁ']
export function wordToJamoList(word) {
  const out = []
  for (const ch of decomposeWord(word)) {
    out.push(ch.cho, ch.jung)
    if (ch.jong) out.push(ch.jong)
  }
  return out
}

// (cho, jung, jong) → 음절
export function composeChar(cho, jung, jong) {
  const ci = CHO.indexOf(cho)
  const ji = JUNG.indexOf(jung)
  const gi = jong ? JONG.indexOf(jong) : 0
  if (ci < 0 || ji < 0 || gi < 0) return null
  return String.fromCharCode(0xAC00 + ci * 588 + ji * 28 + gi)
}

// 슬롯 배열을 단어로 조립
// slots: [{cho, jung, jong}, ...]
// 빈 슬롯 또는 자/모 누락 시 null
export function slotsToWord(slots) {
  const chars = []
  for (const s of slots) {
    if (!s) return null
    if (!s.cho || !s.jung) return null // 종성은 옵션
    const ch = composeChar(s.cho, s.jung, s.jong || null)
    if (!ch) return null
    chars.push(ch)
  }
  return chars.join('')
}

// 자모 타일 하나를 슬롯에 '차례대로' 자동 배치할 자리를 찾는다.
// 한글 입력기와 같은 순서로 채운다: 초성 → 중성 → 받침 → 다음 글자 초성.
// 받침 자리에 넣은 자음 뒤에 모음이 오면, 그 자음은 실제로 다음 글자의
// 초성이었다는 뜻이므로 앞으로 당겨온다. (사 + ㄹ = '살' → +ㅏ → '사라')
//
// slots: [{cho, jung, jong}] — null이 아니면 채워진 것으로 본다(타일 id든 자모든 무관)
// tileKind: 'consonant' | 'vowel'
// 반환: { charIdx, kind, pullJongFrom } | null (넣을 자리가 없으면 null)
export function autoPlaceTarget(slots, tileKind) {
  if (!Array.isArray(slots) || slots.length === 0) return null
  const has = (v) => v != null

  if (tileKind === 'vowel') {
    for (let i = 0; i < slots.length; i++) {
      if (has(slots[i].jung)) continue
      // 초성이 비었는데 앞 글자에 받침이 있으면 그 받침을 이 글자 초성으로 당김
      if (!has(slots[i].cho) && i > 0 && has(slots[i - 1].jong)) {
        return { charIdx: i, kind: 'jung', pullJongFrom: i - 1 }
      }
      return { charIdx: i, kind: 'jung' }
    }
    return null
  }

  // 자음 ① 중성은 찼는데 초성이 빈 글자가 있으면 그 구멍을 먼저 메운다
  //        (모음을 먼저 눌러 둔 경우)
  for (let i = 0; i < slots.length; i++) {
    if (has(slots[i].jung) && !has(slots[i].cho)) return { charIdx: i, kind: 'cho' }
  }

  // 자음 ② 입력 커서(= 내용이 있는 마지막 글자)에서 초성 → 받침 → 다음 글자 초성
  let cur = 0
  for (let i = 0; i < slots.length; i++) {
    if (has(slots[i].cho) || has(slots[i].jung) || has(slots[i].jong)) cur = i
  }
  const s = slots[cur]
  if (!has(s.cho)) return { charIdx: cur, kind: 'cho' }
  if (has(s.jung) && !has(s.jong)) return { charIdx: cur, kind: 'jong' }
  if (cur + 1 < slots.length) return { charIdx: cur + 1, kind: 'cho' }

  // 자음 ③ 마지막 글자까지 찬 경우 — 앞쪽에 비어 있는 받침 자리라도 찾는다
  for (let i = 0; i < slots.length; i++) {
    if (has(slots[i].cho) && has(slots[i].jung) && !has(slots[i].jong)) {
      return { charIdx: i, kind: 'jong' }
    }
  }
  return null
}

// Fisher–Yates shuffle (in-place)
export function shuffle(arr, rng = Math.random) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Wordle 스타일 비교 — 원작 룰대로 음절(글자) 단위 위치별 비교
// 입력: guessWord, answerWord (동일 글자 수)
// 반환: { chars, colors } — 글자별 색상 ('green' = 글자/위치 일치, 'yellow' = 글자만 일치, 'red' = 정답에 없음)
// 예: "강아지" vs "강아지" → 3 green / "사람" vs "람사" → 위치 모두 다르나 글자는 있음 → 2 yellow
export function evaluateGuess(guessWord, answerWord) {
  const g = [...(guessWord || '')]
  const a = [...(answerWord || '')]
  const n = Math.max(g.length, a.length)
  const result = new Array(n).fill('red')
  const remain = new Map() // answer 글자 카운트 (green 매칭 안 된 것들)

  for (let i = 0; i < n; i++) {
    if (i < g.length && i < a.length && g[i] === a[i]) {
      result[i] = 'green'
    } else if (i < a.length) {
      remain.set(a[i], (remain.get(a[i]) || 0) + 1)
    }
  }
  for (let i = 0; i < n; i++) {
    if (result[i] === 'green') continue
    if (i >= g.length) continue
    const k = g[i]
    if (remain.get(k) > 0) {
      result[i] = 'yellow'
      remain.set(k, remain.get(k) - 1)
    }
  }
  return { chars: g.slice(0, n), colors: result }
}
