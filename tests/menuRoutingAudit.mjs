// 메뉴 ↔ 라우팅 연결 검증
//
// App.jsx는 currentPage 문자열 비교로 화면을 고른다.
// 그래서 허브 메뉴의 key와 App.jsx의 조건문이 어긋나면
// 버튼을 눌러도 아무 화면이 안 나오는(빈 화면) 죽은 메뉴가 된다.
// 컴파일도 통과하고 기존 테스트도 못 잡으므로 여기서 문자열 대조로 확인한다.

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const read = (p) => readFileSync(join(SRC, p), 'utf8')

let pass = 0, fail = 0
const failures = []
function ok(cond, msg) {
  if (cond) { pass++ } else { fail++; failures.push(msg); console.error('❌', msg) }
}

const app = read('App.jsx')

// App.jsx가 처리하는 모든 currentPage 값
const routedPages = new Set(
  [...app.matchAll(/currentPage === '([^']+)'/g)].map(m => m[1])
)

// 특정 배열 리터럴 안의 key만 뽑는다 (DAILY_CHALLENGES 같은 비(非)내비게이션 목록 제외)
function keysInBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker)
  if (start < 0) throw new Error(`블록 시작을 못 찾음: ${startMarker}`)
  const end = endMarker ? source.indexOf(endMarker, start) : source.length
  const block = source.slice(start, end < 0 ? source.length : end)
  return [...block.matchAll(/key: '([^']+)'/g)].map(m => m[1])
}

// ── 1. GameHub → game-<key> ──
const gameHub = read('components/GameHub.jsx')
const gameKeys = keysInBlock(gameHub, 'const categories = [', 'return (')
ok(gameKeys.length > 40, `GameHub 게임 키 추출 (${gameKeys.length}개)`)
ok(new Set(gameKeys).size === gameKeys.length,
  `GameHub 키 중복 없음 (중복: ${gameKeys.filter((k, i) => gameKeys.indexOf(k) !== i).join(', ') || '없음'})`)
for (const k of gameKeys) {
  ok(routedPages.has('game-' + k), `GameHub '${k}' → App.jsx에 'game-${k}' 라우트 있음`)
}

// ── 2. EnglishHub → game-eng-<key> ──
const engKeys = keysInBlock(read('components/EnglishHub.jsx'), 'const GAMES = [', 'const DAILY_CHALLENGES')
ok(engKeys.length === 5, `EnglishHub 게임 5개 (${engKeys.length})`)
for (const k of engKeys) {
  ok(routedPages.has('game-eng-' + k), `EnglishHub '${k}' → 'game-eng-${k}' 라우트 있음`)
}

// ── 3. MathHub → game-math-<key> ──
const mathKeys = keysInBlock(read('components/MathHub.jsx'), 'const GAMES = [', 'const DAILY_CHALLENGES')
ok(mathKeys.length === 6, `MathHub 게임 6개 (${mathKeys.length})`)
for (const k of mathKeys) {
  ok(routedPages.has('game-math-' + k), `MathHub '${k}' → 'game-math-${k}' 라우트 있음`)
}

// ── 4. FamilyHub → pageMap → currentPage ──
const familyHub = read('components/FamilyHub.jsx')
const familyKeys = [...familyHub.matchAll(/btn\('([^']+)'/g)].map(m => m[1])
ok(familyKeys.length > 5, `FamilyHub 메뉴 키 추출 (${familyKeys.length}개)`)

const pageMapMatch = app.match(/const pageMap = \{([^}]+)\}/)
ok(!!pageMapMatch, 'App.jsx에 FamilyHub pageMap 존재')
const pageMap = {}
if (pageMapMatch) {
  for (const m of pageMapMatch[1].matchAll(/(\w+):\s*'([^']+)'/g)) pageMap[m[1]] = m[2]
}
for (const k of familyKeys) {
  const mapped = pageMap[k]
  ok(!!mapped, `FamilyHub '${k}' → pageMap에 등록됨`)
  if (mapped) ok(routedPages.has(mapped), `FamilyHub '${k}' → '${mapped}' 라우트 있음`)
}

// ── 5. 라우트는 있는데 메뉴에서 닿을 수 없는 화면 (죽은 코드 탐지) ──
const reachable = new Set([
  ...gameKeys.map(k => 'game-' + k),
  ...engKeys.map(k => 'game-eng-' + k),
  ...mathKeys.map(k => 'game-math-' + k),
  ...Object.values(pageMap),
])
// 허브/기본 화면 등 메뉴 key로 도달하지 않는 정상 페이지
const NON_MENU_PAGES = new Set([
  'hub', 'home', 'add', 'addBank', 'list', 'deleted', 'profile',
  'trips', 'tripDetail', 'tripEdit', 'game', 'familyHub', 'family',
  'todo', 'timer', 'study', 'memo', 'growth', 'budget',
  'game-english', 'game-math',
])
const orphans = [...routedPages].filter(p => !reachable.has(p) && !NON_MENU_PAGES.has(p))
ok(orphans.length === 0, `메뉴에서 닿을 수 없는 라우트 없음 (발견: ${orphans.join(', ') || '없음'})`)

// ── 6. 라우팅된 컴포넌트가 실제로 import 되어 있는지 ──
// `import A from`, `import { B, C } from`, `import A, { B } from` 세 형태를 모두 처리
const importedNames = new Set(
  [...app.matchAll(/^import\s+([^'"]+?)\s+from/gm)].flatMap(m => {
    const clause = m[1]
    const named = clause.match(/\{([^}]*)\}/)
    const names = named ? named[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop()) : []
    const def = clause.replace(/\{[^}]*\}/, '').replace(/,/g, ' ').trim()
    if (def) names.push(def)
    return names.filter(Boolean)
  })
)
const usedComponents = new Set([...app.matchAll(/<([A-Z]\w+)/g)].map(m => m[1]))
for (const c of usedComponents) {
  ok(importedNames.has(c), `App.jsx에서 쓰는 <${c}> 가 import 되어 있음`)
}

console.log('\n========= 메뉴 ↔ 라우팅 검증 =========')
console.log(`게임 ${gameKeys.length}개 · 영어 ${engKeys.length}개 · 수학 ${mathKeys.length}개 · 가족 ${familyKeys.length}개`)
console.log(`✅ 통과: ${pass}`)
console.log(`❌ 실패: ${fail}`)
if (fail > 0) {
  console.log('\n실패 목록:')
  failures.forEach(f => console.log('  -', f))
  process.exit(1)
}
