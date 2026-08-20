// 온라인 방 배정 로직 검증
//
// 다른 테스트들과 달리 여기서는 src/utils/roomCodes.js를 **실제로 import**한다.
// (firebaseMockSync.test.mjs는 훅을 흉내내기 때문에 방 생성/참가 경로의 버그를 못 잡았다)
//
// 회귀 방지 대상:
// 1) 방 코드가 2자리(90개)뿐인데 중복 확인 없이 set해서 남의 방을 덮어쓰던 문제
// 2) 2인 방에 세 번째 사람이 들어와 기존 게스트를 덮어쓰던 문제
// 3) 상대가 나가도 connected가 true로 남아 화면이 멈추던 문제
// 4) 동시 참가 시 같은 슬롯/역할을 두 명이 잡던 문제
// 5) eventSeq가 같은 값으로 두 번 쓰여 이벤트를 놓치던 문제

import {
  pickFreeCode, expiredRoomCodes, duoJoinError, findFreeSlot,
  nextMineRole, nextEventSeq,
  ROOM_CODE_MIN, ROOM_CODE_MAX, ROOM_CODE_COUNT, ROOM_TTL_MS,
} from '../src/utils/roomCodes.js'

let pass = 0, fail = 0
const failures = []
function ok(cond, msg) {
  if (cond) { pass++ } else { fail++; failures.push(msg); console.error('❌', msg) }
}
function expectEq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected)
  if (a === e) pass++
  else { fail++; failures.push(`${msg}: ${a} !== ${e}`); console.error(`❌ ${msg}: ${a} !== ${e}`) }
}

// ─────────────────────────────────────────────
// 1. pickFreeCode — 살아있는 방을 절대 덮어쓰지 않는다
// ─────────────────────────────────────────────
{
  // 빈 상태
  const c = pickFreeCode([])
  ok(Number(c) >= ROOM_CODE_MIN && Number(c) <= ROOM_CODE_MAX, `코드 범위 ${ROOM_CODE_MIN}~${ROOM_CODE_MAX}: ${c}`)
  ok(typeof c === 'string', '코드는 문자열 (Firebase 키로 쓰임)')

  // 무작위가 하필 사용 중인 코드만 뽑아도 피해야 한다
  const alwaysTen = () => 0 // → '10'
  expectEq(pickFreeCode(['10'], alwaysTen), '11', 'rand가 계속 10을 뽑아도 사용 중이면 다른 코드')
  expectEq(pickFreeCode(['10', '11', '12'], alwaysTen), '13', '연속으로 막혀도 빈 코드까지 밀고 감')

  // 89개가 차 있으면 남은 1개를 정확히 찾아야 한다
  const all = []
  for (let n = ROOM_CODE_MIN; n <= ROOM_CODE_MAX; n++) all.push(String(n))
  const taken89 = all.filter(c2 => c2 !== '77')
  expectEq(pickFreeCode(taken89, alwaysTen), '77', '89개 사용 중이면 남은 77을 찾는다')

  // 90개 전부 차면 null (호출부가 에러 표시)
  expectEq(pickFreeCode(all), null, '전부 사용 중이면 null')
  expectEq(all.length, ROOM_CODE_COUNT, `총 코드 수 ${ROOM_CODE_COUNT}`)

  // 숫자로 넘겨도 동작 (Object.keys는 문자열이지만 방어)
  expectEq(pickFreeCode([10], alwaysTen), '11', '숫자 코드도 사용 중으로 인식')

  // 1000번 뽑아도 사용 중 코드는 절대 안 나온다
  const taken = ['13', '42', '77', '80']
  let violated = 0
  for (let i = 0; i < 1000; i++) {
    if (taken.includes(pickFreeCode(taken))) violated++
  }
  expectEq(violated, 0, '1000회 반복해도 사용 중 코드 미반환')
}

