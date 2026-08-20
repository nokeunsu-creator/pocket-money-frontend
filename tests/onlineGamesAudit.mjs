// 모든 온라인 모드 게임 일괄 점검
// - 알려진 버그 패턴 검출
// - 직렬화 일관성
// - leaveRoom 호출

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const COMPONENTS = 'F:/workspace/pocket-money_260423/frontend/src/components'

// 온라인 모드가 있는 모든 게임 (WordChain/CollaborativeDrawing은 패스앤플레이 전용)
const ONLINE_GAMES = [
  'Gonu', 'Othello', 'ConnectFour', // 새로 추가
  'Omok', 'Chess', 'Baduk', 'Janggi', // 기존 보드게임
  'OneCard', 'Hula', // 기존 카드
  'NumberBaseball', 'MultiplyChallenge', 'MathSpeedQuiz', // 두뇌
  'MineMemoryOnline', 'LanguagePieceOnline', // 분리된 Online 파일
  'SixInRow', // 서바이벌
]

let pass = 0, fail = 0, warn = 0
const issues = []

function check(file, cond, msg, severity = 'error') {
  if (cond) { pass++ } else {
    if (severity === 'warn') { warn++; issues.push(`⚠️  [${file}] ${msg}`) }
    else { fail++; issues.push(`❌ [${file}] ${msg}`) }
  }
}

for (const game of ONLINE_GAMES) {
  const path = join(COMPONENTS, game + '.jsx')
  let src
  try {
    src = readFileSync(path, 'utf8')
  } catch (e) {
    console.error(`파일 없음: ${game}`)
    continue
  }

  // 1. useGameRoom 또는 useMultiGameRoom 또는 게임 전용 room hook 사용
  const usesRoom = /useGameRoom|useMultiGameRoom|useMineMemoryRoom/.test(src)
  check(game, usesRoom, 'room hook import 또는 사용 없음')

  // 2. leaveRoom 호출 (메모리 누수 방지)
  check(game, /leaveRoom\(\)|\.leaveRoom\b/.test(src), 'leaveRoom 호출 없음')

  // 3. createRoom 호출 (또는 게임 전용 시작 함수)
  check(game, /createRoom|createGame|createTable|r\.create/.test(src), 'createRoom 호출 없음')

  // 4. joinRoom 호출
  check(game, /joinRoom|joinTable|r\.join|joinAsPlayer/.test(src), 'joinRoom 호출 없음')

  // 5. 알려진 React Hook 버그 패턴
  // 5-1. useEffect 안에서 setState 호출 후 setTimeout이 자기를 다시 호출하는 패턴 (무한루프 가능성)
  const hasInfiniteRiskPattern = /useEffect\([^]*?setTimeout\([^]*?\1/.test(src)
  if (hasInfiniteRiskPattern) check(game, false, 'useEffect 안 setTimeout 자기 호출 패턴 (무한루프 가능)', 'warn')

  // 5-2. window.innerWidth를 직접 참조 (SSR 안전성, 일관성)
  const windowDirect = (src.match(/window\.innerWidth(?!\s*\?)/g) || []).length
  check(game, windowDirect <= 2, `window.innerWidth 직접 참조 너무 많음 (${windowDirect}회)`, 'warn')

  // 6. 직렬화 함수 (보드 게임)
  const isBoardGame = ['Gonu','Othello','ConnectFour','Omok','SixInRow','MineMemory'].includes(game)
  if (isBoardGame) {
    check(game, /boardToFlat|piecesToFlat|board:\s*\[|boardToString/.test(src),
      '보드 게임인데 직렬화 함수가 없음 (online 동기화 깨질 수 있음)', 'warn')
  }

  // 7. 'online' 분기 처리 (전용 online 컴포넌트면 항상 온라인 모드라 OK)
  const isOnlineOnly = /Online$/.test(game)
  check(game, isOnlineOnly || /mode === 'online'|'online'|isOnline|room\.connected/.test(src), '"online" 분기 처리 없음')

  // 8. 방 코드 입력 UI
  check(game, /방 코드|joinCode|roomCode/.test(src), '방 코드 UI 없음', 'warn')
}

console.log(`\n========= 온라인 게임 일괄 점검 =========`)
console.log(`✅ 통과: ${pass}`)
console.log(`⚠️  경고: ${warn}`)
console.log(`❌ 실패: ${fail}`)
if (issues.length) {
  console.log('\n--- 이슈 목록 ---')
  issues.forEach(i => console.log(i))
}
process.exit(fail === 0 ? 0 : 1)
