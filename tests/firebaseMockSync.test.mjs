// Firebase Realtime DB 모킹 + host↔guest 동기화 검증
//
// 각 게임에서:
// 1) host가 createRoom으로 초기 상태 작성
// 2) guest가 joinRoom으로 구독
// 3) host/guest가 번갈아 updateState 호출
// 4) 양 클라이언트의 state가 항상 일치하는지 검증
// 5) 차례/승부/재시작 흐름 검증
//
// 실제 useGameRoom.js의 동작을 그대로 흉내냅니다.

let pass = 0, fail = 0
const failures = []
function ok(cond, msg) {
  if (cond) { pass++ } else { fail++; failures.push(msg); console.error('❌', msg) }
}
function expectEq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected)
  if (a === e) pass++
  else { fail++; failures.push(`${msg}: actual=${a.slice(0,200)}, expected=${e.slice(0,200)}`); console.error(`❌ ${msg}`) }
}

// ─── Firebase 모킹 ───
// 실제 Firebase Realtime DB의 ref/set/onValue를 흉내냄
class MockDB {
  constructor() {
    this.data = new Map() // path → value
    this.listeners = new Map() // path → Set<callback>
  }
  set(path, value) {
    this.data.set(path, JSON.parse(JSON.stringify(value))) // deep copy
    // 해당 path와 상위 path 리스너 모두 깨움 (실제 Firebase 동작)
    for (const [lp, cbs] of this.listeners) {
      if (path === lp || path.startsWith(lp + '/')) {
        for (const cb of cbs) cb(this.data.get(lp))
      } else if (lp.startsWith(path + '/')) {
        // 상위가 갱신되면 하위도 영향
        const subPath = lp.slice(path.length + 1)
        const v = this._traverse(value, subPath.split('/'))
        for (const cb of cbs) cb(v)
      }
    }
  }
  _traverse(obj, keys) {
    let cur = obj
    for (const k of keys) {
      if (cur == null) return null
      cur = cur[k]
    }
    return cur
  }
  get(path) { return this.data.get(path) }
  onValue(path, cb) {
    if (!this.listeners.has(path)) this.listeners.set(path, new Set())
    this.listeners.get(path).add(cb)
    // 즉시 초기값 전달 — 실제 Firebase는 중첩 경로를 읽으므로,
    // 정확한 키가 없으면 상위(조상) 키를 traverse해 중첩 초기값을 찾아 전달한다.
    if (this.data.has(path)) {
      cb(this.data.get(path))
    } else {
      for (const [dp, dv] of this.data) {
        if (path.startsWith(dp + '/')) {
          const v = this._traverse(dv, path.slice(dp.length + 1).split('/'))
          if (v != null) { cb(v); break }
        }
      }
    }
    return () => this.listeners.get(path)?.delete(cb)
  }
  remove(path) {
    this.data.delete(path)
    for (const [lp, cbs] of this.listeners) {
      if (lp === path || lp.startsWith(path + '/')) {
        for (const cb of cbs) cb(null)
      }
    }
  }
}

// useGameRoom과 동일한 인터페이스를 mock으로 흉내
function createMockRoom(db, gameType, code, role) {
  const path = `rooms/${gameType}/${code}`
  let gameState = null
  let connected = false
  const stateCbs = []
  const guestCbs = []

  const room = {
    gameType,
    roomCode: code,
    role,
    myColor: role === 'host' ? 'black' : 'white',
    get gameState() { return gameState },
    get connected() { return connected },
    error: '',
    setError(e) { this.error = e },
  }

  if (role === 'host') {
    // host: 방 만들고 state 구독, guest 접속 감시
  } else {
    // guest: 이미 만들어진 방에 참가
  }

  // 'state' 변경 구독
  db.onValue(path + '/state', (val) => {
    if (val) {
      gameState = val
      stateCbs.forEach(cb => cb(val))
    }
  })
  if (role === 'host') {
    // guest 접속 감시
    db.onValue(path + '/guest', (val) => {
      if (val === true) {
        connected = true
        guestCbs.forEach(cb => cb())
      }
    })
  } else {
    connected = true
  }

  room.createRoom = (initialState) => {
    db.set(path, { state: initialState, host: true, guest: false, createdAt: Date.now() })
    return code
  }
  room.joinRoom = (joinCode) => {
    const existing = db.get(`rooms/${gameType}/${joinCode}`)
    if (!existing) { room.error = '방을 찾을 수 없어요'; return false }
    db.set(`rooms/${gameType}/${joinCode}/guest`, true)
    room.roomCode = joinCode
    return true
  }
  room.updateState = (newState) => {
    db.set(`${path}/state`, newState)
  }
  room.leaveRoom = () => {
    db.remove(path)
  }
  room._onStateChange = (cb) => stateCbs.push(cb)
  room._onGuestConnect = (cb) => guestCbs.push(cb)

  return room
}

// ─── 호스트/게스트 페어 설정 ───
function setupHostGuest(gameType, initialState) {
  const db = new MockDB()
  const code = '42'
  const host = createMockRoom(db, gameType, code, 'host')
  host.createRoom(initialState)
  const guest = createMockRoom(db, gameType, code, 'guest')
  guest.joinRoom(code)
  return { db, host, guest }
}