// ─────────────────────────────────────────────
// 2. expiredRoomCodes — 만료 방만 지운다
// ─────────────────────────────────────────────
{
  const now = 1_000_000_000_000
  const rooms = {
    '11': { createdAt: now - ROOM_TTL_MS - 1 },   // 만료
    '22': { createdAt: now - ROOM_TTL_MS + 1000 }, // 아직 살아있음
    '33': { createdAt: now },                      // 방금
    '44': {},                                      // createdAt 없음 → 판단 불가
  }
  expectEq(expiredRoomCodes(rooms, now).sort(), ['11'], '만료된 방만 반환')
  expectEq(expiredRoomCodes(null, now), [], 'rooms 없으면 빈 배열')
  ok(!expiredRoomCodes(rooms, now).includes('44'), 'createdAt 없는 방은 살려둔다')

  // 살아있는 코드는 새 방 코드 후보에서 제외되어야 한다
  const expired = expiredRoomCodes(rooms, now)
  const alive = Object.keys(rooms).filter(c => !expired.includes(c))
  expectEq(alive.sort(), ['22', '33', '44'], '살아있는 코드 목록')
  const fresh = pickFreeCode(alive)
  ok(!alive.includes(fresh), '새 코드는 살아있는 방과 겹치지 않음')
}

// ─────────────────────────────────────────────
// 3. duoJoinError — 2인 방 정원 초과 거부
// ─────────────────────────────────────────────
{
  expectEq(duoJoinError(null), '방을 찾을 수 없어요', '없는 방')
  expectEq(duoJoinError({ host: true, guest: false }), null, '빈자리 있으면 통과')
  ok(duoJoinError({ host: true, guest: true }) !== null, '이미 2명이면 거부 (예전엔 덮어썼음)')
  expectEq(duoJoinError({ host: true }), null, 'guest 필드 없는 옛 방도 참가 허용')
}

// ─────────────────────────────────────────────
// 4. findFreeSlot — 다인 방 슬롯
// ─────────────────────────────────────────────
{
  expectEq(findFreeSlot({}, 4), 0, '빈 방 → 0번')
  expectEq(findFreeSlot({ 0: { name: 'a' } }, 4), 1, '0번 차면 1번')
  expectEq(findFreeSlot({ 0: { name: 'a' }, 2: { name: 'c' } }, 4), 1, '중간 빈자리 재사용')
  expectEq(findFreeSlot({ 0: 1, 1: 1, 2: 1, 3: 1 }, 4), -1, '꽉 차면 -1')
  expectEq(findFreeSlot({ 0: 1, 1: 1, 2: 1, 3: 1 }, 6), 4, 'maxPlayers 6이면 4번 가능')
  expectEq(findFreeSlot(null, 4), 0, 'players 없으면 0번')
  ok(findFreeSlot({ 0: 1 }, 1) === -1, 'max 1이면 0번만 → 꽉 참')
}

// ─────────────────────────────────────────────
// 5. nextMineRole — 망각의 지뢰 3자 방
// ─────────────────────────────────────────────
{
  expectEq(nextMineRole({ dealer: true, p1: false, p2: false }).role, 'p1', '첫 참가자 p1')
  expectEq(nextMineRole({ dealer: true, p1: true, p2: false }).role, 'p2', '둘째 참가자 p2')
  expectEq(nextMineRole({ dealer: true, p1: true, p2: true }).role, null, '셋째는 거부')
  ok(nextMineRole({ dealer: true, p1: true, p2: true }).error, '거부 시 에러 메시지 존재')
  expectEq(nextMineRole({ dealer: false }).role, null, '딜러 없는 방 거부')
  expectEq(nextMineRole(null).role, null, '없는 방 거부')
}

// ─────────────────────────────────────────────
// 6. nextEventSeq — 절대 같은 값이 두 번 나오지 않는다
// ─────────────────────────────────────────────
{
  expectEq(nextEventSeq(0, 0), 1, '0,0 → 1')
  expectEq(nextEventSeq(5, 3), 6, '로컬이 앞서면 로컬 기준')
  expectEq(nextEventSeq(3, 5), 6, '원격이 앞서면 원격 기준')
  expectEq(nextEventSeq(undefined, undefined), 1, 'undefined 방어')
  expectEq(nextEventSeq(0, null), 1, 'null 방어')

  // 원격이 늦게 갱신되는 상황(옛 버그 재현 조건)에서도 단조 증가
  let local = 0
  const remoteStale = 0 // 리스너가 아직 안 옴
  const seqs = []
  for (let i = 0; i < 5; i++) {
    local = nextEventSeq(local, remoteStale)
    seqs.push(local)
  }
  expectEq(seqs, [1, 2, 3, 4, 5], '원격이 계속 0이어도 seq는 증가 (옛 버그: 1,1,1,1,1)')
  expectEq(new Set(seqs).size, seqs.length, 'seq 중복 없음')
}

