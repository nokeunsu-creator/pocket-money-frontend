// 게임 데이터 정합성 검증 — 퀴즈 문제 + 바둑 레슨 퍼즐
//
// 이 데이터는 코드가 아니라 "내용"이라 컴파일도 통과하고 기존 테스트도 안 본다.
// 하지만 answer 인덱스가 범위를 넘거나 퍼즐 정답이 돌 위에 있으면 실제로 게임이 막힌다.
// (CLAUDE.md의 "바둑 레슨 퍼즐 설계 원칙" 자동 검증 항목을 스크립트로 옮긴 것)

import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'src', 'data')

let pass = 0, fail = 0
const failures = []
function ok(cond, msg) {
  if (cond) { pass++ } else { fail++; failures.push(msg); console.error('❌', msg) }
}

// ─────────────────────────────────────────────
// 1. 퀴즈 문제 — answer 인덱스 / 보기 / 중복
// ─────────────────────────────────────────────
// 데이터 파일 모양이 파일마다 달라서(학년별 객체, 주제 배열 등)
// 재귀로 훑어 { q, choices, answer } 모양을 모두 찾아낸다.
function collectQuestions(node, path, out) {
  if (node == null || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((v, i) => collectQuestions(v, `${path}[${i}]`, out))
    return
  }
  if (typeof node.q === 'string' && Array.isArray(node.choices)) {
    out.push({ path, item: node })
    return
  }
  for (const [k, v] of Object.entries(node)) collectQuestions(v, `${path}.${k}`, out)
}

const QUIZ_FILES = readdirSync(DATA).filter(f =>
  /Quiz\.js$/.test(f) || ['englishWords.js', 'englishSentences.js', 'mathData.js'].includes(f)
)

let totalQuestions = 0
const perFile = []
for (const file of QUIZ_FILES) {
  const mod = await import(pathToFileURL(join(DATA, file)).href)
  const found = []
  for (const [expName, expVal] of Object.entries(mod)) {
    collectQuestions(expVal, `${file}:${expName}`, found)
  }
  if (found.length === 0) continue // 문제 모양이 아닌 데이터 파일 (단어 목록 등)
  perFile.push(`${file}=${found.length}`)
  totalQuestions += found.length

  const seenQ = new Map()
  let badAnswer = 0, badChoices = 0, dupChoice = 0, emptyQ = 0, dupQ = 0
  for (const { path, item } of found) {
    const { q, choices, answer } = item
    if (!Number.isInteger(answer) || answer < 0 || answer >= choices.length) {
      badAnswer++
      failures.push(`${path}: answer=${answer} 가 choices(${choices.length}개) 범위 밖 — "${String(q).slice(0, 40)}"`)
    }
    if (choices.length < 2) {
      badChoices++
      failures.push(`${path}: 보기가 ${choices.length}개뿐 — "${String(q).slice(0, 40)}"`)
    }
    if (choices.some(c => typeof c !== 'string' || c.trim() === '')) {
      badChoices++
      failures.push(`${path}: 빈 보기 포함 — "${String(q).slice(0, 40)}"`)
    }
    if (new Set(choices).size !== choices.length) {
      dupChoice++
      failures.push(`${path}: 보기 중복 [${choices.join(' / ')}] — "${String(q).slice(0, 40)}"`)
    }
    if (!q || q.trim() === '') emptyQ++
    // 맞춤법 퀴즈처럼 문제 문장("다음 중 맞춤법이 올바른 문장은?")이 공통이고
    // 보기로 구분되는 구조가 정상이므로, 중복 판정은 문제+보기 조합으로 한다.
    const key = q.trim() + '||' + JSON.stringify(choices)
    if (seenQ.has(key)) {
      dupQ++
      failures.push(`${file}: 완전히 같은 문제 중복 — "${q.trim().slice(0, 40)}" / [${choices.join(' / ')}]`)
    } else seenQ.set(key, path)
  }
  ok(badAnswer === 0, `${file}: answer 인덱스 범위 정상 (위반 ${badAnswer})`)
  ok(badChoices === 0, `${file}: 보기 구성 정상 (위반 ${badChoices})`)
  ok(dupChoice === 0, `${file}: 같은 문제 안 보기 중복 없음 (위반 ${dupChoice})`)
  ok(emptyQ === 0, `${file}: 빈 문제 없음 (위반 ${emptyQ})`)
  ok(dupQ === 0, `${file}: 문제 중복 없음 (중복 ${dupQ})`)
}
ok(totalQuestions > 1000, `퀴즈 문제 수집됨 (${totalQuestions}문제)`)

// ─────────────────────────────────────────────
// 2. 바둑 레슨 퍼즐 — CLAUDE.md 규칙 자동 검증
// ─────────────────────────────────────────────
const CATEGORIES = ['입문', '기초', '연결', '영토', '눈', '사활 기초', '규칙', '기본 전략', '중급 사활', '실전']
const lessonFiles = readdirSync(DATA).filter(f => /^badukLessons\d+\.js$/.test(f)).sort()
ok(lessonFiles.length >= 5, `바둑 레슨 파일 ${lessonFiles.length}개`)

