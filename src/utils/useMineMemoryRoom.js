// 망각의 지뢰 — 3자 방 (딜러 + P1 + P2) Firebase 동기화
// 역할: 'dealer' | 'p1' | 'p2'
// state 구조: serializeForWire가 반환하는 객체 + phase/dice/event/eventSeq

import { useState, useEffect, useCallback, useRef } from 'react'
import { db, ref, set, onValue, remove, get, update } from './firebase'

const GAME_TYPE = 'mine-memory'

function generateCode() {
  return String(Math.floor(10 + Math.random() * 90))
}

async function cleanOldRooms() {
  try {
    const roomsRef = ref(db, `rooms/${GAME_TYPE}`)
    const snap = await get(roomsRef)
    if (!snap.exists()) return
    const rooms = snap.val()
    const now = Date.now()
    const ONE_HOUR = 60 * 60 * 1000
    for (const code of Object.keys(rooms)) {
      if (rooms[code].createdAt && now - rooms[code].createdAt > ONE_HOUR) {
        await remove(ref(db, `rooms/${GAME_TYPE}/${code}`))
      }
    }
  } catch (e) {}
}

export function useMineMemoryRoom() {
  const [roomCode, setRoomCode] = useState(null)
  const [role, setRole] = useState(null) // 'dealer' | 'p1' | 'p2'
  const [room, setRoom] = useState(null) // 전체 방 데이터
  const [error, setError] = useState('')
  const unsubRef = useRef(null)

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
    await cleanOldRooms()
    const code = generateCode()
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
    const data = snap.val()
    if (!data.dealer) {
      setError('딜러가 없는 방입니다')
      return null
    }
    let myRole = null
    if (!data.p1) myRole = 'p1'
    else if (!data.p2) myRole = 'p2'
    else {
      setError('방이 꽉 찼어요 (이미 2명 참가중)')
      return null
    }
    await update(ref(db, `rooms/${GAME_TYPE}/${code}`), { [myRole]: true })
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
    const currentSeq = room?.eventSeq || 0
    await update(ref(db, `rooms/${GAME_TYPE}/${roomCode}`), {
      event,
      eventSeq: currentSeq + 1,
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