// ─────────────────────────────────────────────
// 7. Firebase 모킹 — 수정된 방 생성/참가/이탈 흐름
// ─────────────────────────────────────────────
class MockDB {
  constructor() { this.data = new Map(); this.listeners = new Map() }
  _notify(path) {
    for (const [lp, cbs] of this.listeners) {
      if (lp === path || lp.startsWith(path + '/') || path.startsWith(lp + '/')) {
        for (const cb of cbs) cb(this.read(lp))
      }
    }
  }
  read(path) {
    if (this.data.has(path)) return this.data.get(path)
    // 부모에 객체로 저장된 경우 하위 경로 조회
    for (const [dp, dv] of this.data) {
      if (path.startsWith(dp + '/')) {
        let cur = dv
        for (const k of path.slice(dp.length + 1).split('/')) {
          if (cur == null) return null
          cur = cur[k]
        }
        return cur === undefined ? null : cur
      }
    }
    return null
  }
  set(path, value) {
    // 부모 객체 안에 사는 하위 경로면 부모를 갱신
    let parent = null
    for (const dp of this.data.keys()) {
      if (path.startsWith(dp + '/')) { parent = dp; break }
    }
    if (parent) {
      const keys = path.slice(parent.length + 1).split('/')
      let cur = this.data.get(parent)
      for (let i = 0; i < keys.length - 1; i++) {
        if (cur[keys[i]] == null) cur[keys[i]] = {}
        cur = cur[keys[i]]
      }
      cur[keys[keys.length - 1]] = JSON.parse(JSON.stringify(value))
    } else {
      this.data.set(path, JSON.parse(JSON.stringify(value)))
    }
    this._notify(path)
  }
  remove(path) {
    this.data.delete(path)
    for (const dp of [...this.data.keys()]) {
      if (dp.startsWith(path + '/')) this.data.delete(dp)
    }
    this._notify(path)
  }
  onValue(path, cb) {
    if (!this.listeners.has(path)) this.listeners.set(path, new Set())
    this.listeners.get(path).add(cb)
    cb(this.read(path))
    return () => this.listeners.get(path)?.delete(cb)
  }
  // 실제 runTransaction과 동일: 핸들러가 undefined를 반환하면 커밋되지 않는다
  runTransaction(path, fn) {
    const next = fn(this.read(path))
    if (next === undefined) return { committed: false }
    this.set(path, next)
    return { committed: true }
  }
  roomCodes(gameType) {
    const prefix = `rooms/${gameType}/`
    const codes = new Set()
    for (const p of this.data.keys()) {
      if (p.startsWith(prefix)) codes.add(p.slice(prefix.length).split('/')[0])
    }
    return [...codes]
  }
}

// 수정된 useGameRoom의 흐름을 그대로 따라가는 클라이언트
// (판단 로직은 실제 roomCodes.js 함수를 호출한다)
function makeDuoClient(db, gameType) {
  const c = {
    roomCode: null, role: null, myColor: null,
    gameState: null, connected: false, error: '',
    _unsub: null, _guestUnsub: null,
  }
  c.createRoom = (initialState) => {
    const code = pickFreeCode(db.roomCodes(gameType))
    if (!code) { c.error = '지금은 방이 다 찼어요. 잠시 뒤에 다시 만들어 주세요'; return null }
    db.set(`rooms/${gameType}/${code}`, { state: initialState, host: true, guest: false, createdAt: 1 })
    c.roomCode = code; c.role = 'host'; c.myColor = 'black'; c.connected = false; c.error = ''
    c._unsub = db.onValue(`rooms/${gameType}/${code}/state`, v => {
      if (v != null) c.gameState = v; else c.connected = false
    })
    c._guestUnsub = db.onValue(`rooms/${gameType}/${code}/guest`, v => { c.connected = v === true })
    return code
  }
  c.joinRoom = (code) => {
    const err = duoJoinError(db.read(`rooms/${gameType}/${code}`))
    if (err) { c.error = err; return false }
    db.set(`rooms/${gameType}/${code}/guest`, true)
    c.roomCode = code; c.role = 'guest'; c.myColor = 'white'; c.connected = true; c.error = ''
    c._unsub = db.onValue(`rooms/${gameType}/${code}/state`, v => {
      if (v != null) c.gameState = v; else c.connected = false
    })
    return true
  }
  c.updateState = (s) => { if (c.roomCode) db.set(`rooms/${gameType}/${c.roomCode}/state`, s) }
  c.leaveRoom = () => {
    if (c._unsub) { c._unsub(); c._unsub = null }
    if (c._guestUnsub) { c._guestUnsub(); c._guestUnsub = null }
    if (c.roomCode) {
      if (c.role === 'guest') db.set(`rooms/${gameType}/${c.roomCode}/guest`, false)
      else db.remove(`rooms/${gameType}/${c.roomCode}`)
    }
    c.roomCode = null; c.role = null; c.myColor = null
    c.gameState = null; c.connected = false; c.error = ''
  }
  return c
}