let allLessons = []
for (const file of lessonFiles) {
  const mod = await import(pathToFileURL(join(DATA, file)).href)
  for (const v of Object.values(mod)) {
    if (Array.isArray(v) && v.length && v[0] && v[0].puzzles) {
      allLessons = allLessons.concat(v.map(l => ({ ...l, _file: file })))
    }
  }
}
ok(allLessons.length > 40, `레슨 ${allLessons.length}개 수집`)

// 레슨 id 중복 — 진행도가 lessonId 기준이라 중복이면 진행도가 꼬인다
const ids = allLessons.map(l => l.id)
const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i)
ok(dupIds.length === 0, `레슨 id 중복 없음 (중복: ${[...new Set(dupIds)].join(', ') || '없음'})`)

let badCategory = 0, blockedAnswer = 0, outOfRange = 0, badCount = 0, missingGoal = 0, overlapSetup = 0
for (const lesson of allLessons) {
  const size = lesson.boardSize
  if (!CATEGORIES.includes(lesson.category)) {
    badCategory++
    failures.push(`레슨 ${lesson.id}(${lesson._file}): category '${lesson.category}' 가 CATEGORIES에 없음`)
  }
  for (const [pi, p] of (lesson.puzzles || []).entries()) {
    const where = `레슨 ${lesson.id} 퍼즐 ${pi + 1}(${lesson._file})`
    if (!p.goal || String(p.goal).trim() === '') { missingGoal++; failures.push(`${where}: goal 없음`) }

    const black = (p.setup && p.setup.black) || []
    const white = (p.setup && p.setup.white) || []
    // 흑/백이 같은 좌표에 놓이면 렌더가 깨진다
    const stoneKeys = [...black, ...white].map(([r, c]) => `${r},${c}`)
    if (new Set(stoneKeys).size !== stoneKeys.length) {
      overlapSetup++
      failures.push(`${where}: setup의 흑/백 돌 좌표가 겹침`)
    }
    for (const [r, c] of [...black, ...white]) {
      if (!(Number.isInteger(r) && Number.isInteger(c) && r >= 0 && c >= 0 && r < size && c < size)) {
        outOfRange++
        failures.push(`${where}: setup 돌 [${r},${c}] 이 보드(${size}×${size}) 밖`)
      }
    }

    if (p.type === 'place') {
      const a = p.answer
      if (!Array.isArray(a) || a.length !== 2) {
        outOfRange++
        failures.push(`${where}: place 타입 answer가 [r,c] 형태가 아님 (${JSON.stringify(a)})`)
        continue
      }
      const [ar, ac] = a
      if (!(ar >= 0 && ac >= 0 && ar < size && ac < size)) {
        outOfRange++
        failures.push(`${where}: answer [${ar},${ac}] 이 보드(${size}×${size}) 밖`)
      }
      // CLAUDE.md 규칙 1: 정답 좌표에 이미 돌이 있으면 UI가 클릭을 막아 퍼즐 진행 불가
      if (stoneKeys.includes(`${ar},${ac}`)) {
        blockedAnswer++
        failures.push(`${where}: answer [${ar},${ac}] 에 이미 돌이 있어 클릭 불가 (퍼즐 진행 불가)`)
      }
    } else if (p.type === 'count') {
      // CLAUDE.md 규칙 2: NumberPicker max=20
      if (!Number.isInteger(p.answer) || p.answer < 0 || p.answer > 20) {
        badCount++
        failures.push(`${where}: count 타입 answer=${p.answer} 가 0~20 범위 밖 (NumberPicker로 입력 불가)`)
      }
    }
  }
}
ok(badCategory === 0, `레슨 category가 모두 CATEGORIES와 일치 (위반 ${badCategory})`)
ok(blockedAnswer === 0, `place 정답이 빈 교차점 (돌에 막힌 퍼즐 ${blockedAnswer}개)`)
ok(outOfRange === 0, `좌표가 모두 보드 안 (위반 ${outOfRange})`)
ok(badCount === 0, `count 정답이 0~20 (위반 ${badCount})`)
ok(missingGoal === 0, `모든 퍼즐에 goal 있음 (위반 ${missingGoal})`)
ok(overlapSetup === 0, `setup 돌 좌표 겹침 없음 (위반 ${overlapSetup})`)

const totalPuzzles = allLessons.reduce((s, l) => s + (l.puzzles || []).length, 0)
ok(totalPuzzles > 100, `퍼즐 ${totalPuzzles}개 검사`)

console.log('\n========= 게임 데이터 정합성 =========')
console.log(`퀴즈: ${totalQuestions}문제 (${perFile.join(', ')})`)
console.log(`바둑: 레슨 ${allLessons.length}개 / 퍼즐 ${totalPuzzles}개`)
console.log(`✅ 통과: ${pass}`)
console.log(`❌ 실패: ${fail}`)
if (fail > 0) {
  console.log('\n상세:')
  failures.slice(0, 60).forEach(f => console.log('  -', f))
  if (failures.length > 60) console.log(`  ... 외 ${failures.length - 60}건`)
  process.exit(1)
}
