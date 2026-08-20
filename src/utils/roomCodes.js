// 온라인 방 코드/자리 배정 순수 로직
//
// useGameRoom / useMultiGameRoom / useMineMemoryRoom이 공유한다.
// Firebase에 의존하지 않게 분리해서 tests/roomHooks.test.mjs가 실제로 import해 검증한다.

export const ROOM_CODE_MIN = 10
export const ROOM_CODE_MAX = 99
export const ROOM_CODE_COUNT = ROOM_CODE_MAX - ROOM_CODE_MIN + 1
export const ROOM_TTL_MS = 60 * 60 * 1000

// 만료된 방 코드 목록. createdAt이 없는 방은 판단 불가라 살려둔다.
export function expiredRoomCodes(rooms, now, ttlMs = ROOM_TTL_MS) {
  if (!rooms) return []
  return Object.keys(rooms).filter(code => {
    const createdAt = rooms[code] && rooms[code].createdAt
    return typeof createdAt === 'number' && now - createdAt > ttlMs
  })
}

// 살아있는 방과 겹치지 않는 2자리 코드를 고른다.
// 코드가 2자리(90개)뿐이라 무작정 뽑으면 남의 방을 덮어쓸 수 있어서 반드시 빈 코드를 골라야 한다.
// 전부 사용 중이면 null (호출부가 에러를 표시해야 함).
export function pickFreeCode(takenCodes, rand = Math.random) {
  const taken = new Set((takenCodes || []).map(String))
  if (taken.size >= ROOM_CODE_COUNT) return null
  // 빈 코드가 많을 때는 무작위 시도가 가장 싸다 (코드가 예측되지 않는 편이 좋음)
  for (let i = 0; i < 40; i++) {
    const code = String(ROOM_CODE_MIN + Math.floor(rand() * ROOM_CODE_COUNT))
    if (!taken.has(code)) return code
  }
  // 거의 다 찬 경우: 순차 탐색으로 확실히 찾는다
  for (let n = ROOM_CODE_MIN; n <= ROOM_CODE_MAX; n++) {
    const code = String(n)
    if (!taken.has(code)) return code
  }
  return null
}

// 2인 방(useGameRoom) 참가 가능 여부. 불가하면 사용자에게 보여줄 메시지를 돌려준다.
export function duoJoinError(roomData) {
  if (!roomData) return '방을 찾을 수 없어요'
  if (roomData.guest === true) return '이미 2명이 놀고 있어요'
  return null
}

// 다인 방(useMultiGameRoom)의 빈 슬롯. 없으면 -1.
export function findFreeSlot(players, maxPlayers) {
  const p = players || {}
  const max = Math.max(1, Number(maxPlayers) || 6)
  for (let i = 0; i < max; i++) {
    if (!p[i]) return i
  }
  return -1
}

// 망각의 지뢰 3자 방에서 참가자가 받을 역할.
export function nextMineRole(roomData) {
  if (!roomData) return { role: null, error: '방을 찾을 수 없어요' }
  if (!roomData.dealer) return { role: null, error: '딜러가 없는 방입니다' }
  if (!roomData.p1) return { role: 'p1', error: null }
  if (!roomData.p2) return { role: 'p2', error: null }
  return { role: null, error: '방이 꽉 찼어요 (이미 2명 참가중)' }
}

// 이벤트 시퀀스는 반드시 증가해야 한다.
// 구독자가 eventSeq 변화로 재동기화하므로 같은 값이 두 번 쓰이면 두 번째 이벤트를 놓친다.
export function nextEventSeq(localSeq, remoteSeq) {
  const a = Number.isFinite(localSeq) ? localSeq : 0
  const b = Number.isFinite(remoteSeq) ? remoteSeq : 0
  return Math.max(a, b) + 1
}
