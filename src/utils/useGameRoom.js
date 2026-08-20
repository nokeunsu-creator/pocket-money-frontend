import { useState, useEffect, useCallback, useRef } from 'react'
import { db, ref, set, onValue, remove, get } from './firebase'
import { pickFreeCode, expiredRoomCodes, duoJoinError } from './roomCodes'

// 1시간 지난 방을 지우고, 아직 살아있는 방 코드 목록을 돌려준다.
// (코드가 2자리뿐이라 새 방을 만들 때 살아있는 코드를 피해야 한다)
async function cleanOldRooms(gameType) {
  try {
    const roomsRef = ref(db, `rooms/${gameType}`)
    const snap = await get(roomsRef)
    if (!snap.exists()) return []
    const rooms = snap.val()
    const expired = expiredRoomCodes(rooms, Date.now())
    for (const code of expired) {
      await remove(ref(db, `rooms/${gameType}/${code}`))
    }
    return Object.keys(rooms).filter(c => !expired.includes(c))
  } catch (e) {
    return []
  }
}

export function useGameRoom(gameType) {
  const [roomCode, setRoomCode] = useState(null)
  const [role, setRole] = useState(null) // 'host' | 'guest'
  const [myColor, setMyColor] = useState(null) // 'black' | 'white'
  const [gameState, setGameState] = useState(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const unsubRef = useRef(null)
  const guestUnsubRef = useRef(null)

  // 방 만들기
  const createRoom = useCallback(async (initialState) => {
    const takenCodes = await cleanOldRooms(gameType)
    const code = pickFreeCode(takenCodes)
    if (!code) {
      setError('지금은 방이 다 찼어요. 잠시 뒤에 다시 만들어 주세요')
      return null
    }
    const roomRef = ref(db, `rooms/${gameType}/${code}`)
    await set(roomRef, {
      state: initialState,
      host: true,
      guest: false,
      createdAt: Date.now(),
    })
    setRoomCode(code)
    setRole('host')
    setMyColor('black') // 방장이 흑
    setConnected(false)
    setError('')

    // 상태 감시 — 방이 사라지면(상대/호스트 이탈) connected를 내려 대기 화면으로 돌린다
    const stateRef = ref(db, `rooms/${gameType}/${code}/state`)
    const unsub = onValue(stateRef, (snap) => {
      if (snap.exists()) setGameState(snap.val())
      else setConnected(false)
    })
    unsubRef.current = unsub

    // 상대 접속 감시 — true/false 양방향. 게스트가 나가면 다시 대기 상태가 된다
    const guestRef = ref(db, `rooms/${gameType}/${code}/guest`)
    const guestUnsub = onValue(guestRef, (snap) => {
      setConnected(snap.val() === true)
    })
    guestUnsubRef.current = guestUnsub

    return code
  }, [gameType])

  // 방 참가
  const joinRoom = useCallback(async (code) => {
    const roomRef = ref(db, `rooms/${gameType}/${code}`)
    const snap = await get(roomRef)
    // 없는 방 / 이미 2명이 찬 방 거부 (예전에는 확인 없이 들어가서 기존 게스트를 덮어썼다)
    const joinError = duoJoinError(snap.exists() ? snap.val() : null)
    if (joinError) {
      setError(joinError)
      return false
    }

    await set(ref(db, `rooms/${gameType}/${code}/guest`), true)
    setRoomCode(code)
    setRole('guest')
    setMyColor('white') // 참가자가 백
    setConnected(true)
    setError('')

    // 상태 감시 — 호스트가 방을 닫으면 state가 사라지므로 그때 대기 화면으로 돌린다
    const stateRef = ref(db, `rooms/${gameType}/${code}/state`)
    const unsub = onValue(stateRef, (snap2) => {
      if (snap2.exists()) setGameState(snap2.val())
      else setConnected(false)
    })
    unsubRef.current = unsub

    return true
  }, [gameType])

  // 게임 상태 업데이트
  const updateState = useCallback(async (newState) => {
    if (!roomCode) return
    const stateRef = ref(db, `rooms/${gameType}/${roomCode}/state`)
    await set(stateRef, newState)
  }, [roomCode, gameType])

  // 방 나가기
  const leaveRoom = useCallback(async () => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
    if (guestUnsubRef.current) { guestUnsubRef.current(); guestUnsubRef.current = null }
    if (roomCode) {
      try {
        if (role === 'guest') {
          // 게스트는 자기 자리만 비운다. 방은 남겨서 호스트가 다시 기다릴 수 있게 한다
          await set(ref(db, `rooms/${gameType}/${roomCode}/guest`), false)
        } else {
          await remove(ref(db, `rooms/${gameType}/${roomCode}`))
        }
      } catch (e) {}
    }
    setRoomCode(null)
    setRole(null)
    setMyColor(null)
    setGameState(null)
    setConnected(false)
    setError('')
  }, [roomCode, role, gameType])

  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current()
      if (guestUnsubRef.current) guestUnsubRef.current()
    }
  }, [])

  return {
    roomCode, role, myColor, gameState, connected, error,
    createRoom, joinRoom, updateState, leaveRoom, setError,
  }
}
