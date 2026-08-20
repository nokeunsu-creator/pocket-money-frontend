// 게임 "한 번씩 실행" 스모크 테스트
//
// 게임 56개를 손으로 클릭해볼 수는 없으니, 각 컴포넌트를 실제로 렌더링해서
// 첫 화면이 크래시 없이 뜨는지 확인한다. 정적 감사(패턴 검사)와 달리
// 컴포넌트 본문과 useState 초기화가 실제로 실행되므로
// undefined 접근, 잘못된 초기 상태, 데이터 인덱스 오류 같은 걸 잡는다.
//
// 실행: node --import ./tests/smokeRender.register.mjs tests/smokeRender.test.mjs
//
// 한계: useEffect는 renderToString에서 실행되지 않는다.
//       따라서 "화면 진입 시 즉시 크래시"만 잡고, 상호작용 이후는 못 잡는다.

import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const COMPONENTS = join(ROOT, 'src', 'components')

let pass = 0, fail = 0
const failures = []

// ── 게임이 아닌 컴포넌트 (허브/폼/목록) 제외 ──
const NON_GAME = new Set([
  'AchievementList', 'AddBankEntry', 'AddEntry', 'BudgetAdd', 'BudgetList', 'BudgetMain',
  'DeletedList', 'DiaryHub', 'Dictation', 'EntryList', 'FamilyHub', 'FamilyTree',
  'GameHub', 'GrowthTracker', 'Home', 'MainHub', 'ProfileSelect', 'QuickMemo',
  'QuizLeaderboard', 'SavingsGoals', 'StudyMain', 'StudyTimer', 'TodoAdd', 'TodoList',
  'TripDetail', 'TripEdit', 'TripList', 'EnglishHub', 'MathHub', 'Dojo',
  'InlineSkate', 'ShuttleRun', 'BadukClassroom', 'Magic', 'MagicSvg',
])

// 데이터를 prop으로 받아야 하는 컴포넌트 → App.jsx가 넘기는 것과 같은 데이터를 준다
const NEEDS_QUIZ_DATA = new Set(['GradeQuiz'])

function makeProps(name, quizData) {
  const props = {
    onBack: () => {},
    onSelectGame: () => {},
    onDone: () => {},
    onCancel: () => {},
    user: '테스트',
    currentUser: '테스트',
  }
  if (NEEDS_QUIZ_DATA.has(name)) {
    props.quiz = quizData
    props.data = quizData
    props.title = '테스트 퀴즈'
    props.emoji = '❓'
  }
  return props
}

const files = readdirSync(COMPONENTS)
  .filter(f => f.endsWith('.jsx'))
  .map(f => f.replace(/\.jsx$/, ''))
  .filter(n => !NON_GAME.has(n))
  .sort()

// GradeQuiz용 최소 퀴즈 데이터 (학년별 questions 구조)
const sampleQuiz = {
  3: { questions: [{ q: '테스트 문제?', choices: ['가', '나', '다', '라'], answer: 0, explanation: '설명' }] },
  4: { questions: [{ q: '테스트 문제?', choices: ['가', '나', '다', '라'], answer: 1, explanation: '설명' }] },
  5: { questions: [{ q: '테스트 문제?', choices: ['가', '나', '다', '라'], answer: 2, explanation: '설명' }] },
  6: { questions: [{ q: '테스트 문제?', choices: ['가', '나', '다', '라'], answer: 3, explanation: '설명' }] },
}

console.log(`게임 컴포넌트 ${files.length}개 렌더링 시도...\n`)

for (const name of files) {
  let mod
  try {
    mod = await import(pathToFileURL(join(COMPONENTS, name + '.jsx')).href)
  } catch (e) {
    fail++
    failures.push(`${name}: import 실패 — ${e.message.split('\n')[0]}`)
    console.error(`❌ ${name} — import 실패: ${e.message.split('\n')[0]}`)
    continue
  }

  const Comp = mod.default
  if (typeof Comp !== 'function') {
    fail++
    failures.push(`${name}: default export가 컴포넌트가 아님 (${typeof Comp})`)
    console.error(`❌ ${name} — default export 없음`)
    continue
  }

  try {
    const html = renderToString(createElement(Comp, makeProps(name, sampleQuiz)))
    if (typeof html !== 'string' || html.length === 0) {
      fail++
      failures.push(`${name}: 렌더 결과가 빈 문자열 (화면에 아무것도 안 나옴)`)
      console.error(`❌ ${name} — 빈 렌더`)
    } else {
      pass++
      console.log(`✅ ${name} (${html.length}바이트)`)
    }
  } catch (e) {
    fail++
    const first = String(e.message).split('\n')[0]
    failures.push(`${name}: 렌더 중 예외 — ${first}`)
    console.error(`❌ ${name} — 렌더 예외: ${first}`)
  }
}

console.log('\n========= 게임 실행(렌더) 스모크 =========')
console.log(`✅ 정상: ${pass}`)
console.log(`❌ 실패: ${fail}`)
if (fail > 0) {
  console.log('\n실패 목록:')
  failures.forEach(f => console.log('  -', f))
  process.exit(1)
}
