// 망각의 지뢰 — 3자 방 (딜러 + P1 + P2) Firebase 동기화
// 역할: 'dealer' | 'p1' | 'p2'
// state 구조: serializeForWire가 반환하는 객체 + phase/dice/event/eventSeq

import { useState, useEffect, useCallback, useRef } from 'react'
import { db, ref, set, onValue, remove, get, update, runTransaction } from './firebase'
import { pickFreeCode, expiredRoomCodes, nextMineRole, nextEventSeq } from './roomCodes'

const GAME_TYPE = 'mine-memory'

// 1시간 지난 방을 지우고, 아직 살아있는 방 코드 목록을 돌려준다.
async function cleanOldRooms() {
  try {
    const roomsRef = ref(db, `rooms/${GAME_TYPE}`)
    const snap = await get(roomsRef)
    if (!snap.exists()) return []
    const rooms = snap.val()
    const expired = expiredRoomCodes(rooms, Date.now())
    for (const code of expired) {
      await remove(ref(db, `rooms/${GAME_TYPE}/${code}`))
    }
    return Object.keys(rooms).filter(c => !expired.includes(c))
  } catch (e) {
    return []
  }
}

export function useMineMemoryRoom() {
  const [roomCode, setRoomCode] = useState(null)
  const [role, setRole] = useState(null) // 'dealer' | 'p1' | 'p2'
  const [room, setRoom] = useState(null) // 전체 방 데이터
  const [error, setError] = useState('')
  const unsubRef = useRef(null)
  const seqRef = useRef(0) // 내가 발행한 eventSeq. room 상태가 늦게 와도 중복되지 않게 한다

  const subscribe = useCallback((code) => {
    if (unsubRef.current) unsubRef.current()
    const roomRef = ref(db, `rooms/${GAME_TYPE}/${code}`)
    const unsub = onValue(roomRef, (snap) => {
      if (snap.exists()) setRoom(snap.val())
      else setRoom(null)
    })
    unsubRef.current = unsub
  }, [])

  // 딜러: 방 만들기
  const createAsDealer = useCallback(async (initialState) => {
    const takenCodes = await cleanOldRooms()
    const code = pickFreeCode(takenCodes)
    if (!code) {
      setError('지금은 방이 다 찼어요. 잠시 뒤에 다시 만들어 주세요')
      return null
    }
    seqRef.current = 0
    const roomRef = ref(db, `rooms/${GAME_TYPE}/${code}`)
    await set(roomRef, {
      state: initialState,
      phase: 'wait-players',
      dealer: true,
      p1: false,
      p2: false,
      dice: { 1: null, 2: null, who: 1 },
      event: null,
      eventSeq: 0,
      createdAt: Date.now(),
    })
    setRoomCode(code)
    setRole('dealer')
    setError('')
    subscribe(code)
    return code
  }, [subscribe])

  // 플레이어: 방 참가 (자동으로 p1 또는 p2)
  const joinAsPlayer = useCallback(async (code) => {
    const roomRef = ref(db, `rooms/${GAME_TYPE}/${code}`)
    const snap = await get(roomRef)
    if (!snap.exists()) {
      setError('방을 찾을 수 없어요')
      return null
    }
    const { role: myRole, error: roleError } = nextMineRole(snap.val())
    if (!myRole) {
      setError(roleError)
      return null
    }
    // 자리는 트랜잭션으로 선점한다. 두 명이 동시에 들어오면 둘 다 p1이 되어버린다.
    const claim = await runTransaction(
      ref(db, `rooms/${GAME_TYPE}/${code}/${myRole}`),
      (current) => (current === true ? undefined : true)
    )
    if (!claim.committed) {
      setError('자리를 놓쳤어요. 다시 참가해 주세요')
      return null
    }
    seqRef.current = 0
    setRoomCode(code)
    setRole(myRole)
    setError('')
    subscribe(code)
    return myRole
  }, [subscribe])

  // 부분 업데이트
  const patchRoom = useCallback(async (patch) => {
    if (!roomCode) return
    await update(ref(db, `rooms/${GAME_TYPE}/${roomCode}`), patch)
  }, [roomCode])

  // state만 업데이트
  const patchState = useCallback(async (newState) => {
    if (!roomCode) return
    await update(ref(db, `rooms/${GAME_TYPE}/${roomCode}`), { state: newState })
  }, [roomCode])

  // 이벤트 발행 (시퀀스 자동 증가)
  const publishEvent = useCallback(async (event) => {
    if (!roomCode) return
    // room 상태는 Firebase 리스너로 들어오므로 연속 발행 시 아직 옛 seq일 수 있다.
    // 로컬 카운터와 원격 값 중 큰 쪽 +1을 써서 seq가 절대 같은 값으로 두 번 쓰이지 않게 한다.
    const seq = nextEventSeq(seqRef.current, room?.eventSeq)
    seqRef.current = seq
    await update(ref(db, `rooms/${GAME_TYPE}/${roomCode}`), {
      event,
      eventSeq: seq,
    })
  }, [roomCode, room])

  // 방 나가기
  const leaveRoom = useCallback(async () => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
    if (roomCode) {
      try {
        if (role === 'dealer') {
          await remove(ref(db, `rooms/${GAME_TYPE}/${roomCode}`))
        } else {
          await update(ref(db, `rooms/${GAME_TYPE}/${roomCode}`), { [role]: false })
        }
      } catch (e) {}
    }
    setRoomCode(null)
    setRole(null)
    setRoom(null)
    setError('')
  }, [roomCode, role])

  useEffect(() => () => {
    if (unsubRef.current) unsubRef.current()
  }, [])

  return {
    roomCode, role, room, error,
    createAsDealer, joinAsPlayer, patchRoom, patchState, publishEvent,
    leaveRoom, setError,
  }
}
