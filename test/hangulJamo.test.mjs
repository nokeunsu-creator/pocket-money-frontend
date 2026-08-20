// 한글 자모 분해/조립 + Wordle 비교 회귀 테스트
import {
  CHO, JUNG, JONG,
  decomposeChar, decomposeWord, composeChar, slotsToWord,
  wordToJamoList, evaluateGuess, jamoKind, shuffle, autoPlaceTarget,
} from '../src/utils/hangulJamo.js'
import { WORDS_3, WORDS_4, WORDS_5 } from '../src/data/languagePieceWords.js'

let pass = 0, fail = 0
function assert(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name} :: ${detail}`) }
}

// ────────────────────────────────────────────────────────────
console.log('\n[Test 1] 자모 분해')
{
  // "강" = ㄱ + ㅏ + ㅇ
  const r = decomposeChar('강')
  assert('"강" 초성 ㄱ', r.cho === 'ㄱ')
  assert('"강" 중성 ㅏ', r.jung === 'ㅏ')
  assert('"강" 종성 ㅇ', r.jong === 'ㅇ')

  // "아" = ㅇ + ㅏ + (없음)
  const r2 = decomposeChar('아')
  assert('"아" 초성 ㅇ', r2.cho === 'ㅇ')
  assert('"아" 중성 ㅏ', r2.jung === 'ㅏ')
  assert('"아" 종성 null', r2.jong === null)

  // "사람"
  const w = decomposeWord('사람')
  assert('"사람" 2글자', w.length === 2)
  assert('"사" = ㅅ+ㅏ', w[0].cho === 'ㅅ' && w[0].jung === 'ㅏ' && w[0].jong === null)
  assert('"람" = ㄹ+ㅏ+ㅁ', w[1].cho === 'ㄹ' && w[1].jung === 'ㅏ' && w[1].jong === 'ㅁ')
}

console.log('\n[Test 2] 자모 조립')
{
  assert('ㄱ+ㅏ+ㅇ = 강', composeChar('ㄱ', 'ㅏ', 'ㅇ') === '강')
  assert('ㅅ+ㅏ = 사', composeChar('ㅅ', 'ㅏ', null) === '사')
  assert('ㅈ+ㅣ = 지', composeChar('ㅈ', 'ㅣ', null) === '지')

  // 슬롯 → 단어
  const slots = [
    { cho: 'ㄱ', jung: 'ㅏ', jong: 'ㅇ' },
    { cho: 'ㅇ', jung: 'ㅏ', jong: null },
    { cho: 'ㅈ', jung: 'ㅣ', jong: null },
  ]
  assert('슬롯 → "강아지"', slotsToWord(slots) === '강아지')

  // 불완전 슬롯 → null
  const bad = [{ cho: 'ㄱ', jung: null, jong: null }]
  assert('자음만 → null', slotsToWord(bad) === null)
}

console.log('\n[Test 3] 단어 → 자모 시퀀스')
{
  assert('"강아지" = [ㄱ,ㅏ,ㅇ,ㅇ,ㅏ,ㅈ,ㅣ]',
    JSON.stringify(wordToJamoList('강아지')) === JSON.stringify(['ㄱ','ㅏ','ㅇ','ㅇ','ㅏ','ㅈ','ㅣ']))
  assert('"사람" = [ㅅ,ㅏ,ㄹ,ㅏ,ㅁ]',
    JSON.stringify(wordToJamoList('사람')) === JSON.stringify(['ㅅ','ㅏ','ㄹ','ㅏ','ㅁ']))
  assert('"호랑이" = [ㅎ,ㅗ,ㄹ,ㅏ,ㅇ,ㅇ,ㅣ]',
    JSON.stringify(wordToJamoList('호랑이')) === JSON.stringify(['ㅎ','ㅗ','ㄹ','ㅏ','ㅇ','ㅇ','ㅣ']))
}

console.log('\n[Test 4] 자모 종류')
{
  assert('ㄱ = consonant', jamoKind('ㄱ') === 'consonant')
  assert('ㅏ = vowel', jamoKind('ㅏ') === 'vowel')
  assert('ㅎ = consonant', jamoKind('ㅎ') === 'consonant')
  assert('ㅢ = vowel', jamoKind('ㅢ') === 'vowel')
}

console.log('\n[Test 5] Wordle 평가 — 음절 단위 완전 정답')
{
  const r = evaluateGuess('강아지', '강아지')
  assert('모든 음절 초록', r.colors.every(c => c === 'green'))
  assert('chars 3개 (3글자)', r.chars.length === 3)
  assert('chars[0]="강"', r.chars[0] === '강')
}

console.log('\n[Test 6] Wordle 평가 — 위치 다름 (yellow)')
{
  // 정답: 사람 (2글자). 추측: 람사
  // 위치 0: 람 vs 사 → red → remain에 사 있음 → yellow
  // 위치 1: 사 vs 람 → red → remain에 람 있음 → yellow
  const r = evaluateGuess('람사', '사람')
  assert('둘 다 yellow (글자는 있지만 위치 다름)', r.colors[0] === 'yellow' && r.colors[1] === 'yellow')
}

console.log('\n[Test 7] Wordle 평가 — 부분 정답')
{
  // 정답: 강아지 (3글자). 추측: 강나지
  // 위치 0: 강 = 강 → green
  // 위치 1: 나 vs 아 → red (정답에 "나" 없음)
  // 위치 2: 지 = 지 → green
  const r = evaluateGuess('강나지', '강아지')
  assert('위치 0 green (강)', r.colors[0] === 'green')
  assert('위치 1 red (나는 정답에 없음)', r.colors[1] === 'red')
  assert('위치 2 green (지)', r.colors[2] === 'green')

  // 정답: 사람들. 추측: 들사람 (다른 위치에 모두 존재)
  const r2 = evaluateGuess('들사람', '사람들')
  assert('모두 yellow (글자는 있고 위치 다름)', r2.colors.every(c => c === 'yellow'))
}

console.log('\n[Test 8] Wordle 평가 — 중복 글자 처리')
{
  const r = evaluateGuess('사사', '사사')
  assert('"사사" 자체 → 2 green', r.colors.length === 2 && r.colors.every(c => c === 'green'))

  // 정답에 "강" 한 개, 추측에 "강" 두 개 (둘 다 yellow는 안 됨)
  const r2 = evaluateGuess('강강이', '강이지')
  // 위치 0: 강 = 강 → green
  // 위치 1: 강 vs 이 → red. remain {이:1, 지:1} (강은 위치 0에서 green 처리됨, 차감)
  // 위치 2: 이 vs 지 → red. remain에 "이" 있음 → yellow
  assert('두 번째 강은 yellow 아님 (remain에 강 없음)', r2.colors[1] === 'red')
  assert('이는 yellow', r2.colors[2] === 'yellow')
}

console.log('\n[Test 9] shuffle 결정성/길이')
{
  const arr = [1, 2, 3, 4, 5]
  const sh = shuffle(arr)
  assert('shuffle 길이 유지', sh.length === 5)
  assert('shuffle 원본 불변', JSON.stringify(arr) === JSON.stringify([1,2,3,4,5]))
  assert('shuffle 같은 원소 집합', sh.sort().join(',') === '1,2,3,4,5')
}


// ────────────────────────────────────────────────────────────
// 언어의 조각 — 타일 탭 자동 배치 (autoPlaceTarget)
// 슬롯이 비어 있는 상태에서 정답 자모를 순서대로 누르면
// 항상 정답 단어가 조립되어야 한다.
console.log('\n[Test 10] 자모 타일 자동 배치')
{
  // 빈 슬롯에 자모 시퀀스를 순서대로 눌러넣는 시뮬레이터
  function typeJamos(charCount, jamos) {
    const slots = Array.from({ length: charCount }, () => ({ cho: null, jung: null, jong: null }))
    for (const j of jamos) {
      const t = autoPlaceTarget(slots, jamoKind(j))
      if (!t) return { failed: '넣을 자리 없음: ' + j, slots }
      if (t.pullJongFrom != null) {
        slots[t.charIdx].cho = slots[t.pullJongFrom].jong
        slots[t.pullJongFrom].jong = null
      }
      if (slots[t.charIdx][t.kind] != null) return { failed: '이미 찬 칸에 배치: ' + j, slots }
      slots[t.charIdx][t.kind] = j
    }
    return { word: slotsToWord(slots), slots }
  }

  // 대표 케이스 — 받침 유무 조합
  const cases = [
    '강아지',   // 받침 → 무받침 → 무받침
    '사랑',     // 마지막 글자에 받침
    '아기',     // 첫 글자 무받침
    '학교',     // 첫 글자 받침
    '손잡이',   // 받침 두 번
    '값진말',   // 겹받침
    '아이오',   // 받침 전혀 없음
    '강강강',   // 모든 글자 받침
  ]
  for (const w of cases) {
    const r = typeJamos([...w].length, wordToJamoList(w))
    assert('순서대로 눌러 "' + w + '" 조립', r.word === w, r.failed || ('결과=' + r.word))
  }

  // 게임 단어 풀 전체 — 정답 자모를 순서대로 누르면 100% 정답이 나와야 한다
  const allWords = [...WORDS_3, ...WORDS_4, ...WORDS_5]
  const bad = []
  for (const w of allWords) {
    const r = typeJamos([...w].length, wordToJamoList(w))
    if (r.word !== w) bad.push(w + '→' + (r.word || r.failed))
  }
  assert(
    '단어 풀 ' + allWords.length + '개 전부 자동 배치로 정답 조립',
    bad.length === 0,
    '실패 ' + bad.length + '건: ' + bad.slice(0, 8).join(', ')
  )

  // 모음을 먼저 눌러도 그 글자의 초성 구멍을 먼저 메운다
  {
    const slots = [{ cho: null, jung: 'ㅏ', jong: null }, { cho: null, jung: null, jong: null }]
    const t = autoPlaceTarget(slots, 'consonant')
    assert('모음 선입력 시 자음은 그 글자 초성으로', t && t.charIdx === 0 && t.kind === 'cho',
      JSON.stringify(t))
  }

  // 받침에 넣은 자음은 다음 모음 입력 때 다음 글자 초성으로 당겨진다
  {
    const slots = [{ cho: 'ㅅ', jung: 'ㅏ', jong: 'ㄹ' }, { cho: null, jung: null, jong: null }]
    const t = autoPlaceTarget(slots, 'vowel')
    assert('받침 뒤 모음 → 받침을 다음 글자 초성으로 당김',
      t && t.charIdx === 1 && t.kind === 'jung' && t.pullJongFrom === 0, JSON.stringify(t))
  }

  // 다음 글자 초성이 이미 있으면 당기지 않는다 (진짜 받침)
  {
    const slots = [{ cho: 'ㄱ', jung: 'ㅏ', jong: 'ㅇ' }, { cho: 'ㅈ', jung: null, jong: null }]
    const t = autoPlaceTarget(slots, 'vowel')
    assert('다음 글자 초성이 있으면 받침 유지',
      t && t.charIdx === 1 && t.kind === 'jung' && t.pullJongFrom === undefined, JSON.stringify(t))
  }

  // 꽉 찬 슬롯에는 더 넣을 자리가 없다
  {
    const full = [{ cho: 'ㄱ', jung: 'ㅏ', jong: 'ㅇ' }]
    assert('모두 찬 슬롯 → 자음 자리 없음', autoPlaceTarget(full, 'consonant') === null)
    assert('모두 찬 슬롯 → 모음 자리 없음', autoPlaceTarget(full, 'vowel') === null)
  }

  // 방어적 입력
  assert('빈 배열 → null', autoPlaceTarget([], 'vowel') === null)
  assert('배열 아님 → null', autoPlaceTarget(null, 'vowel') === null)
}
console.log(`\n결과: ${pass} 통과 / ${fail} 실패`)
process.exit(fail === 0 ? 0 : 1)