// 7-1. 방 코드 충돌로 남의 방이 파괴되지 않는다
{
  const db = new MockDB()
  const a = makeDuoClient(db, 'omok')
  const b = makeDuoClient(db, 'omok')
  const codeA = a.createRoom({ board: 'A', turn: 'black' })
  a.updateState({ board: 'A-진행중', turn: 'white' })

  const codeB = b.createRoom({ board: 'B', turn: 'black' })
  ok(codeA !== codeB, `두 방의 코드가 다름 (${codeA} vs ${codeB})`)
  expectEq(db.read(`rooms/omok/${codeA}/state`), { board: 'A-진행중', turn: 'white' },
    'A의 진행 상태가 B의 방 생성으로 파괴되지 않음')
  expectEq(a.gameState, { board: 'A-진행중', turn: 'white' }, 'A 클라이언트 상태 유지')

  // 90개를 다 채우면 생성 실패를 알려준다 (조용히 남의 방을 덮어쓰지 않는다)
  const db2 = new MockDB()
  for (let n = ROOM_CODE_MIN; n <= ROOM_CODE_MAX; n++) {
    db2.set(`rooms/omok/${n}`, { host: true, guest: false, createdAt: 1 })
  }
  const full = makeDuoClient(db2, 'omok')
  expectEq(full.createRoom({ board: 'X' }), null, '코드 소진 시 null 반환')
  ok(full.error !== '', '코드 소진 시 사용자에게 에러 표시')
  expectEq(db2.roomCodes('omok').length, ROOM_CODE_COUNT, '기존 방 90개 그대로 (아무것도 파괴 안 됨)')
}

// 7-2. 세 번째 사람은 못 들어온다
{
  const db = new MockDB()
  const host = makeDuoClient(db, 'chess')
  const guest = makeDuoClient(db, 'chess')
  const intruder = makeDuoClient(db, 'chess')
  const code = host.createRoom({ board: 'init', turn: 'white' })

  expectEq(guest.joinRoom(code), true, '두 번째 사람은 참가 성공')
  ok(host.connected, '호스트가 게스트 접속을 감지')

  expectEq(intruder.joinRoom(code), false, '세 번째 사람은 참가 거부')
  ok(intruder.error !== '', '거부 사유 표시')
  expectEq(intruder.roomCode, null, '거부된 사람은 방에 안 들어감')
  expectEq(guest.myColor, 'white', '기존 게스트의 색이 유지됨 (옛 버그: 둘 다 백)')
  ok(guest.connected, '기존 게스트는 계속 연결됨')
}

// 7-3. 게스트가 나가면 호스트가 알고, 방은 살아남는다
{
  const db = new MockDB()
  const host = makeDuoClient(db, 'gonu')
  const guest = makeDuoClient(db, 'gonu')
  const code = host.createRoom({ board: 'init', turn: 'black' })
  guest.joinRoom(code)
  ok(host.connected, '연결됨')

  guest.leaveRoom()
  expectEq(host.connected, false, '게스트 이탈 시 호스트 connected=false (옛 버그: 영원히 true)')
  ok(db.read(`rooms/gonu/${code}`) != null, '방은 남아있음 (호스트가 계속 기다릴 수 있음)')

  // 새 친구가 다시 들어올 수 있다
  const guest2 = makeDuoClient(db, 'gonu')
  expectEq(guest2.joinRoom(code), true, '게스트 자리가 비어 새 친구 참가 가능')
  ok(host.connected, '새 게스트 접속을 다시 감지')
}

// 7-4. 호스트가 나가면 게스트가 안다
{
  const db = new MockDB()
  const host = makeDuoClient(db, 'hex')
  const guest = makeDuoClient(db, 'hex')
  const code = host.createRoom({ board: 'init', turn: 'black' })
  guest.joinRoom(code)

  host.leaveRoom()
  expectEq(guest.connected, false, '호스트 이탈 시 게스트 connected=false (옛 버그: 화면 멈춤)')
  expectEq(db.read(`rooms/hex/${code}`), null, '호스트가 나가면 방 삭제')
}

