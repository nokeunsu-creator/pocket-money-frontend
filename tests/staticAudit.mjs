// 온라인 모드가 추가된 게임들의 구조 검증
// - useGameRoom import
// - mode 상태 변수
// - room.leaveRoom 호출 (메모리 누수 방지)
// - 'online' 분기 처리
// - 직렬화 함수 존재 (board이 있는 경우)

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const COMPONENTS = 'F:/workspace/pocket-money_260423/frontend/src/components'
const TARGETS = ['Gonu.jsx', 'Othello.jsx', 'NineMensMorris.jsx', 'Hex.jsx', 'BlokusDuo.jsx', 'Quarto.jsx', 'ConnectFour.jsx', 'Checkers.jsx']

let pass = 0, fail = 0
function check(name, cond, msg) {
  if (cond) { pass++ } else { fail++; console.error(`❌ [${name}] ${msg}`) }
}

for (const file of TARGETS) {
  const src = readFileSync(join(COMPONENTS, file), 'utf8')
  check(file, src.includes(`from '../utils/useGameRoom'`), `useGameRoom import 없음`)
  check(file, /useGameRoom\(['"][a-z0-9]+['"]\)/.test(src), `useGameRoom('gametype') 호출 없음`)
  check(file, /const \[mode, setMode\]/.test(src), `mode 상태 없음`)
  check(file, /room\.leaveRoom\(\)/.test(src), `room.leaveRoom() 호출 없음 (메모리 누수)`)
  check(file, /room\.createRoom\(/.test(src), `room.createRoom 호출 없음`)
  check(file, /room\.joinRoom\(/.test(src), `room.joinRoom 호출 없음`)
  check(file, /room\.connected/.test(src) || /room\.gameState/.test(src), `room 상태 사용 안 함`)
  check(file, /mode === 'online'/.test(src), `'online' 분기 없음`)
  check(file, /방을 (찾을 수 없|만들기)|방 코드/.test(src), `방 UI 텍스트 없음`)
  // 보드 게임: 직렬화 함수
  if (/createBoard|Array\.from.*\(.*\)\s*=>\s*Array/.test(src) || file === 'Gonu.jsx' || file === 'NineMensMorris.jsx') {
    check(file, /boardToFlat|piecesToFlat|board:\s*Array/.test(src), `직렬화 함수/패턴 없음`)
  }
}

// App.jsx에서 Yutnori 참조 제거 확인
const appSrc = readFileSync('F:/workspace/pocket-money_260423/frontend/src/App.jsx', 'utf8')
check('App.jsx', !appSrc.includes('Yutnori'), 'App.jsx에 Yutnori 참조 남아있음')
check('App.jsx', !appSrc.includes("'game-yutnori'"), 'App.jsx에 game-yutnori 라우트 남아있음')

const ghSrc = readFileSync(join(COMPONENTS, 'GameHub.jsx'), 'utf8')
check('GameHub.jsx', !ghSrc.includes("'yutnori'"), 'GameHub.jsx에 yutnori 게임 카드 남아있음')
check('GameHub.jsx', ghSrc.includes("'gonu'"), 'GameHub.jsx에 gonu 카드 있어야 함')
check('GameHub.jsx', ghSrc.includes('줄고누') && ghSrc.includes('온라인'), 'GameHub.jsx 줄고누 desc에 "온라인" 표기')

console.log(`\n========= 정적 분석 결과 =========`)
console.log(`✅ 통과: ${pass}`)
console.log(`❌ 실패: ${fail}`)
process.exit(fail === 0 ? 0 : 1)
