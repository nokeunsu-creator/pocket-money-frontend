// 한글 자모 분해/조립 + Wordle 비교 회귀 테스트
import {
  CHO, JUNG, JONG,
  decomposeChar, decomposeWord, composeChar, slotsToWord,
  wordToJamoList, evaluateGuess, jamoKind, shuffle,
} from '../src/utils/hangulJamo.js'

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

console.log(`\n결과: ${pass} 통과 / ${fail} 실패`)
process.exit(fail === 0 ? 0 : 1)
