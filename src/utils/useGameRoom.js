import { useState, useEffect, useCallback, useRef } from 'react'
import { db, ref, set, onValue, remove, get } from './firebase'

function generateCode() {
  return String(Math.floor(10 + Math.random() * 90))
}

// 1시간 지난 방 자동 정리
async function cleanOldRooms(gameType) {
  try {
    const roomsRef = ref(db, `rooms/${gameType}`)
    const snap = await get(roomsRef)
    if (!snap.exists()) return
    const rooms = snap.val()
    const now = Date.now()
    const ONE_HOUR = 60 * 60 * 1000
    for (const code of Object.keys(rooms)) {
      if (rooms[code].createdAt && now - rooms[code].createdAt > ONE_HOUR) {
        await remove(ref(db, `rooms/${gameType}/${code}`))
      }
    }
  } catch (e) {}
}

export function useGameRoom(gameType) {
  const [roomCode, setRoomCode] = useState(null)
  const [role, setRole] = useState(null) // 'host' | 'guest'
  const [myColor, setMyColor] = useState(null) // 'black' | 'white'
  const [gameState, setGameState] = useState(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const unsubRef = useRef(null)

  // 방 만들기
  const createRoom = useCallback(async (initialState) => {
    await cleanOldRooms(gameType)
    const code = generateCode()
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
    setError('')

    // 상태 감시
    const stateRef = ref(db, `rooms/${gameType}/${code}/state`)
    const unsub = onValue(stateRef, (snap) => {
      if (snap.exists()) setGameState(snap.val())
    })
    unsubRef.current = unsub

    // 상대 접속 감시
    const guestRef = ref(db, `rooms/${gameType}/${code}/guest`)
    onValue(guestRef, (snap) => {
      if (snap.val() === true) setConnected(true)
    })

    return code
  }, [gameType])

  // 방 참가
  const joinRoom = useCallback(async (code, initialState) => {
    const roomRef = ref(db, `rooms/${gameType}/${code}`)
    const snap = await get(roomRef)
    if (!snap.exists()) {
      setError('방을 찾을 수 없어요')
      return false
    }

    await set(ref(db, `rooms/${gameType}/${code}/guest`), true)
    setRoomCode(code)
    setRole('guest')
    setMyColor('white') // 참가자가 백
    setConnected(true)
    setError('')

    // 상태 감시
    const stateRef = ref(db, `rooms/${gameType}/${code}/state`)
    const unsub = onValue(stateRef, (snap) => {
      if (snap.exists()) setGameState(snap.val())
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
    if (unsubRef.current) unsubRef.current()
    if (roomCode) {
      try { await remove(ref(db, `rooms/${gameType}/${roomCode}`)) } catch (e) {}
    }
    setRoomCode(null)
    setRole(null)
    setMyColor(null)
    setGameState(null)
    setConnected(false)
    setError('')
  }, [roomCode, gameType])

  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current()
    }
  }, [])

  return {
    roomCode, role, myColor, gameState, connected, error,
    createRoom, joinRoom, updateState, leaveRoom, setError,
  }
}