// 7-5. 다인 방 — 동시 참가 시 슬롯이 겹치지 않는다
{
  const db = new MockDB()
  const gameType = 'indian-poker'
  const code = pickFreeCode(db.roomCodes(gameType))
  db.set(`rooms/${gameType}/${code}`, {
    host: 0, maxPlayers: 4,
    players: { 0: { name: '호스트', joinedAt: 1 } },
    status: 'lobby', state: null, createdAt: 1,
  })

  // 두 명이 동시에 방 정보를 읽고(둘 다 빈 슬롯 1을 봄) 동시에 자리를 잡으려 한다
  const data = db.read(`rooms/${gameType}/${code}`)
  const slotX = findFreeSlot(data.players, data.maxPlayers)
  const slotY = findFreeSlot(data.players, data.maxPlayers)
  expectEq(slotX, 1, 'X가 본 빈 슬롯 1')
  expectEq(slotY, 1, 'Y도 같은 슬롯 1을 봄 (경쟁 상황)')

  const claimX = db.runTransaction(`rooms/${gameType}/${code}/players/${slotX}`,
    cur => (cur ? undefined : { name: 'X', joinedAt: 2 }))
  const claimY = db.runTransaction(`rooms/${gameType}/${code}/players/${slotY}`,
    cur => (cur ? undefined : { name: 'Y', joinedAt: 3 }))

  ok(claimX.committed, 'X는 슬롯 선점 성공')
  expectEq(claimY.committed, false, 'Y는 선점 실패 → 재참가 안내 (옛 버그: X를 덮어씀)')
  expectEq(db.read(`rooms/${gameType}/${code}/players/1`).name, 'X', 'X의 이름이 지켜짐')

  // Y가 다시 시도하면 다음 빈 슬롯을 받는다
  const data2 = db.read(`rooms/${gameType}/${code}`)
  const slotY2 = findFreeSlot(data2.players, data2.maxPlayers)
  expectEq(slotY2, 2, '재시도 시 슬롯 2')
  ok(db.runTransaction(`rooms/${gameType}/${code}/players/${slotY2}`,
    cur => (cur ? undefined : { name: 'Y', joinedAt: 4 })).committed, 'Y 재시도 성공')
}

// 7-6. 망각의 지뢰 — 동시 참가 시 역할이 겹치지 않는다
{
  const db = new MockDB()
  const code = '55'
  db.set(`rooms/mine-memory/${code}`, {
    state: null, phase: 'wait-players', dealer: true, p1: false, p2: false,
    dice: { 1: null, 2: null, who: 1 }, event: null, eventSeq: 0, createdAt: 1,
  })

  const roleX = nextMineRole(db.read(`rooms/mine-memory/${code}`)).role
  const roleY = nextMineRole(db.read(`rooms/mine-memory/${code}`)).role
  expectEq(roleX, 'p1', 'X는 p1')
  expectEq(roleY, 'p1', 'Y도 p1을 노림 (경쟁 상황)')

  const cx = db.runTransaction(`rooms/mine-memory/${code}/${roleX}`, cur => (cur === true ? undefined : true))
  const cy = db.runTransaction(`rooms/mine-memory/${code}/${roleY}`, cur => (cur === true ? undefined : true))
  ok(cx.committed, 'X가 p1 선점')
  expectEq(cy.committed, false, 'Y는 p1 선점 실패 (옛 버그: 둘 다 p1)')

  const roleY2 = nextMineRole(db.read(`rooms/mine-memory/${code}`)).role
  expectEq(roleY2, 'p2', 'Y 재시도 → p2')
  ok(db.runTransaction(`rooms/mine-memory/${code}/${roleY2}`, cur => (cur === true ? undefined : true)).committed,
    'Y가 p2 선점 성공')
  const after = db.read(`rooms/mine-memory/${code}`)
  ok(after.p1 === true && after.p2 === true, '딜러 + p1 + p2 3자 완성')
}

// ─── 결과 ───
console.log('\n========= 온라인 방 배정 테스트 =========')
console.log(`✅ 통과: ${pass}`)
console.log(`❌ 실패: ${fail}`)
if (fail > 0) {
  console.log('\n실패 목록:')
  failures.forEach(f => console.log('  -', f))
  process.exit(1)
}