// ─── 1. Gonu 동기화 시뮬레이션 ───
function testGonuSync() {
  const ADJ = [[1,3],[0,2,4],[1,5],[0,4,6],[1,3,5,7],[2,4,8],[3,7],[4,6,8],[5,7]]
  const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8]]
  function checkWin(b, p) { return LINES.find(l => l.every(i => b[i] === p)) || null }
  function opp(p) { return p === 'black' ? 'white' : 'black' }
  function flat(b) { return b.map(c => c||'').join(',') }
  function unflat(s) { return s.split(',').map(c => c||null) }

  const init = Array(9).fill(null)
  init[0]='black';init[1]='black';init[3]='black';init[5]='white';init[7]='white';init[8]='white'
  const initState = { board: flat(init), turn: 'black', winner: '', winLine: null }

  const { host, guest } = setupHostGuest('gonu', initState)

  // 두 클라이언트 같은 상태?
  expectEq(host.gameState, initState, 'Gonu: host initial state')
  expectEq(guest.gameState, initState, 'Gonu: guest initial state synced')

  // host(black) moves: 0 → 4
  let board = unflat(host.gameState.board)
  board[0] = null; board[4] = 'black'
  host.updateState({ board: flat(board), turn: 'white', winner: '', winLine: null })

  ok(host.gameState.turn === 'white', 'Gonu: host sees turn=white after move')
  ok(guest.gameState.turn === 'white', 'Gonu: guest sees turn=white (synced)')
  expectEq(host.gameState.board, guest.gameState.board, 'Gonu: board synced after host move')

  // guest(white) moves: 5 → 2
  board = unflat(guest.gameState.board)
  board[5] = null; board[2] = 'white'
  guest.updateState({ board: flat(board), turn: 'black', winner: '', winLine: null })

  ok(host.gameState.turn === 'black', 'Gonu: turn back to black after guest move')
  expectEq(host.gameState.board, guest.gameState.board, 'Gonu: synced after guest move')

  // 승부 시뮬레이션 — black이 4,5,3을 차지 (4번줄: 3,4,5)
  // 현재 board: [null, black, white, black, black, null, null, white, white]
  board = unflat(host.gameState.board)
  // black: 1, 3, 4 이미 있음. 5에 white 있음. 5 비워야 함
  // 흑이 1 → 0 이동? 합법인지 확인...
  // 더 간단히: 시나리오 강제
  board[5] = 'black' // 인위적
  host.updateState({ board: flat(board), turn: 'white', winner: 'black', winLine: [3,4,5] })

  ok(guest.gameState.winner === 'black', 'Gonu: guest sees winner=black')
  expectEq(guest.gameState.winLine, [3,4,5], 'Gonu: winLine synced')

  // 재시작: host가 reset
  host.updateState(initState)
  expectEq(host.gameState.board, initState.board, 'Gonu: reset board on host')
  expectEq(guest.gameState.board, initState.board, 'Gonu: reset synced to guest')
}

// ─── 2. Othello 동기화 ───
function testOthelloSync() {
  const SIZE = 8
  function createBoard() {
    const b = Array.from({length:SIZE},()=>Array(SIZE).fill(null))
    b[3][3]='white';b[4][4]='white';b[3][4]='black';b[4][3]='black'
    return b
  }
  function flat(b) { return b.map(r => r.map(c => c?c[0]:'.').join('')).join('|') }
  function unflat(s) { return s.split('|').map(r => r.split('').map(c => c === 'b' ? 'black' : c === 'w' ? 'white' : null)) }

  const init = { board: flat(createBoard()), turn: 'black', winner: '', passed: false }
  const { host, guest } = setupHostGuest('othello', init)

  expectEq(host.gameState, init, 'Othello: initial state')
  ok(host.gameState.board === guest.gameState.board, 'Othello: board synced')

  // host black moves at (2,3) which is a legal move
  const b = unflat(host.gameState.board)
  b[2][3] = 'black'; b[3][3] = 'black' // flip
  host.updateState({ board: flat(b), turn: 'white', winner: '', passed: false })

  ok(guest.gameState.turn === 'white', 'Othello: guest turn synced')
  ok(unflat(guest.gameState.board)[2][3] === 'black', 'Othello: guest sees host move')
  ok(unflat(guest.gameState.board)[3][3] === 'black', 'Othello: guest sees flip')
}

// ─── 3. ConnectFour 동기화 ───
function testConnectFourSync() {
  const ROWS=6, COLS=7
  function createBoard() { return Array.from({length:ROWS},()=>Array(COLS).fill(null)) }
  function flat(b) { return b.map(r => r.map(c => c?c[0]:'.').join('')).join('|') }
  function unflat(s) { return s.split('|').map(r => r.split('').map(c => c==='r'?'red':c==='y'?'yellow':null)) }

  const init = { board: flat(createBoard()), turn: 'red', winner: '', winCells: [] }
  const { host, guest } = setupHostGuest('connect4', init)
  ok(host.gameState.turn === 'red', 'Connect4: initial turn')

  // host(red) drops in col 3 (center)
  let b = unflat(host.gameState.board)
  b[5][3] = 'red'
  host.updateState({ board: flat(b), turn: 'yellow', winner: '', winCells: [] })
  ok(unflat(guest.gameState.board)[5][3] === 'red', 'Connect4: guest sees drop')
  ok(guest.gameState.turn === 'yellow', 'Connect4: guest turn synced to yellow')

  // guest(yellow) drops in col 3
  b = unflat(guest.gameState.board)
  b[4][3] = 'yellow'
  guest.updateState({ board: flat(b), turn: 'red', winner: '', winCells: [] })
  ok(unflat(host.gameState.board)[4][3] === 'yellow', 'Connect4: host sees guest drop')
}

// ─── 4. SixInRow 동기화 (한 턴에 2수) ───
function testSixSync() {
  const SIZE = 13
  function flat(b) { return b.map(r => r.map(c => c||'').join(',')).join('|') }

  const init = {
    board: flat(Array.from({length:SIZE},()=>Array(SIZE).fill(null))),
    turn: 'black',
    movesThisTurn: 0,
    moveNumber: 0,
    winner: null,
  }
  const { host, guest } = setupHostGuest('sixrow', init)

  // 첫 수 (1수만)
  host.updateState({ ...host.gameState, movesThisTurn: 0, moveNumber: 1, turn: 'white' })
  ok(guest.gameState.moveNumber === 1, 'SixRow: moveNumber synced')
  ok(guest.gameState.turn === 'white', 'SixRow: turn changed after 1 move (1st turn rule)')

  // 두 번째 수 (한 턴에 2수)
  guest.updateState({ ...guest.gameState, movesThisTurn: 1, moveNumber: 1 })
  ok(host.gameState.movesThisTurn === 1, 'SixRow: 1st of 2 moves')

  guest.updateState({ ...guest.gameState, movesThisTurn: 0, moveNumber: 3, turn: 'black' })
  ok(host.gameState.turn === 'black', 'SixRow: 2nd move complete, turn flips')
}

// ─── 5. Race Condition: 동시 업데이트 ───
function testRaceCondition() {
  const init = { board: 'init', turn: 'black', value: 0 }
  const { host, guest } = setupHostGuest('test', init)

  // host와 guest가 거의 동시에 업데이트
  host.updateState({ board: 'host', turn: 'white', value: 1 })
  // 곧바로 guest가 다른 업데이트 (host 업데이트 미수신 가정)
  guest.updateState({ board: 'guest', turn: 'black', value: 2 })

  // 마지막 쓰기가 이김 (Last-Write-Wins)
  ok(host.gameState.value === 2, 'Race: last write wins (host eventually sees value=2)')
  ok(guest.gameState.value === 2, 'Race: guest also sees value=2')
  // 둘 다 같은 상태로 수렴
  expectEq(host.gameState, guest.gameState, 'Race: both clients converge')
}

// ─── 6. 게스트 입장 전 호스트만의 상태 ───
function testHostBeforeGuest() {
  const db = new MockDB()
  const host = createMockRoom(db, 'test', '99', 'host')
  host.createRoom({ value: 1 })

  ok(!host.connected, 'BeforeGuest: host not connected before guest joins')
  ok(host.gameState.value === 1, 'BeforeGuest: host has initial state')

  // 게스트 입장
  const guest = createMockRoom(db, 'test', '99', 'guest')
  guest.joinRoom('99')

  ok(host.connected, 'BeforeGuest: host now connected')
  ok(guest.gameState.value === 1, 'BeforeGuest: guest receives state on join')
}

// ─── 7. 잘못된 코드 입장 ───
function testInvalidJoin() {
  const db = new MockDB()
  const host = createMockRoom(db, 'test', '11', 'host')
  host.createRoom({ value: 1 })

  const guest = createMockRoom(db, 'test', '99', 'guest')
  const ok2 = guest.joinRoom('99') // 존재하지 않는 방
  ok(ok2 === false, 'InvalidJoin: returns false for missing room')
  ok(guest.error.length > 0, 'InvalidJoin: error set')
}

// ─── 8. 방 나가기 (cleanup) ───
function testLeaveRoom() {
  const db = new MockDB()
  const host = createMockRoom(db, 'test', '77', 'host')
  host.createRoom({ value: 1 })

  ok(db.get('rooms/test/77') !== undefined, 'Leave: room exists before leave')
  host.leaveRoom()
  ok(db.get('rooms/test/77') === undefined, 'Leave: room removed after leave')
}

// ─── 실행 ───
testGonuSync()
testOthelloSync()
testConnectFourSync()
testSixSync()
testRaceCondition()
testHostBeforeGuest()
testInvalidJoin()
testLeaveRoom()

console.log(`\n========= Firebase 동기화 모킹 테스트 =========`)
console.log(`✅ 통과: ${pass}`)
console.log(`❌ 실패: ${fail}`)
if (fail > 0) {
  console.log('\n--- 실패 ---')
  failures.forEach(f => console.log('  -', f))
}
process.exit(fail === 0 ? 0 : 1)
